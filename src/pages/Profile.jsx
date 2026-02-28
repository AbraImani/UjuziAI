import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAllProgress } from '../hooks/useFirestore';
import { MODULES } from '../config/modules';
import { getModuleIcon } from '../config/icons';
import { AVATARS, getAvatarUrl } from '../config/avatars';
import ProgressRing from '../components/ProgressRing';
import {
  User, Mail, Calendar, BookOpen, Trophy, Target, Award, Shield,
  ExternalLink, Check, Download, Copy, Zap, Linkedin, Twitter,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, userProfile, updateAvatar } = useAuth();
  const { progressMap } = useAllProgress();
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  const completedModules = MODULES.filter((m) => progressMap[m.id]?.examScore >= 6);
  const certifiedModules = MODULES.filter((m) => progressMap[m.id]?.examScore >= 7);
  const totalScore = Object.values(progressMap).reduce((sum, p) => sum + (p.examScore || 0), 0);
  const overallProgress = MODULES.length > 0 ? (completedModules.length / MODULES.length) * 100 : 0;

  const avatarUrl = getAvatarUrl(userProfile?.avatarId);
  const displayPhoto = user?.photoURL || avatarUrl;

  const handleSelectAvatar = async (avatarId) => {
    try {
      setSavingAvatar(true);
      await updateAvatar(avatarId);
      toast.success('Avatar mis a jour !');
      setShowAvatarPicker(false);
    } catch (err) {
      toast.error('Erreur lors de la mise a jour');
    } finally {
      setSavingAvatar(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="glass-card p-8 mb-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="relative group">
            {displayPhoto ? (
              <img src={displayPhoto} alt={user?.displayName || ''} className="w-24 h-24 rounded-2xl object-cover border-2 border-primary-500/30" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-24 h-24 bg-primary-600/30 rounded-2xl flex items-center justify-center text-3xl font-bold text-primary-300">
                {user?.displayName?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            {!user?.photoURL && (
              <button onClick={() => setShowAvatarPicker(!showAvatarPicker)} className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-primary-700 transition-colors" title="Changer l avatar">
                <User className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="text-center md:text-left flex-1">
            <h1 className="text-2xl font-bold text-heading">{user?.displayName || 'User'}</h1>
            <div className="flex flex-col md:flex-row items-center gap-3 mt-2 text-body text-sm">
              <span className="flex items-center gap-1"><Mail className="w-4 h-4" />{user?.email}</span>
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />Inscrit {userProfile?.createdAt?.toDate?.()?.toLocaleDateString() || 'Recemment'}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="badge-primary"><Shield className="w-3 h-3 mr-1" />{userProfile?.role === 'admin' ? 'Admin' : 'Apprenant'}</span>
              {userProfile?.communityRole && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                  userProfile.communityRole === 'Organizer' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' :
                  userProfile.communityRole === 'Lead Track' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                  userProfile.communityRole === 'Mentor' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                  'bg-green-500/10 text-green-400 border-green-500/30'
                }`}>
                  <User className="w-3 h-3" />{userProfile.communityRole}
                </span>
              )}
              {certifiedModules.length > 0 && (
                <span className="badge-accent"><Award className="w-3 h-3 mr-1" />{certifiedModules.length} Certification{certifiedModules.length !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
          <ProgressRing progress={overallProgress} size={100} strokeWidth={7}>
            <div className="text-center">
              <span className="text-xl font-bold text-heading">{Math.round(overallProgress)}%</span>
              <p className="text-[10px] text-muted">Complete</p>
            </div>
          </ProgressRing>
        </div>

        {showAvatarPicker && (
          <div className="mt-6 p-4 bg-surface rounded-xl border border-themed animate-fade-in">
            <h3 className="text-sm font-semibold text-heading mb-3">Choisissez votre avatar</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {AVATARS.map((avatar) => (
                <button key={avatar.id} onClick={() => handleSelectAvatar(avatar.id)} disabled={savingAvatar} className={`relative p-3 rounded-xl border-2 transition-all hover:scale-105 ${userProfile?.avatarId === avatar.id ? 'border-primary-500 bg-primary-500/10' : 'border-themed hover:border-primary-500/50'}`}>
                  <img src={avatar.url} alt={avatar.label} className="w-16 h-16 mx-auto rounded-full" />
                  <p className="text-xs text-body mt-2 text-center">{avatar.label}</p>
                  {userProfile?.avatarId === avatar.id && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-5 text-center">
          <BookOpen className="w-6 h-6 text-primary-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-heading">{Object.keys(progressMap).length}</p>
          <p className="text-xs text-body">Commences</p>
        </div>
        <div className="glass-card p-5 text-center">
          <Trophy className="w-6 h-6 text-accent-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-heading">{completedModules.length}</p>
          <p className="text-xs text-body">Valides</p>
        </div>
        <div className="glass-card p-5 text-center">
          <Target className="w-6 h-6 text-amber-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-heading">{totalScore}</p>
          <p className="text-xs text-body">Points</p>
        </div>
      </div>

      {certifiedModules.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-heading mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary-400" />
            Mes Badges
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {certifiedModules.map((mod) => {
              const p = progressMap[mod.id];
              const badgeId = p?.badgeId || 'N/A';
              const certDate = p?.completedAt?.toDate ? p.completedAt.toDate().toLocaleDateString('fr-FR') : 'N/A';
              const verifyUrl = window.location.origin + '/verify/' + badgeId;
              const shareText = 'J ai obtenu ma certification ' + mod.title + ' sur UjuziAI ! Badge: ' + badgeId;
              const ModIcon = getModuleIcon(mod.id);
              return (
                <div key={mod.id} className="glass-card p-4 border border-primary-500/20 hover:border-primary-500/40 transition-all">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-600/20 flex items-center justify-center flex-shrink-0">
                      {typeof ModIcon === 'string' ? <img src={ModIcon} alt="" className="w-6 h-6 rounded" /> : <ModIcon className="w-5 h-5 text-primary-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-heading truncate">{mod.title}</p>
                      <p className="text-xs text-muted">{certDate}</p>
                    </div>
                    <div className="flex items-center gap-1 text-green-500">
                      <Check className="w-4 h-4" />
                      <span className="text-xs font-medium">{p.examScore}/10</span>
                    </div>
                  </div>
                  <div className="bg-surface rounded-lg p-2 mb-3">
                    <p className="text-[10px] text-muted uppercase tracking-wide mb-1">Badge ID</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-primary-600 dark:text-primary-300 truncate flex-1">{badgeId}</code>
                      <button onClick={() => { navigator.clipboard.writeText(badgeId); toast.success('Badge ID copie !'); }} className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-muted" title="Copier">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={'/certificate/' + mod.id} className="flex-1 text-center text-xs py-1.5 rounded-lg bg-primary-600/10 text-primary-600 dark:text-primary-300 hover:bg-primary-600/20 transition-colors font-medium">
                      <Download className="w-3 h-3 inline mr-1" />Certificat
                    </a>
                    <button onClick={() => window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(verifyUrl), '_blank')} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-muted" title="LinkedIn">
                      <Linkedin className="w-4 h-4" />
                    </button>
                    <button onClick={() => window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(shareText) + '&url=' + encodeURIComponent(verifyUrl), '_blank')} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-muted" title="X">
                      <Twitter className="w-4 h-4" />
                    </button>
                    <a href={verifyUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-muted" title="Verifier">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <h2 className="text-lg font-bold text-heading mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-accent-400" />
        Modules valides ({completedModules.length})
      </h2>
      {completedModules.length > 0 ? (
        <div className="space-y-3">
          {completedModules.map((mod) => {
            const ModIcon = getModuleIcon(mod.id);
            const p = progressMap[mod.id];
            return (
              <div key={mod.id} className="glass-card p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary-600/20 flex items-center justify-center flex-shrink-0">
                  {typeof ModIcon === 'string' ? <img src={ModIcon} alt="" className="w-6 h-6 rounded" /> : <ModIcon className="w-5 h-5 text-primary-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-heading truncate">{mod.title}</p>
                  <p className="text-xs text-muted">{mod.track}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-lg font-bold ${p?.examScore >= 7 ? 'text-green-500' : 'text-accent-400'}`}>{p?.examScore || 0}/10</p>
                  {p?.examScore >= 7 && <span className="text-[10px] text-green-500 font-medium">Certifie</span>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card p-10 text-center">
          <Trophy className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-body">Aucun module valide pour l instant</p>
          <p className="text-sm text-muted mt-1">Completez les examens avec au moins 6/10 pour valider un module</p>
        </div>
      )}
    </div>
  );
}
