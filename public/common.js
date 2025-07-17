// Common functionality for displaying the organization name
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Check if API is available
        if (!window.ClusterAPI || !window.ClusterAPI.fetchAppConfig) {
            console.error('ClusterAPI not found or missing fetchAppConfig function.');
            return;
        }

        // Fetch the app configuration
        const config = await window.ClusterAPI.fetchAppConfig();
        
        // Add organization name to the subtitle
        if (config && config.organizationName) {
            // Find the page subtitle (the element with class "lead")
            const subtitleElement = document.querySelector('p.lead');
            if (subtitleElement) {
                // Get the original subtitle text
                const originalSubtitle = subtitleElement.textContent;
                
                // Update with organization name
                subtitleElement.innerHTML = `<span class="org-name">${config.organizationName}</span> | ${originalSubtitle}`;
                
                // Add some styling
                const style = document.createElement('style');
                style.textContent = `
                    .org-name {
                        color: var(--leafygreen-green-dark);
                        font-weight: 600;
                    }
                `;
                document.head.appendChild(style);
            }
        }
    } catch (error) {
        console.error('Error loading organization name:', error);
    }
});

// Shared formatting functions
function formatOwnerDisplay(cluster) {
    let ownerDisplay = cluster.mongoOwner || '';
    if (!ownerDisplay || ownerDisplay.trim() === '' || ownerDisplay === 'Not assigned') {
        ownerDisplay = '<span class="owner-not-assigned">Not assigned</span>';
    }
    return ownerDisplay;
}

// Add to window object for global access
window.formatOwnerDisplay = formatOwnerDisplay;
window.formatPauseSchedule = formatPauseSchedule; 

// Also add to ClusterAPI if it exists
if (window.ClusterAPI) {
    window.ClusterAPI.formatOwnerDisplay = formatOwnerDisplay;
}

// Utility Functions
function formatPauseSchedule(cluster) {
    // Check if cluster has pause schedule data
    if (!cluster.pauseDaysOfWeek || !Array.isArray(cluster.pauseDaysOfWeek) || cluster.pauseDaysOfWeek.length === 0) {
        return 'No Schedule';
    }
    
    // Safe check for pauseHour
    if (cluster.pauseHour === null || cluster.pauseHour === undefined) {
        return 'No Schedule';
    }
    
    // Safe check for timezone
    const timezone = cluster.timezone || 'UTC';
    
    // Day names mapping
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    try {
        // Convert pause days to day names
        const pauseDayNames = cluster.pauseDaysOfWeek
            .map(day => dayNames[day] || `Day${day}`)
            .join(', ');
        
        // Format the schedule display
        return `${pauseDayNames} at ${cluster.pauseHour}:00 (${timezone})`;
    } catch (error) {
        console.error('Error formatting pause schedule:', error, 'Cluster:', cluster);
        return 'Invalid Schedule';
    }
}

// Add to window object for global access
window.ClusterUtils = {
    formatOwnerDisplay: formatOwnerDisplay,
    formatPauseSchedule: formatPauseSchedule
};
