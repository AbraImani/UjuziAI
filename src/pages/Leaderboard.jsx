import { useState, useMemo } from 'react';
import { useLeaderboard, useAllProgress } from '../hooks/useFirestore';
import { useAuth } from '../contexts/AuthContext';
import { MODULES } from '../config/modules';
import { getAvatarUrl } from '../config/avatars';
import ProgressRing from '../components/ProgressRing';
import {
  Trophy,
  Medal,
  Crown,
  TrendingUp,
  Loader2,
  Flame,
  Target,
  Award,
  ChevronUp,
  ChevronDown,
  Minus,
  Zap,
  Shield,
  BarChart3,
  Users,
  Sparkles,
  BadgeCheck,
} from 'lucide-react';

const ROLE_BADGE_COLORS = {
  Organizer: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  'Lead Track': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  Mentor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'GDG On Campus UCB Member': 'bg-green-500/10 text-green-400 border-green-500/30',
};

export default function Leaderboard() {
  const { leaderboard, userRank, loading } = useLeaderboard();
  const { user } = useAuth();
  const { progressMap } = useAllProgress();
  const [filter, setFilter] = useState('all');

  const completedCount = Object.values(progressMap).filter((p) => p.examScore >= 6).length;
  const totalScore = Object.values(progressMap).reduce((sum, p) => sum + (p.examScore || 0), 0);
  const overallProgress = MODULES.length > 0 ? (completedCount / MODULES.length) * 100 : 0;

  // Top 3 for podium
  const podium = leaderboard.slice(0, 3);

  const filteredList = useMemo(() => {
    if (filter === 'top5') return leaderboard.slice(0, 5);
    if (filter === 'myRank' && userRank) {
      const myIndex = leaderboard.findIndex((e) => e.id === user?.uid);
      if (myIndex >= 0) {
        const start = Math.max(0, myIndex - 2);
        const end = Math.min(leaderboard.length, myIndex + 3);
        return leaderboard.slice(start, end);
      }
    }
    return leaderboard;
  }, [leaderboard, filter, userRank, user?.uid]);

  const getRankIcon = (index) => {
    if (index === 0) return <Crown className="w-7 h-7 text-amber-400 drop-shadow-lg" />;
    if (index === 1) return <Medal className="w-6 h-6 text-gray-300 drop-shadow-lg" />;
    if (index === 2) return <Medal className="w-6 h-6 text-amber-600 drop-shadow-lg" />;
    return (
      <span className="w-8 h-8 flex items-center justify-center text-sm font-bold text-body bg-surface rounded-full">
        #{index + 1}
      </span>
    );
  };

  const getRankBg = (index) => {
    if (index === 0) return 'bg-gradient-to-r from-amber-500/15 to-amber-500/5 border-amber-500/40 shadow-amber-500/10 shadow-lg';
    if (index === 1) return 'bg-gradient-to-r from-gray-400/10 to-gray-400/5 border-gray-400/30';
    if (index === 2) return 'bg-gradient-to-r from-amber-700/10 to-amber-700/5 border-amber-700/30';
    return 'border-themed hover:border-themed';
  };

  const getTrendIcon = (entry) => {
    const trend = entry.trend || 0;
    if (trend > 0) return <ChevronUp className="w-4 h-4 text-accent-400" />;
    if (trend < 0) return <ChevronDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-muted" />;
  };

  const getPodiumHeight = (index) => {
    if (index === 0) return 'h-36';
    if (index === 1) return 'h-28';
    return 'h-24';
  };

  const getPodiumColor = (index) => {
    if (index === 0) return 'from-amber-500/30 to-amber-600/10 border-amber-500/50';
    if (index === 1) return 'from-gray-400/20 to-gray-500/10 border-gray-400/40';
    return 'from-amber-700/20 to-amber-800/10 border-amber-700/40';
  };

  const getPodiumOrder = () => {
    if (podium.length < 3) return podium;
    return [podium[1], podium[0], podium[2]];
  };

  const getPodiumOriginalIndex = (displayIndex) => {
    if (podium.length < 3) return displayIndex;
    const map = [1, 0, 2];
    return map[displayIndex];
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-4">
          <Flame className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-amber-600 dark:text-amber-300">Classement en direct</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-heading mb-3 flex items-center justify-center gap-3">
          <Trophy className="w-10 h-10 text-amber-400" />
          <span className="gradient-text">Classement</span>
        </h1>
        <p className="text-body text-lg max-w-md mx-auto">
          Compétez, grimpez dans les rangs et prouvez votre expertise IA
        </p>
      </div>

      {/* Your Stats Banner */}
      <div className="glass-card p-6 mb-8 border-primary-500/30 bg-gradient-to-r from-primary-600/10 via-surface to-accent-600/10">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="flex items-center gap-5">
            <ProgressRing progress={overallProgress} size={90} strokeWidth={6}>
              <div className="text-center">
                <span className="text-xl font-bold text-heading">
                  {userRank ? `#${userRank}` : '—'}
                </span>
              </div>
            </ProgressRing>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide font-medium">Votre position</p>
              <p className="text-2xl font-bold text-heading mt-1">
                {userRank ? (
                  <>Top <span className="gradient-text">{userRank}</span></>
                ) : 'Non classé'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {completedCount} sur {MODULES.length} modules complétés
              </p>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-3 gap-4 sm:gap-6 w-full sm:w-auto">
            <div className="text-center">
              <div className="w-10 h-10 mx-auto bg-primary-600/20 rounded-xl flex items-center justify-center mb-2">
                <Target className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <p className="text-xl font-bold text-heading">{totalScore}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Points totaux</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto bg-accent-600/20 rounded-xl flex items-center justify-center mb-2">
                <Award className="w-5 h-5 text-accent-600 dark:text-accent-400" />
              </div>
              <p className="text-xl font-bold text-heading">{completedCount}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Badges</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto bg-amber-600/20 rounded-xl flex items-center justify-center mb-2">
                <BarChart3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-xl font-bold text-heading">{Math.round(overallProgress)}%</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Progression</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'Tous les rangs', icon: Users },
          { key: 'top5', label: 'Top 5', icon: Crown },
          { key: 'myRank', label: 'Autour de moi', icon: Target },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
              filter === key
                ? 'bg-primary-600/20 text-primary-600 dark:text-primary-300 border border-primary-500/30'
                : 'text-gray-600 dark:text-gray-400 hover:text-heading hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary-500 mb-4" />
          <p className="text-body">Chargement du classement...</p>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <div className="w-20 h-20 mx-auto bg-surface rounded-2xl flex items-center justify-center mb-6">
            <Trophy className="w-10 h-10 text-muted" />
          </div>
          <h3 className="text-xl font-bold text-heading mb-2">Aucun classement pour le moment</h3>
          <p className="text-body max-w-sm mx-auto mb-6">
            Soyez le premier à compléter des modules et réussir les examens pour décrocher la 1ère place du classement !
          </p>
          <a href="/dashboard" className="btn-primary inline-flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Commencer la compétition
          </a>
        </div>
      ) : (
        <>
          {/* Podium - Top 3 */}
          {filter === 'all' && podium.length >= 3 && (
            <div className="mb-10">
              <div className="flex items-end justify-center gap-3 sm:gap-6">
                {getPodiumOrder().map((entry, displayIndex) => {
                  const originalIndex = getPodiumOriginalIndex(displayIndex);
                  const isCurrentUser = entry.id === user?.uid;
                  return (
                    <div
                      key={entry.id}
                      className={`flex flex-col items-center transition-all duration-500 ${
                        originalIndex === 0 ? 'scale-100' : 'scale-95'
                      }`}
                    >
                      <div className="relative mb-3">
                        {originalIndex === 0 && (
                          <Crown className="w-6 h-6 text-amber-400 absolute -top-4 left-1/2 -translate-x-1/2 animate-bounce-subtle" />
                        )}
                        <div
                          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-lg font-bold border-2 overflow-hidden ${
                            originalIndex === 0
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                              : originalIndex === 1
                              ? 'bg-gray-400/20 text-gray-300 border-gray-400/50'
                              : 'bg-amber-700/20 text-amber-600 border-amber-700/50'
                          } ${isCurrentUser ? 'ring-2 ring-primary-500/50' : ''}`}
                        >
                          {(entry.photoURL || getAvatarUrl(entry.avatarId)) ? (
                            <img src={entry.photoURL || getAvatarUrl(entry.avatarId)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            entry.displayName?.[0]?.toUpperCase() || 'U'
                          )}
                        </div>
                      </div>
                      <p className={`text-sm font-medium mb-1 truncate max-w-[80px] sm:max-w-[100px] ${
                        isCurrentUser ? 'text-primary-300' : 'text-heading'
                      }`}>
                        {entry.displayName || 'Anonymous'}
                      </p>
                      {entry.communityRole && (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-medium border mb-1 ${ROLE_BADGE_COLORS[entry.communityRole] || 'bg-gray-500/10 text-gray-400'}`}>
                          {entry.communityRole}
                        </span>
                      )}
                      <p className="text-xs text-muted mb-2">{entry.totalScore || 0} pts</p>

                      <div
                        className={`w-20 sm:w-28 ${getPodiumHeight(originalIndex)} rounded-t-xl border-t border-x bg-gradient-to-t ${getPodiumColor(originalIndex)} flex flex-col items-center justify-start pt-3`}
                      >
                        <span className="text-2xl font-black text-heading/80">
                          {originalIndex + 1}
                        </span>
                        <div className="flex items-center gap-0.5 mt-1">
                          <Trophy className="w-3 h-3 text-amber-400" />
                          <span className="text-xs text-body">
                            {entry.badges?.length || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="w-full max-w-sm mx-auto h-1.5 bg-gradient-to-r from-transparent via-primary-500/30 to-transparent rounded-full" />
            </div>
          )}

          {/* Rankings List */}
          <div className="space-y-2">
            {filteredList.map((entry) => {
              const index = leaderboard.indexOf(entry);
              const isCurrentUser = entry.id === user?.uid;
              if (filter === 'all' && index < 3) return null;

              return (
                <div
                  key={entry.id}
                  className={`glass-card p-4 sm:p-5 border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                    getRankBg(index)
                  } ${isCurrentUser ? 'ring-2 ring-primary-500/30 bg-primary-500/5' : ''}`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 flex-shrink-0 flex justify-center">
                      {getRankIcon(index)}
                    </div>

                    <div
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 border overflow-hidden ${
                        isCurrentUser
                          ? 'bg-primary-600/20 text-primary-300 border-primary-500/30'
                          : 'bg-surface text-body border-themed'
                      }`}
                    >
                      {(entry.photoURL || getAvatarUrl(entry.avatarId)) ? (
                        <img src={entry.photoURL || getAvatarUrl(entry.avatarId)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        entry.displayName?.[0]?.toUpperCase() || 'U'
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-semibold truncate ${isCurrentUser ? 'text-primary-300' : 'text-heading'}`}>
                          {entry.displayName || 'Anonymous'}
                        </p>
                        {isCurrentUser && (
                          <span className="badge-primary text-[10px]">Vous</span>
                        )}
                        {entry.communityRole && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border ${ROLE_BADGE_COLORS[entry.communityRole] || 'bg-gray-500/10 text-gray-400'}`}>
                            {entry.communityRole}
                          </span>
                        )}
                        {getTrendIcon(entry)}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-xs text-muted">
                          {entry.completedModules?.length || 0} modules
                        </p>
                        <span className="text-muted">•</span>
                        <p className="text-xs text-muted">
                          {entry.badges?.length || 0} badges
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-bold text-heading">
                        {entry.totalScore || 0}
                      </p>
                      <p className="text-[10px] text-muted uppercase tracking-wide">points</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Competition Stats Footer */}
          <div className="mt-10 glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary-400" />
              <h3 className="text-sm font-semibold text-heading uppercase tracking-wide">Statistiques de la compétition</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-black/5 dark:bg-white/5 rounded-xl">
                <Users className="w-5 h-5 mx-auto text-primary-400 mb-2" />
                <p className="text-lg font-bold text-heading">{leaderboard.length}</p>
                <p className="text-xs text-muted">Compétiteurs</p>
              </div>
              <div className="text-center p-3 bg-black/5 dark:bg-white/5 rounded-xl">
                <Target className="w-5 h-5 mx-auto text-accent-400 mb-2" />
                <p className="text-lg font-bold text-heading">
                  {leaderboard[0]?.totalScore || 0}<span className="text-xs text-muted font-normal">/{MODULES.length * 10}</span>
                </p>
                <p className="text-xs text-muted">Meilleur score</p>
              </div>
              <div className="text-center p-3 bg-black/5 dark:bg-white/5 rounded-xl">
                <BarChart3 className="w-5 h-5 mx-auto text-amber-400 mb-2" />
                <p className="text-lg font-bold text-heading">
                  {leaderboard.length > 0
                    ? Math.round(leaderboard.reduce((s, e) => s + (e.totalScore || 0), 0) / leaderboard.length)
                    : 0}
                </p>
                <p className="text-xs text-muted">Score moyen</p>
              </div>
              <div className="text-center p-3 bg-black/5 dark:bg-white/5 rounded-xl">
                <Shield className="w-5 h-5 mx-auto text-red-400 mb-2" />
                <p className="text-lg font-bold text-heading">{MODULES.length}</p>
                <p className="text-xs text-muted">Modules disponibles</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

