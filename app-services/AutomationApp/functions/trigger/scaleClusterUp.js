exports = async function() {
  
  // Supply projectID and clusterNames...
  const projectID = '655b7867797c6e69eb530e2a';
  const clusterName = 'DemoCluster';

  // Get stored credentials...
  const username = context.values.get("AtlasPublicKey");
  const password = context.values.get("AtlasPrivateKey");

  const body =   {
    "replicationSpecs": [
      {
        //"numShards":1,
        "regionConfigs": [
          {
            "electableSpecs": {
              "instanceSize": "M10",
              "nodeCount":3
            },
            "analyticsSpecs": {
              "instanceSize": "M20",
              "nodeCount":1
            },
            "priority":7,
            "providerName": "AZURE",
            "regionName": "US_EAST_2",
          },
        ]
      }
    ]
  };
  
  result = await context.functions.execute('modifyCluster', username, password, projectID, clusterName, body);
  console.log(EJSON.stringify(result));
  
  if (result.error) {
    return result;
  }

  return clusterName + " scaled up"; 
};

