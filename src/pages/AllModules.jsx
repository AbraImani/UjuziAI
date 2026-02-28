import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAllProgress } from '../hooks/useFirestore';
import { MODULES, TRACKS, getTrackProgress } from '../config/modules';
import ModuleCard from '../components/ModuleCard';
import { BookOpen, ArrowLeft, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AllModules() {
  const { user } = useAuth();
  const { progressMap, loading } = useAllProgress();

  // Multi-track filter — supports selecting multiple tracks
  const [filterTracks, setFilterTracks] = useState([]);

  const displayedModules = useMemo(() => {
    if (filterTracks.length === 0) return MODULES;
    return MODULES.filter((m) => filterTracks.includes(m.trackId));
  }, [filterTracks]);

  const totalFiltered = displayedModules.length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/dashboard"
          className="p-2 rounded-xl border border-themed text-body hover:text-heading hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          aria-label="Retour au tableau de bord"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="section-title flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-primary-400" />
            Tous les modules
          </h1>
          <p className="text-xs text-body">
            {totalFiltered} module{totalFiltered !== 1 ? 's' : ''} disponible{totalFiltered !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Multi-track filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterTracks([])}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
            filterTracks.length === 0
              ? 'bg-primary-600/20 text-primary-300 border-primary-500/30'
              : 'text-body border-themed hover:text-heading hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <Filter className="w-3 h-3 inline mr-1" />
          Tous
        </button>
        {TRACKS.map((track) => {
          const isSelected = filterTracks.includes(track.id);
          return (
            <button
              key={track.id}
              onClick={() => {
                setFilterTracks((prev) =>
                  isSelected ? prev.filter((t) => t !== track.id) : [...prev, track.id]
                );
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                isSelected
                  ? `bg-gradient-to-r ${track.gradient} text-white border-transparent`
                  : 'text-body border-themed hover:text-heading hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <img src={track.logo} alt="" className="w-4 h-4 rounded-sm object-cover" />
              {track.shortName}
            </button>
          );
        })}
      </div>

      {/* Modules grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass-card p-6 h-64 animate-pulse">
              <div className="w-12 h-12 bg-gray-200 dark:bg-neutral-700 rounded-xl mb-4" />
              <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-200 dark:bg-neutral-700 rounded w-full mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-neutral-700 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayedModules.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              progress={progressMap[module.id]}
            />
          ))}
        </div>
      )}

      {displayedModules.length === 0 && !loading && (
        <div className="glass-card p-12 text-center">
          <BookOpen className="w-12 h-12 text-muted mx-auto mb-4" />
          <p className="text-body">Aucun module trouvé pour les filtres sélectionnés.</p>
        </div>
      )}
    </div>
  );
}
