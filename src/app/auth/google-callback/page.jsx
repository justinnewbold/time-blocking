'use client';

import { useEffect, useState } from 'react';

export default function GoogleCallbackPage() {
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);

  useEffect(() => {
    // Parse the hash fragment for the access token
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);

    const accessToken = params.get('access_token');
    const errorParam = params.get('error');
    const errorDescription = params.get('error_description');

    if (errorParam) {
      setStatus('error');
      setError(errorDescription || errorParam);

      // Send error to parent window
      if (window.opener) {
        window.opener.postMessage({
          type: 'google-auth-error',
          error: errorDescription || errorParam,
        }, window.location.origin);
      }
      return;
    }

    if (accessToken) {
      setStatus('success');

      // Send token to parent window
      if (window.opener) {
        window.opener.postMessage({
          type: 'google-auth-success',
          token: accessToken,
        }, window.location.origin);

        // Close this window after a short delay
        setTimeout(() => {
          window.close();
        }, 1500);
      }
    } else {
      setStatus('error');
      setError('No access token received');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="glass-card p-8 rounded-3xl max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">Connecting...</h1>
            <p className="text-white/60">Please wait while we connect to Google Calendar</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✓</span>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Connected!</h1>
            <p className="text-white/60">Google Calendar connected successfully</p>
            <p className="text-white/40 text-sm mt-4">This window will close automatically...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✕</span>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Connection Failed</h1>
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => window.close()}
              className="px-6 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              Close Window
            </button>
          </>
        )}
      </div>

      <style jsx global>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
