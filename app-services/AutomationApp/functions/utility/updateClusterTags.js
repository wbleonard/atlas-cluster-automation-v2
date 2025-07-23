/*
 * Updates tags for a cluster in the specified project.
 * Leverages the existing modifyCluster function for the actual API call
 */
exports = async function(projectId, clusterName, tags) {
  
  if (projectId == "Hello world!") { // Easy testing from the console
    projectId = "6807d3a43dae3141f99d8aa0";
    clusterName = "TestCluster";
    // Only set default tags if none were provided
    if (!tags) {
      tags = [
        { key: "automation:pause-schedule", value: "days:1.2.3.4.5:hour:22:timezone:America-New_York" },
        { key: "environment", value: "test" },
        { key: "owner", value: "automation-system" }
      ];
    }
    console.log(`updateClusterTags: Using test defaults - Project: ${projectId}, Cluster: ${clusterName}, Tags: ${JSON.stringify(tags)}`);
  }
  
  if (!projectId || !clusterName || !Array.isArray(tags)) {
    throw new Error("Project ID, cluster name, and tags array are required");
  }
  
  try {
    console.log(`updateClusterTags: Updating tags for cluster ${clusterName} in project ${projectId}`);
    
    // First get current cluster state to preserve existing configuration
    const currentCluster = await context.functions.execute("utility/getProjectCluster", projectId, clusterName);
    
    if (!currentCluster) {
      throw new Error(`Cluster ${clusterName} not found in project ${projectId}`);
    }
    
    // Get stored credentials
    const username = await context.values.get("AtlasPublicKey");
    const password = await context.values.get("AtlasPrivateKey");
    
    // Use the existing modifyCluster function to update only the tags
    // The modifyCluster function expects just the fields to update
    const result = await context.functions.execute(
      "modifyCluster",
      username,
      password,
      projectId,
      clusterName,
      { tags: tags }
    );
    
    console.log(`updateClusterTags: Successfully updated tags for cluster ${clusterName}`);
    return result;
    
  } catch (error) {
    console.error(`updateClusterTags: Error updating tags for cluster ${clusterName}: ${error.message}`, error);
    throw error;
  }
};
