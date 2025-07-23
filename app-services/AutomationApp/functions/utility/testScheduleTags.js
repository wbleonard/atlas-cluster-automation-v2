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
          "utility/getClusterScheduleFromTags",
          projectId,
          clusterName
        );
        console.log("testScheduleTags: Current schedule:", JSON.stringify(schedule));
        return schedule;

      case "remove":
        // Remove the schedule
        const removeResult = await context.functions.execute(
          "utility/removeClusterScheduleTag",
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
            const parsed = await context.functions.execute("utility/parseScheduleTag", testValue);
            parseResults.push({ input: testValue, parsed: parsed, status: "success" });
          } catch (error) {
            parseResults.push({ input: testValue, error: error.message, status: "error" });
          }
        }
        
        console.log("testScheduleTags: Parse test results:", JSON.stringify(parseResults, null, 2));
        return parseResults;

      case "list":
        // List all projects with scheduled clusters
        const projects = await context.functions.execute("utility/getProjectsWithScheduledClusters");
        console.log("testScheduleTags: Projects with scheduled clusters:", JSON.stringify(projects, null, 2));
        return projects;

      default:
        // Default test - just get the schedule if it exists
        const currentSchedule = await context.functions.execute(
          "utility/getClusterScheduleFromTags",
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
