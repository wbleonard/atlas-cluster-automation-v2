/*
 * Returns a handle to the dashboard_summary collection 
 * This collection stores aggregated statistics and summary data for dashboard display
 * Separate from individual cluster records for better data organization
 */
exports = async function() {
  try {
    const db = context.services.get("mongodb-atlas").db(
      await context.values.get("ClusterOpsDBName")
    );
    
    return db.collection("dashboard_summary");
    
  } catch (error) {
    console.error("Error getting dashboard summary collection:", error.message);
    throw error;
  }
};
