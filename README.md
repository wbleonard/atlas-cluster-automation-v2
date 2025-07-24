# MongoDB Atlas Cluster Automation V2

A **serverless automation solution** for managing MongoDB Atlas cluster pause schedules using **Atlas cluster tags** to optimize resource usage and reduce costs. No web UI required - manage schedules directly in the Atlas console!

## Overview

This solution provides automated pause scheduling for MongoDB Atlas clusters across multiple projects using Atlas cluster tags. It helps optimize resource usage and reduce costs by automating the pausing of clusters when they're not needed. **Version 2 uses Atlas cluster tags for schedule configuration, eliminating the need for a separate database collection and making schedules visible directly in the Atlas UI.**

## Architecture

This is a **serverless, infrastructure-free solution** built entirely on Atlas App Services:

1. **Atlas App Services**: Serverless functions and triggers that execute cluster automation using **Atlas cluster tags**
2. **Atlas Cluster Tags**: Primary storage for schedule configuration (no external databases required)
3. **Atlas UI**: Native interface for viewing and managing cluster schedules
4. **Optional Activity Logging**: MongoDB collection for audit trail (can be in any Atlas cluster)

### Key Innovation: Tag-Based Scheduling

**V2 uses Atlas cluster tags as the single source of truth** for schedule configuration:
- Schedule information is stored as `automation:pause-schedule` tags directly on Atlas clusters
- Tags are visible and editable in the Atlas UI for complete transparency
- No web UI, REST API, or external database required for core functionality
- Simplified architecture with minimal infrastructure
- Format: `days:1.2.3.4.5:hour:22:timezone:America-New_York` (descriptive and human-readable)

### Benefits of Serverless Approach

- ✅ **Zero Infrastructure**: No servers, databases, or web applications to maintain
- ✅ **Atlas-Native**: Fully integrated with Atlas ecosystem and UI
- ✅ **Secure by Default**: No custom authentication or web security concerns
- ✅ **Scalable**: Handles unlimited Atlas projects and clusters
- ✅ **Cost-Effective**: Only pay for App Services execution time
- ✅ **Transparent**: All configuration visible in Atlas console

## Data Model

This solution uses a **serverless, tag-first approach**:

### Atlas Cluster Tags (Primary and Only Required Storage)
Schedule configuration is stored directly on Atlas clusters using tags:
```
Key: automation:pause-schedule
Value: days:1.2.3.4.5:hour:22:timezone:America-New_York
```

**Optional Automation Control:**
```
Key: automation:enabled  
Value: false (to disable automation, omit tag or use 'true' to enable)
```

**Tag Format Components:**
- `days:1.2.3.4.5` - Days of week (0=Sunday, 6=Saturday), dot-separated
- `hour:22` - Hour to pause (0-23, 24-hour format)
- `timezone:America-New_York` - IANA timezone (/ converted to - for Atlas compatibility)
- `automation:enabled` - Optional control tag (default: enabled if schedule exists)

**Benefits:**
- ✅ Visible in Atlas UI for transparency
- ✅ No external database dependency
- ✅ Self-documenting with descriptive format
- ✅ Direct integration with Atlas infrastructure
- ✅ Version controlled with cluster configuration
- ✅ Easy enable/disable without removing schedule configuration

### Optional Activity Logging
If audit trails are needed, activity logs can be stored in any MongoDB collection:
```javascript
{
  _id: ObjectId,
  projectId: String,
  clusterName: String,
  action: String,      // "pause", "resume", "configure"
  performedBy: String, // "SYSTEM_AUTOMATION_TRIGGER"
  timestamp: Date,
  details: Object      // Additional context about the action
}
```

## How Tag-Based Scheduling Works

### 1. Schedule Configuration (Multiple Options)

**Option A: Using Atlas App Services Console**
```javascript
// Test function call in App Services console
await setClusterScheduleTag("Hello world!", "", 22, [1,2,3,4,5], "America/New_York");
```

**Option B: Using Atlas CLI**
```bash
# Add schedule tag to cluster
atlas clusters tags add <clusterName> --projectId <projectId> \
  --tag key=automation:pause-schedule,value=days:1.2.3.4.5:hour:22:timezone:America-New_York
```

**Option C: Direct in Atlas UI**
- Navigate to your cluster → Configuration → Tags
- Add tag: `automation:pause-schedule` = `days:1.2.3.4.5:hour:22:timezone:America-New_York`
- Optionally add: `automation:enabled` = `false` (to temporarily disable automation)

### 2. Tag Creation
Any of the above methods creates an Atlas cluster tag:
```
Key: automation:pause-schedule
Value: days:1.2.3.4.5:hour:22:timezone:America-New_York

# Optional: Disable automation temporarily  
Key: automation:enabled
Value: false
```

### 3. Automated Processing
- Hourly trigger scans all Atlas projects for clusters with `automation:pause-schedule` tags
- **Checks `automation:enabled` tag** - skips clusters with `automation:enabled=false`
- Parses tag values to determine when clusters should be paused
- Converts schedule to local timezone and checks if current time matches
- Pauses/resumes clusters as needed and logs actions

### 4. Management & Visibility
- **Atlas UI**: Tags visible under cluster Configuration → Tags
- **Atlas CLI**: Use `atlas clusters tags list` to view schedules and automation status
- **App Services Logs**: View automation activity in App Services console
- **Activity Logs**: Optional MongoDB collection for detailed audit trail

## Automation Control

### Temporarily Disable Automation
```javascript
// Disable automation without removing schedule
await setClusterAutomationEnabled("Hello world!", "", false);

// Re-enable automation
await setClusterAutomationEnabled("Hello world!", "", true);

// Check automation status
await getClusterAutomationStatus("Hello world!", "");
```

### Atlas UI Method
1. Go to cluster → Configuration → Tags
2. Add tag: `automation:enabled` = `false` (to disable)
3. Remove the tag or set to `true` (to enable)

## Key Features

- **🏷️ Tag-Based Automation**: Schedule configuration stored directly on Atlas clusters as tags
- **🎛️ Atlas-Native Management**: Schedules visible and manageable in Atlas console, CLI, and API
- **🌐 Multi-Project Support**: Automatically discovers and manages clusters across all Atlas projects
- **⏰ Timezone Support**: Configure schedules in any IANA timezone with proper handling
- **📖 Self-Documenting**: Human-readable schedule tags (e.g., `days:1.2.3.4.5:hour:22:timezone:America-New_York`)
- **🏗️ Zero Infrastructure**: No servers, databases, or web applications to maintain
- **🔒 Secure by Default**: No custom authentication or web security concerns
- **💰 Cost-Effective**: Only pay for App Services execution time (typically pennies per month)
- **📊 Optional Logging**: Detailed audit trail for compliance and troubleshooting
- **🧪 Easy Testing**: "Hello world!" shortcuts for quick function testing
- **📈 Scalable**: Handles unlimited Atlas projects and clusters
- **🔄 API Integration**: Programmatic access via Atlas Admin API

## Atlas App Services Functions & Triggers

The application leverages MongoDB Atlas App Services for **tag-based automation**:

### Core Tag-Based Functions

**Schedule Management:**
- `tags/setClusterScheduleTag`: Creates/updates `automation:pause-schedule` tags on clusters
- `tags/getClusterScheduleFromTags`: Retrieves schedule configuration from cluster tags
- `tags/parseScheduleTag`: Parses tag values into usable schedule objects
- `tags/removeClusterScheduleTag`: Removes schedule tags from clusters
- `tags/updateClusterTags`: Updates cluster tags via Atlas API
- `dev/testScheduleTags`: Comprehensive testing utility for tag operations

**Automation Control:**
- `automation/setClusterAutomationEnabled`: Enable/disable automation without removing schedule
- `automation/getClusterAutomationStatus`: Check automation and schedule status for a cluster
- `automation/setOrgWideSchedule`: Set default schedule for all clusters in organization (disabled by default)
- `automation/enableAutomationForProject`: Enable automation for all scheduled clusters in a project

**Project Discovery:**
- `atlas/getProjectsWithScheduledClusters`: Scans all Atlas projects for clusters with schedule tags (respects automation:enabled)

### Automation Triggers

1. **Scheduled Trigger - Tag-Based Pause Processing**
   - Runs every hour via `enforcePauseScheduleTrigger`
   - Calls `trigger/processScheduledClusterOperations` (tag-based version)
   - Scans all projects for clusters with `automation:pause-schedule` tags
   - Processes schedules in local timezones and pauses/resumes clusters
   - Logs actions to activity_logs collection

2. **Optional Trigger - Status Reporting**
   - `trigger/syncClusterStatus`: Updates cluster status collection for dashboard/reporting
   - Simplified replacement for legacy `syncProjectClusters`
   - Gets data from Atlas API + tags, no complex reconciliation needed

3. **Database Trigger - Audit Logging**
   - Fires on updates to activity_logs collection  
   - Records all automation actions for compliance

3. **Function - Atlas API Integration**
   - `modifyCluster`: Interacts with Atlas Admin API to pause/resume clusters
   - `setClusterPauseState`: Handles cluster state changes
   - Includes authentication and error handling

4. **Optional Triggers**
   - `trigger/syncProjectClusters`: Syncs cluster inventory (if using database caching)
   - `trigger/pauseClusters`: Bulk pause operations
   - `trigger/resumeClusters`: Bulk resume operations

## Enhanced Features & Implementation

This project represents a **serverless, infrastructure-free approach** to cluster automation:

### Tag-Based Architecture (V2 Innovation)
- **Atlas-Native Scheduling**: Schedule configuration stored as cluster tags, eliminating external dependencies
- **Transparency**: Schedules visible in Atlas UI, CLI, and API for easy management and troubleshooting
- **Zero Infrastructure**: No servers, databases, or web applications to deploy or maintain
- **Self-Documenting**: Human-readable tag format (`days:1.2.3.4.5:hour:22:timezone:America-New_York`)
- **Atlas Integration**: Leverages Atlas infrastructure for configuration management
- **Security**: No custom authentication or web security concerns

### Serverless Automation
- Each cluster can have its own custom schedule with timezone awareness
- Supports complex scheduling patterns with day-of-week and hour precision
- Dynamic discovery of scheduled clusters across all Atlas projects
- No hardcoded schedules in trigger functions
- Scales automatically with your Atlas infrastructure

### Optional Comprehensive Logging
- All cluster state changes (pause, resume) can be logged to MongoDB
- Detailed audit trail for compliance and troubleshooting
- Activity logs can be analyzed for usage patterns and optimization opportunities
- Completely separate from schedule storage for clean architecture

### Implementation Guide

#### Key App Services Components

**Tag-Based Functions:**
- `tags/setClusterScheduleTag`: Creates/updates schedule tags with format validation
- `tags/getClusterScheduleFromTags`: Retrieves and parses schedule configuration from tags  
- `tags/parseScheduleTag`: Parses descriptive tag format into schedule objects
- `tags/removeClusterScheduleTag`: Removes schedule tags from clusters
- `tags/updateClusterTags`: Updates cluster tags via Atlas API
- `atlas/getProjectsWithScheduledClusters`: Discovers all clusters with schedule tags (respects automation:enabled)
- `dev/testScheduleTags`: Testing utility with "Hello world!" shortcuts
- `automation/setClusterAutomationEnabled`: Enable/disable automation without removing schedule configuration
- `automation/getClusterAutomationStatus`: Check automation and schedule status for clusters
- `automation/setOrgWideSchedule`: Set default schedule across all clusters in organization (disabled by default)
- `automation/enableAutomationForProject`: Enable automation for all scheduled clusters in a project

**Functions:**

*Trigger Functions:*
- `trigger/processScheduledClusterOperations`: **Tag-based** cluster processing (runs hourly)
- `trigger/syncClusterStatus`: Updates cluster status for reporting (simplified, tag-based)
- `trigger/logClusterAutomationChange`: Records changes to cluster configurations in activity logs
- `trigger/pauseClusters`: Pauses all clusters in specified projects (optional)
- `trigger/resumeClusters`: Resumes all clusters in specified projects (optional)
- `trigger/scaleClusterUp`: Used for scaling up clusters (optional)
- `trigger/syncProjectClusters`: Legacy sync function (deprecated - use syncClusterStatus)
- `trigger/resumeClusters`: Resumes all clusters in specified projects (optional)
- `trigger/scaleClusterUp`: Used for scaling up clusters (optional)

*Helper Functions:*
- `setClusterPauseState`: Pauses or resumes a specific cluster
- `modifyCluster`: Modifies cluster attributes through Atlas API

*Collection Functions (for reporting/dashboard):*
- `collections/getClusterStatusCollection`: Gets handle to the cluster status collection for reporting
- `collections/refreshClusterStatus`: Updates reporting data from Atlas API + tags  
- `collections/getActivityLogsCollection`: Gets a handle to the activity_logs collection
- `collections/getClusterOpsCollection`: Legacy collection access (deprecated)
- `collections/reconcileClustersArray`: Legacy reconciliation utility (deprecated)

**Triggers:**
- `enforcePauseScheduleTrigger`: Scheduled trigger that runs hourly to process **tag-based** cluster schedules by calling `trigger/processScheduledClusterOperations`
- `logClusterAutomationChangeTrigger`: Optional database trigger for activity logging (if using audit collection)

## Quick Start Guide

### Prerequisites
- MongoDB Atlas account with clusters to automate
- Atlas Admin API key (public/private key pair)

### Setup (5-Minute Installation)

1. **Create Atlas App Services Application**
   ```bash
   # In your Atlas project, go to "App Services" and create a new application
   ```

2. **Configure API Credentials**
   - In App Services, go to Values & Secrets
   - Create secret `AtlasPrivateKeySecret` with your Atlas private API key
   - Create value `AtlasPublicKey` with your Atlas public API key

3. **Deploy the Functions**
   ```bash
   # Clone repository
   git clone https://github.com/wbleonard/atlas-cluster-automation-v2.git
   cd atlas-cluster-automation-v2
   
   # Install App Services CLI
   npm install -g atlas-app-services-cli
   
   # Login to Atlas
   appservices login --api-key="<Public Key>" --private-api-key="<Private Key>"
   
   # Deploy from app-services directory
   cd app-services/AutomationApp
   appservices push --remote="<Your App ID>"
   ```

4. **Add Dependencies**
   - In App Services console, go to Functions → Dependencies
   - Add: `moment-timezone`

5. **Test the Setup**
   ```javascript
   // In App Services console, run this test:
   await testScheduleTags("Hello world!", "", "set");
   ```

### Schedule Your First Cluster

**Option 1: Using App Services Console**
```javascript
// Set weekday 10 PM Eastern schedule
await setClusterScheduleTag("Hello world!", "", 22, [1,2,3,4,5], "America/New_York");
```

**Option 2: Using Atlas UI**
1. Go to your cluster → Configuration → Tags  
2. Add tag: `automation:pause-schedule` = `days:1.2.3.4.5:hour:22:timezone:America-New_York`

**Option 3: Using Atlas CLI**
```bash
atlas clusters tags add <clusterName> --projectId <projectId> \
  --tag key=automation:pause-schedule,value=days:1.2.3.4.5:hour:22:timezone:America-New_York
```

## Advanced Configuration

### Organization-Wide Setup
```javascript
// Set default schedule for ALL clusters in organization (disabled by default for safety)
await setOrgWideSchedule(22, [0,1,2,3,4,5,6], "America/New_York", false);

// Enable automation for specific project when ready
await enableAutomationForProject(projectId);

// Test org-wide setup
await testScheduleTags("Hello world!", "", "org-setup");

// Test project enablement
await testScheduleTags("Hello world!", "", "enable-project");
```

### Custom Timezones
```javascript
// Asia/Tokyo schedule
await setClusterScheduleTag(projectId, clusterName, 18, [1,2,3,4,5], "Asia/Tokyo");

// Europe/London schedule  
await setClusterScheduleTag(projectId, clusterName, 20, [0,6], "Europe/London");
```

### Weekend vs Weekday Schedules
```javascript
// Weekend morning shutdown
await setClusterScheduleTag(projectId, "dev-cluster", 9, [0,6], "America/New_York");

// Weekday evening shutdown
await setClusterScheduleTag(projectId, "prod-cluster", 22, [1,2,3,4,5], "America/New_York");
```

### Activity Logging Setup (Optional)
```javascript
// Configure activity logging collection
await getActivityLogsCollection(); // Sets up collection if needed
```

## Tag Format Reference

### Schedule Tag Format
```
Key: automation:pause-schedule
Value: days:1.2.3.4.5:hour:22:timezone:America-New_York
```

### Automation Control Tag Format
```
Key: automation:enabled
Value: false (to disable) | true (to enable) | omit tag (default: enabled)
```

**Schedule Components:**
- `days:` - Prefix for days of week section
- `1.2.3.4.5` - Days of week (0=Sunday through 6=Saturday), dot-separated
- `hour:` - Prefix for hour section  
- `22` - Hour to pause (0-23, 24-hour format)
- `timezone:` - Prefix for timezone section
- `America-New_York` - IANA timezone with `/` converted to `-` for Atlas compatibility

**Examples:**
- `days:1.2.3.4.5:hour:22:timezone:America-New_York` - Weekdays at 10 PM Eastern
- `days:0.6:hour:9:timezone:America-New_York` - Weekends at 9 AM Eastern  
- `days:1.3.5:hour:18:timezone:Europe-London` - Mon/Wed/Fri at 6 PM London time
- `days:1.2.3.4.5:hour:22` - Weekdays at 10 PM (defaults to America/New_York)

**Common Automation Control Scenarios:**
```bash
# Temporarily disable automation during maintenance
automation:enabled = false

# Production cluster - keep automation enabled (default)
# (no automation:enabled tag needed)

# Development cluster - enable automation  
automation:enabled = true
```

## Management & Monitoring

### View Schedules
```bash
# List all clusters with schedule tags
atlas clusters tags list --projectId <projectId>

# View specific cluster tags
atlas clusters describe <clusterName> --projectId <projectId>
```

### Monitor Automation
- **App Services Logs**: View function execution logs in Atlas App Services console
- **Atlas Activity Feed**: See cluster pause/resume events in Atlas project activity
- **Optional Activity Collection**: Query MongoDB collection for detailed audit trails

### Troubleshooting
```javascript
// Test tag parsing
await parseScheduleTag("days:1.2.3.4.5:hour:22:timezone:America-New_York");

// List all projects with scheduled clusters  
await getProjectsWithScheduledClusters();

// Test all tag operations
await testScheduleTags("Hello world!", "", "parse");

// Check automation status
await testScheduleTags("Hello world!", "", "status");

// Disable automation temporarily
await testScheduleTags("Hello world!", "", "disable");

// Re-enable automation
await testScheduleTags("Hello world!", "", "enable");
```

## Cost Optimization Examples

### Development Clusters
```
Tag: days:1.2.3.4.5:hour:18:timezone:America-New_York
Saves: ~70% on compute costs (paused 14 hours/day + weekends)
```

### Testing Clusters  
```
Tag: days:0.6:hour:22:timezone:America-New_York
Saves: ~50% on compute costs (paused nights + weekdays)
```

### Analytics Clusters
```
Tag: days:1.2.3.4.5:hour:23:timezone:America-New_York  
Saves: ~65% on compute costs (paused overnight + weekends)
```

## Deployment

### Atlas App Services (Only Required Component)
1. Create App Services application in your Atlas project
2. Configure API credentials as Values/Secrets
3. Deploy functions using App Services CLI
4. Add `moment-timezone` dependency
5. Enable hourly trigger

**That's it!** No servers, databases, or additional infrastructure needed.

## Why Choose the Serverless Approach?

### Traditional Web-Based Solutions
❌ Require servers, databases, and web infrastructure  
❌ Need security hardening, authentication, and authorization  
❌ Maintenance overhead for UI, API, and database components  
❌ Additional costs for hosting and infrastructure  
❌ Complex deployment and scaling requirements  

### Atlas Tag-Based Automation (This Solution)
✅ **Zero Infrastructure**: No servers or databases to maintain  
✅ **Atlas-Native**: Fully integrated with Atlas UI and ecosystem  
✅ **Secure by Default**: No custom authentication or web vulnerabilities  
✅ **Cost-Effective**: Pay only for function execution (typically <$1/month)  
✅ **Transparent**: All configuration visible in Atlas console  
✅ **Scalable**: Automatically handles unlimited projects and clusters  
✅ **Simple**: 5-minute setup with App Services deployment  

## Contributing

Contributions are welcome! This solution is designed to be:
- **Simple**: Focused on core automation without unnecessary complexity
- **Secure**: No web UI or custom authentication to maintain  
- **Scalable**: Built on Atlas App Services serverless architecture
- **Transparent**: All configuration visible in Atlas UI

Please feel free to submit a Pull Request for improvements to the automation logic or additional scheduling features.

## License

This project is licensed under the MIT License - see the LICENSE file for details.