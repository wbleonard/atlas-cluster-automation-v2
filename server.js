const express = require('express');
const mongoose = require('mongoose');
const Project = require('./models/Project'); // Assuming Project.js is in a 'models' folder
const path = require('path');
const cors = require('cors');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Application configuration
const appConfig = {
    organizationName: process.env.ATLAS_ORG_NAME || 'MongoDB Atlas'
};

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // To parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from public directory

// Request validation middleware for cluster updates
const validateClusterUpdateRequest = (req, res, next) => {
    const updateData = req.body;
    
    // Check if there are any fields to update
    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No update data provided.' });
    }
    
    // Validate data types for specific fields
    if ('pauseHour' in updateData && (updateData.pauseHour < 0 || updateData.pauseHour > 23 || !Number.isInteger(updateData.pauseHour))) {
        return res.status(400).json({ message: 'pauseHour must be an integer between 0 and 23.' });
    }
    
    if ('pauseDaysOfWeek' in updateData) {
        if (!Array.isArray(updateData.pauseDaysOfWeek)) {
            return res.status(400).json({ message: 'pauseDaysOfWeek must be an array of integers between 0 and 6.' });
        }
        
        for (const day of updateData.pauseDaysOfWeek) {
            if (day < 0 || day > 6 || !Number.isInteger(day)) {
                return res.status(400).json({ message: 'pauseDaysOfWeek must contain integers between 0 and 6.' });
            }
        }
    }
    
    // All validations passed, proceed to the route handler
    next();
};

// MongoDB Connection
const uri = process.env.MONGODB_URI;
console.log('Connecting to MongoDB at:', uri, 'with database: clusterOps');
mongoose.connect(uri, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true,
  dbName: 'clusterOps' // Explicitly specify the database name
})
 .then(() => {
   console.log('MongoDB connection established successfully');
   // Verify we can access the collection
   return mongoose.connection.db.collection('cluster_automation').countDocuments();
 })
 .then(count => {
   console.log(`Found ${count} documents in cluster_automation collection`);
 })
 .catch(err => console.error('MongoDB connection error:', err));

// --- Core API Endpoint for Updating Cluster Details ---
app.put('/api/projects/:projectId/clusters/:clusterName', validateClusterUpdateRequest, async (req, res) => {
    const { projectId, clusterName } = req.params;
    const updateData = req.body; // e.g., { description, status, mongoOwner,... }

    // Construct the $set operations dynamically for only provided fields
    const setOperations = {};
    for (const key in updateData) {
        if (Object.prototype.hasOwnProperty.call(updateData, key)) {
            // Ensure only allowed fields are being set
            const allowedFields = ['description', 'status', 'mongoOwner', 'customerContact', 'pauseHour', 'pauseDaysOfWeek', 'timezone'];
            if (allowedFields.includes(key)) {
                setOperations[`clusters.$[elem].${key}`] = updateData[key];
            }
        }
    }

    if (Object.keys(setOperations).length === 0) {
        return res.status(400).json({ message: 'No valid fields provided for update.' });
    }

    try {
        console.log('Looking for project:', projectId, 'and cluster:', clusterName);
        
        // First verify if the project exists
        const project = await Project.findOne({ projectId: projectId });
        console.log('Project exists check:', project ? 'Found' : 'Not found');
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }
        
        // Check if the cluster exists within this project
        const clusterExists = project.clusters.some(cluster => cluster.name === clusterName);
        console.log('Cluster exists check:', clusterExists ? 'Found' : 'Not found');
        
        if (!clusterExists) {
            return res.status(404).json({ message: `Cluster with name '${clusterName}' not found in project '${projectId}'.` });
        }
        
        // If we get here, both project and cluster exist, proceed with update
        const result = await Project.updateOne(
            { projectId: projectId }, // Find the parent project document by its projectId
            { $set: setOperations },    // Apply the updates to the matched array element
            {
                arrayFilters: [{ "elem.name": clusterName }], // Target the cluster by its 'name'
                runValidators: true // Enforce schema validations on update
            }
        );
        
        if (result.modifiedCount === 0) {
            // This means the cluster was found but no changes were made (data might be the same)
            return res.status(200).json({ message: 'No changes were made. The provided data might be identical to the existing data.' });
        }

        res.status(200).json({ message: 'Cluster updated successfully.', modifiedCount: result.modifiedCount });

    } catch (error) {
        console.error('Error updating cluster:', error);
        res.status(500).json({ message: 'Error updating cluster.', error: error.message });
    }
});

// Placeholder for other routes (GET projects, GET project by ID)
// app.get('/api/projects', async (req, res) => { /*... */ });
// app.get('/api/projects/:projectId', async (req, res) => { /*... */ });

// Add a simple route to get all projects
app.get('/api/projects', async (req, res) => {
    try {
        const projects = await Project.find();
        console.log(`Found ${projects.length} projects`);
        res.status(200).json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ message: 'Error fetching projects', error: error.message });
    }
});

// New endpoint to get all clusters for a specific project
app.get('/api/projects/:projectId/clusters', async (req, res) => {
    const { projectId } = req.params;
    
    try {
        const project = await Project.findOne({ projectId: projectId });
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }
        
        res.status(200).json(project.clusters);
    } catch (error) {
        console.error('Error fetching clusters:', error);
        res.status(500).json({ message: 'Error fetching clusters.', error: error.message });
    }
});

// New endpoint to get a specific cluster in a project
app.get('/api/projects/:projectId/clusters/:clusterName', async (req, res) => {
    const { projectId, clusterName } = req.params;
    
    try {
        const project = await Project.findOne({ projectId: projectId });
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }
        
        const cluster = project.clusters.find(c => c.name === clusterName);
        
        if (!cluster) {
            return res.status(404).json({ message: `Cluster with name '${clusterName}' not found in project '${projectId}'.` });
        }
        
        res.status(200).json(cluster);
    } catch (error) {
        console.error('Error fetching cluster:', error);
        res.status(500).json({ message: 'Error fetching cluster.', error: error.message });
    }
});

// New endpoint to create a cluster in a project
app.post('/api/projects/:projectId/clusters', async (req, res) => {
    const { projectId } = req.params;
    const clusterData = req.body;
    
    // Validate that a name is provided for the cluster
    if (!clusterData.name) {
        return res.status(400).json({ message: 'Cluster name is required.' });
    }
    
    try {
        // Check if the project exists
        const project = await Project.findOne({ projectId: projectId });
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }
        
        // Check if a cluster with the same name already exists
        const clusterExists = project.clusters.some(c => c.name === clusterData.name);
        
        if (clusterExists) {
            return res.status(409).json({ message: `Cluster with name '${clusterData.name}' already exists in project '${projectId}'.` });
        }
        
        // Add the new cluster to the project
        const result = await Project.updateOne(
            { projectId: projectId },
            { $push: { clusters: clusterData } },
            { runValidators: true }
        );
        
        if (result.modifiedCount === 0) {
            return res.status(500).json({ message: 'Failed to add cluster to project.' });
        }
        
        res.status(201).json({ 
            message: 'Cluster added successfully.', 
            cluster: clusterData 
        });
    } catch (error) {
        console.error('Error creating cluster:', error);
        res.status(500).json({ message: 'Error creating cluster.', error: error.message });
    }
});

// New endpoint to remove a cluster from a project
app.delete('/api/projects/:projectId/clusters/:clusterName', async (req, res) => {
    const { projectId, clusterName } = req.params;
    
    try {
        // Check if the project exists
        const project = await Project.findOne({ projectId: projectId });
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }
        
        // Check if the cluster exists
        const clusterExists = project.clusters.some(c => c.name === clusterName);
        
        if (!clusterExists) {
            return res.status(404).json({ message: `Cluster with name '${clusterName}' not found in project '${projectId}'.` });
        }
        
        // Remove the cluster from the project
        const result = await Project.updateOne(
            { projectId: projectId },
            { $pull: { clusters: { name: clusterName } } }
        );
        
        if (result.modifiedCount === 0) {
            return res.status(500).json({ message: 'Failed to remove cluster from project.' });
        }
        
        res.status(200).json({ message: 'Cluster removed successfully.' });
    } catch (error) {
        console.error('Error removing cluster:', error);
        res.status(500).json({ message: 'Error removing cluster.', error: error.message });
    }
});

// New endpoint to create a new project
app.post('/api/projects', async (req, res) => {
    const projectData = req.body;
    
    // Validate that projectId and projectName are provided
    if (!projectData.projectId || !projectData.projectName) {
        return res.status(400).json({ message: 'Project ID and Project Name are required.' });
    }
    
    try {
        // Check if a project with the same projectId already exists
        const projectExists = await Project.findOne({ projectId: projectData.projectId });
        
        if (projectExists) {
            return res.status(409).json({ message: `Project with ID '${projectData.projectId}' already exists.` });
        }
        
        // Initialize clusters array if not provided
        if (!projectData.clusters) {
            projectData.clusters = [];
        }
        
        // Create the new project
        const project = new Project(projectData);
        const savedProject = await project.save();
        
        res.status(201).json({ 
            message: 'Project created successfully.', 
            project: savedProject 
        });
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ message: 'Error creating project.', error: error.message });
    }
});

// New endpoint to retrieve a specific project by ID
app.get('/api/projects/:projectId', async (req, res) => {
    const { projectId } = req.params;
    
    try {
        const project = await Project.findOne({ projectId: projectId });
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }
        
        res.status(200).json(project);
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ message: 'Error fetching project.', error: error.message });
    }
});

// New endpoint to remove a project
app.delete('/api/projects/:projectId', async (req, res) => {
    const { projectId } = req.params;
    
    try {
        const result = await Project.deleteOne({ projectId: projectId });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Project not found.' });
        }
        
        res.status(200).json({ message: 'Project deleted successfully.' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ message: 'Error deleting project.', error: error.message });
    }
});

// New endpoint to get a summary of all clusters across all projects
app.get('/api/clusters/summary', async (req, res) => {
    try {
        const projects = await Project.find();
        
        // Collect all clusters from all projects with project info
        const clusterSummary = [];
        projects.forEach(project => {
            if (project.clusters && project.clusters.length > 0) {
                project.clusters.forEach(cluster => {
                    clusterSummary.push({
                        projectId: project.projectId,
                        projectName: project.projectName,
                        clusterName: cluster.name,
                        status: cluster.paused ? 'Paused' : 'Active',
                        instanceSize: cluster.instanceSize || 'N/A',
                        mongoDBVersion: cluster.mongoDBVersion || 'N/A',
                        mongoOwner: cluster.mongoOwner || null,
                        hasPauseSchedule: Boolean(cluster.pauseHour !== undefined && cluster.pauseDaysOfWeek && cluster.timezone),
                        pauseHour: cluster.pauseHour,
                        pauseDaysOfWeek: cluster.pauseDaysOfWeek,
                        timezone: cluster.timezone,
                        ageInDays: cluster.ageInDays,
                        createDate: cluster.createDate,
                        autoscaling: cluster.autoscaling || false
                    });
                });
            }
        });
        
        res.status(200).json(clusterSummary);
    } catch (error) {
        console.error('Error fetching cluster summary:', error);
        res.status(500).json({ message: 'Error fetching cluster summary.', error: error.message });
    }
});

// New endpoint to remove a pause schedule from a cluster
app.delete('/api/projects/:projectId/clusters/:clusterName/schedule', async (req, res) => {
    const { projectId, clusterName } = req.params;
    
    try {
        // Check if the project exists
        const project = await Project.findOne({ projectId: projectId });
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }
        
        // Check if the cluster exists
        const clusterIndex = project.clusters.findIndex(c => c.name === clusterName);
        
        if (clusterIndex === -1) {
            return res.status(404).json({ message: `Cluster with name '${clusterName}' not found in project '${projectId}'.` });
        }
        
        // Remove schedule-related fields from the cluster
        const result = await Project.updateOne(
            { projectId: projectId, "clusters.name": clusterName },
            { 
                $unset: { 
                    "clusters.$.pauseHour": "",
                    "clusters.$.pauseDaysOfWeek": "",
                    "clusters.$.resumeHour": "",
                    "clusters.$.resumeDaysOfWeek": ""
                } 
            }
        );
        
        if (result.modifiedCount === 0) {
            return res.status(200).json({ message: 'No schedule was found to remove.' });
        }
        
        res.status(200).json({ message: 'Schedule removed successfully.' });
    } catch (error) {
        console.error('Error removing schedule:', error);
        res.status(500).json({ message: 'Error removing schedule.', error: error.message });
    }
});

// API Endpoint to get cluster status summary (active vs paused)
app.get('/api/clusters/status-summary', async (req, res) => {
  try {
    const projects = await Project.find({});
    
    let activeCount = 0;
    let pausedCount = 0;
    
    // Count active and paused clusters across all projects
    projects.forEach(project => {
      project.clusters.forEach(cluster => {
        if (cluster.paused) {
          pausedCount++;
        } else {
          activeCount++;
        }
      });
    });
    
    res.json({
      activeCount,
      pausedCount,
      total: activeCount + pausedCount
    });
  } catch (error) {
    console.error('Error fetching cluster status summary:', error);
    res.status(500).json({ error: 'Failed to fetch cluster status summary' });
  }
});

// API Endpoint to get application configuration including organization name
app.get('/api/config', async (req, res) => {
  try {
    res.json(appConfig);
  } catch (error) {
    console.error('Error fetching application configuration:', error);
    res.status(500).json({ error: 'Failed to fetch application configuration' });
  }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});