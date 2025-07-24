// Atlas Function: refreshClusterStatus
// Simplified function to refresh cluster status data for reporting/dashboard purposes
// Gets current data from Atlas API + tags and updates the reporting collection

exports = async function(projectId = null, debugMode = false) {
  
  if (projectId === "Hello world!") {
    console.log("🧪 TEST MODE: Refreshing status for test project");
    projectId = "6807d3a43dae3141f99d8aa0"; // Test project ID
    debugMode = true;
  }

  console.log("🔄 Starting cluster status refresh...");
  
  try {
    // Get collection for status reporting
    const statusCollection = await context.functions.execute("collections/getClusterStatusCollection");
    if (!statusCollection) {
      throw new Error("Failed to get cluster status collection");
    }

    // Always clean up duplicates before refresh to ensure data integrity
    console.log("🧹 Cleaning up any duplicate entries...");
    await cleanupDuplicateEntries(statusCollection, debugMode);

    // Get projects to process
    let projects;
    if (projectId) {
      // Process single project
      projects = [{ id: projectId }];
      console.log(`🎯 Processing single project: ${projectId}`);
    } else {
      // Process all projects
      projects = await context.functions.execute("atlas/getProjects");
      console.log(`🌐 Processing all ${projects.length} projects`);
    }

    let totalClustersProcessed = 0;

    for (const project of projects) {
      const currentProjectId = project.id;
      const projectName = project.name || `Project-${currentProjectId}`;
      
      if (debugMode) {
        console.log(`📂 Processing project: ${projectName} (${currentProjectId})`);
      }

      try {
        // Get clusters from Atlas API
        const atlasClusters = await context.functions.execute("atlas/getProjectClusters", currentProjectId);
        
        if (!atlasClusters || !Array.isArray(atlasClusters)) {
          console.warn(`⚠️ No clusters found for project ${projectName}`);
          continue;
        }

        // Build cluster status data
        const clusterStatusList = [];
        
        for (const cluster of atlasClusters) {
          if (!cluster || !cluster.name) {
            console.warn("⚠️ Skipping cluster without name");
            continue;
          }

          if (debugMode) {
            console.log(`🔍 Processing cluster: ${cluster.name}`);
          }

          // Get schedule from tags
          let scheduleData = {};
          try {
            const automation = await context.functions.execute("automation/getClusterAutomationStatus", currentProjectId, cluster.name);
            if (automation.hasSchedule) {
              const schedule = await context.functions.execute("tags/getClusterScheduleFromTags", currentProjectId, cluster.name);
              scheduleData = {
                hasSchedule: true,
                automationEnabled: automation.enabled,
                pauseHour: schedule.pauseHour,
                pauseDaysOfWeek: schedule.pauseDaysOfWeek,
                pauseDaysOfWeekDisplay: formatDaysOfWeek(schedule.pauseDaysOfWeek),
                timezone: schedule.timezone,
                scheduleTag: automation.scheduleValue,
                scheduleDisplay: formatScheduleDisplay(schedule)
              };
            } else {
              scheduleData = {
                hasSchedule: false,
                automationEnabled: false,
                pauseHour: null,
                pauseDaysOfWeek: [],
                pauseDaysOfWeekDisplay: null,
                timezone: '',
                scheduleTag: null,
                scheduleDisplay: null
              };
            }
          } catch (error) {
            if (debugMode) {
              console.warn(`⚠️ Could not get schedule for ${cluster.name}: ${error.message}`);
            }
            scheduleData = {
              hasSchedule: false,
              automationEnabled: false,
              pauseHour: null,
              pauseDaysOfWeek: [],
              timezone: '',
              scheduleTag: null
            };
          }

          // Calculate cluster age
          let ageInDays = 0;
          if (cluster.createDate) {
            try {
              const created = new Date(cluster.createDate);
              const now = new Date();
              ageInDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
            } catch (e) {
              console.warn(`⚠️ Error calculating age for ${cluster.name}`);
            }
          }

          // Get MongoDB version major number
          let mongoVersion = "";
          if (cluster.mongoDBVersion) {
            mongoVersion = cluster.mongoDBVersion.toString().split(".")[0];
          }

          // Extract specific organizational tags
          const ownedByTag = cluster.tags?.find(tag => tag.key === 'OWNED_BY');
          const supportedByTag = cluster.tags?.find(tag => tag.key === 'SUPPORTED_BY');
          const projectStatusTag = cluster.tags?.find(tag => tag.key === 'PROJECT_STATUS');

          // Create status document
          const statusDoc = {
            name: cluster.name,
            projectId: currentProjectId,
            projectName: projectName,
            
            // Atlas metadata
            instanceSize: cluster.providerSettings?.instanceSizeName || '',
            mongoDBVersion: mongoVersion,
            paused: Boolean(cluster.paused),
            createDate: cluster.createDate || null,
            ageInDays: ageInDays,
            autoscaling: Boolean(cluster.autoScaling?.compute?.enabled),
            status: cluster.paused ? "PAUSED" : "ACTIVE",
            
            // Tag-based metadata
            ownedBy: ownedByTag?.value || null,
            supportedBy: supportedByTag?.value || null,
            projectStatus: projectStatusTag?.value || null,
            
            // Schedule/automation data from tags
            ...scheduleData,
            
            // Reporting metadata
            lastUpdated: new Date(),
            dataSource: "atlas-api-tags"
          };

          clusterStatusList.push(statusDoc);
        }

        // Update status collection for this project
        if (clusterStatusList.length > 0) {
          // Use upsert operations to avoid race conditions
          const operations = clusterStatusList.map(statusDoc => ({
            updateOne: {
              filter: { 
                projectId: currentProjectId,
                name: statusDoc.name 
              },
              update: { $set: statusDoc },
              upsert: true
            }
          }));
          
          await statusCollection.bulkWrite(operations);
          
          totalClustersProcessed += clusterStatusList.length;
          console.log(`✅ Updated status for ${clusterStatusList.length} clusters in ${projectName}`);
        }

      } catch (projectError) {
        console.error(`❌ Error processing project ${projectName}: ${projectError.message}`);
        continue;
      }
    }

    const result = {
      status: "success",
      message: `Refreshed status for ${totalClustersProcessed} clusters across ${projects.length} projects`,
      clustersProcessed: totalClustersProcessed,
      projectsProcessed: projects.length,
      timestamp: new Date()
    };

    console.log("✅ Cluster status refresh completed:", JSON.stringify(result));
    return result;

  } catch (error) {
    console.error("❌ Error in refreshClusterStatus:", error.message);
    throw error;
  }
};

// Helper function to format days of week array into readable string
function formatDaysOfWeek(daysArray) {
  if (!daysArray || !Array.isArray(daysArray) || daysArray.length === 0) {
    return null;
  }
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const sortedDays = [...daysArray].sort((a, b) => a - b);
  
  return sortedDays.map(day => dayNames[day]).join(', ');
}

// Helper function to format complete schedule display
function formatScheduleDisplay(parsedSchedule) {
  if (!parsedSchedule) return null;
  
  const { pauseHour, pauseDaysOfWeek, timezone } = parsedSchedule;
  
  if (pauseHour === null || !pauseDaysOfWeek || pauseDaysOfWeek.length === 0) {
    return null;
  }
  
  const daysDisplay = formatDaysOfWeek(pauseDaysOfWeek);
  const hourDisplay = pauseHour.toString().padStart(2, '0') + ':00';
  const timezoneDisplay = timezone ? ` ${timezone}` : '';
  
  return `${daysDisplay} at ${hourDisplay}${timezoneDisplay}`;
}

// Helper function to clean up duplicate entries
async function cleanupDuplicateEntries(statusCollection, debugMode = false) {
  try {
    // Find duplicates by projectId + name combination
    const duplicates = await statusCollection.aggregate([
      {
        $group: {
          _id: { projectId: "$projectId", name: "$name" },
          count: { $sum: 1 },
          docs: { $push: { _id: "$_id", lastUpdated: "$lastUpdated" } }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]).toArray();

    if (duplicates.length === 0) {
      console.log("✅ No duplicates found");
      return;
    }

    console.log(`🧹 Found ${duplicates.length} sets of duplicates, cleaning up...`);

    for (const duplicate of duplicates) {
      // Sort by lastUpdated descending, keep the most recent
      const sortedDocs = duplicate.docs.sort((a, b) => b.lastUpdated - a.lastUpdated);
      const docsToDelete = sortedDocs.slice(1); // Remove all but the first (most recent)

      if (debugMode) {
        console.log(`🗑️ Removing ${docsToDelete.length} duplicates for ${duplicate._id.projectId}/${duplicate._id.name}`);
      }

      // Delete the older duplicates
      const idsToDelete = docsToDelete.map(doc => doc._id);
      await statusCollection.deleteMany({ _id: { $in: idsToDelete } });
    }

    console.log(`✅ Cleaned up duplicates for ${duplicates.length} clusters`);

  } catch (error) {
    console.error("❌ Error cleaning up duplicates:", error.message);
    throw error;
  }
}
