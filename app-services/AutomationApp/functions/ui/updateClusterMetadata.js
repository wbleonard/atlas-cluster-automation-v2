// Atlas Function: updateClusterMetadata
// Updates user-editable metadata for a specific cluster.
// Assumes authenticated user context.

exports = async function(payload) {
  // Expected payload: { projectId: "...", clusterName: "...", updates: { owner: "...", description: "...", pauseHour: 22, ... } }
  const { projectId, clusterName, updates } = payload;
  const userId = context.user?.id || "UNKNOWN_UI_USER"; // Get App Services authenticated user ID

  if (!projectId || !clusterName || !updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
    console.error("updateClusterMetadata: Invalid input. Payload:", JSON.stringify(payload));
    throw new Error("Missing or invalid projectId, clusterName, or updates in payload for updateClusterMetadata.");
  }

  console.log(`updateClusterMetadata: User ${userId} attempting to update cluster ${clusterName} in project ${projectId} with:`, JSON.stringify(updates));

  let clusterOpsCollection;
  let activityLogsCollection;
  try {
    clusterOpsCollection = await context.functions.execute("utility_getClusterOpsCollection"); // User's existing function [1]
    activityLogsCollection = await context.functions.execute("getActivityLogsCollection");
  } catch (error) {
    console.error(`updateClusterMetadata: CRITICAL - Failed to get collection handles: ${error.message}`, error);
    throw new Error(`Failed to initialize database connection: ${error.message}`);
  }

  // Define allowed editable fields from your schema [1] and new schedule fields
  // This provides a whitelist and basic validation rules.
  const allowedUpdatesConfig = {
    "mongoOwner": { type: "string", pathPrefix: "clusters.$." },      // User doc schema [1]
    "description": { type: "string", pathPrefix: "clusters.$." },     // User doc schema [1]
    "customerContact": { type: "string", pathPrefix: "clusters.$." }, // User doc schema [1]
    "pauseHour": { type: "number", min: 0, max: 23, allowNull: true, pathPrefix: "clusters.$." },
    "pauseDaysOfWeek": { type: "array", elementType: "number", min: 0, max: 6, pathPrefix: "clusters.$." },
    "resumeHour": { type: "number", min: 0, max: 23, allowNull: true, pathPrefix: "clusters.$." },
    "resumeDaysOfWeek": { type: "array", elementType: "number", min: 0, max: 6, pathPrefix: "clusters.$." },
    "timezone": { type: "string", pathPrefix: "clusters.$." }
    // You can add more fields here as needed, e.g., 'owner' if different from mongoOwner
  };

  const setOperation = {}; // This will hold all the fields to be $set
  const changedFieldsForLog = {}; // To store what actually changed for detailed logging

  // Validate and build the $set operation
  for (const key in updates) {
    if (allowedUpdatesConfig.hasOwnProperty(key)) {
      const rule = allowedUpdatesConfig[key];
      const value = updates[key];

      // Basic Type and Range Validation (can be expanded)
      if (rule.allowNull && (value === null || value === undefined)) {
        setOperation[`${rule.pathPrefix}${key}`] = null;
        changedFieldsForLog[key] = { newValue: null };
        continue;
      }
      if (typeof value !== rule.type) {
        throw new Error(`Invalid data type for field '${key}'. Expected ${rule.type}, got ${typeof value}.`);
      }
      if (rule.type === "number" && ((rule.min !== undefined && value < rule.min) || (rule.max !== undefined && value > rule.max))) {
        throw new Error(`Value for field '${key}' (${value}) is out of range [${rule.min}-${rule.max}].`);
      }
      if (rule.type === "array") {
        if (!Array.isArray(value)) throw new Error(`Field '${key}' must be an array.`);
        if (rule.elementType) {
          for (const item of value) {
            if (typeof item !== rule.elementType) throw new Error(`Elements in '${key}' must be of type ${rule.elementType}.`);
            if (rule.elementType === "number" && ((rule.min !== undefined && item < rule.min) || (rule.max !== undefined && item > rule.max))) {
              throw new Error(`Array element '${item}' for '${key}' is out of range [${rule.min}-${rule.max}].`);
            }
          }
        }
      }
      // Add more specific validation (e.g., IANA timezone format) as needed

      setOperation[`${rule.pathPrefix}${key}`] = value;
      changedFieldsForLog[key] = { newValue: value }; // Old value to be fetched later if needed for this log
    } else {
      console.warn(`updateClusterMetadata: Attempted to update disallowed field: '${key}'. Skipping this field.`);
      // Do not throw an error, just skip disallowed fields, or adjust if strictness is required
    }
  }

  if (Object.keys(setOperation).length === 0) {
    console.log("updateClusterMetadata: No valid or changed fields to update were provided after validation.");
    return { success: true, message: "No valid changes to apply.", modifiedCount: 0 };
  }

  // Add audit fields for the update operation.
  // These are set on the specific cluster sub-document being updated.
  const updateTimestamp = new Date();
  setOperation["clusters.$.lastUpdatedByUIUser"] = userId; // For the DB trigger to pick up
  setOperation["clusters.$.lastUpdatedUITimestamp"] = updateTimestamp;

  try {
    // Fetch the existing cluster to log old values *before* the update
    // This is optional if the DB trigger handles old/new values comprehensively,
    // but good for the direct log from this function.
    const projectDocBeforeUpdate = await clusterOpsCollection.findOne(
      { "projectId": projectId, "clusters.name": clusterName },
      { projection: { "clusters.$": 1 } } // Get only the matching cluster
    );

    let oldValuesForDirectLog = {};
    if (projectDocBeforeUpdate && projectDocBeforeUpdate.clusters && projectDocBeforeUpdate.clusters.length > 0) {
      const currentClusterState = projectDocBeforeUpdate.clusters[0];
      for (const field in changedFieldsForLog) {
        // 'field' is like "owner", "description", "pauseHour"
        if (allowedUpdatesConfig[field]) { // Ensure we only care about allowed fields
            oldValuesForDirectLog[field] = currentClusterState[field];
        }
      }
    }

    // Perform the update
    const result = await clusterOpsCollection.updateOne(
      { "projectId": projectId, "clusters.name": clusterName },
      { $set: setOperation }
    );

    if (result.matchedCount === 0) {
      const notFoundMsg = `Cluster ${clusterName} in project ${projectId} not found for update.`;
      console.warn(`updateClusterMetadata: ${notFoundMsg}`);
      return { success: false, message: notFoundMsg };
    }
    if (result.modifiedCount === 0 && result.matchedCount === 1) {
      console.log(`updateClusterMetadata: Cluster ${clusterName} found, but no fields were effectively modified. Data might be identical to existing values.`);
      // Still log the user's attempt as successful if no error occurred
    } else {
      console.log(`updateClusterMetadata: Successfully processed update for cluster ${clusterName}. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
    }

    // Direct logging to activity_logs for this manual action
    // This log entry captures what was *attempted* to be set from the UI.
    // The Database Trigger will capture the actual before/after from the DB.
    const logDetails = {
      clusterName: clusterName,
      projectId: projectId,
      updatedFieldsAttempted: updates, // What the UI sent
      changedFieldsApplied: Object.keys(setOperation).filter(k => k.startsWith("clusters.$") && !k.includes("lastUpdatedBy") && !k.includes("lastUpdatedTimestamp")).map(k => k.substring("clusters.$.".length)), // Actual fields set
      oldValues: oldValuesForDirectLog, // Values before this specific operation
      updatedBy: userId
    };
    await logActivity(activityLogsCollection, "MANUAL_METADATA_UPDATE", `UI_USER:${userId}`, projectId, clusterName, "SUCCESS", `User ${userId} updated metadata for cluster ${clusterName}.`, logDetails);

    return { success: true, message: "Cluster metadata updated successfully.", modifiedCount: result.modifiedCount };

  } catch (error) {
    console.error(`updateClusterMetadata: Error updating cluster ${clusterName}: ${error.message}`, error);
    const logDetails = {
      clusterName: clusterName,
      projectId: projectId,
      updateAttempt: updates,
      error: error.message,
      actor: `UI_USER:${userId}`
    };
    // Attempt to log the failure
    await logActivity(activityLogsCollection, "MANUAL_METADATA_UPDATE_FAILURE", `UI_USER:${userId}`, projectId, clusterName, "FAILURE", `Failed to update metadata for cluster ${clusterName}: ${error.message}`, logDetails);
    throw new Error(`Error updating cluster metadata: ${error.message}`);
  }
};

// Helper function for consistent logging to activity_logs
async function logActivity(collection, eventType, actor, projectId, clusterId, status, message, detailsObject) {
  if (!collection) {
    console.error(`logActivity (from updateClusterMetadata): Collection handle is undefined. Cannot log event: ${eventType}`);
    return;
  }
  try {
    const logEntry = {
      timestamp: new Date(), eventType: eventType, actor: actor, projectId: projectId,
      clusterId: clusterId, status: status,
      errorMessage: (status === "FAILURE" || status === "SKIPPED") ? message : null,
      details: detailsObject || {}
    };
    await collection.insertOne(logEntry);
    console.log(`Logged to activity_logs (from updateClusterMetadata): Event: ${eventType}, Cluster: ${clusterId || 'N/A'}, Status: ${status}`);
  } catch (e) {
    console.error(`Failed to insert log into activity_logs (from updateClusterMetadata). Event: ${eventType}, Cluster: ${clusterId || 'N/A'}. Error: ${e.message}`, e);
  }
}