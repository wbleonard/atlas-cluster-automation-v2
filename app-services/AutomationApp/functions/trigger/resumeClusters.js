/*
 * Iterates over the provided projects and clusters, resuming those clusters
 */
exports = async function() {
  
  // Supply projectIDs and clusterNames...
  const projectIDs = [{id:'5c5db514c56c983b7e4a8701', names:['Demo', 'Demo2']}, {id:'62d05595f08bd53924fa3634', names:['ShardedMultiRegion']}];

  // Get stored credentials...
  const username = context.values.get("AtlasPublicKey");
  const password = context.values.get("AtlasPrivateKey");

  // Set desired state...
  const body = {paused: false};

  var result = "";
  
  projectIDs.forEach(async function (project) {
    
    project.names.forEach(async function (cluster) {
      result = await context.functions.execute('modifyCluster', username, password, project.id, cluster, body);
      console.log("Cluster " + cluster + ": " + EJSON.stringify(result));
    });
  });
  
  return "Clusters Paused";
};

