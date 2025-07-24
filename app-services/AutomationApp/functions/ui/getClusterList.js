// Atlas Function: getClusterList
// Fetches all project and cluster data for UI display using the tag-based approach.
// This function will be called by your UI frontend using the Realm SDK:
// await app.currentUser.callFunction("getClusterList");

exports = async function() {
  // Log who is calling this function, if user context is available
  const userId = context.user?.id;
  const userEmail = context.user?.data?.email;
  console.log(`getClusterList: Called by App Services User ID: ${userId || 'N/A'}, Email: ${userEmail || 'N/A'}`);

  try {
    // Use the tag-based approach to get all projects with scheduled clusters
    const projectsWithClusters = await context.functions.execute("atlas/getProjectsWithScheduledClusters");

    if (!projectsWithClusters || projectsWithClusters.length === 0) {
      console.log("getClusterList: No projects with scheduled clusters found");
      return [];
    }

    // Transform the data for UI consumption
    const uiData = projectsWithClusters.map(project => ({
      projectId: project.projectId,
      projectName: project.projectName,
      clusters: project.clusters.map(cluster => ({
        name: cluster.name,
        mongoOwner: cluster.mongoOwner || "Unknown",
        description: cluster.description || "",
        instanceSize: cluster.instanceSize || "Unknown",
        atlasStateName: cluster.stateName || "UNKNOWN",
        paused: cluster.paused || false,
        automationEnabled: cluster.automationEnabled || false,
        schedule: cluster.schedule || null,
        tags: cluster.tags || [],
        createDate: cluster.createDate || null,
        // Additional cluster metadata from Atlas
        mongoDBVersion: cluster.mongoDBVersion,
        clusterType: cluster.clusterType,
        replicationSpecs: cluster.replicationSpecs
      }))
    }));

    console.log(`getClusterList: Successfully fetched ${uiData.length} projects with ${uiData.reduce((sum, p) => sum + p.clusters.length, 0)} total clusters for UI display.`);
    return uiData;

  } catch (error) {
    console.error(`getClusterList: Error fetching cluster list: ${error.message}`, error);
    throw new Error(`An error occurred while fetching the cluster list: ${error.message}`);
  }
};