# Setting Up MongoDB Atlas Charts

This guide walks you through creating dashboards in MongoDB Atlas Charts to visualize your cluster data from the Atlas Cluster Automation application.

## Overview

MongoDB Atlas Charts is a data visualization tool built into MongoDB Atlas that allows you to create, share, and embed visualizations from your MongoDB data. While our application provides basic charts in the web UI, creating Atlas Charts dashboards offers additional benefits:

- More powerful visualization capabilities
- Real-time data updates
- Embeddable charts for other applications
- Fine-grained access controls for dashboard sharing
- Advanced filtering and aggregation

## Prerequisites

1. Access to a MongoDB Atlas account with Charts enabled
2. Your cluster data populated in the MongoDB database
3. Appropriate permissions to create charts in your Atlas project

## Step-by-Step Guide

### 1. Access Atlas Charts

1. Log in to your [MongoDB Atlas account](https://cloud.mongodb.com)
2. Navigate to your Project
3. Click on the "Charts" tab in the top navigation bar

### 2. Create a New Dashboard

1. Click the "Create Dashboard" button
2. Name your dashboard (e.g., "Atlas Cluster Automation Dashboard")
3. Add an optional description
4. Click "Create"

### 3. Add a Chart for Cluster Status Distribution

1. Click "Add Chart" in your new dashboard
2. In the data source panel, select your database and the `cluster_automation` collection
3. Choose a chart type: "Pie" is recommended for this data
4. Configure your chart:
   - Add a "Category" field: Use an aggregation to count clusters by status (paused vs. active)
   - Set the "Aggregate" value to "Count"
   - For Chart Title, enter "Cluster Status Distribution"
   - Customize colors if desired
5. Click "Save and Close"

### 4. Add a Chart for Instance Size Distribution

1. Click "Add Chart" in your dashboard
2. Select the same data source
3. Choose "Bar" chart type
4. Configure your chart:
   - X-Axis: `clusters.instanceSize`
   - Y-Axis: Set to "Count" aggregation
   - For Chart Title, enter "Clusters by Instance Size"
5. Click "Save and Close"

### 5. Add a Chart for Projects Distribution

1. Add another chart to your dashboard
2. Select the same data source
3. Choose "Donut" chart type
4. Configure your chart:
   - Categories: `projectName`
   - Value: Set to "Count" aggregation
   - For Chart Title, enter "Clusters by Project"
5. Click "Save and Close"

### 6. Add a Timeline Chart for Pause/Resume Activity

1. Add another chart to your dashboard
2. Select the `activity_logs` collection as your data source
3. Choose "Line" chart type
4. Configure your chart:
   - X-Axis: `timestamp` (with appropriate binning, e.g., by day)
   - Y-Axis: Set to "Count" aggregation
   - Series: `action` (to separate pause and resume actions)
   - For Chart Title, enter "Cluster Activity Timeline"
5. Click "Save and Close"

### 7. Add a Cost Savings Estimation Chart

1. Add another chart to your dashboard
2. For this chart, you'll need to create a custom aggregation pipeline
3. Click on "Aggregation" in the data panel
4. Create an aggregation similar to this:
   ```javascript
   [
     {
       $unwind: "$clusters"
     },
     {
       $project: {
         instanceSize: "$clusters.instanceSize",
         isPaused: "$clusters.paused",
         hourlyCost: {
           $switch: {
             branches: [
               { case: { $eq: ["$clusters.instanceSize", "M10"] }, then: 0.09 },
               { case: { $eq: ["$clusters.instanceSize", "M20"] }, then: 0.19 },
               { case: { $eq: ["$clusters.instanceSize", "M30"] }, then: 0.38 },
               // Add other instance sizes as needed
             ],
             default: 0.30
           }
         }
       }
     },
     {
       $group: {
         _id: "$isPaused",
         totalHourlyCost: { $sum: "$hourlyCost" },
         count: { $sum: 1 }
       }
     }
   ]
   ```
5. Choose "Bar" chart type
6. Configure to show the cost comparison
7. For Chart Title, enter "Estimated Cost Savings"
8. Click "Save and Close"

### 8. Arrange Your Dashboard

1. Drag and resize charts to create a visually appealing layout
2. You can add text boxes with markdown for additional context or instructions
3. Consider grouping related charts together

### 9. Set Dashboard Refresh Rate

1. Click the "Settings" button on your dashboard
2. Set an appropriate refresh interval (e.g., 1 hour)
3. Click "Save"

### 10. Share Your Dashboard

1. Click the "Share" button on your dashboard
2. Choose the appropriate sharing option:
   - Share with specific users
   - Share with everyone in your organization
   - Make the dashboard public (with a link)
3. Set appropriate permissions (View, Edit, or Manage)
4. Click "Invite"

## Embedding Charts in the Application

You can embed individual charts or the entire dashboard in your application:

1. For individual charts:
   - Click the three dots menu on a chart
   - Select "Embed Chart"
   - Copy the embed code
   - Paste into your application HTML

2. For the entire dashboard:
   - Click "Share" on the dashboard
   - Select the "Embed" tab
   - Copy the embed code
   - Paste into your application HTML

## Example Embedding Code

```html
<div class="row mb-4">
    <div class="col-md-12">
        <div class="card leafygreen-card-light">
            <div class="card-header leafygreen-card-header">
                <h5 class="card-title">Atlas Charts Dashboard</h5>
            </div>
            <div class="card-body">
                <iframe src="https://charts.mongodb.com/charts-your-embed-url" 
                        width="100%" 
                        height="600" 
                        frameborder="0">
                </iframe>
            </div>
        </div>
    </div>
</div>
```

## Advanced Chart Ideas

Once you've set up basic charts, consider these advanced visualizations:

1. **Heatmap of Pause Times**: Visualize when clusters are commonly paused across days of the week
2. **Cost Trend Analysis**: Track cost savings over time as more clusters are configured with pause schedules
3. **Geographic Distribution**: If you store region information, map your clusters by geographic location
4. **Cluster Age Analysis**: Visualize the distribution of cluster ages and correlate with usage patterns
5. **Owner Responsibility Chart**: Show how many clusters each owner is responsible for managing

## Best Practices

1. **Use Consistent Colors**: Maintain the same color scheme for status across all charts
2. **Add Filters**: Enable dashboard filters to allow users to focus on specific projects or timeframes
3. **Include Context**: Add text explanations to help users understand the data
4. **Regular Updates**: Set an appropriate refresh rate to keep data current
5. **Responsive Design**: Test your dashboard on various screen sizes for optimal viewing

By following this guide, you'll create a comprehensive MongoDB Atlas Charts dashboard that provides valuable insights into your cluster management, helping optimize resources and track cost savings.
