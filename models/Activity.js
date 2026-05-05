import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: String,
  filename: String,
  fileType: String,
  status: { type: String, enum: ['success', 'error', 'processing', 'stopped', 'quiz_complete'], default: 'success' },
  metadata: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Activity', activitySchema);
