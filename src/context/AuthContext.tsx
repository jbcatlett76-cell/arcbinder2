import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { UserIdentity } from '../types';
import { clearDemoUser, loadDemoUser, saveDemoUser } from '../lib/storage';
import { hasSupabase, supabase } from '../lib/supabase';

interface AuthContextValue {
  user: UserIdentity | null;
  loading: boolean;
  isDemoMode: boolean;
  signInDemo: (email: string, name: string) => void;
  signInGoogle: () => Promise<void>;
  signInEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserIdentity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      const demo = loadDemoUser();
      if (demo) setUser({ id: 'demo-user', email: demo.email, name: demo.name });
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const authUser = data.session?.user;
      setUser(
        authUser
          ? {
              id: authUser.id,
              email: authUser.email ?? '',
              name: String(authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Author'),
            }
          : null,
      );
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user;
      setUser(
        authUser
          ? {
              id: authUser.id,
              email: authUser.email ?? '',
              name: String(authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Author'),
            }
          : null,
      );
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isDemoMode: !hasSupabase,
      signInDemo(email, name) {
        const next = { id: 'demo-user', email, name: name || email.split('@')[0] || 'Author' };
        saveDemoUser({ email: next.email, name: next.name });
        setUser(next);
      },
      async signInEmail(email) {
        if (!supabase) {
          const next = { id: 'demo-user', email, name: email.split('@')[0] || 'Author' };
          saveDemoUser({ email: next.email, name: next.name });
          setUser(next);
          return;
        }
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
      },
      async signInGoogle() {
        if (!supabase) throw new Error('Google sign-in requires Supabase configuration.');
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
      },
      async signOut() {
        if (supabase) await supabase.auth.signOut();
        clearDemoUser();
        setUser(null);
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
