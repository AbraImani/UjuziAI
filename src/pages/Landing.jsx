import { Link } from 'react-router-dom';
import { Zap, BookOpen, Trophy, Shield, ArrowRight, Sparkles, Brain, Users, CheckCircle, Target, FileText } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-surface-950">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">BuildSkillAI</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-surface-300 hover:text-white transition-colors font-medium">
            Sign In
          </Link>
          <Link to="/signup" className="btn-primary text-sm">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-24">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-300 text-sm font-medium mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            Build with AI Season — Now Open
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-tight tracking-tight animate-fade-in">
            Master AI Development
            <br />
            <span className="gradient-text">Compete & Rank Up</span>
          </h1>

          <p className="text-lg md:text-xl text-surface-400 max-w-2xl mx-auto mb-10 animate-fade-in">
            Complete hands-on codelabs, prove your skills through proctored exams,
            climb the leaderboard, and earn verifiable certifications. Powered by intelligent agents.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in">
            <Link to="/signup" className="btn-primary text-lg px-8 py-4 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Start Competing
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/login" className="btn-secondary text-lg px-8 py-4">
              Sign In
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-4xl mx-auto">
          {[
            { label: 'Modules', value: '16', icon: BookOpen },
            { label: 'Learners', value: '500+', icon: Users },
            { label: 'Certifications', value: '200+', icon: Trophy },
            { label: 'AI Agents', value: '4', icon: Brain },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="glass-card p-6 text-center">
              <Icon className="w-8 h-8 text-primary-400 mx-auto mb-3" />
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-sm text-surface-400">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-surface-800">
        <h2 className="section-title text-center mb-4">How It Works</h2>
        <p className="section-subtitle text-center mb-16 max-w-2xl mx-auto">
          A complete learning journey from codelabs to certification, powered by AI agent orchestration.
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: BookOpen,
              title: '1. Complete Codelabs',
              description:
                'Work through hands-on Build with AI season modules. Each codelab teaches practical AI development skills.',
              color: 'primary',
            },
            {
              icon: Shield,
              title: '2. Submit Proof',
              description:
                'Upload screenshots, videos, and detailed descriptions of your work. Submissions are validated before exam access.',
              color: 'accent',
            },
            {
              icon: Trophy,
              title: '3. Earn Certification',
              description:
                'Pass the AI-proctored exam with score ≥ 6/10. Earn a unique verifiable badge and downloadable certificate.',
              color: 'primary',
            },
          ].map(({ icon: Icon, title, description, color }) => (
            <div key={title} className="glass-card-hover p-8">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${
                  color === 'accent'
                    ? 'bg-accent-500/20 text-accent-400'
                    : 'bg-primary-500/20 text-primary-400'
                }`}
              >
                <Icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
              <p className="text-surface-400 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Agent Architecture Preview */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-surface-800">
        <h2 className="section-title text-center mb-4">Powered by AI Agents</h2>
        <p className="section-subtitle text-center mb-16 max-w-2xl mx-auto">
          Four specialized agents work together using ADK, MCP, and A2A protocols for a fair and intelligent experience.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Target,
              title: 'Question Generator',
              desc: 'Creates dynamic, concept-varied questions for each attempt',
            },
            {
              icon: FileText,
              title: 'Evaluation Agent',
              desc: 'Grades MCQs and evaluates open responses with depth analysis',
            },
            {
              icon: Shield,
              title: 'Anti-Hallucination',
              desc: 'Cross-checks answers against codelab context for accuracy',
            },
            {
              icon: Trophy,
              title: 'Ranking Agent',
              desc: 'Updates leaderboard and calculates cumulative scores',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass-card p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary-500/15 text-primary-400 flex items-center justify-center mx-auto mb-4">
                <Icon className="w-7 h-7" />
              </div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-surface-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-surface-800">
        <div className="glass-card p-12 md:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-600/10 to-accent-600/10" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Build with AI?
            </h2>
            <p className="text-surface-400 mb-8 max-w-xl mx-auto">
              Join hundreds of developers mastering AI development skills.
              Start your journey today.
            </p>
            <Link to="/signup" className="btn-primary text-lg px-8 py-4 inline-flex items-center gap-2">
              Create Free Account
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-800 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary-500" />
            <span className="font-semibold text-surface-300">BuildSkillAI</span>
          </div>
          <p className="text-sm text-surface-500">
            © {new Date().getFullYear()} BuildSkillAI. Build with AI Season.
          </p>
        </div>
      </footer>
    </div>
  );
}
