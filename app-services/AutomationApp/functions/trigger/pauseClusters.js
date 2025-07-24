/*
 * Atlas Function: pauseClusters
 * Simplified function to pause all clusters with automation enabled
 * Uses tag-based approach to find scheduled clusters
 */

exports = async function() {
  console.log("🔄 Starting bulk pause operation for all scheduled clusters...");
  
  try {
    // Use the tag-based approach to find clusters with schedules
    const scheduledProjects = await context.functions.execute("atlas/getProjectsWithScheduledClusters");

    if (!scheduledProjects || scheduledProjects.length === 0) {
      console.log("pauseClusters: No projects with scheduled clusters found");
      return { 
        status: "success", 
        message: "No scheduled clusters found", 
        clustersProcessed: 0 
      };
    }
    
    console.log(`pauseClusters: Found ${scheduledProjects.length} projects with scheduled clusters`);

    let totalClustersPaused = 0;
    let totalClustersSkipped = 0;
    let totalClustersErrored = 0;

    for (const project of scheduledProjects) {
      const { projectId, projectName, clusters = [] } = project;

      console.log(`\n📁 Processing Project: ${projectName} (${clusters.length} clusters)`);

      // Filter clusters that have automation enabled
      const enabledClusters = clusters.filter((c) => c.automationEnabled);
      const disabledClusters = clusters.filter((c) => !c.automationEnabled);

      // Log clusters that have automation disabled
      for (const cluster of disabledClusters) {
        console.log(` - ⏭️ Cluster ${cluster.name} has automation disabled. Skipping.`);
        totalClustersSkipped++;
      }

      if (enabledClusters.length === 0) {
        console.log(` - No clusters with automation enabled in project ${projectName}`);
        continue;
      }

      // Process each enabled cluster
      for (const cluster of enabledClusters) {
        try {
          console.log(` - 🔄 Attempting to pause cluster: ${cluster.name}`);
          
          const result = await context.functions.execute(
            "setClusterPauseState",
            projectId,
            cluster.name,
            "PAUSED",
            "BULK_PAUSE_TRIGGER"
          );
          
          if (result.status === "success") {
            console.log(` - ✅ Successfully paused cluster: ${cluster.name}`);
            totalClustersPaused++;
          } else if (result.status === "skipped") {
            console.log(` - ⏭️ Cluster ${cluster.name} was already paused`);
            totalClustersSkipped++;
          } else {
            console.log(` - ❌ Failed to pause cluster ${cluster.name}: ${result.message}`);
            totalClustersErrored++;
          }
          
        } catch (clusterError) {
          console.error(` - ❌ Error pausing cluster ${cluster.name}:`, clusterError.message);
          totalClustersErrored++;
        }
      }
    }

    const summary = {
      status: "completed",
      message: `Bulk pause operation completed`,
      totalProjects: scheduledProjects.length,
      clustersPaused: totalClustersPaused,
      clustersSkipped: totalClustersSkipped,
      clustersErrored: totalClustersErrored,
      timestamp: new Date()
    };

    console.log(`\n✅ Bulk pause operation completed:`);
    console.log(`   � Projects processed: ${summary.totalProjects}`);
    console.log(`   ⏸️ Clusters paused: ${summary.clustersPaused}`);
    console.log(`   ⏭️ Clusters skipped: ${summary.clustersSkipped}`);
    console.log(`   ❌ Clusters errored: ${summary.clustersErrored}`);

    return summary;

  } catch (error) {
    console.error("❌ Error in bulk pause operation:", error.message);
    return {
      status: "error",
      message: error.message,
      timestamp: new Date()
    };
  }
};
