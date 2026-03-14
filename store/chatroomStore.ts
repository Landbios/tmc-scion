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
  chat_type: string;
  status: 'pending' | 'approved' | 'rejected';
  proposal_note: string | null;
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
  updateRoomStatus: (id: string, status: 'approved' | 'rejected', note?: string) => Promise<boolean>;
}

export const useChatroomsStore = create<ChatroomsState>((set, get) => ({
  chatrooms: [],
  isLoading: true,
  fetchChatrooms: async () => {
    set({ isLoading: true });
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get profile to check role
    let role = 'roleplayer';
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (profile) role = profile.role;
    }

    let query = supabase.from('chatrooms').select('*');

    // Filter logic:
    // 1. Staff see everything.
    // 2. Regular users see only 'approved'.
    // 3. Regular users ALSO see their own rooms (even if pending/rejected).
    if (role !== 'staff' && role !== 'superadmin') {
      if (user) {
        query = query.or(`status.eq.approved,creator_id.eq.${user.id}`);
      } else {
        query = query.eq('status', 'approved');
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (!error && data) {
      set({ chatrooms: data as Chatroom[], isLoading: false });
    } else {
      console.error('Error fetching chatrooms:', error);
      set({ isLoading: false });
    }
  },
  createChatroom: async (data) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Check if user is staff to auto-approve
    let role = 'roleplayer';
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (profile) role = profile.role;
    }

    const roomData = {
      ...data,
      status: (role === 'staff' || role === 'superadmin') ? 'approved' : 'pending'
    };

    const { data: newRoom, error } = await supabase
      .from('chatrooms')
      .insert([roomData])
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
  },
  updateRoomStatus: async (id, status, note) => {
    const supabase = createClient();
    const updateData: Partial<Chatroom> = { status };
    if (note !== undefined) updateData.proposal_note = note;
    
    const { error } = await supabase
      .from('chatrooms')
      .update(updateData)
      .eq('id', id);
    
    if (error) {
      console.error('Error updating room status:', error);
      return false;
    }
    
    // Update local state
    set(state => ({
      chatrooms: state.chatrooms.map(room => room.id === id ? { ...room, ...updateData } : room)
    }));
    return true;
  }
}));
