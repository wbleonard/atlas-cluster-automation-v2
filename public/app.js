// Wait for API to be loaded before initializing
document.addEventListener('DOMContentLoaded', function() {
    // Check if API is available
    if (!window.ClusterAPI) {
        console.error('ClusterAPI not found. API functions may not be loaded correctly.');
        const loadingProjects = document.getElementById('loadingProjects');
        if (loadingProjects) {
            loadingProjects.textContent = 'Error: API functions not loaded. Please refresh the page.';
            loadingProjects.classList.remove('alert-info');
            loadingProjects.classList.add('alert-danger');
        }
        return;
    }

    // Configuration - use shared API from api.js
    const { 
        fetchProjects, 
        fetchClustersByProject, 
        updateClusterSchedule, 
        removeClusterSchedule,
        formatPauseSchedule,
        getClusterStatusClass,
        getClusterStatusText,
        populatePauseScheduleModal,
        getSelectedPauseDays
    } = window.ClusterAPI;

// DOM Elements
const projectSelector = document.getElementById('projectSelector');
const loadingProjects = document.getElementById('loadingProjects');
const errorProjects = document.getElementById('errorProjects');
const clustersSection = document.getElementById('clustersSection');
const selectedProjectName = document.getElementById('selectedProjectName');
const loadingClusters = document.getElementById('loadingClusters');
const errorClusters = document.getElementById('errorClusters');
const clustersList = document.getElementById('clustersList');
const clustersTableBody = document.getElementById('clustersTableBody');

// Modal Elements
const pauseScheduleModal = new bootstrap.Modal(document.getElementById('pauseScheduleModal'));
const pauseScheduleForm = document.getElementById('pauseScheduleForm');
const editClusterNameInput = document.getElementById('editClusterName');
const editProjectIdInput = document.getElementById('editProjectId');
const mongoOwnerInput = document.getElementById('mongoOwner');
const customerContactInput = document.getElementById('customerContact');
const pauseHourInput = document.getElementById('pauseHour');
const timezoneInput = document.getElementById('timezone');
const descriptionInput = document.getElementById('description');
const savePauseScheduleBtn = document.getElementById('savePauseScheduleBtn');

// Toast notification
const notificationToast = new bootstrap.Toast(document.getElementById('notificationToast'), {
    delay: 5000
});
const toastTitle = document.getElementById('toastTitle');
const toastMessage = document.getElementById('toastMessage');

// Event listeners - remove DOMContentLoaded since we now have it at the top
// document.addEventListener('DOMContentLoaded', loadProjects);
projectSelector.addEventListener('change', handleProjectChange);
savePauseScheduleBtn.addEventListener('click', savePauseSchedule);

// Call loadProjects directly (it was previously called from DOMContentLoaded)
loadProjects();
// Also check URL parameters for project ID
checkUrlParameters();

// Load all projects
async function loadProjects(initialProjectId) {
    try {
        const projects = await fetchProjects();
        
        if (projects.length === 0) {
            showNotification('Info', 'No projects found.');
            loadingProjects.textContent = 'No projects found.';
            return;
        }
        
        // Populate project selector
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.projectId;
            option.textContent = project.projectName;
            projectSelector.appendChild(option);
        });
        
        // Show project selector
        loadingProjects.classList.add('d-none');
        projectSelector.classList.remove('d-none');
        
        // If an initial project ID is provided (e.g., from URL parameters), select it
        if (initialProjectId) {
            projectSelector.value = initialProjectId;
            handleProjectChange();
        }
        
    } catch (error) {
        console.error('Error loading projects:', error);
        loadingProjects.classList.add('d-none');
        errorProjects.classList.remove('d-none');
        errorProjects.textContent = `Error loading projects: ${error.message}`;
    }
}

// Check URL parameters for project id on page load
// Don't add another DOMContentLoaded event since we have one at the top
// Instead, this will be called directly after the DOM is loaded
function checkUrlParameters() {
    // Parse URL parameters for projectId
    const urlParams = new URLSearchParams(window.location.search);
    const projectIdParam = urlParams.get('projectId');
    
    // If projectId is in the URL, select it in the dropdown
    if (projectIdParam && projectSelector.value !== projectIdParam) {
        projectSelector.value = projectIdParam;
        handleProjectChange();
    }
}

// Handle project selection change
async function handleProjectChange() {
    const projectId = projectSelector.value;
    
    if (!projectId) {
        clustersSection.classList.add('d-none');
        return;
    }
    
    // Get selected project name
    const selectedProject = projectSelector.options[projectSelector.selectedIndex].text;
    selectedProjectName.textContent = selectedProject;
    
    // Show clusters section
    clustersSection.classList.remove('d-none');
    clustersList.classList.add('d-none');
    loadingClusters.classList.remove('d-none');
    errorClusters.classList.add('d-none');
    
    try {
        const clusters = await fetchClustersByProject(projectId);
        
        // Clear existing clusters
        clustersTableBody.innerHTML = '';
        
        if (clusters.length === 0) {
            loadingClusters.textContent = 'No clusters found in this project.';
            return;
        }
        
        // Populate clusters table
        clusters.forEach(cluster => {
            addClusterToTable(cluster, projectId);
        });
        
        // Show clusters list
        loadingClusters.classList.add('d-none');
        clustersList.classList.remove('d-none');
        
    } catch (error) {
        console.error('Error loading clusters:', error);
        loadingClusters.classList.add('d-none');
        errorClusters.classList.remove('d-none');
        errorClusters.textContent = `Error loading clusters: ${error.message}`;
    }
}

// Add a cluster to the table
function addClusterToTable(cluster, projectId) {
    const row = document.createElement('tr');
    
    // Status indicator
    const statusClass = getClusterStatusClass(cluster.paused);
    const statusText = getClusterStatusText(cluster.paused);
    
    // Pause schedule information
    let pauseScheduleDisplayText = formatPauseSchedule(cluster);
    let pauseScheduleClass = (cluster.pauseHour !== undefined && cluster.pauseDaysOfWeek) ? 'has-schedule' : 'no-schedule';
    
    let pauseScheduleDisplay = `
        <span class="pause-schedule-badge ${pauseScheduleClass}">
            ${pauseScheduleDisplayText}
        </span>
    `;
    
    row.innerHTML = `
        <td>${cluster.name}</td>
        <td><span class="cluster-status ${statusClass}"></span> ${statusText}</td>
        <td>${cluster.instanceSize || 'N/A'}</td>
        <td>${cluster.mongoDBVersion || 'N/A'}</td>
        <td>${cluster.mongoOwner || 'Not assigned'}</td>
        <td>${pauseScheduleDisplay}</td>
        <td>
            <button class="btn btn-sm btn-primary configure-pause-btn"
                data-cluster-name="${cluster.name}"
                data-project-id="${projectId}">
                Configure
            </button>
        </td>
    `;
    
    // Add event listener to configure button
    const configureBtn = row.querySelector('.configure-pause-btn');
    configureBtn.addEventListener('click', () => openPauseScheduleModal(cluster, projectId));
    
    clustersTableBody.appendChild(row);
}

// Open pause schedule configuration modal
function openPauseScheduleModal(cluster, projectId) {
    // Add projectId to cluster object if it's not already there
    if (!cluster.projectId) {
        cluster.projectId = projectId;
    }
    
    // Use the shared function to populate the modal
    const modalTitle = populatePauseScheduleModal(
        cluster, 
        editClusterNameInput, 
        editProjectIdInput, 
        mongoOwnerInput, 
        customerContactInput, 
        pauseHourInput, 
        timezoneInput, 
        descriptionInput
    );
    
    // Set modal title
    document.getElementById('pauseScheduleModalLabel').textContent = modalTitle;
    
    // Show modal
    pauseScheduleModal.show();
}

// Save pause schedule
async function savePauseSchedule() {
    const clusterName = editClusterNameInput.value;
    const projectId = editProjectIdInput.value;
    
    // Get selected days of week using the shared function
    const pauseDaysOfWeek = getSelectedPauseDays();
    
    // Create update data
    const updateData = {
        mongoOwner: mongoOwnerInput.value,
        customerContact: customerContactInput.value,
        pauseHour: parseInt(pauseHourInput.value),
        pauseDaysOfWeek: pauseDaysOfWeek,
        timezone: timezoneInput.value,
        description: descriptionInput.value
    };
    
    try {
        await updateClusterSchedule(projectId, clusterName, updateData);
        
        // Hide modal
        pauseScheduleModal.hide();
        
        // Show success notification
        showNotification('Success', `Pause schedule for ${clusterName} updated successfully`);
        
        // Refresh cluster list
        handleProjectChange();
        
    } catch (error) {
        console.error('Error updating cluster:', error);
        showNotification('Error', `Failed to update cluster: ${error.message}`, true);
    }
}

// Handle remove schedule button click
document.getElementById('removeScheduleBtn').addEventListener('click', async function() {
    const projectId = document.getElementById('editProjectId').value;
    const clusterName = document.getElementById('editClusterName').value;
    
    if (!projectId || !clusterName) {
        showNotification('Error', 'Missing project or cluster information', true);
        return;
    }
    
    try {
        // Confirm before removing
        if (!confirm(`Are you sure you want to remove the pause schedule for cluster "${clusterName}"?`)) {
            return;
        }
        
        await removeClusterSchedule(projectId, clusterName);
        
        // Close the modal
        pauseScheduleModal.hide();
        
        // Show success message
        showNotification('Success', `Schedule removed for cluster "${clusterName}"`);
        
        // Refresh the clusters data
        handleProjectChange();
    } catch (error) {
        console.error('Error removing schedule:', error);
        showNotification('Error', error.message, true);
    }
});

// Show notification toast
function showNotification(title, message, isError = false) {
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    
    // Set toast color based on type
    const toastEl = document.getElementById('notificationToast');
    if (isError) {
        toastEl.classList.add('bg-danger', 'text-white');
    } else {
        toastEl.classList.remove('bg-danger', 'text-white');
    }
    
    notificationToast.show();
}

// Close the DOMContentLoaded event handler from the top of the file
});
