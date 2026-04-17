import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { addDoc, arrayUnion, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Calendar, Clock3, ExternalLink, FileText, Loader2, Settings, ThumbsUp, Trophy, Users, UserPlus, Send } from 'lucide-react';

const TAB_LIST = [
  { id: 'overview', label: 'Aperçu' },
  { id: 'calendar', label: 'Calendrier' },
  { id: 'projects', label: 'Projets' },
  { id: 'ranking', label: 'Classement' },
  { id: 'submit', label: 'Soumettre' },
  { id: 'discussions', label: 'Discussions' },
  { id: 'rules', label: 'Règles' },
  { id: 'management', label: 'Gestion', adminOnly: true },
];

function normalizeDateLike(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value?.toDate && typeof value.toDate === 'function') {
    const d = value.toDate();
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function formatEventDate(value) {
  if (!value) return 'Date non définie';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Date non définie';
  return d.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDurationMs(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '0s';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}j ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function getPhaseCountdown(startValue, endValue, nowMs) {
  const startMs = startValue ? new Date(startValue).getTime() : null;
  const endMs = endValue ? new Date(endValue).getTime() : null;

  if (!Number.isFinite(startMs) && !Number.isFinite(endMs)) {
    return { label: 'Date non définie', state: 'unknown' };
  }

  if (Number.isFinite(startMs) && nowMs < startMs) {
    return {
      label: `Commence dans ${formatDurationMs(startMs - nowMs)}`,
      state: 'upcoming',
    };
  }

  if (Number.isFinite(endMs)) {
    if (nowMs <= endMs) {
      return {
        label: `Se termine dans ${formatDurationMs(endMs - nowMs)}`,
        state: 'running',
      };
    }
    return { label: 'Terminé', state: 'ended' };
  }

  return { label: 'En cours', state: 'running' };
}

function getEventStatus(event) {
  const now = new Date();
  const startDate = event?.startDate ? new Date(event.startDate) : null;
  const submissionEndDate = event?.submissionEndDate ? new Date(event.submissionEndDate) : null;
  const voteEndDate = event?.voteEndDate ? new Date(event.voteEndDate) : null;

  if (startDate && startDate > now) return 'À venir';
  if (voteEndDate && voteEndDate < now) return 'Terminé';
  if (submissionEndDate && submissionEndDate < now) return 'Vote ouvert';
  return 'En cours';
}

function normalizeBuildathonEvent(raw) {
  return {
    ...raw,
    participants: Array.isArray(raw.participants) ? raw.participants : [],
    votingEnabled: raw.votingEnabled !== false,
    rewardsVisible: raw.rewardsVisible !== false,
    startDate: normalizeDateLike(raw.startDate),
    endDate: normalizeDateLike(raw.endDate),
    voteStartDate: normalizeDateLike(raw.voteStartDate) || normalizeDateLike(raw.startDate),
    voteEndDate: normalizeDateLike(raw.voteEndDate) || normalizeDateLike(raw.endDate),
    submissionStartDate: normalizeDateLike(raw.submissionStartDate) || normalizeDateLike(raw.startDate),
    submissionEndDate: normalizeDateLike(raw.submissionEndDate) || normalizeDateLike(raw.endDate),
    participationRules: raw.participationRules || '',
    evaluationCriteria: raw.evaluationCriteria || '',
    tieBreakRuleText: raw.tieBreakRuleText || 'En cas d\'égalité, le projet soumis le plus tôt est prioritaire.',
    prizes: Array.isArray(raw.prizes) ? raw.prizes : [],
    projectVisibility: raw.projectVisibility || 'published-only',
    publicationStatus: raw.publicationStatus || 'published',
  };
}

function getCanonicalProjectStatus(project = {}) {
  const raw = String(project.projectStatus || '').toLowerCase();
  const normalizedRaw = raw.replace('é', 'e').trim();
  if (normalizedRaw === 'brouillon' || normalizedRaw === 'draft') return 'brouillon';
  if (normalizedRaw === 'soumis' || normalizedRaw === 'submitted' || normalizedRaw === 'pending') return 'soumis';
  if (normalizedRaw === 'valide' || normalizedRaw === 'validated' || normalizedRaw === 'approved') return 'valide';
  if (normalizedRaw === 'rejete' || normalizedRaw === 'rejected') return 'rejete';
  if (normalizedRaw === 'publie' || normalizedRaw === 'published') return 'publie';

  if (project?.moderationStatus === 'rejected') return 'rejete';
  if (project?.isPublished === true || project?.isPublic === true) return 'publie';
  if (project?.moderationStatus === 'approved') return 'valide';
  return 'soumis';
}

function isProjectOwnerOrMember(project, uid) {
  if (!uid) return false;
  if (project?.submittedBy === uid) return true;
  return Array.isArray(project?.members) && project.members.some((member) => member?.uid === uid);
}

function isProjectVisibleForParticipant(project, event, uid) {
  const status = getCanonicalProjectStatus(project);
  if (isProjectOwnerOrMember(project, uid)) return true;

  if (status === 'rejete') return false;

  // User view should include all submitted/validated/published projects.
  return status !== 'brouillon';
}

function toTimestampMs(value) {
  if (!value) return null;
  if (value?.toDate && typeof value.toDate === 'function') {
    const d = value.toDate();
    const t = d.getTime();
    return Number.isNaN(t) ? null : t;
  }
  const d = new Date(value);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}

function normalizeBuildathonProject(raw) {
  const votes = Array.isArray(raw.votes) ? raw.votes : [];
  const voteCountRaw = Number(raw.voteCount);
  const projectStatus = getCanonicalProjectStatus(raw);
  return {
    ...raw,
    votes,
    voteCount: Number.isFinite(voteCountRaw) ? voteCountRaw : votes.length,
    projectStatus,
    likesCount: Number.isFinite(Number(raw.likesCount)) ? Number(raw.likesCount) : 0,
    commentsCount: Number.isFinite(Number(raw.commentsCount)) ? Number(raw.commentsCount) : 0,
    feedbackCount: Number.isFinite(Number(raw.feedbackCount)) ? Number(raw.feedbackCount) : 0,
    likeUserIds: Array.isArray(raw.likeUserIds) ? raw.likeUserIds : [],
    tags: Array.isArray(raw.tags) ? raw.tags : [],
  };
}

function getProjectSubmissionTimestamp(project) {
  const submittedAt = toTimestampMs(project?.submittedAt);
  if (submittedAt !== null) return submittedAt;

  const createdAt = toTimestampMs(project?.createdAt);
  if (createdAt !== null) return createdAt;

  return Number.MAX_SAFE_INTEGER;
}

function sortProjectsForRanking(projectList = []) {
  return [...projectList].sort((a, b) => {
    const voteDiff = (b?.voteCount || 0) - (a?.voteCount || 0);
    if (voteDiff !== 0) return voteDiff;

    const timeDiff = getProjectSubmissionTimestamp(a) - getProjectSubmissionTimestamp(b);
    if (timeDiff !== 0) return timeDiff;

    return String(a?.id || '').localeCompare(String(b?.id || ''));
  });
}

function getProjectTeamLabel(project) {
  if (project?.teamName) return project.teamName;
  const members = Array.isArray(project?.members) ? project.members : [];
  if (members.length === 0) return 'Équipe non définie';
  return members.map((member) => member.name).filter(Boolean).join(', ') || 'Équipe non définie';
}

function getProjectSummary(project) {
  const description = (project?.description || '').trim();
  if (!description) return 'Aucun résumé disponible.';
  return description.length > 140 ? `${description.slice(0, 140).trim()}...` : description;
}

function getProjectTags(project) {
  const tags = Array.isArray(project?.tags) ? project.tags.filter(Boolean) : [];
  if (tags.length > 0) return tags;

  if (project?.category) {
    return [project.category];
  }

  return [];
}

function getProjectStatusLabel(project) {
  const status = getCanonicalProjectStatus(project);
  if (status === 'publie') return 'publie';
  if (status === 'valide') return 'valide';
  if (status === 'rejete') return 'rejete';
  if (status === 'brouillon') return 'brouillon';
  return 'soumis';
}

export default function BuildathonDetail() {
  const { buildathonId } = useParams();
  const { isAdmin, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [submitFormData, setSubmitFormData] = useState({
    title: '',
    description: '',
    category: '',
    teamName: '',
    repoUrl: '',
    demoUrl: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const timerId = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (!buildathonId) {
      setLoading(false);
      return;
    }

    const eventRef = doc(db, 'buildathons', buildathonId);
    const unsubEvent = onSnapshot(
      eventRef,
      (snap) => {
        if (!snap.exists()) {
          setEvent(null);
          setLoading(false);
          return;
        }
        setEvent(normalizeBuildathonEvent({ id: snap.id, ...snap.data() }));
        setLoading(false);
      },
      () => {
        setEvent(null);
        setLoading(false);
      }
    );

    const projectsRef = query(collection(db, 'buildathonProjects'), where('buildathonId', '==', buildathonId));
    const unsubProjects = onSnapshot(projectsRef, (snap) => {
      const data = [];
      snap.forEach((d) => data.push(normalizeBuildathonProject({ id: d.id, ...d.data() })));
      setProjects(data);
    });

    return () => {
      unsubEvent();
      unsubProjects();
    };
  }, [buildathonId]);

  const handleRegister = async () => {
    try {
      await updateDoc(doc(db, 'buildathons', buildathonId), {
        participants: arrayUnion(user.uid),
      });
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
    }
  };

  const handleSubmitProject = async (e) => {
    e.preventDefault();
    if (!submitFormData.title || !submitFormData.teamName || !submitFormData.repoUrl || !submitFormData.demoUrl) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'buildathonProjects'), {
        buildathonId,
        title: submitFormData.title.trim(),
        description: submitFormData.description.trim(),
        category: submitFormData.category || 'other',
        teamName: submitFormData.teamName.trim(),
        repoUrl: submitFormData.repoUrl.trim(),
        demoUrl: submitFormData.demoUrl.trim(),
        members: [{ uid: user.uid, name: user.displayName || user.email || 'Membre', email: user.email || '' }],
        votes: [],
        voteCount: 0,
        likeUserIds: [],
        likesCount: 0,
        commentsCount: 0,
        feedbackCount: 0,
        projectStatus: 'soumis',
        moderationStatus: 'pending',
        isPublished: false,
        isPublic: false,
        submittedBy: user.uid,
        submittedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSubmitFormData({ title: '', description: '', category: '', teamName: '', repoUrl: '', demoUrl: '' });
      setActiveTab('projects');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la soumission du projet');
    } finally {
      setSubmitting(false);
    }
  };

  const visibleTabs = useMemo(() => {
    return TAB_LIST.filter((tab) => !tab.adminOnly || isAdmin);
  }, [isAdmin]);

  const visibleProjects = useMemo(() => {
    if (isAdmin) return projects;
    return projects.filter((project) => isProjectVisibleForParticipant(project, event, user?.uid));
  }, [projects, event, user?.uid, isAdmin]);

  const sortedProjects = useMemo(() => sortProjectsForRanking(visibleProjects), [visibleProjects]);
  const submissionCountdown = useMemo(
    () => getPhaseCountdown(event?.submissionStartDate, event?.voteEndDate || event?.endDate || event?.submissionEndDate, nowMs),
    [event?.submissionStartDate, event?.submissionEndDate, event?.voteEndDate, event?.endDate, nowMs]
  );
  const voteCountdown = useMemo(
    () => getPhaseCountdown(event?.voteStartDate, event?.voteEndDate, nowMs),
    [event?.voteStartDate, event?.voteEndDate, nowMs]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto py-10">
        <div className="glass-card p-8 text-center">
          <h1 className="text-2xl font-bold text-heading mb-2">Buildathon introuvable</h1>
          <p className="text-body mb-6">Cet événement n'existe pas ou n'est plus disponible.</p>
          <Link to="/projects" className="btn-primary inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Retour aux événements
          </Link>
        </div>
      </div>
    );
  }

  const status = getEventStatus(event);

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="mb-6">
        <Link to="/projects" className="inline-flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Retour aux événements
        </Link>

        <div className="glass-card p-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-2xl font-bold text-heading">{event.title}</h1>
            <p className="text-body line-clamp-3">{event.description || 'Aucune description disponible.'}</p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
              <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatEventDate(event.startDate)} → {formatEventDate(event.endDate)}</span>
              <span className="inline-flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" />{formatEventDate(event.submissionStartDate)} → {formatEventDate(event.submissionEndDate)}</span>
              <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" />{event.participants.length} participant{event.participants.length > 1 ? 's' : ''}</span>
              <span className="inline-flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{projects.length} projet{projects.length > 1 ? 's' : ''}</span>
              <span className={`inline-flex items-center gap-1 ${event.votingEnabled ? 'text-green-400' : 'text-red-400'}`}>
                <ThumbsUp className="w-3.5 h-3.5" />
                Vote {event.votingEnabled ? 'activé' : 'désactivé'}
              </span>
              <span className="badge bg-surface border border-themed text-body text-xs">{status}</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-themed">
                <p className="text-[11px] text-muted">Timer soumission</p>
                <p className="text-sm font-medium text-heading">{submissionCountdown.label}</p>
              </div>
              <div className="p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-themed">
                <p className="text-[11px] text-muted">Timer vote</p>
                <p className="text-sm font-medium text-heading">{voteCountdown.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-themed mt-3">
              {!event.participants.includes(user?.uid) && (
                <button
                  onClick={handleRegister}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-accent-600/20 text-accent-300 border border-accent-500/30 hover:bg-accent-600/30 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  S'inscrire
                </button>
              )}
              {event.participants.includes(user?.uid) && (
                <span className="text-xs text-green-400 flex items-center gap-1">✓ Inscrit</span>
              )}
              {event.participants.includes(user?.uid) && !projects.some((p) => p.submittedBy === user?.uid) && (
                <button
                  onClick={() => setActiveTab('submit')}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-primary-600/20 text-primary-300 border border-primary-500/30 hover:bg-primary-600/30 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  Soumettre
                </button>
              )}
              {projects.some((p) => p.submittedBy === user?.uid) && (
                <span className="text-xs text-primary-400 flex items-center gap-1">✓ Projet soumis</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-3 mb-6">
        <div className="flex gap-2 overflow-x-auto">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-primary-600/20 text-primary-300 border border-primary-500/30'
                  : 'text-body hover:text-heading hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card p-6">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-heading">Aperçu</h2>
            <p className="text-body">{event.description || 'Aucune description disponible pour cet événement.'}</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-themed">
                <p className="text-xs text-muted">Statut</p>
                <p className="text-sm font-medium text-heading">{status}</p>
              </div>
              <div className="p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-themed">
                <p className="text-xs text-muted">Projets soumis</p>
                <p className="text-sm font-medium text-heading">{projects.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-themed">
                <p className="text-xs text-muted">Vote</p>
                <p className="text-sm font-medium text-heading">{event.votingEnabled ? 'Activé' : 'Désactivé'}</p>
              </div>
              <div className="p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-themed">
                <p className="text-xs text-muted">Publication</p>
                <p className="text-sm font-medium text-heading">{event.publicationStatus || 'published'}</p>
              </div>
            </div>

            {event.rewardsVisible && event.prizes.length > 0 && (
              <div className="p-4 rounded-lg bg-black/5 dark:bg-white/5 border border-themed space-y-2">
                <p className="text-sm font-semibold text-heading">Récompenses</p>
                <div className="flex flex-wrap gap-2">
                  {event.prizes
                    .slice()
                    .sort((a, b) => (a.place || 0) - (b.place || 0))
                    .map((prize, idx) => {
                      const rewardType = prize.rewardType || 'points';
                      const label = rewardType === 'points' ? `${Number(prize.points || 0)} pts` : (prize.label || 'Récompense');
                      return (
                        <span key={`${prize.place || idx}-${label}`} className="text-xs px-2.5 py-1 rounded-full border border-themed bg-surface text-body">
                          #{prize.place || idx + 1} - {label}
                        </span>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-heading">Calendrier</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-black/5 dark:bg-white/5 border border-themed">
                <p className="text-xs text-muted mb-1">Buildathon</p>
                <p className="text-sm font-medium text-heading">{formatEventDate(event.startDate)} → {formatEventDate(event.endDate)}</p>
              </div>
              <div className="p-4 rounded-lg bg-black/5 dark:bg-white/5 border border-themed">
                <p className="text-xs text-muted mb-1">Soumission</p>
                <p className="text-sm font-medium text-heading">{formatEventDate(event.submissionStartDate)} → {formatEventDate(event.submissionEndDate)}</p>
              </div>
              <div className="p-4 rounded-lg bg-black/5 dark:bg-white/5 border border-themed">
                <p className="text-xs text-muted mb-1">Vote</p>
                <p className="text-sm font-medium text-heading">{formatEventDate(event.voteStartDate)} → {formatEventDate(event.voteEndDate)}</p>
              </div>
              <div className="p-4 rounded-lg bg-black/5 dark:bg-white/5 border border-themed">
                <p className="text-xs text-muted mb-1">Départage</p>
                <p className="text-sm font-medium text-heading">{event.tieBreakRuleText}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-heading">Projets</h2>
            {sortedProjects.length === 0 ? (
              <p className="text-body">Aucun projet pour le moment.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {sortedProjects.map((p) => {
                  const tags = getProjectTags(p);
                  const feedbackCount = p.feedbackCount || p.commentsCount || 0;
                  return (
                    <div key={p.id} className="p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-themed space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-heading truncate">{p.title}</p>
                          <p className="text-xs text-muted">{getProjectTeamLabel(p)}</p>
                        </div>
                        <div className="text-right">
                          <span className="block text-xs text-muted whitespace-nowrap">{p.voteCount || 0} vote{(p.voteCount || 0) > 1 ? 's' : ''}</span>
                          <span className="inline-flex mt-1 text-[10px] px-2 py-0.5 rounded-full border border-themed bg-surface text-muted">
                            {getProjectStatusLabel(p)}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-body line-clamp-2">{getProjectSummary(p)}</p>

                      <div className="flex flex-wrap gap-2">
                        {tags.length > 0 ? tags.map((tag) => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full border border-themed bg-surface text-muted">
                            {tag}
                          </span>
                        )) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full border border-themed bg-surface text-muted">
                            Aucun tag
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                        <span>{p.likesCount || 0} like{(p.likesCount || 0) > 1 ? 's' : ''}</span>
                        <span>{feedbackCount} feedback/commentaire{feedbackCount > 1 ? 's' : ''}</span>
                        {p.demoUrl && (
                          <a href={p.demoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary-400 hover:text-primary-300">
                            <ExternalLink className="w-3 h-3" />
                            Démo
                          </a>
                        )}
                      </div>

                      <div className="flex items-center justify-end">
                        <Link
                          to={`/projects/${event.id}/project/${p.id}`}
                          className="text-xs px-3 py-1.5 rounded-lg bg-primary-600/20 text-primary-300 border border-primary-500/30 hover:bg-primary-600/30 transition-colors"
                        >
                          Voir le projet
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'ranking' && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-heading inline-flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Classement
            </h2>
            <p className="text-xs text-muted">Tri: votes décroissants. {event.tieBreakRuleText}</p>
            {sortedProjects.length === 0 ? (
              <p className="text-body">Aucun projet classable pour le moment.</p>
            ) : (
              <div className="space-y-2">
                {sortedProjects.map((p, idx) => (
                  <div key={p.id} className="p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-themed flex items-center justify-between gap-3">
                    <p className="text-sm text-heading"><span className="font-bold mr-2">#{idx + 1}</span>{p.title}</p>
                    <span className="text-xs text-muted">{p.voteCount || 0} votes</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'submit' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-lg font-semibold text-heading">Soumettre un projet</h2>
              {!event.participants.includes(user?.uid) && (
                <button onClick={handleRegister} className="btn-primary text-sm inline-flex items-center gap-1">
                  <UserPlus className="w-3.5 h-3.5" />
                  S'inscrire d'abord
                </button>
              )}
            </div>

            {!event.participants.includes(user?.uid) ? (
              <p className="text-body">Vous devez d'abord vous inscrire au buildathon pour soumettre un projet.</p>
            ) : (
              <form onSubmit={handleSubmitProject} className="space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Titre du projet"
                    required
                    value={submitFormData.title}
                    onChange={(e) => setSubmitFormData({ ...submitFormData, title: e.target.value })}
                    className="w-full input-field"
                  />
                  <input
                    type="text"
                    placeholder="Nom de l'équipe"
                    required
                    value={submitFormData.teamName}
                    onChange={(e) => setSubmitFormData({ ...submitFormData, teamName: e.target.value })}
                    className="w-full input-field"
                  />
                </div>
                <textarea
                  placeholder="Description du projet"
                  value={submitFormData.description}
                  onChange={(e) => setSubmitFormData({ ...submitFormData, description: e.target.value })}
                  className="w-full input-field h-28 resize-none"
                />
                <div className="grid md:grid-cols-3 gap-3">
                  <select
                    value={submitFormData.category}
                    onChange={(e) => setSubmitFormData({ ...submitFormData, category: e.target.value })}
                    className="w-full input-field"
                  >
                    <option value="">Catégorie</option>
                    <option value="ai-ml">IA / ML</option>
                    <option value="web">Web</option>
                    <option value="mobile">Mobile</option>
                    <option value="cloud">Cloud</option>
                    <option value="data">Data</option>
                    <option value="other">Autre</option>
                  </select>
                  <input
                    type="url"
                    placeholder="Lien GitHub"
                    required
                    value={submitFormData.repoUrl}
                    onChange={(e) => setSubmitFormData({ ...submitFormData, repoUrl: e.target.value })}
                    className="w-full input-field"
                  />
                  <input
                    type="url"
                    placeholder="Lien démo / vidéo"
                    required
                    value={submitFormData.demoUrl}
                    onChange={(e) => setSubmitFormData({ ...submitFormData, demoUrl: e.target.value })}
                    className="w-full input-field"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" disabled={submitting} className="btn-primary text-sm flex items-center gap-1">
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    {submitting ? 'Envoi...' : 'Soumettre'}
                  </button>
                  <button type="button" onClick={() => setActiveTab('overview')} className="btn-secondary text-sm">
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {activeTab === 'discussions' && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-heading">Discussions</h2>
            {sortedProjects.length === 0 ? (
              <p className="text-body">Aucun projet disponible pour discussion pour le moment.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted">Chaque projet possède sa discussion dédiée (feedback/commentaires).</p>
                {sortedProjects.map((p) => (
                  <div key={p.id} className="p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-themed flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-heading truncate">{p.title || 'Projet sans titre'}</p>
                      <p className="text-xs text-muted">{getProjectTeamLabel(p)} • {p.feedbackCount || p.commentsCount || 0} commentaire(s)</p>
                    </div>
                    <Link
                      to={`/projects/${event.id}/project/${p.id}`}
                      className="text-xs px-3 py-1.5 rounded-lg bg-primary-600/20 text-primary-300 border border-primary-500/30 hover:bg-primary-600/30 transition-colors"
                    >
                      Ouvrir la discussion
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-heading">Règles</h2>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-themed">
                <p className="text-xs text-muted mb-1">Participation</p>
                <p className="text-sm text-body">{event.participationRules || 'Aucune règle de participation détaillée pour cet événement.'}</p>
              </div>
              <div className="p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-themed">
                <p className="text-xs text-muted mb-1">Critères d'évaluation</p>
                <p className="text-sm text-body">{event.evaluationCriteria || 'Aucun critère d\'évaluation détaillé pour cet événement.'}</p>
              </div>
              <div className="p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-themed">
                <p className="text-xs text-muted mb-1">Règle de départage</p>
                <p className="text-sm text-body">{event.tieBreakRuleText}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'management' && isAdmin && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-heading inline-flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary-400" />
              Gestion
            </h2>
            <p className="text-body">Espace admin prêt. Les outils de gestion détaillés seront ajoutés aux prochaines étapes.</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-themed">
                <p className="text-xs text-muted">Projets</p>
                <p className="text-sm font-medium text-heading">{projects.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-themed">
                <p className="text-xs text-muted">Vote activé</p>
                <p className="text-sm font-medium text-heading">{event.votingEnabled ? 'Oui' : 'Non'}</p>
              </div>
              <div className="p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-themed">
                <p className="text-xs text-muted">Publication</p>
                <p className="text-sm font-medium text-heading">{event.publicationStatus || 'published'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
