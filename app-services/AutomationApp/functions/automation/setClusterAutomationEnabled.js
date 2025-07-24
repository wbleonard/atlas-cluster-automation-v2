// Atlas Function: setClusterAutomationEnabled
// Enables or disables automation for a cluster by setting the automation:enabled tag
// Input: projectId, clusterName, enabled (boolean)

exports = async function(projectId, clusterName, enabled = true) {
  
  if (projectId == "Hello world!") { // Easy testing from the console
    projectId = "6807d3a43dae3141f99d8aa0";
    clusterName = "TestCluster";
    enabled = enabled !== undefined ? enabled : true; // Default to enabled if not provided
    
    console.log(`setClusterAutomationEnabled: Using test defaults - Project: ${projectId}, Cluster: ${clusterName}, Enabled: ${enabled}`);
  }
  
  if (!projectId || !clusterName) {
    throw new Error("Project ID and cluster name are required");
  }

  // Validate input
  if (typeof enabled !== 'boolean') {
    throw new Error("enabled must be a boolean value (true or false)");
  }

  try {
    console.log(`setClusterAutomationEnabled: Setting automation enabled=${enabled} for cluster ${clusterName} in project ${projectId}`);

    // Get current cluster configuration using existing utility
    const clusterData = await context.functions.execute("atlas/getProjectCluster", projectId, clusterName);
    
    if (!clusterData) {
      throw new Error(`Cluster ${clusterName} not found in project ${projectId}`);
    }
    
    let tags = clusterData.tags || [];

    // Remove existing automation:enabled tag if it exists
    tags = tags.filter(tag => tag.key !== 'automation:enabled');

    // Add the new enabled tag (only add if disabled, default is enabled)
    if (!enabled) {
      tags.push({
        key: 'automation:enabled',
        value: 'false'
      });
    }
    // If enabled=true, we don't add the tag (default behavior is enabled)

    // Update the cluster with the new tags using existing utility
    await context.functions.execute("tags/updateClusterTags", projectId, clusterName, tags);

    const status = enabled ? "enabled" : "disabled";
    console.log(`setClusterAutomationEnabled: Successfully ${status} automation for cluster ${clusterName}`);
    return {
      status: "success",
      enabled: enabled,
      message: `Automation ${status} successfully for cluster ${clusterName}`
    };

  } catch (error) {
    console.error(`setClusterAutomationEnabled: Error setting automation enabled=${enabled} for cluster ${clusterName}: ${error.message}`, error);
    throw error;
  }
};
