import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAdmin } from '../hooks/useFirestore';
import { MODULES, TRACKS, EXAM_CONFIG } from '../config/modules';
import { getModuleIcon } from '../config/icons';
import {
  Shield,
  Users,
  BookOpen,
  Settings,
  CheckCircle,
  XCircle,
  Unlock,
  ToggleLeft,
  ToggleRight,
  Search,
  RefreshCw,
  Loader2,
  FileText,
  AlertTriangle,
  Edit3,
  Save,
  Calendar,
  ChevronUp,
  UserCog,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Community roles available for assignment
const COMMUNITY_ROLES = [
  { value: '', label: '— Aucun rôle —' },
  { value: 'Organizer', label: 'Organizer' },
  { value: 'Lead Track', label: 'Lead Track' },
  { value: 'Mentor', label: 'Mentor' },
  { value: 'GDG On Campus UCB Member', label: 'GDG On Campus UCB Member' },
];

const ROLE_BADGE_COLORS = {
  Organizer: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  'Lead Track': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  Mentor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'GDG On Campus UCB Member': 'bg-green-500/10 text-green-400 border-green-500/30',
};

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('submissions');
  const [users, setUsers] = useState([]);
  const [moduleSettings, setModuleSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingModule, setEditingModule] = useState(null);
  const [examSettings, setExamSettings] = useState({ ...EXAM_CONFIG });
  const [savingSettings, setSavingSettings] = useState(false);

  const {
    validateSubmission,
    toggleModuleLock,
    overrideExamLock,
    updateUserRole,
    saveModuleSettings,
    saveExamSettings,
    getExamSettings,
  } = useAdmin();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch all users with their progress
      const usersSnap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
      const usersData = [];

      for (const userDoc of usersSnap.docs) {
        const userData = { id: userDoc.id, ...userDoc.data() };

        // Fetch progress for each user
        const progressSnap = await getDocs(collection(db, 'users', userDoc.id, 'progress'));
        userData.progress = {};
        progressSnap.forEach((p) => {
          userData.progress[p.id] = p.data();
        });

        usersData.push(userData);
      }

      setUsers(usersData);

      // Fetch module settings
      const settingsSnap = await getDocs(collection(db, 'moduleSettings'));
      const settings = {};
      settingsSnap.forEach((s) => {
        settings[s.id] = s.data();
      });
      setModuleSettings(settings);

      // Fetch exam settings from Firestore (overrides defaults)
      const saved = await getExamSettings();
      if (saved) {
        setExamSettings((prev) => ({ ...prev, ...saved }));
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Échec du chargement des données admin');
    } finally {
      setLoading(false);
    }
  }

  const handleValidate = async (userId, moduleId, approved) => {
    try {
      await validateSubmission(userId, moduleId, approved);
      toast.success(approved ? 'Soumission approuvée' : 'Soumission rejetée');
      fetchData();
    } catch (err) {
      toast.error('Échec de la mise à jour de la soumission');
    }
  };

  const handleToggleModule = async (moduleId) => {
    const currentlyOpen = moduleSettings[moduleId]?.isOpen !== false;
    try {
      await toggleModuleLock(moduleId, !currentlyOpen);
      toast.success(`Module ${!currentlyOpen ? 'ouvert' : 'fermé'}`);
      setModuleSettings((prev) => ({
        ...prev,
        [moduleId]: { ...prev[moduleId], isOpen: !currentlyOpen },
      }));
    } catch (err) {
      toast.error('Échec du basculement du module');
    }
  };

  const handleOverrideExamLock = async (userId, moduleId) => {
    try {
      await overrideExamLock(userId, moduleId);
      toast.success('Verrouillage de l\'examen annulé');
      fetchData();
    } catch (err) {
      toast.error('Échec de l\'annulation du verrouillage');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole);
      toast.success('Rôle communautaire mis à jour');
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, communityRole: newRole } : u))
      );
    } catch (err) {
      toast.error('Échec de la mise à jour du rôle');
    }
  };

  const handleSaveModuleSchedule = async (moduleId, openDate, closeDate) => {
    try {
      await saveModuleSettings(moduleId, { openDate, closeDate });
      toast.success('Dates de planification enregistrées');
      setModuleSettings((prev) => ({
        ...prev,
        [moduleId]: { ...prev[moduleId], openDate, closeDate },
      }));
      setEditingModule(null);
    } catch (err) {
      toast.error('Échec de l\'enregistrement');
    }
  };

  const handleSaveExamSettings = async () => {
    setSavingSettings(true);
    try {
      await saveExamSettings({
        MCQ_COUNT: parseInt(examSettings.MCQ_COUNT) || 7,
        OPEN_COUNT: parseInt(examSettings.OPEN_COUNT) || 3,
        MCQ_TIME_SECONDS: parseInt(examSettings.MCQ_TIME_SECONDS) || 30,
        OPEN_TIME_SECONDS: parseInt(examSettings.OPEN_TIME_SECONDS) || 300,
        MAX_ATTEMPTS: parseInt(examSettings.MAX_ATTEMPTS) || 2,
        PASSING_SCORE: parseInt(examSettings.PASSING_SCORE) || 6,
        MAX_SCORE: parseInt(examSettings.MAX_SCORE) || 10,
      });
      toast.success('Paramètres d\'examen enregistrés');
    } catch (err) {
      toast.error('Échec de l\'enregistrement des paramètres');
    } finally {
      setSavingSettings(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tabs = [
    { id: 'submissions', label: 'Soumissions', icon: FileText },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'modules', label: 'Modules', icon: BookOpen },
    { id: 'settings', label: 'Paramètres', icon: Settings },
  ];

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-8 h-8 text-primary-400" />
        <div>
          <h1 className="section-title">Panneau d'administration</h1>
          <p className="section-subtitle">Gérez les soumissions, utilisateurs, modules et paramètres</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === id
                ? 'bg-primary-600/20 text-primary-300 border border-primary-500/30'
                : 'text-body hover:text-heading hover:bg-black/5 dark:bg-white/5'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      {(activeTab === 'submissions' || activeTab === 'users') && (
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher des utilisateurs..."
            className="input-field pl-11"
          />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : (
        <>
          {/* Submissions Tab */}
          {activeTab === 'submissions' && (
            <div className="space-y-4">
              {filteredUsers.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <FileText className="w-16 h-16 text-muted mx-auto mb-4" />
                  <p className="text-body">Aucune soumission trouvée</p>
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const hasProgress = Object.keys(u.progress || {}).length > 0;
                  if (!hasProgress) return null;

                  return (
                    <div key={u.id} className="glass-card p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-primary-600/20 rounded-full flex items-center justify-center text-primary-300 font-bold">
                          {u.displayName?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-medium text-heading">{u.displayName}</p>
                          <p className="text-xs text-muted">{u.email}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {Object.entries(u.progress || {}).map(([modId, prog]) => {
                          const mod = MODULES.find((m) => m.id === modId);
                          if (!mod || !prog.submitted) return null;

                          return (
                            <div
                              key={modId}
                              className="flex items-center justify-between p-3 bg-black/5 dark:bg-white/5 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                {(() => { const Icon = getModuleIcon(mod.iconName); return <div className="w-8 h-8 rounded-lg bg-primary-500/15 text-primary-400 flex items-center justify-center"><Icon className="w-4 h-4" /></div>; })()}
                                <div>
                                  <p className="text-sm font-medium text-heading">{mod.title}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted">
                                    <span>Tentatives : {prog.examAttempts || 0}</span>
                                    {prog.examScore !== null && <span>Score : {prog.examScore}/10</span>}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {prog.validated ? (
                                  <span className="badge-accent text-xs">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Validé
                                  </span>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleValidate(u.id, modId, true)}
                                      className="p-2 rounded-lg bg-accent-500/10 text-accent-400 hover:bg-accent-500/20 transition-colors"
                                      title="Approuver"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleValidate(u.id, modId, false)}
                                      className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                      title="Rejeter"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  </>
                                )}

                                {prog.examLocked && (
                                  <button
                                    onClick={() => handleOverrideExamLock(u.id, modId)}
                                    className="p-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                                    title="Annuler le verrouillage"
                                  >
                                    <Unlock className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Users Tab — with community role management */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="glass-card p-4 bg-primary-500/5 border border-primary-500/20 rounded-xl">
                <div className="flex items-center gap-2 text-primary-400 text-sm">
                  <UserCog className="w-4 h-4" />
                  <span className="font-medium">
                    Assignez des rôles communautaires : Organizer, Lead Track, Mentor, GDG On Campus UCB Member
                  </span>
                </div>
              </div>

              <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-themed">
                        <th className="text-left p-4 text-body font-medium">Utilisateur</th>
                        <th className="text-left p-4 text-body font-medium">Rôle système</th>
                        <th className="text-left p-4 text-body font-medium">Rôle communautaire</th>
                        <th className="text-center p-4 text-body font-medium">Modules</th>
                        <th className="text-center p-4 text-body font-medium">Score</th>
                        <th className="text-center p-4 text-body font-medium">Inscription</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="border-b border-themed hover:bg-black/5 dark:hover:bg-white/5">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {u.photoURL ? (
                                <img src={u.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-8 h-8 bg-primary-600/20 rounded-full flex items-center justify-center text-xs font-bold text-primary-300">
                                  {u.displayName?.[0]?.toUpperCase() || 'U'}
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-heading">{u.displayName}</p>
                                <p className="text-xs text-muted">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={u.role === 'admin' ? 'badge-primary' : 'badge bg-gray-200 dark:bg-neutral-700 text-body'}>
                              {u.role === 'admin' ? 'Admin' : 'Apprenant'}
                            </span>
                          </td>
                          <td className="p-4">
                            <select
                              value={u.communityRole || ''}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="text-xs px-3 py-1.5 rounded-lg border border-themed bg-card text-body cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                            >
                              {COMMUNITY_ROLES.map((r) => (
                                <option key={r.value} value={r.value}>
                                  {r.label}
                                </option>
                              ))}
                            </select>
                            {u.communityRole && (
                              <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${ROLE_BADGE_COLORS[u.communityRole] || 'bg-gray-500/10 text-gray-400'}`}>
                                {u.communityRole}
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center text-body">
                            {Object.keys(u.progress || {}).length}
                          </td>
                          <td className="p-4 text-center text-body">{u.totalScore || 0}</td>
                          <td className="p-4 text-center text-xs text-muted">
                            {u.createdAt?.toDate?.()?.toLocaleDateString('fr-FR') || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Modules Tab — with edit & scheduling */}
          {activeTab === 'modules' && (
            <div className="space-y-3">
              <div className="glass-card p-4 bg-primary-500/5 border border-primary-500/20 rounded-xl mb-4">
                <p className="text-sm text-primary-400">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Cliquez sur le bouton modifier pour définir les dates d'ouverture et de fermeture d'un module.
                </p>
              </div>

              {TRACKS.map((track) => {
                const trackModules = MODULES.filter((m) => m.trackId === track.id);
                return (
                  <div key={track.id} className="mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <img src={track.logo} alt={track.shortName} className="w-6 h-6 rounded object-cover" />
                      <h3 className="font-semibold text-heading text-sm">{track.name}</h3>
                      <span className="text-xs text-muted">({trackModules.length} modules)</span>
                    </div>

                    <div className="space-y-2">
                      {trackModules.map((mod) => {
                        const isOpen = moduleSettings[mod.id]?.isOpen !== false;
                        const settings = moduleSettings[mod.id] || {};
                        const isEditing = editingModule === mod.id;

                        return (
                          <div key={mod.id} className="glass-card p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 flex-1 min-w-0">
                                {(() => {
                                  const Icon = getModuleIcon(mod.iconName);
                                  return (
                                    <div className="w-10 h-10 rounded-xl bg-primary-500/15 text-primary-400 flex items-center justify-center flex-shrink-0">
                                      <Icon className="w-5 h-5" />
                                    </div>
                                  );
                                })()}
                                <div className="min-w-0">
                                  <p className="font-medium text-heading truncate">{mod.title}</p>
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted mt-0.5">
                                    <span>{mod.difficulty}</span>
                                    <span>•</span>
                                    <span>{mod.estimatedTime}</span>
                                    {settings.openDate && (
                                      <>
                                        <span>•</span>
                                        <span className="text-primary-400">
                                          Ouverture : {new Date(settings.openDate).toLocaleDateString('fr-FR')}
                                        </span>
                                      </>
                                    )}
                                    {settings.closeDate && (
                                      <>
                                        <span>•</span>
                                        <span className="text-red-400">
                                          Fermeture : {new Date(settings.closeDate).toLocaleDateString('fr-FR')}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  onClick={() => setEditingModule(isEditing ? null : mod.id)}
                                  className="p-2 rounded-lg bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 transition-colors"
                                  title="Modifier les dates"
                                >
                                  {isEditing ? <ChevronUp className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => handleToggleModule(mod.id)}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-xs font-medium ${
                                    isOpen
                                      ? 'bg-accent-500/10 text-accent-400 hover:bg-accent-500/20'
                                      : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                  }`}
                                >
                                  {isOpen ? (
                                    <>
                                      <ToggleRight className="w-4 h-4" />
                                      Ouvert
                                    </>
                                  ) : (
                                    <>
                                      <ToggleLeft className="w-4 h-4" />
                                      Fermé
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Schedule editor (expanded) */}
                            {isEditing && (
                              <ModuleScheduleEditor
                                moduleId={mod.id}
                                openDate={settings.openDate || ''}
                                closeDate={settings.closeDate || ''}
                                codelabUrl={mod.codelabUrl}
                                onSave={handleSaveModuleSchedule}
                                onCancel={() => setEditingModule(null)}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Settings Tab — Editable exam parameters */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Exam Settings — editable */}
              <div className="glass-card p-8">
                <h3 className="text-lg font-semibold text-heading mb-6 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary-400" />
                  Paramètres d'examen
                </h3>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {[
                    { key: 'MCQ_COUNT', label: 'Nombre de QCM', min: 1, max: 20 },
                    { key: 'OPEN_COUNT', label: 'Questions ouvertes', min: 0, max: 10 },
                    { key: 'MCQ_TIME_SECONDS', label: 'Temps par QCM (sec)', min: 10, max: 300 },
                    { key: 'OPEN_TIME_SECONDS', label: 'Temps par ouverte (sec)', min: 60, max: 1800 },
                    { key: 'MAX_ATTEMPTS', label: 'Tentatives max', min: 1, max: 10 },
                    { key: 'PASSING_SCORE', label: 'Score de réussite (/10)', min: 1, max: 10 },
                  ].map(({ key, label, min, max }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-body mb-2">{label}</label>
                      <input
                        type="number"
                        min={min}
                        max={max}
                        value={examSettings[key] || ''}
                        onChange={(e) =>
                          setExamSettings((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        className="input-field w-full"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSaveExamSettings}
                  disabled={savingSettings}
                  className="btn-primary flex items-center gap-2"
                >
                  {savingSettings ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Enregistrer les paramètres
                </button>
              </div>

              {/* System Info */}
              <div className="glass-card p-8">
                <h3 className="text-lg font-semibold text-heading mb-6">Informations système</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-black/5 dark:bg-white/5 rounded-xl">
                    <h4 className="font-medium text-heading mb-2">Génération de questions</h4>
                    <p className="text-sm text-body">
                      Les questions sont générées dynamiquement par l'Agent Générateur de Questions
                      basé sur le contexte du module et le contenu du codelab.
                    </p>
                  </div>

                  <div className="p-4 bg-black/5 dark:bg-white/5 rounded-xl">
                    <h4 className="font-medium text-heading mb-2">Paramètres anti-triche</h4>
                    <p className="text-sm text-body mb-3">
                      La détection IA est gérée par l'Agent d'Évaluation avec une analyse sémantique approfondie.
                    </p>
                    <div className="flex items-center gap-2 text-amber-400 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      Avertissement à la première détection, zéro à la deuxième
                    </div>
                  </div>

                  <div className="p-4 bg-black/5 dark:bg-white/5 rounded-xl">
                    <h4 className="font-medium text-heading mb-2">Statistiques</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-heading">{users.length}</p>
                        <p className="text-xs text-muted">Utilisateurs</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-heading">{MODULES.length}</p>
                        <p className="text-xs text-muted">Modules</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-heading">{TRACKS.length}</p>
                        <p className="text-xs text-muted">Parcours</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={fetchData}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Rafraîchir les données
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================
// Module Schedule Editor Component
// ============================================
function ModuleScheduleEditor({ moduleId, openDate, closeDate, codelabUrl, onSave, onCancel }) {
  const [open, setOpen] = useState(openDate || '');
  const [close, setClose] = useState(closeDate || '');

  return (
    <div className="mt-4 pt-4 border-t border-themed">
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-body mb-1">
            <Calendar className="w-3 h-3 inline mr-1" />
            Date d'ouverture
          </label>
          <input
            type="date"
            value={open}
            onChange={(e) => setOpen(e.target.value)}
            className="input-field w-full text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-body mb-1">
            <Calendar className="w-3 h-3 inline mr-1" />
            Date de fermeture
          </label>
          <input
            type="date"
            value={close}
            onChange={(e) => setClose(e.target.value)}
            className="input-field w-full text-sm"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-body mb-1">Lien Codelab</label>
        <input
          type="url"
          value={codelabUrl}
          readOnly
          className="input-field w-full text-sm text-muted"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onSave(moduleId, open, close)}
          className="btn-primary text-xs px-4 py-2 flex items-center gap-1"
        >
          <Save className="w-3 h-3" />
          Enregistrer
        </button>
        <button
          onClick={onCancel}
          className="btn-secondary text-xs px-4 py-2"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}