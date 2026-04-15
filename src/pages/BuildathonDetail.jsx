import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Calendar, FileText, Loader2, Settings, ThumbsUp, Trophy, Users } from 'lucide-react';

const TAB_LIST = [
  { id: 'overview', label: 'Aperçu' },
  { id: 'projects', label: 'Projets' },
  { id: 'ranking', label: 'Classement' },
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

function getEventStatus(event) {
  const now = new Date();
  if (event?.status === 'completed') return 'Terminé';
  if (event?.startDate && new Date(event.startDate) > now) return 'À venir';
  if (event?.endDate && new Date(event.endDate) < now) return 'Vote ouvert';
  return 'En cours';
}

function normalizeBuildathonEvent(raw) {
  return {
    ...raw,
    participants: Array.isArray(raw.participants) ? raw.participants : [],
    votingEnabled: raw.votingEnabled !== false,
    startDate: normalizeDateLike(raw.startDate),
    endDate: normalizeDateLike(raw.endDate),
    voteStartDate: normalizeDateLike(raw.voteStartDate) || normalizeDateLike(raw.startDate),
    voteEndDate: normalizeDateLike(raw.voteEndDate) || normalizeDateLike(raw.endDate),
    projectVisibility: raw.projectVisibility || 'published-only',
    publicationStatus: raw.publicationStatus || 'published',
  };
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
  return {
    ...raw,
    votes,
    voteCount: Number.isFinite(voteCountRaw) ? voteCountRaw : votes.length,
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

export default function BuildathonDetail() {
  const { buildathonId } = useParams();
  const { isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

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

  const visibleTabs = useMemo(() => {
    return TAB_LIST.filter((tab) => !tab.adminOnly || isAdmin);
  }, [isAdmin]);

  const sortedProjects = useMemo(() => sortProjectsForRanking(projects), [projects]);

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
              <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" />{event.participants.length} participant{event.participants.length > 1 ? 's' : ''}</span>
              <span className="inline-flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{projects.length} projet{projects.length > 1 ? 's' : ''}</span>
              <span className={`inline-flex items-center gap-1 ${event.votingEnabled ? 'text-green-400' : 'text-red-400'}`}>
                <ThumbsUp className="w-3.5 h-3.5" />
                Vote {event.votingEnabled ? 'activé' : 'désactivé'}
              </span>
              <span className="badge bg-surface border border-themed text-body text-xs">{status}</span>
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
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-heading">Projets</h2>
            {projects.length === 0 ? (
              <p className="text-body">Aucun projet pour le moment.</p>
            ) : (
              sortedProjects.map((p) => (
                <div key={p.id} className="p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-themed flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-heading">{p.title}</p>
                    <p className="text-xs text-muted">{p.teamName || 'Équipe non définie'}</p>
                  </div>
                  <span className="text-xs text-muted">{p.voteCount || 0} vote{(p.voteCount || 0) > 1 ? 's' : ''}</span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'ranking' && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-heading inline-flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Classement
            </h2>
            <p className="text-xs text-muted">Tri: votes décroissants. En cas d'égalité, le projet soumis le plus tôt est prioritaire.</p>
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

        {activeTab === 'discussions' && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-heading">Discussions</h2>
            <p className="text-body">Section en préparation. Les échanges liés à ce buildathon seront affichés ici.</p>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-heading">Règles</h2>
            <p className="text-body">Les règles détaillées de participation seront centralisées ici.</p>
            <p className="text-xs text-muted">Rappel actuel: un vote par personne selon la configuration de l'événement.</p>
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
