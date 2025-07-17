// Common API and utility functions for cluster management
const API_BASE_URL = '/api';

// API Functions
async function fetchProjects() {
    const response = await fetch(`${API_BASE_URL}/projects`);
    if (!response.ok) {
        throw new Error('Failed to fetch projects');
    }
    return await response.json();
}

async function fetchClustersByProject(projectId) {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/clusters`);
    if (!response.ok) {
        throw new Error('Failed to fetch clusters');
    }
    return await response.json();
}

async function fetchClusterSummary() {
    const response = await fetch(`${API_BASE_URL}/clusters/summary`);
    if (!response.ok) {
        throw new Error('Failed to fetch cluster summary');
    }
    return await response.json();
}

async function fetchAppConfig() {
    const response = await fetch(`${API_BASE_URL}/config`);
    if (!response.ok) {
        throw new Error('Failed to fetch application configuration');
    }
    return await response.json();
}

async function updateClusterSchedule(projectId, clusterName, updateData) {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/clusters/${clusterName}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update cluster');
    }
    
    return await response.json();
}

async function removeClusterSchedule(projectId, clusterName) {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/clusters/${clusterName}/schedule`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove schedule');
    }
    
    return await response.json();
}

function getClusterStatusClass(isPaused) {
    return isPaused ? 'cluster-paused' : 'cluster-active';
}

function getClusterStatusText(isPaused) {
    return isPaused ? 'Paused' : 'Active';
}

// Handle Modal Operations
function populatePauseScheduleModal(cluster, editClusterNameInput, editProjectIdInput, mongoOwnerInput, 
                                  customerContactInput, pauseHourInput, timezoneInput, descriptionInput) {
    // Set cluster and project IDs for form submission
    editClusterNameInput.value = cluster.name || cluster.clusterName;
    editProjectIdInput.value = cluster.projectId;
    
    // Populate form with existing values
    mongoOwnerInput.value = cluster.mongoOwner || '';
    customerContactInput.value = cluster.customerContact || '';
    pauseHourInput.value = cluster.pauseHour !== undefined ? cluster.pauseHour : 22;
    timezoneInput.value = cluster.timezone || 'America/New_York';
    descriptionInput.value = cluster.description || '';
    
    // Update autoscaling status
    const autoscalingStatusEl = document.getElementById('autoscalingStatus');
    if (autoscalingStatusEl) {
        autoscalingStatusEl.innerHTML = cluster.autoscaling ? 
            '<span class="badge bg-success">Enabled</span>' : 
            '<span class="badge bg-secondary">Disabled</span>';
    }
    
    // Reset all checkboxes
    document.querySelectorAll('.pauseDayCheck').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Check days of week if they exist
    if (cluster.pauseDaysOfWeek && Array.isArray(cluster.pauseDaysOfWeek)) {
        cluster.pauseDaysOfWeek.forEach(day => {
            const checkbox = document.getElementById(`pauseDay${day}`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }
    
    // Return the title for the modal
    return `Configure Pause Schedule - ${cluster.name || cluster.clusterName}`;
}

function getSelectedPauseDays() {
    const pauseDaysOfWeek = [];
    document.querySelectorAll('.pauseDayCheck:checked').forEach(checkbox => {
        pauseDaysOfWeek.push(parseInt(checkbox.value));
    });
    return pauseDaysOfWeek;
}

// Export all functions to be used in other files
window.ClusterAPI = {
    fetchProjects,
    fetchClustersByProject,
    fetchClusterSummary,
    fetchAppConfig,
    updateClusterSchedule,
    removeClusterSchedule,
    getClusterStatusClass,
    getClusterStatusText,
    populatePauseScheduleModal,
    getSelectedPauseDays
};

// Confirm that the API is loaded and ready
console.log('API functions loaded successfully');
