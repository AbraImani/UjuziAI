/**
 * Anti-Hallucination Agent
 * 
 * Responsibilities:
 * - Cross-check answers against codelab context
 * - Prevent grading inconsistencies  
 * - Validate generated questions are relevant
 * - Ensure scoring accuracy and fairness
 * 
 * ADK Role: Quality Assurance Agent
 * A2A: Receives data from QuestionGenerator and Evaluation agents, returns verified results
 */

// Module context data for cross-referencing
const MODULE_CONTEXTS = {
  'intro-ai-fundamentals': {
    validConcepts: [
      'supervised learning', 'unsupervised learning', 'reinforcement learning',
      'neural networks', 'deep learning', 'training data', 'test data',
      'overfitting', 'underfitting', 'bias', 'variance', 'accuracy',
      'precision', 'recall', 'f1 score', 'classification', 'regression',
      'gradient descent', 'loss function', 'activation function',
    ],
    invalidConcepts: [
      'quantum computing', 'blockchain', 'cryptocurrency', 'web3',
    ],
    keyTopics: ['AI Basics', 'Machine Learning', 'Neural Networks'],
  },
  'gemini-api-basics': {
    validConcepts: [
      'gemini api', 'text generation', 'multi-modal', 'api key',
      'prompt', 'response', 'token', 'model', 'safety settings',
      'content generation', 'embedding', 'chat', 'streaming',
    ],
    invalidConcepts: ['gpt', 'openai', 'claude', 'anthropic'],
    keyTopics: ['Gemini API', 'Text Generation', 'Multi-modal AI'],
  },
  'prompt-engineering': {
    validConcepts: [
      'few-shot', 'zero-shot', 'chain-of-thought', 'prompt template',
      'system prompt', 'structured output', 'temperature', 'top-p',
      'instruction tuning', 'role prompting', 'prompt chaining',
    ],
    invalidConcepts: [],
    keyTopics: ['Prompt Design', 'Few-shot Learning', 'Chain-of-Thought'],
  },
  'vertex-ai-studio': {
    validConcepts: [
      'vertex ai', 'model garden', 'fine-tuning', 'deployment',
      'endpoint', 'pipeline', 'batch prediction', 'online prediction',
      'model evaluation', 'custom training', 'automl',
    ],
    invalidConcepts: ['sagemaker', 'azure ml'],
    keyTopics: ['Vertex AI', 'Model Tuning', 'AI Pipelines'],
  },
  'ai-agents-adk': {
    validConcepts: [
      'agent', 'tool use', 'function calling', 'reasoning',
      'planning', 'multi-step', 'adk', 'agent loop',
      'observation', 'action', 'thought', 'autonomy',
    ],
    invalidConcepts: [],
    keyTopics: ['AI Agents', 'ADK', 'Tool Use', 'Reasoning'],
  },
  'mcp-context-protocol': {
    validConcepts: [
      'context protocol', 'memory', 'state', 'context window',
      'persistence', 'session', 'stateful', 'conversation history',
      'mcp', 'context management', 'token limit',
    ],
    invalidConcepts: [],
    keyTopics: ['MCP', 'Context Management', 'Memory'],
  },
  'a2a-communication': {
    validConcepts: [
      'agent-to-agent', 'a2a', 'delegation', 'coordination',
      'multi-agent', 'message passing', 'protocol', 'orchestration',
      'collaboration', 'task routing', 'agent communication',
    ],
    invalidConcepts: [],
    keyTopics: ['A2A Protocol', 'Multi-Agent Systems', 'Coordination'],
  },
  'responsible-ai': {
    validConcepts: [
      'fairness', 'transparency', 'accountability', 'safety',
      'bias', 'ethics', 'privacy', 'consent', 'explainability',
      'audit', 'governance', 'compliance', 'harm reduction',
    ],
    invalidConcepts: [],
    keyTopics: ['AI Safety', 'Bias Detection', 'Ethics'],
  },
};

class AntiHallucinationAgent {
  constructor() {
    this.name = 'AntiHallucinationAgent';
    this.version = '1.0.0';
  }

  /**
   * Validate that generated questions are relevant to the module
   * Called via A2A from the Orchestrator after QuestionGenerator
   * 
   * @param {Object[]} questions - Generated questions
   * @param {string} moduleId - Module identifier
   * @returns {Object[]} Validated and filtered questions
   */
  async validateQuestions(questions, moduleId) {
    const context = MODULE_CONTEXTS[moduleId] || MODULE_CONTEXTS['intro-ai-fundamentals'];
    const validated = [];

    for (const question of questions) {
      const validation = this.validateQuestion(question, context);

      if (validation.isValid) {
        validated.push(question);
      } else {
        // Replace invalid question with a safe fallback
        validated.push(this.generateSafeQuestion(question.type, context));
        console.warn(`Question replaced: ${validation.reason}`);
      }
    }

    return validated;
  }

  /**
   * Validate a single question against module context
   */
  validateQuestion(question, context) {
    const text = (question.text || '').toLowerCase();

    // Check for invalid concepts (wrong module context)
    for (const invalid of context.invalidConcepts) {
      if (text.includes(invalid.toLowerCase())) {
        return { isValid: false, reason: `Contains off-topic concept: ${invalid}` };
      }
    }

    // Check question has actual content
    if (text.length < 10) {
      return { isValid: false, reason: 'Question too short' };
    }

    // MCQ-specific validation
    if (question.type === 'mcq') {
      if (!question.options || question.options.length < 4) {
        return { isValid: false, reason: 'Insufficient options' };
      }
      if (question.correct === undefined || question.correct === null) {
        return { isValid: false, reason: 'No correct answer specified' };
      }
    }

    return { isValid: true };
  }

  /**
   * Verify grading from the Evaluation Agent
   * Cross-checks scores against answer quality to prevent inconsistencies
   * 
   * Called via A2A from the Orchestrator after EvaluationAgent
   * 
   * @param {Object} evaluationResult - Results from EvaluationAgent
   * @param {string} moduleId - Module identifier
   * @param {Object[]} answers - Original answers
   * @returns {Object} Verified evaluation results
   */
  async verifyGrading(evaluationResult, moduleId, answers) {
    const verified = { ...evaluationResult };
    const context = MODULE_CONTEXTS[moduleId] || {};

    // Verify MCQ grading (should be deterministic)
    if (verified.details?.mcq) {
      const mcq = verified.details.mcq;
      // MCQ grading is automatic — verify counts match
      if (mcq.correct > mcq.total) {
        mcq.correct = mcq.total;
        console.warn('MCQ score corrected: correct > total');
      }
    }

    // Verify open-ended grading
    if (verified.details?.open?.evaluations) {
      for (let i = 0; i < verified.details.open.evaluations.length; i++) {
        const eval_ = verified.details.open.evaluations[i];
        const answer = answers.find((a) => a?.questionType === 'open');

        if (answer) {
          const text = answer.answer || '';

          // Cross-check: If answer mentions valid concepts, ensure score reflects this
          const relevantConcepts = this.countRelevantConcepts(text, context);
          const adjustedScore = this.adjustScore(eval_.score, relevantConcepts, text.length);

          if (Math.abs(adjustedScore - eval_.score) > 0.3) {
            eval_.score = (eval_.score + adjustedScore) / 2;
            eval_.flags = [...(eval_.flags || []), 'score-adjusted'];
            console.info(`Open answer ${i} score adjusted for consistency`);
          }
        }
      }

      // Recalculate average
      const evals = verified.details.open.evaluations;
      verified.details.open.averageScore =
        evals.reduce((sum, e) => sum + e.score, 0) / Math.max(evals.length, 1);
    }

    // Recalculate total score with verified values
    verified.mcqScore = Math.round(
      (verified.details?.mcq?.correct / Math.max(verified.details?.mcq?.total, 1)) * 10
    );
    verified.openScore = Math.round((verified.details?.open?.averageScore || 0) * 10);
    verified.totalScore = Math.round((verified.mcqScore + verified.openScore) / 2);

    return verified;
  }

  /**
   * Count how many valid module concepts appear in the answer
   */
  countRelevantConcepts(text, context) {
    const lower = text.toLowerCase();
    const validConcepts = context.validConcepts || [];
    let count = 0;

    for (const concept of validConcepts) {
      if (lower.includes(concept.toLowerCase())) {
        count++;
      }
    }

    return count;
  }

  /**
   * Adjust score based on concept relevance and answer length
   */
  adjustScore(originalScore, conceptCount, textLength) {
    let adjusted = originalScore;

    // Bonus for relevant concepts
    if (conceptCount >= 3) adjusted += 0.1;
    if (conceptCount >= 5) adjusted += 0.1;

    // Penalty for very short but high-scored answers (potential inconsistency)
    if (textLength < 50 && originalScore > 0.6) {
      adjusted = Math.min(adjusted, 0.4);
    }

    // Ensure bounds
    return Math.min(Math.max(adjusted, 0), 1);
  }

  /**
   * Generate a safe fallback question
   */
  generateSafeQuestion(type, context) {
    const topic = context.keyTopics?.[0] || 'the module content';

    if (type === 'mcq') {
      return {
        type: 'mcq',
        text: `Which of the following best describes a core principle of ${topic}?`,
        options: [
          'It is not applicable to real-world scenarios',
          'It provides foundational capabilities for modern AI development',
          'It is only useful in academic settings',
          'It has been replaced by newer technologies',
        ],
        correct: 1,
        concept: 'general',
      };
    }

    return {
      type: 'open',
      text: `Describe your experience completing the ${topic} codelab. What were the key concepts you learned and how would you apply them?`,
      context: `Evaluates practical understanding of ${topic}.`,
      concept: 'general',
    };
  }
}

module.exports = { AntiHallucinationAgent };
