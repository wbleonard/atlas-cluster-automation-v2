/*
 * Atlas Function: resumeClusters
 * Simplified function to resume all clusters with automation enabled
 * Uses tag-based approach to find scheduled clusters
 */

exports = async function() {
  console.log("🔄 Starting bulk resume operation for all scheduled clusters...");
  
  try {
    // Use the tag-based approach to find clusters with schedules
    const scheduledProjects = await context.functions.execute("atlas/getProjectsWithScheduledClusters");

    if (!scheduledProjects || scheduledProjects.length === 0) {
      console.log("resumeClusters: No projects with scheduled clusters found");
      return { 
        status: "success", 
        message: "No scheduled clusters found", 
        clustersProcessed: 0 
      };
    }
    
    console.log(`resumeClusters: Found ${scheduledProjects.length} projects with scheduled clusters`);

    let totalClustersResumed = 0;
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
          console.log(` - 🔄 Attempting to resume cluster: ${cluster.name}`);
          
          const result = await context.functions.execute(
            "setClusterPauseState",
            projectId,
            cluster.name,
            "ACTIVE",
            "BULK_RESUME_TRIGGER"
          );
          
          if (result.status === "success") {
            console.log(` - ✅ Successfully resumed cluster: ${cluster.name}`);
            totalClustersResumed++;
          } else if (result.status === "skipped") {
            console.log(` - ⏭️ Cluster ${cluster.name} was already active`);
            totalClustersSkipped++;
          } else {
            console.log(` - ❌ Failed to resume cluster ${cluster.name}: ${result.message}`);
            totalClustersErrored++;
          }
          
        } catch (clusterError) {
          console.error(` - ❌ Error resuming cluster ${cluster.name}:`, clusterError.message);
          totalClustersErrored++;
        }
      }
    }

    const summary = {
      status: "completed",
      message: `Bulk resume operation completed`,
      totalProjects: scheduledProjects.length,
      clustersResumed: totalClustersResumed,
      clustersSkipped: totalClustersSkipped,
      clustersErrored: totalClustersErrored,
      timestamp: new Date()
    };

    console.log(`\n✅ Bulk resume operation completed:`);
    console.log(`   📊 Projects processed: ${summary.totalProjects}`);
    console.log(`   ▶️ Clusters resumed: ${summary.clustersResumed}`);
    console.log(`   ⏭️ Clusters skipped: ${summary.clustersSkipped}`);
    console.log(`   ❌ Clusters errored: ${summary.clustersErrored}`);

    return summary;

  } catch (error) {
    console.error("❌ Error in bulk resume operation:", error.message);
    return {
      status: "error",
      message: error.message,
      timestamp: new Date()
    };
  }
};

