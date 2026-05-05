import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { fetchTranscript } from 'youtube-transcript/dist/youtube-transcript.esm.js';

import authRoutes from './routes/authRoutes.js';
import { protect, adminOnly } from './middleware/authMiddleware.js';
import History from './models/History.js';
import Activity from './models/Activity.js';
import User from './models/User.js';
import ChatLog from './models/ChatLog.js';
import { jsonrepair } from 'jsonrepair';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';

const app = express();

// ─── Rate Limiters ─────────────────────────────────────────────────────────────
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // 5 requests per 15 mins
  keyGenerator: (req, res) => req.user?._id?.toString() || ipKeyGenerator(req, res),
  message: { error: 'Too many requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const PORT = process.env.PORT || 3001;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ─── Database ──────────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    // Cleanup: Mark any stuck 'processing' items as 'error' on startup
    try {
      const result = await Activity.updateMany(
        { status: 'processing' },
        { status: 'error' }
      );
      if (result.modifiedCount > 0) {
        console.log(`🧹 Cleaned up ${result.modifiedCount} stale processing activities.`);
      }
    } catch (err) {
      console.error('Failed to cleanup activities:', err);
    }
  })
  .catch((err) => {
    console.error('❌ MongoDB error:', err.message);
    process.exit(1);
  });

// ─── Auth Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ─── Helpers ───────────────────────────────────────────────────────────────────
const extractJson = (text) => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    let raw = text;
    // Look for JSON block or any content between curly braces
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || text.match(/{[\s\S]*}/);
    if (match) {
      raw = match[1] || match[0];
    }
    try {
      return JSON.parse(raw);
    } catch (e2) {
      try {
        return JSON.parse(jsonrepair(raw));
      } catch (e3) {
        console.error('Final JSON Parse Error:', e3.message);
        return null;
      }
    }
  }
};

// ─── POST /api/analyze — Analyze document (protected) ─────────────────────────
app.post('/api/analyze', protect, aiLimiter, async (req, res) => {
  const { textToAnalyze, filename, fileType } = req.body;
  let activityLog = null;
  if (!textToAnalyze) return res.status(400).json({ error: 'No text provided.' });

  const safeFileType = (() => {
    const t = (fileType || 'file').toLowerCase();
    const allowed = ['pdf', 'txt', 'youtube', 'ppt', 'file', 'link', 'video'];
    return allowed.includes(t) ? t : 'file';
  })();

  try {
    // 1. Create early activity log for 'real-time' tracking
    activityLog = await Activity.create({
      userId: req.user._id,
      userName: req.user.name,
      filename: filename || 'Untitled',
      fileType: safeFileType,
      status: 'processing',
    });

    let attempts = 0;
    const maxAttempts = 2;
    let aiData;

    while (attempts < maxAttempts) {
      try {
        const aiResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'meta/llama-3.1-70b-instruct',
            temperature: 0.2,
            max_tokens: 4096,
            messages: [
              {
                role: 'system',
                content: `Act as a world-class Academic and Professional Study Architect. Analyze the provided document and return a CONCISE but HIGH-QUALITY JSON object.
Your response MUST be ONLY the JSON object, with no preamble and no markdown code blocks.
Structure:
{
  "summary": "## EXHAUSTIVE EXECUTIVE OVERVIEW\\n\\n[Provide a comprehensive but concise high-level overview of the entire document...]\\n\\n## CORE CONCEPTS & DEFINITIVE TOPICS\\n\\n* **[Concept Name]**: [Detailed, easy-to-understand explanation of the concept...]\\n* **[Concept Name]**: [Explanation...]\\n\\n## LONG-FORM DEEP DIVE ANALYSIS\\n\\n[Detailed breakdown, nuanced details, and final takeaways...]",
  "quiz": [
    { "question": "Question text?", "options": ["Option A", "Option B", "Option C", "Option D"], "answer": 0 }
  ],
  "flashcards": [
    { "front": "Key Term", "back": "Simplified definition" }
  ]
}
Return valid JSON ONLY. 
1. Provide a VERY DETAILED and comprehensive summary that is EASY TO UNDERSTAND. 
2. Organise the summary exactly using the three headers provided above.
3. MANDATORY: Every header and every paragraph MUST be separated by EXACTLY two newline characters (\\\\n\\\\n). 
4. You MUST generate 10 quiz questions and 10 flashcards strictly based on the summary.
5. Use bullet points formatted exactly like '* **Topic**: Description' for concepts.`,
              },
              {
                role: 'user',
                content: `Analyze this document and provide a detailed study guide. 
                Document: ${textToAnalyze.substring(0, 20000)}`
              }
            ],
          }),
        });

        if (aiResponse.status === 504 && attempts < maxAttempts - 1) {
          console.warn(`⚠️ NVIDIA API 504 Timeout. Retrying attempt ${attempts + 1}...`);
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          throw new Error(`NVIDIA API Error: ${aiResponse.status} - ${errorText}`);
        }

        aiData = await aiResponse.json();
        break; // Success
      } catch (err) {
        if (attempts >= maxAttempts - 1) throw err;
        console.warn(`⚠️ Request failed: ${err.message}. Retrying...`);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    let raw = aiData.choices?.[0]?.message?.content || '';
    console.log('--- RAW AI RESPONSE START ---');
    console.log(raw);
    console.log('--- RAW AI RESPONSE END ---');

    // Robust JSON extraction
    const parsed = extractJson(raw);
    if (!parsed) {
      console.error('❌ AI Response Parsing Failed. Raw start:', raw.substring(0, 100));
      throw new Error('AI response was too malformed to parse. Please try again.');
    }

    console.log(`✅ AI Analysis Successful: Summary length ${parsed.summary?.length}, Quiz: ${parsed.quiz?.length}, Flashcards: ${parsed.flashcards?.length}`);

    // Case-insensitive summary extraction + fallback to prevent validation error
    const finalSummary = parsed.summary || parsed.Summary || parsed.overview || parsed.Overview || 'Summary could not be generated for this document section.';

    // Extract results
    let quiz = [];
    if (Array.isArray(parsed.quiz)) quiz = parsed.quiz;
    else if (parsed.quiz?.questions) quiz = parsed.quiz.questions;

    let flashcards = [];
    if (Array.isArray(parsed.flashcards)) flashcards = parsed.flashcards;
    else if (parsed.flashcards?.cards) flashcards = parsed.flashcards.cards;

    const entry = await History.create({
      userId: req.user._id,
      filename: filename || 'Untitled',
      fileType: safeFileType,
      summary: finalSummary,
      quiz,
      flashcards,
    });

    // 2. Finalize activity log as success ONLY if it wasn't stopped by the user
    await Activity.findOneAndUpdate(
      { _id: activityLog._id, status: 'processing' },
      { status: 'success' }
    );

    res.json({ summary: finalSummary, quiz, flashcards, historyId: entry._id });
  } catch (err) {
    console.error('Backend Analysis Error:', err);
    
    // 3. Update activity log to error if initialized
    if (activityLog && activityLog._id) {
      try {
         await Activity.findOneAndUpdate(
           { _id: activityLog._id, status: 'processing' },
           { status: 'error' }
         );
      } catch (e) {}
    }

    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/chat — Chat with document (protected) ─────────────────────────
app.post('/api/chat', protect, aiLimiter, async (req, res) => {
  const { question, context, historyId } = req.body;
  if (!question || !context) return res.status(400).json({ error: 'Question and context are required.' });

  try {
    const aiResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY || process.env.VITE_NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.NVIDIA_MODEL || process.env.VITE_NVIDIA_MODEL || 'meta/llama-3.1-70b-instruct',
        temperature: 0.3, 
        max_tokens: 1512,
        messages: [
          {
            role: 'system',
            content: `You are IntDoc AI, an expert academic assistant designed for high-precision document analysis.
Your primary objective is to provide accurate, factual, and strictly context-aware answers based ONLY on the provided document text.

CORE DIRECTIVES:
1. EVIDENCE-BASED: Base every statement on the provided context. If a user asks something not present in the text, explicitly state: "I'm sorry, but that specific information isn't available in the document provided."
2. NO HALLUCINATIONS: Do not invent facts, dates, or details. Accuracy is more important than being helpful for out-of-context topics.
3. STRUCTURED ANSWERS: Use bullet points for complex explanations to improve readability.
4. TONE: Professional, concise, and academic.

[CONTEXT START]
${(context || '').substring(0, 18000)}
[CONTEXT END]`,
          },
          { role: 'user', content: question },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`NVIDIA API Error: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices?.[0]?.message?.content || 'No answer generated.';

    await ChatLog.create({
      userId: req.user._id,
      historyId: historyId || null,
      userName: req.user.name,
      question,
      aiResponse: answer
    });

    res.json({ answer });
  } catch (err) {
    console.error('Backend Chat Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/extract-video — YouTube transcript (protected) ─────────────────
app.post('/api/extract-video', protect, async (req, res) => {
  const { videoUrl } = req.body;
  if (!videoUrl) return res.status(400).json({ error: 'videoUrl is required.' });
  if (!videoUrl.includes('youtube.com') && !videoUrl.includes('youtu.be'))
    return res.status(400).json({ error: 'Only YouTube URLs are currently supported.' });

  // Sanitize URL: extract video ID to avoid tracking param issues
  let vId = '';
  try {
    if (videoUrl.includes('youtu.be/')) {
      vId = videoUrl.split('youtu.be/')[1].split(/[?#]/)[0];
    } else {
      vId = new URL(videoUrl).searchParams.get('v');
    }
  } catch (e) {
    console.warn('URL parsing failed, using raw URL');
  }
  const cleanUrl = vId ? `https://www.youtube.com/watch?v=${vId}` : videoUrl;

  try {
    // Attempt to fetch English transcript first, then fallback to default
    let transcriptArr;
    try {
      transcriptArr = await fetchTranscript(cleanUrl, { lang: 'en' });
    } catch (e) {
      console.warn('English transcript failed, trying default...', e.message);
      transcriptArr = await fetchTranscript(cleanUrl);
    }
    
    if (!transcriptArr || transcriptArr.length === 0) {
      throw new Error('Transcript is empty.');
    }
    const fullTranscript = transcriptArr.map((t) => t.text).join(' ');
    res.json({ transcript: fullTranscript });
  } catch (err) {
    console.error('Transcript Extraction Error:', err);
    let userFriendlyMsg = 'Failed to extract transcript.';
    if (err.message.includes('Could not find')) {
      userFriendlyMsg = 'No captions found for this video. Please try a video that has subtitles/CC enabled.';
    } else if (err.message.includes('403') || err.message.includes('access')) {
      userFriendlyMsg = 'Access denied. This video might be private or age-restricted.';
    } else {
      userFriendlyMsg = `Extraction Error: ${err.message}. Make sure the video has public captions.`;
    }
    res.status(500).json({ error: userFriendlyMsg });
  }
});

// ─── GET /api/history — User document history (protected) ─────────────────────
app.get('/api/history', protect, async (req, res) => {
  try {
    const history = await History.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history.' });
  }
});

// ─── DELETE /api/history/:id — Delete a history entry (protected) ─────────────
app.delete('/api/history/:id', protect, async (req, res) => {
  try {
    const entry = await History.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!entry) return res.status(404).json({ error: 'Entry not found.' });
    res.json({ message: 'Deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete.' });
  }
});

// ─── GET /api/admin/activity — All platform activity (admin only) ─────────────
app.get('/api/admin/activity', protect, adminOnly, async (req, res) => {
  try {
    const activities = await Activity.find().sort({ createdAt: -1 }).limit(100);
    res.json({ activities });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity.' });
  }
});

// ─── GET /api/admin/stats — Dashboard metrics (admin only) ────────────────────
app.get('/api/admin/stats', protect, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const apiCallsToday = await Activity.countDocuments({ createdAt: { $gte: today } });
    const totalDocuments = await History.countDocuments();
    res.json({ totalUsers, apiCallsToday, totalDocuments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// ─── GET /api/admin/users — All users (admin only) ────────────────────────────
app.get('/api/admin/users', protect, adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const query = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    } : {};

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    console.log(`[ADMIN] Fetching users. Page: ${page}, Limit: ${limit}, Search: "${search}"`);
    const [users, total] = await Promise.all([
      User.find(query, '-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(query)
    ]);
    console.log(`[ADMIN] Found ${users.length} users out of ${total} total.`);

    res.json({
      users,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('[ADMIN] Fetch Users Error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ─── GET /api/admin/chats — All chats (admin only) ────────────────────────────
app.get('/api/admin/chats', protect, adminOnly, async (req, res) => {
  try {
    const chats = await ChatLog.find().sort({ createdAt: -1 }).limit(100);
    res.json({ chats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chats.' });
  }
});


// ─── GET /api/admin/history — All history (admin only) ────────────────────────
app.get('/api/admin/history', protect, adminOnly, async (req, res) => {
  try {
    const histories = await History.find().populate('userId', 'name email').sort({ createdAt: -1 }).limit(100);
    res.json({ histories });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history.' });
  }
});

// ─── DELETE /api/admin/users/:id — Delete user (admin only) ───────────────────
app.delete('/api/admin/users/:id', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[ADMIN] Deleting user: ${id}`);
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      console.warn(`[ADMIN] User not found for deletion: ${id}`);
      return res.status(404).json({ error: 'User not found.' });
    }
    
    const hist = await History.deleteMany({ userId: id });
    const chats = await ChatLog.deleteMany({ userId: id });
    const acts = await Activity.deleteMany({ userId: id });
    
    console.log(`[ADMIN] User deleted. Cascaded: ${hist.deletedCount} history, ${chats.deletedCount} chats, ${acts.deletedCount} activities.`);
    res.json({ message: 'User and associated data deleted.' });
  } catch (err) {
    console.error(`[ADMIN] Delete User Error:`, err);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

// ─── DELETE /api/admin/history/:id — Delete any history (admin only) ───────────
app.delete('/api/admin/history/:id', protect, adminOnly, async (req, res) => {
  try {
    const entry = await History.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Entry not found.' });
    res.json({ message: 'History entry deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete history.' });
  }
});

// ─── PATCH /api/history/:id/score — Update quiz score ─────────────────────────
app.patch('/api/history/:id/score', protect, async (req, res) => {
  const { score } = req.body;
  if (score === undefined) return res.status(400).json({ error: 'Score is required.' });

  try {
    const entry = await History.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: { bestQuizScore: score } },
      { new: true }
    );
    if (!entry) return res.status(404).json({ error: 'Entry not found.' });

    // Log this as a platform activity for the admin to see
    try {
      await Activity.create({
        userId: req.user._id,
        userName: req.user.name,
        filename: entry.filename,
        fileType: entry.fileType,
        status: 'quiz_complete',
        metadata: { score, totalQuestions: entry.quiz?.length || 0 }
      });
    } catch (actErr) {
      console.warn('Failed to log quiz activity:', actErr.message);
    }

    res.json({ message: 'Score updated successfully.', bestQuizScore: entry.bestQuizScore });
  } catch (err) {
    console.error('Score Update Error:', err);
    res.status(500).json({ error: 'Failed to update score.' });
  }
});

// ─── PATCH /api/activity/stop — User stops their processing ──────────────────
app.patch('/api/activity/stop', protect, async (req, res) => {
  try {
    const updated = await Activity.findOneAndUpdate(
      { userId: req.user._id, status: 'processing' },
      { status: 'stopped' },
      { sort: { createdAt: -1 }, new: true }
    );
    if (!updated) return res.status(404).json({ error: 'No active processing found.' });
    res.json({ message: 'Processing stopped.', activityId: updated._id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to stop activity.' });
  }
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[GLOBAL ERROR]', err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'An internal server error occurred.' 
      : err.message
  });
});

// ─── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`🚀 IntDoc.ai server running on http://localhost:${PORT}`);
  
  // Cleanup stuck activities from previous crashes
  try {
    const updated = await Activity.updateMany(
      { status: 'processing' },
      { $set: { status: 'error', metadata: { error: 'Server restarted during processing' } } }
    );
    if (updated.modifiedCount > 0) {
      console.log(`🧹 Cleaned up ${updated.modifiedCount} stuck processing activities.`);
    }
  } catch (e) {
    console.error('Failed to cleanup stuck activities:', e.message);
  }
});
