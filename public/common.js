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
