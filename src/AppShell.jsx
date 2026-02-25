import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import useStore from './store/useStore';
import App from './App';
import AuthScreen from './components/AuthScreen';

export default function AppShell() {
  const [session, setSession] = useState(undefined); // undefined = loading
  const setUserId = useStore((s) => s.setUserId);
  const loadFromSupabase = useStore((s) => s.loadFromSupabase);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUserId(session.user.id);
        loadFromSupabase();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session?.user) {
        setUserId(session.user.id);
        // Only load from server on actual sign-in, not token refresh —
        // TOKEN_REFRESHED fires ~hourly and was overwriting local state
        // with stale server data, causing transactions to vanish.
        if (event === 'SIGNED_IN') {
          loadFromSupabase();
        }
      }
    });

    // Re-sync from Supabase when the tab/app regains focus.
    // Covers cross-device sync: if another device made changes,
    // this device picks them up when the user switches back to it.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const uid = useStore.getState().userId;
        if (uid) loadFromSupabase();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Loading state
  if (session === undefined) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-page)',
        color: 'var(--text-tertiary)',
        fontFamily: 'var(--font-family)',
        fontSize: '16px',
      }}>
        Loading...
      </div>
    );
  }

  // Not logged in
  if (!session) {
    return (
      <AuthScreen onAuth={(s) => {
        setSession(s);
        setUserId(s.user.id);
        loadFromSupabase();
      }} />
    );
  }

  // Logged in — render the app
  return <App />;
}
