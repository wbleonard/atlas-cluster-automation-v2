# Autoscaling Feature - Manual Test Plan

## Prerequisites
- MongoDB Atlas Cluster Automation application is running
- Test data includes clusters with and without autoscaling enabled

## Test Cases

### 1. Cluster Summary Table Display
- [x] Verify autoscaling column is present in the table
- [x] Verify clusters with autoscaling enabled show a green "Enabled" badge
- [x] Verify clusters without autoscaling show a gray "Disabled" badge

### 2. Filtering
- [x] Verify autoscaling filter dropdown contains "All", "Enabled", and "Disabled" options
- [x] Verify selecting "Enabled" shows only clusters with autoscaling enabled
- [x] Verify selecting "Disabled" shows only clusters without autoscaling
- [x] Verify selecting "All" shows all clusters

### 3. Filter Persistence
- [x] Set autoscaling filter to "Enabled" and click refresh
- [x] Verify filter remains set to "Enabled" after refresh
- [x] Verify clusters shown still respect the "Enabled" filter

### 4. Configure Modal
- [x] Click "Configure" button for a cluster with autoscaling enabled
- [x] Verify modal shows autoscaling status as "Enabled"
- [x] Click "Configure" button for a cluster without autoscaling
- [x] Verify modal shows autoscaling status as "Disabled"

### 5. CSV/JSON Export
- [x] Filter for clusters with autoscaling enabled
- [x] Export as CSV and verify autoscaling column shows "Enabled" for all exported clusters
- [x] Export as JSON and verify autoscaling field is true for all exported clusters

## Notes
- Autoscaling configuration is read-only and can only be changed in MongoDB Atlas
- The Configure modal only displays the autoscaling status and does not allow changes
- The SVG icon for autoscaling has been created but not yet integrated into the UI

## Future Enhancements
1. Add visual indicators for clusters that have recently autoscaled
2. Add autoscaling metrics and history to the Charts dashboard
3. Consider adding a direct link to the Atlas console for changing autoscaling settings
