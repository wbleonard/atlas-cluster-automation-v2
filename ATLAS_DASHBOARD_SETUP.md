# Atlas Cluster Automation Dashboard Setup Guide

## Overview

This guide will help you create a comprehensive MongoDB Atlas Charts dashboard to visualize your cluster automation data. The dashboard will show cluster status, automation trends, and cost optimization insights.

## Data Sources

Your automation system populates these collections:

### 1. `cluster_status` Collection
Contains individual cluster documents with:
```javascript
{
  projectId: "...",
  projectName: "...", 
  clusterName: "...",
  stateName: "IDLE|CREATING|UPDATING|DELETING|DELETED|REPAIRING",
  paused: true/false,
  automationEnabled: true/false,
  schedule: "days:1.2.3.4.5:hour:22:timezone:America-New_York",
  instanceSize: "M10|M20|M30|...",
  mongoOwner: "...",
  description: "...",
  tags: [...],
  lastRefreshed: ISODate(...)
}
```

### 2. Dashboard Summary Document
Special document with `_id: "dashboard_summary"`:
```javascript
{
  _id: "dashboard_summary",
  totalProjects: 5,
  totalClusters: 23,
  pausedClusters: 8,
  activeClusters: 15,
  automationEnabledClusters: 20,
  lastRefreshed: ISODate(...)
}
```

### 3. `activity_logs` Collection
Activity tracking with:
```javascript
{
  timestamp: ISODate(...),
  action: "CLUSTER_PAUSE|CLUSTER_RESUME|UI_METADATA_UPDATE|...",
  projectId: "...",
  clusterName: "...",
  status: "SUCCESS|FAILED|ERROR",
  triggerSource: "SCHEDULED_TRIGGER|MANUAL_TRIGGER|..."
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

Create metric cards using the dashboard summary document:

#### Total Clusters Card
- **Chart Type:** Number
- **Data Source:** `cluster_status` collection  
- **Filter:** `_id: "dashboard_summary"`
- **Value:** `totalClusters`
- **Title:** "Total Clusters"

#### Active Clusters Card
- **Chart Type:** Number
- **Data Source:** `cluster_status` collection
- **Filter:** `_id: "dashboard_summary"`
- **Value:** `activeClusters` 
- **Title:** "Active Clusters"
- **Color:** Green

#### Paused Clusters Card
- **Chart Type:** Number
- **Data Source:** `cluster_status` collection
- **Filter:** `_id: "dashboard_summary"`
- **Value:** `pausedClusters`
- **Title:** "Paused Clusters"
- **Color:** Orange

#### Automation Enabled Card
- **Chart Type:** Number
- **Data Source:** `cluster_status` collection
- **Filter:** `_id: "dashboard_summary"`
- **Value:** `automationEnabledClusters`
- **Title:** "Automated Clusters"
- **Color:** Blue

### Step 3: Status Distribution Charts

#### Cluster Status Pie Chart
- **Chart Type:** Pie Chart
- **Data Source:** `cluster_status` collection
- **Filter:** Exclude dashboard summary: `_id: {$ne: "dashboard_summary"}`
- **Category:** `paused` 
- **Value:** Count of documents
- **Title:** "Cluster Status Distribution"
- **Labels:** Map `true → "Paused"`, `false → "Active"`

#### Instance Size Distribution
- **Chart Type:** Bar Chart
- **Data Source:** `cluster_status` collection  
- **Filter:** Exclude summary document
- **X-Axis:** `instanceSize`
- **Y-Axis:** Count of documents
- **Title:** "Clusters by Instance Size"
- **Sort:** Descending by count

#### Projects Overview
- **Chart Type:** Bar Chart
- **Data Source:** `cluster_status` collection
- **Filter:** Exclude summary document
- **X-Axis:** `projectName`
- **Y-Axis:** Count of documents  
- **Title:** "Clusters per Project"
- **Sort:** Descending by count

### Step 4: Automation Analytics

#### Automation Adoption
- **Chart Type:** Pie Chart
- **Data Source:** `cluster_status` collection
- **Filter:** Exclude summary document
- **Category:** `automationEnabled`
- **Value:** Count
- **Title:** "Automation Adoption"
- **Labels:** Map `true → "Automated"`, `false → "Manual"`

#### Scheduled vs Manual Clusters
- **Chart Type:** Stacked Bar Chart
- **Data Source:** `cluster_status` collection
- **Filter:** Exclude summary document
- **X-Axis:** `projectName`
- **Y-Axis:** Count
- **Series:** `automationEnabled`
- **Title:** "Automation Status by Project"

### Step 5: Activity Timeline

#### Recent Activity
- **Chart Type:** Line Chart
- **Data Source:** `activity_logs` collection
- **X-Axis:** `timestamp` (grouped by day)
- **Y-Axis:** Count of documents
- **Series:** `action`
- **Title:** "Daily Automation Activity"
- **Time Range:** Last 30 days

#### Success Rate
- **Chart Type:** Donut Chart  
- **Data Source:** `activity_logs` collection
- **Category:** `status`
- **Value:** Count
- **Title:** "Operation Success Rate"
- **Colors:** Green for SUCCESS, Red for FAILED/ERROR

### Step 6: Cost Optimization Insights

#### Pause Schedule Analysis
- **Chart Type:** Heatmap
- **Data Source:** `cluster_status` collection
- **Filter:** `schedule: {$exists: true, $ne: null}`
- **X-Axis:** Extract hour from schedule using aggregation
- **Y-Axis:** Extract days from schedule  
- **Value:** Count of clusters
- **Title:** "Most Common Pause Schedules"

## Advanced Aggregations

For more complex charts, use these aggregation pipelines:

### Pause Time Distribution
```javascript
[
  { $match: { _id: { $ne: "dashboard_summary" }, schedule: { $exists: true } } },
  { $addFields: {
      scheduleHour: {
        $toInt: {
          $arrayElemAt: [
            { $split: [
              { $arrayElemAt: [{ $split: ["$schedule", ":hour:"] }, 1] }, 
              ":timezone:"
            ]}, 0
          ]
        }
      }
    }
  },
  { $group: { _id: "$scheduleHour", count: { $sum: 1 } } },
  { $sort: { _id: 1 } }
]
```

### Project Cost Savings Potential
```javascript
[
  { $match: { _id: { $ne: "dashboard_summary" } } },
  { $group: {
      _id: "$projectName",
      totalClusters: { $sum: 1 },
      automatedClusters: { $sum: { $cond: ["$automationEnabled", 1, 0] } },
      pausedClusters: { $sum: { $cond: ["$paused", 1, 0] } }
    }
  },
  { $addFields: {
      automationRate: { $divide: ["$automatedClusters", "$totalClusters"] },
      pauseRate: { $divide: ["$pausedClusters", "$totalClusters"] }
    }
  }
]
```

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

┌─────────────────────┬─────────────────────────────────┐
│ Automation Adoption │ Operation Success Rate          │
│                     │                                 │
│   🥧 Pie Chart     │   🍩 Donut Chart               │
│                     │                                 │
└─────────────────────┴─────────────────────────────────┘
```

## Next Steps

1. **Create the dashboard** following the steps above
2. **Customize styling** with your organization's colors
3. **Set up alerts** for failed operations or unusual patterns
4. **Share with stakeholders** to demonstrate cost optimization
5. **Monitor trends** to identify optimization opportunities

Your cluster automation data is now ready for powerful visualization in Atlas Charts! 📊✨
