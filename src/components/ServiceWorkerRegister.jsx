'use client';

import { useEffect, useState } from 'react';

export default function ServiceWorkerRegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });
      
      setRegistration(reg);
      console.log('Service Worker registered successfully');

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateAvailable(true);
          }
        });
      });

      setInterval(() => reg.update(), 60000);

    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  const handleUpdate = () => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-fade-in">
      <div className="max-w-md mx-auto bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl shadow-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-2xl">🆕</span>
          </div>
          <div className="flex-1">
            <h3 className="text-white font-bold">Update Available!</h3>
            <p className="text-green-100 text-sm">A new version of FocusFlow is ready.</p>
          </div>
          <button onClick={handleUpdate} className="px-4 py-2 bg-white text-green-600 font-bold rounded-xl hover:bg-green-50 transition-colors">
            Update
          </button>
        </div>
      </div>
    </div>
  );
}