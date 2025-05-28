// Atlas Function: logClusterAutomationChange
// Linked to a Database Trigger on 'clusterOps.cluster_automation' for 'UPDATE' operations.
// Ensure "Full Document Pre-Image" and "Full Document" are ENABLED for the trigger.

exports = async function (changeEvent) {
  console.log(
    "logClusterAutomationChange triggered. ChangeEvent ID:",
    changeEvent._id.toString(),
    "Full Event:",
    JSON.stringify(changeEvent, null, 2),
  );

  let activityLogsCollection;
  try {
    // Using your specific utility function to get the activity_logs collection handle
    activityLogsCollection = await context.functions.execute(
      "utility/getActivityLogsCollection",
    );
  } catch (error) {
    console.error(
      `logClusterAutomationChange: CRITICAL - Failed to get activity_logs collection handle: ${error.message}`,
      error,
    );
    // If we can't log, there's not much more this function can do.
    // This error will be in the App Services logs.
    return;
  }

  const {
    updateDescription,
    fullDocument,
    fullDocumentBeforeChange,
    documentKey,
  } = changeEvent;

  if (!updateDescription) {
    console.warn(
      "logClusterAutomationChange: No updateDescription found in changeEvent. Skipping.",
      documentKey._id,
    );
    return;
  }

  if (!fullDocument || !fullDocumentBeforeChange) {
    console.error(
      "logClusterAutomationChange: Missing fullDocument or fullDocumentBeforeChange. Ensure trigger is configured correctly with Full Document Pre-Image enabled. Skipping.",
      documentKey._id,
    );
    return;
  }

  const projectId = fullDocument.projectId; // Assuming projectId is always present
  const projectDocumentId = documentKey._id; // The _id of the document in cluster_automation

  // Attempt to determine the actor.
  // This relies on the calling function (e.g., UI backend) setting 'lastUpdatedBy' on the document.
  const actor =
    fullDocument.lastUpdatedBy ||
    fullDocumentBeforeChange.lastUpdatedBy ||
    "SYSTEM_DB_TRIGGER";

  const logsToInsert = [];
  const timestamp = new Date();

  // Helper function to get a value from a nested object using a path string
  const getValueByPath = (obj, path) => {
    if (!obj || typeof path !== "string") return undefined;
    return path.split(".").reduce((currentObject, key) => {
      // Handle array indexing like "clusters.0.name"
      const arrayMatch = key.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const arrayKey = arrayMatch[1];
        const index = parseInt(arrayMatch[2]);
        if (
          currentObject &&
          currentObject[arrayKey] &&
          Array.isArray(currentObject[arrayKey])
        ) {
          return currentObject[arrayKey][index];
        }
        return undefined;
      }
      return currentObject && typeof currentObject === "object"
        ? currentObject[key]
        : undefined;
    }, obj);
  };

  // Process updated fields
  if (updateDescription.updatedFields) {
    for (const fieldPath in updateDescription.updatedFields) {
      const newValue = updateDescription.updatedFields[fieldPath];
      const oldValue = getValueByPath(fullDocumentBeforeChange, fieldPath);

      let clusterName = null;
      const details = {
        fieldName: fieldPath,
        oldValue: oldValue === undefined ? null : oldValue, // Standardize undefined to null for logging
        newValue: newValue === undefined ? null : newValue,
        projectDocumentId: projectDocumentId.toString(),
      };

      // Check if this is a change within the 'clusters' array
      if (fieldPath.startsWith("clusters.")) {
        const pathParts = fieldPath.split(".");
        // e.g., clusters.0.description -> pathParts = ["clusters", "0", "description"]
        if (pathParts.length >= 2 && !isNaN(parseInt(pathParts[1]))) {
          const clusterIndex = parseInt(pathParts[1]);
          // Try to get the name from the new document, fallback to old if cluster was somehow removed in same op (unlikely for field update)
          clusterName =
            fullDocument.clusters[clusterIndex]?.name ||
            fullDocumentBeforeChange.clusters[clusterIndex]?.name;
          details.clusterIndex = clusterIndex; // Optionally log the index
        }
      }

      logsToInsert.push({
        timestamp: timestamp,
        eventType: "METADATA_UPDATE",
        actor: actor,
        projectId: projectId,
        clusterId: clusterName, // This will be the cluster name if applicable, otherwise null
        status: "SUCCESS", // The change has already happened
        errorMessage: null,
        details: details,
      });
    }
  }

  // Process removed fields
  if (
    updateDescription.removedFields &&
    updateDescription.removedFields.length > 0
  ) {
    for (const fieldPath of updateDescription.removedFields) {
      const oldValue = getValueByPath(fullDocumentBeforeChange, fieldPath);
      let clusterName = null;
      const details = {
        fieldName: fieldPath,
        oldValue: oldValue === undefined ? null : oldValue,
        newValue: "", // Indicate the field was removed
        projectDocumentId: projectDocumentId.toString(),
      };

      if (fieldPath.startsWith("clusters.")) {
        const pathParts = fieldPath.split(".");
        if (pathParts.length >= 2 && !isNaN(parseInt(pathParts[1]))) {
          const clusterIndex = parseInt(pathParts[1]);
          // Field is removed, so cluster info must come from fullDocumentBeforeChange
          clusterName = fullDocumentBeforeChange.clusters[clusterIndex]?.name;
          details.clusterIndex = clusterIndex;
        }
      }

      logsToInsert.push({
        timestamp: timestamp,
        eventType: "METADATA_UPDATE", // Or "METADATA_FIELD_REMOVED" if you want more specificity
        actor: actor,
        projectId: projectId,
        clusterId: clusterName,
        status: "SUCCESS",
        errorMessage: null,
        details: details,
      });
    }
  }

  // Insert all collected log entries
  if (logsToInsert.length > 0) {
    try {
      const result = await activityLogsCollection.insertMany(logsToInsert);
      console.log(
        `logClusterAutomationChange: Successfully inserted ${result.insertedCount} log entries for document ${projectDocumentId}.`,
      );
    } catch (error) {
      console.error(
        `logClusterAutomationChange: Error inserting log entries into activity_logs for document ${projectDocumentId}: ${error.message}`,
        error,
        JSON.stringify(logsToInsert),
      );
    }
  } else {
    console.log(
      `logClusterAutomationChange: No actionable changes detected in updateDescription for document ${projectDocumentId}. No logs inserted.`,
    );
  }
};
