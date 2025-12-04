/*
 * Returns statistics and aggregated data from the activity_logs collection
 * 
 * Parameters:
 * - hoursBack: How many hours of history to analyze (default: 24)
 * 
 * Returns: Statistics object with counts, success rates, and breakdowns
 */
exports = async function(hoursBack = 24) {
  // Handle test mode
  if (hoursBack === "Hello world!") {
    console.log("🧪 TEST MODE: Using default 24 hours");
    hoursBack = 24;
  }
  
  // Validate and convert hoursBack to number
  hoursBack = parseInt(hoursBack);
  if (isNaN(hoursBack) || hoursBack <= 0) {
    console.log("⚠️ Invalid hoursBack parameter, using default 24 hours");
    hoursBack = 24;
  }
  
  console.log(`📊 Getting activity statistics for last ${hoursBack} hours`);
  
  try {
    const activityCollection = await context.functions.execute("collections/getActivityLogsCollection");
    
    if (!activityCollection) {
      console.error("❌ Unable to get activity logs collection");
      return { error: "Activity logs collection not available" };
    }

    // Calculate cutoff time
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursBack);
    
    console.log(`🔍 Querying activity logs from ${cutoffTime.toISOString()} to now`);

    // First, check if there's ANY data in the collection at all
    const anyDataResult = await activityCollection.aggregate([
      { $limit: 1 },
      { $count: "total" }
    ]).toArray();
    
    const hasAnyData = anyDataResult.length > 0 && anyDataResult[0].total > 0;
    
    if (!hasAnyData) {
      console.log("ℹ️ The activity_logs collection is empty - no data has been logged yet");
      return {
        success: true,
        timeRange: {
          hoursBack,
          cutoffTime,
          currentTime: new Date()
        },
        summary: {
          totalActivities: 0,
          successCount: 0,
          failedCount: 0,
          errorCount: 0,
          skippedCount: 0,
          successRate: 0
        },
        byAction: [],
        byTriggerSource: [],
        mostActiveClusters: [],
        message: "The activity_logs collection is empty. Run some automation operations to generate activity logs."
      };
    }
    
    // Get total count using aggregation
    const totalCountResult = await activityCollection.aggregate([
      { $match: { timestamp: { $gte: cutoffTime } } },
      { $count: "total" }
    ]).toArray();
    
    const totalCount = totalCountResult.length > 0 ? totalCountResult[0].total : 0;
    
    // If no data in time range, get info about what data exists
    if (totalCount === 0) {
      const oldestRecord = await activityCollection.aggregate([
        { $sort: { timestamp: 1 } },
        { $limit: 1 },
        { $project: { timestamp: 1 } }
      ]).toArray();
      
      const newestRecord = await activityCollection.aggregate([
        { $sort: { timestamp: -1 } },
        { $limit: 1 },
        { $project: { timestamp: 1 } }
      ]).toArray();
      
      const oldestDate = oldestRecord.length > 0 ? oldestRecord[0].timestamp : null;
      const newestDate = newestRecord.length > 0 ? newestRecord[0].timestamp : null;
      
      console.log(`ℹ️ No activity logs in the last ${hoursBack} hours. Data exists from ${oldestDate} to ${newestDate}`);
    }

    // Count by status
    const statusCounts = await activityCollection.aggregate([
      { $match: { timestamp: { $gte: cutoffTime } } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]).toArray();

    // Count by action type
    const actionCounts = await activityCollection.aggregate([
      { $match: { timestamp: { $gte: cutoffTime } } },
      { $group: { _id: "$action", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    // Count by trigger source
    const triggerSourceCounts = await activityCollection.aggregate([
      { $match: { timestamp: { $gte: cutoffTime } } },
      { $group: { _id: "$triggerSource", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    // Get most active clusters
    const mostActiveClusters = await activityCollection.aggregate([
      { $match: { 
          timestamp: { $gte: cutoffTime },
          clusterName: { $ne: null }
        } 
      },
      { $group: { 
          _id: { 
            clusterName: "$clusterName", 
            projectId: "$projectId" 
          }, 
          count: { $sum: 1 },
          lastActivity: { $max: "$timestamp" }
        } 
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    // Check if there's any data
    if (totalCount === 0) {
      console.log("ℹ️ No activity logs found for the specified time range");
      return {
        success: true,
        timeRange: {
          hoursBack,
          cutoffTime,
          currentTime: new Date()
        },
        summary: {
          totalActivities: 0,
          successCount: 0,
          failedCount: 0,
          errorCount: 0,
          skippedCount: 0,
          successRate: 0
        },
        byAction: [],
        byTriggerSource: [],
        mostActiveClusters: [],
        message: "No activity logs found in the specified time range"
      };
    }

    // Calculate success rate
    const statusMap = {};
    statusCounts.forEach(item => {
      statusMap[item._id] = item.count;
    });

    const successCount = statusMap.SUCCESS || 0;
    const failedCount = statusMap.FAILED || 0;
    const errorCount = statusMap.ERROR || 0;
    const skippedCount = statusMap.SKIPPED || 0;
    
    const successRate = totalCount > 0 
      ? ((successCount / totalCount) * 100).toFixed(1)
      : 0;

    // Format results
    const stats = {
      success: true,
      timeRange: {
        hoursBack,
        cutoffTime,
        currentTime: new Date()
      },
      summary: {
        totalActivities: totalCount,
        successCount,
        failedCount,
        errorCount,
        skippedCount,
        successRate: parseFloat(successRate)
      },
      byAction: actionCounts.map(item => ({
        action: item._id,
        count: item.count,
        percentage: totalCount > 0 ? ((item.count / totalCount) * 100).toFixed(1) : "0.0"
      })),
      byTriggerSource: triggerSourceCounts.map(item => ({
        source: item._id,
        count: item.count,
        percentage: totalCount > 0 ? ((item.count / totalCount) * 100).toFixed(1) : "0.0"
      })),
      mostActiveClusters: mostActiveClusters.map(item => ({
        clusterName: item._id.clusterName,
        projectId: item._id.projectId,
        activityCount: item.count,
        lastActivity: item.lastActivity
      }))
    };

    console.log(`✅ Activity statistics calculated: ${totalCount} total activities`);
    
    return stats;

  } catch (error) {
    console.error("❌ Error getting activity statistics:", error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

