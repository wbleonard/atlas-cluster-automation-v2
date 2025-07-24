// Atlas Function: ensureDefaultTags
// Ensures clusters have required organizational tags with default values
// Can be called manually or triggered automatically

exports = async function(projectId = null, clusterName = null, debugMode = false) {
  
  if (projectId === "Hello world!") {
    console.log("🧪 TEST MODE: Ensuring default tags for test project");
    projectId = "6807d3a43dae3141f99d8aa0"; // Test project ID
    debugMode = true;
  }

  console.log("🏷️ Starting default tag enforcement...");
  
  try {
    // Define required tags with default values
    const requiredTags = {
      // Organizational tags
      'OWNED_BY': 'unassigned',
      'SUPPORTED_BY': 'unassigned', 
      'PROJECT_STATUS': 'active',
      
      // Automation tags
      'automation:enabled': 'true',
      'automation:pause-schedule': null  // Will be set to null, meaning no schedule by default
    };

    // Get projects to process
    let projects;
    if (projectId) {
      projects = [{ id: projectId }];
      console.log(`🎯 Processing single project: ${projectId}`);
    } else {
      projects = await context.functions.execute("atlas/getProjects");
      console.log(`🌐 Processing all ${projects.length} projects`);
    }

    let totalClustersProcessed = 0;
    let clustersUpdated = 0;

    for (const project of projects) {
      const currentProjectId = project.id;
      const projectName = project.name || `Project-${currentProjectId}`;
      
      if (debugMode) {
        console.log(`📂 Processing project: ${projectName} (${currentProjectId})`);
      }

      try {
        // Get clusters from Atlas API
        const clusters = await context.functions.execute("atlas/getProjectClusters", currentProjectId);
        
        if (!clusters || !Array.isArray(clusters)) {
          console.warn(`⚠️ No clusters found for project ${projectName}`);
          continue;
        }

        for (const cluster of clusters) {
          if (!cluster || !cluster.name) {
            console.warn("⚠️ Skipping cluster without name");
            continue;
          }

          // Skip if processing specific cluster and this isn't it
          if (clusterName && cluster.name !== clusterName) {
            continue;
          }

          totalClustersProcessed++;

          if (debugMode) {
            console.log(`🔍 Checking tags for cluster: ${cluster.name}`);
          }

          // Check which required tags are missing
          const existingTags = cluster.tags || [];
          const existingTagKeys = existingTags.map(tag => tag.key);
          const missingTags = [];

          for (const [tagKey, defaultValue] of Object.entries(requiredTags)) {
            if (!existingTagKeys.includes(tagKey)) {
              // Skip automation:pause-schedule if it's null (don't add empty schedule)
              if (tagKey === 'automation:pause-schedule' && defaultValue === null) {
                if (debugMode) {
                  console.log(`⏭️ Skipping ${tagKey} for ${cluster.name} (no default schedule)`);
                }
                continue;
              }
              missingTags.push({ key: tagKey, value: defaultValue });
            }
          }

          // Add missing tags if any
          if (missingTags.length > 0) {
            console.log(`📝 Adding ${missingTags.length} missing tags to ${cluster.name}:`, 
                       missingTags.map(t => `${t.key}=${t.value}`).join(', '));
            
            try {
              // Add each missing tag
              for (const tag of missingTags) {
                await context.functions.execute("tags/updateClusterTags", currentProjectId, cluster.name, [tag], []);
                
                if (debugMode) {
                  console.log(`✅ Added tag ${tag.key}=${tag.value} to ${cluster.name}`);
                }
              }
              
              clustersUpdated++;
              
              // Log the activity
              try {
                const activityCollection = await context.functions.execute("collections/getActivityLogsCollection");
                await activityCollection.insertOne({
                  timestamp: new Date(),
                  action: "DEFAULT_TAGS_ADDED",
                  projectId: currentProjectId,
                  clusterName: cluster.name,
                  details: {
                    tagsAdded: missingTags,
                    totalTagsAdded: missingTags.length
                  },
                  status: "SUCCESS",
                  triggerSource: "AUTOMATED_ENFORCEMENT"
                });
              } catch (logError) {
                console.warn(`⚠️ Failed to log activity for ${cluster.name}: ${logError.message}`);
              }
              
            } catch (tagError) {
              console.error(`❌ Failed to add tags to ${cluster.name}: ${tagError.message}`);
              
              // Log the failure
              try {
                const activityCollection = await context.functions.execute("collections/getActivityLogsCollection");
                await activityCollection.insertOne({
                  timestamp: new Date(),
                  action: "DEFAULT_TAGS_FAILED",
                  projectId: currentProjectId,
                  clusterName: cluster.name,
                  details: {
                    attemptedTags: missingTags,
                    error: tagError.message
                  },
                  status: "FAILED",
                  triggerSource: "AUTOMATED_ENFORCEMENT"
                });
              } catch (logError) {
                console.warn(`⚠️ Failed to log error for ${cluster.name}: ${logError.message}`);
              }
            }
          } else {
            if (debugMode) {
              console.log(`✅ Cluster ${cluster.name} already has all required tags`);
            }
          }
        }

      } catch (projectError) {
        console.error(`❌ Error processing project ${projectName}: ${projectError.message}`);
        continue;
      }
    }

    const result = {
      status: "success",
      message: `Processed ${totalClustersProcessed} clusters, updated ${clustersUpdated} clusters with missing tags`,
      clustersProcessed: totalClustersProcessed,
      clustersUpdated: clustersUpdated,
      projectsProcessed: projects.length,
      timestamp: new Date()
    };

    console.log("✅ Default tag enforcement completed:", JSON.stringify(result));
    return result;

  } catch (error) {
    console.error("❌ Error in ensureDefaultTags:", error.message);
    throw error;
  }
};
