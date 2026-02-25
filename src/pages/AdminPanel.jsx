import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAdmin } from '../hooks/useFirestore';
import { MODULES, EXAM_CONFIG } from '../config/modules';
import { getModuleIcon } from '../config/icons';
import {
  Shield,
  Users,
  BookOpen,
  Settings,
  CheckCircle,
  XCircle,
  Eye,
  Lock,
  Unlock,
  ToggleLeft,
  ToggleRight,
  Search,
  RefreshCw,
  Loader2,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('submissions');
  const [users, setUsers] = useState([]);
  const [moduleSettings, setModuleSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { validateSubmission, toggleModuleLock, overrideExamLock } = useAdmin();

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
          <p className="section-subtitle">Gérez les soumissions, utilisateurs et modules</p>
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

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-themed">
                      <th className="text-left p-4 text-body font-medium">Utilisateur</th>
                      <th className="text-left p-4 text-body font-medium">Rôle</th>
                      <th className="text-center p-4 text-body font-medium">Modules</th>
                      <th className="text-center p-4 text-body font-medium">Score</th>
                      <th className="text-center p-4 text-body font-medium">Badges</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b border-themed hover:bg-black/5 dark:bg-white/5">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary-600/20 rounded-full flex items-center justify-center text-xs font-bold text-primary-300">
                              {u.displayName?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <p className="font-medium text-heading">{u.displayName}</p>
                              <p className="text-xs text-muted">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={u.role === 'admin' ? 'badge-primary' : 'badge bg-gray-200 dark:bg-neutral-700 text-body'}>
                            {u.role || 'student'}
                          </span>
                        </td>
                        <td className="p-4 text-center text-body">
                          {Object.keys(u.progress || {}).length}
                        </td>
                        <td className="p-4 text-center text-body">{u.totalScore || 0}</td>
                        <td className="p-4 text-center text-body">{u.badges?.length || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Modules Tab */}
          {activeTab === 'modules' && (
            <div className="space-y-3">
              {MODULES.map((mod) => {
                const isOpen = moduleSettings[mod.id]?.isOpen !== false;
                return (
                  <div key={mod.id} className="glass-card p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {(() => { const Icon = getModuleIcon(mod.iconName); return <div className="w-10 h-10 rounded-xl bg-primary-500/15 text-primary-400 flex items-center justify-center"><Icon className="w-5 h-5" /></div>; })()}
                      <div>
                        <p className="font-medium text-heading">{mod.title}</p>
                        <p className="text-xs text-muted">{mod.difficulty} • {mod.estimatedTime}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleModule(mod.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        isOpen
                          ? 'bg-accent-500/10 text-accent-400 hover:bg-accent-500/20'
                          : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                      }`}
                    >
                      {isOpen ? (
                        <>
                          <ToggleRight className="w-5 h-5" />
                          Ouvert
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-5 h-5" />
                          Fermé
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="glass-card p-8">
              <h3 className="text-lg font-semibold text-heading mb-6">Paramètres système</h3>
              <div className="space-y-6">
                <div className="p-4 bg-black/5 dark:bg-white/5 rounded-xl">
                  <h4 className="font-medium text-heading mb-2">Génération de questions</h4>
                  <p className="text-sm text-body mb-3">
                    Les questions sont générées dynamiquement par l'Agent Générateur de Questions
                    basé sur le contexte du module et le contenu du codelab.
                  </p>
                  <div className="flex items-center gap-3 text-sm text-body">
                    <span>QCM : {7} par examen</span>
                    <span>•</span>
                    <span>Ouvertes : {3} par examen</span>
                    <span>•</span>
                    <span>Tentatives max : {EXAM_CONFIG.MAX_ATTEMPTS}</span>
                  </div>
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

                <button
                  onClick={fetchData}
                  className="btn-secondary flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Rafraîchir les données
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

