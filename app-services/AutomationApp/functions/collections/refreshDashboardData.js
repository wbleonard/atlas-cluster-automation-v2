/*
 * Atlas Function: refreshDashboardData
 * Refreshes cluster status data for dashboard display
 * Uses tag-based approach to get current cluster states
 */

exports = async function() {
  console.log("🔄 Refreshing dashboard data...");
  
  try {



    // Get all Atlas projects
    const allProjects = await context.functions.execute("atlas/getProjects");
    const totalAtlasProjects = Array.isArray(allProjects) ? allProjects.length : 0;

    if (!allProjects || allProjects.length === 0) {
      console.log("refreshDashboardData: No Atlas projects found");
      return {
        status: "success",
        message: "No Atlas projects found",
        totalAtlasProjects: 0,
        totalProjectsWithScheduledClusters: 0,
        clusterCount: 0
      };
    }

    // For each project, get clusters and compute stats
    let totalClusters = 0;
    let pausedClusters = 0;
    let activeClusters = 0;
    let automationEnabledClusters = 0;
    let totalProjectsWithScheduledClusters = 0;

    for (const project of allProjects) {
      let clusters = [];
      try {
        clusters = await context.functions.execute("atlas/getProjectClusters", project.id || project._id || project.projectId);
      } catch (err) {
        console.warn(`refreshDashboardData: Could not fetch clusters for project ${project.name || project.id || project._id}:`, err.message);
        continue;
      }
      if (!Array.isArray(clusters) || clusters.length === 0) continue;

      let hasScheduledCluster = false;
      for (const cluster of clusters) {
        totalClusters++;
        if (cluster.paused) {
          pausedClusters++;
        } else {
          activeClusters++;
        }
        // Check for schedule tag (e.g., automation:pause-schedule)
        let hasPauseSchedule = false;
        let isAutomationEnabled = true;
        if (cluster.tags && Array.isArray(cluster.tags)) {
          hasPauseSchedule = cluster.tags.some(tag => tag.key === "automation:pause-schedule");
          const enabledTag = cluster.tags.find(tag => tag.key === "automation:enabled");
          if (enabledTag && typeof enabledTag.value === "string" && enabledTag.value.trim().toLowerCase() === "false") {
            isAutomationEnabled = false;
          }
        }
        if (hasPauseSchedule) {
          hasScheduledCluster = true;
          if (isAutomationEnabled) {
            automationEnabledClusters++;
          }
        }
      }
      if (hasScheduledCluster) totalProjectsWithScheduledClusters++;
    }



    const refreshTimestamp = new Date();



    // Update summary statistics in separate collection
    const dashboardSummaryCollection = await context.functions.execute("collections/getDashboardSummaryCollection");
    const summaryStats = {
      _id: "dashboard_summary",
      totalAtlasProjects: totalAtlasProjects,
      totalProjectsWithScheduledClusters: totalProjectsWithScheduledClusters,
      totalClusters: totalClusters,
      pausedClusters: pausedClusters,
      activeClusters: activeClusters,
      automationEnabledClusters: automationEnabledClusters,
      lastRefreshed: refreshTimestamp
    };

    await dashboardSummaryCollection.replaceOne(
      { _id: "dashboard_summary" },
      summaryStats,
      { upsert: true }
    );


    const summary = {
      status: "success",
      message: "Dashboard data refreshed successfully",
      totalAtlasProjects: totalAtlasProjects,
      totalProjectsWithScheduledClusters: totalProjectsWithScheduledClusters,
      clusterCount: totalClusters,
      stats: {
        paused: pausedClusters,
        active: activeClusters,
        automationEnabled: automationEnabledClusters
      },
      lastRefreshed: refreshTimestamp
    };

    console.log(`✅ Dashboard refresh completed:`);
    console.log(`   🗂️ Atlas projects scanned: ${totalAtlasProjects}`);
    console.log(`   📊 Projects with scheduled clusters: ${totalProjectsWithScheduledClusters}`);
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

// Helper function to format days of week array into readable string
function formatDaysOfWeek(daysArray) {
  if (!daysArray || !Array.isArray(daysArray) || daysArray.length === 0) {
    return null;
  }
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const sortedDays = [...daysArray].sort((a, b) => a - b);
  
  return sortedDays.map(day => dayNames[day]).join(', ');
}

// Helper function to format complete schedule display
function formatScheduleDisplay(parsedSchedule) {
  if (!parsedSchedule) return null;
  
  const { pauseHour, pauseDaysOfWeek, timezone } = parsedSchedule;
  
  if (pauseHour === null || !pauseDaysOfWeek || pauseDaysOfWeek.length === 0) {
    return null;
  }
  
  const daysDisplay = formatDaysOfWeek(pauseDaysOfWeek);
  const hourDisplay = pauseHour.toString().padStart(2, '0') + ':00';
  const timezoneDisplay = timezone ? ` ${timezone}` : '';
  
  return `${daysDisplay} at ${hourDisplay}${timezoneDisplay}`;
}
