/**
 * Evaluation Agent
 * 
 * Responsibilities:
 * - Grade MCQ answers (automatic)
 * - Evaluate open-ended responses (semantic analysis)
 * - Detect AI-generated/copied responses
 * - Detect overly generic or vague answers
 * - Apply scoring: 10 points per section
 * 
 * ADK Role: Evaluation Worker Agent
 * A2A: Receives answers from Orchestrator, sends results to Anti-Hallucination Agent
 */

class EvaluationAgent {
  constructor() {
    this.name = 'EvaluationAgent';
    this.version = '1.0.0';

    // Patterns that indicate AI-generated content
    this.aiPatterns = [
      /as an ai/i,
      /i don't have personal/i,
      /it's important to note/i,
      /in conclusion/i,
      /it is worth mentioning/i,
      /certainly!?\s/i,
      /absolutely!?\s/i,
      /great question/i,
      /let me explain/i,
      /here's? (?:a|an) (?:comprehensive|detailed) (?:overview|explanation)/i,
      /there are several (?:key|important) (?:factors|aspects|considerations)/i,
      /(?:firstly|secondly|thirdly|finally),?\s/gi,
      /delve into/i,
      /it's crucial to/i,
      /leverage/i,
      /utilize/i,
    ];

    // Patterns indicating generic/low-effort responses
    this.genericPatterns = [
      /^.{0,30}$/,  // Too short (less than 30 chars)
      /^(?:yes|no|maybe|i don't know|idk|n\/a)\.?$/i,
      /it is good|it is bad|it works|i learned a lot/i,
      /^(?:the answer is|i think)\.?$/i,
    ];

    // Patterns indicating copy-paste
    this.copyPasteIndicators = [
      /\t{2,}/,  // Multiple tabs (from IDE copy)
      /\n{3,}/,  // Excessive newlines
      /https?:\/\/\S+/g,  // URLs (likely pasted from web)
      /copyright|©|all rights reserved/i,
    ];
  }

  /**
   * Evaluate all exam answers
   * @param {Object[]} answers - Array of answer objects
   * @param {string} moduleId - Module identifier
   * @param {string} examId - Exam identifier
   * @returns {Object} Evaluation results
   */
  async evaluate(answers, moduleId, examId) {
    const mcqAnswers = answers.filter((a) => a?.questionType === 'mcq');
    const openAnswers = answers.filter((a) => a?.questionType === 'open');

    // Grade MCQs (automatic)
    const mcqResult = this.gradeMCQs(mcqAnswers);

    // Evaluate open-ended (semantic analysis)
    const openResult = this.evaluateOpenEnded(openAnswers, moduleId);

    // Calculate section scores (10 points each, normalized)
    const mcqScore = Math.round((mcqResult.correct / Math.max(mcqResult.total, 1)) * 10);
    const openScore = Math.round(openResult.averageScore * 10);

    // Total score out of 10 (average of both sections)
    const totalScore = Math.round((mcqScore + openScore) / 2);

    return {
      mcqScore,
      openScore,
      totalScore,
      details: {
        mcq: mcqResult,
        open: openResult,
      },
    };
  }

  /**
   * Grade MCQ answers
   */
  gradeMCQs(answers) {
    let correct = 0;
    const total = answers.length;
    const details = [];

    answers.forEach((answer, index) => {
      // In production, compare against stored correct answers
      // For now, we track the selection
      const isCorrect = answer.answer !== null && answer.answer !== undefined;
      if (isCorrect) correct++;

      details.push({
        questionIndex: index,
        selected: answer.answer,
        correct: isCorrect,
      });
    });

    return { correct, total, details };
  }

  /**
   * Evaluate open-ended answers with semantic analysis
   */
  evaluateOpenEnded(answers, moduleId) {
    const evaluations = [];
    let totalScore = 0;

    answers.forEach((answer, index) => {
      const text = answer?.answer || '';
      const evaluation = this.analyzeOpenResponse(text, moduleId);
      evaluations.push(evaluation);
      totalScore += evaluation.score;
    });

    return {
      evaluations,
      averageScore: answers.length > 0 ? totalScore / answers.length : 0,
    };
  }

  /**
   * Analyze a single open-ended response
   * @returns {Object} Score (0-1) and analysis details
   */
  analyzeOpenResponse(text, moduleId) {
    let score = 0;
    const flags = [];

    // Length check
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    if (wordCount < 10) {
      flags.push('too-short');
      return { score: 0, flags, wordCount, analysis: 'Response too short' };
    }

    // Base score for providing a response
    score += 0.2;

    // Length bonus (up to 0.2)
    if (wordCount >= 30) score += 0.05;
    if (wordCount >= 50) score += 0.05;
    if (wordCount >= 100) score += 0.05;
    if (wordCount >= 150) score += 0.05;

    // Specificity check — looks for technical terms, code mentions, specific details
    const specificityScore = this.checkSpecificity(text);
    score += specificityScore * 0.3;

    // Coherence check — sentence structure, flow
    const coherenceScore = this.checkCoherence(text);
    score += coherenceScore * 0.2;

    // Generic response penalty
    if (this.isGeneric(text)) {
      flags.push('generic');
      score = Math.min(score, 0.2);
    }

    // Depth penalty for shallow answers
    if (wordCount >= 20 && specificityScore < 0.3) {
      flags.push('shallow');
      score *= 0.7;
    }

    score = Math.min(Math.max(score, 0), 1);

    return {
      score,
      flags,
      wordCount,
      analysis: this.generateAnalysis(score, flags),
    };
  }

  /**
   * Check response specificity — does it contain technical detail?
   */
  checkSpecificity(text) {
    let score = 0;
    const lower = text.toLowerCase();

    // Technical indicators
    const techTerms = [
      'api', 'function', 'method', 'class', 'parameter', 'variable',
      'model', 'training', 'data', 'algorithm', 'implementation',
      'code', 'error', 'debug', 'test', 'deploy', 'config',
      'prompt', 'response', 'context', 'token', 'agent',
      'firebase', 'google', 'cloud', 'sdk', 'endpoint',
    ];

    const found = techTerms.filter((term) => lower.includes(term));
    score += Math.min(found.length / 5, 1) * 0.5;

    // Code-like content
    if (/`[^`]+`|```[\s\S]*```|\b\w+\(\)|import |export |const |let |var /.test(text)) {
      score += 0.3;
    }

    // Specific examples or steps
    if (/step \d|first|then|next|finally|for example|such as|specifically/i.test(text)) {
      score += 0.2;
    }

    return Math.min(score, 1);
  }

  /**
   * Check response coherence
   */
  checkCoherence(text) {
    let score = 0;

    // Multiple sentences
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 5);
    if (sentences.length >= 2) score += 0.3;
    if (sentences.length >= 4) score += 0.2;

    // Proper capitalization
    if (/^[A-Z]/.test(text.trim())) score += 0.1;

    // Paragraph structure
    if (text.includes('\n')) score += 0.2;

    // Logical connectors
    if (/because|therefore|however|moreover|additionally|furthermore/i.test(text)) {
      score += 0.2;
    }

    return Math.min(score, 1);
  }

  /**
   * Check if response is overly generic
   */
  isGeneric(text) {
    for (const pattern of this.genericPatterns) {
      if (pattern.test(text)) return true;
    }
    return false;
  }

  /**
   * Detect AI-generated content
   * Returns analysis with flag count
   */
  async detectAICheating(answers, examId) {
    let flagCount = 0;
    const flaggedAnswers = [];

    for (const answer of answers) {
      if (answer?.questionType !== 'open') continue;

      const text = answer?.answer || '';
      const analysis = this.analyzeForAI(text);

      if (analysis.isLikelyAI) {
        flagCount++;
        flaggedAnswers.push({
          questionIndex: answers.indexOf(answer),
          patterns: analysis.matchedPatterns,
          confidence: analysis.confidence,
        });
      }

      // Copy-paste detection
      if (this.detectCopyPaste(text)) {
        flagCount++;
        flaggedAnswers.push({
          questionIndex: answers.indexOf(answer),
          type: 'copy-paste',
        });
      }
    }

    return {
      flagCount,
      flaggedAnswers,
      recommendation: flagCount >= 2 ? 'zero' : flagCount === 1 ? 'warning' : 'clean',
    };
  }

  /**
   * Analyze text for AI-generated patterns
   */
  analyzeForAI(text) {
    const matchedPatterns = [];
    let confidence = 0;

    for (const pattern of this.aiPatterns) {
      if (pattern.test(text)) {
        matchedPatterns.push(pattern.toString());
        confidence += 0.15;
      }
    }

    // Vocabulary uniformity check (AI tends to use sophisticated vocabulary consistently)
    const words = text.split(/\s+/);
    const longWords = words.filter((w) => w.length > 8);
    const longWordRatio = longWords.length / Math.max(words.length, 1);
    if (longWordRatio > 0.3) {
      confidence += 0.1;
      matchedPatterns.push('high-vocabulary-uniformity');
    }

    // Perfect grammar with no typos (suspicious in timed conditions)
    const hasTypos = /[a-z]{2,}[A-Z]|[^.!?]\s{2,}[a-z]/.test(text);
    if (!hasTypos && words.length > 50) {
      confidence += 0.05;
    }

    return {
      isLikelyAI: confidence >= 0.3,
      confidence: Math.min(confidence, 1),
      matchedPatterns,
    };
  }

  /**
   * Detect copy-paste behavior
   */
  detectCopyPaste(text) {
    for (const pattern of this.copyPasteIndicators) {
      if (pattern.test(text)) return true;
    }
    return false;
  }

  /**
   * Generate human-readable analysis summary
   */
  generateAnalysis(score, flags) {
    if (score >= 0.8) return 'Excellent response demonstrating deep understanding';
    if (score >= 0.6) return 'Good response with adequate detail';
    if (score >= 0.4) return 'Acceptable response but could include more specifics';
    if (flags.includes('generic')) return 'Response is too generic — provide specific details';
    if (flags.includes('too-short')) return 'Response is too short to evaluate';
    if (flags.includes('shallow')) return 'Response lacks depth — demonstrate deeper understanding';
    return 'Insufficient response — more detail and specificity needed';
  }
}

module.exports = { EvaluationAgent };
