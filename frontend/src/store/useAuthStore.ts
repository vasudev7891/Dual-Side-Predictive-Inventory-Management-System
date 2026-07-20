import { create } from 'zustand';
import { supabase } from '../utils/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';

export type UserRole = 'supplier' | 'retailer';

export interface UserProfile {
  id: string;
  role: UserRole;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  signInWithOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  signInWithPassword: (email: string, password: string, selectedRole: UserRole) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (email: string, token: string, selectedRole: UserRole) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;
  updateProfile: (updates: { full_name?: string; company_name?: string; phone?: string; address?: string }) => Promise<{ success: boolean; error?: string }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  error: null,
  initialized: false,

  clearError: () => set({ error: null }),

  initialize: async () => {
    if (get().initialized) return;

    try {
      // 1. Get initial session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        set({ session, user: session.user, profile: profile as UserProfile || null });
      }

      // 2. Listen for auth changes
      supabase.auth.onAuthStateChange(async (_event, newSession) => {
        if (newSession) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newSession.user.id)
            .maybeSingle();

          set({ 
            session: newSession, 
            user: newSession.user, 
            profile: profile as UserProfile || null,
            loading: false 
          });
        } else {
          set({ session: null, user: null, profile: null, loading: false });
        }
      });

      set({ initialized: true, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false, initialized: true });
    }
  },

  signInWithOtp: async (email: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;
      set({ loading: false });
      return { success: true };
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return { success: false, error: err.message };
    }
  },

  signInWithPassword: async (email: string, password: string, selectedRole: UserRole) => {
    set({ loading: true, error: null });
    try {
      const { data: { session }, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!session) throw new Error('Failed to retrieve authentication session.');

      const user = session.user;

      const { data: existingProfile, error: profileFetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      let profile = existingProfile as UserProfile | null;

      if (profileFetchError) {
        throw new Error(`Profile fetch failed: ${profileFetchError.message}`);
      }

      if (!profile) {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            role: selectedRole,
            full_name: email.split('@')[0],
          })
          .select()
          .single();

        if (insertError) {
          throw new Error(`Profile creation failed: ${insertError.message}`);
        }
        profile = newProfile as UserProfile;
      }

      set({ 
        session, 
        user, 
        profile, 
        loading: false 
      });
      return { success: true };
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return { success: false, error: err.message };
    }
  },

  verifyOtp: async (email: string, token: string, selectedRole: UserRole) => {
    set({ loading: true, error: null });
    try {
      const { data: { session }, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) throw error;
      if (!session) throw new Error('Failed to retrieve authentication session.');

      const user = session.user;

      // Check if profile already exists
      const { data: existingProfile, error: profileFetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      let profile = existingProfile as UserProfile | null;

      if (profileFetchError) {
        throw new Error(`Profile fetch failed: ${profileFetchError.message}`);
      }

      if (!profile) {
        // Create new profile if it's first-time login
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            role: selectedRole,
            full_name: email.split('@')[0],
          })
          .select()
          .single();

        if (insertError) {
          throw new Error(`Profile creation failed: ${insertError.message}`);
        }
        profile = newProfile as UserProfile;
      }

      set({ session, user, profile, loading: false });
      return { success: true };
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return { success: false, error: err.message };
    }
  },

  signOut: async () => {
    set({ loading: true });
    try {
      await supabase.auth.signOut();
      set({ session: null, user: null, profile: null, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  updateProfile: async (updates) => {
    set({ loading: true, error: null });
    try {
      const user = get().user;
      if (!user) throw new Error('No active user session found.');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      set({ profile: data as UserProfile, loading: false });
      return { success: true };
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return { success: false, error: err.message };
    }
  },
}));
