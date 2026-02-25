import { useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MODULES } from '../config/modules';
import { useModuleProgress } from '../hooks/useFirestore';
import { useAuth } from '../contexts/AuthContext';
import {
  Award,
  Download,
  Share2,
  ArrowLeft,
  CheckCircle,
  Loader2,
  Linkedin,
  Twitter,
  Zap,
} from 'lucide-react';

export default function Certificate() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const module = MODULES.find((m) => m.id === moduleId);
  const { progress, loading } = useModuleProgress(moduleId);
  const certRef = useRef(null);

  if (!module) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <h2 className="text-2xl font-bold text-heading mb-4">Module introuvable</h2>
        <Link to="/dashboard" className="btn-primary">Retour au tableau de bord</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const isPassed = progress?.examScore >= 6;
  const badgeId = progress?.badgeId || `UZA-${moduleId.slice(0, 6).toUpperCase()}-${user?.uid?.slice(0, 8)?.toUpperCase() || 'XXXX'}`;

  if (!isPassed) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <Award className="w-16 h-16 text-muted mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-heading mb-4">Certificat non disponible</h2>
        <p className="text-body mb-6">Vous devez réussir l'examen avec un score ≥ 6/10 pour obtenir un certificat.</p>
        <button onClick={() => navigate(`/module/${moduleId}`)} className="btn-primary">
          Aller au module
        </button>
      </div>
    );
  }

  const handleDownload = async () => {
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');

      if (!certRef.current) return;

      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        backgroundColor: '#0f172a',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`UjuziAI-Certificate-${module.title}.pdf`);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const shareUrl = `${window.location.origin}/certificate/${moduleId}`;
  const shareText = `Je viens d'obtenir ma certification "${module.title}" sur UjuziAI ! Badge ID : ${badgeId}`;

  const shareLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&summary=${encodeURIComponent(shareText)}`,
      '_blank'
    );
  };

  const shareTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      '_blank'
    );
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Back */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-body hover:text-heading transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour au tableau de bord
      </button>

      {/* Certificate */}
      <div
        ref={certRef}
        className="relative bg-surface border-2 border-primary-500/30 rounded-2xl p-8 md:p-12 overflow-hidden"
      >
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-500 via-accent-500 to-primary-500" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-900/20 via-transparent to-transparent" />

        <div className="relative z-10 text-center">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">UjuziAI</span>
          </div>

          <p className="text-body uppercase tracking-widest text-sm mb-4">
            Certificat de réussite
          </p>

          <h1 className="text-3xl md:text-4xl font-bold text-heading mb-2">
            {module.title}
          </h1>
          <p className="text-body mb-8">Build with AI Season</p>

          <div className="mb-8">
            <p className="text-body text-sm">Décerné à</p>
            <p className="text-2xl font-bold gradient-text mt-1">
              {user?.displayName || 'Apprenant'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-8 mb-8">
            <div>
              <p className="text-muted text-xs">Score</p>
              <p className="text-xl font-bold text-accent-400">{progress.examScore}/10</p>
            </div>
            <div className="w-px h-10 bg-gray-200 dark:bg-neutral-700" />
            <div>
              <p className="text-muted text-xs">Badge ID</p>
              <p className="text-sm font-mono text-primary-300">{badgeId}</p>
            </div>
            <div className="w-px h-10 bg-gray-200 dark:bg-neutral-700" />
            <div>
              <p className="text-muted text-xs">Date</p>
              <p className="text-sm text-body">{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-accent-400">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Certification vérifiée</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-4 mt-8 justify-center">
        <button onClick={handleDownload} className="btn-primary flex items-center gap-2">
          <Download className="w-4 h-4" />
          Télécharger PDF
        </button>
        <button onClick={shareLinkedIn} className="btn-secondary flex items-center gap-2">
          <Linkedin className="w-4 h-4" />
          Partager sur LinkedIn
        </button>
        <button onClick={shareTwitter} className="btn-secondary flex items-center gap-2">
          <Twitter className="w-4 h-4" />
          Partager sur X
        </button>
      </div>

      {/* Badge Verification */}
      <div className="glass-card p-6 mt-8 text-center">
        <Award className="w-8 h-8 text-primary-400 mx-auto mb-3" />
        <h3 className="font-semibold text-heading mb-1">Badge vérifiable</h3>
        <p className="text-sm text-body mb-3">
          Votre badge ID peut être utilisé pour vérifier cette certification :
        </p>
        <code className="bg-surface px-4 py-2 rounded-lg text-primary-300 font-mono text-sm">
          {badgeId}
        </code>
      </div>
    </div>
  );
}


