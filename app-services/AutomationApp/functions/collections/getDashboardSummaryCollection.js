/*
 * Returns a handle to the dashboard_summary collection 
 * This collection stores aggregated statistics and summary data for dashboard display
 * Separate from individual cluster records for better data organization
 */
exports = async function() {
  try {
    // Get the dashboard summary collection from the configured data source
    const serviceName = await context.values.get("ServiceName");
    const dbName = await context.values.get("ClusterOpsDBName");
    const collectionName = "dashboard_summary";
    
    if (!serviceName || !dbName) {
      console.error("getDashboardSummaryCollection: Missing required configuration values");
      return null;
    }

    const db = context.services.get(serviceName).db(dbName);
    console.log(`getDashboardSummaryCollection: Connected to collection ${collectionName} in database ${dbName}`);
    
    return db.collection(collectionName);
    
  } catch (error) {
    console.error("Error getting dashboard summary collection:", error.message);
    throw error;
  }
};
