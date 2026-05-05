import mongoose from 'mongoose';
import 'dotenv/config';

console.log("Attempting to connect to:", process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log("✅ Successfully connected to MongoDB!");
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ MongoDB Connection Error Details:");
    console.error(err);
    process.exit(1);
  });
