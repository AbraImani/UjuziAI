import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../hooks/useFirestore';
import toast from 'react-hot-toast';
import {
  Trophy,
  Plus,
  ThumbsUp,
  Loader2,
  Search,
  Crown,
  ExternalLink,
  Calendar,
  Tag,
  Link2,
  FileText,
  X,
  Send,
  Sparkles,
  TrendingUp,
  Filter,
  Clock,
  Users,
  Zap,
  Award,
  Play,
  CheckCircle,
  Timer,
  ChevronDown,
  ChevronUp,
  Globe,
} from 'lucide-react';

const PROJECT_CATEGORIES = [
  { value: 'ai-ml', label: 'IA / Machine Learning', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  { value: 'web', label: 'Web Development', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  { value: 'mobile', label: 'Mobile Development', color: 'bg-green-500/10 text-green-400 border-green-500/30' },
  { value: 'cloud', label: 'Cloud / DevOps', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  { value: 'data', label: 'Data Science', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
  { value: 'other', label: 'Autre', color: 'bg-gray-500/10 text-gray-400 border-gray-500/30' },
];

function getBuildathonStatus(b) {
  const now = new Date();
  if (b.status === 'completed') return 'completed';
  if (b.startDate && new Date(b.startDate) > now) return 'upcoming';
  if (b.endDate && new Date(b.endDate) < now) return 'voting';
  return 'active';
}

const STATUS_LABELS = {
  upcoming: { label: 'À venir', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  active: { label: 'En cours', color: 'bg-green-500/10 text-green-400 border-green-500/30' },
  voting: { label: 'Vote en cours', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  completed: { label: 'Terminé', color: 'bg-gray-500/10 text-gray-400 border-gray-500/30' },
};

export default function Buildathon() {
  const { user, userProfile, isAdmin } = useAuth();
  const { addBonusPoints } = useAdmin();
  const [buildathons, setBuildathons] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateBuildathon, setShowCreateBuildathon] = useState(false);
  const [showSubmitProject, setShowSubmitProject] = useState(null); // buildathonId or null
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBuildathon, setExpandedBuildathon] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  // Buildathon creation form
  const [newBuildathon, setNewBuildathon] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    workDuration: '',
    prizes: [
      { place: 1, points: 50 },
      { place: 2, points: 30 },
      { place: 3, points: 10 },
    ],
  });

  // Project submission form
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    category: 'ai-ml',
    teamName: '',
    repoUrl: '',
    demoUrl: '',
  });

  useEffect(() => {
    // Real-time listener for buildathons
    const unsubBuildathons = onSnapshot(
      query(collection(db, 'buildathons'), orderBy('createdAt', 'desc')),
      (snap) => {
        const data = [];
        snap.forEach((d) => data.push({ id: d.id, ...d.data() }));
        setBuildathons(data);
      },
      (err) => console.error('Buildathons error:', err),
    );

    // Real-time listener for projects
    const unsubProjects = onSnapshot(
      query(collection(db, 'buildathonProjects'), orderBy('voteCount', 'desc')),
      (snap) => {
        const data = [];
        snap.forEach((d) => data.push({ id: d.id, ...d.data() }));
        setProjects(data);
        setLoading(false);
      },
      (err) => {
        console.error('Projects error:', err);
        setLoading(false);
      },
    );

    return () => {
      unsubBuildathons();
      unsubProjects();
    };
  }, []);

  // ---- Admin: Create Buildathon ----
  async function handleCreateBuildathon(e) {
    e.preventDefault();
    if (!newBuildathon.title || !newBuildathon.startDate || !newBuildathon.endDate) {
      toast.error('Veuillez remplir le titre et les dates');
      return;
    }
    try {
      const id = `buildathon-${Date.now().toString(36)}`;
      await setDoc(doc(db, 'buildathons', id), {
        ...newBuildathon,
        prizes: newBuildathon.prizes.filter((p) => p.points > 0),
        status: 'active',
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        finalized: false,
      });
      toast.success('Buildathon créé !');
      setShowCreateBuildathon(false);
      setNewBuildathon({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        workDuration: '',
        prizes: [
          { place: 1, points: 50 },
          { place: 2, points: 30 },
          { place: 3, points: 10 },
        ],
      });
    } catch (err) {
      toast.error('Erreur: ' + err.message);
    }
  }

  // ---- User: Submit Project ----
  async function handleSubmitProject(buildathonId) {
    if (!newProject.title || !newProject.teamName) {
      toast.error('Veuillez remplir le titre et le nom d\'équipe');
      return;
    }
    try {
      const id = `project-${Date.now().toString(36)}-${user.uid.slice(0, 6)}`;
      await setDoc(doc(db, 'buildathonProjects', id), {
        buildathonId,
        title: newProject.title,
        description: newProject.description,
        category: newProject.category,
        teamName: newProject.teamName,
        repoUrl: newProject.repoUrl,
        demoUrl: newProject.demoUrl,
        members: [
          {
            uid: user.uid,
            name: userProfile?.displayName || user.email,
            email: user.email,
          },
        ],
        votes: [],
        voteCount: 0,
        submittedBy: user.uid,
        submittedAt: serverTimestamp(),
      });
      toast.success('Projet soumis avec succès !');
      setShowSubmitProject(null);
      setNewProject({
        title: '',
        description: '',
        category: 'ai-ml',
        teamName: '',
        repoUrl: '',
        demoUrl: '',
      });
    } catch (err) {
      toast.error('Erreur: ' + err.message);
    }
  }

  // ---- User: Vote ----
  async function handleVote(projectId, currentVotes) {
    if (!user) return;
    const hasVoted = currentVotes?.includes(user.uid);
    try {
      const projRef = doc(db, 'buildathonProjects', projectId);
      if (hasVoted) {
        await updateDoc(projRef, {
          votes: arrayRemove(user.uid),
          voteCount: increment(-1),
        });
        toast.success('Vote retiré');
      } else {
        await updateDoc(projRef, {
          votes: arrayUnion(user.uid),
          voteCount: increment(1),
        });
        toast.success('Vote enregistré !');
      }
    } catch (err) {
      toast.error('Erreur de vote: ' + err.message);
    }
  }

  // ---- Admin: Finalize Buildathon (award bonus points to top N) ----
  async function handleFinalize(buildathonId) {
    const buildathon = buildathons.find((b) => b.id === buildathonId);
    if (!buildathon) return;

    const buildathonProjects = projects
      .filter((p) => p.buildathonId === buildathonId)
      .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));

    if (buildathonProjects.length === 0) {
      toast.error('Aucun projet soumis pour ce buildathon');
      return;
    }

    const prizes = (buildathon.prizes || []).sort((a, b) => a.place - b.place);

    try {
      // Award bonus points to top N teams
      for (let i = 0; i < Math.min(prizes.length, buildathonProjects.length); i++) {
        const project = buildathonProjects[i];
        const prize = prizes[i];
        // Award to all team members
        for (const member of project.members || []) {
          if (member.uid) {
            await addBonusPoints(
              member.uid,
              prize.points,
              `Buildathon "${buildathon.title}" - Place ${prize.place}`,
            );
          }
        }
      }

      // Mark buildathon as completed
      await updateDoc(doc(db, 'buildathons', buildathonId), {
        status: 'completed',
        finalized: true,
        finalizedAt: serverTimestamp(),
        finalizedBy: user.uid,
      });

      toast.success('Buildathon finalisé ! Points bonus attribués aux gagnants.');
    } catch (err) {
      toast.error('Erreur de finalisation: ' + err.message);
    }
  }

  // Filtered buildathons
  const filteredBuildathons = useMemo(() => {
    return buildathons.filter((b) => {
      const status = getBuildathonStatus(b);
      if (filterStatus !== 'all' && status !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          b.title?.toLowerCase().includes(q) ||
          b.description?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [buildathons, filterStatus, searchQuery]);

  // Countdown timer component
  function CountdownTimer({ endDate }) {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
      function update() {
        const now = new Date();
        const end = new Date(endDate);
        const diff = end - now;
        if (diff <= 0) {
          setTimeLeft('Terminé');
          return;
        }
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        setTimeLeft(`${days}j ${hours}h ${minutes}m`);
      }
      update();
      const interval = setInterval(update, 60000);
      return () => clearInterval(interval);
    }, [endDate]);

    return (
      <span className="flex items-center gap-1 text-sm">
        <Timer className="w-3.5 h-3.5" />
        {timeLeft}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Trophy className="w-8 h-8 text-amber-400" />
          <div>
            <h1 className="section-title">Buildathon</h1>
            <p className="section-subtitle">Compétitions de projets — soumettez, votez, gagnez !</p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowCreateBuildathon(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Créer un Buildathon
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un buildathon..."
            className="input-field pl-11 w-full"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {[
            { value: 'all', label: 'Tous' },
            { value: 'active', label: 'En cours' },
            { value: 'upcoming', label: 'À venir' },
            { value: 'voting', label: 'Vote' },
            { value: 'completed', label: 'Terminé' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilterStatus(value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                filterStatus === value
                  ? 'bg-primary-600/20 text-primary-300 border border-primary-500/30'
                  : 'text-body hover:text-heading hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Admin: Create Buildathon Modal */}
      {showCreateBuildathon && isAdmin && (
        <div className="glass-card p-8 mb-6 border-2 border-primary-500/30">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-heading flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-400" />
              Nouveau Buildathon
            </h2>
            <button onClick={() => setShowCreateBuildathon(false)} className="text-muted hover:text-heading">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleCreateBuildathon} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-body mb-1">Titre *</label>
              <input
                type="text"
                value={newBuildathon.title}
                onChange={(e) => setNewBuildathon((p) => ({ ...p, title: e.target.value }))}
                className="input-field w-full"
                placeholder="Ex: Buildathon IA Décembre 2024"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-1">Description</label>
              <textarea
                value={newBuildathon.description}
                onChange={(e) => setNewBuildathon((p) => ({ ...p, description: e.target.value }))}
                className="input-field w-full h-24 resize-none"
                placeholder="Décrivez le thème, les règles et les objectifs..."
              />
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-body mb-1">Date de début *</label>
                <input
                  type="date"
                  value={newBuildathon.startDate}
                  onChange={(e) => setNewBuildathon((p) => ({ ...p, startDate: e.target.value }))}
                  className="input-field w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-1">Date de fin *</label>
                <input
                  type="date"
                  value={newBuildathon.endDate}
                  onChange={(e) => setNewBuildathon((p) => ({ ...p, endDate: e.target.value }))}
                  className="input-field w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-1">Durée de travail</label>
                <input
                  type="text"
                  value={newBuildathon.workDuration}
                  onChange={(e) => setNewBuildathon((p) => ({ ...p, workDuration: e.target.value }))}
                  className="input-field w-full"
                  placeholder="Ex: 48h, 1 semaine"
                />
              </div>
            </div>

            {/* Prizes */}
            <div>
              <label className="block text-sm font-medium text-body mb-2">Prix (points bonus)</label>
              <div className="space-y-2">
                {newBuildathon.prizes.map((prize, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm text-body w-20">Place {prize.place} :</span>
                    <input
                      type="number"
                      min="0"
                      value={prize.points}
                      onChange={(e) => {
                        const updated = [...newBuildathon.prizes];
                        updated[i] = { ...updated[i], points: Number(e.target.value) };
                        setNewBuildathon((p) => ({ ...p, prizes: updated }));
                      }}
                      className="input-field w-24"
                    />
                    <span className="text-xs text-muted">pts</span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setNewBuildathon((p) => ({
                      ...p,
                      prizes: [...p.prizes, { place: p.prizes.length + 1, points: 5 }],
                    }))
                  }
                  className="text-sm text-primary-400 hover:text-primary-300"
                >
                  + Ajouter un prix
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Créer le Buildathon
              </button>
              <button
                type="button"
                onClick={() => setShowCreateBuildathon(false)}
                className="btn-secondary"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Buildathons list */}
      {filteredBuildathons.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Trophy className="w-16 h-16 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-body mb-2">
            {searchQuery || filterStatus !== 'all'
              ? 'Aucun buildathon trouvé'
              : 'Aucun buildathon pour le moment'}
          </h3>
          <p className="text-muted">
            {isAdmin
              ? 'Créez le premier buildathon pour lancer la compétition !'
              : 'Les buildathons seront bientôt disponibles.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredBuildathons.map((buildathon) => {
            const status = getBuildathonStatus(buildathon);
            const statusInfo = STATUS_LABELS[status];
            const buildathonProjects = projects
              .filter((p) => p.buildathonId === buildathon.id)
              .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
            const isExpanded = expandedBuildathon === buildathon.id;
            const userHasSubmitted = buildathonProjects.some(
              (p) => p.submittedBy === user?.uid,
            );
            const canSubmit = status === 'active' && !userHasSubmitted;
            const canVote = status === 'active' || status === 'voting';

            return (
              <div key={buildathon.id} className="glass-card overflow-hidden">
                {/* Buildathon Header */}
                <div
                  className="p-6 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  onClick={() =>
                    setExpandedBuildathon(isExpanded ? null : buildathon.id)
                  }
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h2 className="text-xl font-bold text-heading">
                          {buildathon.title}
                        </h2>
                        <span
                          className={`badge border ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>

                      {buildathon.description && (
                        <p className="text-body text-sm mb-3 line-clamp-2">
                          {buildathon.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {buildathon.startDate} → {buildathon.endDate}
                        </span>
                        {buildathon.workDuration && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {buildathon.workDuration}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          {buildathonProjects.length} projet{buildathonProjects.length !== 1 ? 's' : ''}
                        </span>
                        {status !== 'completed' && buildathon.endDate && (
                          <span className="text-amber-400">
                            <CountdownTimer endDate={buildathon.endDate} />
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Prizes preview */}
                      {buildathon.prizes?.length > 0 && (
                        <div className="hidden sm:flex items-center gap-1.5">
                          {buildathon.prizes.slice(0, 3).map((p, i) => (
                            <span
                              key={i}
                              className="flex items-center gap-0.5 badge bg-amber-500/10 text-amber-400 border-amber-500/30"
                            >
                              <Zap className="w-3 h-3" />
                              {p.points}
                            </span>
                          ))}
                        </div>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-themed">
                    {/* Actions bar */}
                    <div className="px-6 py-3 bg-black/5 dark:bg-white/5 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        {canSubmit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowSubmitProject(buildathon.id);
                            }}
                            className="btn-primary text-sm flex items-center gap-1"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Soumettre un projet
                          </button>
                        )}
                        {userHasSubmitted && (
                          <span className="text-xs text-accent-400 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Projet soumis
                          </span>
                        )}
                      </div>

                      {isAdmin && !buildathon.finalized && (status === 'voting' || status === 'active') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Finaliser ce buildathon et attribuer les points bonus aux gagnants ?')) {
                              handleFinalize(buildathon.id);
                            }
                          }}
                          className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
                        >
                          <Award className="w-3.5 h-3.5" />
                          Finaliser & Attribuer les prix
                        </button>
                      )}
                      {buildathon.finalized && (
                        <span className="text-xs text-green-400 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Finalisé — Points attribués
                        </span>
                      )}
                    </div>

                    {/* Project Submission Form */}
                    {showSubmitProject === buildathon.id && (
                      <div className="p-6 border-t border-themed bg-primary-500/5">
                        <h3 className="text-lg font-semibold text-heading mb-4 flex items-center gap-2">
                          <Send className="w-5 h-5 text-primary-400" />
                          Soumettre votre projet
                        </h3>
                        <div className="space-y-3">
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-body mb-1">
                                Titre du projet *
                              </label>
                              <input
                                type="text"
                                value={newProject.title}
                                onChange={(e) =>
                                  setNewProject((p) => ({ ...p, title: e.target.value }))
                                }
                                className="input-field w-full"
                                placeholder="Nom de votre projet"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-body mb-1">
                                Nom d'équipe *
                              </label>
                              <input
                                type="text"
                                value={newProject.teamName}
                                onChange={(e) =>
                                  setNewProject((p) => ({ ...p, teamName: e.target.value }))
                                }
                                className="input-field w-full"
                                placeholder="Nom de votre équipe"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-body mb-1">
                              Description
                            </label>
                            <textarea
                              value={newProject.description}
                              onChange={(e) =>
                                setNewProject((p) => ({ ...p, description: e.target.value }))
                              }
                              className="input-field w-full h-20 resize-none"
                              placeholder="Décrivez votre projet, les technologies utilisées..."
                            />
                          </div>

                          <div className="grid sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-body mb-1">
                                Catégorie
                              </label>
                              <select
                                value={newProject.category}
                                onChange={(e) =>
                                  setNewProject((p) => ({ ...p, category: e.target.value }))
                                }
                                className="input-field w-full"
                              >
                                {PROJECT_CATEGORIES.map((c) => (
                                  <option key={c.value} value={c.value}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-body mb-1">
                                Repo URL
                              </label>
                              <input
                                type="url"
                                value={newProject.repoUrl}
                                onChange={(e) =>
                                  setNewProject((p) => ({ ...p, repoUrl: e.target.value }))
                                }
                                className="input-field w-full"
                                placeholder="https://github.com/..."
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-body mb-1">
                                Demo URL
                              </label>
                              <input
                                type="url"
                                value={newProject.demoUrl}
                                onChange={(e) =>
                                  setNewProject((p) => ({ ...p, demoUrl: e.target.value }))
                                }
                                className="input-field w-full"
                                placeholder="https://..."
                              />
                            </div>
                          </div>

                          <div className="flex gap-3 pt-2">
                            <button
                              onClick={() => handleSubmitProject(buildathon.id)}
                              className="btn-primary flex items-center gap-2"
                            >
                              <Send className="w-4 h-4" />
                              Soumettre
                            </button>
                            <button
                              onClick={() => setShowSubmitProject(null)}
                              className="btn-secondary"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Projects List */}
                    <div className="p-6">
                      {buildathonProjects.length === 0 ? (
                        <div className="text-center py-8">
                          <FileText className="w-12 h-12 text-muted mx-auto mb-3" />
                          <p className="text-body">Aucun projet soumis pour le moment</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold text-heading uppercase tracking-wider mb-3">
                            Projets ({buildathonProjects.length})
                          </h3>
                          {buildathonProjects.map((project, index) => {
                            const hasVoted = project.votes?.includes(user?.uid);
                            const isOwn = project.submittedBy === user?.uid;
                            const categoryInfo = PROJECT_CATEGORIES.find(
                              (c) => c.value === project.category,
                            );
                            const isWinner =
                              buildathon.finalized &&
                              index < (buildathon.prizes?.length || 3);

                            return (
                              <div
                                key={project.id}
                                className={`p-4 rounded-xl border transition-all ${
                                  isWinner
                                    ? 'border-amber-500/30 bg-amber-500/5'
                                    : 'border-themed bg-black/5 dark:bg-white/5'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      {isWinner && (
                                        <span className="text-amber-400">
                                          {index === 0 ? (
                                            <Crown className="w-5 h-5" />
                                          ) : (
                                            <Award className="w-4 h-4" />
                                          )}
                                        </span>
                                      )}
                                      <span className="font-semibold text-heading">
                                        {project.title}
                                      </span>
                                      {categoryInfo && (
                                        <span
                                          className={`badge text-xs border ${categoryInfo.color}`}
                                        >
                                          {categoryInfo.label}
                                        </span>
                                      )}
                                    </div>

                                    {project.description && (
                                      <p className="text-sm text-body mb-2 line-clamp-2">
                                        {project.description}
                                      </p>
                                    )}

                                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                                      <span className="flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        {project.teamName}
                                      </span>
                                      {/* Member initials */}
                                      <div className="flex -space-x-1">
                                        {project.members?.map((m, mi) => (
                                          <span
                                            key={mi}
                                            className="w-5 h-5 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-[10px] font-bold border border-surface"
                                            title={m.name || m.email}
                                          >
                                            {(m.name || m.email || '?')[0].toUpperCase()}
                                          </span>
                                        ))}
                                      </div>
                                      {project.repoUrl && (
                                        <a
                                          href={project.repoUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1 text-primary-400 hover:underline"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Link2 className="w-3 h-3" />
                                          Repo
                                        </a>
                                      )}
                                      {project.demoUrl && (
                                        <a
                                          href={project.demoUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1 text-primary-400 hover:underline"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Globe className="w-3 h-3" />
                                          Demo
                                        </a>
                                      )}
                                      {isWinner && buildathon.prizes?.[index] && (
                                        <span className="flex items-center gap-1 text-amber-400 font-medium">
                                          <Zap className="w-3 h-3" />
                                          +{buildathon.prizes[index].points} pts
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Vote button */}
                                  <div className="flex flex-col items-center gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isOwn) {
                                          toast.error('Vous ne pouvez pas voter pour votre propre projet');
                                          return;
                                        }
                                        if (!canVote) {
                                          toast.error('Le vote n\'est plus disponible');
                                          return;
                                        }
                                        handleVote(project.id, project.votes);
                                      }}
                                      disabled={isOwn || !canVote}
                                      className={`p-2 rounded-lg transition-all ${
                                        hasVoted
                                          ? 'bg-primary-500/20 text-primary-400'
                                          : isOwn || !canVote
                                            ? 'bg-black/5 dark:bg-white/5 text-muted cursor-not-allowed'
                                            : 'bg-black/5 dark:bg-white/5 text-body hover:bg-primary-500/10 hover:text-primary-400'
                                      }`}
                                    >
                                      <ThumbsUp className={`w-4 h-4 ${hasVoted ? 'fill-current' : ''}`} />
                                    </button>
                                    <span className={`text-sm font-bold ${hasVoted ? 'text-primary-400' : 'text-body'}`}>
                                      {project.voteCount || 0}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Prizes section */}
                      {buildathon.prizes?.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-themed">
                          <h4 className="text-sm font-semibold text-heading mb-3 flex items-center gap-2">
                            <Award className="w-4 h-4 text-amber-400" />
                            Prix
                          </h4>
                          <div className="flex flex-wrap gap-3">
                            {buildathon.prizes.map((prize, i) => {
                              const winner =
                                buildathon.finalized && buildathonProjects[i];
                              return (
                                <div
                                  key={i}
                                  className={`p-3 rounded-xl border text-center min-w-[120px] ${
                                    i === 0
                                      ? 'border-amber-500/30 bg-amber-500/5'
                                      : i === 1
                                        ? 'border-gray-400/30 bg-gray-500/5'
                                        : 'border-orange-500/30 bg-orange-500/5'
                                  }`}
                                >
                                  <div className="text-2xl mb-1">
                                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${prize.place}`}
                                  </div>
                                  <div className="flex items-center justify-center gap-1 text-amber-400 font-bold text-sm">
                                    <Zap className="w-3.5 h-3.5" />
                                    {prize.points} pts
                                  </div>
                                  {winner && (
                                    <p className="text-xs text-heading mt-1 font-medium">
                                      {winner.teamName}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
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
