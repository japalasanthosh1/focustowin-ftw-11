const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// --- User Model (Admins/Core) ---
const userSchema = new mongoose.Schema({
    teamId: { type: String, required: true, unique: true },
    passkey: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['super_lead', 'lead', 'core_lead', 'college_lead', 'coordinator'], default: 'coordinator' },
    organization: { type: String, default: 'Headquarters' }, // e.g. "Stanford", "MIT"
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    permissions: {
        canManageVideos: { type: Boolean, default: false },
        canManageEvents: { type: Boolean, default: false },
        canManageTopRated: { type: Boolean, default: false },
        canApproveApps: { type: Boolean, default: false },
        canManageTeam: { type: Boolean, default: false }
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

// --- Announcement Model ---
const announcementSchema = new mongoose.Schema({
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'low' }
}, { timestamps: true });

const Announcement = mongoose.model('Announcement', announcementSchema);

// --- Task Model ---
const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    dueDate: { type: Date }
}, { timestamps: true });

const Task = mongoose.model('Task', taskSchema);

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

module.exports = { User, Application, Event, Video, TopRated, Announcement, Task };
