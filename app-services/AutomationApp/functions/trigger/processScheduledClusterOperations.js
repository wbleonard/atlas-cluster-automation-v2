// Atlas Function: processScheduledClusterOperations
// This function is intended to be linked to the 'enforcePauseScheduleTrigger' (hourly).
exports = async function() {
  const moment = require("moment-timezone");
  console.log("processScheduledClusterOperations: Trigger started.");

  let clusterOpsCollection;
  try {
    clusterOpsCollection = await context.functions.execute("utility/getClusterOpsCollection"); // [1]
  } catch (error) {
    console.error(`processScheduledClusterOperations: CRITICAL - Failed to get cluster_automation collection handle: ${error.message}`, error);
    return { status: "error", message: `Failed to initialize database connection: ${error.message}` };
  }

  const projectsToProcess = await clusterOpsCollection.find({}).toArray();
  const nowUTC = new Date(); // Current time in UTC

  for (const project of projectsToProcess) {
    if (!project.clusters || project.clusters.length === 0) {
      console.log(`processScheduledClusterOperations: Project ${project.projectId} (${project.projectName}) has no clusters defined. Skipping.`);
      continue;
    }

    console.log(`processScheduledClusterOperations: Processing project ${project.projectId} (${project.projectName}) with ${project.clusters.length} cluster(s).`);

    for (const cluster of project.clusters) {
      if (!cluster.timezone || typeof cluster.pauseHour!== 'number' ||!Array.isArray(cluster.pauseDaysOfWeek)) {
        console.warn(`processScheduledClusterOperations: Cluster ${cluster.name} in project ${project.projectId} has incomplete scheduling configuration (timezone, pauseHour, or pauseDaysOfWeek missing/invalid). Skipping.`);
        continue;
      }

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

        // Check if already processed this hour to prevent redundant calls if trigger re-runs or setClusterPausedState was slow to update DB
        let alreadyProcessedThisHour = false;
        if (cluster.lastPauseAction && cluster.lastPauseAction.timestamp) {
          const lastActionTime = new Date(cluster.lastPauseAction.timestamp);
          if (lastActionTime.getUTCFullYear() === nowUTC.getUTCFullYear() &&
              lastActionTime.getUTCMonth() === nowUTC.getUTCMonth() &&
              lastActionTime.getUTCDate() === nowUTC.getUTCDate() &&
              lastActionTime.getUTCHours() === nowUTC.getUTCHours() &&
              (cluster.lastPauseAction.status === "SUCCESS" || cluster.lastPauseAction.status === "SKIPPED")) {
            alreadyProcessedThisHour = true;
            console.log(`processScheduledClusterOperations: PAUSE action for ${cluster.name} was already processed successfully or skipped this hour (${cluster.lastPauseAction.status} at ${lastActionTime.toISOString()}). Skipping.`);
          }
        }

        if (!alreadyProcessedThisHour) {
          console.log(`processScheduledClusterOperations: Attempting to PAUSE cluster ${cluster.name} (Project: ${project.projectId}).`);
          try {
            const result = await context.functions.execute(
              "setClusterPauseState",
              project.projectId,
              cluster.name,
              true, // true to pause
              actor
            );
            console.log(`processScheduledClusterOperations: setClusterPausedState result for PAUSE of ${cluster.name}:`, JSON.stringify(result));
          } catch (e) {
            console.error(`processScheduledClusterOperations: Error calling setClusterPausedState for PAUSE of ${cluster.name}: ${e.message}`, e);
          }
        }
      }

      // --- Check for RESUME action ---
      // Ensure resume configuration is valid before checking
      if (typeof cluster.resumeHour === 'number' && Array.isArray(cluster.resumeDaysOfWeek)) {
        if (cluster.resumeHour === currentLocalHour && cluster.resumeDaysOfWeek.includes(currentLocalDayOfWeek)) {
          console.log(`processScheduledClusterOperations: Cluster ${cluster.name} (Project: ${project.projectId}) matches RESUME schedule (Local Hour: ${currentLocalHour}, Local Day: ${currentLocalDayOfWeek}).`);

          let alreadyProcessedThisHour = false;
          if (cluster.lastResumeAction && cluster.lastResumeAction.timestamp) {
            const lastActionTime = new Date(cluster.lastResumeAction.timestamp);
            if (lastActionTime.getUTCFullYear() === nowUTC.getUTCFullYear() &&
                lastActionTime.getUTCMonth() === nowUTC.getUTCMonth() &&
                lastActionTime.getUTCDate() === nowUTC.getUTCDate() &&
                lastActionTime.getUTCHours() === nowUTC.getUTCHours() &&
                (cluster.lastResumeAction.status === "SUCCESS" || cluster.lastResumeAction.status === "SKIPPED")) {
              alreadyProcessedThisHour = true;
              console.log(`processScheduledClusterOperations: RESUME action for ${cluster.name} was already processed successfully or skipped this hour (${cluster.lastResumeAction.status} at ${lastActionTime.toISOString()}). Skipping.`);
            }
          }

          if (!alreadyProcessedThisHour) {
            console.log(`processScheduledClusterOperations: Attempting to RESUME cluster ${cluster.name} (Project: ${project.projectId}).`);
            try {
              const result = await context.functions.execute(
                "setClusterPausedState",
                project.projectId,
                cluster.name,
                false, // false to resume
                actor
              );
              console.log(`processScheduledClusterOperations: setClusterPausedState result for RESUME of ${cluster.name}:`, JSON.stringify(result));
            } catch (e) {
              console.error(`processScheduledClusterOperations: Error calling setClusterPausedState for RESUME of ${cluster.name}: ${e.message}`, e);
            }
          }
        }
      }
    } // end for each cluster
  } // end for each project

  console.log("processScheduledClusterOperations: Trigger finished.");
  return { status: "completed", message: "Scheduled cluster operations processed." };
};