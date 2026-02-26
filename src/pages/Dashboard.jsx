import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAllProgress } from '../hooks/useFirestore';
import { MODULES, TRACKS, getModulesByTrack, getTrackProgress } from '../config/modules';
import { getTrackIcon } from '../config/icons';
import ModuleCard from '../components/ModuleCard';
import ProgressRing from '../components/ProgressRing';
import { BookOpen, Trophy, Target, TrendingUp, Sparkles, ChevronRight } from 'lucide-react';

export default function Dashboard() {
  const { user, userProfile } = useAuth();
  const { progressMap, loading } = useAllProgress();
  const [activeTrack, setActiveTrack] = useState(null);

  const completedCount = Object.values(progressMap).filter((p) => p.examScore >= 6).length;
  const submittedCount = Object.values(progressMap).filter((p) => p.submitted).length;
  const totalScore = Object.values(progressMap).reduce((sum, p) => sum + (p.examScore || 0), 0);
  const overallProgress = MODULES.length > 0 ? (completedCount / MODULES.length) * 100 : 0;

  const displayedModules = activeTrack
    ? getModulesByTrack(activeTrack)
    : MODULES;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-heading">
            Bon retour, <span className="gradient-text">{user?.displayName || 'Apprenant'}</span>
          </h1>
          <p className="text-body mt-1">Continuez votre parcours Build with AI</p>
        </div>

        <div className="flex items-center gap-4">
          <ProgressRing progress={overallProgress} size={80} strokeWidth={6}>
            <div className="text-center">
              <span className="text-lg font-bold text-heading">{Math.round(overallProgress)}%</span>
            </div>
          </ProgressRing>
          <div>
            <p className="text-sm text-body">Progression globale</p>
            <p className="text-lg font-semibold text-heading">
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
            label: 'Modules commencés',
            value: submittedCount,
            color: 'primary',
          },
          {
            icon: Trophy,
            label: 'Complétés',
            value: completedCount,
            color: 'accent',
          },
          {
            icon: Target,
            label: 'Score total',
            value: totalScore,
            color: 'primary',
          },
          {
            icon: TrendingUp,
            label: 'Rang global',
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
            <p className="text-2xl font-bold text-heading">{value}</p>
            <p className="text-sm text-body">{label}</p>
          </div>
        ))}
      </div>

      {/* Track Cards — Google Skills style */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="w-6 h-6 text-primary-400" />
          <h2 className="section-title">Parcours d'apprentissage</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
          {TRACKS.map((track) => {
            const trackProgress = getTrackProgress(track.id, progressMap);
            const TrackIcon = getTrackIcon(track.icon);
            const isActive = activeTrack === track.id;

            return (
              <button
                key={track.id}
                onClick={() => setActiveTrack(isActive ? null : track.id)}
                className={`glass-card-hover p-5 text-left transition-all duration-300 group ${
                  isActive ? `ring-2 ring-offset-0 border-transparent bg-gradient-to-br ${track.gradient}/10 ring-current ${track.textColor}` : ''
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${track.bgDark} flex items-center justify-center`}>
                    <TrackIcon className={`w-5 h-5 ${track.textColor}`} />
                  </div>
                  <ChevronRight className={`w-4 h-4 text-muted transition-transform duration-200 ${isActive ? 'rotate-90' : 'group-hover:translate-x-0.5'}`} />
                </div>
                <h3 className="font-semibold text-heading text-sm mb-1">{track.shortName}</h3>
                <p className="text-xs text-body line-clamp-2 mb-3">{track.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">{trackProgress.completed}/{trackProgress.total}</span>
                  <div className="w-16 h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${track.gradient} transition-all duration-500`}
                      style={{ width: `${trackProgress.percentage}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modules Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-primary-400" />
            <h2 className="section-title">
              {activeTrack
                ? TRACKS.find((t) => t.id === activeTrack)?.name
                : 'Tous les modules'}
            </h2>
          </div>
          {activeTrack && (
            <button
              onClick={() => setActiveTrack(null)}
              className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
            >
              Voir tout
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card p-6 h-64 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 dark:bg-neutral-700 rounded-xl mb-4" />
                <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-200 dark:bg-neutral-700 rounded w-full mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-neutral-700 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayedModules.map((module) => (
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

