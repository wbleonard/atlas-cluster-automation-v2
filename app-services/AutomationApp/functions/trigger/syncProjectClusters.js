exports = async function () {
  // Debug flag - set to true to see detailed cluster processing logs
  const DEBUG_MODE = false;
  
  console.log("🚀 STARTING syncProjectClusters function");
  
  if (DEBUG_MODE) {
    console.log("🐛 DEBUG MODE ENABLED - Detailed cluster processing logs will be shown");
  }

  // Simple function to completely eliminate undefined values using JSON
  function removeUndefined(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // Function to create a minimal, safe cluster object
  function createSafeCluster(cluster) {
    return {
      name: cluster.name || "",
      description: cluster.description || "",
      instanceSize: cluster.instanceSize || "",
      mongoDBVersion: cluster.mongoDBVersion || "",
      paused: !!cluster.paused,
      mongoOwner: cluster.mongoOwner || "",
      customerContact: cluster.customerContact || "",
      createDate: cluster.createDate || null,
      ageInDays: cluster.ageInDays || 0,
      pauseDaysOfWeek: Array.isArray(cluster.pauseDaysOfWeek) ? cluster.pauseDaysOfWeek : [],
      pauseHour: cluster.pauseHour || null,
      timezone: cluster.timezone || "",
      status: cluster.status || "UNKNOWN",
      autoscaling: !!cluster.autoscaling
    };
  }

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

    console.log(`\n📡 Syncing clusters for project: ${projectName} (${projectId})`);

    let clusters;
    try {
      clusters = await context.functions.execute(
        "utility/getProjectClusters",
        projectId,
      );
    } catch (error) {
      console.error(`❌ Error getting clusters for ${projectName}:`, error.message);
      continue;
    }

    if (!clusters || !Array.isArray(clusters)) {
      console.warn(`⚠️ Skipping project ${projectName} — no clusters or invalid response.`);
      continue;
    }

    // If no clusters exist, handle it cleanly
    if (clusters.length === 0) {
      console.log(`📋 Project ${projectName} has no clusters - updating with empty cluster list`);
      
      const emptyProjectDoc = {
        projectId: projectId.toString(),
        projectName: projectName.toString(),
        clusters: [],
        updatedAt: new Date()
      };

      try {
        await clusterOpsCollection.updateOne(
          { projectId: projectId.toString() },
          { $set: emptyProjectDoc },
          { upsert: true }
        );
        console.log(`✅ Updated empty project record for ${projectName}`);
      } catch (error) {
        console.error(`❌ Error updating empty project ${projectName}:`, error.message);
      }
      continue;
    }

    // Get the existing project doc (with enriched cluster data, if any)
    const existingDoc = await clusterOpsCollection.findOne({ projectId });
    const existingClusters = existingDoc?.clusters || [];

    // Use your utility function to reconcile Atlas clusters with enriched ones
    let reconciledClusters;
    try {
      reconciledClusters = await context.functions.execute(
        "utility/reconcileClustersArray",
        clusters,
        existingClusters,
        DEBUG_MODE  // Pass the debug flag to reconcileClustersArray
      );
    } catch (error) {
      console.error(`❌ Error reconciling clusters for ${projectName}:`, error.message);
      continue;
    }

    // Create safe cluster objects
    const safeClusters = reconciledClusters
      .map(cluster => createSafeCluster(cluster))
      .filter(cluster => cluster.name && cluster.name.trim() !== "");

    // Double-check after filtering - in case all clusters were filtered out
    if (safeClusters.length === 0) {
      console.warn(`⚠️ Project ${projectName} had clusters but none were valid after processing`);
      
      const emptyProjectDoc = {
        projectId: projectId.toString(),
        projectName: projectName.toString(),
        clusters: [],
        updatedAt: new Date()
      };

      try {
        await clusterOpsCollection.updateOne(
          { projectId: projectId.toString() },
          { $set: emptyProjectDoc },
          { upsert: true }
        );
        console.log(`✅ Updated project ${projectName} with empty cluster list (invalid clusters filtered out)`);
      } catch (error) {
        console.error(`❌ Error updating filtered project ${projectName}:`, error.message);
      }
      continue;
    }

    console.log(`🔍 Processing ${safeClusters.length} valid clusters for ${projectName}`);

    // Debug logging for cluster details
    if (DEBUG_MODE) {
      console.log(`🐛 DEBUG - Cluster details for ${projectName}:`);
      safeClusters.forEach((cluster, index) => {
        console.log(`  ${index + 1}. ${cluster.name} (${cluster.instanceSize}, ${cluster.status}, autoscaling: ${cluster.autoscaling})`);
      });
    }

    // Create the document with explicit safe values
    const documentToInsert = {
      projectId: projectId.toString(),
      projectName: projectName.toString(),
      clusters: safeClusters,
      updatedAt: new Date()
    };

    // Use JSON stringify/parse to remove any undefined values
    const finalDocument = removeUndefined(documentToInsert);

    // Additional safety check - ensure clusters array is clean
    if (finalDocument.clusters) {
      finalDocument.clusters = finalDocument.clusters.filter(cluster => 
        cluster && typeof cluster === 'object' && cluster.name
      );
    }

    try {
      // Update the document with the reconciled clusters
      await clusterOpsCollection.updateOne(
        { projectId: projectId.toString() },
        { $set: finalDocument },
        { upsert: true },
      );

      totalClustersSynced += safeClusters.length;
      console.log(`✅ Successfully synced ${safeClusters.length} clusters for ${projectName}`);
    } catch (error) {
      console.error(`❌ Error updating project ${projectName}:`, error.message);
      
      if (DEBUG_MODE) {
        console.error(`🐛 DEBUG - Final document keys:`, Object.keys(finalDocument));
        console.error(`🐛 DEBUG - Clusters count:`, finalDocument.clusters ? finalDocument.clusters.length : 0);
      }
      
      // Ultra-minimal fallback - just record that the project exists
      try {
        const ultraMinimalDoc = {
          projectId: projectId.toString(),
          projectName: projectName.toString(),
          clusters: [],
          updatedAt: new Date(),
          error: "Failed to sync clusters"
        };
        
        await clusterOpsCollection.updateOne(
          { projectId: projectId.toString() },
          { $set: ultraMinimalDoc },
          { upsert: true }
        );
        
        console.log(`✅ Inserted ultra-minimal data for ${projectName}`);
      } catch (ultraMinimalError) {
        console.error(`❌ Even ultra-minimal insert failed for ${projectName}:`, ultraMinimalError.message);
      }
    }
  }

  // Remove orphaned projects from clusterOpsCollection
  try {
    const activeProjectIds = projects.map((p) => p.id.toString()).filter(id => id && id.trim() !== "");
    const orphanedProjects = await clusterOpsCollection
      .find({
        projectId: { $nin: activeProjectIds },
      })
      .toArray();

    if (orphanedProjects.length > 0) {
      const orphanedIds = orphanedProjects
        .map((p) => p.projectId)
        .filter(id => id && id.trim() !== "");
      
      if (DEBUG_MODE) {
        console.warn(`🧹 Removing ${orphanedIds.length} orphaned project(s):`, orphanedIds);
      } else {
        console.warn(`🧹 Removing ${orphanedIds.length} orphaned project(s)`);
      }

      if (orphanedIds.length > 0) {
        await clusterOpsCollection.deleteMany({
          projectId: { $in: orphanedIds },
        });
      }
    }
  } catch (error) {
    console.error(`❌ Error cleaning up orphaned projects:`, error.message);
  }

  console.log(`\n✅ Synced ${totalClustersSynced} clusters across ${projects.length} projects`);
  return {
    status: "ok",
    totalProjects: projects.length,
    totalClusters: totalClustersSynced,
  };
};
