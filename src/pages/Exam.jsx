import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MODULES, EXAM_CONFIG } from '../config/modules';
import { useExam } from '../hooks/useFirestore';
import ExamInterface from '../components/ExamInterface';
import { Shield, AlertTriangle, CheckCircle, XCircle, Loader2, ArrowLeft, Play } from 'lucide-react';
import toast from 'react-hot-toast';

// Sample question generator (in production, this comes from the backend agent)
function generateQuestions(module) {
  const mcqQuestions = [];
  const openQuestions = [];

  // Generate 7 MCQ questions based on module topics
  const mcqTemplates = [
    {
      text: `What is the primary purpose of ${module.topics[0]}?`,
      options: [
        `To enable efficient data processing in ${module.topics[0]}`,
        `To provide a standardized interface for ${module.title.toLowerCase()}`,
        `To replace traditional programming paradigms`,
        `To optimize hardware resource allocation`,
      ],
      correct: 1,
    },
    {
      text: `Which of the following best describes the relationship between ${module.topics[0]} and ${module.topics[1] || 'AI'}?`,
      options: [
        `${module.topics[0]} is a subset of ${module.topics[1] || 'AI'}`,
        `They are completely independent concepts`,
        `${module.topics[0]} enables and enhances ${module.topics[1] || 'AI'} capabilities`,
        `They can only be used in isolation`,
      ],
      correct: 2,
    },
    {
      text: `In the context of ${module.title}, what is a key consideration when implementing solutions?`,
      options: [
        'Speed is the only factor that matters',
        'Scalability, reliability, and ethical considerations',
        'Using the newest technology available',
        'Minimizing code complexity at all costs',
      ],
      correct: 1,
    },
    {
      text: `What advantage does ${module.topics[0]} provide over traditional approaches?`,
      options: [
        'It eliminates the need for testing',
        'It reduces development time to zero',
        'It provides better automation and intelligent decision-making',
        'It removes the need for human oversight',
      ],
      correct: 2,
    },
    {
      text: `When working with ${module.topics[module.topics.length - 1] || module.topics[0]}, which practice is recommended?`,
      options: [
        'Skip validation for faster deployment',
        'Always validate inputs and handle edge cases',
        'Use hardcoded values for reliability',
        'Avoid documentation to save time',
      ],
      correct: 1,
    },
    {
      text: `What is a common challenge when implementing ${module.title.toLowerCase()} solutions?`,
      options: [
        'Too many available tools',
        'Managing complexity, ensuring accuracy, and maintaining performance',
        'Lack of programming languages',
        'Hardware is always the bottleneck',
      ],
      correct: 1,
    },
    {
      text: `How does ${module.topics[0]} integrate with modern development workflows?`,
      options: [
        'It replaces all existing tools',
        'It cannot be integrated with existing systems',
        'Through APIs, SDKs, and standardized protocols',
        'Only through command-line interfaces',
      ],
      correct: 2,
    },
  ];

  for (let i = 0; i < EXAM_CONFIG.MCQ_COUNT; i++) {
    mcqQuestions.push({
      type: 'mcq',
      ...mcqTemplates[i],
    });
  }

  // Generate 3 open-ended questions
  const openTemplates = [
    {
      text: `Explain how you implemented ${module.topics[0]} in the codelab. What were the key steps and what challenges did you face?`,
      context: `This question assesses your practical understanding of ${module.topics[0]} as covered in the "${module.title}" codelab.`,
    },
    {
      text: `Describe a real-world scenario where ${module.title.toLowerCase()} could be applied. How would you architect the solution?`,
      context: `Demonstrate your ability to apply codelab concepts to practical problems.`,
    },
    {
      text: `Compare and contrast ${module.topics[0]} with ${module.topics[1] || 'alternative approaches'}. When would you choose one over the other?`,
      context: `Show depth of understanding by analyzing trade-offs and design decisions.`,
    },
  ];

  for (let i = 0; i < EXAM_CONFIG.OPEN_COUNT; i++) {
    openQuestions.push({
      type: 'open',
      ...openTemplates[i],
    });
  }

  return [...mcqQuestions, ...openQuestions];
}

export default function Exam() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const module = MODULES.find((m) => m.id === moduleId);
  const { getExamStatus, startExam } = useExam();

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [examId, setExamId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [examStarted, setExamStarted] = useState(false);
  const [examComplete, setExamComplete] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      const s = await getExamStatus(moduleId);
      setStatus(s);
      setLoading(false);
    }
    checkStatus();
  }, [moduleId]);

  const handleStart = async () => {
    setStarting(true);
    try {
      const id = await startExam(moduleId);
      setExamId(id);
      const q = generateQuestions(module);
      setQuestions(q);
      setExamStarted(true);
    } catch (err) {
      toast.error('Failed to start exam: ' + err.message);
    } finally {
      setStarting(false);
    }
  };

  const handleComplete = () => {
    setExamComplete(true);
  };

  if (!module) {
    return (
      <div className="min-h-screen bg-body flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-heading mb-4">Module Not Found</h2>
          <button onClick={() => navigate('/dashboard')} className="btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-body flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  // Exam completed screen
  if (examComplete) {
    return (
      <div className="min-h-screen bg-body flex items-center justify-center p-4">
        <div className="glass-card p-12 max-w-md w-full text-center animate-scale-in">
          <CheckCircle className="w-20 h-20 text-accent-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-heading mb-3">Exam Completed!</h2>
          <p className="text-body mb-8">
            Your answers are being evaluated by our AI agents. Results will be available shortly on the module page.
          </p>
          <button
            onClick={() => navigate(`/module/${moduleId}`)}
            className="btn-primary w-full"
          >
            View Results
          </button>
        </div>
      </div>
    );
  }

  // Exam interface
  if (examStarted && examId) {
    return (
      <div className="min-h-screen bg-body p-4 md:p-8">
        <ExamInterface
          moduleId={moduleId}
          examId={examId}
          questions={questions}
          onComplete={handleComplete}
        />
      </div>
    );
  }

  // Not eligible screen
  if (!status?.eligible) {
    const reasons = {
      'no-submission': {
        icon: AlertTriangle,
        title: 'Submission Required',
        desc: 'You must submit proof of codelab completion before accessing the exam.',
        color: 'amber',
      },
      locked: {
        icon: XCircle,
        title: 'Exam Locked',
        desc: 'This exam has been locked due to policy violations.',
        color: 'red',
      },
      'max-attempts': {
        icon: XCircle,
        title: 'Maximum Attempts Reached',
        desc: 'You have used all available exam attempts.',
        color: 'red',
      },
      'already-passed': {
        icon: CheckCircle,
        title: 'Already Passed',
        desc: 'You have already passed this exam. View your certificate.',
        color: 'accent',
      },
    };

    const r = reasons[status?.reason] || reasons['no-submission'];
    const Icon = r.icon;

    return (
      <div className="min-h-screen bg-body flex items-center justify-center p-4">
        <div className="glass-card p-12 max-w-md w-full text-center">
          <Icon className={`w-16 h-16 text-${r.color}-400 mx-auto mb-4`} />
          <h2 className="text-2xl font-bold text-heading mb-3">{r.title}</h2>
          <p className="text-body mb-6">{r.desc}</p>
          <button onClick={() => navigate(`/module/${moduleId}`)} className="btn-primary">
            Back to Module
          </button>
        </div>
      </div>
    );
  }

  // Pre-exam screen
  return (
    <div className="min-h-screen bg-body flex items-center justify-center p-4">
      <div className="glass-card p-8 md:p-12 max-w-lg w-full">
        <div className="text-center mb-8">
          <Shield className="w-16 h-16 text-primary-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-heading mb-2">
            {module.title} — Exam
          </h2>
          <p className="text-body">
            Attempt {(status.attempts || 0) + 1} of {EXAM_CONFIG.MAX_ATTEMPTS}
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <h3 className="font-semibold text-heading">Exam Rules:</h3>
          <ul className="space-y-3 text-sm text-body">
            <li className="flex items-start gap-2">
              <span className="text-primary-400 mt-0.5">•</span>
              <span><strong className="text-heading">7 MCQ questions</strong> — 25-30 seconds each</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-400 mt-0.5">•</span>
              <span><strong className="text-heading">3 open-ended questions</strong> — max 5 minutes each</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-400 mt-0.5">•</span>
              <span><strong className="text-heading">No back navigation</strong> — one question at a time</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-400 mt-0.5">•</span>
              <span><strong className="text-heading">Auto-advance</strong> when timer expires</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-400 mt-0.5">•</span>
              <span><strong className="text-heading">Passing score: 6/10</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <span><strong className="text-red-300">AI-cheating detection active</strong> — generic or AI-generated answers will be flagged</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleStart}
            disabled={starting}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {starting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Play className="w-5 h-5" />
                Start Exam
              </>
            )}
          </button>
          <button
            onClick={() => navigate(`/module/${moduleId}`)}
            className="btn-secondary w-full"
          >
            <ArrowLeft className="w-4 h-4 inline mr-2" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

