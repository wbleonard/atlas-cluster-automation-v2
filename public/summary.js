// Wait for API to be loaded before initializing
document.addEventListener('DOMContentLoaded', function() {
    // Check if API is available
    if (!window.ClusterAPI) {
        console.error('ClusterAPI not found. API functions may not be loaded correctly.');
        const loadingSummary = document.getElementById('loadingSummary');
        if (loadingSummary) {
            loadingSummary.textContent = 'Error: API functions not loaded. Please refresh the page.';
            loadingSummary.classList.remove('alert-info');
            loadingSummary.classList.add('alert-danger');
        }
        return;
    }

    // Configuration - use shared API from api.js
    const { 
        fetchClusterSummary, 
        updateClusterSchedule, 
        removeClusterSchedule,
        formatPauseSchedule,
        getClusterStatusClass,
        getClusterStatusText,
        populatePauseScheduleModal,
        getSelectedPauseDays
    } = window.ClusterAPI;

// Configuration
const API_BASE_URL = '/api';

// DOM Elements
const loadingSummary = document.getElementById('loadingSummary');
const errorSummary = document.getElementById('errorSummary');
const summaryTable = document.getElementById('summaryTable');
const summaryTableBody = document.getElementById('summaryTableBody');
const filterControls = document.getElementById('filterControls');
const statsSummary = document.getElementById('statsSummary');
const refreshBtn = document.getElementById('refreshBtn');
const exportCSV = document.getElementById('exportCSV');
const exportJSON = document.getElementById('exportJSON');
const manageProjectBtn = document.getElementById('manageProjectBtn');
const manageProjectBtnContainer = document.getElementById('manageProjectBtnContainer');

// Filter elements
const projectFilter = document.getElementById('projectFilter');
const statusFilter = document.getElementById('statusFilter');
const scheduleFilter = document.getElementById('scheduleFilter');
const autoscalingFilter = document.getElementById('autoscalingFilter');
const instanceSizeFilter = document.getElementById('instanceSizeFilter');
const searchInput = document.getElementById('searchInput');

// Stats elements
const totalClustersEl = document.getElementById('totalClusters');
const activeClustersEl = document.getElementById('activeClusters');
const pausedClustersEl = document.getElementById('pausedClusters');
const noScheduleClustersEl = document.getElementById('noScheduleClusters');

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

// Data storage
let allClusters = [];
let filteredClusters = [];
let uniqueInstanceSizes = new Set();
let uniqueProjects = new Set();

// Event listeners - remove DOMContentLoaded since we now have it at the top
// document.addEventListener('DOMContentLoaded', loadAllClusters);
refreshBtn.addEventListener('click', function() {
    // Check if we have active filters
    const hasActiveFilters = 
        projectFilter.value !== 'all' || 
        statusFilter.value !== 'all' || 
        scheduleFilter.value !== 'all' || 
        autoscalingFilter.value !== 'all' ||
        instanceSizeFilter.value !== 'all' || 
        searchInput.value.trim() !== '';
    
    // If we have active filters, preserve them
    loadAllClusters(hasActiveFilters);
});

projectFilter.addEventListener('change', handleProjectFilterChange);
statusFilter.addEventListener('change', applyFilters);
scheduleFilter.addEventListener('change', applyFilters);
autoscalingFilter.addEventListener('change', applyFilters);

// Call loadAllClusters directly (it was previously called from DOMContentLoaded)
loadAllClusters();
instanceSizeFilter.addEventListener('change', applyFilters);
searchInput.addEventListener('input', applyFilters);
exportCSV.addEventListener('click', exportAsCSV);
exportJSON.addEventListener('click', exportAsJSON);
savePauseScheduleBtn.addEventListener('click', savePauseSchedule);
manageProjectBtn.addEventListener('click', navigateToProjectPage);

// Load all clusters from all projects
async function loadAllClusters(preserveFilters = false) {
    // Save current filters if needed
    let currentFilters = {};
    if (preserveFilters) {
        currentFilters = {
            project: projectFilter.value,
            status: statusFilter.value,
            schedule: scheduleFilter.value,
            autoscaling: autoscalingFilter.value,
            instanceSize: instanceSizeFilter.value,
            search: searchInput.value
        };
    }
    
    // Reset UI
    loadingSummary.classList.remove('d-none');
    errorSummary.classList.add('d-none');
    summaryTable.classList.add('d-none');
    
    // Only hide filters if we're not preserving them
    if (!preserveFilters) {
        filterControls.classList.add('d-none');
        statsSummary.classList.add('d-none');
    }
    
    try {
        allClusters = await fetchClusterSummary();
        
        if (allClusters.length === 0) {
            loadingSummary.textContent = 'No clusters found.';
            return;
        }
        
        // Extract unique instance sizes for filter
        uniqueInstanceSizes = new Set();
        uniqueProjects = new Set();
        allClusters.forEach(cluster => {
            if (cluster.instanceSize && cluster.instanceSize !== 'N/A') {
                uniqueInstanceSizes.add(cluster.instanceSize);
            }
            if (cluster.projectId && cluster.projectName) {
                uniqueProjects.add(JSON.stringify({id: cluster.projectId, name: cluster.projectName}));
            }
        });
        
        // Populate instance size filter
        instanceSizeFilter.innerHTML = '<option value="all">All Instance Sizes</option>';
        Array.from(uniqueInstanceSizes).sort().forEach(size => {
            const option = document.createElement('option');
            option.value = size;
            option.textContent = size;
            instanceSizeFilter.appendChild(option);
        });
        
        // Populate project filter
        projectFilter.innerHTML = '<option value="all">All Projects</option>';
        Array.from(uniqueProjects)
            .map(project => JSON.parse(project))
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(project => {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = project.name;
                projectFilter.appendChild(option);
            });
        
        // Apply initial filters (showing all)
        if (preserveFilters) {
            // Restore filter settings
            projectFilter.value = currentFilters.project;
            statusFilter.value = currentFilters.status;
            scheduleFilter.value = currentFilters.schedule;
            autoscalingFilter.value = currentFilters.autoscaling;
            instanceSizeFilter.value = currentFilters.instanceSize;
            searchInput.value = currentFilters.search;
            
            // Apply the filters
            applyFilters();
        } else {
            // Standard initialization with all filters
            applyFilters();
        }
        
        // Show controls
        loadingSummary.classList.add('d-none');
        filterControls.classList.remove('d-none');
        statsSummary.classList.remove('d-none');
        summaryTable.classList.remove('d-none');
        
    } catch (error) {
        console.error('Error loading clusters summary:', error);
        loadingSummary.classList.add('d-none');
        errorSummary.classList.remove('d-none');
        errorSummary.textContent = `Error loading clusters summary: ${error.message}`;
    }
}

// Apply filters to the clusters data
function applyFilters() {
    const projectValue = projectFilter.value;
    const statusValue = statusFilter.value;
    const scheduleValue = scheduleFilter.value;
    const autoscalingValue = autoscalingFilter.value;
    const sizeValue = instanceSizeFilter.value;
    const searchValue = searchInput.value.toLowerCase();
    
    filteredClusters = allClusters.filter(cluster => {
        // Project filter
        if (projectValue !== 'all' && cluster.projectId !== projectValue) {
            return false;
        }
        
        // Status filter
        if (statusValue !== 'all' && cluster.status !== statusValue) {
            return false;
        }
        
        // Schedule filter
        if (scheduleValue !== 'all') {
            const hasSchedule = cluster.hasPauseSchedule ? 'true' : 'false';
            if (hasSchedule !== scheduleValue) {
                return false;
            }
        }
        
        // Autoscaling filter
        if (autoscalingValue !== 'all') {
            const hasAutoscaling = cluster.autoscaling ? 'true' : 'false';
            if (hasAutoscaling !== autoscalingValue) {
                return false;
            }
        }
        
        // Instance size filter
        if (sizeValue !== 'all' && cluster.instanceSize !== sizeValue) {
            return false;
        }
        
        // Search filter (across multiple fields)
        if (searchValue) {
            const searchFields = [
                cluster.projectName,
                cluster.clusterName,
                cluster.mongoOwner,
                cluster.instanceSize
            ].filter(Boolean).map(field => field.toLowerCase());
            
            return searchFields.some(field => field.includes(searchValue));
        }
        
        return true;
    });
    
    // Update UI with filtered data
    renderClusters();
    updateStats();
}

// Render clusters in the table
function renderClusters() {
    // Clear existing rows
    summaryTableBody.innerHTML = '';
    
    // Populate with filtered clusters
    filteredClusters.forEach(cluster => {
        const row = document.createElement('tr');
        
        // Status indicator
        const statusClass = getClusterStatusClass(cluster.status === 'Paused');
        
        // Pause schedule information
        let pauseScheduleDisplayText = formatPauseSchedule(cluster);
        let pauseScheduleClass = cluster.hasPauseSchedule ? 'has-schedule' : 'no-schedule';
        
        let pauseScheduleDisplay = `
            <span class="pause-schedule-badge ${pauseScheduleClass}">
                ${pauseScheduleDisplayText}
            </span>
        `;
        
        // Format create date
        let ageDisplay = cluster.ageInDays || 'N/A';
        
        // Format autoscaling display
        let autoscalingDisplay = cluster.autoscaling ? 
            '<span class="badge bg-success">Enabled</span>' : 
            '<span class="badge bg-secondary">Disabled</span>';
        
        row.innerHTML = `
            <td title="${cluster.projectId}">${cluster.projectName}</td>
            <td>${cluster.clusterName}</td>
            <td><span class="cluster-status ${statusClass}"></span> ${cluster.status}</td>
            <td>${cluster.instanceSize}</td>
            <td>${cluster.mongoDBVersion}</td>
            <td>${cluster.mongoOwner}</td>
            <td>${ageDisplay}</td>
            <td>${autoscalingDisplay}</td>
            <td>${pauseScheduleDisplay}</td>
            <td>
                <button class="btn btn-sm btn-primary configure-pause-btn"
                    data-cluster-name="${cluster.clusterName}"
                    data-project-id="${cluster.projectId}">
                    Configure
                </button>
            </td>
        `;
        
        // Add event listener to configure button
        const configureBtn = row.querySelector('.configure-pause-btn');
        configureBtn.addEventListener('click', () => openPauseScheduleModal(cluster));
        
        summaryTableBody.appendChild(row);
    });
}

// Update stats counters
function updateStats() {
    // Count total filtered clusters
    totalClustersEl.textContent = filteredClusters.length;
    
    // Count active clusters
    const activeClusters = filteredClusters.filter(c => c.status === 'Active').length;
    activeClustersEl.textContent = activeClusters;
    
    // Count paused clusters
    const pausedClusters = filteredClusters.filter(c => c.status === 'Paused').length;
    pausedClustersEl.textContent = pausedClusters;
    
    // Count clusters with no schedule
    const noScheduleClusters = filteredClusters.filter(c => !c.hasPauseSchedule).length;
    noScheduleClustersEl.textContent = noScheduleClusters;
}

// Open pause schedule configuration modal
function openPauseScheduleModal(cluster) {
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
        
        // Refresh cluster list with preserved filters
        await loadAllClusters(true);
        
    } catch (error) {
        console.error('Error updating cluster:', error);
        showNotification('Error', `Failed to update cluster: ${error.message}`, true);
    }
}

// Export as CSV
function exportAsCSV() {
    // Define headers
    const headers = [
        'Project Name',
        'Project ID',
        'Cluster Name',
        'Status',
        'Instance Size',
        'MongoDB Version',
        'MongoDB Owner',
        'Customer Contact',
        'Age (Days)',
        'Autoscaling',
        'Has Pause Schedule',
        'Pause Hour',
        'Pause Days',
        'Timezone'
    ];
    
    // Convert data to CSV rows
    const rows = filteredClusters.map(c => [
        c.projectName || '',
        c.projectId || '',
        c.clusterName || '',
        c.status || '',
        c.instanceSize || '',
        c.mongoDBVersion || '',
        c.mongoOwner || '',
        c.customerContact || '',
        c.ageInDays || '',
        c.autoscaling ? 'Enabled' : 'Disabled',
        c.hasPauseSchedule ? 'Yes' : 'No',
        c.pauseHour !== undefined ? c.pauseHour : '',
        c.pauseDaysOfWeek ? c.pauseDaysOfWeek.join(',') : '',
        c.timezone || ''
    ]);
    
    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    
    rows.forEach(row => {
        // Properly escape values with quotes if they contain commas
        const escapedRow = row.map(value => {
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
        });
        csvContent += escapedRow.join(',') + '\n';
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `clusters-summary-${formatDate(new Date())}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Export as JSON
function exportAsJSON() {
    const jsonData = JSON.stringify(filteredClusters, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `clusters-summary-${formatDate(new Date())}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Format date for filenames
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

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

// Handle project filter change
function handleProjectFilterChange(event) {
    // Show or hide the manage project button based on selection
    const selectedProjectId = event.target.value;
    
    if (selectedProjectId !== 'all') {
        manageProjectBtnContainer.style.display = 'block';
        manageProjectBtn.setAttribute('data-project-id', selectedProjectId);
        
        // Get project name for the button tooltip
        const selectedOption = event.target.options[event.target.selectedIndex];
        const projectName = selectedOption.textContent;
        manageProjectBtn.setAttribute('title', `Manage project: ${projectName}`);
    } else {
        manageProjectBtnContainer.style.display = 'none';
    }
    
    // Also apply the filters
    applyFilters();
}

// Navigate to the project-specific page
function navigateToProjectPage(event) {
    event.preventDefault();
    const projectId = manageProjectBtn.getAttribute('data-project-id');
    if (projectId) {
        // Navigate to the project page with the ID pre-selected
        window.location.href = `manage.html?projectId=${encodeURIComponent(projectId)}`;
    }
}

// Remove schedule button handler
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
        
        // Refresh the clusters data with preserved filters
        await loadAllClusters(true);
        
    } catch (error) {
        console.error('Error removing schedule:', error);
        showNotification('Error', error.message, true);
    }
});

// Close the DOMContentLoaded event handler from the top of the file
});