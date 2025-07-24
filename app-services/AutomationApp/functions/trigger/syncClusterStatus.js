// Atlas Function: syncClusterStatus
// Simplified replacement for syncProjectClusters
// Updates cluster status collection for reporting/dashboard purposes only
// Data comes from Atlas API + cluster tags (single source of truth)

exports = async function() {
  console.log("🔄 Starting cluster status sync (simplified tag-based approach)...");
  
  try {
    // Use the new refreshClusterStatus function to update reporting data
    const result = await context.functions.execute("collections/refreshClusterStatus");
    
    console.log("✅ Cluster status sync completed successfully");
    return {
      status: "success", 
      message: "Cluster status sync completed using tag-based approach",
      details: result
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
