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
  Copy,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';

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

  const isPassed = progress?.examScore >= 7;
  const badgeId = progress?.badgeId || null;
  // Use the stored exam completion date — never changes
  const certDate = progress?.completedAt?.toDate
    ? progress.completedAt.toDate()
    : progress?.submittedAt?.toDate
      ? progress.submittedAt.toDate()
      : new Date();
  const formattedDate = certDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  if (!isPassed) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <Award className="w-16 h-16 text-muted mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-heading mb-4">Certificat non disponible</h2>
        <p className="text-body mb-6">Vous devez réussir l'examen avec un score ≥ 7/10 pour obtenir un certificat.</p>
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

      // Force white background and fixed landscape dimensions for A4
      const el = certRef.current;
      const origStyle = el.style.cssText;
      el.style.width = '1122px';  // A4 landscape at 96dpi
      el.style.height = '793px';
      el.style.padding = '48px 64px';
      el.style.backgroundColor = '#ffffff';
      el.style.color = '#202124';

      const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        width: 1122,
        height: 793,
      });

      // Restore original styles
      el.style.cssText = origStyle;

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`UjuziAI-Certificate-${module.title}.pdf`);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleCopyBadgeId = () => {
    if (!badgeId) return;
    navigator.clipboard.writeText(badgeId);
    toast.success('Badge ID copié !');
  };

  const verificationUrl = badgeId ? `${window.location.origin}/verify/${badgeId}` : window.location.origin;
  const shareText = `Je viens d'obtenir ma certification "${module.title}" sur UjuziAI ! Vérifié par GDG on Campus UCB. Badge ID : ${badgeId}`;

  const shareLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verificationUrl)}`,
      '_blank'
    );
  };

  const shareTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(verificationUrl)}`,
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

      {/* Certificate - uses inline styles to ensure html2canvas renders correctly */}
      <div
        ref={certRef}
        className="relative bg-white dark:bg-surface border-2 border-primary-500/30 rounded-2xl p-6 sm:p-8 md:p-12 overflow-hidden"
        style={{ minWidth: '320px', aspectRatio: '1.414 / 1' }}
      >
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-2" style={{ background: 'linear-gradient(to right, #4285f4, #34a853, #4285f4)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at top right, rgba(66,133,244,0.08), transparent, transparent)' }} />

        <div className="relative z-10 text-center flex flex-col justify-center h-full">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-6 sm:mb-8">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#4285f4' }}>
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-xl sm:text-2xl font-bold" style={{ color: '#4285f4' }}>UjuziAI</span>
          </div>

          <p className="uppercase tracking-widest text-xs sm:text-sm mb-3 sm:mb-4" style={{ color: '#5f6368' }}>
            Certificat de réussite
          </p>

          <h1 className="text-xl sm:text-3xl md:text-4xl font-bold mb-2 px-2" style={{ color: '#202124' }}>
            {module.title}
          </h1>
          <p className="text-sm mb-6 sm:mb-8" style={{ color: '#9aa0a6' }}>Build with AI Season</p>

          <div className="mb-6 sm:mb-8">
            <p className="text-xs sm:text-sm" style={{ color: '#5f6368' }}>Décerné à</p>
            <p className="text-lg sm:text-2xl font-bold mt-1" style={{ color: '#4285f4' }}>
              {user?.displayName || 'Apprenant'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mb-6 sm:mb-8 text-center">
            <div>
              <p className="text-xs" style={{ color: '#5f6368' }}>Score</p>
              <p className="text-lg sm:text-xl font-bold" style={{ color: '#34a853' }}>{progress.examScore}/10</p>
            </div>
            <div className="hidden sm:block w-px h-10" style={{ backgroundColor: '#dadce0' }} />
            <div className="max-w-[200px] sm:max-w-none">
              <p className="text-xs" style={{ color: '#5f6368' }}>Badge ID</p>
              <p className="text-xs sm:text-sm font-mono break-all" style={{ color: '#4285f4' }}>{badgeId || 'En attente'}</p>
            </div>
            <div className="hidden sm:block w-px h-10" style={{ backgroundColor: '#dadce0' }} />
            <div>
              <p className="text-xs" style={{ color: '#5f6368' }}>Date</p>
              <p className="text-xs sm:text-sm" style={{ color: '#202124' }}>{formattedDate}</p>
            </div>
          </div>

          {/* GDG Signature */}
          <div className="pt-4 sm:pt-6 mb-4" style={{ borderTop: '1px solid #dadce0' }}>
            <p className="text-xs mb-1" style={{ color: '#5f6368' }}>Certifié par</p>
            <p className="text-sm sm:text-base font-semibold" style={{ color: '#202124' }}>GDG on Campus UCB</p>
            <p className="text-xs" style={{ color: '#5f6368' }}>Google Developer Group — Université Catholique de Bukavu</p>
          </div>

          <div className="flex items-center justify-center gap-2" style={{ color: '#34a853' }}>
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm font-medium">Certification vérifiée</span>
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
          LinkedIn
        </button>
        <button onClick={shareTwitter} className="btn-secondary flex items-center gap-2">
          <Twitter className="w-4 h-4" />
          X (Twitter)
        </button>
      </div>

      {/* Badge Verification */}
      <div className="glass-card p-6 mt-8 text-center">
        <Award className="w-8 h-8 text-primary-400 mx-auto mb-3" />
        <h3 className="font-semibold text-heading mb-1">Certification vérifiable</h3>
        <p className="text-sm text-body mb-4">
          Votre badge ID peut être utilisé pour vérifier cette certification, comme sur Coursera ou Google :
        </p>
        <div className="flex items-center justify-center gap-2 mb-4">
          <code className="bg-surface px-4 py-2 rounded-lg text-primary-600 dark:text-primary-300 font-mono text-xs sm:text-sm break-all">
            {badgeId || 'Badge non encore généré'}
          </code>
          {badgeId && (
            <button
              onClick={handleCopyBadgeId}
              className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-body"
              title="Copier le Badge ID"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-xs text-muted">
          Certifié par <strong className="text-heading">GDG on Campus UCB</strong> — Google Developer Group
        </p>
      </div>
    </div>
  );
}


