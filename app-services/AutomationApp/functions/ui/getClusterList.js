// Atlas Function: getClusterList
// (Formerly ui_getClusterList, renamed for clarity as it's a backend function for the UI)
// Fetches all project and cluster data from clusterOps.cluster_automation for UI display.
// This function will be called by your UI frontend using the Realm SDK:
// await app.currentUser.callFunction("getClusterList");

exports = async function() {
  // Log who is calling this function, if user context is available
  const userId = context.user?.id;
  const userEmail = context.user?.data?.email; // Common location for email
  console.log(`getClusterList: Called by App Services User ID: ${userId || 'N/A'}, Email: ${userEmail || 'N/A'}`);

  let clusterOpsCollection;
  try {
    // Using your existing utility function from "Cluster Ops" document [1]
    clusterOpsCollection = await context.functions.execute("collections/getClusterOpsCollection");
    if (!clusterOpsCollection) {
      // Your utility function returns null on error, so we need to handle that.
      throw new Error("collections/getClusterOpsCollection returned null, indicating an error in accessing the collection.");
    }
  } catch (error) {
    console.error(`getClusterList: CRITICAL - Failed to get cluster_automation collection handle: ${error.message}`, error);
    // When called via callFunction, throwing an error is the standard way to signal failure to the client.
    throw new Error(`Failed to initialize database connection: ${error.message}`);
  }

  try {
    // Define a projection to potentially exclude very large fields not needed for a list view.
    // For now, let's fetch most of the relevant fields for UI display.
    // The schema [1] mentions: projectName, and clusters array with name, owner (mongoOwner),
    // description, instanceSize (tier), pause (intended state), atlasStateName (actual state),
    // schedule fields (pauseHour, pauseDaysOfWeek, etc.).
    const projection = {
      // "_id": 0, // Optionally exclude the main document _id if not needed by UI directly
      "projectId": 1,
      "projectName": 1,
      "clusters.name": 1,
      "clusters.mongoOwner": 1, // This is your 'owner' field as per schema [1]
      "clusters.description": 1,
      "clusters.instanceSize": 1, // Tier
      "clusters.atlasStateName": 1, // Actual state synced from Atlas
      "clusters.pause": 1,          // Intended pause state by automation [1]
      "clusters.pauseHour": 1,
      "clusters.pauseDaysOfWeek": 1,
      "clusters.resumeHour": 1,
      "clusters.resumeDaysOfWeek": 1,
      "clusters.timezone": 1,
      "clusters.createDate": 1, // For calculating age in UI
      "clusters.lastPauseAction": 1, // For displaying last action status
      "clusters.lastResumeAction": 1
      // Exclude utility_getClusterOpsCollection.js from here, it's a function name not a field.
    };

    // Fetch all project documents, which contain the clusters array.
    // Sort by projectName for consistent UI display.
    const allProjectData = await clusterOpsCollection.find({}, projection).sort({ "projectName": 1 }).toArray();

    if (!allProjectData) {
      // Should not happen if find() is successful, would return empty array.
      console.log("getClusterList: No project data found (find returned null/undefined).");
      return []; // Return empty array if no data
    }

    // The UI will receive an array of project documents.
    // Each project document will have its "clusters" array with the projected fields.
    // No further server-side transformation is strictly necessary for a "basic UI" list view;
    // the UI can format dates, create schedule summaries, etc.

    console.log(`getClusterList: Successfully fetched ${allProjectData.length} project documents for UI display.`);
    return allProjectData; // Return the array of project documents

  } catch (error) {
    console.error(`getClusterList: Error fetching cluster list: ${error.message}`, error);
    throw new Error(`An error occurred while fetching the cluster list: ${error.message}`);
  }
};