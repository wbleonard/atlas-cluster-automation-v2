/*
 * Atlas Function: setClusterPauseState
 * Sets the pause state of a MongoDB Atlas cluster and logs the activity
 * 
 * Parameters:
 * - projectId: Atlas project ID
 * - clusterName: Name of the cluster to modify
 * - targetState: "PAUSED" or "ACTIVE"
 * - triggerSource: Source of the trigger (e.g., "SCHEDULED_TRIGGER", "MANUAL_TRIGGER")
 * 
 * Returns:
 * - Object with status, message, and details
 */

exports = async function(projectId, clusterName, targetState, triggerSource = "UNKNOWN") {
  console.log(`🔄 setClusterPauseState: ${clusterName} → ${targetState} (source: ${triggerSource})`);

  if (!projectId || !clusterName || !targetState) {
    const error = "Missing required parameters: projectId, clusterName, or targetState";
    console.error(`❌ setClusterPauseState: ${error}`);
    return { status: "error", message: error };
  }

  if (!["PAUSED", "ACTIVE"].includes(targetState)) {
    const error = `Invalid targetState: ${targetState}. Must be "PAUSED" or "ACTIVE"`;
    console.error(`❌ setClusterPauseState: ${error}`);
    return { status: "error", message: error };
  }

  try {
    // Get current cluster state
    const cluster = await context.functions.execute("atlas/getProjectCluster", projectId, clusterName);
    
    if (!cluster) {
      const error = `Cluster ${clusterName} not found in project ${projectId}`;
      console.error(`❌ setClusterPauseState: ${error}`);
      return { status: "error", message: error };
    }

    const currentState = cluster.paused ? "PAUSED" : "ACTIVE";
    
    // Check if cluster is already in the target state
    if (currentState === targetState) {
      console.log(`⏭️ setClusterPauseState: Cluster ${clusterName} is already ${targetState}`);
      return { 
        status: "skipped", 
        message: `Cluster ${clusterName} is already ${targetState}`,
        currentState,
        targetState
      };
    }

    // Prepare the modification body
    const modificationBody = {
      paused: targetState === "PAUSED"
    };

    console.log(`🔧 setClusterPauseState: Modifying cluster ${clusterName} from ${currentState} to ${targetState}`);

    // Execute the cluster modification
    const modifyResult = await context.functions.execute(
      "modifyCluster",
      context.values.get("AtlasPublicKey"),
      context.values.get("AtlasPrivateKey"),
      projectId,
      clusterName,
      modificationBody
    );

    if (modifyResult.error) {
      console.error(`❌ setClusterPauseState: Cluster modification failed for ${clusterName}:`, modifyResult.error);
      await logActivity(projectId, clusterName, targetState, triggerSource, "FAILED", modifyResult.error);
      return {
        status: "error",
        message: `Cluster modification failed: ${modifyResult.error}`,
        details: modifyResult
      };
    }

    console.log(`✅ setClusterPauseState: Successfully modified cluster ${clusterName} to ${targetState}`);

    // Log the successful activity
    await logActivity(projectId, clusterName, targetState, triggerSource, "SUCCESS", `Cluster ${clusterName} set to ${targetState}`);

    return {
      status: "success",
      message: `Cluster ${clusterName} successfully set to ${targetState}`,
      previousState: currentState,
      newState: targetState,
      triggerSource,
      details: modifyResult
    };

  } catch (error) {
    console.error(`❌ setClusterPauseState: Critical error for cluster ${clusterName}:`, error.message);
    
    // Attempt to log the failure
    try {
      await logActivity(projectId, clusterName, targetState, triggerSource, "ERROR", error.message);
    } catch (logError) {
      console.error(`❌ setClusterPauseState: Failed to log error activity:`, logError.message);
    }

    return {
      status: "error",
      message: `Critical error: ${error.message}`,
      error: error.message
    };
  }
};

// Helper function to log activity
async function logActivity(projectId, clusterName, targetState, triggerSource, status, message) {
  try {
    const activityLogsCollection = await context.functions.execute("collections/getActivityLogsCollection");
    
    if (!activityLogsCollection) {
      console.warn("⚠️ setClusterPauseState: Unable to get activity logs collection for logging");
      return;
    }

    const logEntry = {
      timestamp: new Date(),
      action: targetState === "PAUSED" ? "CLUSTER_PAUSE" : "CLUSTER_RESUME",
      projectId,
      clusterName,
      targetState,
      triggerSource,
      status,
      message,
      details: {
        functionCaller: "setClusterPauseState"
      }
    };

    await activityLogsCollection.insertOne(logEntry);
    console.log(`📝 setClusterPauseState: Activity logged for ${clusterName}: ${status}`);

  } catch (error) {
    console.error(`❌ setClusterPauseState: Failed to log activity for ${clusterName}:`, error.message);
    // Don't throw error - logging failure shouldn't break the main operation
  }
}
