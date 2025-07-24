# Default Tags Enforcement System

This system ensures that all Atlas clusters have required organizational and automation tags with default values. The system is designed to work entirely through Atlas tags without requiring a separate web UI.

## Required Tags

The system enforces these tags on all clusters:

| Tag Key | Default Value | Description |
|---------|---------------|-------------|
| `OWNED_BY` | `unassigned` | The team that owns and is responsible for this cluster |
| `SUPPORTED_BY` | `unassigned` | The team that provides operational support for this cluster |
| `PROJECT_STATUS` | `active` | The current lifecycle status of the project using this cluster |
| `automation:enabled` | `true` | Whether automated pause/resume is enabled for this cluster |
| `automation:pause-schedule` | *(not set)* | The schedule for automatically pausing this cluster |

## Suggested Values

### OWNED_BY / SUPPORTED_BY
- `team-platform`
- `team-backend` 
- `team-frontend`
- `team-data`
- `team-devops`
- `team-sre`
- `team-infrastructure`
- `unassigned`

### PROJECT_STATUS
- `active` - Production projects in active use
- `maintenance` - Projects in maintenance mode  
- `deprecated` - Projects being phased out
- `sunset` - Projects scheduled for decommission

### automation:enabled
- `true` - Automation is enabled for this cluster
- `false` - Automation is disabled for this cluster

### automation:pause-schedule
- `days:1.2.3.4.5:hour:22:timezone:America/New_York` - Weekdays at 10 PM EST
- `days:6.0:hour:18:timezone:UTC` - Weekends at 6 PM UTC
- *(empty/not set)* - No scheduled pausing

## Enforcement Methods

### 1. Scheduled Enforcement (Configurable)
- **Default Schedule**: Every Monday at midnight UTC (`0 0 * * 1`)
- **Trigger**: `ensureDefaultTagsTrigger` 
- **Function**: `ensureDefaultTagsScheduled`
- **Initial State**: Disabled by default - you choose when to enable
- **Action**: Scans all clusters across all projects and adds missing default tags

**To Configure the Schedule:**
1. In Atlas App Services, go to Triggers
2. Find `ensureDefaultTagsTrigger` 
3. Edit the schedule using cron format:
   - `0 0 * * 1` = Monday at midnight UTC
   - `0 2 * * 0` = Sunday at 2 AM UTC  
   - `0 18 * * 5` = Friday at 6 PM UTC
   - `0 0 1 * *` = First day of every month at midnight
4. Enable the trigger when ready

### 2. Manual Enforcement (Atlas API)
- **Function**: `ensureDefaultTags`
- **Parameters**: `projectId` (optional), `clusterName` (optional), `debugMode` (optional)
- **Action**: Can process all clusters, single project, or single cluster
- **Usage**: Call directly from Atlas App Services or via Atlas API

## Implementation Files

### Atlas App Services Functions
- `/functions/automation/ensureDefaultTags.js` - Main enforcement logic
- `/functions/trigger/ensureDefaultTagsScheduled.js` - Scheduled trigger function

### Triggers
- `/triggers/ensureDefaultTagsTrigger.json` - Weekly scheduled trigger

### Collection Updates
- Enhanced `refreshClusterStatus.js` and `refreshDashboardData.js` to track all organizational and automation tags

## Activity Logging

All tag enforcement actions are logged to the `activity_logs` collection:

```javascript
{
  timestamp: ISODate(...),
  action: "DEFAULT_TAGS_ADDED|DEFAULT_TAGS_FAILED",
  projectId: "...",
  clusterName: "...", 
  details: {
    tagsAdded: [{key: "OWNED_BY", value: "unassigned"}],
    totalTagsAdded: 1
  },
  status: "SUCCESS|FAILED",
  triggerSource: "AUTOMATED_ENFORCEMENT|MANUAL_UI|API_CALL"
}
```

## Usage Examples

### Manual API Call
```javascript
// Add default tags to specific cluster
await context.functions.execute("automation/ensureDefaultTags", 
  "projectId123", "clusterName", true);

// Audit all clusters in a project  
await context.functions.execute("automation/ensureDefaultTags", 
  "projectId123");

// Audit all clusters in all projects
await context.functions.execute("automation/ensureDefaultTags");
```

### Atlas Tags Management
1. **New Clusters**: Tags are automatically applied via scheduled trigger
2. **Manual Enforcement**: Call the `ensureDefaultTags` function as needed
3. **Tag Updates**: Modify tags directly in Atlas UI - system preserves existing values

## Customization

To modify the default tags or values, edit the `requiredTags` object in:
- `/functions/automation/ensureDefaultTags.js`

The system will automatically apply new default tags to clusters that don't have them during the next enforcement run.
