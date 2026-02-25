const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// --- User Model (Admins/Core) ---
const userSchema = new mongoose.Schema({
    teamId: { type: String, required: true, unique: true },
    email: { type: String, sparse: true, unique: true },
    passkey: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['super_admin', 'co_lead', 'executive_lead', 'core_team', 'college_lead', 'coordinator', 'member'], default: 'member' },
    collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', default: null },
    assignedCoreId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    organization: { type: String, default: 'Headquarters' }, // e.g. "Stanford", "MIT"
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    permissions: {
        canManageVideos: { type: Boolean, default: false },
        canManageEvents: { type: Boolean, default: false },
        canManageTopRated: { type: Boolean, default: false },
        canApproveApps: { type: Boolean, default: false }
    },
    isFirstLogin: { type: Boolean, default: true },
    phone: { type: String },
    bio: { type: String },
    skills: { type: [String] },
    socialLinks: {
        linkedin: { type: String },
        github: { type: String },
        twitter: { type: String }
    },
    profilePicture: { type: String }
}, { timestamps: true });

// Pre-save hook to hash password
userSchema.pre('save', async function () {
    if (!this.isModified('passkey')) return;
    try {
        const salt = await bcrypt.genSalt(12);
        this.passkey = await bcrypt.hash(this.passkey, salt);
    } catch (err) {
        throw err;
    }
});

// Method to compare password
userSchema.methods.comparePasskey = async function (candidatePasskey) {
    return await bcrypt.compare(candidatePasskey, this.passkey);
};

const User = mongoose.model('User', userSchema);


// --- Application Model (Join Form) ---
const applicationSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, enum: ['founder', 'engineer', 'student', 'investor'], required: true },
    socialUrl: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    appliedAt: { type: Date, default: Date.now }
});

const Application = mongoose.model('Application', applicationSchema);

// --- Event Model ---
const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    date: { type: Date, required: true },
    description: { type: String, required: true },
    location: { type: String },
    rsvps: { type: Number, default: 0 }
}, { timestamps: true });

const Event = mongoose.model('Event', eventSchema);

// --- Video Model (For Featured and Gallery videos) ---
const videoSchema = new mongoose.Schema({
    title: { type: String, required: true },
    youtubeId: { type: String, required: true },
    priority: { type: Number, default: 2 } // 1 = Main Homepage Feature, 2+ = Gallery
}, { timestamps: true });

const Video = mongoose.model('Video', videoSchema);

// --- Top Rated Model (For Trending Content Cards) ---
const topRatedSchema = new mongoose.Schema({
    tag: { type: String, required: true }, // e.g., 'BLOG', 'TWEET'
    url: { type: String, required: true },
    title: { type: String },
    description: { type: String },
    imageUrl: { type: String },
    highlight: { type: Boolean, default: false } // To apply the .highlight CSS class
}, { timestamps: true });

const TopRated = mongoose.model('TopRated', topRatedSchema);

// --- Community RBAC Models ---

// College Table
const collegeSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    collegeLeadId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const College = mongoose.model('College', collegeSchema);

// Core Team Assignment Table
const coreTeamAssignmentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    executiveLeadId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vertical: { type: String, required: true }, // Operations, Marketing, Tech, etc.
    assignedColleges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'College' }]
}, { timestamps: true });

const CoreTeamAssignment = mongoose.model('CoreTeamAssignment', coreTeamAssignmentSchema);

// Coordinator Assignment Table
const coordinatorAssignmentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const CoordinatorAssignment = mongoose.model('CoordinatorAssignment', coordinatorAssignmentSchema);

// Task Model (Kanban)
const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', default: null },
    status: { type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    dueDate: { type: Date }
}, { timestamps: true });

const Task = mongoose.model('Task', taskSchema);

// Weekly Report Model
const reportSchema = new mongoose.Schema({
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true },
    content: { type: String, required: true },
    metrics: { type: Object, default: {} }, // e.g., { attendees: 50, events_held: 2 }
    status: { type: String, enum: ['submitted', 'approved', 'rejected'], default: 'submitted' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

const Report = mongoose.model('Report', reportSchema);

module.exports = {
    User, Application, Event, Video, TopRated,
    College, CoreTeamAssignment, CoordinatorAssignment, Task, Report
};
