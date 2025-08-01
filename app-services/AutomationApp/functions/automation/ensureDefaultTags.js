// Atlas Function: ensureDefaultTags
// Ensures clusters have required organizational tags with default values
// Can be called manually or triggered automatically

exports = async function(projectId = null, clusterName = null, debugMode = false) {
  
  if (projectId === "Hello world!") {
    console.log("🧪 TEST MODE: Ensuring default tags for test project");
    projectId = "6807d3a43dae3141f99d8aa0"; // Test project ID
    projectId = "6813676f55ff275f7da84605"; // Performance
    projectId = null; // Process All
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
      'automation:pause-schedule': 'days:0.1.2.3.4.5.6:hour:22:timezone:America-New_York'  // Default schedule: every day at 22:00 America/New_York
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
      
      console.log(``);
      console.log(`📂 Processing project: ${projectName} (${currentProjectId})`);


      try {
        // Get clusters from Atlas API
        const clusters = await context.functions.execute("atlas/getProjectClusters", currentProjectId);
        
        if (!clusters || !Array.isArray(clusters) || clusters.length === 0) {
          console.log(`ℹ️ No clusters found for project ${projectName}`);
          continue;
        }

        for (const cluster of clusters) {
          if (!cluster || !cluster.name) {
            console.log("⚠️ Skipping cluster without name");
            continue;
          }

          // Skip if processing specific cluster and this isn't it
          if (clusterName && cluster.name !== clusterName) {
            console.log("⚠️ Skipping cluster name mismatch");
            continue;
          }

          totalClustersProcessed++;

          if (debugMode) {
            console.log(`🔍 Checking tags for cluster: ${cluster.name}`);
          }


          // Proactively skip if cluster is paused
          if (cluster.paused) {
            console.log(`⏭️ Skipping paused cluster ${cluster.name} - tags cannot be updated while cluster is paused`);
            // Log as skipped
            try {
              const activityCollection = await context.functions.execute("collections/getActivityLogsCollection");
              await activityCollection.insertOne({
                timestamp: new Date(),
                action: "DEFAULT_TAGS_SKIPPED",
                projectId: currentProjectId,
                clusterName: cluster.name,
                details: {
                  reason: "Cluster is paused - tags cannot be updated",
                  attemptedTags: [],
                  totalTagsAttempted: 0
                },
                status: "SKIPPED",
                triggerSource: "AUTOMATED_ENFORCEMENT"
              });
            } catch (logError) {
              console.warn(`⚠️ Failed to log skip reason for ${cluster.name}: ${logError.message}`);
            }
            continue;
          }

          // Proactively skip if cluster is a shared tier (M0, M2, M5)
          const instanceSize = cluster.providerSettings && cluster.providerSettings.instanceSizeName;
          if (["M0", "M2", "M5"].includes(instanceSize)) {
            console.log(`⏭️ Skipping free/shared tier cluster ${cluster.name} (${instanceSize}) - API updates not supported`);
            // Log as skipped
            try {
              const activityCollection = await context.functions.execute("collections/getActivityLogsCollection");
              await activityCollection.insertOne({
                timestamp: new Date(),
                action: "DEFAULT_TAGS_SKIPPED",
                projectId: currentProjectId,
                clusterName: cluster.name,
                details: {
                  reason: `Free/shared tier cluster (${instanceSize}) - API updates not supported`,
                  attemptedTags: [],
                  totalTagsAttempted: 0
                },
                status: "SKIPPED",
                triggerSource: "AUTOMATED_ENFORCEMENT"
              });
            } catch (logError) {
              console.warn(`⚠️ Failed to log skip reason for ${cluster.name}: ${logError.message}`);
            }
            continue;
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
              // Add all missing tags in a single call
              await context.functions.execute("tags/updateClusterTags", currentProjectId, cluster.name, missingTags);
              
              if (debugMode) {
                console.log(`✅ Added ${missingTags.length} tags to ${cluster.name}:`, 
                           missingTags.map(t => `${t.key}=${t.value}`).join(', '));
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
              // Check if this is a free tier cluster limitation
              if (tagError.message && (
                tagError.message.includes("TENANT_CLUSTER_UPDATE_UNSUPPORTED") ||
                tagError.message.includes("Cannot update a M0/M2/M5 cluster") ||
                tagError.message.includes("Update failed with status 400")
              )) {
                console.log(`⏭️ Skipping free tier cluster ${cluster.name} - API updates not supported (M0/M2/M5 clusters can only be updated manually)`);
                
                // Log as skipped rather than failed
                try {
                  const activityCollection = await context.functions.execute("collections/getActivityLogsCollection");
                  await activityCollection.insertOne({
                    timestamp: new Date(),
                    action: "DEFAULT_TAGS_SKIPPED",
                    projectId: currentProjectId,
                    clusterName: cluster.name,
                    details: {
                      reason: "Free tier cluster (M0/M2/M5) - API updates not supported",
                      attemptedTags: missingTags,
                      totalTagsAttempted: missingTags.length
                    },
                    status: "SKIPPED",
                    triggerSource: "AUTOMATED_ENFORCEMENT"
                  });
                } catch (logError) {
                  console.warn(`⚠️ Failed to log skip reason for ${cluster.name}: ${logError.message}`);
                }
                
                continue; // Continue to next cluster
              }
              
              // Check if cluster is transitioning (busy)
              if (tagError.message && (
                tagError.message.includes("being paused") ||
                tagError.message.includes("Cluster is busy")
              )) {
                console.log(`⏭️ Skipping transitioning cluster ${cluster.name} - tags cannot be updated while cluster is busy`);
                
                // Log as skipped rather than failed
                try {
                  const activityCollection = await context.functions.execute("collections/getActivityLogsCollection");
                  await activityCollection.insertOne({
                    timestamp: new Date(),
                    action: "DEFAULT_TAGS_SKIPPED",
                    projectId: currentProjectId,
                    clusterName: cluster.name,
                    details: {
                      reason: "Cluster is transitioning - tags cannot be updated",
                      attemptedTags: missingTags,
                      totalTagsAttempted: missingTags.length
                    },
                    status: "SKIPPED",
                    triggerSource: "AUTOMATED_ENFORCEMENT"
                  });
                } catch (logError) {
                  console.warn(`⚠️ Failed to log skip reason for ${cluster.name}: ${logError.message}`);
                }
                
                continue; // Continue to next cluster
              }
              
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
