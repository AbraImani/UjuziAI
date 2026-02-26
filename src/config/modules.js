// UjuziAI — Module Configuration
// 6 Tracks × 3 Modules = 18 modules total
// Inspired by Google Skills platform

// ============================================
// TRACK DEFINITIONS
// ============================================
export const TRACKS = [
  {
    id: 'ai',
    name: 'Intelligence Artificielle',
    shortName: 'IA',
    description: 'Maîtrisez les fondamentaux de l\'IA, les agents intelligents et les API Gemini',
    color: 'blue',
    gradient: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-500/10',
    bgDark: 'bg-blue-500/15',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-500 dark:text-blue-400',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
    icon: 'brain',
    logo: '/gemini-logo-icon.jpg',
    order: 1,
  },
  {
    id: 'flutter',
    name: 'Flutter & Dart',
    shortName: 'Flutter',
    description: 'Créez des applications mobiles multiplateformes avec Flutter et Firebase',
    color: 'cyan',
    gradient: 'from-cyan-500 to-blue-500',
    bgLight: 'bg-cyan-500/10',
    bgDark: 'bg-cyan-500/15',
    borderColor: 'border-cyan-500/30',
    textColor: 'text-cyan-500 dark:text-cyan-400',
    badgeClass: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
    icon: 'smartphone',
    logo: '/flutter-logo-icon.png',
    order: 2,
  },
  {
    id: 'web',
    name: 'Développement Web',
    shortName: 'Chrome',
    description: 'Construisez des applications web modernes avec les dernières technologies',
    color: 'green',
    gradient: 'from-green-500 to-emerald-600',
    bgLight: 'bg-green-500/10',
    bgDark: 'bg-green-500/15',
    borderColor: 'border-green-500/30',
    textColor: 'text-green-500 dark:text-green-400',
    badgeClass: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30',
    icon: 'globe',
    logo: '/chrome-logo-icon.png',
    order: 3,
  },
  {
    id: 'cloud',
    name: 'Google Cloud',
    shortName: 'Cloud',
    description: 'Maîtrisez les services Google Cloud Platform pour le déploiement et l\'infrastructure',
    color: 'sky',
    gradient: 'from-sky-500 to-blue-600',
    bgLight: 'bg-sky-500/10',
    bgDark: 'bg-sky-500/15',
    borderColor: 'border-sky-500/30',
    textColor: 'text-sky-500 dark:text-sky-400',
    badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
    icon: 'cloud',
    logo: '/google-cloud-logo-icon.jpg',
    order: 4,
  },
  {
    id: 'angular',
    name: 'Angular',
    shortName: 'Angular',
    description: 'Développez des applications d\'entreprise robustes avec Angular et TypeScript',
    color: 'red',
    gradient: 'from-red-500 to-rose-600',
    bgLight: 'bg-red-500/10',
    bgDark: 'bg-red-500/15',
    borderColor: 'border-red-500/30',
    textColor: 'text-red-500 dark:text-red-400',
    badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
    icon: 'hexagon',
    logo: '/angular-logo-icon.jpg',
    order: 5,
  },
  {
    id: 'kotlin',
    name: 'Kotlin & Android',
    shortName: 'Kotlin',
    description: 'Créez des applications Android natives avec Kotlin et Jetpack Compose',
    color: 'purple',
    gradient: 'from-purple-500 to-violet-600',
    bgLight: 'bg-purple-500/10',
    bgDark: 'bg-purple-500/15',
    borderColor: 'border-purple-500/30',
    textColor: 'text-purple-500 dark:text-purple-400',
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
    icon: 'code',
    logo: '/kotlin-logo-icon.jpg',
    order: 6,
  },
];

// ============================================
// MODULES BY TRACK
// ============================================
export const MODULES = [
  // ---- TRACK: AI (3 modules) ----
  {
    id: 'intro-ai-fundamentals',
    title: 'Introduction aux Fondamentaux de l\'IA',
    description: 'Découvrez les bases de l\'intelligence artificielle, les concepts du machine learning et comment l\'IA transforme le développement.',
    codelabUrl: 'https://codelabs.developers.google.com/ai-fundamentals',
    iconName: 'brain',
    trackId: 'ai',
    order: 1,
    estimatedTime: '45 min',
    difficulty: 'Débutant',
    topics: ['Bases IA', 'Machine Learning', 'Réseaux de Neurones'],
  },
  {
    id: 'gemini-api-basics',
    title: 'Premiers pas avec l\'API Gemini',
    description: 'Configurez et utilisez l\'API Gemini pour la génération de texte, les entrées multi-modales et la création de votre première application IA.',
    codelabUrl: 'https://codelabs.developers.google.com/gemini-api',
    iconName: 'sparkles',
    trackId: 'ai',
    order: 2,
    estimatedTime: '60 min',
    difficulty: 'Débutant',
    topics: ['API Gemini', 'Génération de texte', 'IA Multi-modale'],
  },
  {
    id: 'ai-agents-adk',
    title: 'Développement d\'Agents IA avec ADK',
    description: 'Construisez des agents IA autonomes avec l\'Agent Development Kit, incluant l\'utilisation d\'outils et le raisonnement multi-étapes.',
    codelabUrl: 'https://codelabs.developers.google.com/ai-agents-adk',
    iconName: 'bot',
    trackId: 'ai',
    order: 3,
    estimatedTime: '90 min',
    difficulty: 'Avancé',
    topics: ['Agents IA', 'ADK', 'Outils', 'Raisonnement'],
  },

  // ---- TRACK: Flutter (3 modules) ----
  {
    id: 'flutter-basics',
    title: 'Flutter : Les Fondamentaux',
    description: 'Apprenez les bases de Flutter et Dart pour créer de belles applications multiplateformes depuis un seul code source.',
    codelabUrl: 'https://codelabs.developers.google.com/codelabs/flutter-codelab-first',
    iconName: 'smartphone',
    trackId: 'flutter',
    order: 1,
    estimatedTime: '60 min',
    difficulty: 'Débutant',
    topics: ['Flutter', 'Dart', 'Widgets', 'UI'],
  },
  {
    id: 'flutter-firebase',
    title: 'Flutter avec Firebase',
    description: 'Intégrez Firebase à votre application Flutter pour l\'authentification, Firestore, et le stockage cloud.',
    codelabUrl: 'https://codelabs.developers.google.com/codelabs/flutter-firebase',
    iconName: 'flame',
    trackId: 'flutter',
    order: 2,
    estimatedTime: '75 min',
    difficulty: 'Intermédiaire',
    topics: ['Firebase Auth', 'Firestore', 'Cloud Storage'],
  },
  {
    id: 'flutter-genai',
    title: 'IA Générative avec Flutter',
    description: 'Intégrez les capacités d\'IA générative dans vos applications Flutter avec l\'API Gemini et Firebase ML Kit.',
    codelabUrl: 'https://codelabs.developers.google.com/genai-flutter',
    iconName: 'sparkles',
    trackId: 'flutter',
    order: 3,
    estimatedTime: '70 min',
    difficulty: 'Avancé',
    topics: ['Flutter', 'Gemini Mobile', 'Firebase ML'],
  },

  // ---- TRACK: Web (3 modules) ----
  {
    id: 'web-responsive-design',
    title: 'Design Web Responsive',
    description: 'Maîtrisez le design responsive avec HTML5, CSS3, Flexbox et Grid pour créer des sites adaptatifs.',
    codelabUrl: 'https://codelabs.developers.google.com/responsive-design',
    iconName: 'globe',
    trackId: 'web',
    order: 1,
    estimatedTime: '50 min',
    difficulty: 'Débutant',
    topics: ['HTML5', 'CSS3', 'Flexbox', 'Grid'],
  },
  {
    id: 'web-firebase-hosting',
    title: 'Applications Web avec Firebase',
    description: 'Construisez et déployez des applications web avec Firebase Hosting, Authentication et Firestore.',
    codelabUrl: 'https://codelabs.developers.google.com/codelabs/firebase-web',
    iconName: 'cloud',
    trackId: 'web',
    order: 2,
    estimatedTime: '65 min',
    difficulty: 'Intermédiaire',
    topics: ['Firebase Hosting', 'Auth Web', 'Firestore'],
  },
  {
    id: 'web-pwa',
    title: 'Progressive Web Apps (PWA)',
    description: 'Transformez vos applications web en PWA avec Service Workers, notifications push et mode hors-ligne.',
    codelabUrl: 'https://codelabs.developers.google.com/codelabs/your-first-pwapp',
    iconName: 'rocket',
    trackId: 'web',
    order: 3,
    estimatedTime: '70 min',
    difficulty: 'Avancé',
    topics: ['Service Workers', 'Push Notifications', 'Cache API'],
  },

  // ---- TRACK: Cloud (3 modules) ----
  {
    id: 'cloud-fundamentals',
    title: 'Google Cloud : Les Fondamentaux',
    description: 'Découvrez Google Cloud Platform, la console, les projets, IAM et les services essentiels.',
    codelabUrl: 'https://codelabs.developers.google.com/cloud-fundamentals',
    iconName: 'cloud',
    trackId: 'cloud',
    order: 1,
    estimatedTime: '50 min',
    difficulty: 'Débutant',
    topics: ['GCP Console', 'IAM', 'Projets Cloud'],
  },
  {
    id: 'cloud-functions',
    title: 'Cloud Functions & Serverless',
    description: 'Construisez des API serverless avec Cloud Functions, Cloud Run et les triggers événementiels.',
    codelabUrl: 'https://codelabs.developers.google.com/cloud-functions',
    iconName: 'server',
    trackId: 'cloud',
    order: 2,
    estimatedTime: '65 min',
    difficulty: 'Intermédiaire',
    topics: ['Cloud Functions', 'Cloud Run', 'Serverless'],
  },
  {
    id: 'cloud-ai-deploy',
    title: 'Déploiement IA sur Cloud',
    description: 'Déployez des modèles IA en production avec Vertex AI, Cloud Build et les pipelines CI/CD.',
    codelabUrl: 'https://codelabs.developers.google.com/cloud-ai-deploy',
    iconName: 'rocket',
    trackId: 'cloud',
    order: 3,
    estimatedTime: '80 min',
    difficulty: 'Avancé',
    topics: ['Vertex AI', 'Cloud Build', 'CI/CD'],
  },

  // ---- TRACK: Angular (3 modules) ----
  {
    id: 'angular-basics',
    title: 'Angular : Les Fondamentaux',
    description: 'Découvrez Angular, TypeScript, les composants, le routing et les formulaires réactifs.',
    codelabUrl: 'https://codelabs.developers.google.com/angular-basics',
    iconName: 'hexagon',
    trackId: 'angular',
    order: 1,
    estimatedTime: '60 min',
    difficulty: 'Débutant',
    topics: ['Angular', 'TypeScript', 'Composants', 'Routing'],
  },
  {
    id: 'angular-firebase',
    title: 'Angular avec Firebase',
    description: 'Intégrez Firebase dans une application Angular : AngularFire, authentification et base de données temps réel.',
    codelabUrl: 'https://codelabs.developers.google.com/angular-firebase',
    iconName: 'flame',
    trackId: 'angular',
    order: 2,
    estimatedTime: '70 min',
    difficulty: 'Intermédiaire',
    topics: ['AngularFire', 'RxJS', 'Real-time DB'],
  },
  {
    id: 'angular-material',
    title: 'Angular Material & Animations',
    description: 'Créez des interfaces professionnelles avec Angular Material, les animations et les thèmes personnalisés.',
    codelabUrl: 'https://codelabs.developers.google.com/angular-material',
    iconName: 'palette',
    trackId: 'angular',
    order: 3,
    estimatedTime: '65 min',
    difficulty: 'Avancé',
    topics: ['Material Design', 'Animations', 'Thèmes'],
  },

  // ---- TRACK: Kotlin (3 modules) ----
  {
    id: 'kotlin-basics',
    title: 'Kotlin : Les Fondamentaux',
    description: 'Apprenez les bases de Kotlin et le développement Android moderne avec Android Studio.',
    codelabUrl: 'https://codelabs.developers.google.com/kotlin-basics',
    iconName: 'code',
    trackId: 'kotlin',
    order: 1,
    estimatedTime: '55 min',
    difficulty: 'Débutant',
    topics: ['Kotlin', 'Android Studio', 'Syntax'],
  },
  {
    id: 'kotlin-compose',
    title: 'Jetpack Compose',
    description: 'Construisez des interfaces Android déclaratives avec Jetpack Compose, Material 3 et les états réactifs.',
    codelabUrl: 'https://codelabs.developers.google.com/jetpack-compose',
    iconName: 'layout',
    trackId: 'kotlin',
    order: 2,
    estimatedTime: '70 min',
    difficulty: 'Intermédiaire',
    topics: ['Jetpack Compose', 'Material 3', 'État réactif'],
  },
  {
    id: 'kotlin-firebase',
    title: 'Kotlin avec Firebase',
    description: 'Intégrez Firebase dans votre application Android Kotlin : Auth, Firestore, Cloud Messaging.',
    codelabUrl: 'https://codelabs.developers.google.com/kotlin-firebase',
    iconName: 'flame',
    trackId: 'kotlin',
    order: 3,
    estimatedTime: '75 min',
    difficulty: 'Avancé',
    topics: ['Firebase Auth', 'Firestore', 'FCM'],
  },
];

// ============================================
// HELPERS
// ============================================
export function getTrackById(trackId) {
  return TRACKS.find((t) => t.id === trackId);
}

export function getModulesByTrack(trackId) {
  return MODULES.filter((m) => m.trackId === trackId).sort((a, b) => a.order - b.order);
}

export function getTrackProgress(trackId, progressMap) {
  const trackModules = getModulesByTrack(trackId);
  const completed = trackModules.filter((m) => progressMap[m.id]?.examScore >= 6).length;
  return {
    total: trackModules.length,
    completed,
    percentage: trackModules.length > 0 ? (completed / trackModules.length) * 100 : 0,
  };
}

export const DIFFICULTY_COLORS = {
  'Débutant': 'text-accent-400 bg-accent-500/10 border-accent-500/30',
  'Intermédiaire': 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  'Avancé': 'text-red-400 bg-red-500/10 border-red-500/30',
  // Keep English fallback
  Beginner: 'text-accent-400 bg-accent-500/10 border-accent-500/30',
  Intermediate: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  Advanced: 'text-red-400 bg-red-500/10 border-red-500/30',
};

export const EXAM_CONFIG = {
  MCQ_COUNT: 7,
  OPEN_COUNT: 3,
  MCQ_TIME_SECONDS: 30,
  OPEN_TIME_SECONDS: 300,
  MAX_ATTEMPTS: 2,
  PASSING_SCORE: 6,
  MAX_SCORE: 10,
  POINTS_PER_SECTION: 10,
};

export const BADGE_MESSAGES = {
  completed: 'Félicitations ! Vous avez obtenu votre badge de certification.',
  failed: 'Continuez à apprendre. Revoyez le codelab et préparez-vous pour réessayer.',
  locked: 'Cet examen a été verrouillé en raison de violations de la politique.',
  pending: 'Votre soumission est en cours d\'examen.',
};
