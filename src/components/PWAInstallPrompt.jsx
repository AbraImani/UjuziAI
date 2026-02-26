import { useState, useEffect, useCallback, useRef } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

// ============================================
// PWA Install Prompt — Smart & Non-Intrusive
// ============================================
// Rules:
// 1. NEVER show if app is already installed (standalone mode)
// 2. Show only after 5 seconds delay
// 3. Auto-hide after 5 seconds of display (10s total)
// 4. Dismiss permanently on close (localStorage)
// 5. Maximum 1 prompt per session
// ============================================

const DISMISS_KEY = 'ujuziai-pwa-dismissed';
const DISMISS_EXPIRY_DAYS = 7; // Don't re-ask for 7 days after dismiss

function isStandalone() {
  // Check if running as installed PWA
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true || // iOS Safari
    document.referrer.includes('android-app://') // TWA
  );
}

function isDismissed() {
  try {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (!dismissed) return false;
    const dismissedAt = parseInt(dismissed, 10);
    const expiryMs = DISMISS_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    return Date.now() - dismissedAt < expiryMs;
  } catch {
    return false;
  }
}

function setDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  } catch {
    // Storage full or blocked — ignore
  }
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [installing, setInstalling] = useState(false);
  const promptShownRef = useRef(false);
  const timerRef = useRef(null);
  const autoHideRef = useRef(null);

  // Capture the beforeinstallprompt event
  useEffect(() => {
    // Bail early if already installed or previously dismissed
    if (isStandalone() || isDismissed()) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Also listen for successful install
    const installedHandler = () => {
      setShowBanner(false);
      setDeferredPrompt(null);
      setDismissed();
    };

    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (autoHideRef.current) clearTimeout(autoHideRef.current);
    };
  }, []);

  // Show banner after 5-second delay once we have a deferred prompt
  useEffect(() => {
    if (!deferredPrompt || promptShownRef.current || isStandalone() || isDismissed()) return;

    timerRef.current = setTimeout(() => {
      promptShownRef.current = true;
      setShowBanner(true);

      // Auto-hide after 5 seconds of being visible
      autoHideRef.current = setTimeout(() => {
        setShowBanner(false);
      }, 5000);
    }, 5000); // 5-second delay before showing

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [deferredPrompt]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    setInstalling(true);
    if (autoHideRef.current) clearTimeout(autoHideRef.current);

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setDismissed();
      }
    } catch (err) {
      console.warn('PWA install prompt error:', err);
    } finally {
      setDeferredPrompt(null);
      setShowBanner(false);
      setInstalling(false);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    setDismissed();
    if (autoHideRef.current) clearTimeout(autoHideRef.current);
  }, []);

  // Don't render anything if conditions not met
  if (!showBanner || isStandalone()) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-sm z-50 animate-slide-up">
      <div className="glass-card p-4 border border-primary-500/30 shadow-2xl shadow-primary-500/10">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-5 h-5 text-primary-400" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-heading">Installer UjuziAI</p>
            <p className="text-xs text-body mt-0.5">
              Accédez à l'app directement depuis votre écran d'accueil
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleInstall}
                disabled={installing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                {installing ? 'Installation...' : 'Installer'}
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-xs text-body hover:text-heading transition-colors"
              >
                Plus tard
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg text-muted hover:text-heading hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex-shrink-0"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
