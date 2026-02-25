require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

mongoose.connect(uri)
    .then(async () => {
        try {
            await mongoose.connection.db.dropCollection('announcements');
            console.log('Announcements collection dropped successfully.');
        } catch (e) { console.log('No announcements collection found or already dropped.'); }

        try {
            await mongoose.connection.db.dropCollection('tasks');
            console.log('Tasks collection dropped successfully.');
        } catch (e) { console.log('No tasks collection found or already dropped.'); }

        // Also remove team members from the users collection except the super admin
        try {
            const User = require('./models').User;
            if (User) {
                const result = await User.deleteMany({ teamId: { $ne: 'FTWSJ01' } });
                console.log(`Deleted ${result.deletedCount} team members from users collection.`);
            }
        } catch (e) { console.log('Error cleaning up users collection:', e.message); }

        console.log('Database cleanup complete.');
        process.exit(0);
    })
    .catch(err => {
        console.error('Connection error:', err);
        process.exit(1);
    });
