const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schema for individual clusters within the 'clusters' array
const ClusterSchema = new Schema({
    name: { type: String, required: true }, // Used as the identifier for updates
    description: { type: String, default: '' },
    status: { type: String, default: '' }, // Moved to cluster level
    mongoOwner: { type: String, default: '' },
    customerContact: { type: String, default: '' },
    pauseHour: { type: Number, min: 0, max: 23 }, // Integer between 0 and 23
    pauseDaysOfWeek: { type: [Number] }, // Array of integers (0-6 for Sun-Sat)
    timezone: { type: String, default: 'America/New_York' },
    // Read-only fields (can be included for completeness if needed by the app, but not for this UI's update logic)
    ageInDays: { type: Number },
    createDate: { type: String }, // Or Date type if preferred
    instanceSize: { type: String },
    mongoDBVersion: { type: String },
    paused: { type: Boolean }
}, { _id: false }); // No separate _id for subdocuments unless explicitly needed

// Schema for the main project document
const ProjectSchema = new Schema({
    _id: { type: Schema.Types.ObjectId, auto: true }, // Or use the string projectId if that's the primary doc ID
    projectId: { type: String, required: true, unique: true }, // Application-specific project ID
    projectName: { type: String, required: true },
    clusters: [ClusterSchema], // Array of cluster subdocuments
}, { timestamps: true }); // Adds createdAt and updatedAt timestamps

module.exports = mongoose.model('Project', ProjectSchema, 'cluster_automation');