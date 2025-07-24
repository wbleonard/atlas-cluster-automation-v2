/*
 * Modifies the cluster as defined by the body parameter.
 * See https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/#tag/Clusters/operation/updateCluster
 *
 */
exports = async function (username, password, projectID, clusterName, body) {
  // Easy testing from the console
  if (username == "Hello world!") {
    username = await context.values.get("AtlasPublicKey");
    password = await context.values.get("AtlasPrivateKey");
    projectID = "655b7867797c6e69eb530e2a";
    clusterName = "ProvingGround";
    body = { paused: true };
  }

  const clusterUrl = {
    scheme: "https",
    host: "cloud.mongodb.com",
    path: "api/atlas/v2/groups/" + projectID + "/clusters/" + clusterName,
    username: username,
    password: password,
    headers: {
      Accept: ["application/vnd.atlas.2023-11-15+json"],
      "Content-Type": ["application/json"],
      "Accept-Encoding": ["bzip, deflate"],
    },
    digestAuth: true,
  };

  try {
    // First, get the current state of the cluster
    const getResponse = await context.http.get(clusterUrl);
    const getBodyText = getResponse.body?.text() || "";
    const currentCluster = getBodyText ? EJSON.parse(getBodyText) : {};

    if (getResponse.statusCode !== 200) {
      console.log(`modifyCluster: Failed to fetch cluster state: ${getResponse.statusCode}`, currentCluster);
      return {
        message: "Failed to fetch cluster state.",
        cluster: currentCluster,
      };
    }

    // Check if the current state matches the desired changes (only for pause/resume operations)
    if (body.paused !== undefined) {
      const isAlreadyPaused = body.paused === true && currentCluster.paused === true;
      const isAlreadyUnpaused = body.paused === false && currentCluster.paused === false;

      if (isAlreadyPaused || isAlreadyUnpaused) {
        return {
          message: "No changes applied as the cluster is already in the desired pause state.",
          cluster: currentCluster,
        };
      }
    }

    // Proceed to patch since state differs
    clusterUrl.body = JSON.stringify(body);
    
    // Debug logging for tag updates
    if (body.tags) {
      console.log(`modifyCluster: Updating tags for ${clusterName}:`, JSON.stringify(body.tags, null, 2));
    }

    const patchResponse = await context.http.patch(clusterUrl);
    const patchBodyText = patchResponse.body?.text() || "";
    const patchedCluster = patchBodyText ? EJSON.parse(patchBodyText) : {};

    if (patchResponse.statusCode >= 200 && patchResponse.statusCode < 300) {
      return patchedCluster;
    } else if (patchResponse.statusCode === 409) {
      console.error(`modifyCluster: Cluster is busy (409): ${patchedCluster.detail || "No additional details."}`);
      throw new Error("Cluster is busy. Try again later.");
    } else {
      console.error(`modifyCluster: Failed to update cluster: ${patchResponse.statusCode}`);
      console.error(`modifyCluster: Request body was:`, JSON.stringify(body, null, 2));
      console.error(`modifyCluster: Response body:`, JSON.stringify(patchedCluster, null, 2));
      throw new Error(`modifyCluster: Update failed with status ${patchResponse.statusCode}`);
    }

  } catch (error) {
    console.error("modifyCluster: Error during request:", error);
    throw error;
  }
};
