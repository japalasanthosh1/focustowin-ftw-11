const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Application, Event, Video, TopRated, Announcement, Task } = require('./models');

const JWT_SECRET = process.env.JWT_SECRET || 'ftw_super_secret_key_2026';

// Middleware to verify JWT
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};

const metascraper = require('metascraper')([
    require('metascraper-title')(),
    require('metascraper-description')(),
    require('metascraper-image')()
]);
// Using dynamic import for 'got' since it's an ESM package in newer versions, 
// but require('got') still works for v11 which is likely installed.
let got;
(async () => {
    try { got = (await import('got')).default; } catch { got = require('got'); }
})();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
// Serve static files (the ftw frontend)
app.use(express.static(__dirname));

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ftw_community';
mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('Connected to MongoDB');
        // --- Auto-Seed Initial Admin & Videos ---
        try {
            console.log('Ensuring default super_admin account exists...');
            const adminExists = await User.findOne({ teamId: 'FTWSJ01' });
            if (!adminExists) {
                const admin = new User({
                    teamId: 'FTWSJ01',
                    passkey: '12345678',
                    role: 'super_admin',
                    name: 'System Admin',
                    organization: 'Headquarters',
                    isActive: true,
                    isFirstLogin: false,
                    permissions: {
                        canManageVideos: true,
                        canManageEvents: true,
                        canManageTopRated: true,
                        canApproveApps: true,
                        canManageTeam: true
                    }
                });
                await admin.save();
            }


            const videoCount = await Video.countDocuments();
            if (videoCount === 0) {
                console.log('Seeding default Featured Video...');
                await new Video({ title: 'FTW Introduction', youtubeId: '9VlvbpXwLJs', priority: 1 }).save();
            }
        } catch (seedErr) {
            console.error('Error during database seeding:', seedErr);
        }
    })
    .catch(err => console.error('MongoDB connection error:', err));

// --- API Routes ---

// 1. Submit Application (Public Join Form)
app.post('/api/applications', async (req, res) => {
    try {
        const newApp = new Application(req.body);
        await newApp.save();
        res.status(201).json({ message: 'Application submitted successfully', application: newApp });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// 2. Fetch Applications (Admin Dashboard)
app.get('/api/applications', authMiddleware, async (req, res) => {
    try {
        const apps = await Application.find().sort({ appliedAt: -1 }); // Newest first
        res.json(apps);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/applications/:id/status', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['approved', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const updatedApp = await Application.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!updatedApp) return res.status(404).json({ error: 'Application not found' });
        res.json({ message: 'Status updated', application: updatedApp });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/applications/:id', authMiddleware, async (req, res) => {
    try {
        const deletedApp = await Application.findByIdAndDelete(req.params.id);
        if (!deletedApp) return res.status(404).json({ error: 'Application not found' });
        res.json({ message: 'Application deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Admin Authentication
app.post('/api/login', async (req, res) => {
    const { teamId, passkey } = req.body;
    try {
        const user = await User.findOne({ teamId });
        if (!user || !(await user.comparePasskey(passkey))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!user.isActive) {
            return res.status(403).json({ error: 'Your account has been locked. Please contact a Super Admin.' });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user._id, role: user.role, organization: user.organization },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                teamId: user.teamId,
                name: user.name,
                role: user.role,
                organization: user.organization,
                permissions: user.permissions,
                isFirstLogin: user.isFirstLogin
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Dashboard Stats Summary
app.get('/api/stats', async (req, res) => {
    try {
        const totalMembers = await User.countDocuments();
        const pendingApps = await Application.countDocuments({ status: 'pending' });

        // Mock data for Events as we haven't built event creation yet
        const upcomingRSVPs = 312;

        res.json({
            totalMembers: totalMembers > 0 ? totalMembers : 1420, // Fallback to demo numbers if DB empty
            pendingApps,
            upcomingRSVPs
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Team Management API
app.get('/api/team', authMiddleware, async (req, res) => {
    try {
        const { org, role } = req.query;
        let query = {};

        // Scoped access: if not super_admin, only see members of the same organization
        if (role === 'lead' && org && org !== 'Headquarters') {
            query.organization = org;
        }

        const team = await User.find(query).sort({ organization: 1, role: 1 });
        res.json(team);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/team/next-coordinator-id', authMiddleware, async (req, res) => {
    try {
        // Find all users with teamId starting with FTWCCTG
        const coordinators = await User.find({ teamId: /^FTWCCTG/ });

        let maxIdNum = 160; // Base starting point if DB is empty or has less

        coordinators.forEach(c => {
            const match = c.teamId.match(/FTWCCTG2026(\d+)/);
            if (match && match[1]) {
                const num = parseInt(match[1], 10);
                if (num > maxIdNum) maxIdNum = num;
            }
        });

        const nextIdNum = maxIdNum + 1;
        const nextIdStr = `FTWCCTG2026${nextIdNum.toString().padStart(3, '0')}`;

        res.json({ nextId: nextIdStr });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/team', authMiddleware, async (req, res) => {
    try {
        const { teamId, passkey, name, role, organization } = req.body;
        const newUser = new User({
            teamId,
            passkey,
            name,
            role,
            organization,
            permissions: {
                canManageVideos: role === 'super_admin',
                canManageEvents: role === 'super_admin',
                canManageTopRated: role === 'super_admin',
                canApproveApps: role === 'super_admin',
                canManageTeam: role === 'super_admin'
            }
        });
        await newUser.save();
        res.status(201).json(newUser);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/api/team/:id/permissions', authMiddleware, async (req, res) => {
    try {
        const { permissions, role, organization, isActive } = req.body;
        const updateData = {};
        if (permissions) updateData.permissions = permissions;
        if (role) updateData.role = role;
        if (organization) updateData.organization = organization;
        if (typeof isActive !== 'undefined') updateData.isActive = isActive;

        const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!updatedUser) return res.status(404).json({ error: 'User not found' });
        res.json(updatedUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/team/:id/update-id', authMiddleware, async (req, res) => {
    try {
        const { teamId } = req.body;
        const updatedUser = await User.findByIdAndUpdate(req.params.id, { teamId }, { new: true });
        if (!updatedUser) return res.status(404).json({ error: 'User not found' });
        res.json(updatedUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// General fetch by ID
app.get('/api/team/:id', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Comprehensive update
app.put('/api/team/:id', authMiddleware, async (req, res) => {
    try {
        const updateData = req.body;
        // Basic security: don't allow updating password through this endpoint 
        // (use /api/profile/password or similar instead)
        delete updateData.passkey;

        const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!updatedUser) return res.status(404).json({ error: 'User not found' });
        res.json(updatedUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- User Profile/Onboarding APIs ---
app.post('/api/profile/complete', authMiddleware, async (req, res) => {
    try {
        const { userId, newPasskey, bio, skills, phone, socialLinks, organization } = req.body;

        const userCheck = await User.findById(userId);
        if (!userCheck) return res.status(404).json({ error: 'User not found' });

        // Final "one-time" enforcement
        if (userCheck.role === 'coordinator' && !userCheck.isFirstLogin) {
            return res.status(403).json({ error: 'Profile is already locked. Contact your lead for changes.' });
        }

        const updateData = {
            passkey: newPasskey,
            bio,
            skills: Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()) : []),
            phone,
            socialLinks,
            isFirstLogin: false // Mark onboarding as complete
        };

        if (organization) updateData.organization = organization;

        const user = await User.findByIdAndUpdate(userId, updateData, { new: true });
        res.json({ message: 'Profile setup complete!', user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/profile/password', async (req, res) => {
    try {
        const { userId, currentPasskey, newPasskey } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (user.passkey !== currentPasskey) {
            return res.status(401).json({ error: 'Current passkey is incorrect' });
        }

        user.passkey = newPasskey;
        await user.save();
        res.json({ message: 'Passkey updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/team/:id', authMiddleware, async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (!deletedUser) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'Team member removed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Announcements API
app.get('/api/announcements', async (req, res) => {
    try {
        const announcements = await Announcement.find().populate('author', 'name').sort({ createdAt: -1 });
        res.json(announcements);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/announcements', authMiddleware, async (req, res) => {
    try {
        const { content, authorId, priority } = req.body;
        const newAnnouncement = new Announcement({ content, author: authorId, priority });
        await newAnnouncement.save();
        res.status(201).json(newAnnouncement);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// 7. Task Management API
app.get('/api/tasks', authMiddleware, async (req, res) => {
    try {
        const tasks = await Task.find().populate('assignedTo', 'name teamId').sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/tasks', authMiddleware, async (req, res) => {
    try {
        const { title, description, assignedTo, dueDate, priority } = req.body;
        const newTask = new Task({ title, description, assignedTo, dueDate, priority });
        await newTask.save();
        res.status(201).json(newTask);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/api/tasks/:id', authMiddleware, async (req, res) => {
    try {
        const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedTask) return res.status(404).json({ error: 'Task not found' });
        res.json(updatedTask);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 8. Videos API (Multiple Featured Videos)
app.get('/api/videos', async (req, res) => {
    try {
        const videos = await Video.find().sort({ priority: 1, createdAt: -1 }); // Priority 1 first, then newest
        res.json(videos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/videos', async (req, res) => {
    try {
        const { title, youtubeUrl, priority } = req.body;

        let videoId = youtubeUrl;
        try {
            if (youtubeUrl.includes('youtube.com/watch')) {
                const urlParams = new URLSearchParams(new URL(youtubeUrl).search);
                videoId = urlParams.get('v');
            } else if (youtubeUrl.includes('youtu.be/')) {
                videoId = youtubeUrl.split('youtu.be/')[1].split('?')[0];
            } else if (youtubeUrl.includes('youtube.com/live/')) {
                videoId = youtubeUrl.split('youtube.com/live/')[1].split('?')[0];
            }
        } catch (e) { } // Fallback to raw ID

        if (!videoId || videoId.trim() === '') {
            return res.status(400).json({ error: "Invalid YouTube URL" });
        }

        const newVideo = new Video({ title, youtubeId: videoId, priority: parseInt(priority) || 2 });
        await newVideo.save();
        res.status(201).json(newVideo);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/videos/:id', async (req, res) => {
    try {
        await Video.findByIdAndDelete(req.params.id);
        res.json({ message: 'Video deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Events
app.get('/api/events', async (req, res) => {
    try {
        // Only fetch events where the date is today or in the future
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today

        const events = await Event.find({ date: { $gte: today } }).sort({ date: 1 }); // Soonest first
        res.json(events);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/events', authMiddleware, async (req, res) => {
    try {
        const newEvent = new Event(req.body);
        await newEvent.save();
        res.status(201).json(newEvent);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/events/:id', authMiddleware, async (req, res) => {
    try {
        await Event.findByIdAndDelete(req.params.id);
        res.json({ message: 'Event deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 7. Top Rated
app.get('/api/toprated', async (req, res) => {
    try {
        const items = await TopRated.find().sort({ createdAt: -1 }).limit(10); // Show newest 10
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/toprated', authMiddleware, async (req, res) => {
    try {
        const { tag, url, highlight } = req.body;

        // --- 1. Auto-Scrape the Metadata from the URL ---
        let title = "Featured Content";
        let description = "Check out this link.";
        let imageUrl = "";

        try {
            const { body: html, url: finalUrl } = await got(url);
            const metadata = await metascraper({ html, url: finalUrl });

            title = metadata.title || title;
            description = metadata.description || description;
            imageUrl = metadata.image || "";

            // Twitter specific fallback since Twitter often blocks scrapers without API keys
            if (url.includes('twitter.com') || url.includes('x.com')) {
                if (title === "Featured Content") title = "Featured Tweet";
            }
        } catch (scrapeErr) {
            console.error("Scraping failed for URL, using fallback:", url, scrapeErr.message);
        }

        const newItem = new TopRated({ tag, url, title, description, imageUrl, highlight });
        await newItem.save();
        res.status(201).json(newItem);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/toprated/:id', authMiddleware, async (req, res) => {
    try {
        const { tag, url, highlight } = req.body;

        let title = "Featured Content";
        let description = "Check out this link.";
        let imageUrl = "";

        // Scrape new metadata if the URL was updated
        try {
            const { body: html, url: finalUrl } = await got(url);
            const metadata = await metascraper({ html, url: finalUrl });
            title = metadata.title || title;
            description = metadata.description || description;
            imageUrl = metadata.image || "";
        } catch (scrapeErr) {
            console.error("Scraping failed for URL during update, using fallback:", url, scrapeErr.message);
        }

        const updated = await TopRated.findByIdAndUpdate(
            req.params.id,
            { tag, url, title, description, imageUrl, highlight },
            { new: true }
        );
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/toprated/:id', authMiddleware, async (req, res) => {
    try {
        await TopRated.findByIdAndDelete(req.params.id);
        res.json({ message: 'Item deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
