/*
 * Returns a handle to the cluster_status collection for dashboard/reporting purposes
 * This collection stores current cluster status for Atlas Charts and UI dashboards
 * Data source: Atlas API + Atlas cluster tags (no longer a source of truth for automation)
 */

exports = async function() {
  try {
    // Get the cluster status collection from the AutomationCluster data source
    const serviceName = await context.values.get("ServiceName");
    const dbName = await context.values.get("ClusterOpsDBName");
    const collectionName = "cluster_status"; // New name reflecting its purpose
    
    if (!serviceName || !dbName) {
      console.error("getClusterStatusCollection: Missing required configuration values");
      return null;
    }

    const db = context.services.get(serviceName).db(dbName);
    console.log(`getClusterStatusCollection: Connected to collection ${collectionName} in database ${dbName}`);
    
    return db.collection(collectionName);
  } catch (err) {
    console.error("🔥 Error in getClusterStatusCollection:", err.message);
    return null;
  }
};
