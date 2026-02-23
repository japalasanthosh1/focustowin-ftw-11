const mongoose = require('mongoose');
const { User } = require('./models');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ftw_community';

async function removeDashes() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({ teamId: { $regex: /-/ } });
        console.log(`Found ${users.length} users with dashes in their IDs.`);

        for (const user of users) {
            const oldId = user.teamId;
            const newId = oldId.replace(/-/g, '');
            user.teamId = newId;
            await user.save();
            console.log(`Updated: ${oldId} -> ${newId}`);
        }

        console.log('Migration complete.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

removeDashes();
