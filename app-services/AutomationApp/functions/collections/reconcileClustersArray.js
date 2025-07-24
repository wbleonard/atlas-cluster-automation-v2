exports = async function(atlasClusters, existingClusters, debugMode = false) {
  if (debugMode) {
    console.log("🔍 reconcileClustersArray called");
  }
  
  // Test mode - if first parameter is "Hello world!", use test data
  if (atlasClusters === "Hello world!") {
    console.log("🧪 TEST MODE: Using test data");
    
    // Test Atlas clusters data (simulating what comes from Atlas API)
    atlasClusters = [
      {
        name: "test-cluster-1",
        mongoDBVersion: "7.0.4",
        paused: false,
        createDate: "2024-01-15T10:30:00Z",
        providerSettings: {
          instanceSizeName: "M10"
        },
        autoScaling: {
          compute: {
            enabled: true
          }
        }
      },
      {
        name: "test-cluster-2",
        mongoDBVersion: "6.0.12",
        paused: true,
        createDate: "2023-12-01T14:20:00Z",
        providerSettings: {
          instanceSizeName: "M20"
        },
        autoScaling: {
          compute: {
            enabled: false
          }
        }
      },
      {
        name: "test-cluster-3",
        mongoDBVersion: "7.0.2",
        paused: false,
        createDate: "2024-03-10T09:15:00Z",
        providerSettings: {
          instanceSizeName: "M30"
        }
        // Note: no autoScaling property to test undefined handling
      }
    ];
    
    // Test existing clusters data (simulating what's in our database)
    existingClusters = [
      {
        name: "test-cluster-1",
        description: "Development cluster",
        mongoOwner: "john.doe@company.com",
        customerContact: "dev-team@company.com",
        pauseDaysOfWeek: [6, 0], // Saturday and Sunday
        pauseHour: 18,
        timezone: "America/New_York"
      },
      {
        name: "test-cluster-2",
        description: "Staging environment",
        mongoOwner: "jane.smith@company.com",
        customerContact: "staging-team@company.com",
        pauseDaysOfWeek: [5, 6, 0], // Friday, Saturday, Sunday
        pauseHour: 20,
        timezone: "America/Los_Angeles"
      }
      // Note: test-cluster-3 doesn't exist in existing data to test new cluster handling
    ];
    
    if (debugMode) {
      console.log("🧪 TEST DATA - Atlas clusters:", JSON.stringify(atlasClusters, null, 2));
      console.log("🧪 TEST DATA - Existing clusters:", JSON.stringify(existingClusters, null, 2));
    }
  }
  
  // Validate inputs
  if (!atlasClusters || !Array.isArray(atlasClusters)) {
    console.warn("⚠️ atlasClusters is not a valid array");
    return [];
  }

  if (!Array.isArray(existingClusters)) {
    console.warn("⚠️ existingClusters is not an array, converting to empty array");
    existingClusters = [];
  }

  const now = new Date();
  const existingClusterMap = {};
  
  // Build a map of existing clusters by name
  for (const cluster of existingClusters) {
    if (cluster && cluster.name) {
      existingClusterMap[cluster.name] = cluster;
    }
  }

  // Build reconciled list based only on Atlas cluster names
  const reconciledClusters = [];
  
  for (const cluster of atlasClusters) {
    if (!cluster || !cluster.name) {
      console.warn("⚠️ Skipping cluster without name or null cluster");
      continue;
    }

    const name = cluster.name;
    if (debugMode) {
      console.log(`🔍 Processing cluster: ${name}`);
    }

    // Calculate age safely
    let ageInDays = 0;
    if (cluster.createDate) {
      try {
        const created = new Date(cluster.createDate);
        ageInDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
        if (debugMode) {
          console.log(`📅 Cluster ${name} age: ${ageInDays} days`);
        }
      } catch (e) {
        console.warn(`⚠️ Error parsing createDate for ${name}:`, e.message);
      }
    }

    // Get MongoDB version safely
    let mongoVersion = "";
    if (cluster.mongoDBVersion) {
      try {
        mongoVersion = cluster.mongoDBVersion.toString().split(".")[0];
        if (debugMode) {
          console.log(`🔢 Cluster ${name} MongoDB version: ${mongoVersion}`);
        }
      } catch (e) {
        console.warn(`⚠️ Error parsing mongoDBVersion for ${name}:`, e.message);
      }
    }

    // Get instance size safely
    let instanceSize = "";
    if (cluster.providerSettings && cluster.providerSettings.instanceSizeName) {
      instanceSize = cluster.providerSettings.instanceSizeName.toString();
      if (debugMode) {
        console.log(`💾 Cluster ${name} instance size: ${instanceSize}`);
      }
    }

    // Get autoscaling info safely
    let autoscaling = false;
    if (cluster.autoScaling && cluster.autoScaling.compute) {
      autoscaling = Boolean(cluster.autoScaling.compute.enabled);
      if (debugMode) {
        console.log(`⚡ Cluster ${name} autoscaling: ${autoscaling}`);
      }
    } else {
      if (debugMode) {
        console.log(`⚡ Cluster ${name} autoscaling: false (no autoScaling data)`);
      }
    }

    // Get paused status safely
    const paused = Boolean(cluster.paused);
    if (debugMode) {
      console.log(`⏸️ Cluster ${name} paused: ${paused}`);
    }

    // Create atlas data with only safe values
    const atlasData = {
      name: name.toString(),
      instanceSize: instanceSize,
      mongoDBVersion: mongoVersion,
      paused: paused,
      createDate: cluster.createDate || null,
      ageInDays: ageInDays,
      autoscaling: autoscaling,
      status: paused ? "PAUSED" : "ACTIVE"
    };

    if (debugMode) {
      console.log(`📊 Atlas data for ${name}:`, JSON.stringify(atlasData, null, 2));
    }

    // Get existing enriched data
    const enriched = existingClusterMap[name] || {};
    if (debugMode) {
      console.log(`📋 Enriched data for ${name}:`, JSON.stringify(enriched, null, 2));
    }
    
    // Create the final cluster object with all required fields
    const finalCluster = {
      name: atlasData.name,
      description: (enriched.description || "").toString(),
      instanceSize: atlasData.instanceSize,
      mongoDBVersion: atlasData.mongoDBVersion,
      paused: atlasData.paused,
      mongoOwner: (enriched.mongoOwner || "").toString(),
      customerContact: (enriched.customerContact || "").toString(),
      createDate: atlasData.createDate,
      ageInDays: atlasData.ageInDays,
      pauseDaysOfWeek: Array.isArray(enriched.pauseDaysOfWeek) ? enriched.pauseDaysOfWeek : [],
      pauseHour: enriched.pauseHour !== undefined ? enriched.pauseHour : null,
      timezone: (enriched.timezone || "").toString(),
      status: atlasData.status,
      autoscaling: atlasData.autoscaling
    };

    if (debugMode) {
      console.log(`🔧 Final cluster for ${name}:`, JSON.stringify(finalCluster, null, 2));
    }

    // Final validation - ensure no undefined values
    const validatedCluster = {};
    Object.keys(finalCluster).forEach(key => {
      const value = finalCluster[key];
      if (value !== undefined) {
        validatedCluster[key] = value;
      } else {
        console.warn(`⚠️ Removing undefined value for key ${key} in cluster ${name}`);
      }
    });

    if (debugMode) {
      console.log(`✅ Validated cluster for ${name}:`, JSON.stringify(validatedCluster, null, 2));
    }

    reconciledClusters.push(validatedCluster);
  }

  if (debugMode) {
    console.log(`✅ reconcileClustersArray returning ${reconciledClusters.length} clusters`);
    console.log("📋 Final result:", JSON.stringify(reconciledClusters, null, 2));
  }
  
  return reconciledClusters;
};