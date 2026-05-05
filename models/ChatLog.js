import mongoose from 'mongoose';

const chatLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  historyId: { type: mongoose.Schema.Types.ObjectId, ref: 'History' },
  userName: { type: String, required: true },
  question: { type: String, required: true },
  aiResponse: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('ChatLog', chatLogSchema);
