import { Link } from 'react-router-dom';
import { DIFFICULTY_COLORS } from '../config/modules';
import { getModuleIcon } from '../config/icons';
import { CheckCircle, Lock, Clock, ArrowRight, BookOpen } from 'lucide-react';

export default function ModuleCard({ module, progress }) {
  const isCompleted = progress?.examScore >= 6;
  const isSubmitted = progress?.submitted;
  const isLocked = progress?.examLocked;
  const hasExamAccess = progress?.examUnlocked;

  function getStatusBadge() {
    if (isLocked) {
      return <span className="badge-danger"><Lock className="w-3 h-3 mr-1" /> Verrouillé</span>;
    }
    if (isCompleted) {
      return <span className="badge-accent"><CheckCircle className="w-3 h-3 mr-1" /> Complété</span>;
    }
    if (hasExamAccess) {
      return <span className="badge-primary"><BookOpen className="w-3 h-3 mr-1" /> Examen prêt</span>;
    }
    if (isSubmitted) {
      return <span className="badge-warning"><Clock className="w-3 h-3 mr-1" /> Soumis</span>;
    }
    return null;
  }

  return (
    <Link to={`/module/${module.id}`}>
      <div className="glass-card-hover p-6 h-full flex flex-col group">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          {(() => {
            const Icon = getModuleIcon(module.iconName);
            return (
              <div className="w-10 h-10 rounded-xl bg-primary-500/15 text-primary-400 flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
            );
          })()}
          {getStatusBadge()}
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-heading mb-2 group-hover:text-primary-300 transition-colors">
          {module.title}
        </h3>
        <p className="text-sm text-body mb-4 flex-1 line-clamp-3">
          {module.description}
        </p>

        {/* Meta */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`badge border ${DIFFICULTY_COLORS[module.difficulty]}`}>
            {module.difficulty}
          </span>
          <span className="badge bg-surface text-body border border-themed">
            <Clock className="w-3 h-3 mr-1" />
            {module.estimatedTime}
          </span>
        </div>

        {/* Topics */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {module.topics.map((topic) => (
            <span
              key={topic}
              className="text-xs px-2 py-0.5 bg-black/5 dark:bg-white/5 text-body rounded-md"
            >
              {topic}
            </span>
          ))}
        </div>

        {/* Progress bar */}
        {isCompleted && (
          <div className="mt-auto">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-accent-400">Score</span>
              <span className="text-accent-400 font-semibold">{progress.examScore}/10</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${(progress.examScore / 10) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-4 flex items-center text-sm text-primary-400 font-medium group-hover:text-primary-300 transition-colors">
          {isCompleted ? 'Voir les détails' : 'Commencer'}
          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

