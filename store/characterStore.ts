import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';

export interface VaultCharacter {
  id: string;
  user_id: string;
  name: string;
  image_url: string;
  offensive_power?: string;
  defensive_power?: string;
  mana_amount?: string;
  mana_control?: string;
  physical_ability?: string;
  luck?: string;
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
  updateCharacterStatus: (charId: string, hp: number, mana: number) => Promise<boolean>;
  syncCharacterStats: (charId: string, vaultCharId: string) => Promise<boolean>;
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
      .select('id, user_id, name, image_url, offensive_power, defensive_power, mana_amount, mana_control, physical_ability, luck')
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
    
    // Calculate Max HP and Max Mana based on formulas
    const getBaseHp = (grade?: string) => {
      switch (grade) {
        case 'S': return 210; case 'A': return 195; case 'B': return 180;
        case 'C': return 145; case 'D': return 130; case 'E': return 115; case 'F': return 100;
        default: return 100;
      }
    };
    const getBonusHp = (grade?: string) => {
      switch (grade) {
        case 'S': return 40; case 'A': return 35; case 'B': return 30;
        case 'C': return 25; case 'D': return 20; case 'E': return 15; case 'F': return 10;
        default: return 10;
      }
    };
    const getMaxMana = (grade?: string) => {
      switch (grade) {
        case 'S': return 110; case 'A': return 100; case 'B': return 90;
        case 'C': return 80; case 'D': return 70; case 'E': return 60; case 'F': return 50;
        default: return 100;
      }
    };

    const maxHp = getBaseHp(vaultChar.physical_ability) + getBonusHp(vaultChar.defensive_power);
    const maxMana = getMaxMana(vaultChar.mana_amount);

    const newCharData = {
      chatroom_id: chatroomId,
      owner_id: userId,
      vault_character_id: vaultChar.id,
      name: vaultChar.name,
      hp: maxHp,
      max_hp: maxHp,
      mana: maxMana,
      max_mana: maxMana,
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
  updateCharacterStatus: async (charId: string, hp: number, mana: number) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('chatroom_characters')
      .update({ hp, mana })
      .eq('id', charId);

    if (error) {
      console.error('Error updating character status:', error);
      return false;
    }

    set(state => {
      if (state.activeChatroomCharacter?.id === charId) {
        const updatedChar = { ...state.activeChatroomCharacter, hp, mana };
        return {
          activeChatroomCharacter: updatedChar,
          myChatroomCharacters: state.myChatroomCharacters.map(c => c.id === charId ? updatedChar : c)
        };
      }
      return {
        myChatroomCharacters: state.myChatroomCharacters.map(c => c.id === charId ? { ...c, hp, mana } : c)
      };
    });
    return true;
  },
  syncCharacterStats: async (charId: string, vaultCharId: string) => {
    const supabase = createClient();
    
    // Fetch latest from vault
    const { data: vaultChar, error: fetchErr } = await supabase
      .from('characters')
      .select('offensive_power, defensive_power, mana_amount, mana_control, physical_ability, luck')
      .eq('id', vaultCharId)
      .single();

    if (fetchErr || !vaultChar) return false;

    // Calculate Max HP and Max Mana based on formulas
    const getBaseHp = (grade?: string) => {
      switch (grade) {
        case 'S': return 210; case 'A': return 195; case 'B': return 180;
        case 'C': return 145; case 'D': return 130; case 'E': return 115; case 'F': return 100;
        default: return 100;
      }
    };
    const getBonusHp = (grade?: string) => {
      switch (grade) {
        case 'S': return 40; case 'A': return 35; case 'B': return 30;
        case 'C': return 25; case 'D': return 20; case 'E': return 15; case 'F': return 10;
        default: return 10;
      }
    };
    const getMaxMana = (grade?: string) => {
      switch (grade) {
        case 'S': return 110; case 'A': return 100; case 'B': return 90;
        case 'C': return 80; case 'D': return 70; case 'E': return 60; case 'F': return 50;
        default: return 100;
      }
    };

    const maxHp = getBaseHp(vaultChar.physical_ability) + getBonusHp(vaultChar.defensive_power);
    const maxMana = getMaxMana(vaultChar.mana_amount);

    // Update in DB
    const { error: updateErr } = await supabase
      .from('chatroom_characters')
      .update({ max_hp: maxHp, max_mana: maxMana })
      .eq('id', charId);

    if (updateErr) return false;

    // Fast Forward in UI
    set(state => {
      if (state.activeChatroomCharacter?.id === charId) {
        const updatedChar = { ...state.activeChatroomCharacter, max_hp: maxHp, max_mana: maxMana };
        return {
          activeChatroomCharacter: updatedChar,
          myChatroomCharacters: state.myChatroomCharacters.map(c => c.id === charId ? updatedChar : c)
        };
      }
      return {
        myChatroomCharacters: state.myChatroomCharacters.map(c => c.id === charId ? { ...c, max_hp: maxHp, max_mana: maxMana } : c)
      };
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
