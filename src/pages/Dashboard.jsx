import { useAuth } from '../contexts/AuthContext';
import { useAllProgress } from '../hooks/useFirestore';
import { MODULES } from '../config/modules';
import ModuleCard from '../components/ModuleCard';
import ProgressRing from '../components/ProgressRing';
import { BookOpen, Trophy, Target, TrendingUp, Sparkles } from 'lucide-react';

export default function Dashboard() {
  const { user, userProfile } = useAuth();
  const { progressMap, loading } = useAllProgress();

  const completedCount = Object.values(progressMap).filter((p) => p.examScore >= 6).length;
  const submittedCount = Object.values(progressMap).filter((p) => p.submitted).length;
  const totalScore = Object.values(progressMap).reduce((sum, p) => sum + (p.examScore || 0), 0);
  const overallProgress = MODULES.length > 0 ? (completedCount / MODULES.length) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Welcome back, <span className="gradient-text">{user?.displayName || 'Learner'}</span>
          </h1>
          <p className="text-surface-400 mt-1">Continue your Build with AI journey</p>
        </div>

        <div className="flex items-center gap-4">
          <ProgressRing progress={overallProgress} size={80} strokeWidth={6}>
            <div className="text-center">
              <span className="text-lg font-bold text-white">{Math.round(overallProgress)}%</span>
            </div>
          </ProgressRing>
          <div>
            <p className="text-sm text-surface-400">Overall Progress</p>
            <p className="text-lg font-semibold text-white">
              {completedCount}/{MODULES.length} modules
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: BookOpen,
            label: 'Modules Started',
            value: submittedCount,
            color: 'primary',
          },
          {
            icon: Trophy,
            label: 'Completed',
            value: completedCount,
            color: 'accent',
          },
          {
            icon: Target,
            label: 'Total Score',
            value: totalScore,
            color: 'primary',
          },
          {
            icon: TrendingUp,
            label: 'Global Rank',
            value: userProfile?.rank ? `#${userProfile.rank}` : '—',
            color: 'accent',
          },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  color === 'accent'
                    ? 'bg-accent-500/20 text-accent-400'
                    : 'bg-primary-500/20 text-primary-400'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-sm text-surface-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Modules Grid */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="w-6 h-6 text-primary-400" />
          <h2 className="section-title">Build with AI Modules</h2>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="glass-card p-6 h-64 animate-pulse">
                <div className="w-12 h-12 bg-surface-700 rounded-xl mb-4" />
                <div className="h-4 bg-surface-700 rounded w-3/4 mb-3" />
                <div className="h-3 bg-surface-700 rounded w-full mb-2" />
                <div className="h-3 bg-surface-700 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {MODULES.map((module) => (
              <ModuleCard
                key={module.id}
                module={module}
                progress={progressMap[module.id]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
