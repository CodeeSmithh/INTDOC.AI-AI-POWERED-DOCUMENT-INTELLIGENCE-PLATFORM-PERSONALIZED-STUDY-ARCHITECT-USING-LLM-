import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

async function createAdmin() {
  const args = process.argv.slice(2);
  const name = args[0] || 'Priyanshu';
  const email = args[1] || 'admin@intdoc.ai';
  const password = args[2] || 'priyanshu123';

  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`✅ Admin already exists: ${email}`);
    process.exit(0);
  }

  await User.create({
    name,
    email,
    password,
    role: 'admin',
  });

  console.log('✅ Admin user created successfully!');
  console.log(`   Name:     ${name}`);
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error('❌ Error creating admin:', err.message);
  process.exit(1);
});
