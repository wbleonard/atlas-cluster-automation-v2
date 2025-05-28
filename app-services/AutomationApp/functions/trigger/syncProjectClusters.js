exports = async function () {
  const clusterOpsCollection = await context.functions.execute(
    "utility/getClusterOpsCollection",
  );

  const projects = await context.functions.execute("utility/getProjects");

  if (!projects || !Array.isArray(projects)) {
    console.error("❌ Failed to retrieve projects.");
    return { status: "error", reason: "No projects returned" };
  }

  let totalClustersSynced = 0;

  for (const project of projects) {
    const projectId = project.id;
    const projectName = project.name;

    console.log(
      `📡 Syncing clusters for project: ${projectName} (${projectId})`,
    );

    const clusters = await context.functions.execute(
      "utility/getProjectClusters",
      projectId,
    );

    if (!clusters || !Array.isArray(clusters)) {
      console.warn(
        `⚠️ Skipping project ${projectName} — no clusters or invalid response.`,
      );
      continue;
    }

    // Get the existing project doc (with enriched cluster data, if any)
    const existingDoc = await clusterOpsCollection.findOne({ projectId });
    const existingClusters = existingDoc?.clusters || [];

    // Use your utility function to reconcile Atlas clusters with enriched ones
    const reconciledClusters = await context.functions.execute(
      "utility/reconcileClustersArray",
      clusters,
      existingClusters,
    );

    // Update the document with the reconciled clusters
    await clusterOpsCollection.updateOne(
      { projectId },
      {
        $set: {
          projectId,
          projectName,
          clusters: reconciledClusters,
        },
      },
      { upsert: true },
    );

    totalClustersSynced += reconciledClusters.length;
  }

  // Remove orphaned projects from clusterOpsCollection
  const activeProjectIds = projects.map((p) => p.id);
  const orphanedProjects = await clusterOpsCollection
    .find({
      projectId: { $nin: activeProjectIds },
    })
    .toArray();

  if (orphanedProjects.length > 0) {
    const orphanedIds = orphanedProjects.map((p) => p.projectId);
    console.warn(
      `🧹 Removing ${orphanedIds.length} orphaned project(s):`,
      orphanedIds,
    );

    await clusterOpsCollection.deleteMany({
      projectId: { $in: orphanedIds },
    });
  }

  console.log(
    `✅ Synced ${totalClustersSynced} clusters across ${projects.length} projects`,
  );
  return {
    status: "ok",
    totalProjects: projects.length,
    totalClusters: totalClustersSynced,
  };
};
