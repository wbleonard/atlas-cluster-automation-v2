// Atlas Function: removeClusterScheduleTag
// Removes the automation:pause-schedule tag from a cluster

exports = async function(projectId, clusterName) {
  
  if (projectId == "Hello world!") { // Easy testing from the console
    projectId = "6807d3a43dae3141f99d8aa0";
    clusterName = "TestCluster";
    console.log(`removeClusterScheduleTag: Using test defaults - Project: ${projectId}, Cluster: ${clusterName}`);
  }
  
  if (!projectId || !clusterName) {
    throw new Error("Project ID and cluster name are required");
  }

  try {
    console.log(`removeClusterScheduleTag: Removing schedule tag for cluster ${clusterName} in project ${projectId}`);

    // Get current cluster configuration using existing utility
    const clusterData = await context.functions.execute("utility/getProjectCluster", projectId, clusterName);
    
    if (!clusterData) {
      throw new Error(`Cluster ${clusterName} not found in project ${projectId}`);
    }
    
    let tags = clusterData.tags || [];

    // Check if the schedule tag exists
    const hasScheduleTag = tags.some(tag => tag.key === 'automation:pause-schedule');
    
    if (!hasScheduleTag) {
      console.log(`removeClusterScheduleTag: No schedule tag found for cluster ${clusterName}`);
      return {
        status: "no_change",
        message: `No schedule tag found for cluster ${clusterName}`
      };
    }

    // Remove the automation:pause-schedule tag
    tags = tags.filter(tag => tag.key !== 'automation:pause-schedule');

    // Update the cluster with the filtered tags using existing utility
    await context.functions.execute("utility/updateClusterTags", projectId, clusterName, tags);

    console.log(`removeClusterScheduleTag: Successfully removed schedule tag from cluster ${clusterName}`);
    return {
      status: "success",
      message: `Schedule tag removed successfully from cluster ${clusterName}`
    };

  } catch (error) {
    console.error(`removeClusterScheduleTag: Error removing schedule tag from cluster ${clusterName}: ${error.message}`, error);
    throw error;
  }
};
