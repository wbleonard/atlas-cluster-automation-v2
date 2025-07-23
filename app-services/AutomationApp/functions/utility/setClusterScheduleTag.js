// Atlas Function: setClusterScheduleTag
// Sets or updates the automation:pause-schedule tag on a cluster
// Input: projectId, clusterName, pauseHour (0-23), pauseDaysOfWeek (array of 0-6), timezone (optional)

exports = async function(projectId, clusterName, pauseHour, pauseDaysOfWeek, timezone = 'America/New_York') {
  
  if (projectId == "Hello world!") { // Easy testing from the console
    projectId = "6807d3a43dae3141f99d8aa0";
    clusterName = "TestCluster";
    pauseHour = pauseHour !== undefined ? pauseHour : 22; // Default to 10 PM if not provided
    pauseDaysOfWeek = pauseDaysOfWeek || [1, 2, 3, 4, 5]; // Default to weekdays if not provided
    
    // Show what the actual tag value will look like
    const tagSafeTimezone = timezone.replace(/\//g, '-');
    const tagSafeDays = pauseDaysOfWeek.join('.');
    const previewTagValue = `days:${tagSafeDays}:hour:${pauseHour}:timezone:${tagSafeTimezone}`;
    
    console.log(`setClusterScheduleTag: Using test defaults - Project: ${projectId}, Cluster: ${clusterName}`);
    console.log(`setClusterScheduleTag: Will create tag value: "${previewTagValue}"`);
  }
  
  if (!projectId || !clusterName) {
    throw new Error("Project ID and cluster name are required");
  }

  // Validate inputs
  if (typeof pauseHour !== 'number' || pauseHour < 0 || pauseHour > 23) {
    throw new Error("pauseHour must be a number between 0 and 23");
  }

  if (!Array.isArray(pauseDaysOfWeek) || pauseDaysOfWeek.length === 0) {
    throw new Error("pauseDaysOfWeek must be a non-empty array");
  }

  for (const day of pauseDaysOfWeek) {
    if (typeof day !== 'number' || day < 0 || day > 6) {
      throw new Error("All days in pauseDaysOfWeek must be numbers between 0 (Sunday) and 6 (Saturday)");
    }
  }

  // Create the schedule tag value
  // Use descriptive format: days:1.2.3.4.5:hour:22:timezone:America-New_York
  const tagSafeTimezone = timezone.replace(/\//g, '-');
  const tagSafeDays = pauseDaysOfWeek.join('.');
  const scheduleValue = `days:${tagSafeDays}:hour:${pauseHour}:timezone:${tagSafeTimezone}`;

  try {
    console.log(`setClusterScheduleTag: Setting schedule tag for cluster ${clusterName} in project ${projectId}: ${scheduleValue}`);

    // Get current cluster configuration using existing utility
    const clusterData = await context.functions.execute("utility/getProjectCluster", projectId, clusterName);
    
    if (!clusterData) {
      throw new Error(`Cluster ${clusterName} not found in project ${projectId}`);
    }
    
    let tags = clusterData.tags || [];

    // Remove existing automation:pause-schedule tag if it exists
    tags = tags.filter(tag => tag.key !== 'automation:pause-schedule');

    // Add the new schedule tag
    tags.push({
      key: 'automation:pause-schedule',
      value: scheduleValue
    });

    // Update the cluster with the new tags using existing utility
    await context.functions.execute("utility/updateClusterTags", projectId, clusterName, tags);

    console.log(`setClusterScheduleTag: Successfully set schedule tag for cluster ${clusterName}`);
    return {
      status: "success",
      scheduleValue: scheduleValue,
      message: `Schedule tag set successfully for cluster ${clusterName}`
    };

  } catch (error) {
    console.error(`setClusterScheduleTag: Error setting schedule tag for cluster ${clusterName}: ${error.message}`, error);
    throw error;
  }
};
