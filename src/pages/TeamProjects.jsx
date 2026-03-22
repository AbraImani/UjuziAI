import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Users,
  Plus,
  ThumbsUp,
  Loader2,
  Search,
  UserPlus,
  Crown,
  ExternalLink,
  Calendar,
  Tag,
  Link2,
  FileText,
  Trash2,
  X,
  Check,
  Send,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Filter,
} from 'lucide-react';

const PROJECT_CATEGORIES = [
  { value: 'ai-ml', label: 'IA / Machine Learning', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  { value: 'web', label: 'Web Development', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  { value: 'mobile', label: 'Mobile Development', color: 'bg-green-500/10 text-green-400 border-green-500/30' },
  { value: 'cloud', label: 'Cloud / DevOps', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  { value: 'data', label: 'Data Science', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
  { value: 'other', label: 'Autre', color: 'bg-gray-500/10 text-gray-400 border-gray-500/30' },
];

const STATUS_OPTIONS = [
  { value: 'idea', label: 'Idée', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  { value: 'in-progress', label: 'En cours', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  { value: 'completed', label: 'Terminé', color: 'bg-green-500/10 text-green-400 border-green-500/30' },
];

export default function TeamProjects() {
  const { user, userProfile, isAdmin } = useAuth();
  const [projects, setProjects] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitingProjectId, setInvitingProjectId] = useState(null);

  // New project form state
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    category: 'ai-ml',
    repoUrl: '',
    demoUrl: '',
  });

  useEffect(() => {
    fetchProjects();
    fetchInvitations();
  }, [user]);

  async function fetchProjects() {
    try {
      const snap = await getDocs(query(collection(db, 'teamProjects'), orderBy('createdAt', 'desc')));
      const data = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() }));
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchInvitations() {
    if (!user) return;
    try {
      const snap = await getDocs(
        query(collection(db, 'projectInvitations'), where('inviteeEmail', '==', user.email), where('status', '==', 'pending'))
      );
      const data = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() }));
      setInvitations(data);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  }

  async function handleCreateProject(e) {
    e.preventDefault();
    if (!newProject.title.trim() || !newProject.description.trim()) {
      toast.error('Titre et description requis');
      return;
    }

    try {
      const projectId = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await setDoc(doc(db, 'teamProjects', projectId), {
        ...newProject,
        ownerId: user.uid,
        ownerName: userProfile?.displayName || user.displayName || 'Anonymous',
        ownerEmail: user.email,
        members: [
          {
            uid: user.uid,
            name: userProfile?.displayName || user.displayName || 'Anonymous',
            email: user.email,
            role: 'owner',
          },
        ],
        votes: [],
        voteCount: 0,
        status: 'idea',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success('Projet créé !');
      setNewProject({ title: '', description: '', category: 'ai-ml', repoUrl: '', demoUrl: '' });
      setShowCreateForm(false);
      fetchProjects();
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Erreur lors de la création du projet');
    }
  }

  async function handleVote(projectId) {
    try {
      const projectRef = doc(db, 'teamProjects', projectId);
      const projectSnap = await getDoc(projectRef);
      if (!projectSnap.exists()) return;

      const data = projectSnap.data();
      const hasVoted = (data.votes || []).includes(user.uid);

      if (hasVoted) {
        await updateDoc(projectRef, {
          votes: arrayRemove(user.uid),
          voteCount: increment(-1),
        });
      } else {
        await updateDoc(projectRef, {
          votes: arrayUnion(user.uid),
          voteCount: increment(1),
        });
      }
      fetchProjects();
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Erreur lors du vote');
    }
  }

  async function handleInviteMember(projectId) {
    if (!inviteEmail.trim()) return;

    try {
      // Check if user exists
      const usersSnap = await getDocs(query(collection(db, 'users'), where('email', '==', inviteEmail.trim())));
      if (usersSnap.empty) {
        toast.error('Aucun utilisateur trouvé avec cet email');
        return;
      }

      const project = projects.find((p) => p.id === projectId);
      if (project?.members?.some((m) => m.email === inviteEmail.trim())) {
        toast.error('Cet utilisateur est déjà membre');
        return;
      }

      const inviteId = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await setDoc(doc(db, 'projectInvitations', inviteId), {
        projectId,
        projectTitle: project.title,
        inviterName: userProfile?.displayName || user.displayName,
        inviterEmail: user.email,
        inviteeEmail: inviteEmail.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      toast.success('Invitation envoyée !');
      setInviteEmail('');
      setInvitingProjectId(null);
    } catch (error) {
      console.error('Error inviting member:', error);
      toast.error("Erreur lors de l'envoi de l'invitation");
    }
  }

  async function handleInvitationResponse(invitationId, accept) {
    try {
      const invRef = doc(db, 'projectInvitations', invitationId);
      const invSnap = await getDoc(invRef);
      if (!invSnap.exists()) return;

      const invData = invSnap.data();

      if (accept) {
        // Add user to project members
        const projectRef = doc(db, 'teamProjects', invData.projectId);
        await updateDoc(projectRef, {
          members: arrayUnion({
            uid: user.uid,
            name: userProfile?.displayName || user.displayName || 'Anonymous',
            email: user.email,
            role: 'member',
          }),
        });
        toast.success('Vous avez rejoint le projet !');
      }

      await updateDoc(invRef, { status: accept ? 'accepted' : 'declined' });
      fetchInvitations();
      fetchProjects();
    } catch (error) {
      console.error('Error responding to invitation:', error);
      toast.error("Erreur lors de la réponse à l'invitation");
    }
  }

  async function handleDeleteProject(projectId) {
    if (!window.confirm('Supprimer ce projet ? Cette action est irréversible.')) return;
    try {
      await deleteDoc(doc(db, 'teamProjects', projectId));
      toast.success('Projet supprimé');
      fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Erreur lors de la suppression');
    }
  }

  async function handleUpdateStatus(projectId, newStatus) {
    try {
      await updateDoc(doc(db, 'teamProjects', projectId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      fetchProjects();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }

  const filteredProjects = useMemo(() => {
    let result = projects;
    if (filterCategory !== 'all') {
      result = result.filter((p) => p.category === filterCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.ownerName?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [projects, filterCategory, searchQuery]);

  const getCategoryInfo = (value) => PROJECT_CATEGORIES.find((c) => c.value === value) || PROJECT_CATEGORIES[5];
  const getStatusInfo = (value) => STATUS_OPTIONS.find((s) => s.value === value) || STATUS_OPTIONS[0];

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent-500/10 border border-accent-500/20 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-accent-400" />
            <span className="text-sm font-medium text-accent-600 dark:text-accent-300">Collaboration</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-heading flex items-center gap-3">
            <Users className="w-8 h-8 text-accent-400" />
            <span className="gradient-text">Projets d'équipe</span>
          </h1>
          <p className="text-body mt-2">Proposez des projets, invitez des membres et votez pour les meilleures idées</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-primary inline-flex items-center gap-2 self-start"
        >
          <Plus className="w-4 h-4" />
          Nouveau projet
        </button>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="glass-card p-5 mb-6 border-accent-500/30 bg-accent-500/5">
          <h3 className="text-sm font-semibold text-accent-400 mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Invitations en attente ({invitations.length})
          </h3>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-surface rounded-xl border border-themed">
                <div>
                  <p className="text-sm font-medium text-heading">{inv.projectTitle}</p>
                  <p className="text-xs text-muted">Invité par {inv.inviterName}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleInvitationResponse(inv.id, true)}
                    className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleInvitationResponse(inv.id, false)}
                    className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Project Form */}
      {showCreateForm && (
        <div className="glass-card p-6 mb-6 border-primary-500/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-heading">Créer un projet</h3>
            <button onClick={() => setShowCreateForm(false)} className="p-1 text-muted hover:text-heading">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-body mb-1">Titre du projet *</label>
              <input
                type="text"
                value={newProject.title}
                onChange={(e) => setNewProject((p) => ({ ...p, title: e.target.value }))}
                className="input-field w-full"
                placeholder="Ex: Chatbot IA pour l'éducation"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-body mb-1">Description *</label>
              <textarea
                value={newProject.description}
                onChange={(e) => setNewProject((p) => ({ ...p, description: e.target.value }))}
                className="input-field w-full h-24 resize-none"
                placeholder="Décrivez votre projet, ses objectifs et les technologies envisagées..."
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-body mb-1">Catégorie</label>
                <select
                  value={newProject.category}
                  onChange={(e) => setNewProject((p) => ({ ...p, category: e.target.value }))}
                  className="input-field w-full"
                >
                  {PROJECT_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-1">Repo GitHub</label>
                <input
                  type="url"
                  value={newProject.repoUrl}
                  onChange={(e) => setNewProject((p) => ({ ...p, repoUrl: e.target.value }))}
                  className="input-field w-full"
                  placeholder="https://github.com/..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-1">Demo URL</label>
                <input
                  type="url"
                  value={newProject.demoUrl}
                  onChange={(e) => setNewProject((p) => ({ ...p, demoUrl: e.target.value }))}
                  className="input-field w-full"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowCreateForm(false)} className="btn-secondary">
                Annuler
              </button>
              <button type="submit" className="btn-primary inline-flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Créer le projet
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un projet..."
            className="input-field pl-11 w-full"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              filterCategory === 'all'
                ? 'bg-primary-600/20 text-primary-300 border border-primary-500/30'
                : 'text-body hover:text-heading bg-surface border border-themed'
            }`}
          >
            <Filter className="w-3 h-3 inline mr-1" />
            Tous
          </button>
          {PROJECT_CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setFilterCategory(c.value)}
              className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                filterCategory === c.value
                  ? `${c.color} border`
                  : 'text-body hover:text-heading bg-surface border border-themed'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Projects List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary-500 mb-4" />
          <p className="text-body">Chargement des projets...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Users className="w-16 h-16 text-muted mx-auto mb-4" />
          <h3 className="text-xl font-bold text-heading mb-2">
            {projects.length === 0 ? 'Aucun projet pour le moment' : 'Aucun résultat'}
          </h3>
          <p className="text-body max-w-sm mx-auto mb-6">
            {projects.length === 0
              ? 'Soyez le premier à créer un projet et inviter votre équipe !'
              : 'Essayez de modifier vos critères de recherche'}
          </p>
          {projects.length === 0 && (
            <button onClick={() => setShowCreateForm(true)} className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Créer le premier projet
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map((project) => {
            const hasVoted = (project.votes || []).includes(user?.uid);
            const isOwner = project.ownerId === user?.uid;
            const isMember = project.members?.some((m) => m.uid === user?.uid);
            const categoryInfo = getCategoryInfo(project.category);
            const statusInfo = getStatusInfo(project.status);

            return (
              <div key={project.id} className="glass-card p-6 hover:shadow-lg transition-all">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Vote Column */}
                  <div className="flex sm:flex-col items-center gap-2 sm:pt-1">
                    <button
                      onClick={() => handleVote(project.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        hasVoted
                          ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                          : 'bg-surface text-muted border border-themed hover:text-primary-400 hover:border-primary-500/30'
                      }`}
                    >
                      <ThumbsUp className={`w-4 h-4 ${hasVoted ? 'fill-current' : ''}`} />
                      <span>{project.voteCount || 0}</span>
                    </button>
                    <TrendingUp className="w-3 h-3 text-muted hidden sm:block" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-heading">{project.title}</h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        {(isOwner || isAdmin) && (
                          <button
                            onClick={() => handleDeleteProject(project.id)}
                            className="p-1 text-muted hover:text-red-400 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-body text-sm mb-3 line-clamp-2">{project.description}</p>

                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${categoryInfo.color}`}>
                        <Tag className="w-3 h-3 mr-1" />
                        {categoryInfo.label}
                      </span>
                      {project.repoUrl && (
                        <a
                          href={project.repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-muted hover:text-heading bg-surface border border-themed"
                        >
                          <Link2 className="w-3 h-3" />
                          GitHub
                        </a>
                      )}
                      {project.demoUrl && (
                        <a
                          href={project.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-muted hover:text-heading bg-surface border border-themed"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Demo
                        </a>
                      )}
                    </div>

                    {/* Members */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs text-muted">Équipe :</span>
                      <div className="flex -space-x-2">
                        {(project.members || []).slice(0, 5).map((m, i) => (
                          <div
                            key={i}
                            className="w-7 h-7 rounded-full bg-primary-600/20 border-2 border-card flex items-center justify-center text-[10px] font-bold text-primary-300"
                            title={m.name}
                          >
                            {m.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                        ))}
                        {(project.members || []).length > 5 && (
                          <div className="w-7 h-7 rounded-full bg-surface border-2 border-card flex items-center justify-center text-[10px] font-bold text-muted">
                            +{project.members.length - 5}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted">
                        {(project.members || []).length} membre{(project.members || []).length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      {isOwner && (
                        <>
                          {invitingProjectId === project.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="Email du membre..."
                                className="input-field text-xs py-1.5 px-3 w-48"
                              />
                              <button
                                onClick={() => handleInviteMember(project.id)}
                                className="p-1.5 rounded-lg bg-accent-500/10 text-accent-400 hover:bg-accent-500/20"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => { setInvitingProjectId(null); setInviteEmail(''); }}
                                className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setInvitingProjectId(project.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-500/10 text-accent-400 hover:bg-accent-500/20 text-xs font-medium transition-colors"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Inviter
                            </button>
                          )}
                          <select
                            value={project.status}
                            onChange={(e) => handleUpdateStatus(project.id, e.target.value)}
                            className="text-xs px-2 py-1.5 rounded-lg border border-themed bg-card text-body cursor-pointer focus:outline-none"
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                        </>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-muted ml-auto">
                        <Crown className="w-3 h-3" />
                        {project.ownerName}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
