// Atlas Function: setOrgWideSchedule
// Sets a pause schedule for all clusters across all projects in the organization
// Input: pauseHour, pauseDaysOfWeek, timezone, enabled (optional, defaults to false for safety)

exports = async function(pauseHour = 22, pauseDaysOfWeek = [0,1,2,3,4,5,6], timezone = "America/New_York", enabled = false) {
  
  if (pauseHour == "Hello world!") { // Easy testing from the console
    pauseHour = 22;
    pauseDaysOfWeek = [0,1,2,3,4,5,6]; // Every day
    timezone = "America/New_York";
    enabled = false; // Default to disabled for safety
    
    console.log(`setOrgWideSchedule: Using test defaults - Hour: ${pauseHour}, Days: [${pauseDaysOfWeek.join(',')}], Timezone: ${timezone}, Enabled: ${enabled}`);
  }

  // Validate inputs
  if (typeof pauseHour !== 'number' || pauseHour < 0 || pauseHour > 23) {
    throw new Error("pauseHour must be a number between 0 and 23");
  }

  if (!Array.isArray(pauseDaysOfWeek) || pauseDaysOfWeek.length === 0) {
    throw new Error("pauseDaysOfWeek must be a non-empty array");
  }

  for (const day of pauseDaysOfWeek) {
    if (typeof day !== 'number' || day < 0 || day > 6) {
      throw new Error("All days in pauseDaysOfWeek must be numbers between 0 (Sunday) and 6 (Saturday)");
    }
  }

  try {
    console.log(`setOrgWideSchedule: Setting org-wide schedule - Hour: ${pauseHour}, Days: [${pauseDaysOfWeek.join(',')}], Timezone: ${timezone}, Enabled: ${enabled}`);

    // Get all projects in the organization
    const projects = await context.functions.execute("atlas/getProjects");
    console.log(`setOrgWideSchedule: Found ${projects.length} projects in organization`);

    let totalClusters = 0;
    let successfulUpdates = 0;
    let errors = [];
    const results = [];

    // Process each project
    for (const project of projects) {
      const projectId = project.id;
      const projectName = project.name;
      
      try {
        console.log(`setOrgWideSchedule: Processing project ${projectName} (${projectId})`);
        
        // Get all clusters in this project
        const clusters = await context.functions.execute("atlas/getProjectClusters", projectId);
        console.log(`setOrgWideSchedule: Found ${clusters.length} clusters in project ${projectName}`);
        
        const projectResult = {
          projectId: projectId,
          projectName: projectName,
          clusters: []
        };

        // Process each cluster
        for (const cluster of clusters) {
          totalClusters++;
          const clusterName = cluster.name;
          
          try {
            // Set the schedule tag
            const scheduleResult = await context.functions.execute(
              "tags/setClusterScheduleTag", 
              projectId, 
              clusterName, 
              pauseHour, 
              pauseDaysOfWeek, 
              timezone
            );
            
            // Set the automation enabled tag
            const enabledResult = await context.functions.execute(
              "automation/setClusterAutomationEnabled",
              projectId,
              clusterName, 
              enabled
            );
            
            successfulUpdates++;
            projectResult.clusters.push({
              name: clusterName,
              status: "success",
              scheduleSet: true,
              automationEnabled: enabled,
              message: `Schedule set and automation ${enabled ? 'enabled' : 'disabled'}`
            });
            
            console.log(`setOrgWideSchedule: Successfully configured cluster ${clusterName} in project ${projectName}`);
            
          } catch (clusterError) {
            console.error(`setOrgWideSchedule: Error configuring cluster ${clusterName} in project ${projectName}: ${clusterError.message}`);
            errors.push({
              projectId: projectId,
              projectName: projectName,
              clusterName: clusterName,
              error: clusterError.message
            });
            
            projectResult.clusters.push({
              name: clusterName,
              status: "error",
              error: clusterError.message
            });
          }
        }
        
        if (projectResult.clusters.length > 0) {
          results.push(projectResult);
        }
        
      } catch (projectError) {
        console.error(`setOrgWideSchedule: Error processing project ${projectName} (${projectId}): ${projectError.message}`);
        errors.push({
          projectId: projectId,
          projectName: projectName,
          error: projectError.message
        });
      }
    }

    const summary = {
      status: "completed",
      totalProjects: projects.length,
      totalClusters: totalClusters,
      successfulUpdates: successfulUpdates,
      errorCount: errors.length,
      schedule: {
        hour: pauseHour,
        days: pauseDaysOfWeek,
        timezone: timezone,
        enabled: enabled
      },
      results: results,
      errors: errors
    };

    console.log(`setOrgWideSchedule: Operation completed. Updated ${successfulUpdates}/${totalClusters} clusters successfully.`);
    
    if (errors.length > 0) {
      console.warn(`setOrgWideSchedule: ${errors.length} errors occurred during processing.`);
    }

    return summary;

  } catch (error) {
    console.error(`setOrgWideSchedule: Critical error during org-wide schedule setup: ${error.message}`, error);
    throw error;
  }
};
