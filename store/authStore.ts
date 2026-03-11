import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  email: string;
  role: 'roleplayer' | 'staff' | 'superadmin';
  username: string;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  initializeUser: () => void;
  signOut: () => Promise<void>;
}

const fetchOrCreateProfile = async (supabase: ReturnType<typeof createClient>, user: User): Promise<Profile> => {
  try {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profile) return profile as Profile;
  } catch { /* profile doesn't exist, continue to create */ }

  const fallback: Profile = {
    id: user.id,
    username: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Operativo',
    email: user.email || '',
    role: 'roleplayer'
  };

  try {
    const { data: created } = await supabase
      .from('profiles')
      .upsert([fallback], { onConflict: 'id' })
      .select()
      .single();
    if (created) return created as Profile;
  } catch { /* insert failed, use fallback */ }

  return fallback;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  initializeUser: () => {
    const supabase = createClient();
    let resolved = false;

    const resolveAuth = async (user: User | null) => {
      if (resolved) return;
      resolved = true;

      if (!user) {
        set({ user: null, profile: null, isLoading: false });
        return;
      }

      try {
        const profile = await fetchOrCreateProfile(supabase, user);
        set({ user, profile, isLoading: false });
      } catch {
        set({ user, profile: null, isLoading: false });
      }
    };

    // Method 1: getSession for immediate resolution (works on page reload)
    supabase.auth.getSession().then(({ data: { session } }) => {
      resolveAuth(session?.user ?? null);
    }).catch(() => {
      resolveAuth(null);
    });

    // Method 2: onAuthStateChange for dynamic events (login, logout, OAuth callback)
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        resolved = false; // Allow re-resolution
        set({ user: null, profile: null, isLoading: false });
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        resolved = false; // Allow re-resolution on new sign-in
        resolveAuth(session?.user ?? null);
      }
    });

    // Safety net: never stay loading forever
    setTimeout(() => {
      if (get().isLoading) {
        console.warn('[AuthStore] Safety timeout: forcing isLoading=false after 8s');
        set({ isLoading: false });
      }
    }, 8000);
  },
  signOut: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ user: null, profile: null, isLoading: false });
  }
}));
