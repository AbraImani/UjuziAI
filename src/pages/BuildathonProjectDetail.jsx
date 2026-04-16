import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDocs,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  FileText,
  Github,
  Heart,
  Loader2,
  MessageSquare,
  Send,
  ThumbsUp,
  Users,
} from 'lucide-react';

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

function formatDate(value) {
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

function normalizeEvent(raw) {
  return {
    ...raw,
    votingEnabled: raw.votingEnabled !== false,
    participants: Array.isArray(raw.participants) ? raw.participants : [],
    maxVotesPerUser: Number(raw.maxVotesPerUser) > 0 ? Number(raw.maxVotesPerUser) : 1,
  };
}

function normalizeProject(raw) {
  const votes = Array.isArray(raw.votes) ? raw.votes : [];
  const likeUserIds = Array.isArray(raw.likeUserIds) ? raw.likeUserIds : [];
  const voteCount = Number.isFinite(Number(raw.voteCount)) ? Number(raw.voteCount) : votes.length;
  const likesCount = Number.isFinite(Number(raw.likesCount)) ? Number(raw.likesCount) : likeUserIds.length;
  const feedbackCount = Number.isFinite(Number(raw.feedbackCount))
    ? Number(raw.feedbackCount)
    : (Number.isFinite(Number(raw.commentsCount)) ? Number(raw.commentsCount) : 0);

  return {
    ...raw,
    votes,
    voteCount,
    likeUserIds,
    likesCount,
    feedbackCount,
    commentsCount: Number.isFinite(Number(raw.commentsCount)) ? Number(raw.commentsCount) : feedbackCount,
    submittedAt: normalizeDateLike(raw.submittedAt) || normalizeDateLike(raw.createdAt),
    statusLabel: raw.projectStatus || raw.moderationStatus || raw.status || 'soumis',
  };
}

function normalizeFeedback(raw) {
  return {
    ...raw,
    message: raw.message || '',
    authorName: raw.authorName || 'Participant',
    createdAt: normalizeDateLike(raw.createdAt),
  };
}

function getTeamLabel(project) {
  if (project?.teamName) return project.teamName;
  const members = Array.isArray(project?.members) ? project.members : [];
  if (members.length === 0) return 'Équipe non définie';
  const names = members.map((m) => m.name).filter(Boolean);
  return names.length > 0 ? names.join(', ') : 'Équipe non définie';
}

function getProjectTags(project) {
  const tags = Array.isArray(project?.tags) ? project.tags.filter(Boolean) : [];
  if (tags.length > 0) return tags;
  if (project?.category) return [project.category];
  return [];
}

function getProjectStack(project) {
  if (Array.isArray(project?.stack) && project.stack.length > 0) return project.stack.filter(Boolean);
  if (Array.isArray(project?.techStack) && project.techStack.length > 0) return project.techStack.filter(Boolean);
  if (typeof project?.techStack === 'string' && project.techStack.trim()) {
    return project.techStack.split(',').map((x) => x.trim()).filter(Boolean);
  }
  return getProjectTags(project);
}

export default function BuildathonProjectDetail() {
  const { buildathonId, projectId } = useParams();
  const { user, userProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [project, setProject] = useState(null);
  const [allEventProjects, setAllEventProjects] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
  const [newFeedback, setNewFeedback] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    if (!buildathonId || !projectId) {
      setLoading(false);
      return;
    }

    const eventRef = doc(db, 'buildathons', buildathonId);
    const unsubEvent = onSnapshot(eventRef, (snap) => {
      if (!snap.exists()) {
        setEvent(null);
        return;
      }
      setEvent(normalizeEvent({ id: snap.id, ...snap.data() }));
    });

    const projectRef = doc(db, 'buildathonProjects', projectId);
    const unsubProject = onSnapshot(projectRef, (snap) => {
      if (!snap.exists()) {
        setProject(null);
        setLoading(false);
        return;
      }
      const data = normalizeProject({ id: snap.id, ...snap.data() });
      if (data.buildathonId && data.buildathonId !== buildathonId) {
        setProject(null);
      } else {
        setProject(data);
      }
      setLoading(false);
    });

    const eventProjectsRef = query(collection(db, 'buildathonProjects'), where('buildathonId', '==', buildathonId));
    const unsubEventProjects = onSnapshot(eventProjectsRef, (snap) => {
      const data = [];
      snap.forEach((d) => data.push(normalizeProject({ id: d.id, ...d.data() })));
      setAllEventProjects(data);
    });

    const feedbackRef = collection(db, 'buildathonProjects', projectId, 'feedback');
    const unsubFeedback = onSnapshot(feedbackRef, (snap) => {
      const data = [];
      snap.forEach((d) => data.push(normalizeFeedback({ id: d.id, ...d.data() })));
      data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setFeedbackList(data);
    });

    return () => {
      unsubEvent();
      unsubProject();
      unsubEventProjects();
      unsubFeedback();
    };
  }, [buildathonId, projectId]);

  const hasVoted = useMemo(() => {
    return Boolean(user?.uid && project?.votes?.includes(user.uid));
  }, [user?.uid, project?.votes]);

  const hasLiked = useMemo(() => {
    return Boolean(user?.uid && project?.likeUserIds?.includes(user.uid));
  }, [user?.uid, project?.likeUserIds]);

  const hasVotedForAnotherProjectInEvent = useMemo(() => {
    if (!user?.uid) return false;
    return allEventProjects.some((p) => p.id !== projectId && p.votes?.includes(user.uid));
  }, [allEventProjects, projectId, user?.uid]);

  async function handleVote() {
    if (!user?.uid || !project) return;
    if (!event?.votingEnabled) {
      toast.error('Le vote est désactivé pour ce buildathon');
      return;
    }

    const isOwnProject = project.submittedBy === user.uid;
    if (isOwnProject && event?.allowSelfVote === false) {
      toast.error('Le vote pour son propre projet est désactivé');
      return;
    }

    if (!hasVoted && hasVotedForAnotherProjectInEvent && (event?.maxVotesPerUser || 1) <= 1) {
      toast.error('Vous avez déjà voté pour un autre projet de cet événement');
      return;
    }

    try {
      const ref = doc(db, 'buildathonProjects', project.id);
      if (hasVoted) {
        await updateDoc(ref, {
          votes: arrayRemove(user.uid),
          voteCount: increment(-1),
        });
        toast.success('Vote retiré');
      } else {
        await updateDoc(ref, {
          votes: arrayUnion(user.uid),
          voteCount: increment(1),
        });
        toast.success('Vote enregistré (impacte le classement)');
      }
    } catch (error) {
      toast.error('Erreur lors du vote');
    }
  }

  async function handleLike() {
    if (!user?.uid || !project) return;
    try {
      const ref = doc(db, 'buildathonProjects', project.id);
      if (hasLiked) {
        await updateDoc(ref, {
          likeUserIds: arrayRemove(user.uid),
          likesCount: increment(-1),
        });
        toast.success('Like retiré');
      } else {
        await updateDoc(ref, {
          likeUserIds: arrayUnion(user.uid),
          likesCount: increment(1),
        });
        toast.success('Like enregistré (popularité uniquement)');
      }
    } catch (error) {
      toast.error('Erreur lors du like');
    }
  }

  async function handleSubmitFeedback(e) {
    e.preventDefault();
    const message = newFeedback.trim();
    if (!message || !project || !user?.uid) return;

    setSubmittingFeedback(true);
    try {
      const feedbackRef = doc(collection(db, 'buildathonProjects', project.id, 'feedback'));
      await setDoc(feedbackRef, {
        userId: user.uid,
        authorName: userProfile?.displayName || user.displayName || user.email || 'Participant',
        authorEmail: user.email || null,
        message,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'buildathonProjects', project.id), {
        feedbackCount: increment(1),
        commentsCount: increment(1),
      });

      setNewFeedback('');
      toast.success('Feedback publié (discussion uniquement)');
    } catch (error) {
      toast.error('Erreur lors de la publication du feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto py-10">
        <div className="glass-card p-8 text-center">
          <h1 className="text-2xl font-bold text-heading mb-2">Projet introuvable</h1>
          <p className="text-body mb-6">Ce projet n'existe pas ou n'est plus accessible.</p>
          <Link to={`/projects/${buildathonId}`} className="btn-primary inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Retour au buildathon
          </Link>
        </div>
      </div>
    );
  }

  const tags = getProjectTags(project);
  const stack = getProjectStack(project);
  const feedbackCount = project.feedbackCount || project.commentsCount || 0;

  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-6">
      <div>
        <Link to={`/projects/${buildathonId}`} className="inline-flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Retour au buildathon
        </Link>

        <div className="glass-card p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-heading">{project.title}</h1>
              <p className="text-sm text-muted mt-1 inline-flex items-center gap-2">
                <Users className="w-4 h-4" />
                {getTeamLabel(project)}
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full border border-themed bg-surface text-muted self-start">{project.statusLabel}</span>
          </div>

          <p className="text-body">{project.description || 'Aucune description fournie.'}</p>

          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full border border-themed bg-surface text-muted">
                {tag}
              </span>
            ))}
            {tags.length === 0 && <span className="text-xs text-muted">Aucun tag</span>}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-themed bg-black/5 dark:bg-white/5">
              <p className="text-muted">Date de soumission</p>
              <p className="text-heading font-medium inline-flex items-center gap-1 mt-1"><Calendar className="w-3.5 h-3.5" />{formatDate(project.submittedAt)}</p>
            </div>
            <div className="p-3 rounded-lg border border-themed bg-black/5 dark:bg-white/5">
              <p className="text-muted">Vote (classement)</p>
              <p className="text-heading font-medium mt-1">{project.voteCount || 0}</p>
            </div>
            <div className="p-3 rounded-lg border border-themed bg-black/5 dark:bg-white/5">
              <p className="text-muted">Like (popularité)</p>
              <p className="text-heading font-medium mt-1">{project.likesCount || 0}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <a
              href={project.repoUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors ${project.repoUrl ? 'border-themed text-body hover:text-heading hover:bg-black/5 dark:hover:bg-white/5' : 'border-themed text-muted pointer-events-none opacity-60'}`}
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
            <a
              href={project.demoUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors ${project.demoUrl ? 'border-themed text-body hover:text-heading hover:bg-black/5 dark:hover:bg-white/5' : 'border-themed text-muted pointer-events-none opacity-60'}`}
            >
              <ExternalLink className="w-4 h-4" />
              Démo
            </a>
          </div>

          <div>
            <p className="text-xs text-muted mb-2">Stack</p>
            <div className="flex flex-wrap gap-2">
              {stack.length > 0 ? (
                stack.map((item) => (
                  <span key={item} className="text-[11px] px-2.5 py-1 rounded-full border border-themed bg-surface text-body">
                    {item}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted">Stack non renseignée.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-6 space-y-5">
        <h2 className="text-lg font-semibold text-heading">Actions séparées</h2>
        <p className="text-xs text-muted">Vote = impacte le classement, Like = popularité uniquement, Feedback = discussion uniquement.</p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleVote}
            disabled={!event?.votingEnabled}
            className={`px-4 py-2 rounded-lg border text-sm inline-flex items-center gap-2 transition-colors ${hasVoted ? 'border-primary-500/40 bg-primary-500/10 text-primary-300' : 'border-themed text-body hover:text-heading hover:bg-black/5 dark:hover:bg-white/5'} ${!event?.votingEnabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <ThumbsUp className={`w-4 h-4 ${hasVoted ? 'fill-current' : ''}`} />
            {hasVoted ? 'Retirer le vote' : 'Voter'} ({project.voteCount || 0})
          </button>

          <button
            onClick={handleLike}
            className={`px-4 py-2 rounded-lg border text-sm inline-flex items-center gap-2 transition-colors ${hasLiked ? 'border-rose-500/40 bg-rose-500/10 text-rose-300' : 'border-themed text-body hover:text-heading hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            <Heart className={`w-4 h-4 ${hasLiked ? 'fill-current' : ''}`} />
            {hasLiked ? 'Retirer le like' : 'Liker'} ({project.likesCount || 0})
          </button>

          <span className="px-4 py-2 rounded-lg border border-themed text-sm text-muted inline-flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Feedback ({feedbackCount})
          </span>
        </div>
      </div>

      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-heading inline-flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-400" />
          Feedback / Commentaires
        </h2>

        <form onSubmit={handleSubmitFeedback} className="space-y-3">
          <textarea
            value={newFeedback}
            onChange={(e) => setNewFeedback(e.target.value)}
            className="input-field w-full h-28 resize-none"
            placeholder="Partagez un feedback utile sur le projet..."
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submittingFeedback || !newFeedback.trim()}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submittingFeedback ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Publier
            </button>
          </div>
        </form>

        <div className="space-y-3">
          {feedbackList.length === 0 ? (
            <p className="text-sm text-muted">Aucun feedback pour le moment.</p>
          ) : (
            feedbackList.map((item) => (
              <div key={item.id} className="p-3 rounded-lg border border-themed bg-black/5 dark:bg-white/5">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <p className="text-sm font-medium text-heading">{item.authorName}</p>
                  <p className="text-[11px] text-muted">{formatDate(item.createdAt)}</p>
                </div>
                <p className="text-sm text-body whitespace-pre-wrap">{item.message}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
