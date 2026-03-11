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
  target_user_id: string | null;
  dice_result: { roll: number, type: string } | null;
  created_at: string;
  
  // Joined relations (optional, depends on query)
  chatroom_characters?: { name: string; advantage_status: string };
  character_sprites?: { name: string; image_url: string };
  profiles?: { username: string; role: string };
  target_profile?: { username: string };
}

interface MessageState {
  messages: MessageRecord[];
  isLoading: boolean;
  activeSubscription: RealtimeChannel | null;
  
  fetchMessages: (chatroomId: string, currentUserId: string) => Promise<void>;
  sendMessage: (payload: Partial<MessageRecord>) => Promise<boolean>;
  subscribeToMessages: (chatroomId: string, currentUserId: string) => void;
  unsubscribeFromMessages: () => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  isLoading: true,
  activeSubscription: null,

  fetchMessages: async (chatroomId: string, currentUserId: string) => {
    set({ isLoading: true });
    const supabase = createClient();
    
    // Fetch last 50 messages, including character and user details
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        chatroom_characters ( name, advantage_status ),
        character_sprites ( name, image_url ),
        profiles:sender_id ( username, role ),
        target_profile:target_user_id ( username )
      `)
      .eq('chatroom_id', chatroomId)
      .or(`target_user_id.is.null,target_user_id.eq.${currentUserId},sender_id.eq.${currentUserId}`)
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

  subscribeToMessages: (chatroomId: string, currentUserId: string) => {
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
                profiles:sender_id ( username, role ),
                target_profile:target_user_id ( username )
              `)
              .eq('id', payload.new.id)
              .single();
              
            if (!error && data) {
               // Only push to state if the message is public, or we are the target/sender
               const msg = data as unknown as MessageRecord;
               if (!msg.target_user_id || msg.target_user_id === currentUserId || msg.sender_id === currentUserId) {
                 set((state) => {
                   if (state.messages.some(m => m.id === msg.id)) return state;
                   return { messages: [...state.messages, msg] };
                 });
               }
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
