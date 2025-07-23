/*
 * Returns the details for one cluster in the specified project for the supplied project ID.
 * See https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/#tag/Clusters/operation/getCluster
 * 
 */
exports = async function(project_id, clusterName) {
  
  if (project_id == "Hello world!") { // Easy testing from the console
    project_id = "6807d3a43dae3141f99d8aa0"
    clusterName = "TestCluster"
  }
  
  // Get stored credentials...
  const username = await context.values.get("AtlasPublicKey");
  const password = await context.values.get("AtlasPrivateKey");
  
  const arg = { 
    scheme: 'https', 
    host: 'cloud.mongodb.com', 
    path: `api/atlas/v2/groups/${project_id}/clusters/${clusterName}`, 
    username: username, 
    password: password,
    //headers: {'Accept': ['application/vnd.atlas.2023-11-15+json"'], 'Content-Type': ['application/json'], 'Accept-Encoding': ['bzip, deflate']}, 
    headers: {'Accept': ['application/vnd.atlas.2023-11-15+json']}, 
    digestAuth:true,
  };
  
  // The response body is a BSON.Binary object. Parse it and return.
  response = await context.http.get(arg);

  return EJSON.parse(response.body.text()); 
};

