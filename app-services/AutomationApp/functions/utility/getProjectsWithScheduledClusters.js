// Atlas Function: getProjectsWithScheduledClusters
// Fetches all projects and identifies clusters with automation:pause-schedule tags
// Returns an array of projects with their scheduled clusters

exports = async function() {
  try {
    console.log("getProjectsWithScheduledClusters: Fetching all projects from Atlas");
    
    // Use our existing utility function to fetch all projects
    const projects = await context.functions.execute("utility/getProjects");
    const projectsWithScheduledClusters = [];

    console.log(`getProjectsWithScheduledClusters: Found ${projects.length} projects. Checking for scheduled clusters...`);

    // Process each project
    for (const project of projects) {
      const projectId = project.id;
      const projectName = project.name;
      
      try {
        // Use our existing utility function to fetch clusters for this project
        const clusters = await context.functions.execute("utility/getProjectClusters", projectId);
        const scheduledClusters = [];

        // Check each cluster for automation tags
        for (const cluster of clusters) {
          const scheduleTag = cluster.tags?.find(tag => tag.key === 'automation:pause-schedule');
          
          if (scheduleTag) {
            try {
              // Parse the schedule using our utility function
              const schedule = await context.functions.execute("utility/parseScheduleTag", scheduleTag.value);
              
              scheduledClusters.push({
                name: cluster.name,
                paused: cluster.paused || false,
                ...schedule, // Add pauseHour, pauseDaysOfWeek, timezone
                // Keep additional cluster info that might be useful
                instanceSize: cluster.providerSettings?.instanceSizeName,
                mongoDBVersion: cluster.mongoDBMajorVersion,
                createDate: cluster.createDate
              });
              
              console.log(`getProjectsWithScheduledClusters: Found scheduled cluster ${cluster.name} in project ${projectName}`);
            } catch (parseError) {
              console.error(`getProjectsWithScheduledClusters: Invalid schedule tag for cluster ${cluster.name} in project ${projectName}: ${parseError.message}`);
              // Skip this cluster but continue processing others
            }
          }
        }

        // Only include projects that have at least one scheduled cluster
        if (scheduledClusters.length > 0) {
          projectsWithScheduledClusters.push({
            projectId: projectId,
            projectName: projectName,
            clusters: scheduledClusters
          });
          
          console.log(`getProjectsWithScheduledClusters: Project ${projectName} has ${scheduledClusters.length} scheduled cluster(s)`);
        }

      } catch (error) {
        console.error(`getProjectsWithScheduledClusters: Error processing project ${projectName} (${projectId}): ${error.message}`);
        // Continue with next project
      }
    }

    console.log(`getProjectsWithScheduledClusters: Found ${projectsWithScheduledClusters.length} projects with scheduled clusters`);
    return projectsWithScheduledClusters;

  } catch (error) {
    console.error(`getProjectsWithScheduledClusters: Error fetching projects and scheduled clusters: ${error.message}`, error);
    throw error;
  }
};
