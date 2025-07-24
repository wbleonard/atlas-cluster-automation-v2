// Atlas Scheduled Trigger Function: ensureDefaultTagsScheduled
// Runs on a configurable schedule to ensure all clusters have required default tags
// Default: Weekly on Monday at midnight UTC (disabled by default)
// Configure schedule in Atlas App Services → Triggers → ensureDefaultTagsTrigger

exports = async function() {
  console.log("⏰ SCHEDULED TRIGGER: Starting default tag enforcement");
  
  try {
    // Run the default tag enforcement for all projects
    const result = await context.functions.execute("automation/ensureDefaultTags");
    
    console.log("✅ Scheduled default tag enforcement completed successfully");
    return result;
    
  } catch (error) {
    console.error("❌ Scheduled default tag enforcement failed:", error.message);
    
    // Log the failure to activity logs
    try {
      const activityCollection = await context.functions.execute("collections/getActivityLogsCollection");
      await activityCollection.insertOne({
        timestamp: new Date(),
        action: "SCHEDULED_TAG_ENFORCEMENT_FAILED",
        projectId: null,
        clusterName: null,
        details: {
          error: error.message,
          schedule: "configurable-scheduled-trigger"
        },
        status: "FAILED",
        triggerSource: "SCHEDULED_TRIGGER"
      });
    } catch (logError) {
      console.warn(`⚠️ Failed to log scheduled trigger failure: ${logError.message}`);
    }
    
    throw error;
  }
};
