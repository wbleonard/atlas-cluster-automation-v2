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
                timezone: schedule.timezone,
                scheduleTag: automation.scheduleValue
              };
            } else {
              scheduleData = {
                hasSchedule: false,
                automationEnabled: false,
                pauseHour: null,
                pauseDaysOfWeek: [],
                timezone: '',
                scheduleTag: null
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
          // Remove old data for this project
          await statusCollection.deleteMany({ projectId: currentProjectId });
          
          // Insert new status data
          await statusCollection.insertMany(clusterStatusList);
          
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
