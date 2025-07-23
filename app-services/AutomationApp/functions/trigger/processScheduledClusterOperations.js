// Atlas Function: processScheduledClusterOperations
// This function is intended to be linked to the 'enforcePauseScheduleTrigger' (hourly).
// Uses Atlas cluster tags instead of collection data for schedule configuration
exports = async function() {
  const moment = require("moment-timezone");
  console.log("processScheduledClusterOperations: Trigger started (tag-based version).");

  let projectsToProcess;
  try {
    // Get projects with scheduled clusters from Atlas tags instead of collection
    projectsToProcess = await context.functions.execute("utility/getProjectsWithScheduledClusters");
  } catch (error) {
    console.error(`processScheduledClusterOperations: CRITICAL - Failed to fetch projects with scheduled clusters: ${error.message}`, error);
    return { status: "error", message: `Failed to fetch scheduled clusters from Atlas: ${error.message}` };
  }

  const nowUTC = new Date(); // Current time in UTC

  for (const project of projectsToProcess) {
    if (!project.clusters || project.clusters.length === 0) {
      console.log(`processScheduledClusterOperations: Project ${project.projectId} (${project.projectName}) has no clusters. Skipping.`);
      continue;
    }

    console.log(`processScheduledClusterOperations: Processing project ${project.projectId} (${project.projectName}) with ${project.clusters.length} scheduled cluster(s).`);

    for (const cluster of project.clusters) {
      // Schedule information is already parsed and validated by getProjectsWithScheduledClusters
      let currentLocalHour;
      let currentLocalDayOfWeek; // 0 (Sun) - 6 (Sat)

      try {
        // Use moment-timezone to get the local time in the cluster's timezone
        const localTime = moment.tz(nowUTC, cluster.timezone);
        currentLocalHour = localTime.hour();
        currentLocalDayOfWeek = localTime.day(); // 0 (Sun) - 6 (Sat)
      } catch (tzError) {
        console.error(`processScheduledClusterOperations: Error determining local time for cluster ${cluster.name} (timezone: ${cluster.timezone}): ${tzError.message}. Skipping cluster.`, tzError);
        continue;
      }

      const actor = "SYSTEM_AUTOMATION_TRIGGER";

      // --- Check for PAUSE action ---
      if (cluster.pauseHour === currentLocalHour && cluster.pauseDaysOfWeek.includes(currentLocalDayOfWeek)) {
        console.log(`processScheduledClusterOperations: Cluster ${cluster.name} (Project: ${project.projectId}) matches PAUSE schedule (Local Hour: ${currentLocalHour}, Local Day: ${currentLocalDayOfWeek}).`);

        // Check if cluster is already paused to avoid unnecessary API calls
        if (cluster.paused) {
          console.log(`processScheduledClusterOperations: Cluster ${cluster.name} is already paused. Skipping pause action.`);
          continue;
        }

        console.log(`processScheduledClusterOperations: Attempting to PAUSE cluster ${cluster.name} (Project: ${project.projectId}).`);
        try {
          const result = await context.functions.execute(
            "setClusterPauseState",
            project.projectId,
            cluster.name,
            true, // true to pause
            actor
          );
          console.log(`processScheduledClusterOperations: setClusterPauseState result for PAUSE of ${cluster.name}:`, JSON.stringify(result));
        } catch (e) {
          console.error(`processScheduledClusterOperations: Error calling setClusterPauseState for PAUSE of ${cluster.name}: ${e.message}`, e);
        }
      } else {
        // Log when cluster doesn't match schedule for debugging
        console.log(`processScheduledClusterOperations: Cluster ${cluster.name} does not match PAUSE schedule. Current: Hour=${currentLocalHour}, Day=${currentLocalDayOfWeek}. Expected: Hour=${cluster.pauseHour}, Days=[${cluster.pauseDaysOfWeek.join(',')}]`);
      }
    } // end for each cluster
  } // end for each project

  console.log("processScheduledClusterOperations: Trigger finished.");
  return { status: "completed", message: "Scheduled cluster operations processed using Atlas tags." };
};