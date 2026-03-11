import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface MessageRecord {
  id: string;
  chatroom_id: string;
  sender_id: string;
  character_id: string | null;
  sprite_id: string | null;
  content: string;
  is_system_message: boolean;
  is_dm_whisper: boolean;
  dice_result: { roll: number, type: string } | null;
  created_at: string;
  
  // Joined relations (optional, depends on query)
  chatroom_characters?: { name: string; advantage_status: string };
  character_sprites?: { name: string; image_url: string };
  profiles?: { username: string; role: string };
}

interface MessageState {
  messages: MessageRecord[];
  isLoading: boolean;
  activeSubscription: RealtimeChannel | null;
  
  fetchMessages: (chatroomId: string) => Promise<void>;
  sendMessage: (payload: Partial<MessageRecord>) => Promise<boolean>;
  subscribeToMessages: (chatroomId: string) => void;
  unsubscribeFromMessages: () => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  isLoading: true,
  activeSubscription: null,

  fetchMessages: async (chatroomId: string) => {
    set({ isLoading: true });
    const supabase = createClient();
    
    // Fetch last 50 messages, including character and user details
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        chatroom_characters ( name, advantage_status ),
        character_sprites ( name, image_url ),
        profiles:sender_id ( username, role )
      `)
      .eq('chatroom_id', chatroomId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (!error && data) {
      set({ messages: data as unknown as MessageRecord[], isLoading: false });
    } else {
      console.error('Error fetching messages:', error);
      set({ isLoading: false });
    }
  },

  sendMessage: async (payload: Partial<MessageRecord>) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('messages')
      .insert([payload]);

    if (error) {
      console.error('Error sending message:', error);
      return false;
    }
    
    // We don't push to local state manually here because the Realtime subscription 
    // will pick it up and append it, preventing duplicates.
    return true;
  },

  subscribeToMessages: (chatroomId: string) => {
    const supabase = createClient();
    
    // Cleanup existing subs just in case
    get().unsubscribeFromMessages();

    const channel = supabase
      .channel(`room:${chatroomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chatroom_id=eq.${chatroomId}`,
        },
        async (payload) => {
          // Add a slight delay to allow Postgres to fully commit related rows before we query them
          setTimeout(async () => {
            const { data, error } = await supabase
              .from('messages')
              .select(`
                *,
                chatroom_characters ( name, advantage_status ),
                character_sprites ( name, image_url ),
                profiles:sender_id ( username, role )
              `)
              .eq('id', payload.new.id)
              .single();
              
            if (!error && data) {
               set((state) => {
                 if (state.messages.some(m => m.id === data.id)) return state;
                 return { messages: [...state.messages, data as unknown as MessageRecord] };
               });
            }
          }, 300); // 300ms delay
        }
      )
      .subscribe();

    set({ activeSubscription: channel });
  },

  unsubscribeFromMessages: () => {
    const { activeSubscription } = get();
    if (activeSubscription) {
      createClient().removeChannel(activeSubscription);
      set({ activeSubscription: null });
    }
  }
}));
