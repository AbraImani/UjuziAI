/**
 * Question Generator Agent
 * 
 * Responsibilities:
 * - Generate dynamic question pools per module
 * - Vary concepts between attempts (prevent memorization)
 * - Produce 7 MCQ + 3 open-ended questions
 * - Base questions on selected codelab context
 * 
 * ADK Role: Task Execution Agent
 * A2A: Receives config from Orchestrator, sends questions to Anti-Hallucination for validation
 */

// Module-specific question banks (in production, these would come from a database or AI model)
const QUESTION_BANKS = {
  'intro-ai-fundamentals': {
    concepts: [
      'supervised learning', 'unsupervised learning', 'neural networks',
      'training data', 'model evaluation', 'overfitting', 'bias',
      'classification', 'regression', 'deep learning',
    ],
    mcqPool: [
      {
        concept: 'supervised learning',
        text: 'What distinguishes supervised learning from unsupervised learning?',
        options: [
          'Supervised learning uses labeled data for training',
          'Supervised learning doesn\'t require any data',
          'Unsupervised learning always produces better results',
          'There is no difference between them',
        ],
        correct: 0,
      },
      {
        concept: 'neural networks',
        text: 'What is the primary function of activation functions in neural networks?',
        options: [
          'To store training data',
          'To introduce non-linearity into the network',
          'To reduce the number of parameters',
          'To connect to external databases',
        ],
        correct: 1,
      },
      {
        concept: 'overfitting',
        text: 'Which technique helps prevent overfitting in machine learning models?',
        options: [
          'Increasing model complexity',
          'Using less training data',
          'Regularization and cross-validation',
          'Removing all validation data',
        ],
        correct: 2,
      },
      {
        concept: 'training data',
        text: 'Why is data quality important in AI model training?',
        options: [
          'It isn\'t important — quantity matters more',
          'Clean, representative data leads to more accurate and reliable models',
          'Only the algorithm matters',
          'Data quality only affects speed, not accuracy',
        ],
        correct: 1,
      },
      {
        concept: 'model evaluation',
        text: 'What does the F1 score measure in classification?',
        options: [
          'Model training speed',
          'The harmonic mean of precision and recall',
          'Total number of predictions made',
          'GPU utilization during inference',
        ],
        correct: 1,
      },
      {
        concept: 'deep learning',
        text: 'What makes deep learning "deep" compared to traditional ML?',
        options: [
          'It uses more storage space',
          'It requires more expensive hardware',
          'It uses multiple hidden layers to learn hierarchical representations',
          'It takes longer to train',
        ],
        correct: 2,
      },
      {
        concept: 'bias',
        text: 'How can bias in AI systems be mitigated?',
        options: [
          'By using only synthetic data',
          'Bias cannot be mitigated',
          'Through diverse training data, fairness metrics, and regular auditing',
          'By training models for longer periods',
        ],
        correct: 2,
      },
      {
        concept: 'classification',
        text: 'Which of the following is NOT a classification task?',
        options: [
          'Email spam detection',
          'Predicting house prices',
          'Image recognition',
          'Sentiment analysis',
        ],
        correct: 1,
      },
      {
        concept: 'regression',
        text: 'What is the key difference between classification and regression?',
        options: [
          'Regression uses more data',
          'Classification predicts categories, regression predicts continuous values',
          'They are identical tasks',
          'Regression can only use linear models',
        ],
        correct: 1,
      },
    ],
    openPool: [
      {
        concept: 'neural networks',
        text: 'Explain how a neural network learns to make predictions. Describe the roles of forward propagation and backpropagation in the training process.',
        context: 'This question tests understanding of neural network training fundamentals.',
      },
      {
        concept: 'model evaluation',
        text: 'You\'ve trained a classification model that achieves 98% accuracy but performs poorly in production. What might be wrong, and how would you diagnose and fix the issue?',
        context: 'Tests ability to identify overfitting and apply proper evaluation techniques.',
      },
      {
        concept: 'bias',
        text: 'Describe a real-world scenario where AI bias could have serious consequences. What steps would you take to detect and mitigate this bias?',
        context: 'Assesses understanding of responsible AI principles and practical bias mitigation.',
      },
      {
        concept: 'supervised learning',
        text: 'Compare supervised and unsupervised learning approaches. For a customer segmentation problem, which would you choose and why?',
        context: 'Tests ability to select appropriate ML paradigms for specific problems.',
      },
    ],
  },
  // Default fallback for any module
  default: {
    concepts: ['implementation', 'architecture', 'best practices', 'debugging', 'optimization'],
    mcqPool: [],
    openPool: [],
  },
};

class QuestionGeneratorAgent {
  constructor() {
    this.name = 'QuestionGeneratorAgent';
    this.version = '1.0.0';
  }

  /**
   * Generate questions for an exam
   * @param {Object} config - Generation configuration
   * @param {string} config.moduleId - Module identifier
   * @param {number} config.attemptNumber - Current attempt number
   * @param {string[]} config.previousTopics - Topics from previous attempts
   * @param {string} config.difficulty - Difficulty level
   * @returns {Object[]} Array of question objects
   */
  async generate(config) {
    const { moduleId, attemptNumber, previousTopics, difficulty } = config;

    // Get question bank for this module
    const bank = QUESTION_BANKS[moduleId] || this.generateDynamicBank(moduleId);

    // Select and shuffle MCQ questions
    let mcqs = this.selectMCQs(bank, previousTopics, attemptNumber);

    // Select and vary open-ended questions
    let openQuestions = this.selectOpenQuestions(bank, previousTopics, attemptNumber);

    // Apply difficulty variation for retry attempts
    if (difficulty === 'varied' && attemptNumber > 1) {
      mcqs = this.varyQuestions(mcqs, attemptNumber);
      openQuestions = this.varyOpenQuestions(openQuestions, attemptNumber);
    }

    return [...mcqs, ...openQuestions];
  }

  /**
   * Select 7 MCQ questions, avoiding previously tested concepts
   */
  selectMCQs(bank, previousTopics, attemptNumber) {
    let pool = [...(bank.mcqPool || [])];

    // For retry attempts, prioritize different concepts
    if (attemptNumber > 1 && previousTopics.length > 0) {
      pool.sort((a, b) => {
        const aUsed = previousTopics.includes(a.concept) ? 1 : 0;
        const bUsed = previousTopics.includes(b.concept) ? 1 : 0;
        return aUsed - bUsed;
      });
    }

    // Shuffle within priority groups
    pool = this.shuffle(pool);

    // Select 7 questions
    const selected = pool.slice(0, 7);

    // If not enough questions, generate fillers
    while (selected.length < 7) {
      selected.push(this.generateFillerMCQ(bank.concepts, selected.length));
    }

    return selected.map((q) => ({
      ...q,
      type: 'mcq',
      options: this.shuffle([...q.options]), // Shuffle options
    }));
  }

  /**
   * Select 3 open-ended questions with concept variation
   */
  selectOpenQuestions(bank, previousTopics, attemptNumber) {
    let pool = [...(bank.openPool || [])];

    if (attemptNumber > 1) {
      pool.sort((a, b) => {
        const aUsed = previousTopics.includes(a.concept) ? 1 : 0;
        const bUsed = previousTopics.includes(b.concept) ? 1 : 0;
        return aUsed - bUsed;
      });
    }

    pool = this.shuffle(pool);
    const selected = pool.slice(0, 3);

    while (selected.length < 3) {
      selected.push(this.generateFillerOpen(bank.concepts, selected.length));
    }

    return selected.map((q) => ({ ...q, type: 'open' }));
  }

  /**
   * Vary questions for retry attempts — rephrase and adjust
   */
  varyQuestions(questions, attemptNumber) {
    return questions.map((q) => ({
      ...q,
      text: this.rephrase(q.text, attemptNumber),
    }));
  }

  varyOpenQuestions(questions, attemptNumber) {
    return questions.map((q) => ({
      ...q,
      text: this.rephrase(q.text, attemptNumber),
      context: q.context + ` (Attempt ${attemptNumber}: Demonstrate deeper understanding)`,
    }));
  }

  /**
   * Simple rephrasing for retry attempts
   */
  rephrase(text, attemptNumber) {
    const prefixes = [
      'Considering what you learned, ',
      'Based on the codelab exercises, ',
      'From a practical standpoint, ',
      'In a production environment, ',
    ];
    const prefix = prefixes[(attemptNumber - 1) % prefixes.length];
    return prefix + text.charAt(0).toLowerCase() + text.slice(1);
  }

  /**
   * Generate dynamic question bank for modules without predefined questions
   */
  generateDynamicBank(moduleId) {
    const concepts = [
      'core concepts', 'implementation details', 'best practices',
      'error handling', 'optimization', 'testing', 'architecture',
    ];

    return {
      concepts,
      mcqPool: concepts.slice(0, 9).map((concept, i) => ({
        concept,
        text: `Which statement about ${concept} in this module is most accurate?`,
        options: [
          `${concept} is only relevant for advanced use cases`,
          `Proper understanding of ${concept} is essential for implementation`,
          `${concept} can be safely ignored in production`,
          `${concept} is automatically handled by the framework`,
        ],
        correct: 1,
      })),
      openPool: concepts.slice(0, 4).map((concept) => ({
        concept,
        text: `Explain how ${concept} applies to the codelab you completed. Provide specific examples from your implementation.`,
        context: `This question assesses practical understanding of ${concept}.`,
      })),
    };
  }

  generateFillerMCQ(concepts, index) {
    const concept = concepts[index % concepts.length] || 'general knowledge';
    return {
      concept,
      text: `What is the recommended approach for ${concept} in this context?`,
      options: [
        'Ignore it completely',
        'Follow established best practices and documentation',
        'Use trial and error exclusively',
        'Copy solutions from unverified sources',
      ],
      correct: 1,
    };
  }

  generateFillerOpen(concepts, index) {
    const concept = concepts[index % concepts.length] || 'implementation';
    return {
      concept,
      text: `Describe your approach to ${concept} in the codelab. What decisions did you make and why?`,
      context: `Evaluates practical experience with ${concept}.`,
    };
  }

  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

module.exports = { QuestionGeneratorAgent };
