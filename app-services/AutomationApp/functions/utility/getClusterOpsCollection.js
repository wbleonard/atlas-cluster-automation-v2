/*
 * Returns the Atlas collection for managing cluster operations with all the appropriate error handling. 
 *
 */
exports = async function() {
  const serviceName = "AutomationCluster";
  const dbName = "clusterOps";
  const collectionName = "cluster_automation";

  try {
    const svc = context.services.get(serviceName);
    if (!svc) throw new Error(`Service ${serviceName} not found`);

    const db = svc.db(dbName);
    if (!db) throw new Error(`Database ${dbName} not found`);

    const collection = db.collection(collectionName);
    if (!collection) throw new Error(`Collection ${collectionName} not found`);

    return collection;

  } catch (err) {
    console.error("🔥 Error in getClusterOpsCollection:", err.message);
    return null;
  }
};