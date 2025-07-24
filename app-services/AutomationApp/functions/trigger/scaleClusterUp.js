/*
 * Atlas Function: scaleClusterUp
 * Scales up clusters based on automation tags and schedule settings
 * Can be called manually or triggered by schedule
 */

exports = async function(projectId = null, clusterName = null, scaleConfig = null) {
  console.log("🔄 Starting scale up operation...");
  
  try {
    // If specific cluster provided, scale just that one
    if (projectId && clusterName) {
      return await scaleSpecificCluster(projectId, clusterName, scaleConfig);
    }

    // Otherwise, scale all clusters with scale-up schedules
    return await scaleClustersWithSchedules();

  } catch (error) {
    console.error("❌ Error in scale up operation:", error.message);
    return {
      status: "error",
      message: error.message,
      timestamp: new Date()
    };
  }
};

// Scale a specific cluster
async function scaleSpecificCluster(projectId, clusterName, scaleConfig) {
  console.log(`🎯 Scaling specific cluster: ${clusterName} in project ${projectId}`);
  
  try {
    const cluster = await context.functions.execute("atlas/getProjectCluster", projectId, clusterName);
    
    if (!cluster) {
      return {
        status: "error",
        message: `Cluster ${clusterName} not found in project ${projectId}`
      };
    }

    // Use provided scale config or extract from tags
    let targetConfig = scaleConfig;
    if (!targetConfig) {
      targetConfig = extractScaleConfigFromTags(cluster.tags);
      if (!targetConfig) {
        return {
          status: "error",
          message: `No scale configuration found for cluster ${clusterName}`
        };
      }
    }

    const result = await context.functions.execute(
      "modifyCluster",
      context.values.get("AtlasPublicKey"),
      context.values.get("AtlasPrivateKey"),
      projectId,
      clusterName,
      targetConfig
    );

    console.log(`✅ Scale operation result for ${clusterName}:`, result);
    
    return {
      status: "success",
      message: `Cluster ${clusterName} scaled successfully`,
      clusterName,
      projectId,
      result
    };

  } catch (error) {
    console.error(`❌ Error scaling cluster ${clusterName}:`, error.message);
    return {
      status: "error",
      message: error.message,
      clusterName,
      projectId
    };
  }
}

// Scale all clusters with scale-up schedules
async function scaleClustersWithSchedules() {
  console.log("🔄 Scaling clusters with scheduled scale-up operations...");
  
  try {
    const scheduledProjects = await context.functions.execute("atlas/getProjectsWithScheduledClusters");

    if (!scheduledProjects || scheduledProjects.length === 0) {
      return { 
        status: "success", 
        message: "No scheduled clusters found", 
        clustersProcessed: 0 
      };
    }

    let totalClustersScaled = 0;
    let totalClustersSkipped = 0;
    let totalClustersErrored = 0;

    for (const project of scheduledProjects) {
      const { projectId, projectName, clusters = [] } = project;

      console.log(`\n📁 Processing Project: ${projectName} (${clusters.length} clusters)`);

      for (const cluster of clusters) {
        // Only process clusters with automation enabled and scale-up schedules
        if (!cluster.automationEnabled) {
          console.log(` - ⏭️ Cluster ${cluster.name} has automation disabled. Skipping.`);
          totalClustersSkipped++;
          continue;
        }

        const scaleConfig = extractScaleConfigFromTags(cluster.tags);
        if (!scaleConfig) {
          console.log(` - ⏭️ Cluster ${cluster.name} has no scale configuration. Skipping.`);
          totalClustersSkipped++;
          continue;
        }

        try {
          console.log(` - 🔄 Scaling cluster: ${cluster.name}`);
          
          const result = await scaleSpecificCluster(projectId, cluster.name, scaleConfig);
          
          if (result.status === "success") {
            console.log(` - ✅ Successfully scaled cluster: ${cluster.name}`);
            totalClustersScaled++;
          } else {
            console.log(` - ❌ Failed to scale cluster ${cluster.name}: ${result.message}`);
            totalClustersErrored++;
          }
          
        } catch (clusterError) {
          console.error(` - ❌ Error scaling cluster ${cluster.name}:`, clusterError.message);
          totalClustersErrored++;
        }
      }
    }

    const summary = {
      status: "completed",
      message: `Bulk scale operation completed`,
      totalProjects: scheduledProjects.length,
      clustersScaled: totalClustersScaled,
      clustersSkipped: totalClustersSkipped,
      clustersErrored: totalClustersErrored,
      timestamp: new Date()
    };

    console.log(`\n✅ Bulk scale operation completed:`);
    console.log(`   📊 Projects processed: ${summary.totalProjects}`);
    console.log(`   📈 Clusters scaled: ${summary.clustersScaled}`);
    console.log(`   ⏭️ Clusters skipped: ${summary.clustersSkipped}`);
    console.log(`   ❌ Clusters errored: ${summary.clustersErrored}`);

    return summary;

  } catch (error) {
    console.error("❌ Error in bulk scale operation:", error.message);
    throw error;
  }
}

// Extract scale configuration from cluster tags
function extractScaleConfigFromTags(tags = []) {
  const scaleUpTag = tags.find(tag => tag.key === "scale-up-config");
  
  if (!scaleUpTag || !scaleUpTag.value) {
    return null;
  }

  try {
    return JSON.parse(scaleUpTag.value);
  } catch (error) {
    console.error("❌ Error parsing scale-up-config tag:", error.message);
    return null;
  }
}

