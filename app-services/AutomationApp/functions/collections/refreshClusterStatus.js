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

    // Collect all cluster status data before updating database
    const allClusterStatusDocs = [];
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
          // Harden: skip if cluster.name is missing, empty, or not a string
          if (!cluster || typeof cluster.name !== 'string' || !cluster.name.trim()) {
            console.warn("⚠️ Skipping cluster with missing or invalid name", cluster);
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
                pauseHour: '',
                pauseDaysOfWeek: '',
                pauseDaysOfWeekDisplay: '',
                timezone: '',
                scheduleTag: null,
                scheduleDisplay: ''
              };
            }
          } catch (error) {
            if (debugMode) {
              console.warn(`⚠️ Could not get schedule for ${cluster.name}: ${error.message}`);
            }
            scheduleData = {
              hasSchedule: false,
              automationEnabled: false,
              pauseHour: '',
              pauseDaysOfWeek: '',
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
            // Tag-based metadata (empty strings instead of null for Charts compatibility)
            ownedBy: ownedByTag?.value || "",
            supportedBy: supportedByTag?.value || "",
            projectStatus: projectStatusTag?.value || "",
            // Schedule/automation data from tags
            ...scheduleData,
            // Reporting metadata
            lastUpdated: new Date(),
            dataSource: "atlas-api-tags"
          };

          if (debugMode) {
            console.log("📄 Prepared statusDoc for insert:", JSON.stringify(statusDoc));
          }

          clusterStatusList.push(statusDoc);
          totalClustersProcessed++;
        }

        // Add this project's clusters to the master list
        allClusterStatusDocs.push(...clusterStatusList);
        
        if (debugMode) {
          console.log(`✅ Collected status for ${clusterStatusList.length} clusters in ${projectName}`);
        }

      } catch (projectError) {
        console.error(`❌ Error processing project ${projectName}: ${projectError.message}`);
        continue;
      }
    }

    // Atomic rebuild: Clear existing data and insert all new data
    console.log(`🔄 Replacing collection with ${allClusterStatusDocs.length} cluster status documents...`);
    if (debugMode) {
      for (const doc of allClusterStatusDocs) {
        console.log("📝 Will insert:", JSON.stringify(doc));
      }
      console.log(`🧮 Final document count to insert: ${allClusterStatusDocs.length}`);
    }
    // Only delete for the current project if projectId is specified
    if (projectId) {
      await statusCollection.deleteMany({ projectId });
    } else {
      await statusCollection.deleteMany({});
    }
    if (allClusterStatusDocs.length > 0) {
      await statusCollection.insertMany(allClusterStatusDocs);
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
