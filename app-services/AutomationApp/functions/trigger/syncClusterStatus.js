// Atlas Function: syncClusterStatus
// Simplified replacement for syncProjectClusters
// Updates cluster status collection for reporting/dashboard purposes only
// Data comes from Atlas API + cluster tags (single source of truth)

exports = async function() {
  console.log("🔄 Starting cluster status sync (simplified tag-based approach)...");
  
  try {
    // Update detailed cluster status data for reporting
    console.log("📊 Refreshing detailed cluster status...");
    const detailedResult = await context.functions.execute("collections/refreshClusterStatus");
    
    // Update dashboard summary data
    console.log("📈 Refreshing dashboard summary data...");
    const dashboardResult = await context.functions.execute("collections/refreshDashboardData");
    
    console.log("✅ Cluster status sync completed successfully");
    return {
      status: "success", 
      message: "Cluster status sync completed using tag-based approach",
      detailedUpdate: detailedResult,
      dashboardUpdate: dashboardResult
    };
    
  } catch (error) {
    console.error("❌ Error in syncClusterStatus:", error.message);
    return {
      status: "error",
      message: error.message,
      timestamp: new Date()
    };
  }
};
