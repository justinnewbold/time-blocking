'use client';

import { useState } from 'react';
import { useAuth } from './AuthContext';

export default function LoginModal() {
  const { showAuthModal, setShowAuthModal, signIn, signUp, signInWithGoogle, signInWithApple, resetPassword } = useAuth();
  const [mode, setMode] = useState('login'); // 'login', 'signup', 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!showAuthModal) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) throw error;
        setShowAuthModal(false);
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(50);
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, displayName);
        if (error) throw error;
        setMessage('✅ Check your email to confirm your account!');
        setMode('login');
      } else if (mode === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) throw error;
        setMessage('✅ Password reset link sent to your email!');
        setMode('login');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithApple();
      if (error) throw error;
    } catch (err) {
      setError(err.message || 'Apple sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueWithoutAccount = () => {
    setShowAuthModal(false);
    localStorage.setItem('frog_guest_mode', 'true');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={() => setShowAuthModal(false)}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md glass-card rounded-3xl p-8 animate-scale-in">
        {/* Close button */}
        <button
          onClick={() => setShowAuthModal(false)}
          className="absolute top-4 right-4 glass-icon-sm"
        >
          ✕
        </button>

        {/* Frog Icon */}
        <div className="flex justify-center mb-6">
          <div className="glass-icon text-4xl">
            🐸
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center mb-2">
          {mode === 'login' && 'Welcome Back!'}
          {mode === 'signup' && 'Join Frog 🐸'}
          {mode === 'forgot' && 'Reset Password'}
        </h2>
        <p className="text-center text-sm opacity-70 mb-6">
          {mode === 'login' && 'Sign in to sync your tasks across devices'}
          {mode === 'signup' && 'Create an account to save your progress'}
          {mode === 'forgot' && "We'll send you a reset link"}
        </p>

        {/* Error/Message */}
        {error && (
          <div className="glass-light rounded-xl p-3 mb-4 text-red-400 text-sm text-center">
            ⚠️ {error}
          </div>
        )}
        {message && (
          <div className="glass-light rounded-xl p-3 mb-4 text-green-400 text-sm text-center">
            {message}
          </div>
        )}

        {/* Social Login Buttons */}
        {mode !== 'forgot' && (
          <div className="space-y-3 mb-6">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full glass-button py-3 px-4 rounded-xl flex items-center justify-center gap-3 font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <button
              onClick={handleAppleSignIn}
              disabled={loading}
              className="w-full glass-button py-3 px-4 rounded-xl flex items-center justify-center gap-3 font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Continue with Apple
            </button>
          </div>
        )}

        {/* Divider */}
        {mode !== 'forgot' && (
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-current opacity-20" />
            <span className="text-sm opacity-50">or</span>
            <div className="flex-1 h-px bg-current opacity-20" />
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium mb-2">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full glass-input rounded-xl py-3 px-4"
                placeholder="Your name"
                required={mode === 'signup'}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full glass-input rounded-xl py-3 px-4"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-input rounded-xl py-3 px-4"
                placeholder="••••••••"
                required={mode !== 'forgot'}
                minLength={6}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-bold transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.8), rgba(16, 185, 129, 0.9))',
              boxShadow: '0 4px 20px rgba(52, 211, 153, 0.3)'
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                Loading...
              </span>
            ) : (
              <>
                {mode === 'login' && '🐸 Sign In'}
                {mode === 'signup' && '🎉 Create Account'}
                {mode === 'forgot' && '📧 Send Reset Link'}
              </>
            )}
          </button>
        </form>

        {/* Mode Switcher */}
        <div className="mt-6 text-center text-sm">
          {mode === 'login' && (
            <>
              <button
                onClick={() => { setMode('forgot'); setError(''); }}
                className="opacity-70 hover:opacity-100 transition-opacity"
              >
                Forgot password?
              </button>
              <span className="mx-2">•</span>
              <button
                onClick={() => { setMode('signup'); setError(''); }}
                className="text-emerald-400 hover:text-emerald-300 font-medium"
              >
                Create account
              </button>
            </>
          )}
          {mode === 'signup' && (
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              Already have an account? <span className="text-emerald-400">Sign in</span>
            </button>
          )}
          {mode === 'forgot' && (
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              ← Back to sign in
            </button>
          )}
        </div>

        {/* Continue without account */}
        <div className="mt-4 text-center">
          <button
            onClick={handleContinueWithoutAccount}
            className="text-xs opacity-50 hover:opacity-70 transition-opacity"
          >
            Continue without account (local only)
          </button>
        </div>
      </div>
    </div>
  );
}
