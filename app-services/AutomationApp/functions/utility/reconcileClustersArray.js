exports = function(atlasClusters, existingClusters = []) {
  const now = new Date();

  // Map existing clusters by name for quick lookup
  const existingClusterMap = {};
  for (const cluster of existingClusters) {
    existingClusterMap[cluster.name] = cluster;
  }

  // Build reconciled list based only on Atlas cluster names
  const reconciledClusters = atlasClusters.map(cluster => {
    const name = cluster.name;
    const created = cluster.createDate ? new Date(cluster.createDate) : null;
    const ageInDays = created ? Math.floor((now - created) / (1000 * 60 * 60 * 24)) : null;
    const mongoVersion = cluster.mongoDBVersion
      ? cluster.mongoDBVersion.split(".")[0]
      : null;

    const atlasData = {
      name,
      instanceSize: cluster.providerSettings?.instanceSizeName || null,
      mongoDBVersion: mongoVersion,
      paused: cluster.paused,
      createDate: cluster.createDate || null,
      ageInDays,
      autoscaling: cluster.autoScaling?.compute?.enabled || false
    };

    const enriched = existingClusterMap[name] || {};
    return {
      ...enriched,
      ...atlasData
    };
  });

  return reconciledClusters;
};