// Atlas Function: updateClusterMetadata
// Updates cluster metadata using Atlas tags (tag-based approach)
// Assumes authenticated user context.

exports = async function(payload) {
  // Expected payload: { projectId: "...", clusterName: "...", updates: { schedule: "...", automationEnabled: true/false, owner: "...", description: "..." } }
  const { projectId, clusterName, updates } = payload;
  const userId = context.user?.id || "UNKNOWN_UI_USER";

  if (!projectId || !clusterName || !updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
    console.error("updateClusterMetadata: Invalid input. Payload:", JSON.stringify(payload));
    throw new Error("Missing or invalid projectId, clusterName, or updates in payload for updateClusterMetadata.");
  }

  console.log(`updateClusterMetadata: User ${userId} attempting to update cluster ${clusterName} in project ${projectId} with:`, JSON.stringify(updates));

  try {
    // Get current cluster data
    const cluster = await context.functions.execute("atlas/getProjectCluster", projectId, clusterName);
    if (!cluster) {
      throw new Error(`Cluster ${clusterName} not found in project ${projectId}`);
    }

    const results = {
      success: true,
      updatedFields: [],
      errors: []
    };

    // Handle schedule updates
    if (updates.schedule !== undefined) {
      try {
        if (updates.schedule === null || updates.schedule === "") {
          // Remove schedule
          await context.functions.execute("tags/removeClusterScheduleTag", projectId, clusterName);
          results.updatedFields.push("schedule (removed)");
        } else {
          // Set/update schedule
          await context.functions.execute("tags/setClusterScheduleTag", projectId, clusterName, updates.schedule);
          results.updatedFields.push(`schedule (set to: ${updates.schedule})`);
        }
      } catch (error) {
        console.error(`Error updating schedule for ${clusterName}:`, error.message);
        results.errors.push(`Schedule update failed: ${error.message}`);
      }
    }

    // Handle automation enabled/disabled
    if (updates.automationEnabled !== undefined) {
      try {
        await context.functions.execute("automation/setClusterAutomationEnabled", projectId, clusterName, updates.automationEnabled);
        results.updatedFields.push(`automation ${updates.automationEnabled ? 'enabled' : 'disabled'}`);
      } catch (error) {
        console.error(`Error updating automation status for ${clusterName}:`, error.message);
        results.errors.push(`Automation status update failed: ${error.message}`);
      }
    }

    // Handle metadata updates (owner, description, etc.)
    const metadataTags = [];
    
    if (updates.owner !== undefined) {
      metadataTags.push({ key: "owner", value: updates.owner || "" });
    }
    
    if (updates.description !== undefined) {
      metadataTags.push({ key: "description", value: updates.description || "" });
    }

    if (updates.customerContact !== undefined) {
      metadataTags.push({ key: "customer-contact", value: updates.customerContact || "" });
    }

    // Update metadata tags if any
    if (metadataTags.length > 0) {
      try {
        await context.functions.execute("tags/updateClusterTags", projectId, clusterName, metadataTags);
        results.updatedFields.push(`metadata tags: ${metadataTags.map(t => t.key).join(', ')}`);
      } catch (error) {
        console.error(`Error updating metadata tags for ${clusterName}:`, error.message);
        results.errors.push(`Metadata update failed: ${error.message}`);
      }
    }

    // Log the activity
    try {
      const activityLogsCollection = await context.functions.execute("collections/getActivityLogsCollection");
      await activityLogsCollection.insertOne({
        timestamp: new Date(),
        action: "UI_METADATA_UPDATE",
        projectId: projectId,
        projectName: cluster.projectName || "Unknown Project",
        clusterName: clusterName,
        userId: userId,
        details: {
          updatedFields: results.updatedFields,
          errors: results.errors,
          originalUpdates: updates
        }
      });
    } catch (logError) {
      console.error("Failed to log activity:", logError.message);
      // Don't fail the operation if logging fails
    }

    // Determine overall success
    if (results.errors.length === 0) {
      console.log(`updateClusterMetadata: Successfully updated ${results.updatedFields.length} fields for cluster ${clusterName}`);
      return {
        success: true,
        message: `Successfully updated: ${results.updatedFields.join(', ')}`,
        updatedFields: results.updatedFields
      };
    } else if (results.updatedFields.length > 0) {
      console.warn(`updateClusterMetadata: Partial success for cluster ${clusterName}. Updated: ${results.updatedFields.join(', ')}. Errors: ${results.errors.join(', ')}`);
      return {
        success: true,
        warning: true,
        message: `Partially updated: ${results.updatedFields.join(', ')}. Errors: ${results.errors.join(', ')}`,
        updatedFields: results.updatedFields,
        errors: results.errors
      };
    } else {
      console.error(`updateClusterMetadata: All updates failed for cluster ${clusterName}. Errors: ${results.errors.join(', ')}`);
      return {
        success: false,
        message: `All updates failed: ${results.errors.join(', ')}`,
        errors: results.errors
      };
    }

  } catch (error) {
    console.error(`updateClusterMetadata: Critical error: ${error.message}`, error);
    throw new Error(`Failed to update cluster metadata: ${error.message}`);
  }
};