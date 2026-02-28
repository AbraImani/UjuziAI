import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MODULES } from '../config/modules';
import {
  Award,
  CheckCircle,
  XCircle,
  Loader2,
  Zap,
  ExternalLink,
  Shield,
  Calendar,
  User,
  BookOpen,
} from 'lucide-react';

export default function Verify() {
  const { badgeId } = useParams();
  const [loading, setLoading] = useState(true);
  const [badge, setBadge] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchBadge() {
      if (!badgeId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        // Look up the badge in the public badges collection
        const badgesRef = collection(db, 'badges');
        const q = query(badgesRef, where('badgeId', '==', badgeId));
        const snap = await getDocs(q);

        if (!snap.empty) {
          const data = snap.docs[0].data();
          setBadge(data);
        } else {
          setNotFound(true);
        }
      } catch (error) {
        console.error('Error verifying badge:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchBadge();
  }, [badgeId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-body flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
          <p className="text-body">Vérification en cours...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-body flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="glass-card p-10">
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-heading mb-2">Badge introuvable</h1>
            <p className="text-body mb-2">
              Aucune certification trouvée pour cet identifiant.
            </p>
            <code className="block text-sm font-mono text-muted bg-surface px-4 py-2 rounded-lg mb-6 break-all">
              {badgeId}
            </code>
            <p className="text-sm text-muted mb-6">
              Vérifiez que l'identifiant est correct ou contactez le détenteur du badge.
            </p>
            <Link to="/" className="btn-primary inline-flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Accueil UjuziAI
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const module = MODULES.find((m) => m.id === badge.moduleId);
  const certDate = badge.completedAt?.toDate
    ? badge.completedAt.toDate().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : badge.completedAtStr || 'N/A';

  return (
    <div className="min-h-screen bg-body flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">UjuziAI</span>
          </div>
          <p className="text-sm text-muted">Vérification de certification</p>
        </div>

        {/* Verification Card */}
        <div className="glass-card p-8 border-2 border-green-500/30">
          {/* Verified Badge */}
          <div className="flex items-center justify-center gap-2 text-green-500 mb-6">
            <CheckCircle className="w-8 h-8" />
            <span className="text-xl font-bold">Certification vérifiée</span>
          </div>

          {/* Module Info */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-heading mb-1">
              {module?.title || badge.moduleTitle || 'Module'}
            </h2>
            <p className="text-sm text-muted">Build with AI Season — UjuziAI</p>
          </div>

          {/* Details */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3 p-3 bg-surface rounded-xl">
              <User className="w-5 h-5 text-primary-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted">Décerné à</p>
                <p className="font-semibold text-heading">{badge.userName || 'Apprenant'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-surface rounded-xl">
              <BookOpen className="w-5 h-5 text-accent-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted">Score obtenu</p>
                <p className="font-semibold text-heading">{badge.score}/10</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-surface rounded-xl">
              <Calendar className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted">Date de certification</p>
                <p className="font-semibold text-heading">{certDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-surface rounded-xl">
              <Shield className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted">Badge ID</p>
                <code className="font-mono text-sm text-primary-600 dark:text-primary-300 break-all">{badge.badgeId}</code>
              </div>
            </div>
          </div>

          {/* Certified by */}
          <div className="border-t border-themed pt-4 text-center">
            <p className="text-xs text-muted mb-1">Certifié par</p>
            <p className="font-semibold text-heading">GDG on Campus UCB</p>
            <p className="text-xs text-muted">Google Developer Group — Université Catholique de Bukavu</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-primary-400 hover:text-primary-300 transition-colors inline-flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            En savoir plus sur UjuziAI
          </Link>
        </div>
      </div>
    </div>
  );
}
