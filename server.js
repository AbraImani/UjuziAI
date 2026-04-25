import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'gdg-ucb-bwai',
  });
}

const db = admin.firestore();
const auth = admin.auth();

// Import agents from functions
// Note: We point to the files in the functions directory
const { QuestionGeneratorAgent } = require('./functions/src/agents/questionGenerator.js');
const { EvaluationAgent } = require('./functions/src/agents/evaluation.js');
const { AntiHallucinationAgent } = require('./functions/src/agents/antiHallucination.js');
const { RankingAgent } = require('./functions/src/agents/ranking.js');
const { AgentOrchestrator } = require('./functions/src/agents/orchestrator.js');

// Initialize orchestrator
const orchestrator = new AgentOrchestrator({
  questionGenerator: new QuestionGeneratorAgent(),
  evaluation: new EvaluationAgent(),
  antiHallucination: new AntiHallucinationAgent(),
  ranking: new RankingAgent(),
});

const app = express();
app.use(cors());
app.use(express.json());

// Middleware to verify Firebase Auth Token
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Auth Error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ============================================
// API ROUTES (Mirrors Firebase Functions)
// ============================================

app.post('/api/generateExamQuestions', authenticate, async (req, res) => {
  try {
    const { moduleId } = req.body;
    const userId = req.user.uid;

    const progressRef = db.collection('users').doc(userId).collection('progress').doc(moduleId);
    const progressSnap = await progressRef.get();

    if (!progressSnap.exists) {
      return res.status(400).json({ error: 'No submission found' });
    }

    const progress = progressSnap.data();

    if (!progress.submitted) {
      return res.status(400).json({ error: 'Must submit proof first' });
    }

    if (progress.examLocked) {
      return res.status(403).json({ error: 'Exam is locked' });
    }

    if (progress.examAttempts >= 2) {
      return res.status(403).json({ error: 'Maximum attempts reached' });
    }

    const userContext = await orchestrator.getUserContext(userId, moduleId);
    const questions = await orchestrator.generateQuestions(moduleId, userContext);

    res.json({ data: { questions } });
  } catch (error) {
    console.error('generateExamQuestions error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/submitExam', authenticate, async (req, res) => {
  try {
    const { examId, moduleId } = req.body;
    const userId = req.user.uid;

    const examRef = db.collection('exams').doc(examId);
    const examSnap = await examRef.get();

    if (!examSnap.exists) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const examData = examSnap.data();

    if (examData.userId !== userId) {
      return res.status(403).json({ error: 'Not your exam' });
    }

    const result = await orchestrator.evaluateExam(examId, moduleId, userId, examData);
    res.json({ data: result });
  } catch (error) {
    console.error('submitExam error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/validateSubmission', authenticate, async (req, res) => {
  try {
    const adminDoc = await db.collection('users').doc(req.user.uid).get();
    if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId, moduleId, approved } = req.body;

    const progressRef = db.collection('users').doc(userId).collection('progress').doc(moduleId);
    await progressRef.update({
      validated: approved,
      examUnlocked: approved,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedBy: req.user.uid,
    });

    res.json({ data: { success: true } });
  } catch (error) {
    console.error('validateSubmission error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/verifyBadge', async (req, res) => {
  try {
    const { badgeId } = req.body;
    if (!badgeId) {
      return res.status(400).json({ error: 'Badge ID required' });
    }

    const badgeQuery = await db.collectionGroup('progress')
      .where('badgeId', '==', badgeId)
      .limit(1)
      .get();

    if (badgeQuery.empty) {
      return res.json({ data: { valid: false } });
    }

    const badgeData = badgeQuery.docs[0].data();
    const userDoc = await db.collection('users').doc(badgeData.userId || '').get();

    res.json({
      data: {
        valid: true,
        module: badgeData.moduleId,
        score: badgeData.examScore,
        userName: userDoc.exists ? userDoc.data().displayName : 'Unknown',
        issuedAt: badgeData.completedAt,
      }
    });
  } catch (error) {
    console.error('verifyBadge error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'dist')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
