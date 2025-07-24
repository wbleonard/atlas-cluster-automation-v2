/*
 * Pulls project/cluster mappings from MongoDB and pauses the clusters marked with pause: true
 */
exports = async function () {
  const username = context.values.get("AtlasPublicKey");
  const password = context.values.get("AtlasPrivateKey");

  const body = { paused: true };

  let configuredClusters;

  const clusterOpsCollection = await context.functions.execute("collections/getClusterOpsCollection");
  
  try {
    configuredClusters = await clusterOpsCollection
      .find({})
      .sort({ projectName: 1 })
      .toArray();

    if (!configuredClusters)
      throw new Error("Clusters collection, cluster_automation, not found");
  } catch (err) {
    console.error("🔥 Error:", err.message);
  }

  let currentProject = null;

  try {
    for (const cluster of configuredClusters) {
      const { projectId, projectName, clusters = [] } = cluster;

      // New project? Print header
      if (projectName !== currentProject) {
        currentProject = projectName;
        console.log(`\n📁 Project: ${projectName}`);
      }

      // Separate clusters into those marked for pause and those not
      const clustersToPause = clusters.filter((c) => c.pause);
      const clustersNotToPause = clusters.filter((c) => !c.pause);

      // Log clusters that are not configured to be paused
      for (const cluster of clustersNotToPause) {
        console.log(
          ` - ℹ️ Cluster ${c.name} is not marked for pause. Skipping.`,
        );
      }

      if (clustersToPause.length === 0) continue;

      // Fetch current cluster states once per project
      const atlasClusters = await context.functions.execute(
        "atlas/getProjectClusters",
        projectId,
      );

      if (!atlasClusters || !Array.isArray(atlasClusters)) {
        console.log(` - ❌ Failed to fetch clusters:`, atlasClusters);
        continue;
      }

      // console.log("📊 Total clusters in project:", atlasClusters.length);
      // console.log("🧪 atlasClusters:", JSON.stringify(atlasClusters, null, 2),);

      for (const mappedCluster of clustersToPause) {
        const clusterName = mappedCluster.name;
        // console.log(
        //   `🔍 Evaluating cluster ${clusterName} in project ${projectName} (ID: ${projectId})`,
        // );

        const current = atlasClusters.find((c) => c.name === clusterName);

        if (!current) {
          console.log(` - ⚠️ Cluster ${clusterName} not found.`);
          continue;
        }
    
        if (current.paused) {
          console.log(` - ✅ Cluster ${clusterName} is already paused.`);
          continue;
        }

        try {
          console.log(` - 🔧 Pausing cluster ${clusterName}`);
          console.log(`   📝 ${description}`);
          console.log(`   👤 ${mongoOwner}`);
          console.log(`   📧 ${customerContact}`);

          const result = await context.functions.execute(
            "modifyCluster",
            username,
            password,
            projectId,
            clusterName,
            body,
          );

          console.log(
            `Cluster ${clusterName} in Project ${projectName}: ${result.message}`,
          );
        } catch (error) {
          console.error(`❌ Error pausing cluster ${clusterName}:`, error);
        }
      }
    }

    console.log(`\nAll eligible cluster pause operations completed\n`);
    return "Clusters Paused";
  } catch (error) {
    console.error(
      "❌ An error occurred during the cluster modification operations:",
      error,
    );
    throw new Error("Cluster pause operations failed");
  }
};
