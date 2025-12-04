# Documentation Index

Quick reference to find the right documentation for your needs.

## 🚀 Getting Started

| Document | Purpose | Time Required |
|----------|---------|---------------|
| [`README.md`](README.md) | Project overview, architecture, and setup | 15 min read |
| [`ATLAS_DASHBOARD_SETUP.md`](ATLAS_DASHBOARD_SETUP.md) | Complete dashboard setup with step-by-step instructions | 30 min |

## 📊 Dashboard & Visualization

| Document | Purpose | Audience |
|----------|---------|----------|
| [`ATLAS_DASHBOARD_SETUP.md`](ATLAS_DASHBOARD_SETUP.md) | **Complete dashboard guide** - Two-dashboard setup (cluster overview + activity logs) | Everyone |

## 🏷️ Tag Management & Automation

| Document | Purpose |
|----------|---------|
| [`DEFAULT_TAGS_SYSTEM.md`](DEFAULT_TAGS_SYSTEM.md) | Tag enforcement system documentation |

## 📁 Project Structure

```
atlas-cluster-automation-v2/
│
├── README.md                          # Main project documentation
├── DOCUMENTATION_INDEX.md             # This file - navigation guide
│
├── 📊 Dashboard Guide
│   └── ATLAS_DASHBOARD_SETUP.md      # Complete dashboard setup ⭐ START HERE
│
├── 🏷️ Tag System
│   └── DEFAULT_TAGS_SYSTEM.md         # Tag enforcement documentation
│
└── 💻 App Services Functions
    └── app-services/AutomationApp/
        └── functions/
            ├── collections/
            │   ├── getActivityLogsCollection.js
            │   ├── getRecentActivity.js        # Fetch recent logs
            │   ├── getActivityStats.js         # Get statistics
            │   └── checkActivityLogs.js        # Diagnostic tool
            ├── automation/
            ├── atlas/
            ├── tags/
            └── trigger/
```

## 🎯 Common Tasks

### I want to...

#### Create my first dashboard
1. Read [`README.md`](README.md) for project overview
2. Follow [`ATLAS_DASHBOARD_SETUP.md`](ATLAS_DASHBOARD_SETUP.md) for step-by-step dashboard setup

#### View activity logs
- **In Atlas Charts:** Follow [`ATLAS_DASHBOARD_SETUP.md`](ATLAS_DASHBOARD_SETUP.md) Dashboard 2
- **Via API:** See [`README.md`](README.md) "Activity Logging & Monitoring" section

#### Troubleshoot missing activity logs
1. Run diagnostic: `await context.functions.execute("collections/checkActivityLogs")`
2. Check function logs in Atlas App Services console
3. Verify data source configuration in Atlas Charts

#### Set up tag enforcement
- Read [`DEFAULT_TAGS_SYSTEM.md`](DEFAULT_TAGS_SYSTEM.md)
- Configure trigger in Atlas App Services

#### Customize charts
- See [`ATLAS_DASHBOARD_SETUP.md`](ATLAS_DASHBOARD_SETUP.md) for detailed chart configurations and aggregation pipelines

#### Understand the architecture
- Read [`README.md`](README.md) "Architecture" and "Data Model" sections

## 📚 Documentation by Role

### For Administrators
Start with these in order:
1. [`README.md`](README.md) - Understand the system
2. [`ATLAS_DASHBOARD_SETUP.md`](ATLAS_DASHBOARD_SETUP.md) - Set up monitoring
3. [`DEFAULT_TAGS_SYSTEM.md`](DEFAULT_TAGS_SYSTEM.md) - Configure tag enforcement

### For Developers
Key documents:
1. [`README.md`](README.md) - API functions and architecture
2. [`ATLAS_DASHBOARD_SETUP.md`](ATLAS_DASHBOARD_SETUP.md) - Chart configurations and aggregation pipelines
3. Function source code in `app-services/AutomationApp/functions/`

### For Business Users
Visual guides:
1. [`ATLAS_DASHBOARD_SETUP.md`](ATLAS_DASHBOARD_SETUP.md) - Complete dashboard setup with visual diagrams
2. [`images/`](images/) - Dashboard screenshots and examples

## 🔧 API Functions Reference

### Activity Log Functions

| Function | Purpose | Example |
|----------|---------|---------|
| `checkActivityLogs` | Diagnostic - check collection status | `await context.functions.execute("collections/checkActivityLogs")` |
| `getRecentActivity` | Fetch recent logs with filters | `await context.functions.execute("collections/getRecentActivity", 50, 24)` |
| `getActivityStats` | Get aggregated statistics | `await context.functions.execute("collections/getActivityStats", 168)` |

See [`README.md`](README.md) for complete function list.

## 📊 Chart Types Quick Reference

| Chart Type | Best For | Document |
|------------|----------|----------|
| Line Chart | Activity trends over time | [ATLAS_DASHBOARD_SETUP.md](ATLAS_DASHBOARD_SETUP.md#chart-61-activity-timeline-last-30-days) |
| Table | Recent activity log, failed operations | [ATLAS_DASHBOARD_SETUP.md](ATLAS_DASHBOARD_SETUP.md#chart-62-recent-activity-log-table) |
| Donut Chart | Status distribution, cluster status | [ATLAS_DASHBOARD_SETUP.md](ATLAS_DASHBOARD_SETUP.md#chart-63-activity-by-status-pie-chart) |
| Horizontal Bar | Action types, most active clusters | [ATLAS_DASHBOARD_SETUP.md](ATLAS_DASHBOARD_SETUP.md#chart-64-activity-by-action-type) |
| Gauge/Number | Success rate, metrics | [ATLAS_DASHBOARD_SETUP.md](ATLAS_DASHBOARD_SETUP.md#chart-65-success-rate-gauge) |
| Stacked Column | Activity by trigger source | [ATLAS_DASHBOARD_SETUP.md](ATLAS_DASHBOARD_SETUP.md#chart-67-activity-by-trigger-source) |

## 🔍 Search Tips

- **Activity logs:** Search for "activity" or "logs"
- **Charts:** Search for "chart" or "visualization"
- **Tags:** Search for "tag" or "enforcement"
- **API:** Search for "function" or "execute"
- **Troubleshooting:** Search for "troubleshoot" or "diagnostic"

## 📝 Document Relationships

```
README.md (Main entry point)
    ├── ATLAS_DASHBOARD_SETUP.md (Complete dashboard guide)
    └── DEFAULT_TAGS_SYSTEM.md (Tag enforcement)
```

## 🆘 Need Help?

1. **Can't find activity logs?**
   - Run: `await context.functions.execute("collections/checkActivityLogs")`
   - See: [`ATLAS_DASHBOARD_SETUP.md`](ATLAS_DASHBOARD_SETUP.md) for data source configuration

2. **Charts not showing data?**
   - Verify collection exists and has data
   - Check date filters in charts
   - See: [`ATLAS_DASHBOARD_SETUP.md`](ATLAS_DASHBOARD_SETUP.md)

3. **Want to customize charts?**
   - See: [`ATLAS_DASHBOARD_SETUP.md`](ATLAS_DASHBOARD_SETUP.md) for chart configurations and aggregation pipelines

4. **Need API access instead of charts?**
   - See: [`README.md`](README.md) "Activity Logging & Monitoring" section

---

**Last Updated:** December 2025  
**Version:** 2.0

