// Atlas Function: enableAutomationForProject
// Enables automation for all clusters in a specific project that have schedules
// Input: projectId (optional - defaults to test project with "Hello world!")

exports = async function(projectId) {
  
  if (projectId == "Hello world!" || !projectId) { // Easy testing from the console
    projectId = "6807d3a43dae3141f99d8aa0";
    
    console.log(`enableAutomationForProject: Using test default - Project: ${projectId}`);
  }

  try {
    console.log(`enableAutomationForProject: Enabling automation for all scheduled clusters in project ${projectId}`);

    // Get all clusters in this project
    const clusters = await context.functions.execute("atlas/getProjectClusters", projectId);
    console.log(`enableAutomationForProject: Found ${clusters.length} clusters in project`);

    let clustersWithSchedules = 0;
    let successfulUpdates = 0;
    let errors = [];
    const results = [];

    // Process each cluster
    for (const cluster of clusters) {
      const clusterName = cluster.name;
      
      try {
        // Check if cluster has a schedule
        const status = await context.functions.execute("automation/getClusterAutomationStatus", projectId, clusterName);
        
        if (status.hasSchedule) {
          clustersWithSchedules++;
          
          if (!status.enabled) {
            // Enable automation for this cluster
            const enableResult = await context.functions.execute(
              "automation/setClusterAutomationEnabled",
              projectId,
              clusterName, 
              true
            );
            
            successfulUpdates++;
            results.push({
              name: clusterName,
              status: "enabled",
              previouslyEnabled: false,
              scheduleValue: status.scheduleValue,
              message: "Automation enabled successfully"
            });
            
            console.log(`enableAutomationForProject: Enabled automation for cluster ${clusterName}`);
          } else {
            results.push({
              name: clusterName,
              status: "already_enabled",
              previouslyEnabled: true,
              scheduleValue: status.scheduleValue,
              message: "Automation was already enabled"
            });
            
            console.log(`enableAutomationForProject: Automation already enabled for cluster ${clusterName}`);
          }
        } else {
          results.push({
            name: clusterName,
            status: "no_schedule",
            hasSchedule: false,
            message: "No schedule configured - skipping"
          });
          
          console.log(`enableAutomationForProject: No schedule found for cluster ${clusterName} - skipping`);
        }
        
      } catch (clusterError) {
        console.error(`enableAutomationForProject: Error processing cluster ${clusterName}: ${clusterError.message}`);
        errors.push({
          clusterName: clusterName,
          error: clusterError.message
        });
        
        results.push({
          name: clusterName,
          status: "error",
          error: clusterError.message
        });
      }
    }

    const summary = {
      status: "completed",
      projectId: projectId,
      totalClusters: clusters.length,
      clustersWithSchedules: clustersWithSchedules,
      newlyEnabled: successfulUpdates,
      errorCount: errors.length,
      results: results,
      errors: errors
    };

    console.log(`enableAutomationForProject: Operation completed. Enabled automation for ${successfulUpdates} clusters (${clustersWithSchedules} total with schedules).`);
    
    if (errors.length > 0) {
      console.warn(`enableAutomationForProject: ${errors.length} errors occurred during processing.`);
    }

    return summary;

  } catch (error) {
    console.error(`enableAutomationForProject: Critical error during project automation enable: ${error.message}`, error);
    throw error;
  }
};
