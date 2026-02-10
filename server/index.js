import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from project root .env (single source of truth)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// ============ SUPABASE CLIENT ============
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============ AUTH MIDDLEWARE ============
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = user;
  next();
}

// ============ RATE LIMITING MIDDLEWARE ============
const DAILY_GENERATION_LIMIT = 100;

async function checkRateLimit(req, res, next) {
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Check user profile for pro status (pro users get unlimited)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single();
  
  if (profile?.subscription_tier === 'pro') {
    return next(); // Pro users bypass rate limit
  }

  // Count today's generations
  const { count, error } = await supabase
    .from('daily_generations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', `${today}T00:00:00.000Z`)
    .lt('created_at', `${today}T23:59:59.999Z`);

  if (error) {
    console.error('Rate limit check error:', error);
    return next(); // Allow on error to not block users
  }

  if ((count || 0) >= DAILY_GENERATION_LIMIT) {
    return res.status(429).json({ 
      error: 'Daily generation limit reached', 
      limit: DAILY_GENERATION_LIMIT,
      message: `You have reached your daily limit of ${DAILY_GENERATION_LIMIT} generations. Upgrade to Pro for unlimited access.`
    });
  }

  next();
}

async function recordGeneration(userId, generationType) {
  const { error } = await supabase.from('daily_generations').insert({
    user_id: userId,
    generation_type: generationType,
  });
  if (error) console.error('Failed to record generation:', error);
}

// ============ MIDDLEWARE ============
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));

// Configure multer — in-memory storage (stateless for Cloud Run)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Root route for health check/verification
app.get('/', (req, res) => {
  res.send('Oqy+ API Server is running!');
});

app.get('/api', (req, res) => {
  res.send('Oqy+ API Endpoint');
});

// ============ HELPER FUNCTIONS ============

async function fixJsonWithAI(malformedJson, errorMessage, originalPrompt) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const fixPrompt = `The following JSON response has an error. Please fix it and return ONLY valid JSON.

Error message: ${errorMessage}
Original request context: ${originalPrompt}

Malformed JSON:
${malformedJson}

Return ONLY the corrected valid JSON, no explanations or markdown.`;

    const result = await model.generateContent(fixPrompt);
    let responseText = result.response.text();
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Failed to fix JSON with AI:', error);
    throw error;
  }
}

async function parseJsonWithRetry(responseText, originalPrompt, maxRetries = 2) {
  let lastError;
  let currentText = responseText;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      currentText = currentText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(currentText);
    } catch (error) {
      lastError = error;
      console.error(`JSON parse attempt ${attempt + 1} failed:`, error.message);
      if (attempt < maxRetries) {
        try {
          return await fixJsonWithAI(currentText, error.message, originalPrompt);
        } catch (fixError) {
          currentText = responseText;
        }
      }
    }
  }
  throw lastError;
}

async function readFileContent(buffer, mimeType, originalName = '') {
  try {
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      originalName.endsWith('.docx')
    ) {
      const mammoth = await import('mammoth');
      const result = await mammoth.default.extractRawText({ buffer });
      return result.value;
    } else if (
      mimeType === 'application/msword' ||
      originalName.endsWith('.doc')
    ) {
      try {
        const mammoth = await import('mammoth');
        const result = await mammoth.default.extractRawText({ buffer });
        return result.value;
      } catch {
        return buffer.toString('utf-8');
      }
    } else {
      return buffer.toString('utf-8');
    }
  } catch (error) {
    console.error('Error reading file:', error);
    return '';
  }
}

// Mime types that Gemini can process natively as inlineData
const GEMINI_NATIVE_MIMES = new Set([
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
  // PDF
  'application/pdf',
  // Audio
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac', 'audio/mp4',
  // Video
  'video/mp4', 'video/webm', 'video/mpeg', 'video/quicktime',
]);

function isGeminiNative(mimeType) {
  return GEMINI_NATIVE_MIMES.has(mimeType);
}

/**
 * Process uploaded files into Gemini content parts.
 * - Images, PDFs, audio, video → inlineData (base64)
 * - DOCX/DOC → text extraction via mammoth
 * - Text/MD/etc → text part
 * Returns { parts: Part[], descriptions: string[] }
 */
async function processFilesForGemini(files) {
  const parts = [];
  const descriptions = [];

  for (const file of files) {
    const { buffer, mimetype, originalname, size } = file;

    if (isGeminiNative(mimetype)) {
      // Send directly to Gemini as base64 inlineData
      parts.push({
        inlineData: {
          mimeType: mimetype,
          data: buffer.toString('base64'),
        },
      });
      const sizeMB = (size / (1024 * 1024)).toFixed(2);
      descriptions.push(`[${originalname}] sent as ${mimetype} (${sizeMB} MB) — native multimodal`);
      console.log(`[FILE] ${originalname} (${mimetype}, ${sizeMB} MB): sent as native inlineData`);
    } else {
      // Extract text for non-native types (docx, doc, txt, md, etc.)
      const content = await readFileContent(buffer, mimetype, originalname);
      if (content.trim()) {
        parts.push({
          text: `\n\n--- Content from ${originalname} ---\n${content}`,
        });
        descriptions.push(`[${originalname}] text extracted (${content.length} chars)`);
        console.log(`[FILE] ${originalname} (${mimetype}): ${content.length} chars extracted as text`);
      } else {
        descriptions.push(`[${originalname}] could not extract content`);
        console.warn(`[FILE] ${originalname}: empty content after extraction`);
      }
    }
  }

  return { parts, descriptions };
}

// ============ HEALTH CHECK ============
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ============ GENERATE ROADMAP ============
app.post('/api/generate-roadmap', requireAuth, checkRateLimit, upload.array('files'), async (req, res) => {
  try {
    const { prompt } = req.body;
    const files = req.files || [];

    const { parts: fileParts, descriptions } = await processFilesForGemini(files);
    if (descriptions.length) console.log(`[ROADMAP] Files: ${descriptions.join(', ')}`);

    const systemPrompt = `You are an expert educational course designer. Create a learning roadmap STRUCTURE based on the provided material/topic.

IMPORTANT: Generate the roadmap OUTLINE only. Detailed tasks and materials for each step will be generated separately when the user opens each step.

Return this exact JSON structure:

{
  "roadmap": {
    "title": "Course title",
    "description": "What this course teaches",
    "difficulty": "beginner" | "intermediate" | "advanced",
    "totalSteps": <number>,
    "steps": [
      {
        "id": "step-1",
        "stepNumber": 1,
        "title": "Step title - be specific and descriptive",
        "description": "Detailed description of what this step covers, learning objectives, and key concepts (3-5 sentences minimum)",
        "estimatedTime": "e.g., 45 mins or 1.5 hours",
        "tasks": [],
        "materials": [],
        "completed": false,
        "detailsLoaded": false,
        "unlocked": false
      }
    ]
  }
}

CRITICAL Guidelines:
1. The number of steps MUST be proportional to the material provided:
   - Short topic/little material: 3-5 steps
   - Medium topic/moderate material: 6-10 steps
   - Large topic/extensive material: 10-20 steps
   - Very comprehensive material (textbook, long PDF): 15-30 steps
2. Each step description must be detailed (3-5 sentences) explaining what will be learned
3. Determine the difficulty level based on the material complexity (beginner/intermediate/advanced)
4. Make step titles specific and descriptive (not generic like "Introduction")
5. Set "unlocked": true ONLY for the first step
6. Ensure logical progression from fundamentals to advanced concepts

Return ONLY valid JSON, no markdown or extra text.`;

    const userContent = `
${prompt ? `User's learning goal: ${prompt}` : ''}
${fileParts.length > 0 ? 'Analyze the uploaded files/images and use their content to create the learning roadmap.' : ''}

Please create a comprehensive learning roadmap.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent([
      { text: systemPrompt },
      { text: userContent },
      ...fileParts,
    ]);

    let responseText = result.response.text();
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let roadmapData;
    try {
      roadmapData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', responseText);
      throw new Error('Failed to parse AI response as JSON');
    }

    roadmapData.originalMaterials = descriptions.length ? descriptions.join('; ') : '';

    // Pre-generate first step details
    if (roadmapData.roadmap?.steps?.length > 0) {
      const firstStep = roadmapData.roadmap.steps[0];
      try {
        const stepSystemPrompt = `You are an expert educational content curator. Generate comprehensive learning content for step 1 of the course "${roadmapData.roadmap.title}".
Step: "${firstStep.title}" — ${firstStep.description}

Return JSON: {
  "tasks": [
    { "id": "task-1-1", "title": "...", "description": "Detailed description of what to do (2-3 sentences)", "completed": false },
    { "id": "task-1-2", "title": "...", "description": "...", "completed": false },
    { "id": "task-1-3", "title": "...", "description": "...", "completed": false },
    { "id": "task-1-4", "title": "...", "description": "...", "completed": false }
  ],
  "materials": [
    { "id": "mat-1-1", "title": "Video: Specific descriptive title", "type": "video", "description": "What this video covers", "youtubeVideoId": "REAL_YOUTUBE_VIDEO_ID", "youtubeTitle": "Exact video title on YouTube" },
    { "id": "mat-1-2", "title": "Video: Another relevant video", "type": "video", "description": "...", "youtubeVideoId": "ANOTHER_REAL_ID", "youtubeTitle": "..." },
    { "id": "mat-1-3", "title": "Key Concepts & Theory", "type": "reading", "content": "Comprehensive explanation (300-500 words) covering all key concepts, definitions, formulas, and examples" },
    { "id": "mat-1-4", "title": "Summary & Key Takeaways", "type": "summary", "content": "Organized bullet points of the most important facts (150-250 words)" },
    { "id": "mat-1-5", "title": "Practice Exercise", "type": "exercise", "content": "Detailed hands-on exercise with clear instructions and expected outcomes" },
    { "id": "mat-1-6", "title": "Challenge Problem", "type": "exercise", "content": "A harder problem to test deeper understanding" }
  ]
}

IMPORTANT for videos: Suggest well-known, popular educational YouTube videos that actually exist for this topic. Use real video IDs from channels like 3Blue1Brown, Khan Academy, CrashCourse, Fireship, CS50, MIT OpenCourseWare, TED-Ed, Numberphile, Veritasium, etc. If you can't recall exact IDs, use a relevant search query as the youtubeVideoId prefixed with "search:" (e.g. "search:linear algebra basics 3blue1brown").

Create 4-6 tasks (practical, actionable learning activities) and 5-7 materials (mix of videos, readings, summaries, exercises).
Return ONLY valid JSON.`;

        const stepResult = await model.generateContent([
          { text: stepSystemPrompt },
          { text: `Generate content for step 1: "${firstStep.title}"${prompt ? `\nGoal: ${prompt}` : ''}` }
        ]);
        let stepResponseText = stepResult.response.text();
        stepResponseText = stepResponseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const stepDetails = JSON.parse(stepResponseText);

        roadmapData.roadmap.steps[0] = {
          ...firstStep,
          tasks: stepDetails.tasks || [],
          materials: stepDetails.materials || [],
          detailsLoaded: true,
          unlocked: true
        };
      } catch (stepError) {
        console.error('Error pre-generating first step:', stepError);
      }
    }

    await recordGeneration(req.user.id, 'course');
    res.json(roadmapData);
  } catch (error) {
    console.error('Error generating roadmap:', error);
    res.status(500).json({ error: 'Failed to generate roadmap', details: error.message });
  }
});

// ============ PERSISTENCE ENDPOINTS (Supabase) ============

// --- Roadmaps (Courses) ---
app.get('/api/roadmaps', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  // Map DB rows → frontend shape
  res.json(data.map(r => ({
    id: r.id,
    title: r.title,
    description: r.description,
    steps: r.steps || [],
    coverImage: r.image_url,
    createdAt: r.created_at,
    progress: r.progress || 0,
    originalPrompt: r.original_prompt,
    originalMaterials: r.original_materials,
  })));
});

app.post('/api/roadmaps', requireAuth, async (req, res) => {
  const roadmap = req.body;
  const { error } = await supabase
    .from('courses')
    .insert({
      id: roadmap.id,
      title: roadmap.title,
      description: roadmap.description,
      steps: roadmap.steps || [],
      image_url: roadmap.coverImage || null,
      user_id: req.user.id,
      progress: roadmap.progress || 0,
      original_prompt: roadmap.originalPrompt || null,
      original_materials: roadmap.originalMaterials || null,
    });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, roadmap });
});

// ============ RENAME CONTENT ============
app.patch('/api/content/:type/:id/rename', requireAuth, async (req, res) => {
  const { type, id } = req.params;
  const { title } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });

  const tableMap = {
    course: 'courses',
    flashcards: 'flashcard_decks',
    quiz: 'quizzes',
    matching: 'matching_games',
    'word-scramble': 'word_scramble_games',
    'fill-blank': 'fill_blank_games',
  };
  const table = tableMap[type];
  if (!table) return res.status(400).json({ error: 'Invalid content type' });

  const { error } = await supabase
    .from(table)
    .update({ title: title.trim() })
    .eq('id', id)
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.put('/api/roadmaps/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const updated = req.body;
  const { error } = await supabase
    .from('courses')
    .update({
      title: updated.title,
      description: updated.description,
      steps: updated.steps || [],
      image_url: updated.coverImage || null,
      progress: updated.progress || 0,
    })
    .eq('id', id)
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, roadmap: updated });
});

app.delete('/api/roadmaps/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('courses').delete().eq('id', id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// --- Flashcard Decks ---
app.get('/api/flashcard-decks', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('flashcard_decks')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(d => ({
    id: d.id,
    title: d.title,
    description: d.description,
    cards: d.flashcards || [],
    coverImage: d.image_url,
    createdAt: d.created_at,
    sourceType: d.course_id ? 'course' : 'standalone',
    sourceCourseId: d.course_id,
  })));
});

app.post('/api/flashcard-decks', requireAuth, async (req, res) => {
  const deck = req.body;
  const { error } = await supabase
    .from('flashcard_decks')
    .insert({
      id: deck.id,
      title: deck.title,
      description: deck.description,
      flashcards: deck.cards || [],
      course_id: deck.sourceCourseId || null,
      image_url: deck.coverImage || null,
      user_id: req.user.id,
    });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, deck });
});

app.put('/api/flashcard-decks/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const deck = req.body;
  const { error } = await supabase
    .from('flashcard_decks')
    .update({
      title: deck.title,
      description: deck.description,
      flashcards: deck.cards || [],
      image_url: deck.coverImage || null,
    })
    .eq('id', id)
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, deck });
});

app.delete('/api/flashcard-decks/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('flashcard_decks').delete().eq('id', id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// --- Standalone Quizzes ---
app.get('/api/standalone-quizzes', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(q => ({
    id: q.id,
    title: q.title,
    description: q.description || '',
    questions: q.questions || [],
    createdAt: q.created_at,
    isRapid: q.is_rapid || false,
    timePerQuestion: q.time_per_question,
    coverImage: q.image_url,
    completed: q.completed || false,
    score: q.score,
    totalQuestions: q.total_questions,
    bestScore: q.best_score,
    timesTaken: q.times_taken || 0,
  })));
});

app.post('/api/standalone-quizzes', requireAuth, async (req, res) => {
  const quiz = req.body;
  const { error } = await supabase
    .from('quizzes')
    .insert({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description || '',
      questions: quiz.questions || [],
      course_id: quiz.sourceCourseId || null,
      is_rapid: quiz.isRapid || false,
      time_per_question: quiz.timePerQuestion || null,
      image_url: quiz.coverImage || null,
      user_id: req.user.id,
    });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, quiz });
});

app.put('/api/standalone-quizzes/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const quiz = req.body;
  const { error } = await supabase
    .from('quizzes')
    .update({
      title: quiz.title,
      questions: quiz.questions || [],
      completed: quiz.completed || false,
      score: quiz.score != null ? quiz.score : null,
      total_questions: quiz.totalQuestions || null,
      best_score: quiz.bestScore || null,
      times_taken: quiz.timesTaken || 0,
    })
    .eq('id', id)
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, quiz });
});

app.delete('/api/standalone-quizzes/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('quizzes').delete().eq('id', id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// --- Matching Games ---
app.get('/api/matching-games', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('matching_games')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(g => ({
    id: g.id,
    title: g.title,
    description: g.description || '',
    pairs: g.pairs || [],
    createdAt: g.created_at,
    coverImage: g.image_url,
    bestTime: g.best_time,
    timesPlayed: g.times_played || 0,
  })));
});

app.post('/api/matching-games', requireAuth, async (req, res) => {
  const game = req.body;
  const { error } = await supabase
    .from('matching_games')
    .insert({
      id: game.id,
      title: game.title,
      description: game.description || '',
      pairs: game.pairs || [],
      course_id: game.sourceCourseId || null,
      image_url: game.coverImage || null,
      user_id: req.user.id,
    });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, game });
});

app.put('/api/matching-games/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const game = req.body;
  const { error } = await supabase
    .from('matching_games')
    .update({
      title: game.title,
      pairs: game.pairs || [],
      best_time: game.bestTime || null,
      times_played: game.timesPlayed || 0,
    })
    .eq('id', id)
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, game });
});

app.delete('/api/matching-games/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('matching_games').delete().eq('id', id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// --- Word Scramble Games ---
app.get('/api/word-scramble-games', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('word_scramble_games')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(g => ({
    id: g.id,
    title: g.title,
    description: g.description || '',
    words: g.words || [],
    createdAt: g.created_at,
    coverImage: g.image_url,
    bestScore: g.best_score,
    timesPlayed: g.times_played,
  })));
});

app.post('/api/word-scramble-games', requireAuth, async (req, res) => {
  const game = req.body;
  const { error } = await supabase
    .from('word_scramble_games')
    .insert({
      id: game.id,
      title: game.title,
      description: game.description || '',
      words: game.words || [],
      image_url: game.coverImage || null,
      user_id: req.user.id,
    });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, game });
});

app.put('/api/word-scramble-games/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const game = req.body;
  const { error } = await supabase
    .from('word_scramble_games')
    .update({
      title: game.title,
      words: game.words || [],
      best_score: game.bestScore || null,
      times_played: game.timesPlayed || null,
    })
    .eq('id', id)
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, game });
});

app.delete('/api/word-scramble-games/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('word_scramble_games').delete().eq('id', id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// --- Fill-in-the-Blank Games ---
app.get('/api/fill-blank-games', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('fill_blank_games')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(g => ({
    id: g.id,
    title: g.title,
    description: g.description || '',
    sentences: g.sentences || [],
    createdAt: g.created_at,
    coverImage: g.image_url,
    bestScore: g.best_score,
    bestTime: g.best_time,
    timesPlayed: g.times_played,
  })));
});

app.post('/api/fill-blank-games', requireAuth, async (req, res) => {
  const game = req.body;
  const { error } = await supabase
    .from('fill_blank_games')
    .insert({
      id: game.id,
      title: game.title,
      description: game.description || '',
      sentences: game.sentences || [],
      image_url: game.coverImage || null,
      user_id: req.user.id,
    });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, game });
});

app.put('/api/fill-blank-games/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const game = req.body;
  const { error } = await supabase
    .from('fill_blank_games')
    .update({
      title: game.title,
      sentences: game.sentences || [],
      best_score: game.bestScore || null,
      best_time: game.bestTime || null,
      times_played: game.timesPlayed || null,
    })
    .eq('id', id)
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, game });
});

app.delete('/api/fill-blank-games/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('fill_blank_games').delete().eq('id', id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ============ USER PROFILE ============
app.get('/api/profile', requireAuth, async (req, res) => {
  const userId = req.user.id;
  
  // Get or create profile
  let { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!profile) {
    // Auto-create profile with pro tier
    const { data: newProfile, error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        email: req.user.email,
        display_name: req.user.email?.split('@')[0] || 'User',
        subscription_tier: 'pro',
      })
      .select()
      .single();
    
    if (insertError) return res.status(500).json({ error: insertError.message });
    profile = newProfile;
  }

  // Get today's generation count
  const today = new Date().toISOString().split('T')[0];
  const { count: todayCount } = await supabase
    .from('daily_generations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', `${today}T00:00:00.000Z`)
    .lt('created_at', `${today}T23:59:59.999Z`);

  // Get total generation count
  const { count: totalCount } = await supabase
    .from('daily_generations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Get content stats
  const [coursesRes, flashcardsRes, quizzesRes, matchingRes, scrambleRes, fillBlankRes] = await Promise.all([
    supabase.from('courses').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('flashcard_decks').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('quizzes').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('matching_games').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('word_scramble_games').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('fill_blank_games').select('*', { count: 'exact', head: true }).eq('user_id', userId),
  ]);

  res.json({
    id: profile.id,
    email: profile.email || req.user.email,
    displayName: profile.display_name || '',
    subscriptionTier: profile.subscription_tier || 'pro',
    generationsToday: todayCount || 0,
    generationLimit: DAILY_GENERATION_LIMIT,
    totalGenerations: totalCount || 0,
    joinedAt: profile.created_at,
    stats: {
      courses: coursesRes.count || 0,
      flashcardDecks: flashcardsRes.count || 0,
      quizzes: quizzesRes.count || 0,
      matchingGames: matchingRes.count || 0,
      wordScrambleGames: scrambleRes.count || 0,
      fillBlankGames: fillBlankRes.count || 0,
    },
  });
});

app.put('/api/profile', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { displayName } = req.body;
  
  const { error } = await supabase
    .from('user_profiles')
    .update({ display_name: displayName })
    .eq('id', userId);
  
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ============ COMMUNITY / SHARED CONTENT ============
app.get('/api/community', requireAuth, async (req, res) => {
  const { type, sort, q } = req.query;
  const userId = req.user.id;

  let query = supabase
    .from('shared_content')
    .select('*')
    .eq('is_public', true);

  if (type && type !== 'all') {
    query = query.eq('content_type', type);
  }

  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }

  if (sort === 'popular') {
    query = query.order('likes_count', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  query = query.limit(50);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Fetch author names separately
  const authorIds = [...new Set((data || []).map(d => d.author_id))];
  let authorMap = {};
  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, display_name')
      .in('id', authorIds);
    authorMap = Object.fromEntries((profiles || []).map(p => [p.id, p.display_name]));
  }

  // Check which items current user has liked
  const itemIds = (data || []).map(d => d.id);
  let userLikes = new Set();
  if (itemIds.length > 0) {
    const { data: likes } = await supabase
      .from('content_likes')
      .select('shared_content_id')
      .eq('user_id', userId)
      .in('shared_content_id', itemIds);
    userLikes = new Set((likes || []).map(l => l.shared_content_id));
  }

  res.json((data || []).map(item => ({
    id: item.id,
    contentType: item.content_type,
    contentId: item.content_id,
    title: item.title,
    description: item.description || '',
    coverImage: item.cover_image,
    authorName: authorMap[item.author_id] || 'Anonymous',
    authorId: item.author_id,
    likes: item.likes_count || 0,
    hasLiked: userLikes.has(item.id),
    createdAt: item.created_at,
    meta: item.meta || {},
  })));
});

app.post('/api/community/share', requireAuth, async (req, res) => {
  const { contentType, contentId, title, description, coverImage, meta } = req.body;
  const userId = req.user.id;

  const { data, error } = await supabase
    .from('shared_content')
    .insert({
      author_id: userId,
      content_type: contentType,
      content_id: contentId,
      title,
      description: description || '',
      cover_image: coverImage,
      meta: meta || {},
      is_public: true,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/community/:id/like', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Upsert — silently ignore if already liked (idempotent)
  const { error: likeError } = await supabase
    .from('content_likes')
    .upsert({ user_id: userId, shared_content_id: id }, { onConflict: 'user_id,shared_content_id', ignoreDuplicates: true });
  
  if (likeError) return res.status(500).json({ error: likeError.message });

  // Recalculate like count from source of truth
  const { count } = await supabase
    .from('content_likes')
    .select('*', { count: 'exact', head: true })
    .eq('shared_content_id', id);

  await supabase
    .from('shared_content')
    .update({ likes_count: count || 0 })
    .eq('id', id);

  res.json({ success: true, likes: count || 0 });
});

app.delete('/api/community/:id/like', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const { error } = await supabase
    .from('content_likes')
    .delete()
    .eq('user_id', userId)
    .eq('shared_content_id', id);

  if (error) return res.status(500).json({ error: error.message });

  // Recalculate like count from source of truth
  const { count } = await supabase
    .from('content_likes')
    .select('*', { count: 'exact', head: true })
    .eq('shared_content_id', id);

  await supabase
    .from('shared_content')
    .update({ likes_count: count || 0 })
    .eq('id', id);

  res.json({ success: true, likes: count || 0 });
});

app.get('/api/community/:id/clone', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Get the shared content
  const { data: shared, error } = await supabase
    .from('shared_content')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !shared) return res.status(404).json({ error: 'Content not found' });

  // Get the original content based on type and clone it for this user
  const contentType = shared.content_type;
  const tableMap = {
    course: 'courses',
    flashcards: 'flashcard_decks',
    quiz: 'quizzes',
    matching: 'matching_games',
    'word-scramble': 'word_scramble_games',
    'fill-blank': 'fill_blank_games',
  };
  
  const table = tableMap[contentType];
  if (!table) return res.status(400).json({ error: 'Invalid content type' });

  const { data: original } = await supabase
    .from(table)
    .select('*')
    .eq('id', shared.content_id)
    .single();

  if (!original) return res.status(404).json({ error: 'Original content not found' });

  // Clone with new ID and the current user's ID, stripping all results/progress
  const cloned = { ...original };
  cloned.id = `${Date.now()}`;
  cloned.user_id = userId;
  cloned.created_at = new Date().toISOString();

  // Remove original user's progress, scores, and course links
  delete cloned.updated_at;
  delete cloned.course_id;
  delete cloned.step_id;
  delete cloned.original_prompt;
  delete cloned.original_materials;

  // Reset result/progress fields to defaults
  if ('progress' in cloned) cloned.progress = 0;
  if ('completed' in cloned) cloned.completed = false;
  if ('score' in cloned) cloned.score = null;
  if ('best_score' in cloned) cloned.best_score = null;
  if ('best_time' in cloned) cloned.best_time = null;
  if ('times_taken' in cloned) cloned.times_taken = 0;
  if ('times_played' in cloned) cloned.times_played = 0;

  // For courses, reset step completion states inside JSONB
  if (contentType === 'course' && Array.isArray(cloned.steps)) {
    cloned.steps = cloned.steps.map(step => {
      const cleanStep = { ...step };
      if (cleanStep.tasks) {
        cleanStep.tasks = cleanStep.tasks.map(t => ({ ...t, completed: false }));
      }
      delete cleanStep.testResults;
      delete cleanStep.testScore;
      return cleanStep;
    });
  }

  // For quizzes, reset user answers inside questions JSONB
  if (contentType === 'quiz' && Array.isArray(cloned.questions)) {
    cloned.questions = cloned.questions.map(q => {
      const cleanQ = { ...q };
      delete cleanQ.userAnswer;
      delete cleanQ.selectedAnswer;
      delete cleanQ.isCorrect;
      return cleanQ;
    });
  }

  const { error: cloneError } = await supabase.from(table).insert(cloned);
  if (cloneError) return res.status(500).json({ error: cloneError.message });

  res.json({ success: true, id: cloned.id });
});

// ============ STEP DETAILS GENERATION ============
app.post('/api/generate-step-details', requireAuth, async (req, res) => {
  try {
    const { step, courseTitle, courseDescription, originalPrompt, originalMaterials } = req.body;

    const systemPrompt = `You are an expert educational content curator. Generate comprehensive learning content for a specific course step.

Course: "${courseTitle}"
Current Step: "${step.title}" (Step ${step.stepNumber})
Step Description: ${step.description}

Return JSON: {
  "tasks": [
    { "id": "task-${step.stepNumber}-1", "title": "...", "description": "Detailed description (2-3 sentences)", "completed": false },
    { "id": "task-${step.stepNumber}-2", "title": "...", "description": "...", "completed": false },
    { "id": "task-${step.stepNumber}-3", "title": "...", "description": "...", "completed": false },
    { "id": "task-${step.stepNumber}-4", "title": "...", "description": "...", "completed": false },
    { "id": "task-${step.stepNumber}-5", "title": "...", "description": "...", "completed": false }
  ],
  "materials": [
    { "id": "mat-${step.stepNumber}-1", "title": "Video: Specific title", "type": "video", "description": "...", "youtubeVideoId": "REAL_VIDEO_ID", "youtubeTitle": "Exact video title" },
    { "id": "mat-${step.stepNumber}-2", "title": "Video: Another video", "type": "video", "description": "...", "youtubeVideoId": "REAL_ID", "youtubeTitle": "..." },
    { "id": "mat-${step.stepNumber}-3", "title": "In-Depth Reading", "type": "reading", "content": "Comprehensive explanation (300-500 words) with key concepts, definitions, formulas, examples" },
    { "id": "mat-${step.stepNumber}-4", "title": "Summary & Key Takeaways", "type": "summary", "content": "Organized bullet points (150-250 words)" },
    { "id": "mat-${step.stepNumber}-5", "title": "Practice Exercise", "type": "exercise", "content": "Detailed hands-on exercise with step-by-step instructions" },
    { "id": "mat-${step.stepNumber}-6", "title": "Challenge Problem", "type": "exercise", "content": "A harder problem to test deeper understanding" }
  ]
}

IMPORTANT for videos: Suggest well-known, popular educational YouTube videos that actually exist. Use real video IDs from channels like 3Blue1Brown, Khan Academy, CrashCourse, Fireship, CS50, MIT OCW, TED-Ed, etc. If you can't recall exact IDs, use a search query prefixed with "search:" (e.g. "search:topic name channel").

Create 4-6 tasks (practical, actionable learning activities) and 5-7 materials (mix of videos, readings, summaries, exercises).
${originalMaterials ? 'Reference the provided source materials for context and accuracy.' : ''}
Return ONLY valid JSON.`;

    const userContent = `Generate content for step ${step.stepNumber}: "${step.title}"
${originalPrompt ? `Original goal: ${originalPrompt}` : ''}
${originalMaterials ? `\nSource:\n${originalMaterials.substring(0, 2000)}` : ''}`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent([{ text: systemPrompt }, { text: userContent }]);
    let responseText = result.response.text();
    const stepDetails = await parseJsonWithRetry(responseText, `Step details for: ${step.title}`);
    res.json(stepDetails);
  } catch (error) {
    console.error('Error generating step details:', error);
    res.status(500).json({ error: 'Failed to generate step details', details: error.message });
  }
});

// ============ TEST GENERATION ============
app.post('/api/generate-test', requireAuth, async (req, res) => {
  try {
    const { step, courseTitle } = req.body;

    const systemPrompt = `You are an expert educational assessment creator. Generate a quiz for course step that matches the material difficulty.

Course: "${courseTitle}"
Step: "${step.title}"
${step.materials?.length > 0 ? `Materials:\n${step.materials.map(m => `- ${m.title}: ${m.content?.substring(0, 500)}`).join('\n')}` : ''}

Return JSON: {
  "questions": [{ "id": "q1", "question": "...", "options": ["A","B","C","D"], "correctAnswer": 0, "explanation": "Detailed explanation of why this answer is correct", "difficulty": "easy|medium|hard" }]
}

Guidelines:
- Number of questions should match material complexity: simple topics 5-8, moderate 10-15, complex 15-25
- Distribute difficulty: 30% easy (recall/definition), 40% medium (application/understanding), 30% hard (analysis/synthesis)
- Questions must directly test the material content, not general knowledge
- Each explanation should teach, not just state the answer
- For hard questions, include multi-step reasoning or scenario-based problems
Return ONLY valid JSON.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(systemPrompt);
    let responseText = result.response.text();
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const testData = JSON.parse(responseText);

    res.json({
      id: `test-${step.id}`,
      questions: testData.questions,
      completed: false,
      totalQuestions: testData.questions.length
    });
  } catch (error) {
    console.error('Error generating test:', error);
    res.status(500).json({ error: 'Failed to generate test', details: error.message });
  }
});

// ============ PLUGIN CODE AI ASSIST ============
app.post('/api/modify-plugin-code', requireAuth, async (req, res) => {
  try {
    const { code, prompt } = req.body;
    if (!code || !prompt) return res.status(400).json({ error: 'Missing code or prompt' });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(
      `Modify this gvidtech plugin code based on the request: "${prompt}"\n\nCurrent code:\n\`\`\`javascript\n${code}\n\`\`\`\n\nReturn ONLY the complete modified JavaScript code, no markdown.`
    );
    let responseText = result.response.text();
    responseText = responseText.replace(/```javascript\n?/g, '').replace(/```js\n?/g, '').replace(/```\n?/g, '').trim();
    res.json({ code: responseText });
  } catch (error) {
    console.error('Error modifying plugin code:', error);
    res.status(500).json({ error: 'Failed to modify plugin code', details: error.message });
  }
});

// ============ IMAGE GENERATION ============
app.post('/api/generate-image', requireAuth, async (req, res) => {
  try {
    const { prompt } = req.body;
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    let keyword = 'education';
    try {
      const keywordResult = await model.generateContent(
        `Given this course/topic title: "${prompt}"\nReturn a single word or short phrase (max 2 words) for an educational image search.\nReturn ONLY the keyword(s).`
      );
      keyword = keywordResult.response.text().trim().toLowerCase().replace(/[^a-z\s]/g, '').substring(0, 30);
    } catch (e) { /* use default */ }

    const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (unsplashAccessKey) {
      try {
        const response = await fetch(
          `https://api.unsplash.com/photos/random?query=${encodeURIComponent(keyword)}&orientation=landscape&w=800&h=400`,
          { headers: { 'Authorization': `Client-ID ${unsplashAccessKey}` } }
        );
        if (response.ok) {
          const data = await response.json();
          return res.json({
            imageUrl: data.urls?.regular || data.urls?.small,
            keyword,
            photographer: data.user?.name,
            photographerUrl: data.user?.links?.html
          });
        }
      } catch (unsplashError) {
        console.error('Unsplash error:', unsplashError);
      }
    }

    res.json({ imageUrl: null, gradient: 'linear-gradient(135deg, #0b4c8a 0%, #6366f1 100%)' });
  } catch (error) {
    res.json({ imageUrl: null, gradient: 'linear-gradient(135deg, #0b4c8a 0%, #6366f1 100%)' });
  }
});

// ============ FLASHCARD GENERATION ============
app.post('/api/generate-flashcards', requireAuth, checkRateLimit, upload.array('files'), async (req, res) => {
  try {
    const prompt = req.body?.prompt || '';
    const files = req.files || [];
    const { parts: fileParts } = await processFilesForGemini(files);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent([
      { text: `Generate flashcards with difficulty matched to the material complexity. Analyze the material (including any uploaded files/images) and determine if it's beginner, intermediate, or advanced level.

- Beginner material: 10-15 flashcards, mostly definitions and basic concepts
- Intermediate material: 15-25 flashcards, mix of concepts, applications, and connections
- Advanced material: 20-35 flashcards, include analysis, synthesis, and edge cases

Distribute difficulty: 30% easy, 40% medium, 30% hard.

Return JSON: { "title": "...", "description": "...", "difficulty": "beginner|intermediate|advanced", "cards": [{ "id": "card-1", "front": "...", "back": "...", "category": "...", "difficulty": "easy|medium|hard", "mastered": false }] }. Return ONLY valid JSON.` },
      { text: `Create flashcards for: ${prompt || 'the provided materials'}` },
      ...fileParts,
    ]);
    let responseText = result.response.text();
    const flashcardData = await parseJsonWithRetry(responseText, 'Generate flashcards');
    await recordGeneration(req.user.id, 'flashcards');
    res.json(flashcardData);
  } catch (error) {
    console.error('Error generating flashcards:', error);
    res.status(500).json({ error: 'Failed to generate flashcards', details: error.message });
  }
});

// ============ STANDALONE QUIZ GENERATION ============
app.post('/api/generate-standalone-quiz', requireAuth, checkRateLimit, upload.array('files'), async (req, res) => {
  try {
    const prompt = req.body?.prompt || '';
    const files = req.files || [];
    const { parts: fileParts } = await processFilesForGemini(files);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent([
      { text: `Generate quiz questions with difficulty matched to the material complexity. Analyze the material (including any uploaded files/images) and determine difficulty level.

- Beginner material: 8-12 questions, focus on recall and basic understanding
- Intermediate material: 12-20 questions, include application and comparison
- Advanced material: 18-30 questions, include analysis, synthesis, and scenario-based problems

Distribute difficulty: 30% easy, 40% medium, 30% hard.

Return JSON: { "title": "...", "description": "...", "difficulty": "beginner|intermediate|advanced", "questions": [{ "id": "q1", "question": "...", "options": ["A","B","C","D"], "correctAnswer": 0, "explanation": "Detailed explanation", "difficulty": "easy|medium|hard" }] }. Return ONLY valid JSON.` },
      { text: `Create quiz about: ${prompt || 'the provided materials'}` },
      ...fileParts,
    ]);
    let responseText = result.response.text();
    const quizData = await parseJsonWithRetry(responseText, 'Generate quiz');
    await recordGeneration(req.user.id, 'quiz');
    res.json(quizData);
  } catch (error) {
    console.error('Error generating quiz:', error);
    res.status(500).json({ error: 'Failed to generate quiz', details: error.message });
  }
});

// ============ COURSE FLASHCARD GENERATION ============
app.post('/api/generate-course-flashcards', requireAuth, async (req, res) => {
  try {
    const { courseTitle, courseDescription, steps } = req.body;
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const contextResult = await model.generateContent(
      `Generate educational content for course "${courseTitle}": ${courseDescription}\nSteps:\n${steps.map((s, i) => `${i + 1}. ${s.title}: ${s.description}`).join('\n')}\n\nReturn JSON: { "stepContent": [{ "stepTitle": "...", "content": "..." }] }`
    );
    let contextText = contextResult.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let secretContext = '';
    try { secretContext = JSON.parse(contextText).stepContent?.map(s => `## ${s.stepTitle}\n${s.content}`).join('\n\n') || ''; } catch { secretContext = contextText; }

    const result = await model.generateContent(
      `Generate flashcards for course "${courseTitle}".\n${secretContext}\n\nReturn JSON: { "cards": [{ "id": "card-1", "front": "...", "back": "...", "category": "...", "difficulty": "easy|medium|hard", "mastered": false }] }. Return ONLY valid JSON.`
    );
    let responseText = result.response.text();
    const flashcardData = await parseJsonWithRetry(responseText, `Flashcards for: ${courseTitle}`);
    res.json(flashcardData);
  } catch (error) {
    console.error('Error generating course flashcards:', error);
    res.status(500).json({ error: 'Failed to generate flashcards', details: error.message });
  }
});

// ============ STEP FLASHCARD GENERATION ============
app.post('/api/generate-step-flashcards', requireAuth, async (req, res) => {
  try {
    const { stepTitle, stepDescription, materials } = req.body;
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const materialsContent = materials?.map(m => `${m.title}: ${m.content || m.description || ''}`).join('\n\n') || '';

    const contextResult = await model.generateContent(`Write educational content for step "${stepTitle}": ${stepDescription}\nMaterials:\n${materialsContent}\nReturn as plain text.`);
    const secretContext = contextResult.response.text();

    const result = await model.generateContent(`Generate 10-20 flashcards for step "${stepTitle}".\n${secretContext}\n\nReturn JSON: { "flashcards": [{ "id": "card-1", "front": "...", "back": "...", "category": "${stepTitle}", "difficulty": "easy|medium|hard", "mastered": false }] }. Return ONLY valid JSON.`);
    let responseText = result.response.text();
    const flashcardData = await parseJsonWithRetry(responseText, `Flashcards for step: ${stepTitle}`);
    res.json(flashcardData);
  } catch (error) {
    console.error('Error generating step flashcards:', error);
    res.status(500).json({ error: 'Failed to generate flashcards', details: error.message });
  }
});

// ============ MATCHING GAME GENERATION ============
app.post('/api/generate-step-matching-game', requireAuth, async (req, res) => {
  try {
    const { stepTitle, stepDescription, materials } = req.body;
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const materialsContent = materials?.map(m => `${m.title}: ${m.content || m.description || ''}`).join('\n\n') || '';

    const contextResult = await model.generateContent(`Write educational content for step "${stepTitle}": ${stepDescription}\nMaterials:\n${materialsContent}\nReturn as plain text.`);
    const result = await model.generateContent(`Generate 10-12 matching pairs for step "${stepTitle}".\n${contextResult.response.text()}\n\nReturn JSON: { "pairs": [{ "id": "pair-1", "question": "...", "answer": "..." }] }. Return ONLY valid JSON.`);
    let responseText = result.response.text();
    const gameData = await parseJsonWithRetry(responseText, `Matching game for step: ${stepTitle}`);
    res.json(gameData);
  } catch (error) {
    console.error('Error generating matching game:', error);
    res.status(500).json({ error: 'Failed to generate matching game', details: error.message });
  }
});

app.post('/api/generate-course-matching-game', requireAuth, async (req, res) => {
  try {
    const { courseTitle, courseDescription, steps } = req.body;
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const contextResult = await model.generateContent(`Generate content for course "${courseTitle}": ${courseDescription}\nSteps:\n${steps.map((s, i) => `${i + 1}. ${s.title}: ${s.description}`).join('\n')}\nReturn JSON: { "stepContent": [{ "stepTitle": "...", "content": "..." }] }`);
    let contextText = contextResult.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let secretContext = '';
    try { secretContext = JSON.parse(contextText).stepContent?.map(s => `## ${s.stepTitle}\n${s.content}`).join('\n\n') || ''; } catch { secretContext = contextText; }

    const result = await model.generateContent(`Generate 12-15 matching pairs for course "${courseTitle}".\n${secretContext}\n\nReturn JSON: { "pairs": [{ "id": "pair-1", "question": "...", "answer": "..." }] }. Return ONLY valid JSON.`);
    let responseText = result.response.text();
    const gameData = await parseJsonWithRetry(responseText, `Matching game for course: ${courseTitle}`);
    res.json(gameData);
  } catch (error) {
    console.error('Error generating matching game:', error);
    res.status(500).json({ error: 'Failed to generate matching game', details: error.message });
  }
});

app.post('/api/generate-matching-game', requireAuth, checkRateLimit, upload.array('files'), async (req, res) => {
  try {
    const prompt = req.body?.prompt || '';
    const files = req.files || [];
    const { parts: fileParts } = await processFilesForGemini(files);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent([
      { text: `Generate matching pairs with count based on material complexity. Analyze the uploaded material (including any images/files).

- Simple/beginner material: 6-8 pairs
- Moderate/intermediate material: 8-12 pairs
- Complex/advanced material: 12-16 pairs

Return JSON: { "title": "...", "description": "...", "difficulty": "beginner|intermediate|advanced", "pairs": [{ "id": "pair-1", "question": "...", "answer": "..." }] }. Return ONLY valid JSON.` },
      { text: `Create matching game for: ${prompt || 'the provided materials'}` },
      ...fileParts,
    ]);
    let responseText = result.response.text();
    const gameData = await parseJsonWithRetry(responseText, `Matching game for: ${prompt}`);
    await recordGeneration(req.user.id, 'matching');
    res.json(gameData);
  } catch (error) {
    console.error('Error generating matching game:', error);
    res.status(500).json({ error: 'Failed to generate matching game', details: error.message });
  }
});

// ============ WORD SCRAMBLE GENERATION ============
app.post('/api/generate-word-scramble', requireAuth, checkRateLimit, upload.array('files'), async (req, res) => {
  try {
    const prompt = req.body?.prompt || '';
    const files = req.files || [];
    const { parts: fileParts } = await processFilesForGemini(files);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent([
      { text: `Generate a word scramble game with key terms/concepts from the uploaded material. Each word should have a hint/clue.

Return JSON: { "title": "...", "description": "...", "words": [{ "id": "word-1", "word": "PHOTOSYNTHESIS", "hint": "The process by which plants convert sunlight into energy", "category": "Biology", "difficulty": "medium" }] }

Guidelines:
- Generate 10-20 words based on material complexity
- Words should be key terms, concepts, or vocabulary from the topic
- Each hint should be educational and help learn the concept
- Distribute difficulty: easy (common words), medium (domain terms), hard (complex/technical terms)
- Words should be single words or short compound words (no spaces)
Return ONLY valid JSON.` },
      { text: `Create word scramble game for: ${prompt || 'the provided materials'}` },
      ...fileParts,
    ]);
    let responseText = result.response.text();
    const gameData = await parseJsonWithRetry(responseText, `Word scramble for: ${prompt}`);
    await recordGeneration(req.user.id, 'word_scramble');
    res.json(gameData);
  } catch (error) {
    console.error('Error generating word scramble:', error);
    res.status(500).json({ error: 'Failed to generate word scramble', details: error.message });
  }
});

// ============ FILL-IN-THE-BLANK GENERATION ============
app.post('/api/generate-fill-blank', requireAuth, checkRateLimit, upload.array('files'), async (req, res) => {
  try {
    const prompt = req.body?.prompt || '';
    const files = req.files || [];
    const { parts: fileParts } = await processFilesForGemini(files);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent([
      { text: `Generate a fill-in-the-blank quiz from the provided material or topic.

Return JSON: {
  "title": "...",
  "description": "...",
  "sentences": [
    { "id": "s1", "sentence": "The process by which plants convert sunlight into energy is called ___.", "answer": "photosynthesis", "hint": "Uses chlorophyll", "difficulty": "medium" },
    { "id": "s2", "sentence": "The ___ is the powerhouse of the cell.", "answer": "mitochondria", "hint": "Produces ATP", "difficulty": "easy" }
  ]
}

RULES:
- Generate 10-15 sentences
- Each sentence must have exactly ONE blank marked with ___
- Answers should be 1-3 words, all lowercase
- Include a helpful hint for each sentence
- Difficulty: easy, medium, or hard
- Sentences should be educational and cover different aspects of the topic
- Make the blanks for KEY terms/concepts, not trivial words
Return ONLY valid JSON.` },
      { text: `Create fill-in-the-blank questions for: ${prompt || 'the provided materials'}` },
      ...fileParts,
    ]);
    let responseText = result.response.text();
    const gameData = await parseJsonWithRetry(responseText, `Fill-blank for: ${prompt}`);
    await recordGeneration(req.user.id, 'fill_blank');
    res.json(gameData);
  } catch (error) {
    console.error('Error generating fill-blank:', error);
    res.status(500).json({ error: 'Failed to generate fill-in-the-blank game', details: error.message });
  }
});

// Get step details
app.get('/api/roadmaps/:roadmapId/steps/:stepId', requireAuth, async (req, res) => {
  const { roadmapId, stepId } = req.params;
  const { data: roadmap, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', roadmapId)
    .eq('user_id', req.user.id)
    .single();
  if (error || !roadmap) return res.status(404).json({ error: 'Course not found' });
  const step = (roadmap.steps || []).find(s => s.id === stepId);
  if (!step) return res.status(404).json({ error: 'Step not found' });
  res.json(step);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
