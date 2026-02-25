import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Zap, BookOpen, Trophy, Shield, ArrowRight, Sparkles, Brain, Users, Target, FileText, Sun, Moon } from 'lucide-react';

export default function Landing() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-body">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <span className="text-lg sm:text-xl font-bold gradient-text">UjuziAI</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-themed text-body hover:text-heading transition-colors"
            title={isDark ? 'Mode clair' : 'Mode sombre'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Link to="/login" className="text-body hover:text-heading transition-colors font-medium text-sm sm:text-base">
            Connexion
          </Link>
          <Link to="/signup" className="btn-primary text-xs sm:text-sm !px-4 !py-2 sm:!px-6 sm:!py-3">
            Commencer
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-16 sm:pb-24">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-600 dark:text-primary-300 text-xs sm:text-sm font-medium mb-6 sm:mb-8 animate-fade-in">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
            Build with AI Season — Ouvert maintenant
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-heading mb-4 sm:mb-6 leading-tight tracking-tight animate-fade-in">
            Maîtrisez le Développement IA
            <br />
            <span className="gradient-text">Compétez & Progressez</span>
          </h1>

          <p className="text-[13px] sm:text-[15px] md:text-base text-body max-w-2xl mx-auto mb-8 sm:mb-10 animate-fade-in leading-relaxed">
            Complétez des codelabs pratiques, prouvez vos compétences à travers des examens supervisés,
            grimpez dans le classement et obtenez des certifications vérifiables. Propulsé par des agents intelligents.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 animate-fade-in">
            <Link to="/signup" className="btn-primary text-sm sm:text-lg px-6 sm:px-8 py-3 sm:py-4 flex items-center gap-2 w-full sm:w-auto justify-center">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
              Commencer la compétition
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
            <Link to="/login" className="btn-secondary text-sm sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto text-center">
              Se connecter
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mt-14 sm:mt-20 max-w-4xl mx-auto">
          {[
            { label: 'Modules', value: '16', icon: BookOpen },
            { label: 'Apprenants', value: '500+', icon: Users },
            { label: 'Certifications', value: '200+', icon: Trophy },
            { label: 'Agents IA', value: '4', icon: Brain },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="glass-card p-4 sm:p-6 text-center">
              <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-primary-500 mx-auto mb-2 sm:mb-3" />
              <p className="text-xl sm:text-2xl font-bold text-heading">{value}</p>
              <p className="text-xs sm:text-sm text-body">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 border-t border-themed">
        <h2 className="section-title text-center mb-3 sm:mb-4">Comment ça marche</h2>
        <p className="section-subtitle text-center mb-10 sm:mb-16 max-w-2xl mx-auto text-sm sm:text-base">
          Un parcours d'apprentissage complet, du codelab à la certification, propulsé par l'orchestration d'agents IA.
        </p>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
          {[
            {
              icon: BookOpen,
              title: '1. Complétez les Codelabs',
              description:
                'Travaillez sur les modules pratiques Build with AI. Chaque codelab enseigne des compétences concrètes en développement IA.',
              color: 'primary',
            },
            {
              icon: Shield,
              title: '2. Soumettez vos preuves',
              description:
                'Téléversez des captures d\'écran, vidéos et descriptions détaillées de votre travail. Les soumissions sont validées avant l\'accès à l\'examen.',
              color: 'accent',
            },
            {
              icon: Trophy,
              title: '3. Obtenez la Certification',
              description:
                'Réussissez l\'examen supervisé par IA avec un score ≥ 6/10. Gagnez un badge vérifiable unique et un certificat téléchargeable.',
              color: 'primary',
            },
          ].map(({ icon: Icon, title, description, color }) => (
            <div key={title} className="glass-card-hover p-6 sm:p-8">
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 ${
                  color === 'accent'
                    ? 'bg-accent-500/20 text-accent-500'
                    : 'bg-primary-500/20 text-primary-500'
                }`}
              >
                <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-heading mb-2 sm:mb-3">{title}</h3>
              <p className="text-body text-sm sm:text-base leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Agent Architecture Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 border-t border-themed">
        <h2 className="section-title text-center mb-3 sm:mb-4">Propulsé par des Agents IA</h2>
        <p className="section-subtitle text-center mb-10 sm:mb-16 max-w-2xl mx-auto text-sm sm:text-base">
          Quatre agents spécialisés travaillent ensemble via les protocoles ADK, MCP et A2A pour une expérience juste et intelligente.
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[
            {
              icon: Target,
              title: 'Générateur de Questions',
              desc: 'Crée des questions dynamiques et variées pour chaque tentative',
            },
            {
              icon: FileText,
              title: 'Agent d\'Évaluation',
              desc: 'Note les QCM et évalue les réponses ouvertes avec analyse de profondeur',
            },
            {
              icon: Shield,
              title: 'Anti-Hallucination',
              desc: 'Vérifie les réponses par rapport au contexte du codelab',
            },
            {
              icon: Trophy,
              title: 'Agent de Classement',
              desc: 'Met à jour le leaderboard et calcule les scores cumulatifs',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass-card p-4 sm:p-6 text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary-500/15 text-primary-500 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 className="font-semibold text-heading text-sm sm:text-base mb-1 sm:mb-2">{title}</h3>
              <p className="text-xs sm:text-sm text-body">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 border-t border-themed">
        <div className="glass-card p-8 sm:p-12 md:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-600/10 to-accent-600/10" />
          <div className="relative z-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-heading mb-3 sm:mb-4">
              Prêt à construire avec l'IA ?
            </h2>
            <p className="text-body mb-6 sm:mb-8 max-w-xl mx-auto text-sm sm:text-base">
              Rejoignez des centaines de développeurs qui maîtrisent le développement IA.
              Commencez votre parcours aujourd'hui.
            </p>
            <Link to="/signup" className="btn-primary text-sm sm:text-lg px-6 sm:px-8 py-3 sm:py-4 inline-flex items-center gap-2">
              Créer un compte gratuit
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-themed py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500" />
            <span className="font-semibold text-body text-sm sm:text-base">UjuziAI</span>
          </div>
          <p className="text-xs sm:text-sm text-muted">
            © {new Date().getFullYear()} UjuziAI. Build with AI Season.
          </p>
        </div>
      </footer>
    </div>
  );
}
