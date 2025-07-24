// Atlas Function: getClusterAutomationStatus
// Retrieves the automation status for a cluster by checking automation tags
// Input: projectId, clusterName
// Returns: { enabled: boolean, hasSchedule: boolean, scheduleValue: string }

exports = async function(projectId, clusterName) {
  
  if (projectId == "Hello world!") { // Easy testing from the console
    projectId = "6807d3a43dae3141f99d8aa0";
    clusterName = "TestCluster";
    
    console.log(`getClusterAutomationStatus: Using test defaults - Project: ${projectId}, Cluster: ${clusterName}`);
  }
  
  if (!projectId || !clusterName) {
    throw new Error("Project ID and cluster name are required");
  }

  try {
    console.log(`getClusterAutomationStatus: Getting automation status for cluster ${clusterName} in project ${projectId}`);

    // Get current cluster configuration using existing utility
    const clusterData = await context.functions.execute("atlas/getProjectCluster", projectId, clusterName);
    
    if (!clusterData) {
      throw new Error(`Cluster ${clusterName} not found in project ${projectId}`);
    }
    
    const tags = clusterData.tags || [];
    
    // Check for automation tags
    const scheduleTag = tags.find(tag => tag.key === 'automation:pause-schedule');
    const enabledTag = tags.find(tag => tag.key === 'automation:enabled');
    
    // Determine if automation is enabled (default: true if schedule exists)
    const hasSchedule = !!scheduleTag;
    const enabled = hasSchedule && (enabledTag ? enabledTag.value.toLowerCase() !== 'false' : true);
    
    const status = {
      enabled: enabled,
      hasSchedule: hasSchedule,
      scheduleValue: scheduleTag ? scheduleTag.value : null,
      enabledTagValue: enabledTag ? enabledTag.value : null
    };

    console.log(`getClusterAutomationStatus: Cluster ${clusterName} automation status:`, JSON.stringify(status));
    return status;

  } catch (error) {
    console.error(`getClusterAutomationStatus: Error getting automation status for cluster ${clusterName}: ${error.message}`, error);
    throw error;
  }
};
