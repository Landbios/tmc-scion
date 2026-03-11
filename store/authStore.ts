import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

// Define the shape of a Profile from the DB
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
  initializeUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoading: true,
  initializeUser: async () => {
    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        set({ user: null, profile: null, isLoading: false });
        return;
      }

      const user = session.user;
      
      // Fetch the profile to get the role
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      set({ 
        user, 
        profile: profile as Profile | null, 
        isLoading: false 
      });
    } catch (error) {
      console.error('Error initializing user:', error);
      set({ user: null, profile: null, isLoading: false });
    }
  },
  signOut: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ user: null, profile: null, isLoading: false });
  }
}));
