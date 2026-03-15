import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  onSnapshot,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Trophy,
  Plus,
  Pencil,
  Trash2,
  ThumbsUp,
  Loader2,
  Search,
  Crown,
  Calendar,
  Link2,
  FileText,
  X,
  Send,
  Sparkles,
  Clock,
  Users,
  Zap,
  Award,
  CheckCircle,
  Timer,
  ChevronDown,
  ChevronUp,
  Globe,
  Video,
  Rocket,
  UserPlus,
  Mail,
  UserCheck,
  XCircle,
} from 'lucide-react';

const EVENT_TYPES = [
  { value: 'buildathon', label: 'Buildathon', icon: '🏗️' },
  { value: 'hackathon', label: 'Hackathon', icon: '💻' },
];

const PROJECT_CATEGORIES = [
  { value: 'ai-ml', label: 'IA / ML', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  { value: 'web', label: 'Web', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  { value: 'mobile', label: 'Mobile', color: 'bg-green-500/10 text-green-400 border-green-500/30' },
  { value: 'cloud', label: 'Cloud', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  { value: 'data', label: 'Data', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
  { value: 'other', label: 'Autre', color: 'bg-gray-500/10 text-gray-400 border-gray-500/30' },
];

const PRIZE_TYPES = [
  { value: 'points', label: 'Points bonus' },
  { value: 'swag', label: 'Swag' },
  { value: 'prize', label: 'Prix' },
];

function toDateInputValue(value) {
  if (!value) return '';
  if (typeof value === 'string' && value.includes('T')) return value.slice(0, 16);
  if (typeof value === 'string' && value.length === 10) return `${value}T00:00`;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatEventDate(value, withYear = true) {
  if (!value) return 'Date à définir';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizePrize(prize, index) {
  const rewardType = prize.rewardType || 'points';
  const pointsValue = prize.points ?? '';
  return {
    place: prize.place || index + 1,
    rewardType,
    points: typeof pointsValue === 'number' ? String(pointsValue) : String(pointsValue || ''),
    rewardLabel: prize.rewardLabel || '',
  };
}

function normalizePrizePoints(prize) {
  const parsed = Number(prize.points);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getPrizeDisplay(prize) {
  if ((prize.rewardType || 'points') === 'points') return `${normalizePrizePoints(prize)} pts`;
  return prize.rewardLabel || 'Récompense';
}

function getEventStatus(b) {
  const now = new Date();
  if (b.status === 'completed') return 'completed';
  if (b.startDate && new Date(b.startDate) > now) return 'upcoming';
  if (b.endDate && new Date(b.endDate) < now) return 'ended';
  return 'active';
}

const STATUS_CONFIG = {
  upcoming: { label: 'À venir', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30', dot: 'bg-blue-400' },
  active: { label: 'En cours', color: 'bg-green-500/10 text-green-400 border-green-500/30', dot: 'bg-green-400' },
  ended: { label: 'Vote ouvert', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
  completed: { label: 'Terminé', color: 'bg-gray-500/10 text-gray-400 border-gray-500/30', dot: 'bg-gray-400' },
};

export default function Buildathon() {
  const { user, userProfile, isAdmin } = useAuth();
  const [events, setEvents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  // Admin: create event
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    type: 'buildathon',
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    workDuration: '',
    maxTeamSize: 4,
    prizes: [
      { place: 1, rewardType: 'points', points: '50', rewardLabel: '' },
      { place: 2, rewardType: 'points', points: '30', rewardLabel: '' },
      { place: 3, rewardType: 'points', points: '10', rewardLabel: '' },
    ],
  });
  const [showEditEvent, setShowEditEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [editEvent, setEditEvent] = useState({
    type: 'buildathon',
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    workDuration: '',
    maxTeamSize: 4,
    prizes: [
      { place: 1, rewardType: 'points', points: '50', rewardLabel: '' },
      { place: 2, rewardType: 'points', points: '30', rewardLabel: '' },
      { place: 3, rewardType: 'points', points: '10', rewardLabel: '' },
    ],
  });

  // User: submit project
  const [showSubmitProject, setShowSubmitProject] = useState(null);
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    category: 'ai-ml',
    teamName: '',
    repoUrl: '',
    demoUrl: '',
    inviteEmail: '',
  });
  const [invitations, setInvitations] = useState([]);

  useEffect(() => {
    const unsubEvents = onSnapshot(
      query(collection(db, 'buildathons'), orderBy('createdAt', 'desc')),
      (snap) => {
        const data = [];
        snap.forEach((d) => data.push({ id: d.id, ...d.data() }));
        setEvents(data);
        setLoading(false);
      },
      (err) => { console.error('Events error:', err); setLoading(false); },
    );

    const unsubProjects = onSnapshot(
      collection(db, 'buildathonProjects'),
      (snap) => {
        const data = [];
        snap.forEach((d) => data.push({ id: d.id, ...d.data() }));
        setProjects(data);
      },
      (err) => console.error('Projects error:', err),
    );

    // Listen for invitations addressed to current user
    let unsubInvitations = () => {};
    if (user?.uid) {
      unsubInvitations = onSnapshot(
        query(collection(db, 'projectInvitations'), where('invitedUid', '==', user.uid), where('status', '==', 'pending')),
        (snap) => {
          const data = [];
          snap.forEach((d) => data.push({ id: d.id, ...d.data() }));
          setInvitations(data);
        },
        (err) => console.error('Invitations error:', err),
      );
    }

    return () => { unsubEvents(); unsubProjects(); unsubInvitations(); };
  }, [user?.uid]);

  // ---- Admin: Create Event ----
  async function handleCreateEvent(e) {
    e.preventDefault();
    if (!newEvent.title || !newEvent.startDate || !newEvent.endDate) {
      toast.error('Titre, date de début et date de fin sont obligatoires');
      return;
    }
    const computedDuration = (() => {
      const start = new Date(newEvent.startDate);
      const end = new Date(newEvent.endDate);
      const diffMs = end - start;
      if (Number.isNaN(diffMs) || diffMs <= 0) return '';
      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
      return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
    })();
    try {
      const id = `event-${Date.now().toString(36)}`;
      await setDoc(doc(db, 'buildathons', id), {
        type: newEvent.type,
        title: newEvent.title,
        description: newEvent.description,
        startDate: newEvent.startDate,
        endDate: newEvent.endDate,
        workDuration: newEvent.workDuration || computedDuration,
        maxTeamSize: Number(newEvent.maxTeamSize) || 4,
        prizes: newEvent.prizes
          .map((p, i) => ({ ...p, place: i + 1 }))
          .filter((p) => (p.rewardType || 'points') === 'points' ? normalizePrizePoints(p) > 0 : Boolean(p.rewardLabel?.trim()))
          .map((p) => ({
            place: p.place,
            rewardType: p.rewardType || 'points',
            points: (p.rewardType || 'points') === 'points' ? normalizePrizePoints(p) : 0,
            rewardLabel: (p.rewardType || 'points') === 'points' ? '' : (p.rewardLabel || ''),
          })),
        participants: [],
        status: 'active',
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        finalized: false,
      });
      toast.success(`${newEvent.type === 'hackathon' ? 'Hackathon' : 'Buildathon'} créé !`);
      setShowCreateEvent(false);
      setNewEvent({
        type: 'buildathon',
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        workDuration: '',
        maxTeamSize: 4,
        prizes: [
          { place: 1, rewardType: 'points', points: '50', rewardLabel: '' },
          { place: 2, rewardType: 'points', points: '30', rewardLabel: '' },
          { place: 3, rewardType: 'points', points: '10', rewardLabel: '' },
        ],
      });
    } catch (err) {
      toast.error('Erreur: ' + err.message);
    }
  }

  // ---- Admin: Edit Event ----
  function handleOpenEditEvent(event) {
    setEditingEventId(event.id);
    setEditEvent({
      type: event.type || 'buildathon',
      title: event.title || '',
      description: event.description || '',
      startDate: toDateInputValue(event.startDate),
      endDate: toDateInputValue(event.endDate),
      workDuration: event.workDuration || '',
      maxTeamSize: Number(event.maxTeamSize) || 4,
      prizes: (event.prizes && event.prizes.length > 0)
        ? [...event.prizes].sort((a, b) => a.place - b.place).map((p, i) => normalizePrize(p, i))
        : [
          { place: 1, rewardType: 'points', points: '50', rewardLabel: '' },
          { place: 2, rewardType: 'points', points: '30', rewardLabel: '' },
          { place: 3, rewardType: 'points', points: '10', rewardLabel: '' },
        ],
    });
    setShowEditEvent(true);
  }

  async function handleUpdateEvent(e) {
    e.preventDefault();
    if (!editingEventId) return;
    if (!editEvent.title || !editEvent.startDate || !editEvent.endDate) {
      toast.error('Titre, date de début et date de fin sont obligatoires');
      return;
    }
    const computedDuration = (() => {
      const start = new Date(editEvent.startDate);
      const end = new Date(editEvent.endDate);
      const diffMs = end - start;
      if (Number.isNaN(diffMs) || diffMs <= 0) return '';
      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
      return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
    })();
    try {
      await updateDoc(doc(db, 'buildathons', editingEventId), {
        type: editEvent.type,
        title: editEvent.title,
        description: editEvent.description,
        startDate: editEvent.startDate,
        endDate: editEvent.endDate,
        workDuration: editEvent.workDuration || computedDuration,
        maxTeamSize: Number(editEvent.maxTeamSize) || 4,
        prizes: editEvent.prizes
          .map((p, i) => ({ ...p, place: i + 1 }))
          .filter((p) => (p.rewardType || 'points') === 'points' ? normalizePrizePoints(p) > 0 : Boolean(p.rewardLabel?.trim()))
          .map((p) => ({
            place: p.place,
            rewardType: p.rewardType || 'points',
            points: (p.rewardType || 'points') === 'points' ? normalizePrizePoints(p) : 0,
            rewardLabel: (p.rewardType || 'points') === 'points' ? '' : (p.rewardLabel || ''),
          })),
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      toast.success('Événement mis à jour avec succès');
      setShowEditEvent(false);
      setEditingEventId(null);
    } catch (err) {
      toast.error('Erreur: ' + err.message);
    }
  }

  async function handleDeleteEvent(eventId) {
    if (!confirm('Supprimer cet événement ? Cette action supprimera aussi les projets et invitations liés.')) return;
    try {
      const projectSnap = await getDocs(query(collection(db, 'buildathonProjects'), where('buildathonId', '==', eventId)));
      for (const projectDoc of projectSnap.docs) {
        await deleteDoc(doc(db, 'buildathonProjects', projectDoc.id));
      }

      const inviteSnap = await getDocs(query(collection(db, 'projectInvitations'), where('buildathonId', '==', eventId)));
      for (const inviteDoc of inviteSnap.docs) {
        await deleteDoc(doc(db, 'projectInvitations', inviteDoc.id));
      }

      await deleteDoc(doc(db, 'buildathons', eventId));
      toast.success('Événement supprimé');
    } catch (err) {
      toast.error('Erreur: ' + err.message);
    }
  }

  // ---- User: Register ----
  async function handleRegister(eventId) {
    try {
      await updateDoc(doc(db, 'buildathons', eventId), { participants: arrayUnion(user.uid) });
      toast.success('Inscrit avec succès !');
    } catch (err) {
      toast.error('Erreur: ' + err.message);
    }
  }

  // ---- User: Submit Project (GitHub + demo video mandatory) ----
  async function handleSubmitProject(eventId) {
    if (!newProject.title || !newProject.teamName) {
      toast.error('Le titre et le nom d\'équipe sont obligatoires');
      return;
    }
    if (!newProject.repoUrl) {
      toast.error('Le lien GitHub est obligatoire');
      return;
    }
    if (!newProject.demoUrl) {
      toast.error('Le lien vidéo démo est obligatoire');
      return;
    }
    try {
      const id = `project-${Date.now().toString(36)}-${user.uid.slice(0, 6)}`;
      await setDoc(doc(db, 'buildathonProjects', id), {
        buildathonId: eventId,
        title: newProject.title,
        description: newProject.description,
        category: newProject.category,
        teamName: newProject.teamName,
        repoUrl: newProject.repoUrl,
        demoUrl: newProject.demoUrl,
        members: [{ uid: user.uid, name: userProfile?.displayName || user.email, email: user.email }],
        votes: [],
        voteCount: 0,
        submittedBy: user.uid,
        submittedAt: serverTimestamp(),
      });
      toast.success('Projet soumis !');
      setShowSubmitProject(null);
      setNewProject({ title: '', description: '', category: 'ai-ml', teamName: '', repoUrl: '', demoUrl: '', inviteEmail: '' });
    } catch (err) {
      toast.error('Erreur: ' + err.message);
    }
  }

  // ---- User: Vote (1 vote per user per event, 1 vote = 10 pts) ----
  async function handleVote(projectId, buildathonId, currentVotes) {
    if (!user) return;
    const hasVoted = currentVotes?.includes(user.uid);

    if (!hasVoted) {
      const eventProjects = projects.filter((p) => p.buildathonId === buildathonId);
      const alreadyVoted = eventProjects.some((p) => p.id !== projectId && p.votes?.includes(user.uid));
      if (alreadyVoted) {
        toast.error('Vous ne pouvez voter que pour un seul projet par événement');
        return;
      }
    }

    try {
      const projRef = doc(db, 'buildathonProjects', projectId);
      if (hasVoted) {
        await updateDoc(projRef, { votes: arrayRemove(user.uid), voteCount: increment(-1) });
        toast.success('Vote retiré');
      } else {
        await updateDoc(projRef, { votes: arrayUnion(user.uid), voteCount: increment(1) });
        toast.success('Vote enregistré ! (+10 pts pour ce projet)');
      }
    } catch (err) {
      toast.error('Erreur: ' + err.message);
    }
  }

  // ---- Admin: Finalize Event (points divided among team members) ----
  async function handleFinalize(eventId, autoMode = false) {
    const event = events.find((e) => e.id === eventId);
    if (!event || event.finalized) return;
    const eventProjects = projects.filter((p) => p.buildathonId === eventId).sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
    if (eventProjects.length === 0) { if (!autoMode) toast.error('Aucun projet soumis'); return; }
    const prizes = (event.prizes || []).filter((p) => (p.rewardType || 'points') === 'points').sort((a, b) => a.place - b.place);
    try {
      for (let i = 0; i < Math.min(prizes.length, eventProjects.length); i++) {
        const project = eventProjects[i];
        const prize = prizes[i];
        const memberCount = project.members?.length || 1;
        const prizePoints = normalizePrizePoints(prize);
        const pointsPerMember = Math.round(prizePoints / memberCount);
        if (pointsPerMember <= 0) continue;
        for (const member of project.members || []) {
          if (member.uid) {
            const userRef = doc(db, 'users', member.uid);
            await updateDoc(userRef, { bonusPoints: increment(pointsPerMember) });
            const logRef = doc(collection(db, 'users', member.uid, 'bonusLogs'));
            await setDoc(logRef, {
              points: pointsPerMember,
              reason: `${event.type === 'hackathon' ? 'Hackathon' : 'Buildathon'} "${event.title}" - Place ${prize.place} (${prizePoints} pts ÷ ${memberCount} membre${memberCount > 1 ? 's' : ''})`,
              grantedBy: autoMode ? 'system' : user.uid,
              grantedAt: serverTimestamp(),
            });
          }
        }
      }
      await updateDoc(doc(db, 'buildathons', eventId), { status: 'completed', finalized: true, finalizedAt: serverTimestamp(), finalizedBy: autoMode ? 'system' : user.uid });
      if (!autoMode) toast.success('Événement finalisé ! Points bonus répartis entre les membres.');
    } catch (err) {
      if (!autoMode) toast.error('Erreur: ' + err.message);
      console.error('Finalize error:', err);
    }
  }

  // ---- Invite friend (creates a pending invitation) ----
  async function handleInviteFriend(projectId, buildathonId) {
    if (!newProject.inviteEmail) { toast.error('Entrez l\'email ou ID de votre ami'); return; }
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const typed = newProject.inviteEmail.trim().toLowerCase();
      const typedCompact = typed.replace(/^uza-/, '');
      let friendUid = null;
      let friendName = null;
      let friendEmail = null;
      usersSnap.forEach((d) => {
        const data = d.data();
        const email = (data.email || '').toLowerCase();
        const uniqueId = (data.uniqueId || '').toLowerCase().replace(/^uza-/, '');
        const shortId = d.id.slice(0, 8).toLowerCase();
        const isMatch = email === typed || d.id.toLowerCase() === typed || shortId === typedCompact || uniqueId === typedCompact;
        if (isMatch) {
          friendUid = d.id;
          friendName = data.displayName || data.email;
          friendEmail = data.email || newProject.inviteEmail;
        }
      });
      if (!friendUid) { toast.error('Utilisateur non trouvé'); return; }
      if (friendUid === user.uid) { toast.error('Vous ne pouvez pas vous inviter vous-même'); return; }

      // Check if already a member
      const project = projects.find((p) => p.id === projectId);
      if (project?.members?.some((m) => m.uid === friendUid)) {
        toast.error('Cet utilisateur est déjà membre de l\'équipe');
        return;
      }

      // Check if invitation already pending
      const existingInvSnap = await getDocs(
        query(collection(db, 'projectInvitations'), where('projectId', '==', projectId), where('invitedUid', '==', friendUid), where('status', '==', 'pending'))
      );
      if (!existingInvSnap.empty) {
        toast.error('Une invitation est déjà en attente pour cet utilisateur');
        return;
      }

      const invId = `inv-${Date.now().toString(36)}-${friendUid.slice(0, 6)}`;
      await setDoc(doc(db, 'projectInvitations', invId), {
        projectId,
        buildathonId,
        projectTitle: project?.title || '',
        teamName: project?.teamName || '',
        invitedUid: friendUid,
        invitedEmail: friendEmail || newProject.inviteEmail,
        invitedName: friendName,
        invitedBy: user.uid,
        invitedByName: userProfile?.displayName || user.email,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      toast.success(`Invitation envoyée à ${friendName} !`);
      setNewProject((p) => ({ ...p, inviteEmail: '' }));
    } catch (err) {
      toast.error('Erreur: ' + err.message);
    }
  }

  // ---- Accept invitation ----
  async function handleAcceptInvitation(invitation) {
    try {
      // Add user to project members
      await updateDoc(doc(db, 'buildathonProjects', invitation.projectId), {
        members: arrayUnion({ uid: user.uid, name: userProfile?.displayName || user.email, email: user.email }),
      });
      // Also register user for the event if not already
      if (invitation.buildathonId) {
        await updateDoc(doc(db, 'buildathons', invitation.buildathonId), {
          participants: arrayUnion(user.uid),
        });
      }
      // Delete the invitation
      await deleteDoc(doc(db, 'projectInvitations', invitation.id));
      toast.success(`Vous avez rejoint l'équipe "${invitation.teamName}" !`);
    } catch (err) {
      toast.error('Erreur: ' + err.message);
    }
  }

  // ---- Decline invitation ----
  async function handleDeclineInvitation(invitation) {
    try {
      await deleteDoc(doc(db, 'projectInvitations', invitation.id));
      toast.success('Invitation refusée');
    } catch (err) {
      toast.error('Erreur: ' + err.message);
    }
  }

  // ---- Get pending invitations for a project (sent by owner) ----
  const [projectPendingInvites, setProjectPendingInvites] = useState([]);
  useEffect(() => {
    if (!user?.uid) return;
    const unsubSent = onSnapshot(
      query(collection(db, 'projectInvitations'), where('invitedBy', '==', user.uid), where('status', '==', 'pending')),
      (snap) => {
        const data = [];
        snap.forEach((d) => data.push({ id: d.id, ...d.data() }));
        setProjectPendingInvites(data);
      },
    );
    return () => unsubSent();
  }, [user?.uid]);

  // ---- Auto-finalize: when an event has ended, automatically finalize & distribute points ----
  useEffect(() => {
    if (!events.length || !projects.length || loading) return;
    events.forEach((event) => {
      const status = getEventStatus(event);
      if (status === 'ended' && !event.finalized) {
        const eventProjects = projects.filter((p) => p.buildathonId === event.id);
        if (eventProjects.length > 0) {
          handleFinalize(event.id, true);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, projects, loading]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const status = getEventStatus(e);
      if (filterStatus !== 'all' && status !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return e.title?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [events, filterStatus, searchQuery]);

  function CountdownTimer({ endDate }) {
    const [timeLeft, setTimeLeft] = useState('');
    useEffect(() => {
      function update() {
        const now = new Date();
        const end = new Date(endDate);
        const diff = end - now;
        if (diff <= 0) { setTimeLeft('Terminé'); return; }
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff / 3600000) % 24);
        const m = Math.floor((diff / 60000) % 60);
        setTimeLeft(`${d}j ${h}h ${m}m`);
      }
      update();
      const interval = setInterval(update, 60000);
      return () => clearInterval(interval);
    }, [endDate]);
    return <span className="flex items-center gap-1 text-sm font-medium"><Timer className="w-3.5 h-3.5" />{timeLeft}</span>;
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Rocket className="w-8 h-8 text-primary-400" />
          <div>
            <h1 className="section-title">Événements</h1>
            <p className="section-subtitle">Buildathons & Hackathons — participez, votez, gagnez !</p>
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreateEvent(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Créer un événement
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Rechercher un événement..." className="input-field pl-11 w-full" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[{ value: 'all', label: 'Tous' }, { value: 'active', label: 'En cours' }, { value: 'upcoming', label: 'À venir' }, { value: 'ended', label: 'Vote' }, { value: 'completed', label: 'Passés' }].map(({ value, label }) => (
            <button key={value} onClick={() => setFilterStatus(value)} className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${filterStatus === value ? 'bg-primary-600/20 text-primary-300 border border-primary-500/30' : 'text-body hover:text-heading hover:bg-black/5 dark:hover:bg-white/5'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Pending Invitations Banner */}
      {invitations.length > 0 && (
        <div className="mb-6 space-y-3">
          <h3 className="text-sm font-semibold text-heading uppercase tracking-wider flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary-400" />
            Invitations en attente ({invitations.length})
          </h3>
          {invitations.map((inv) => (
            <div key={inv.id} className="glass-card p-4 border-2 border-primary-500/30 bg-primary-500/5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-heading font-medium">
                    <span className="text-primary-400">{inv.invitedByName}</span> vous invite à rejoindre l'équipe <span className="font-bold">"{inv.teamName}"</span>
                  </p>
                  <p className="text-sm text-muted mt-0.5">Projet : {inv.projectTitle}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleAcceptInvitation(inv)} className="btn-primary text-sm flex items-center gap-1.5 px-4 py-2">
                    <UserCheck className="w-4 h-4" />Rejoindre
                  </button>
                  <button onClick={() => handleDeclineInvitation(inv)} className="btn-secondary text-sm flex items-center gap-1.5 px-3 py-2">
                    <XCircle className="w-4 h-4" />Refuser
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin: Create Event Form */}
      {showCreateEvent && isAdmin && (
        <div className="glass-card p-8 mb-6 border-2 border-primary-500/30">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-heading flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-400" />
              Nouvel événement
            </h2>
            <button onClick={() => setShowCreateEvent(false)} className="text-muted hover:text-heading"><X className="w-5 h-5" /></button>
          </div>

          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-body mb-2">Type d'événement *</label>
              <div className="flex gap-3">
                {EVENT_TYPES.map((t) => (
                  <button key={t.value} type="button" onClick={() => setNewEvent((p) => ({ ...p, type: t.value }))} className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${newEvent.type === t.value ? 'border-primary-500 bg-primary-500/10 text-heading' : 'border-themed text-body hover:border-primary-500/50'}`}>
                    <span className="text-xl">{t.icon}</span>
                    <span className="font-medium">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-1">Titre *</label>
              <input type="text" value={newEvent.title} onChange={(e) => setNewEvent((p) => ({ ...p, title: e.target.value }))} className="input-field w-full" placeholder="Ex: Buildathon IA Mars 2026" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-1">Description</label>
              <textarea value={newEvent.description} onChange={(e) => setNewEvent((p) => ({ ...p, description: e.target.value }))} className="input-field w-full h-24 resize-none" placeholder="Thème, règles, objectifs..." />
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-body mb-1">Date et heure de début *</label>
                <input type="datetime-local" value={newEvent.startDate} onChange={(e) => setNewEvent((p) => ({ ...p, startDate: e.target.value }))} className="input-field w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-1">Date et heure de fin *</label>
                <input type="datetime-local" value={newEvent.endDate} onChange={(e) => setNewEvent((p) => ({ ...p, endDate: e.target.value }))} className="input-field w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-1">Durée de travail</label>
                <input type="text" value={newEvent.workDuration} onChange={(e) => setNewEvent((p) => ({ ...p, workDuration: e.target.value }))} className="input-field w-full" placeholder="Ex: 48h" />
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-1">Taille max équipe</label>
                <input type="number" min="1" max="10" value={newEvent.maxTeamSize} onChange={(e) => setNewEvent((p) => ({ ...p, maxTeamSize: e.target.value }))} className="input-field w-full" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-2">Prix (points, swag, prix)</label>
              <div className="space-y-2">
                {newEvent.prizes.map((prize, i) => (
                  <div key={i} className="grid sm:grid-cols-5 gap-2 items-center">
                    <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${prize.place}`}</span>
                    <span className="text-sm text-body">Place {prize.place}</span>
                    <select value={prize.rewardType || 'points'} onChange={(e) => { const u = [...newEvent.prizes]; u[i] = { ...u[i], rewardType: e.target.value }; setNewEvent((p) => ({ ...p, prizes: u })); }} className="input-field w-full">
                      {PRIZE_TYPES.map((pt) => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                    </select>
                    {(prize.rewardType || 'points') === 'points' ? (
                      <input type="number" min="0" value={prize.points} onChange={(e) => { const u = [...newEvent.prizes]; u[i] = { ...u[i], points: e.target.value }; setNewEvent((p) => ({ ...p, prizes: u })); }} className="input-field w-full" placeholder="Ex: 25" />
                    ) : (
                      <input type="text" value={prize.rewardLabel || ''} onChange={(e) => { const u = [...newEvent.prizes]; u[i] = { ...u[i], rewardLabel: e.target.value }; setNewEvent((p) => ({ ...p, prizes: u })); }} className="input-field w-full" placeholder="Ex: T-shirt, MacBook, etc." />
                    )}
                    <span className="text-xs text-muted">{(prize.rewardType || 'points') === 'points' ? 'pts' : 'libellé'}</span>
                  </div>
                ))}
                <button type="button" onClick={() => setNewEvent((p) => ({ ...p, prizes: [...p.prizes, { place: p.prizes.length + 1, rewardType: 'points', points: '', rewardLabel: '' }] }))} className="text-sm text-primary-400 hover:text-primary-300">+ Ajouter un prix</button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex items-center gap-2"><Rocket className="w-4 h-4" />Créer l'événement</button>
              <button type="button" onClick={() => setShowCreateEvent(false)} className="btn-secondary">Annuler</button>
            </div>
          </form>
        </div>
      )}

      {/* Admin: Edit Event Form */}
      {showEditEvent && isAdmin && (
        <div className="glass-card p-8 mb-6 border-2 border-amber-500/30">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-heading flex items-center gap-2">
              <Pencil className="w-5 h-5 text-amber-400" />
              Modifier l'événement
            </h2>
            <button
              onClick={() => { setShowEditEvent(false); setEditingEventId(null); }}
              className="text-muted hover:text-heading"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleUpdateEvent} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-body mb-2">Type d'événement *</label>
              <div className="flex gap-3">
                {EVENT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setEditEvent((p) => ({ ...p, type: t.value }))}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${editEvent.type === t.value ? 'border-amber-500 bg-amber-500/10 text-heading' : 'border-themed text-body hover:border-amber-500/50'}`}
                  >
                    <span className="text-xl">{t.icon}</span>
                    <span className="font-medium">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-1">Titre *</label>
              <input type="text" value={editEvent.title} onChange={(e) => setEditEvent((p) => ({ ...p, title: e.target.value }))} className="input-field w-full" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-1">Description</label>
              <textarea value={editEvent.description} onChange={(e) => setEditEvent((p) => ({ ...p, description: e.target.value }))} className="input-field w-full h-24 resize-none" />
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-body mb-1">Date et heure de début *</label>
                <input type="datetime-local" value={editEvent.startDate} onChange={(e) => setEditEvent((p) => ({ ...p, startDate: e.target.value }))} className="input-field w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-1">Date et heure de fin *</label>
                <input type="datetime-local" value={editEvent.endDate} onChange={(e) => setEditEvent((p) => ({ ...p, endDate: e.target.value }))} className="input-field w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-1">Durée de travail</label>
                <input type="text" value={editEvent.workDuration} onChange={(e) => setEditEvent((p) => ({ ...p, workDuration: e.target.value }))} className="input-field w-full" placeholder="Ex: 48h" />
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-1">Taille max équipe</label>
                <input type="number" min="1" max="10" value={editEvent.maxTeamSize} onChange={(e) => setEditEvent((p) => ({ ...p, maxTeamSize: e.target.value }))} className="input-field w-full" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-2">Prix (points, swag, prix)</label>
              <div className="space-y-2">
                {editEvent.prizes.map((prize, i) => (
                  <div key={i} className="grid sm:grid-cols-5 gap-2 items-center">
                    <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${prize.place}`}</span>
                    <span className="text-sm text-body">Place {prize.place}</span>
                    <select value={prize.rewardType || 'points'} onChange={(e) => { const u = [...editEvent.prizes]; u[i] = { ...u[i], rewardType: e.target.value }; setEditEvent((p) => ({ ...p, prizes: u })); }} className="input-field w-full">
                      {PRIZE_TYPES.map((pt) => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                    </select>
                    {(prize.rewardType || 'points') === 'points' ? (
                      <input type="number" min="0" value={prize.points} onChange={(e) => { const u = [...editEvent.prizes]; u[i] = { ...u[i], points: e.target.value }; setEditEvent((p) => ({ ...p, prizes: u })); }} className="input-field w-full" placeholder="Ex: 25" />
                    ) : (
                      <input type="text" value={prize.rewardLabel || ''} onChange={(e) => { const u = [...editEvent.prizes]; u[i] = { ...u[i], rewardLabel: e.target.value }; setEditEvent((p) => ({ ...p, prizes: u })); }} className="input-field w-full" placeholder="Ex: T-shirt, MacBook, etc." />
                    )}
                    <span className="text-xs text-muted">{(prize.rewardType || 'points') === 'points' ? 'pts' : 'libellé'}</span>
                  </div>
                ))}
                <button type="button" onClick={() => setEditEvent((p) => ({ ...p, prizes: [...p.prizes, { place: p.prizes.length + 1, rewardType: 'points', points: '', rewardLabel: '' }] }))} className="text-sm text-amber-400 hover:text-amber-300">+ Ajouter un prix</button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex items-center gap-2"><Pencil className="w-4 h-4" />Enregistrer</button>
              <button type="button" onClick={() => { setShowEditEvent(false); setEditingEventId(null); }} className="btn-secondary">Annuler</button>
            </div>
          </form>
        </div>
      )}

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Rocket className="w-20 h-20 text-muted mx-auto mb-4 opacity-30" />
          <h3 className="text-xl font-bold text-heading mb-2">
            {searchQuery || filterStatus !== 'all' ? 'Aucun événement trouvé' : 'Aucun événement prévu pour le moment'}
          </h3>
          <p className="text-body max-w-md mx-auto">
            {isAdmin
              ? 'Créez le premier Buildathon ou Hackathon pour lancer la compétition !'
              : 'Il n\'y a pas encore de Buildathon ou Hackathon prévu. Revenez bientôt pour découvrir les prochains événements !'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredEvents.map((event) => {
            const status = getEventStatus(event);
            const statusInfo = STATUS_CONFIG[status];
            const eventProjects = projects.filter((p) => p.buildathonId === event.id).sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
            const isExpanded = expandedEvent === event.id;
            const isRegistered = event.participants?.includes(user?.uid);
            const userHasSubmitted = eventProjects.some((p) => p.submittedBy === user?.uid);
            const canSubmit = status === 'active' && isRegistered;
            const canVote = status === 'active' || status === 'ended';
            const canRegister = (status === 'upcoming' || status === 'active') && !isRegistered;
            const typeLabel = event.type === 'hackathon' ? 'Hackathon' : 'Buildathon';
            const typeIcon = event.type === 'hackathon' ? '💻' : '🏗️';
            const userVotedProject = eventProjects.find((p) => p.votes?.includes(user?.uid));

            return (
              <div key={event.id} className="glass-card overflow-hidden">
                {/* Event Header */}
                <div className="p-6 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors" onClick={() => setExpandedEvent(isExpanded ? null : event.id)}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="text-2xl">{typeIcon}</span>
                        <h2 className="text-xl font-bold text-heading">{event.title}</h2>
                        <span className={`badge border ${statusInfo.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot} mr-1 inline-block`} />
                          {statusInfo.label}
                        </span>
                        <span className="badge bg-surface text-body border border-themed text-xs">{typeLabel}</span>
                      </div>
                      {event.description && <p className={`text-body text-sm mb-3 ${isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}>{event.description}</p>}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatEventDate(event.startDate, false)} → {formatEventDate(event.endDate, true)}</span>
                        {event.workDuration && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{event.workDuration}</span>}
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{event.participants?.length || 0} inscrit{(event.participants?.length || 0) !== 1 ? 's' : ''}</span>
                        <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{eventProjects.length} projet{eventProjects.length !== 1 ? 's' : ''}</span>
                        {(status === 'active' || status === 'upcoming') && event.endDate && <span className="text-amber-400"><CountdownTimer endDate={event.endDate} /></span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {event.prizes?.length > 0 && (
                        <div className="hidden sm:flex items-center gap-1.5">
                          {event.prizes.slice(0, 3).map((p, i) => (
                            <span key={i} className="flex items-center gap-0.5 badge bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs">{(p.rewardType || 'points') === 'points' ? <Zap className="w-3 h-3" /> : <Award className="w-3 h-3" />}{getPrizeDisplay(p)}</span>
                          ))}
                        </div>
                      )}
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-muted" /> : <ChevronDown className="w-5 h-5 text-muted" />}
                    </div>
                  </div>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-themed">
                    {/* Actions */}
                    <div className="px-6 py-3 bg-black/5 dark:bg-white/5 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        {canRegister && (
                          <button onClick={(e) => { e.stopPropagation(); handleRegister(event.id); }} className="btn-primary text-sm flex items-center gap-1"><UserPlus className="w-3.5 h-3.5" />S'inscrire</button>
                        )}
                        {isRegistered && <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" />Inscrit</span>}
                        {canSubmit && !userHasSubmitted && (
                          <button onClick={(e) => { e.stopPropagation(); setShowSubmitProject(event.id); }} className="btn-accent text-sm flex items-center gap-1"><Send className="w-3.5 h-3.5" />Soumettre un projet</button>
                        )}
                        {isRegistered && !userHasSubmitted && status === 'active' && (
                          <span className="text-xs text-muted">Invitez vos coéquipiers après soumission du projet (email ou ID).</span>
                        )}
                        {userHasSubmitted && <span className="text-xs text-accent-400 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" />Projet soumis</span>}
                        {isAdmin && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenEditEvent(event); }}
                              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />Modifier
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }}
                              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />Supprimer
                            </button>
                          </>
                        )}
                      </div>
                      {isAdmin && !event.finalized && (status === 'ended' || status === 'active') && (
                        <button onClick={(e) => { e.stopPropagation(); if (confirm('Finaliser et attribuer les points ?')) handleFinalize(event.id); }} className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors">
                          <Award className="w-3.5 h-3.5" />Finaliser & Attribuer prix
                        </button>
                      )}
                      {event.finalized && <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" />Finalisé</span>}
                    </div>

                    {/* Submit Project Form */}
                    {showSubmitProject === event.id && (
                      <div className="p-6 border-t border-themed bg-primary-500/5">
                        <h3 className="text-lg font-semibold text-heading mb-4 flex items-center gap-2"><Send className="w-5 h-5 text-primary-400" />Soumettre votre projet</h3>
                        <div className="space-y-3">
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-body mb-1">Titre *</label>
                              <input type="text" value={newProject.title} onChange={(e) => setNewProject((p) => ({ ...p, title: e.target.value }))} className="input-field w-full" placeholder="Nom du projet" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-body mb-1">Nom d'équipe *</label>
                              <input type="text" value={newProject.teamName} onChange={(e) => setNewProject((p) => ({ ...p, teamName: e.target.value }))} className="input-field w-full" placeholder="Votre équipe" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-body mb-1">Description</label>
                            <textarea value={newProject.description} onChange={(e) => setNewProject((p) => ({ ...p, description: e.target.value }))} className="input-field w-full h-20 resize-none" placeholder="Technologies, problème résolu..." />
                          </div>
                          <div className="grid sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-body mb-1">Catégorie</label>
                              <select value={newProject.category} onChange={(e) => setNewProject((p) => ({ ...p, category: e.target.value }))} className="input-field w-full">
                                {PROJECT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-body mb-1"><Link2 className="w-3 h-3 inline mr-1" />Lien GitHub *</label>
                              <input type="url" value={newProject.repoUrl} onChange={(e) => setNewProject((p) => ({ ...p, repoUrl: e.target.value }))} className="input-field w-full" placeholder="https://github.com/..." required />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-body mb-1"><Video className="w-3 h-3 inline mr-1" />Vidéo démo *</label>
                              <input type="url" value={newProject.demoUrl} onChange={(e) => setNewProject((p) => ({ ...p, demoUrl: e.target.value }))} className="input-field w-full" placeholder="https://youtube.com/..." required />
                            </div>
                          </div>
                          <div className="flex gap-3 pt-2">
                            <button onClick={() => handleSubmitProject(event.id)} className="btn-primary flex items-center gap-2"><Send className="w-4 h-4" />Soumettre</button>
                            <button onClick={() => setShowSubmitProject(null)} className="btn-secondary">Annuler</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Projects */}
                    <div className="p-6">
                      {eventProjects.length === 0 ? (
                        <div className="text-center py-8">
                          <FileText className="w-12 h-12 text-muted mx-auto mb-3 opacity-30" />
                          <p className="text-body">Aucun projet soumis pour le moment</p>
                          {canSubmit && <p className="text-sm text-muted mt-1">Soyez le premier à soumettre !</p>}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold text-heading uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-amber-400" />
                            Classement des projets ({eventProjects.length})
                          </h3>
                          {eventProjects.map((project, index) => {
                            const hasVoted = project.votes?.includes(user?.uid);
                            const isOwn = project.submittedBy === user?.uid;
                            const categoryInfo = PROJECT_CATEGORIES.find((c) => c.value === project.category);
                            const isWinner = event.finalized && index < (event.prizes?.length || 3);
                            const canUserVote = canVote && !isOwn && (!userVotedProject || hasVoted);
                            const votePoints = (project.voteCount || 0) * 10;

                            return (
                              <div key={project.id} className={`p-4 rounded-xl border transition-all ${isWinner ? index === 0 ? 'border-amber-400/50 bg-gradient-to-r from-amber-500/10 to-transparent shadow-lg shadow-amber-500/5' : index === 1 ? 'border-gray-400/40 bg-gradient-to-r from-gray-400/10 to-transparent' : 'border-orange-500/40 bg-gradient-to-r from-orange-500/10 to-transparent' : 'border-themed bg-black/5 dark:bg-white/5'}`}>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      <span className={`text-sm font-bold ${index === 0 ? 'text-amber-400' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-orange-400' : 'text-muted'}`}>#{index + 1}</span>
                                      {isWinner && index === 0 && <Crown className="w-4 h-4 text-amber-400" />}
                                      {isWinner && index > 0 && <Award className="w-4 h-4 text-amber-500" />}
                                      <span className="font-semibold text-heading">{project.title}</span>
                                      {categoryInfo && <span className={`badge text-xs border ${categoryInfo.color}`}>{categoryInfo.label}</span>}
                                      {isOwn && <span className="badge-primary text-[10px]">Votre projet</span>}
                                    </div>
                                    {project.description && <p className="text-sm text-body mb-2 line-clamp-2">{project.description}</p>}
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{project.teamName}</span>
                                      <div className="flex items-center gap-1">
                                        <div className="flex -space-x-1">
                                          {project.members?.map((m, mi) => (
                                            <span key={mi} className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-[10px] font-bold border border-surface" title={`${m.name} (confirmé)`}>{(m.name || '?')[0].toUpperCase()}</span>
                                          ))}
                                        </div>
                                        {/* Show pending invitations for this project */}
                                        {projectPendingInvites.filter((inv) => inv.projectId === project.id).map((inv, pi) => (
                                          <span key={`pending-${pi}`} className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-bold border border-dashed border-amber-500/50" title={`${inv.invitedName} (en attente)`}>{(inv.invitedName || '?')[0].toUpperCase()}</span>
                                        ))}
                                        <span className="text-[10px] ml-1">({project.members?.length || 0} membre{(project.members?.length || 0) > 1 ? 's' : ''})</span>
                                      </div>
                                      <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary-400 hover:underline" onClick={(e) => e.stopPropagation()}>
                                        <Link2 className="w-3 h-3" />GitHub
                                      </a>
                                      <a href={project.demoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary-400 hover:underline" onClick={(e) => e.stopPropagation()}>
                                        <Video className="w-3 h-3" />Démo
                                      </a>
                                      <span className="flex items-center gap-1 text-amber-400 font-medium"><Zap className="w-3 h-3" />{votePoints} pts</span>
                                      {isWinner && event.prizes?.[index] && (
                                        <span className="flex items-center gap-1 text-green-400 font-medium">
                                          <Trophy className="w-3 h-3" />+{Math.round(event.prizes[index].points / (project.members?.length || 1))}/{project.members?.length || 1} mbr
                                        </span>
                                      )}
                                    </div>
                                    {/* Invite friend */}
                                    {isOwn && status === 'active' && (
                                      <div className="mt-3 p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-themed">
                                        <div className="flex items-center gap-2 mb-2">
                                          <input type="text" value={newProject.inviteEmail} onChange={(e) => setNewProject((p) => ({ ...p, inviteEmail: e.target.value }))} className="input-field text-xs py-1.5 px-3 flex-1" placeholder="Email ou ID (UZA-XXXXXXX)" onClick={(e) => e.stopPropagation()} />
                                          <button onClick={(e) => { e.stopPropagation(); handleInviteFriend(project.id, event.id); }} className="text-xs px-3 py-1.5 rounded-lg bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 border border-primary-500/30 flex items-center gap-1 transition-colors"><UserPlus className="w-3 h-3" />Inviter</button>
                                        </div>
                                        {/* Show pending invites */}
                                        {projectPendingInvites.filter((inv) => inv.projectId === project.id).length > 0 && (
                                          <div className="space-y-1">
                                            {projectPendingInvites.filter((inv) => inv.projectId === project.id).map((inv) => (
                                              <div key={inv.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-amber-500/5 border border-amber-500/20">
                                                <span className="flex items-center gap-1.5 text-amber-400">
                                                  <Clock className="w-3 h-3" />
                                                  {inv.invitedName} ({inv.invitedEmail}) — en attente
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        <p className="text-[10px] text-muted mt-1">💡 Invitation possible via email ou ID utilisateur. Le membre doit accepter.</p>
                                      </div>
                                    )}
                                    {/* Show team info for non-owner members */}
                                    {!isOwn && project.members?.some((m) => m.uid === user?.uid) && (
                                      <div className="mt-2">
                                        <span className="text-xs text-green-400 flex items-center gap-1"><UserCheck className="w-3 h-3" />Vous êtes membre de cette équipe</span>
                                      </div>
                                    )}
                                  </div>
                                  {/* Vote */}
                                  <div className="flex flex-col items-center gap-1 min-w-[48px]">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isOwn) { toast.error('Impossible de voter pour votre projet'); return; }
                                        if (!canVote) { toast.error('Vote fermé'); return; }
                                        if (!canUserVote && !hasVoted) { toast.error('Vous avez déjà voté pour un autre projet'); return; }
                                        handleVote(project.id, event.id, project.votes);
                                      }}
                                      disabled={isOwn || !canVote || (!canUserVote && !hasVoted)}
                                      className={`p-2.5 rounded-xl transition-all ${hasVoted ? 'bg-primary-500/20 text-primary-400 ring-2 ring-primary-500/30' : isOwn || !canUserVote ? 'bg-black/5 dark:bg-white/5 text-muted cursor-not-allowed' : 'bg-black/5 dark:bg-white/5 text-body hover:bg-primary-500/10 hover:text-primary-400'}`}
                                    >
                                      <ThumbsUp className={`w-5 h-5 ${hasVoted ? 'fill-current' : ''}`} />
                                    </button>
                                    <span className={`text-sm font-bold ${hasVoted ? 'text-primary-400' : 'text-body'}`}>{project.voteCount || 0}</span>
                                    <span className="text-[9px] text-muted">vote{(project.voteCount || 0) !== 1 ? 's' : ''}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Prizes */}
                      {event.prizes?.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-themed">
                          <h4 className="text-sm font-semibold text-heading mb-3 flex items-center gap-2"><Award className="w-4 h-4 text-amber-400" />Prix</h4>
                          <div className="flex flex-wrap gap-3">
                            {event.prizes.map((prize, i) => {
                              const winner = event.finalized && eventProjects[i];
                              const memberCount = winner?.members?.length || 1;
                              const prizePoints = normalizePrizePoints(prize);
                              const ptsPerMember = Math.round(prizePoints / memberCount);
                              return (
                                <div key={i} className={`p-3 rounded-xl border text-center min-w-[120px] ${i === 0 ? 'border-amber-500/30 bg-amber-500/5' : i === 1 ? 'border-gray-400/30 bg-gray-400/5' : 'border-orange-500/30 bg-orange-500/5'}`}>
                                  <div className="text-2xl mb-1">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${prize.place}`}</div>
                                  <div className="flex items-center justify-center gap-1 text-amber-400 font-bold text-sm">{(prize.rewardType || 'points') === 'points' ? <Zap className="w-3.5 h-3.5" /> : <Award className="w-3.5 h-3.5" />}{getPrizeDisplay(prize)}</div>
                                  {winner && (
                                    <>
                                      <p className="text-xs text-heading mt-1 font-medium">{winner.teamName}</p>
                                      {(prize.rewardType || 'points') === 'points' && memberCount > 1 && <p className="text-[10px] text-muted mt-0.5">({ptsPerMember} pts/membre)</p>}
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-xs text-muted mt-3">💡 Chaque vote = 10 pts. 1 vote/personne/événement. Les prix sont répartis entre les membres de l'équipe.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
