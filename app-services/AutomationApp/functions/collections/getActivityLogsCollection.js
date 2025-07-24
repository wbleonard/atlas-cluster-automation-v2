/*
 * Returns the Atlas collection for managing cluster operations with all the appropriate error handling. 
 *
 */
exports = async function() {
  const serviceName = await context.values.get("ServiceName");
  const dbName = await context.values.get("ClusterOpsDBName");
  const collectionName = await context.values.get("ActivityLogCollectionName");

  try {
    const svc = context.services.get(serviceName);
    if (!svc) throw new Error(`Service ${serviceName} not found`);

    const db = svc.db(dbName);
    if (!db) throw new Error(`Database ${dbName} not found`);

    const collection = db.collection(collectionName);
    if (!collection) throw new Error(`Collection ${collectionName} not found`);

    return collection;

  } catch (err) {
    console.error("🔥 Error in getActivityLogsCollection:", err.message);
    return null;
  }
};