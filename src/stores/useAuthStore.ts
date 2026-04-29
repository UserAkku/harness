import { create } from 'zustand';
import { signIn, signOut, getSession } from 'next-auth/react';

interface AuthState {
  user: { id: string; name?: string | null; email?: string | null } | null;
  loading: boolean;
  initialized: boolean;

  init: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  initialized: false,

  init: async () => {
    if (get().initialized) return;
    set({ loading: true });

    try {
      const session = await getSession();
      // @ts-expect-error - Custom user id type not defined globally yet
      set({ user: session?.user ? { id: session.user.id, name: session.user.name, email: session.user.email } : null, initialized: true, loading: false });
    } catch {
      set({ initialized: true, loading: false });
    }
  },

  signUp: async (email, password, name) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });
      const data = await res.json();

      if (!res.ok) {
        return { error: data.message || 'Failed to sign up' };
      }

      // Automatically sign in after sign up
      return await get().signIn(email, password);
    } catch (err: any) {
      return { error: err.message };
    }
  },

  signIn: async (email, password) => {
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      });

      if (result?.error) {
        return { error: result.error };
      }

      // Re-fetch session
      const session = await getSession();
      // @ts-expect-error
      set({ user: session?.user ? { id: session.user.id, name: session.user.name, email: session.user.email } : null });
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  signOut: async () => {
    await signOut({ redirect: false });
    set({ user: null });
    // Also clear indexeddb projects since the user logged out
    const idb = await import('idb');
    const db = await idb.openDB('harness-db', 1);
    await db.clear('projects');
  }
}));
