/**
 * Agent Orchestrator (ADK Pattern)
 * 
 * Coordinates all agents using the Agent Development Kit pattern:
 * - ADK: Agent lifecycle management and orchestration
 * - MCP: Model Context Protocol for user context persistence
 * - A2A: Agent-to-Agent communication for pipeline execution
 */

const admin = require('firebase-admin');
const db = admin.firestore();

class AgentOrchestrator {
  constructor(agents) {
    this.agents = agents;
    this.contextStore = new Map(); // MCP: In-memory context cache
  }

  // ============================================
  // MCP: Model Context Protocol
  // Manages user context, memory, and state
  // ============================================

  /**
   * Retrieve user context for personalized agent interactions
   * MCP handles context window management and memory persistence
   */
  async getUserContext(userId, moduleId) {
    const cacheKey = `${userId}:${moduleId}`;

    // Check MCP context cache
    if (this.contextStore.has(cacheKey)) {
      const cached = this.contextStore.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) { // 5-minute cache
        return cached.data;
      }
    }

    // Build fresh context from Firestore
    const [userDoc, progressDoc, previousExams] = await Promise.all([
      db.collection('users').doc(userId).get(),
      db.collection('users').doc(userId).collection('progress').doc(moduleId).get(),
      db.collection('exams')
        .where('userId', '==', userId)
        .where('moduleId', '==', moduleId)
        .orderBy('startedAt', 'desc')
        .limit(5)
        .get(),
    ]);

    const context = {
      userId,
      moduleId,
      user: userDoc.exists ? userDoc.data() : null,
      progress: progressDoc.exists ? progressDoc.data() : null,
      previousAttempts: previousExams.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })),
      attemptNumber: (progressDoc.exists ? progressDoc.data().examAttempts : 0) + 1,
      timestamp: Date.now(),
    };

    // MCP: Persist context for agent reuse
    this.contextStore.set(cacheKey, { data: context, timestamp: Date.now() });

    return context;
  }

  // ============================================
  // ADK: Agent Development Kit Orchestration
  // Manages agent lifecycle and task delegation
  // ============================================

  /**
   * Orchestrate question generation through the Question Generator Agent
   * ADK pattern: Initialize → Configure → Execute → Validate
   */
  async generateQuestions(moduleId, userContext) {
    // ADK Step 1: Initialize agent with module context
    const agent = this.agents.questionGenerator;

    // ADK Step 2: Configure based on user history (MCP data)
    const config = {
      moduleId,
      attemptNumber: userContext.attemptNumber,
      previousTopics: this.extractPreviousTopics(userContext.previousAttempts),
      difficulty: this.calculateDifficulty(userContext),
    };

    // ADK Step 3: Execute question generation
    const questions = await agent.generate(config);

    // ADK Step 4: Validate through Anti-Hallucination Agent (A2A)
    const validatedQuestions = await this.agents.antiHallucination.validateQuestions(
      questions,
      moduleId
    );

    return validatedQuestions;
  }

  /**
   * Execute the full evaluation pipeline
   * A2A: Evaluation → Anti-Hallucination → Ranking
   */
  async evaluateExam(examId, moduleId, userId, examData) {
    const answers = examData.answers || [];

    // A2A Step 1: Evaluation Agent grades answers
    const evaluationResult = await this.agents.evaluation.evaluate(
      answers,
      moduleId,
      examId
    );

    // A2A Step 2: Anti-Hallucination Agent verifies grading consistency
    const verifiedResult = await this.agents.antiHallucination.verifyGrading(
      evaluationResult,
      moduleId,
      answers
    );

    // A2A Step 3: Check for AI cheating
    const cheatingAnalysis = await this.agents.evaluation.detectAICheating(
      answers,
      examId
    );

    // Calculate final score
    let finalScore = verifiedResult.totalScore;
    let aiFlags = cheatingAnalysis.flagCount;
    let locked = false;

    // Apply anti-cheat penalties
    if (cheatingAnalysis.flagCount >= 2) {
      finalScore = 0;
      locked = true;
    }

    // Update exam record
    await db.collection('exams').doc(examId).update({
      mcqScore: verifiedResult.mcqScore,
      openScore: verifiedResult.openScore,
      totalScore: finalScore,
      aiCheatingFlags: aiFlags,
      evaluationDetails: verifiedResult.details,
      status: 'graded',
      gradedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update user progress
    const progressRef = db.collection('users').doc(userId)
      .collection('progress').doc(moduleId);

    const updateData = {
      examScore: finalScore,
      examLocked: locked,
      lastExamAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Generate badge if passed
    if (finalScore >= 6) {
      const { v4: uuidv4 } = require('uuid');
      const badgeId = `BSA-${uuidv4().slice(0, 8).toUpperCase()}`;
      updateData.badgeId = badgeId;
      updateData.completedAt = admin.firestore.FieldValue.serverTimestamp();

      // Update user's completed modules and total score
      await db.collection('users').doc(userId).update({
        completedModules: admin.firestore.FieldValue.arrayUnion(moduleId),
        badges: admin.firestore.FieldValue.arrayUnion(badgeId),
        totalScore: admin.firestore.FieldValue.increment(finalScore),
      });
    }

    await progressRef.update(updateData);

    // A2A Step 4: Ranking Agent updates leaderboard
    await this.agents.ranking.updateUserRank(userId);

    return {
      score: finalScore,
      passed: finalScore >= 6,
      locked,
      aiFlags,
      details: verifiedResult.details,
    };
  }

  // ============================================
  // Helper Methods
  // ============================================

  extractPreviousTopics(previousAttempts) {
    const topics = new Set();
    for (const attempt of previousAttempts) {
      if (attempt.answers) {
        attempt.answers.forEach((a) => {
          if (a.topic) topics.add(a.topic);
        });
      }
    }
    return Array.from(topics);
  }

  calculateDifficulty(userContext) {
    const attempts = userContext.attemptNumber;
    if (attempts <= 1) return 'standard';
    return 'varied'; // Different concepts on retry
  }
}

module.exports = { AgentOrchestrator };
