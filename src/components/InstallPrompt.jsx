'use client';

import { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone 
      || document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem('pwa-dismissed');
      if (!dismissed || Date.now() - parseInt(dismissed) > 7 * 24 * 60 * 60 * 1000) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (iOS && !standalone) {
      const dismissed = localStorage.getItem('pwa-dismissed-ios');
      if (!dismissed || Date.now() - parseInt(dismissed) > 7 * 24 * 60 * 60 * 1000) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem(isIOS ? 'pwa-dismissed-ios' : 'pwa-dismissed', Date.now().toString());
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 p-4"
      style={{ animation: 'slideUp 0.3s ease-out' }}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div className="max-w-md mx-auto bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 flex items-start gap-3">
          <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <span className="text-3xl">🐸</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-lg">Install Frog</h3>
            <p className="text-green-100 text-sm mt-1">
              Get quick access, offline support, and notifications!
            </p>
          </div>
          <button onClick={handleDismiss} className="text-white/60 hover:text-white p-1" aria-label="Dismiss">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isIOS ? (
          <div className="px-4 pb-4">
            <div className="bg-white/10 rounded-xl p-3 space-y-2">
              <p className="text-white text-sm font-medium">To install on iOS:</p>
              <ol className="text-green-100 text-sm space-y-1.5">
                <li className="flex items-center gap-2">
                  <span className="bg-white/20 rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
                  Tap the Share button
                </li>
                <li className="flex items-center gap-2">
                  <span className="bg-white/20 rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span>
                  Tap &quot;Add to Home Screen&quot;
                </li>
                <li className="flex items-center gap-2">
                  <span className="bg-white/20 rounded-full w-5 h-5 flex items-center justify-center text-xs">3</span>
                  Tap &quot;Add&quot; to confirm
                </li>
              </ol>
            </div>
            <button onClick={handleDismiss} className="w-full mt-3 py-2.5 bg-white/20 text-white font-medium rounded-xl hover:bg-white/30 transition-colors">
              Got it!
            </button>
          </div>
        ) : (
          <div className="px-4 pb-4 flex gap-2">
            <button onClick={handleDismiss} className="flex-1 py-2.5 bg-white/20 text-white font-medium rounded-xl hover:bg-white/30 transition-colors">
              Not Now
            </button>
            <button onClick={handleInstall} className="flex-1 py-2.5 bg-white text-green-600 font-bold rounded-xl hover:bg-green-50 transition-colors">
              Install
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
