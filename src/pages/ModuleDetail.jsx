import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MODULES, DIFFICULTY_COLORS, EXAM_CONFIG } from '../config/modules';
import { getModuleIcon } from '../config/icons';
import { useModuleProgress } from '../hooks/useFirestore';
import SubmissionForm from '../components/SubmissionForm';
import {
  ArrowLeft,
  ExternalLink,
  Clock,
  BookOpen,
  Upload,
  Shield,
  CheckCircle,
  XCircle,
  Lock,
  Award,
  FileText,
  AlertTriangle,
  Play,
} from 'lucide-react';

export default function ModuleDetail() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const module = MODULES.find((m) => m.id === moduleId);
  const { progress, loading, refetch } = useModuleProgress(moduleId);
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  if (!module) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <h2 className="text-2xl font-bold text-white mb-4">Module Not Found</h2>
        <p className="text-surface-400 mb-6">The module you're looking for doesn't exist.</p>
        <Link to="/dashboard" className="btn-primary">Back to Dashboard</Link>
      </div>
    );
  }

  const isSubmitted = progress?.submitted;
  const isValidated = progress?.validated;
  const isExamUnlocked = progress?.examUnlocked;
  const isExamLocked = progress?.examLocked;
  const examAttempts = progress?.examAttempts || 0;
  const examScore = progress?.examScore;
  const isPassed = examScore >= EXAM_CONFIG.PASSING_SCORE;
  const hasBadge = progress?.badgeId;

  function getStatusSection() {
    if (isExamLocked) {
      return (
        <div className="glass-card p-6 border-red-500/30">
          <div className="flex items-center gap-3 mb-3">
            <Lock className="w-6 h-6 text-red-400" />
            <h3 className="text-lg font-semibold text-red-400">Exam Locked</h3>
          </div>
          <p className="text-surface-400">
            This exam has been locked due to policy violations. Contact support if you believe this is an error.
          </p>
        </div>
      );
    }

    if (isPassed) {
      return (
        <div className="glass-card p-6 border-accent-500/30">
          <div className="flex items-center gap-3 mb-3">
            <Award className="w-6 h-6 text-accent-400" />
            <h3 className="text-lg font-semibold text-accent-400">Module Completed!</h3>
          </div>
          <p className="text-surface-400 mb-4">
            You scored <span className="text-accent-400 font-bold">{examScore}/10</span>. 
            Your certification badge is ready.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to={`/certificate/${moduleId}`} className="btn-accent flex items-center gap-2">
              <Award className="w-4 h-4" />
              View Certificate
            </Link>
          </div>
        </div>
      );
    }

    if (isExamUnlocked) {
      return (
        <div className="glass-card p-6 border-primary-500/30">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-6 h-6 text-primary-400" />
            <h3 className="text-lg font-semibold text-primary-400">Exam Ready</h3>
          </div>
          <p className="text-surface-400 mb-2">
            Your submission has been validated. You can now take the exam.
          </p>
          <div className="flex items-center gap-4 text-sm text-surface-400 mb-4">
            <span>Attempts: {examAttempts}/{EXAM_CONFIG.MAX_ATTEMPTS}</span>
            {examScore !== null && <span>Last Score: {examScore}/10</span>}
          </div>
          {examAttempts < EXAM_CONFIG.MAX_ATTEMPTS && (
            <button
              onClick={() => navigate(`/exam/${moduleId}`)}
              className="btn-primary flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              {examAttempts > 0 ? 'Retry Exam' : 'Start Exam'}
            </button>
          )}
          {examAttempts >= EXAM_CONFIG.MAX_ATTEMPTS && !isPassed && (
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">Maximum attempts reached</span>
            </div>
          )}
        </div>
      );
    }

    if (isSubmitted && !isValidated) {
      return (
        <div className="glass-card p-6 border-amber-500/30">
          <div className="flex items-center gap-3 mb-3">
            <Clock className="w-6 h-6 text-amber-400 animate-pulse" />
            <h3 className="text-lg font-semibold text-amber-400">Submission Under Review</h3>
          </div>
          <p className="text-surface-400">
            Your proof has been submitted and is being reviewed. The exam will unlock once validated.
          </p>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-surface-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {/* Module Header */}
      <div className="glass-card p-8 mb-6">
        <div className="flex items-start gap-4 mb-6">
          {(() => {
            const Icon = getModuleIcon(module.iconName);
            return (
              <div className="w-14 h-14 rounded-2xl bg-primary-500/15 text-primary-400 flex items-center justify-center flex-shrink-0">
                <Icon className="w-7 h-7" />
              </div>
            );
          })()}
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{module.title}</h1>
            <p className="text-surface-400 leading-relaxed">{module.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <span className={`badge border ${DIFFICULTY_COLORS[module.difficulty]}`}>
            {module.difficulty}
          </span>
          <span className="badge bg-surface-800 text-surface-300 border border-surface-700">
            <Clock className="w-3 h-3 mr-1" />
            {module.estimatedTime}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {module.topics.map((topic) => (
            <span key={topic} className="badge-primary">{topic}</span>
          ))}
        </div>

        {/* Codelab Link */}
        <a
          href={module.codelabUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary inline-flex items-center gap-2"
        >
          <BookOpen className="w-4 h-4" />
          Open Codelab
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Status Section */}
      {getStatusSection()}

      {/* Submission Section */}
      {!isSubmitted && (
        <div className="glass-card p-8 mt-6">
          <div className="flex items-center gap-3 mb-6">
            <Upload className="w-6 h-6 text-primary-400" />
            <div>
              <h2 className="text-xl font-semibold text-white">Submit Your Proof</h2>
              <p className="text-sm text-surface-400">
                Upload evidence of codelab completion to unlock the exam
              </p>
            </div>
          </div>

          {!showSubmitForm ? (
            <div className="text-center py-8">
              <FileText className="w-16 h-16 text-surface-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-surface-300 mb-2">
                Ready to submit your work?
              </h3>
              <p className="text-surface-500 mb-6 max-w-md mx-auto">
                You'll need screenshots, an optional video/link, and a detailed description
                of your codelab completion.
              </p>
              <button
                onClick={() => setShowSubmitForm(true)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Begin Submission
              </button>
            </div>
          ) : (
            <SubmissionForm
              moduleId={moduleId}
              onSuccess={() => {
                setShowSubmitForm(false);
                refetch();
              }}
            />
          )}
        </div>
      )}

      {/* Requirements Checklist */}
      <div className="glass-card p-8 mt-6">
        <h3 className="text-lg font-semibold text-white mb-4">Completion Requirements</h3>
        <div className="space-y-3">
          {[
            { label: 'Complete the codelab', done: isSubmitted },
            { label: 'Upload screenshot proof', done: isSubmitted },
            { label: 'Provide video or link (optional)', done: isSubmitted },
            { label: 'Write detailed description', done: isSubmitted },
            { label: 'Submission validated', done: isValidated },
            { label: 'Pass exam with score ≥ 6/10', done: isPassed },
          ].map(({ label, done }) => (
            <div key={label} className="flex items-center gap-3">
              {done ? (
                <CheckCircle className="w-5 h-5 text-accent-400 flex-shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-surface-600 flex-shrink-0" />
              )}
              <span className={done ? 'text-surface-200' : 'text-surface-500'}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
