'use client';

import { useState } from 'react';
import { useAuth } from './AuthContext';

export default function UserProfile() {
  const { user, isAuthenticated, signOut, setShowAuthModal } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setShowMenu(false);
    setSigningOut(false);
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(50);
  };

  if (!isAuthenticated) {
    return (
      <button
        onClick={() => setShowAuthModal(true)}
        className="glass-button py-3 px-6 rounded-xl flex items-center gap-2 w-full justify-center font-medium"
      >
        <span>🔐</span>
        <span>Sign In to Sync</span>
      </button>
    );
  }

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Frog User';
  const avatarUrl = user?.user_metadata?.avatar_url;
  const email = user?.email;

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative">
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={displayName}
              className="w-14 h-14 rounded-full object-cover ring-2 ring-emerald-400/50"
            />
          ) : (
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
              style={{ background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.6), rgba(16, 185, 129, 0.8))' }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          {/* Sync indicator */}
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-xs border-2 border-current">
            ☁️
          </div>
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold truncate">{displayName}</h3>
          <p className="text-xs opacity-60 truncate">{email}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-emerald-400">✓ Synced</span>
          </div>
        </div>

        {/* Menu Button */}
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="glass-icon-sm flex-shrink-0"
        >
          ⋮
        </button>
      </div>

      {/* Dropdown Menu */}
      {showMenu && (
        <div className="mt-4 pt-4 border-t border-current/10 space-y-2 animate-fade-in">
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full py-2 px-4 rounded-xl text-left text-red-400 hover:bg-red-400/10 transition-colors flex items-center gap-2"
          >
            {signingOut ? (
              <>
                <span className="animate-spin">⏳</span>
                Signing out...
              </>
            ) : (
              <>
                <span>👋</span>
                Sign Out
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
