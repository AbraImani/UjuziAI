import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MODULES, EXAM_CONFIG } from '../config/modules';
import { useExam } from '../hooks/useFirestore';
import ExamInterface from '../components/ExamInterface';
import { Shield, AlertTriangle, CheckCircle, XCircle, Loader2, ArrowLeft, Play } from 'lucide-react';
import toast from 'react-hot-toast';

// Générateur de questions en français — difficiles, piégeuses, spécifiques au module
// attemptNumber: 1 or 2 — generates DIFFERENT questions for each attempt
function generateQuestions(module, attemptNumber = 1) {
  const mcqQuestions = [];
  const openQuestions = [];

  const topic0 = module.topics[0];
  const topic1 = module.topics[1] || module.topics[0];
  const topic2 = module.topics[2] || module.topics[0];
  const title = module.title;

  // ---- SET A: attempt 1 ----
  const mcqSetA = [
    {
      text: `Dans le cadre du module "${title}", laquelle de ces affirmations sur ${topic0} est FAUSSE ?`,
      options: [
        `${topic0} nécessite une configuration initiale avant toute utilisation en production`,
        `${topic0} peut fonctionner de manière totalement autonome sans aucune dépendance externe`,
        `${topic0} s'intègre avec d'autres services via des API standardisées`,
        `${topic0} requiert une compréhension des principes fondamentaux pour une utilisation efficace`,
      ],
      correct: 1,
    },
    {
      text: `Lors de l'implémentation de ${topic1} dans le codelab "${title}", quelle étape est INDISPENSABLE avant le déploiement ?`,
      options: [
        `Supprimer tous les fichiers de configuration pour alléger le projet`,
        `Désactiver les logs pour améliorer les performances`,
        `Valider les entrées utilisateur et gérer les cas limites de manière rigoureuse`,
        `Utiliser uniquement des valeurs codées en dur pour garantir la stabilité`,
      ],
      correct: 2,
    },
    {
      text: `Quelle est la PRINCIPALE différence entre ${topic0} et ${topic1} dans le contexte de ce module ?`,
      options: [
        `${topic0} gère la couche présentation tandis que ${topic1} gère la logique métier`,
        `Ils remplissent des rôles complémentaires dans l'architecture : ${topic0} pour la base et ${topic1} pour l'extension des fonctionnalités`,
        `${topic0} est obsolète et remplacé entièrement par ${topic1}`,
        `Ils sont interchangeables et peuvent être utilisés indifféremment`,
      ],
      correct: 1,
    },
    {
      text: `Dans le codelab, un développeur rencontre une erreur lors de l'intégration de ${topic2}. Quelle est la PREMIÈRE action à entreprendre ?`,
      options: [
        `Réinstaller complètement l'environnement de développement`,
        `Vérifier les logs d'erreur et la documentation officielle pour identifier la cause racine`,
        `Ignorer l'erreur et continuer le développement`,
        `Contacter immédiatement le support technique sans investigation préalable`,
      ],
      correct: 1,
    },
    {
      text: `Parmi ces bonnes pratiques pour "${title}", laquelle est INCORRECTE ?`,
      options: [
        `Documenter le code et les décisions architecturales`,
        `Effectuer des tests unitaires et d'intégration régulièrement`,
        `Stocker les clés API et secrets directement dans le code source pour un accès rapide`,
        `Utiliser le contrôle de version pour suivre les changements`,
      ],
      correct: 2,
    },
    {
      text: `Quel problème de sécurité est le PLUS critique lors du travail avec ${topic0} et ${topic1} ?`,
      options: [
        `L'utilisation de bibliothèques open-source`,
        `L'exposition de données sensibles via des API non sécurisées ou des permissions mal configurées`,
        `L'utilisation du mode sombre dans l'interface`,
        `Le choix du langage de programmation`,
      ],
      correct: 1,
    },
    {
      text: `En termes de performance et d'optimisation pour "${title}", quelle approche est la PLUS efficace ?`,
      options: [
        `Charger toutes les ressources au démarrage pour éviter les requêtes ultérieures`,
        `Désactiver la mise en cache pour toujours avoir les données les plus récentes`,
        `Implémenter le chargement progressif, la mise en cache intelligente et minimiser les appels réseau inutiles`,
        `Dupliquer les données sur plusieurs serveurs sans stratégie de synchronisation`,
      ],
      correct: 2,
    },
  ];

  // ---- SET B: attempt 2 — completely different questions ----
  const mcqSetB = [
    {
      text: `Concernant ${topic0} dans "${title}", quelle affirmation démontre une MAUVAISE compréhension du concept ?`,
      options: [
        `${topic0} peut être combiné avec ${topic1} pour une architecture plus robuste`,
        `${topic0} ne nécessite aucune gestion d'erreurs car il est auto-correctif par défaut`,
        `La documentation officielle de ${topic0} recommande des bonnes pratiques spécifiques`,
        `L'utilisation de ${topic0} en production requiert des tests approfondis`,
      ],
      correct: 1,
    },
    {
      text: `Quelle est la conséquence DIRECTE d'ignorer la gestion des erreurs dans ${topic1} lors du codelab "${title}" ?`,
      options: [
        `L'application fonctionnera plus rapidement grâce à moins de code`,
        `Des comportements imprévisibles et des failles de sécurité potentielles en production`,
        `Le compilateur corrigera automatiquement les erreurs au build`,
        `Les utilisateurs ne remarqueront aucune différence`,
      ],
      correct: 1,
    },
    {
      text: `Pour "${title}", quel scénario illustre le MIEUX l'intégration entre ${topic0} et ${topic2} ?`,
      options: [
        `Utiliser ${topic0} uniquement en développement et ${topic2} uniquement en production`,
        `Remplacer ${topic0} par ${topic2} une fois le prototype validé`,
        `${topic0} fournit la couche de données/logique tandis que ${topic2} étend les capacités via des fonctionnalités complémentaires`,
        `Exécuter ${topic0} et ${topic2} dans des projets séparés sans communication`,
      ],
      correct: 2,
    },
    {
      text: `Lors du débogage d'une application basée sur "${title}", quel outil est le MOINS approprié ?`,
      options: [
        `Les outils de développement du navigateur ou l'IDE`,
        `Les logs structurés et le monitoring en temps réel`,
        `Modifier le code en production directement sans environnement de test`,
        `Les breakpoints et le débogage pas-à-pas`,
      ],
      correct: 2,
    },
    {
      text: `Quelle stratégie de test est la PLUS adaptée pour valider une fonctionnalité utilisant ${topic1} dans ce module ?`,
      options: [
        `Tester uniquement l'interface utilisateur manuellement`,
        `Écrire des tests unitaires pour la logique métier et des tests d'intégration pour les interactions entre composants`,
        `Déployer directement en production et observer les rapports de crash`,
        `Demander aux utilisateurs finaux de signaler les problèmes`,
      ],
      correct: 1,
    },
    {
      text: `Dans "${title}", pourquoi est-il CRITIQUE de gérer correctement l'authentification avec ${topic0} ?`,
      options: [
        `L'authentification n'est pas nécessaire pour les applications internes`,
        `Pour empêcher l'accès non autorisé aux données et protéger la vie privée des utilisateurs`,
        `Uniquement pour satisfaire les exigences réglementaires`,
        `L'authentification ralentit l'application et doit être minimisée`,
      ],
      correct: 1,
    },
    {
      text: `Quelle architecture est la PLUS recommandée pour une application de production utilisant les concepts de "${title}" ?`,
      options: [
        `Un fichier monolithique contenant toute la logique applicative`,
        `Une architecture modulaire avec séparation des responsabilités, couche de services et gestion d'état centralisée`,
        `Copier-coller le code du codelab sans modification ni refactoring`,
        `Multiplier les dépendances externes sans évaluer leur maintenance`,
      ],
      correct: 1,
    },
  ];

  const mcqTemplates = attemptNumber === 2 ? mcqSetB : mcqSetA;

  for (let i = 0; i < EXAM_CONFIG.MCQ_COUNT; i++) {
    mcqQuestions.push({
      type: 'mcq',
      ...mcqTemplates[i],
    });
  }

  // 3 questions ouvertes en français — exigent des réponses détaillées et spécifiques
  const openSetA = [
    {
      text: `Décrivez en détail les étapes que vous avez suivies pour implémenter ${topic0} dans le codelab "${title}". Quels obstacles avez-vous rencontrés et comment les avez-vous résolus ? Citez des éléments concrets du codelab.`,
      context: `Cette question évalue votre compréhension pratique de ${topic0}. Une réponse vague, générique ou sans référence au codelab recevra zéro point.`,
    },
    {
      text: `Proposez un cas d'utilisation concret et original où les concepts de "${title}" (notamment ${topic1} et ${topic2}) pourraient résoudre un problème réel. Décrivez l'architecture technique que vous adopteriez.`,
      context: `Démontrez votre capacité à appliquer les concepts du codelab à des situations pratiques. Les réponses superficielles ou sans détail technique recevront zéro point.`,
    },
    {
      text: `Analysez les avantages et les limites de ${topic0} par rapport à ${topic1}. Dans quelles situations recommanderiez-vous l'un plutôt que l'autre ? Justifiez avec des arguments techniques précis.`,
      context: `Montrez votre profondeur de compréhension en analysant les compromis et les décisions de conception. Les réponses courtes ou non pertinentes recevront zéro point.`,
    },
  ];

  const openSetB = [
    {
      text: `Si vous deviez refaire le codelab "${title}" en partant de zéro, quelles décisions techniques changeriez-vous concernant ${topic0} ? Justifiez en citant des problèmes rencontrés ou des améliorations possibles.`,
      context: `Cette question évalue votre esprit critique et votre capacité à itérer. Référencez des éléments concrets du codelab.`,
    },
    {
      text: `Imaginez que vous devez présenter les concepts de ${topic1} et ${topic2} du module "${title}" à un développeur junior. Expliquez les concepts clés, les pièges à éviter et les ressources recommandées.`,
      context: `Démontrez votre maîtrise pédagogique des concepts. Les réponses sans structure ni détails techniques recevront zéro point.`,
    },
    {
      text: `Décrivez comment vous intégreriez les technologies de "${title}" dans un projet existant de votre choix. Quels défis d'intégration anticipez-vous et comment les résoudriez-vous ?`,
      context: `Montrez votre capacité à contextualiser les apprentissages. Les réponses génériques sans scénario concret recevront zéro point.`,
    },
  ];

  const openTemplates = attemptNumber === 2 ? openSetB : openSetA;

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
      // Use different question set for 2nd attempt
      const attemptNumber = (status?.attempts || 0) + 1;
      const q = generateQuestions(module, attemptNumber);
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
              QCM : {examResult?.mcqCorrect || 0}/{examResult?.mcqTotal || 7} • Ouvertes : {examResult?.openScore || 0}/{examResult?.openTotal || 3}
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
              <span><strong className="text-heading">7 questions QCM</strong> — 30 secondes chacune (1 point par bonne réponse)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-400 mt-0.5">•</span>
              <span><strong className="text-heading">3 questions ouvertes</strong> — max 2 minutes chacune (0.5 pt réponse partielle, 1 pt réponse détaillée)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-400 mt-0.5">•</span>
              <span><strong className="text-heading">Score total : 10 points</strong> — QCM : 1pt chacune, ouvertes : 0.5 ou 1pt selon la qualité</span>
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
              <span><strong className="text-heading">Score de réussite : 6/10</strong> — certificat à partir de 7/10</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-400 mt-0.5">•</span>
              <span><strong className="text-heading">Meilleur score conservé</strong> — si vous repassez l'examen, seul le meilleur score est gardé</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <span><strong className="text-red-300">Réponses vagues ou absurdes = 0 point</strong> — les réponses comme "rien", "ok", "je ne sais pas" seront automatiquement rejetées</span>
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

