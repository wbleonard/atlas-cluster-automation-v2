# MongoDB Atlas Cluster Automation V2

A web-based dashboard for managing MongoDB Atlas clusters that allows users to view, filter, and configure automated pause schedules across multiple projects to optimize resource usage and reduce costs.

![](images/clusters-summary.png)

## Overview

This application provides a user-friendly interface for managing pause schedules of MongoDB Atlas clusters across multiple projects. It helps optimize resource usage and reduce costs by automating the pausing of clusters when they're not needed.

## Architecture

The application consists of three main components:

1. **Web UI**: A responsive frontend built with HTML, CSS (Bootstrap), and vanilla JavaScript
2. **REST API**: A Node.js/Express backend that manages data in MongoDB
3. **Atlas App Services**: Serverless functions and triggers that execute the actual cluster pausing logic

### Component Details

#### Web UI
- Built with Bootstrap 5 for responsive design
- Interactive dashboard with filtering and sorting capabilities
- Project and cluster management interfaces
- Pause schedule configuration modal

#### REST API (Express.js)
- CRUD operations for projects and clusters
- Business logic for pause schedule management
- Validation and error handling

#### Atlas App Services
- Serverless functions for interacting with Atlas Admin API
- Database triggers for audit logging
- Scheduled triggers for automatic cluster pausing based on configured schedules

## Data Model

The application uses MongoDB with the following collections:

### cluster_automation
Stores project and cluster information with scheduling metadata
```javascript
{
  _id: ObjectId,
  projectId: String,
  projectName: String,
  clusters: [
    {
      name: String,
      description: String,
      instanceSize: String,
      mongoDBVersion: String,
      paused: Boolean,
      mongoOwner: String,
      customerContact: String,
      createDate: String,
      ageInDays: Number,
      pauseDaysOfWeek: [Number],  // 0-6 for Sunday-Saturday
      pauseHour: Number,          // 0-23 hour of the day
      timezone: String,
      status: String
    }
  ],
  updatedAt: Date
}
```

### activity_logs
Tracks all operations performed on clusters
```javascript
{
  _id: ObjectId,
  projectId: String,
  clusterName: String,
  action: String,      // "pause", "resume", "configure"
  performedBy: String, // User or "system" for automated actions
  timestamp: Date,
  details: Object      // Additional context about the action
}
```

## Key Features

- **Multi-Project Dashboard**: View and manage clusters across multiple Atlas projects
- **Filtering & Search**: Filter clusters by project, status, instance size, and more
- **Pause Scheduling**: Configure automatic pause schedules based on day of week and time
- **Timezone Support**: Configure schedules in various timezones
- **Export Options**: Export cluster data as CSV or JSON
- **Responsive Design**: Works on desktop and mobile devices
- **Data Visualization**: Interactive charts showing cluster distribution and cost savings
- **MongoDB Leafygreen UI**: Modern UI design following MongoDB's design principles
- **Cost Analytics**: Estimated cost savings from automated cluster pausing
- **GitHub Integration**: Source code available in a public GitHub repository

![Cluster Status Distribution](images/clusters-pie-chart.svg)

## Atlas App Services Functions & Triggers

The application leverages MongoDB Atlas App Services for automation:

1. **Scheduled Trigger - Cluster Pause Check**
   - Runs every hour
   - Checks for clusters due to be paused based on schedule
   - Calls Atlas Admin API to pause matching clusters
   - Logs actions to activity_logs collection

2. **Database Trigger - Audit Logging**
   - Fires on updates to cluster_automation collection
   - Records all changes to configurations in activity_logs

3. **Function - Atlas API Integration**
   - Interacts with Atlas Admin API to pause/resume clusters
   - Handles authentication and error handling

4. **Scheduled Trigger - Cluster Inventory Sync**
   - Runs daily to keep the cluster inventory in sync with Atlas
   - Adds new clusters, updates existing ones, and marks deleted clusters
   - Enriches cluster data with additional metadata

## Enhanced Features & Implementation

This project is an upgraded version of the solution described in [MongoDB's developer tutorial](https://www.mongodb.com/developer/products/atlas/atlas-cluster-automation-using-scheduled-triggers/), with the following enhancements:

### Data-Driven Automation
- Cluster pause/resume schedules are stored in MongoDB collections rather than hardcoded in trigger functions
- Each cluster can have its own custom schedule with preferred pause and optional resume times
- Supports complex scheduling with timezone awareness

### Comprehensive Logging
- All cluster state changes (pause, resume, create, delete, scale) are logged
- Detailed audit trail for compliance and troubleshooting
- Activity logs can be analyzed for usage patterns and optimization opportunities

### Automated Inventory Management
- Automatic synchronization between Atlas clusters and the application's database
- Detects new clusters, updates existing ones, and identifies deleted clusters
- No manual inventory management required

### Enhanced Metadata
- Extends Atlas cluster information with custom fields:
  - Owner contact information
  - Department/team allocation
  - Cluster age and creation date
  - Custom descriptions and notes
  - Usage status (production, development, testing)

### Visualization and Analytics
- Built-in charts and visualizations:
  - Status distribution (active vs. paused clusters)
  - Schedule configuration analysis
  - Instance size distribution
  - Project distribution
  - Cost savings estimation
- MongoDB Leafygreen design principles for consistent UI
- Responsive design for both desktop and mobile
- Real-time data refresh capabilities

### Atlas Charts Integration
- Visualize cluster inventory with custom dashboards
- Track resource utilization and cost savings
- Monitor pause/resume patterns and optimize scheduling

### Implementation Guide

#### Key App Services Components

**Functions:**

*Trigger Functions:*
- `trigger/processScheduledClusterOperations`: Processes clusters according to their configured pause schedules (runs hourly)
- `trigger/syncProjectClusters`: Syncs cluster inventory with Atlas (runs every 15 minutes)
- `trigger/logClusterAutomationChange`: Records changes to cluster configurations in activity logs
- `trigger/pauseClusters`: Pauses all clusters in specified projects (optional)
- `trigger/resumeClusters`: Resumes all clusters in specified projects (optional)
- `trigger/scaleClusterUp`: Used for scaling up clusters (optional)

*Helper Functions:*
- `setClusterPauseState`: Pauses or resumes a specific cluster
- `modifyCluster`: Modifies cluster attributes through Atlas API

*Utility Functions:*
- `utility/getClusterOpsCollection`: Gets a handle to the cluster_automation collection
- `utility/getActivityLogsCollection`: Gets a handle to the activity_logs collection
- `utility/getProjectCluster`: Retrieves a specific cluster from a project
- `utility/getProjectClusters`: Retrieves all clusters for a project
- `utility/getProjects`: Retrieves all projects from Atlas
- `utility/reconcileClustersArray`: Reconciles local and Atlas cluster data

*UI Functions:*
- `ui/getClusterList`: Retrieves cluster data for the UI
- `ui/updateClusterMetadata`: Updates cluster metadata from the UI

**Triggers:**
- `enforcePauseScheduleTrigger`: Scheduled trigger that runs hourly (every hour) to process clusters according to their pause schedules by calling the `trigger/processScheduledClusterOperations` function
- `syncProjectClustersTrigger`: Scheduled trigger that runs every 15 minutes to sync cluster inventory by calling the `trigger/syncProjectClusters` function
- `logClusterAutomationChangeTrigger`: Database trigger that fires when cluster configurations change by calling the `trigger/logClusterAutomationChange` function
- `pauseClustersTrigger`: Optional scheduled trigger (8:00 AM) that can be enabled to pause all clusters
- `resumeClusters`: Optional scheduled trigger (12:00 PM Mon-Fri) that can be enabled to resume all clusters
- `scaleClusterUp`: Optional trigger for scaling up clusters

## Getting Started

### Prerequisites
- Node.js 16+
- MongoDB Atlas account
- Atlas cluster for storing application data.

### Installation

1. Clone the repository
```bash
git clone https://github.com/wbleonard/atlas-cluster-automation-v2.git
cd atlas-cluster-automation-v2
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
Create a `.env` file with the following:
```
MONGODB_URI=mongodb+srv://username:password@your-cluster.mongodb.net/?retryWrites=true&w=majority
PORT=3000
```

4. Start the application
```bash
npm start
```

## Deployment

### Backend API
1. Deploy to your preferred hosting platform (Heroku, AWS, etc.)
2. Set environment variables for MongoDB connection

### Atlas App Services
1. Navigate to your Atlas project and create a new App Services application. You can get there from the "Triggers" menu and then selecting "View All Apps". 
2. The extract has a dependency on the API Secret Key, thus the import will fail if it is not configured beforehand.

   Use the Values menu on the left to Create a Secret named `AtlasPrivateKeySecret` containing your private key (the secret is not in quotes):

   ![](images/create_secret.webp)

3. Install the The App Services CLI

   ```bash
   ✗  npm install -g atlas-app-services-cli
   ```

4. Log into Atlas App Services

   ```bash
   ✗ appservices login --api-key="<Public API Key>" --private-api-key="<Private API Key>"

   Successfully logged in
   ```
 
5. Copy the App Services Application ID
   
   ![](images/copy-app-id.png)

6. From the `app-service/AutomationApp` sub-directory, run

   ```bash
   appservices push --remote="<Your App ID>"

   ...
   A summary of changes
   ...
   ? Please confirm the changes shown above Yes
   Creating draft
   Pushing changes
   Deploying draft
   Deployment complete
   Successfully pushed app up: <Your App ID>

   ```

6. After the import, replace the AtlasPublicKey with your API public key value.

   ![](images/atlas_public_key.webp)

7. Confirm the Value of your ServiceName by checking the Linked Data Sources. 


### Setting Up Atlas Charts
1. In your Atlas project, navigate to the Charts tab
2. Create a new dashboard
3. Add charts for:
   - Cluster inventory by status (active/paused)
   - Cluster inventory by instance size
   - Cluster activity over time
   - Cost savings from automated pausing
4. Share the dashboard with your team

For detailed instructions on setting up Atlas Charts dashboards, refer to the [Atlas Charts Setup Guide](docs/atlas-charts-setup.md).

The application includes two types of chart visualizations:

1. **Built-in Charts** (charts.html): Interactive charts powered by Chart.js that display:
   - Cluster status distribution (active vs. paused)
   - Schedule configuration distribution
   - Instance size distribution
   - Project distribution
   - Estimated cost savings

2. **Atlas Charts Integration** (atlas-charts.html): A placeholder page where you can embed more advanced visualizations from MongoDB Atlas Charts for deeper insights.
4. Share the dashboard with your team

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.