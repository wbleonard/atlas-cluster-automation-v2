/*
 * Returns recent activity logs from the activity_logs collection
 * 
 * Parameters:
 * - limit: Number of records to return (default: 50)
 * - hoursBack: How many hours of history to fetch (default: 24)
 * - action: Filter by specific action type (optional)
 * - status: Filter by status (optional: SUCCESS, FAILED, SKIPPED)
 * 
 * Returns: Array of activity log entries sorted by timestamp (newest first)
 */
exports = async function(limit = 50, hoursBack = 24, action = null, status = null) {
  // Handle test mode
  if (limit === "Hello world!") {
    console.log("🧪 TEST MODE: Using default parameters (50 records, last 24 hours)");
    limit = 50;
    hoursBack = 24;
    action = null;
    status = null;
  }
  
  // Validate and convert limit to number
  limit = parseInt(limit);
  if (isNaN(limit) || limit <= 0) {
    console.log("⚠️ Invalid limit parameter, using default 50");
    limit = 50;
  }
  if (limit > 1000) {
    console.log("⚠️ Limit too high, capping at 1000");
    limit = 1000;
  }
  
  // Validate and convert hoursBack to number
  hoursBack = parseInt(hoursBack);
  if (isNaN(hoursBack) || hoursBack <= 0) {
    console.log("⚠️ Invalid hoursBack parameter, using default 24 hours");
    hoursBack = 24;
  }
  
  console.log(`📋 Getting recent activity: limit=${limit}, hours=${hoursBack}, action=${action}, status=${status}`);
  
  try {
    const activityCollection = await context.functions.execute("collections/getActivityLogsCollection");
    
    if (!activityCollection) {
      console.error("❌ Unable to get activity logs collection");
      return { error: "Activity logs collection not available" };
    }

    // Build query filter
    const query = {};
    
    // Filter by time range
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursBack);
    query.timestamp = { $gte: cutoffTime };
    
    console.log(`🔍 Querying activity logs from ${cutoffTime.toISOString()} to now`);
    
    // Filter by action if specified
    if (action) {
      query.action = action;
    }
    
    // Filter by status if specified
    if (status) {
      query.status = status;
    }

    // Fetch activity logs
    const activities = await activityCollection
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    console.log(`✅ Retrieved ${activities.length} activity log entries`);
    
    // If no results, provide helpful information
    if (activities.length === 0) {
      // Check if collection has any data at all
      const anyData = await activityCollection.find({}).limit(1).toArray();
      
      if (anyData.length === 0) {
        console.log("ℹ️ The activity_logs collection is empty");
        return {
          success: true,
          count: 0,
          activities: [],
          message: "No activity logs exist. Run some automation operations to generate logs.",
          query: { limit, hoursBack, action, status, cutoffTime }
        };
      } else {
        // Collection has data, but not in the specified range
        const newestRecord = await activityCollection
          .find({})
          .sort({ timestamp: -1 })
          .limit(1)
          .toArray();
        
        const oldestRecord = await activityCollection
          .find({})
          .sort({ timestamp: 1 })
          .limit(1)
          .toArray();
        
        const newest = newestRecord.length > 0 ? newestRecord[0].timestamp : null;
        const oldest = oldestRecord.length > 0 ? oldestRecord[0].timestamp : null;
        
        console.log(`ℹ️ No logs match your query. Data exists from ${oldest} to ${newest}`);
        
        return {
          success: true,
          count: 0,
          activities: [],
          message: `No activity logs found matching your criteria. Available data: ${oldest} to ${newest}`,
          availableDataRange: {
            oldest: oldest,
            newest: newest
          },
          query: { limit, hoursBack, action, status, cutoffTime }
        };
      }
    }
    
    return {
      success: true,
      count: activities.length,
      activities: activities,
      query: {
        limit,
        hoursBack,
        action,
        status,
        cutoffTime
      }
    };

  } catch (error) {
    console.error("❌ Error getting recent activity:", error.message);
    return {
      success: false,
      error: error.message,
      activities: []
    };
  }
};

