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
  const [examResult, setExamResult] = useState(null);

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
      toast.error('Impossible de démarrer l\'examen : ' + err.message);
    } finally {
      setStarting(false);
    }
  };

  const handleComplete = (result) => {
    setExamResult(result);
    setExamComplete(true);
  };

  if (!module) {
    return (
      <div className="min-h-screen bg-body flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-heading mb-4">Module introuvable</h2>
          <button onClick={() => navigate('/dashboard')} className="btn-primary">
            Retour au tableau de bord
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
    const passed = examResult?.passed;
    return (
      <div className="min-h-screen bg-body flex items-center justify-center p-4">
        <div className="glass-card p-12 max-w-md w-full text-center animate-scale-in">
          {passed ? (
            <CheckCircle className="w-20 h-20 text-accent-400 mx-auto mb-6" />
          ) : (
            <AlertTriangle className="w-20 h-20 text-amber-400 mx-auto mb-6" />
          )}
          <h2 className="text-2xl font-bold text-heading mb-3">
            {passed ? 'Examen réussi ! 🎉' : 'Examen terminé'}
          </h2>
          <div className="mb-4">
            <p className="text-4xl font-bold gradient-text mb-1">
              {examResult?.totalScore || 0}/10
            </p>
            <p className="text-sm text-body">
              QCM : {examResult?.mcqCorrect || 0}/{examResult?.mcqTotal || 7} • Ouvertes : {examResult?.openScore || 0}/3
            </p>
          </div>
          <p className="text-body mb-8">
            {passed
              ? 'Félicitations ! Vous avez obtenu votre badge de certification. Consultez votre certificat dans la page du module.'
              : `Score minimum requis : ${EXAM_CONFIG.PASSING_SCORE}/10. Revoyez le codelab et réessayez.`}
          </p>
          <button
            onClick={() => navigate(`/module/${moduleId}`)}
            className="btn-primary w-full"
          >
            {passed ? 'Voir le certificat' : 'Retour au module'}
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
        title: 'Soumission requise',
        desc: 'Vous devez soumettre la preuve de complétion du codelab avant d\'accéder à l\'examen.',
        color: 'amber',
      },
      locked: {
        icon: XCircle,
        title: 'Examen verrouillé',
        desc: 'Cet examen a été verrouillé en raison de violations de la politique.',
        color: 'red',
      },
      'max-attempts': {
        icon: XCircle,
        title: 'Nombre maximum de tentatives atteint',
        desc: 'Vous avez utilisé toutes les tentatives d\'examen disponibles.',
        color: 'red',
      },
      'already-passed': {
        icon: CheckCircle,
        title: 'Déjà réussi',
        desc: 'Vous avez déjà réussi cet examen. Consultez votre certificat.',
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
            Retour au module
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
            Tentative {(status.attempts || 0) + 1} sur {EXAM_CONFIG.MAX_ATTEMPTS}
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <h3 className="font-semibold text-heading">Règles de l'examen :</h3>
          <ul className="space-y-3 text-sm text-body">
            <li className="flex items-start gap-2">
              <span className="text-primary-400 mt-0.5">•</span>
              <span><strong className="text-heading">7 questions QCM</strong> — 25-30 secondes chacune</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-400 mt-0.5">•</span>
              <span><strong className="text-heading">3 questions ouvertes</strong> — max 5 minutes chacune</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-400 mt-0.5">•</span>
              <span><strong className="text-heading">Pas de retour en arrière</strong> — une question à la fois</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-400 mt-0.5">•</span>
              <span><strong className="text-heading">Avance automatique</strong> quand le temps expire</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-400 mt-0.5">•</span>
              <span><strong className="text-heading">Score de réussite : 6/10</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <span><strong className="text-red-300">Détection de triche IA active</strong> — les réponses génériques ou générées par IA seront signalées</span>
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
                Commencer l'examen
              </>
            )}
          </button>
          <button
            onClick={() => navigate(`/module/${moduleId}`)}
            className="btn-secondary w-full"
          >
            <ArrowLeft className="w-4 h-4 inline mr-2" />
            Retour
          </button>
        </div>
      </div>
    </div>
  );
}

