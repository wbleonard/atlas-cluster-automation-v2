exports = async function() {
  const collection = await context.functions.execute("collections/getClusterOpsCollection");
  const projects = await collection.find({}).toArray();

  const publicKey = await context.values.get("AtlasPublicKey");
  const privateKey = await context.values.get("AtlasPrivateKey");

  const now = new Date();
  const currentHour = now.getUTCHours().toString().padStart(2, "0");
  const currentMinute = "00"; // Runs at the top of the hour
  const nowHHMM = `${currentHour}:${currentMinute}`;

  for (const project of projects) {
    const projectId = project.projectId;

    for (const cluster of project.clusters || []) {
      const clusterName = cluster.name;
      const isPaused = cluster.paused === true;

      let action = null;

      if (cluster.pauseTime === nowHHMM && !isPaused) {
        action = "pause";
      } else if (cluster.unpauseTime === nowHHMM && isPaused) {
        action = "unpause";
      }

      if (!action) continue;

      const path = `api/atlas/v1.0/groups/${projectId}/clusters/${clusterName}/${action}`;
      const response = await context.http.patch({
        scheme: 'https',
        host: 'cloud.mongodb.com',
        path,
        username: publicKey,
        password: privateKey,
        digestAuth: true,
        headers: { 'Content-Type': ['application/json'] }
      });

      // Optional: update local pause status for next time
      await collection.updateOne(
        { projectId, "clusters.name": clusterName },
        { $set: { "clusters.$.pause": action === "pause" } }
      );

      console.log(`⏱️ ${action.toUpperCase()} ${clusterName} in project ${project.projectName}`);
    }
  }

  return { status: "ok", time: nowHHMM };
};