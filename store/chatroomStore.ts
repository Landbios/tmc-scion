import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';

export type RoleplayMode = 'free_roleplay' | 'combat' | 'turn_based';

export interface Chatroom {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  portrait_url: string | null;
  background_url?: string;
  roleplay_type: RoleplayMode;
  chatters_ids: string[];
  masters_ids: string[];
  resources: any[];
  turns: any[];
  created_at: string;
}

interface ChatroomsState {
  chatrooms: Chatroom[];
  isLoading: boolean;
  fetchChatrooms: () => Promise<void>;
  createChatroom: (data: Partial<Chatroom>) => Promise<Chatroom | null>;
  updateChatroom: (id: string, data: Partial<Chatroom>) => Promise<boolean>;
}

export const useChatroomsStore = create<ChatroomsState>((set, get) => ({
  chatrooms: [],
  isLoading: true,
  fetchChatrooms: async () => {
    set({ isLoading: true });
    const supabase = createClient();
    const { data, error } = await supabase
      .from('chatrooms')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      set({ chatrooms: data as Chatroom[], isLoading: false });
    } else {
      console.error('Error fetching chatrooms:', error);
      set({ isLoading: false });
    }
  },
  createChatroom: async (data) => {
    const supabase = createClient();
    const { data: newRoom, error } = await supabase
      .from('chatrooms')
      .insert([data])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating chatroom:', error);
      return null;
    }
    
    // Add to list
    set(state => ({ chatrooms: [newRoom, ...state.chatrooms] }));
    return newRoom as Chatroom;
  },
  updateChatroom: async (id, data) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('chatrooms')
      .update(data)
      .eq('id', id);
    
    if (error) {
      console.error('Error updating chatroom:', error);
      return false;
    }
    
    // Update local state
    set(state => ({
      chatrooms: state.chatrooms.map(room => room.id === id ? { ...room, ...data } : room)
    }));
    return true;
  }
}));
