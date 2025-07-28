# Atlas Cluster Automation Dashboard Setup Guide

## Overview

This guide will help you create a comprehensive MongoDB Atlas Charts dashboard to visualize your cluster automation data. The dashboard will show cluster status, automation trends, and cost optimization insights.

## Data Sources

Your automation system populates these collections:

### 1. `cluster_status` Collection
Contains individual cluster documents with:
```javascript
{
  _id: ObjectId("..."),
  name: "cluster-name",                    // Cluster name (NOT clusterName)
  projectId: "...",
  projectName: "...", 
  instanceSize: "M10|M20|M30|...",
  mongoDBVersion: "7|8",
  paused: true/false,
  createDate: "2025-04-23T16:19:17Z",     // ISO date string
  ageInDays: 96,                          // Calculated age since creation
  autoscaling: true/false,
  status: "ACTIVE|PAUSED|...",            // Current cluster status
  
  // Ownership and organizational fields
  ownedBy: "user@company.com",
  supportedBy: "support@company.com", 
  projectStatus: "Testing|Production|...",
  
  // Automation and scheduling
  automationEnabled: true/false,
  hasSchedule: true/false,
  pauseHour: 22,                          // Hour of day to pause (0-23)
  pauseDaysOfWeek: [0,1,2,3,4,5,6],      // Array of days (0=Sunday)
  pauseDaysOfWeekDisplay: "Sun, Mon, Tue, Wed, Thu, Fri, Sat",
  timezone: "America/New_York",
  scheduleTag: "days:0.1.2.3.4.5.6:hour:22:timezone:America-New_York",
  scheduleDisplay: "Sun, Mon, Tue, Wed, Thu, Fri, Sat at 22:00 America/New_York",
  
  lastUpdated: ISODate(...),
  dataSource: "atlas-api-tags"
}
```


### 2. `dashboard_summary` Collection
Contains a single document with overall metrics:
```javascript
{
  _id: "dashboard_summary",
  totalAtlasProjects: 20,
  totalProjectsWithScheduledClusters: 9,
  totalClusters: 14,
  pausedClusters: 2,
  activeClusters: 12,
  automationEnabledClusters: 2,
  lastRefreshed: ISODate("2025-07-28T17:45:07.171Z")
}
```
*Note: These are live metrics from your actual database as of last refresh*

### 3. `activity_logs` Collection
Activity tracking with:
```javascript
{
  _id: ObjectId("..."),
  timestamp: ISODate("2025-05-28T14:45:01.724Z"),
  eventType: "METADATA_UPDATE|CLUSTER_PAUSE|CLUSTER_RESUME|...",
  actor: "SYSTEM_DB_TRIGGER|USER|SCHEDULED_TRIGGER|...",
  projectId: "...",
  clusterId: "..." || null,                    // null for project-level events
  status: "SUCCESS|FAILED|ERROR",
  errorMessage: null || "error details",
  details: {                                   // Event-specific details
    fieldName: "clusters|updatedAt|...",
    oldValue: {...},                           // Previous state
    newValue: {...},                           // New state  
    projectDocumentId: "..."                   // Related project document
  }
}
```

## Dashboard Creation Steps

### Step 1: Access Atlas Charts

1. Navigate to [MongoDB Atlas](https://cloud.mongodb.com)
2. Select your project
3. Click **Charts** in the left navigation
4. Click **Create Dashboard**
5. Name it: **"Atlas Cluster Automation Dashboard"**

### Step 2: Overview Metrics Cards


Create metric cards using the `dashboard_summary` collection:

#### Total Clusters Card
- **Data Source:** `dashboard_summary` collection
- **Chart Type:** Number
- **Value:** `totalClusters`
- **Title:** "Total Clusters"

#### Active Clusters Card
- **Data Source:** `dashboard_summary` collection
- **Chart Type:** Number
- **Value:** `activeClusters` 
- **Title:** "Active Clusters"
- **Color:** Green

#### Paused Clusters Card
- **Data Source:** `dashboard_summary` collection
- **Chart Type:** Number
- **Value:** `pausedClusters`
- **Title:** "Paused Clusters"
- **Color:** Orange

#### Automation Enabled Card
- **Data Source:** `dashboard_summary` collection
- **Chart Type:** Number
- **Value:** `automationEnabledClusters`
- **Title:** "Automated Clusters"
- **Color:** Blue

### Step 3: Status Distribution Charts



#### Cluster Status Donut Chart
- **Data Source:** `cluster_status` collection
- **Chart Type:** Donut Chart
- **Arc:** `paused` (set as the Arc field)
- **Value:** Count of documents
- **Title:** "Cluster Status Distribution"
- **Labels:** Map `true → "Paused"`, `false → "Active"`


#### Instance Size Distribution
- **Data Source:** `cluster_status` collection
- **Chart Type:** Colored Column Chart
- **X-Axis:** `instanceSize`
- **Y-Axis:** Count of documents
- **Title:** "Clusters by Instance Size"
- **Sort:** Descending by count
- **Colors:** Different color for each instance size (M10, M20, M30, etc.)


#### Projects Overview
- **Data Source:** `cluster_status` collection
- **Chart Type:** Colored Column Chart
- **X-Axis:** `projectName`
- **Y-Axis:** Count of documents  
- **Title:** "Clusters per Project"
- **Sort:** Descending by count
- **Colors:** Different color for each project

### Step 4: Automation Analytics







#### Scheduled vs Manual Clusters
- **Data Source:** `cluster_status` collection
- **Chart Type:** Stacked Column Chart
-  **X-Axis:** `projectName`
- **Y-Axis:** Count of documents
- **+Category (Series):** `automationEnabled` (label as "Automated" and "Manual")
- **Title:** "Automated vs Manual Clusters by Project"
- **Colors:** Blue for "Automated", Gray for "Manual"
- **Note:** This shows the breakdown of automated vs manual clusters for each project

### Step 6: Activity Timeline

#### Recent Activity
- **Data Source:** `activity_logs` collection
- **Chart Type:** Line Chart
- **X-Axis:** `timestamp` (grouped by day)
- **Y-Axis:** Count of documents
- **Series:** `eventType` 
- **Title:** "Daily Automation Activity"


### Step 7: Cost Optimization Insights

#### MongoDB Version Distribution 
- **Data Source:** `cluster_status` collection
- **Chart Type:** Donut Chart
- **Label:** `mongoDBVersion`
- **Arc:** `mongoDBVersion`
  - **Aggregate:** Count of documents
- **Title:** "MongoDB Version Distribution"
- **Colors:** Blue gradient



## Using Aggregation Pipelines in Atlas Charts

When creating charts that need data transformation (like grouping, calculating, or filtering), you need to create **Charts Views** that apply aggregation pipelines to your collections:

### General Steps:
1. **Go to Atlas Charts** → Navigate to Data Sources section
2. **Select your database and collection** (e.g., `clusterOps` → `cluster_status`)
3. **Click "Charts View"** next to the collection's information
4. **Name your Charts View** (e.g., "Cluster Age Distribution")
5. **Add your aggregation pipeline** in the pipeline editor (must be an array)
6. **Click "Test Pipeline"** to validate and preview results
7. **Click "Save"** to create the Charts View
8. **Create your chart** using the new Charts View as the data source

### Important Notes:
- **Charts Views** are separate data sources that pre-process your collection data
- The **field names** in your chart configuration must match the **output** of your aggregation pipeline
- Use **"Test Pipeline"** to see exactly what fields are available after transformation
- Charts Views can be reused across multiple charts
- Any user in your project can use Charts Views created by others

## Advanced Aggregations

Create Charts Views using these aggregation pipelines for more complex charts:















## Embedding Charts

To embed charts in your web application:

1. Click the **...** menu on any chart
2. Select **Embed Chart**
3. Choose embedding options:
   - **Verified signature** (recommended for production)
   - **Unauthenticated access** (for public dashboards)
4. Copy the provided iframe code
5. Add to your HTML:

```html
<iframe 
  src="https://charts.mongodb.com/charts-project-xxxxx/embed/charts?id=chart-id-xxxxx"
  width="100%" 
  height="400">
</iframe>
```

## Dashboard Refresh

Your data refreshes automatically every 15 minutes via the `syncClusterStatusTrigger`. For real-time updates, you can:

1. **Manual Refresh:** Click refresh in Atlas Charts
2. **Auto-refresh:** Set charts to auto-refresh every 5-10 minutes
3. **API Trigger:** Call the `refreshDashboardData` function via webhook

## Sharing and Permissions

1. Click **Share Dashboard** 
2. Choose sharing level:
   - **Private:** Only you can view
   - **Team:** Atlas project members can view
   - **Public:** Anyone with link can view
3. Set permissions (view/edit)
4. Generate sharing link

## Example Dashboard Layout

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Total       │ Active      │ Paused      │ Automated   │
│ Clusters    │ Clusters    │ Clusters    │ Clusters    │
│    23       │    15       │     8       │    20       │
└─────────────┴─────────────┴─────────────┴─────────────┘

┌─────────────────────┬─────────────────────────────────┐
│ Status Distribution │ Instance Size Distribution      │
│                     │                                 │
│   🥧 Pie Chart     │   📊 Bar Chart                 │
│                     │                                 │
└─────────────────────┴─────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Daily Automation Activity                               │
│                                                         │
│   📈 Line Chart (30 days)                             │
│                                                         │
└─────────────────────────────────────────────────────────┘


```

## Next Steps

1. **Create the dashboard** following the steps above
2. **Customize styling** with your organization's colors
3. **Set up alerts** for failed operations or unusual patterns
4. **Share with stakeholders** to demonstrate cost optimization
5. **Monitor trends** to identify optimization opportunities

Your cluster automation data is now ready for powerful visualization in Atlas Charts! 📊✨
