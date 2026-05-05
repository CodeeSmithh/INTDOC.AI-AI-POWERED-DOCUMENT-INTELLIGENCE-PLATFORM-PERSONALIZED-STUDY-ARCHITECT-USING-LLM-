import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

async function buildUser() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const email = 'user@intdoc.ai';
    const password = 'admin123';
    
    if (await User.findOne({ email })) {
        console.log(`✅ User ${email} already there`);
        process.exit(0);
    }

    await User.create({
        name: 'Student',
        email,
        password,
        role: 'user'
    });
    
    console.log(`✅ User created! Email: ${email} | Password: ${password}`);
    process.exit(0);
}

buildUser();
