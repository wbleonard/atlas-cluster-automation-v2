/*
 * Diagnostic function to check activity logs collection status
 * Helps troubleshoot when activity logs appear empty
 * 
 * Returns: Information about the collection and sample data
 */
exports = async function() {
  console.log("🔍 Checking activity_logs collection status...");
  
  try {
    const activityCollection = await context.functions.execute("collections/getActivityLogsCollection");
    
    if (!activityCollection) {
      return { 
        error: "Unable to get activity logs collection",
        suggestion: "Check that the collection exists and is properly configured"
      };
    }

    // Get total count of all documents
    const totalCountResult = await activityCollection.aggregate([
      { $count: "total" }
    ]).toArray();
    
    const totalCount = totalCountResult.length > 0 ? totalCountResult[0].total : 0;

    console.log(`📊 Total documents in activity_logs: ${totalCount}`);

    if (totalCount === 0) {
      return {
        success: true,
        status: "EMPTY",
        totalDocuments: 0,
        message: "The activity_logs collection is empty. No activity has been logged yet.",
        suggestion: "Run some automation operations to generate logs. Try: await context.functions.execute('automation/ensureDefaultTags')"
      };
    }

    // Get date range of data
    const dateRangeResult = await activityCollection.aggregate([
      {
        $group: {
          _id: null,
          oldestTimestamp: { $min: "$timestamp" },
          newestTimestamp: { $max: "$timestamp" }
        }
      }
    ]).toArray();

    const dateRange = dateRangeResult.length > 0 ? dateRangeResult[0] : null;

    // Get sample of most recent records
    const recentSamples = await activityCollection
      .find({})
      .sort({ timestamp: -1 })
      .limit(5)
      .toArray();

    // Get action type breakdown
    const actionBreakdown = await activityCollection.aggregate([
      { $group: { _id: "$action", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    // Get status breakdown
    const statusBreakdown = await activityCollection.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    const result = {
      success: true,
      status: "HAS_DATA",
      totalDocuments: totalCount,
      dateRange: {
        oldest: dateRange?.oldestTimestamp,
        newest: dateRange?.newestTimestamp,
        spanInDays: dateRange ? 
          Math.round((dateRange.newestTimestamp - dateRange.oldestTimestamp) / (1000 * 60 * 60 * 24)) : 0
      },
      actionBreakdown: actionBreakdown.map(item => ({
        action: item._id,
        count: item.count
      })),
      statusBreakdown: statusBreakdown.map(item => ({
        status: item._id,
        count: item.count
      })),
      recentSamples: recentSamples.map(log => ({
        timestamp: log.timestamp,
        action: log.action,
        clusterName: log.clusterName,
        status: log.status,
        message: log.message
      }))
    };

    console.log("✅ Activity logs collection check complete");
    console.log(`   - Total documents: ${totalCount}`);
    console.log(`   - Date range: ${dateRange?.oldestTimestamp} to ${dateRange?.newestTimestamp}`);
    
    return result;

  } catch (error) {
    console.error("❌ Error checking activity logs:", error.message);
    return {
      success: false,
      error: error.message,
      suggestion: "Check the error message and verify collection permissions"
    };
  }
};

