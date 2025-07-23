// Atlas Function: getClusterScheduleFromTags
// Fetches cluster automation schedule from Atlas cluster tags
// Returns null if no schedule is configured, otherwise returns schedule object

exports = async function(projectId, clusterName) {
  
  if (projectId == "Hello world!") { // Easy testing from the console
    projectId = "6807d3a43dae3141f99d8aa0";
    clusterName = "TestCluster";
    console.log(`getClusterScheduleFromTags: Using test defaults - Project: ${projectId}, Cluster: ${clusterName}`);
  }
  
  if (!projectId || !clusterName) {
    throw new Error("Project ID and cluster name are required");
  }

  try {
    console.log(`getClusterScheduleFromTags: Fetching tags for cluster ${clusterName} in project ${projectId}`);
    
    // Use the existing getProjectCluster function to fetch cluster details
    const clusterDetails = await context.functions.execute("utility/getProjectCluster", projectId, clusterName);
    
    if (!clusterDetails) {
      throw new Error(`Cluster ${clusterName} not found in project ${projectId}`);
    }
    
    // Look for the automation pause schedule tag
    const scheduleTag = clusterDetails.tags?.find(tag => tag.key === 'automation:pause-schedule');
    
    if (!scheduleTag) {
      console.log(`getClusterScheduleFromTags: No automation:pause-schedule tag found for cluster ${clusterName}`);
      return null; // No schedule configured
    }

    console.log(`getClusterScheduleFromTags: Found schedule tag for cluster ${clusterName}: ${scheduleTag.value}`);

    // Parse the schedule tag value using our utility function
    try {
      const schedule = await context.functions.execute("utility/parseScheduleTag", scheduleTag.value);
      console.log(`getClusterScheduleFromTags: Parsed schedule for cluster ${clusterName}:`, JSON.stringify(schedule));
      return schedule;
    } catch (parseError) {
      console.error(`getClusterScheduleFromTags: Error parsing schedule tag for cluster ${clusterName}: ${parseError.message}`);
      throw new Error(`Invalid schedule tag format for cluster ${clusterName}: ${parseError.message}`);
    }

  } catch (error) {
    console.error(`getClusterScheduleFromTags: Error fetching schedule for cluster ${clusterName} in project ${projectId}: ${error.message}`, error);
    throw error;
  }
};
