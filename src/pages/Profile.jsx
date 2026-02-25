import { useAuth } from '../contexts/AuthContext';
import { useAllProgress } from '../hooks/useFirestore';
import { MODULES } from '../config/modules';
import { getModuleIcon } from '../config/icons';
import ProgressRing from '../components/ProgressRing';
import {
  User,
  Mail,
  Calendar,
  BookOpen,
  Trophy,
  Target,
  Award,
  Shield,
  ExternalLink,
} from 'lucide-react';

export default function Profile() {
  const { user, userProfile } = useAuth();
  const { progressMap } = useAllProgress();

  const completedModules = MODULES.filter((m) => progressMap[m.id]?.examScore >= 6);
  const totalScore = Object.values(progressMap).reduce((sum, p) => sum + (p.examScore || 0), 0);
  const overallProgress = MODULES.length > 0 ? (completedModules.length / MODULES.length) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Profile Header */}
      <div className="glass-card p-8 mb-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 bg-primary-600/30 rounded-2xl flex items-center justify-center text-3xl font-bold text-primary-300">
            {user?.displayName?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="text-center md:text-left flex-1">
            <h1 className="text-2xl font-bold text-white">{user?.displayName || 'User'}</h1>
            <div className="flex flex-col md:flex-row items-center gap-3 mt-2 text-surface-400 text-sm">
              <span className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                {user?.email}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Joined {userProfile?.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="badge-primary">
                <Shield className="w-3 h-3 mr-1" />
                {userProfile?.role === 'admin' ? 'Admin' : 'Learner'}
              </span>
              {completedModules.length > 0 && (
                <span className="badge-accent">
                  <Award className="w-3 h-3 mr-1" />
                  {completedModules.length} Certification{completedModules.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <ProgressRing progress={overallProgress} size={100} strokeWidth={7}>
            <div className="text-center">
              <span className="text-xl font-bold text-white">{Math.round(overallProgress)}%</span>
              <p className="text-[10px] text-surface-500">Complete</p>
            </div>
          </ProgressRing>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-5 text-center">
          <BookOpen className="w-6 h-6 text-primary-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{Object.keys(progressMap).length}</p>
          <p className="text-xs text-surface-400">Started</p>
        </div>
        <div className="glass-card p-5 text-center">
          <Trophy className="w-6 h-6 text-accent-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{completedModules.length}</p>
          <p className="text-xs text-surface-400">Completed</p>
        </div>
        <div className="glass-card p-5 text-center">
          <Target className="w-6 h-6 text-primary-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{totalScore}</p>
          <p className="text-xs text-surface-400">Total Score</p>
        </div>
      </div>

      {/* Badges / Certifications */}
      <div className="glass-card p-8 mb-6">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Award className="w-5 h-5 text-accent-400" />
          Earned Certifications
        </h2>

        {completedModules.length === 0 ? (
          <div className="text-center py-8">
            <Award className="w-16 h-16 text-surface-600 mx-auto mb-4" />
            <p className="text-surface-400">
              No certifications yet. Complete modules and pass exams to earn badges.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {completedModules.map((module) => {
              const progress = progressMap[module.id];
              return (
                <div
                  key={module.id}
                  className="p-4 bg-accent-500/5 border border-accent-500/20 rounded-xl flex items-center gap-4"
                >
                  {(() => { const Icon = getModuleIcon(module.iconName); return <div className="w-10 h-10 rounded-xl bg-accent-500/15 text-accent-400 flex items-center justify-center flex-shrink-0"><Icon className="w-5 h-5" /></div>; })()}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{module.title}</p>
                    <p className="text-sm text-accent-400">
                      Score: {progress.examScore}/10
                    </p>
                    {progress.badgeId && (
                      <p className="text-xs text-surface-500 font-mono mt-0.5">
                        Badge: {progress.badgeId}
                      </p>
                    )}
                  </div>
                  <a
                    href={`/certificate/${module.id}`}
                    className="text-accent-400 hover:text-accent-300 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Module Progress List */}
      <div className="glass-card p-8">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary-400" />
          Module Progress
        </h2>

        <div className="space-y-3">
          {MODULES.map((module) => {
            const progress = progressMap[module.id];
            const score = progress?.examScore || 0;
            const passed = score >= 6;
            const attempted = progress?.examAttempts > 0;

            return (
              <div
                key={module.id}
                className="flex items-center gap-4 p-4 bg-surface-800/30 rounded-xl"
              >
                {(() => { const Icon = getModuleIcon(module.iconName); return <div className="w-8 h-8 rounded-lg bg-primary-500/15 text-primary-400 flex items-center justify-center flex-shrink-0"><Icon className="w-4 h-4" /></div>; })()}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{module.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {passed ? (
                      <span className="badge-accent text-[10px]">Passed</span>
                    ) : attempted ? (
                      <span className="badge-warning text-[10px]">Attempted</span>
                    ) : progress?.submitted ? (
                      <span className="badge-primary text-[10px]">Submitted</span>
                    ) : (
                      <span className="text-[10px] text-surface-500">Not started</span>
                    )}
                  </div>
                </div>
                <div className="w-20">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${(score / 10) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-surface-500 text-right mt-1">{score}/10</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
