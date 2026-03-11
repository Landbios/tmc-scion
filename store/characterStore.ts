import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';

export interface VaultCharacter {
  id: string;
  user_id: string;
  name: string;
  image_url: string;
  hp?: number; // These will be used for chatroom instances
  mana?: number;
}

export interface ChatroomCharacter {
  id: string;
  chatroom_id: string;
  owner_id: string;
  vault_character_id: string;
  name: string;
  hp: number;
  max_hp: number;
  mana: number;
  max_mana: number;
  advantage_status: string;
  default_sprite_id: string | null;
}

export interface CharacterSprite {
  id: string;
  character_id: string;
  name: string;
  image_url: string;
  tag: string | null;
}

interface CharacterState {
  vaultCharacters: VaultCharacter[];
  myChatroomCharacters: ChatroomCharacter[];
  activeChatroomCharacter: ChatroomCharacter | null;
  activeCharacterSprites: CharacterSprite[];
  isLoading: boolean;
  fetchVaultCharacters: (userId: string) => Promise<void>;
  fetchCharacterSprites: (vaultCharId: string) => Promise<void>;
  checkJoinedStatus: (chatroomId: string, userId: string) => Promise<boolean>;
  joinChatroom: (chatroomId: string, userId: string, vaultChar: VaultCharacter) => Promise<boolean>;
  leaveChatroom: (chatroomId: string, userId: string) => Promise<boolean>;
  setActiveCharacter: (charId: string) => void;
  addSprite: (vaultCharId: string, name: string, imageUrl: string) => Promise<boolean>;
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  vaultCharacters: [],
  myChatroomCharacters: [],
  activeChatroomCharacter: null,
  activeCharacterSprites: [],
  isLoading: true,
  fetchVaultCharacters: async (userId) => {
    set({ isLoading: true });
    const supabase = createClient();
    const { data, error } = await supabase
      .from('characters')
      .select('id, user_id, name, image_url')
      .eq('user_id', userId);

    if (!error && data) {
      set({ vaultCharacters: data as VaultCharacter[], isLoading: false });
    } else {
      console.error('Error fetching vault characters:', error);
      set({ isLoading: false });
    }
  },
  fetchCharacterSprites: async (vaultCharId) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('character_sprites')
      .select('*')
      .eq('character_id', vaultCharId);

    if (!error && data) {
      set({ activeCharacterSprites: data as CharacterSprite[] });
    }
  },
  checkJoinedStatus: async (chatroomId, userId) => {
    set({ isLoading: true });
    const supabase = createClient();
    const { data, error } = await supabase
      .from('chatroom_characters')
      .select('*')
      .eq('chatroom_id', chatroomId)
      .eq('owner_id', userId);

    if (!error && data && data.length > 0) {
      const chars = data as ChatroomCharacter[];
      const firstChar = chars[0];
      // Fetch sprites if found
      if (firstChar.vault_character_id) {
        get().fetchCharacterSprites(firstChar.vault_character_id);
      }
      set({ myChatroomCharacters: chars, activeChatroomCharacter: firstChar, isLoading: false });
      return true;
    }
    
    set({ myChatroomCharacters: [], activeChatroomCharacter: null, isLoading: false });
    return false;
  },
  joinChatroom: async (chatroomId, userId, vaultChar) => {
    set({ isLoading: true });
    const supabase = createClient();
    
    const newCharData = {
      chatroom_id: chatroomId,
      owner_id: userId,
      vault_character_id: vaultChar.id,
      name: vaultChar.name,
      hp: 100,
      max_hp: 100,
      mana: 100,
      max_mana: 100,
      advantage_status: 'normal',
    };

    const { data, error } = await supabase
      .from('chatroom_characters')
      .insert([newCharData])
      .select()
      .single();

    if (error) {
      console.error('Error joining chatroom:', error);
      set({ isLoading: false });
      return false;
    }

    if (vaultChar.id) {
      get().fetchCharacterSprites(vaultChar.id);
    }
    const charData = data as ChatroomCharacter;
    set(state => ({ 
      myChatroomCharacters: [...state.myChatroomCharacters, charData],
      activeChatroomCharacter: charData, 
      isLoading: false 
    }));
    return true;
  },
  leaveChatroom: async (chatroomId, userId) => {
    set({ isLoading: true });
    const supabase = createClient();
    
    // Attempt deleting all records for this user in the specified chatroom
    const { error } = await supabase
      .from('chatroom_characters')
      .delete()
      .eq('chatroom_id', chatroomId)
      .eq('owner_id', userId);

    if (error) {
      console.error('Error leaving chatroom:', error);
      set({ isLoading: false });
      return false;
    }

    set({ 
      myChatroomCharacters: [],
      activeChatroomCharacter: null, 
      isLoading: false 
    });
    return true;
  },
  setActiveCharacter: (charId: string) => {
    const { myChatroomCharacters, fetchCharacterSprites } = get();
    const char = myChatroomCharacters.find(c => c.id === charId);
    if (char) {
      if (char.vault_character_id) {
        fetchCharacterSprites(char.vault_character_id);
      }
      set({ activeChatroomCharacter: char });
    }
  },
  addSprite: async (vaultCharId: string, name: string, imageUrl: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('character_sprites').insert([{
      character_id: vaultCharId,
      name,
      image_url: imageUrl
    }]);
    if (!error) {
       get().fetchCharacterSprites(vaultCharId);
       return true;
    }
    console.error('Error adding sprite:', error);
    return false;
  }
}));
