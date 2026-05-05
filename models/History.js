import mongoose from 'mongoose';

const historySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  filename: { type: String, required: true },
  fileType: { type: String, enum: ['pdf', 'txt', 'youtube', 'ppt', 'file', 'link', 'video'], required: true },
  summary: { type: String, required: true },
  quiz: { type: Array, default: [] },
  flashcards: { type: Array, default: [] },
  bestQuizScore: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('History', historySchema);
