/*
 * Atlas Function: refreshDashboardData
 * Refreshes cluster status data for dashboard display
 * Uses tag-based approach to get current cluster states
 */

exports = async function() {
  console.log("🔄 Refreshing dashboard data...");
  
  try {
    // Get fresh cluster data from Atlas
    const projectsWithClusters = await context.functions.execute("atlas/getProjectsWithScheduledClusters");

    if (!projectsWithClusters || projectsWithClusters.length === 0) {
      console.log("refreshDashboardData: No projects with scheduled clusters found");
      return {
        status: "success",
        message: "No scheduled clusters found",
        projectCount: 0,
        clusterCount: 0
      };
    }

    // Update cluster status collection for dashboard
    const clusterStatusCollection = await context.functions.execute("collections/getClusterStatusCollection");
    
    // Calculate totals
    let totalClusters = 0;
    let pausedClusters = 0;
    let activeClusters = 0;
    let automationEnabledClusters = 0;

    const refreshTimestamp = new Date();
    const clusterStatusUpdates = [];

    for (const project of projectsWithClusters) {
      for (const cluster of project.clusters) {
        totalClusters++;
        
        if (cluster.paused) {
          pausedClusters++;
        } else {
          activeClusters++;
        }

        if (cluster.automationEnabled) {
          automationEnabledClusters++;
        }

        // Prepare status document for collection
        clusterStatusUpdates.push({
          updateOne: {
            filter: { projectId: project.projectId, clusterName: cluster.name },
            update: {
              $set: {
                projectId: project.projectId,
                projectName: project.projectName,
                clusterName: cluster.name,
                stateName: cluster.stateName,
                paused: cluster.paused,
                automationEnabled: cluster.automationEnabled,
                schedule: cluster.schedule,
                instanceSize: cluster.instanceSize,
                mongoOwner: cluster.mongoOwner,
                description: cluster.description,
                tags: cluster.tags,
                lastRefreshed: refreshTimestamp
              }
            },
            upsert: true
          }
        });
      }
    }

    // Bulk update cluster status collection
    if (clusterStatusUpdates.length > 0) {
      await clusterStatusCollection.bulkWrite(clusterStatusUpdates);
    }

    // Update summary statistics
    const summaryStats = {
      _id: "dashboard_summary",
      totalProjects: projectsWithClusters.length,
      totalClusters: totalClusters,
      pausedClusters: pausedClusters,
      activeClusters: activeClusters,
      automationEnabledClusters: automationEnabledClusters,
      lastRefreshed: refreshTimestamp
    };

    await clusterStatusCollection.replaceOne(
      { _id: "dashboard_summary" },
      summaryStats,
      { upsert: true }
    );

    const summary = {
      status: "success",
      message: "Dashboard data refreshed successfully",
      projectCount: projectsWithClusters.length,
      clusterCount: totalClusters,
      stats: {
        paused: pausedClusters,
        active: activeClusters,
        automationEnabled: automationEnabledClusters
      },
      lastRefreshed: refreshTimestamp
    };

    console.log(`✅ Dashboard refresh completed:`);
    console.log(`   📊 Projects: ${summary.projectCount}`);
    console.log(`   🏭 Total clusters: ${summary.clusterCount}`);
    console.log(`   ⏸️ Paused: ${summary.stats.paused}`);
    console.log(`   ▶️ Active: ${summary.stats.active}`);
    console.log(`   🤖 Automation enabled: ${summary.stats.automationEnabled}`);

    return summary;

  } catch (error) {
    console.error("❌ Error refreshing dashboard data:", error.message);
    return {
      status: "error",
      message: error.message,
      timestamp: new Date()
    };
  }
};
