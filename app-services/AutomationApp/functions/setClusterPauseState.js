exports = async function (
  projectId,
  clusterName,
  desiredState,
  actor = "SYSTEM_AUTOMATION",
) {
  // desiredState: true to PAUSE, false to RESUME
  // actor: Identifier for who/what initiated the action (e.g., "SYSTEM_AUTOMATION", "UI_USER:<userId>")

  let clusterOpsCollection;
  let activityLogsCollection;

  try {
    // Use the specific utility functions to get collection handles
    clusterOpsCollection = await context.functions.execute(
      "utility/getClusterOpsCollection",
    );
    activityLogsCollection = await context.functions.execute(
      "utility/getActivityLogsCollection",
    );
  } catch (error) {
    console.error(
      `setClusterPausedState: Critical error getting collection handles: ${error.message}`,
      error,
    );
    return {
      status: "error",
      message: `Failed to initialize database connections: ${error.message}`,
    };
  }

  const actionType = desiredState ? "PAUSE" : "RESUME";
  const logEventTypePrefix = desiredState ? "PAUSE" : "RESUME";
  let logStatus = "FAILURE"; // Default to failure, will be updated on success or skip
  let logMessage = "";
  const logDetails = {
    action: actionType.toLowerCase(),
    projectId: projectId,
    clusterName: clusterName,
    desiredState: desiredState,
    actor: actor,
  };

  console.log(
    `setClusterPausedState called for Project: ${projectId}, Cluster: ${clusterName}, Action: ${actionType}, Actor: ${actor}`,
  );

  try {
    // 1. Fetch cluster configuration for pre-checks
    const projectDoc = await clusterOpsCollection.findOne({
      projectId: projectId,
    });
    if (!projectDoc) {
      logMessage = `Project document with ID ${projectId} not found in cluster_automation. Cannot ${actionType.toLowerCase()} cluster ${clusterName}.`;
      console.error(logMessage);
      // Log to activity_logs even if we can't update cluster_automation
      await logActivity(
        activityLogsCollection,
        `${logEventTypePrefix}_ATTEMPT_FAILURE`,
        actor,
        projectId,
        clusterName,
        "FAILURE",
        logMessage,
        logDetails,
      );
      return { status: "error", message: logMessage };
    }

    const clusterConfig = projectDoc.clusters.find(
      (c) => c.name === clusterName,
    );
    if (!clusterConfig) {
      logMessage = `Cluster ${clusterName} not found in project ${projectId} (document _id: ${projectDoc._id}) within cluster_automation. Cannot ${actionType.toLowerCase()}.`;
      console.error(logMessage);
      await logActivity(
        activityLogsCollection,
        `${logEventTypePrefix}_ATTEMPT_FAILURE`,
        actor,
        projectId,
        clusterName,
        "FAILURE",
        logMessage,
        logDetails,
      );
      return { status: "error", message: logMessage };
    }

    logDetails.currentInstanceSize = clusterConfig.instanceSize; // Add instance size to log details

    // 2. Pre-checks if attempting to PAUSE
    if (desiredState === true) {
      // If pausing
      // Tier Check: M0, M2, M5 clusters cannot be paused via API [1]
      const nonPausableTiers = ["M0", "M2", "M5"];
      if (
        clusterConfig.instanceSize &&
        nonPausableTiers.includes(clusterConfig.instanceSize.toUpperCase())
      ) {
        logMessage = `Cluster ${clusterName} (Tier: ${clusterConfig.instanceSize}) cannot be paused via API. Action skipped.`;
        console.warn(logMessage);
        logStatus = "SKIPPED";
        await logActivity(
          activityLogsCollection,
          `${logEventTypePrefix}_SKIPPED_TIER`,
          actor,
          projectId,
          clusterName,
          logStatus,
          logMessage,
          logDetails,
        );
        await updateLastActionStatus(
          clusterOpsCollection,
          projectId,
          clusterName,
          desiredState,
          logStatus,
          logMessage,
        );
        return { status: "skipped", message: logMessage };
      }

      // Cooldown Check: Must run for 60 minutes after resume before pausing again [1]
      if (
        clusterConfig.lastResumeAction &&
        clusterConfig.lastResumeAction.timestamp
      ) {
        const lastResumeTime = new Date(
          clusterConfig.lastResumeAction.timestamp,
        );
        const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (lastResumeTime > sixtyMinutesAgo) {
          logMessage = `Cluster ${clusterName} was resumed at ${lastResumeTime.toISOString()}, which is less than 60 minutes ago. Pause action skipped.`;
          console.warn(logMessage);
          logStatus = "SKIPPED";
          await logActivity(
            activityLogsCollection,
            `${logEventTypePrefix}_SKIPPED_COOLDOWN`,
            actor,
            projectId,
            clusterName,
            logStatus,
            logMessage,
            logDetails,
          );
          await updateLastActionStatus(
            clusterOpsCollection,
            projectId,
            clusterName,
            desiredState,
            logStatus,
            logMessage,
          );
          return { status: "skipped", message: logMessage };
        }
      }
    }

    // 3. Call the user's modifyCluster function
    console.log(
      `Attempting to call modifyCluster for Project: ${projectId}, Cluster: ${clusterName}, Payload: { "paused": ${desiredState} }`,
    );
    const payload = { paused: desiredState };

    let modifyClusterApiResponse;
    username = await context.values.get("AtlasPublicKey");
    password = await context.values.get("AtlasPrivateKey");
    try {
      // Execute the existing modifyCluster function [1]
      modifyClusterApiResponse = await context.functions.execute(
        "modifyCluster",
        username,
        password,
        projectId,
        clusterName,
        payload,
      );

      // IMPORTANT: Assess success based on modifyCluster's behavior.
      // If modifyCluster throws an error on API failure, this try block handles it.
      // If modifyCluster returns an HTTP response object, you might need to check its statusCode.
      // For this example, we assume if it doesn't throw, it's an indication of successful dispatch.
      // A more robust check would inspect modifyClusterApiResponse if it's the direct HTTP response.
      // e.g. if (modifyClusterApiResponse.statusCode < 200 || modifyClusterApiResponse.statusCode >= 300) throw new Error(...)

      logStatus = "SUCCESS";
      logMessage = `modifyCluster call for ${actionType.toLowerCase()} action on cluster ${clusterName} completed. Atlas API will process the request.`;
      console.log(logMessage);
      // You might want to log parts of modifyClusterApiResponse if it's useful and not too verbose
      logDetails.modifyClusterResponseSummary = `Call to modifyCluster executed.`;
    } catch (apiError) {
      logStatus = "FAILURE";
      logMessage = `setClusterPausedState: Error executing modifyCluster for ${clusterName} to ${actionType.toLowerCase()}: ${apiError.message}`;
      console.error(logMessage, apiError);
      logDetails.errorDetails = apiError.toString();
      // The error will be logged and status updated below, no re-throw needed here.
    }

    // 4. Log to activity_logs
    await logActivity(
      activityLogsCollection,
      `${logEventTypePrefix}_API_${logStatus}`,
      actor,
      projectId,
      clusterName,
      logStatus,
      logMessage,
      logDetails,
    );

    // 5. Update lastPauseAction / lastResumeAction in cluster_automation
    await updateLastActionStatus(
      clusterOpsCollection,
      projectId,
      clusterName,
      desiredState,
      logStatus,
      logMessage,
    );

    if (logStatus === "SUCCESS") {
      return { status: "success", message: logMessage, details: logDetails };
    } else {
      // This includes "FAILURE" and "SKIPPED" (though skipped returns earlier)
      return {
        status: logStatus.toLowerCase(),
        message: logMessage,
        details: logDetails,
      };
    }
  } catch (error) {
    // Catch-all for unexpected errors within setClusterPausedState itself
    logMessage = `setClusterPausedState: Unexpected error in setClusterPausedState for ${clusterName} (Action: ${actionType}): ${error.message}`;
    console.error(logMessage, error);
    logDetails.unexpectedError = error.toString();
    // Attempt to log this critical failure to activity_logs
    try {
      await logActivity(
        activityLogsCollection,
        `${logEventTypePrefix}_SYSTEM_ERROR`,
        actor,
        projectId,
        clusterName,
        "FAILURE",
        logMessage,
        logDetails,
      );
    } catch (logError) {
      console.error(
        "CRITICAL: Failed to write to activity_logs during a system error in setClusterPausedState:",
        logError,
      );
    }
    return { status: "error", message: logMessage, details: logDetails };
  }
};

// Helper function for consistent logging to activity_logs
async function logActivity(
  collection,
  eventType,
  actor,
  projectId,
  clusterId,
  status,
  message,
  detailsObject,
) {
  try {
    const logEntry = {
      timestamp: new Date(),
      eventType: eventType,
      actor: actor,
      projectId: projectId,
      clusterId: clusterId, // Using clusterName as clusterId for logging consistency
      status: status,
      errorMessage:
        status === "FAILURE" || status === "SKIPPED" ? message : null,
      details: detailsObject | {},
    };
    await collection.insertOne(logEntry);
    console.log(
      `Logged to activity_logs: Event: ${eventType}, Cluster: ${clusterId}, Status: ${status}`,
    );
  } catch (e) {
    console.error(
      `setClusterPausedState: Failed to insert log into activity_logs. Event: ${eventType}, Cluster: ${clusterId}. Error: ${e.message}`,
      e,
    );
    // Depending on severity, you might want to handle this failure more explicitly.
  }
}

// Helper function to update the lastPauseAction or lastResumeAction field
async function updateLastActionStatus(
  collection,
  projectId,
  clusterName,
  isPauseAction,
  status,
  message,
) {
  const actionRecord = {
    timestamp: new Date(),
    status: status,
    message: message,
  };
  const fieldToUpdate = isPauseAction
    ? "clusters.$.lastPauseAction"
    : "clusters.$.lastResumeAction";

  try {
    const updateResult = await collection.updateOne(
      { projectId: projectId, "clusters.name": clusterName },
      { $set: { actionRecord } },
    );

    if (updateResult.matchedCount === 0) {
      console.error(
        `setClusterPausedState: Failed to find Project ${projectId} / Cluster ${clusterName} in cluster_automation to update lastActionStatus.`,
      );
    } else if (
      updateResult.modifiedCount === 0 &&
      updateResult.matchedCount === 1
    ) {
      // This could mean the document was found, but the specific cluster sub-document wasn't matched by "clusters.name",
      // or the new actionRecord was identical to the existing one.
      console.warn(
        `setClusterPausedState: Document for Project ${projectId} was matched, but cluster ${clusterName}'s lastActionStatus was not modified. Check if cluster name is correct or if data was identical.`,
      );
    } else {
      console.log(
        `Updated ${fieldToUpdate} for Cluster ${clusterName} in Project ${projectId} with status: ${status}`,
      );
    }
  } catch (e) {
    console.error(
      `setClusterPausedState: Failed to update lastActionStatus for Cluster ${clusterName} in Project ${projectId}. Error: ${e.message}`,
      e,
    );
  }
}
