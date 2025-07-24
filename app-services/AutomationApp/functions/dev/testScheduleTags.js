// Atlas Function: testScheduleTags
// Demo function to test the tag-based scheduling system
// This function can be called manually to test the new tag-based approach

exports = async function(projectId, clusterName, action = "test") {
  
  if (projectId == "Hello world!") { // Easy testing from the console
    projectId = "6807d3a43dae3141f99d8aa0";
    clusterName = "TestCluster";
    action = action || "test"; // Keep the action parameter if provided
    console.log(`testScheduleTags: Using test defaults - Project: ${projectId}, Cluster: ${clusterName}, Action: ${action}`);
  }
  
  console.log(`testScheduleTags: Starting test for cluster ${clusterName} in project ${projectId}, action: ${action}`);

  try {
    switch (action) {
      case "set":
              // Set test schedule (daily at 10 PM Eastern)
      await setClusterScheduleTag(projectId, "TestCluster", {
        days: [1, 2, 3, 4, 5], // Monday-Friday
        hour: 22,
        timezone: "America/New_York"
      });
        console.log("testScheduleTags: Set schedule result:", JSON.stringify(result));
        return result;

      case "get":
        // Get the current schedule
        const schedule = await context.functions.execute(
          "tags/getClusterScheduleFromTags",
          projectId,
          clusterName
        );
        console.log("testScheduleTags: Current schedule:", JSON.stringify(schedule));
        return schedule;

      case "remove":
        // Remove the schedule
        const removeResult = await context.functions.execute(
          "tags/removeClusterScheduleTag",
          projectId,
          clusterName
        );
        console.log("testScheduleTags: Remove schedule result:", JSON.stringify(removeResult));
        return removeResult;

      case "parse":
        // Test parsing various schedule formats
        const testValues = [
          "days:1.2.3.4.5:hour:22:timezone:America-New_York",
          "days:1.2.3.4.5:hour:22", // Should default to America/New_York timezone
          "days:0.6:hour:9:timezone:America-New_York", // Weekend mornings at 9 AM
          "days:1.3.5:hour:18:timezone:Europe-London" // Monday, Wednesday, Friday at 6 PM London time
        ];

        const parseResults = [];
        for (const testValue of testValues) {
          try {
            const parsed = await context.functions.execute("tags/parseScheduleTag", testValue);
            parseResults.push({ input: testValue, parsed: parsed, status: "success" });
          } catch (error) {
            parseResults.push({ input: testValue, error: error.message, status: "error" });
          }
        }
        
        console.log("testScheduleTags: Parse test results:", JSON.stringify(parseResults, null, 2));
        return parseResults;

      case "list":
        // List all projects with scheduled clusters
        const projects = await context.functions.execute("atlas/getProjectsWithScheduledClusters");
        console.log("testScheduleTags: Projects with scheduled clusters:", JSON.stringify(projects, null, 2));
        return projects;

      case "enable":
        // Enable automation for test cluster
        console.log("testScheduleTags: Enabling automation for test cluster");
        const enableResult = await context.functions.execute("automation/setClusterAutomationEnabled", projectId, clusterName, true);
        console.log("testScheduleTags: Enable automation result:", JSON.stringify(enableResult));
        return enableResult;

      case "disable":
        // Disable automation for test cluster
        console.log("testScheduleTags: Disabling automation for test cluster");
        const disableResult = await context.functions.execute("automation/setClusterAutomationEnabled", projectId, clusterName, false);
        console.log("testScheduleTags: Disable automation result:", JSON.stringify(disableResult));
        return disableResult;

      case "status":
        // Get automation status for test cluster
        console.log("testScheduleTags: Getting automation status for test cluster");
        const statusResult = await context.functions.execute("automation/getClusterAutomationStatus", projectId, clusterName);
        console.log("testScheduleTags: Automation status result:", JSON.stringify(statusResult));
        return statusResult;

      case "org-setup":
        // Set org-wide schedule (disabled by default for safety)
        console.log("testScheduleTags: Setting up org-wide schedule (disabled by default)");
        const orgResult = await context.functions.execute("automation/setOrgWideSchedule", "Hello world!");
        console.log("testScheduleTags: Org-wide setup result:", JSON.stringify(orgResult, null, 2));
        return orgResult;

      case "enable-project":
        // Enable automation for all scheduled clusters in test project
        console.log("testScheduleTags: Enabling automation for all scheduled clusters in test project");
        const projectResult = await context.functions.execute("automation/enableAutomationForProject", "Hello world!");
        console.log("testScheduleTags: Project enable result:", JSON.stringify(projectResult, null, 2));
        return projectResult;

      case "refresh-status":
        // Test the new simplified status refresh
        console.log("testScheduleTags: Testing cluster status refresh");
        const refreshResult = await context.functions.execute("collections/refreshClusterStatus", "Hello world!");
        console.log("testScheduleTags: Status refresh result:", JSON.stringify(refreshResult, null, 2));
        return refreshResult;

      default:
        // Default test - just get the schedule if it exists
        const currentSchedule = await context.functions.execute(
          "tags/getClusterScheduleFromTags",
          projectId,
          clusterName
        );
        
        if (currentSchedule) {
          console.log(`testScheduleTags: Found schedule for ${clusterName}:`, JSON.stringify(currentSchedule));
          return {
            status: "found",
            schedule: currentSchedule,
            message: `Cluster ${clusterName} has a pause schedule configured`
          };
        } else {
          console.log(`testScheduleTags: No schedule found for ${clusterName}`);
          return {
            status: "not_found",
            message: `No schedule configured for cluster ${clusterName}`
          };
        }
    }

  } catch (error) {
    console.error(`testScheduleTags: Error during test: ${error.message}`, error);
    return {
      status: "error",
      error: error.message,
      message: `Test failed for cluster ${clusterName}`
    };
  }
};
