'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState('Completing sign in...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from URL params
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          setStatus('❌ Sign in failed. Redirecting...');
          setTimeout(() => router.push('/'), 2000);
          return;
        }

        if (session) {
          setStatus('✅ Success! Redirecting to Frog...');
          // Haptic feedback
          if (navigator.vibrate) navigator.vibrate([50, 50, 100]);
          setTimeout(() => router.push('/'), 1000);
        } else {
          setStatus('⏳ Processing...');
          // Wait a moment for the session to be established
          setTimeout(async () => {
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession) {
              setStatus('✅ Success! Redirecting to Frog...');
              router.push('/');
            } else {
              setStatus('❌ Sign in incomplete. Redirecting...');
              router.push('/');
            }
          }, 1500);
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setStatus('❌ Something went wrong. Redirecting...');
        setTimeout(() => router.push('/'), 2000);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="glass-card rounded-3xl p-8 text-center max-w-md">
        <div className="glass-icon text-5xl mb-6 mx-auto animate-bounce-slow">
          🐸
        </div>
        <h1 className="text-xl font-bold mb-4">{status}</h1>
        <div className="flex justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full" />
        </div>
      </div>
    </div>
  );
}
