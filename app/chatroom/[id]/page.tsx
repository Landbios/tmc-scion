'use client';

import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { useAuthStore, Profile } from '@/store/authStore';
import { useCharacterStore, CharacterSprite } from '@/store/characterStore';
import { useMessageStore } from '@/store/messageStore';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { maskEmail } from '@/lib/utils';
import { 
  ChevronLeft, 
  MoreVertical, 
  Send, 
  Dices, 
  SkipForward, 
  FolderOpen, 
  Clock, 
  X, 
  Map, 
  Info,
  User,
  Plus,
  MessageSquare,
  ImagePlus,
  RefreshCw,
  Maximize2,
  Trash2,
  Pencil,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import Image from 'next/image';
import ImageUploader from '@/components/ImageUploader';

// --- Subcomponents ---

const Message = memo(({ sender, time, text, color, isWhisper, targetName }: { sender: string, time: string, text: string, color?: string, isWhisper?: boolean, targetName?: string }) => (
  <div className={`bg-[var(--surface-alt)] border ${isWhisper ? 'border-[var(--glow)] shadow-inner' : 'border-[var(--border-light)]'} rounded-sm p-3 relative`}>
    <div className="flex justify-between items-baseline mb-1">
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold ${color || 'text-[var(--accent)]'}`}>{sender}</span>
        {isWhisper && <span className="text-[9px] px-1.5 py-0.5 bg-[var(--glow)]/10 text-[var(--glow)] border border-[var(--glow)]/30 rounded-sm font-mono uppercase">Susurrando a {targetName || 'Alguien'}</span>}
      </div>
      <span className="mono-label">{time}</span>
    </div>
    <p className={`text-sm ${isWhisper ? 'text-[var(--glow)]/90 italic' : 'text-[var(--text)]'}`}>{text}</p>
  </div>
));
Message.displayName = 'Message';

const DiceMessage = memo(({ sender, time, text, result, color }: { sender: string, time: string, text: string, result: string, color?: string }) => (
  <div className="bg-[var(--surface-alt)] border border-[var(--border-light)] rounded-sm p-3">
    <div className="flex justify-between items-baseline mb-1">
      <span className={`text-xs font-bold ${color || 'text-[var(--accent)]'}`}>{sender}</span>
      <span className="mono-label">{time}</span>
    </div>
    <div className="flex items-center justify-between mt-2">
      <span className="text-sm text-[var(--text)]">{text}</span>
      <div className="flex items-center gap-1.5 bg-[var(--surface)] border border-[var(--accent)]/30 px-2 py-1 rounded-sm text-xs font-mono">
        <span className="text-[var(--accent)] font-bold">{result}</span>
      </div>
    </div>
  </div>
));
DiceMessage.displayName = 'DiceMessage';

const TurnItem = ({ name, status, initiative, isActive = false }: { name: string, status: string, initiative: string, isActive?: boolean }) => (
  <div className={`flex items-center justify-between p-2.5 rounded-sm border ${isActive ? 'bg-[var(--accent)]/10 border-[var(--accent)]' : 'bg-[var(--surface-alt)] border-[var(--border-light)]'}`}>
    <div className="flex items-center gap-2">
      <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[var(--glow)] shadow-[0_0_8px_var(--glow)]' : 'bg-[var(--border)]'}`}></div>
      <span className={`text-xs font-medium ${isActive ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>{name}</span>
    </div>
    <div className="flex items-center gap-3">
      <span className="mono-label">{status}</span>
      <span className={`text-xs font-mono font-bold ${isActive ? 'text-[var(--glow)]' : 'text-[var(--text-muted)]'}`}>({initiative})</span>
    </div>
  </div>
);

const DocItem = ({ title }: { title: string }) => (
  <button className="w-full flex items-center justify-between p-2.5 bg-[var(--surface-alt)] hover:bg-[var(--border)] border border-[var(--border-light)] rounded-sm text-left transition-colors group">
    <span className="text-xs text-[var(--text)] font-mono group-hover:text-[var(--glow)] transition-colors">{title}</span>
    <Info size={14} className="text-[var(--text-muted)] group-hover:text-[var(--glow)] transition-colors" />
  </button>
);

// --- Main Component ---

export default function ChatroomPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const user = useAuthStore(state => state.user);
  const profile = useAuthStore(state => state.profile);

  const myChatroomCharacters = useCharacterStore(state => state.myChatroomCharacters);
  const activeChatroomCharacter = useCharacterStore(state => state.activeChatroomCharacter);
  const activeCharacterSprites = useCharacterStore(state => state.activeCharacterSprites);
  const vaultCharacters = useCharacterStore(state => state.vaultCharacters);
  const isCharLoading = useCharacterStore(state => state.isLoading);
  const checkJoinedStatus = useCharacterStore(state => state.checkJoinedStatus);
  const joinChatroom = useCharacterStore(state => state.joinChatroom);
  const leaveChatroom = useCharacterStore(state => state.leaveChatroom);
  const fetchVaultCharacters = useCharacterStore(state => state.fetchVaultCharacters);
  const setActiveCharacter = useCharacterStore(state => state.setActiveCharacter);
  const updateCharacterStatus = useCharacterStore(state => state.updateCharacterStatus);
  const addSprite = useCharacterStore(state => state.addSprite);
  const updateSprite = useCharacterStore(state => state.updateSprite);
  const deleteSprite = useCharacterStore(state => state.deleteSprite);
  const syncCharacterStats = useCharacterStore(state => state.syncCharacterStats);
  const authLoading = useAuthStore(state => state.isLoading);

  // Auth Protection Redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const [isChecking, setIsChecking] = useState(true);

  const [isTurnOrderOpen, setIsTurnOrderOpen] = useState(false);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
  const [isRoomDetailsOpen, setIsRoomDetailsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAddCharacterModalOpen, setIsAddCharacterModalOpen] = useState(false);
  const [isSpriteModalOpen, setIsSpriteModalOpen] = useState(false);
  const [editingSpriteId, setEditingSpriteId] = useState<string | null>(null);
  const [isEditStatusModalOpen, setIsEditStatusModalOpen] = useState(false);
  const [editHp, setEditHp] = useState(0);
  const [editMana, setEditMana] = useState(0);
  const [editName, setEditName] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isBgmReady, setIsBgmReady] = useState(false);
  
  // Masters search/add
  const [newMasterId, setNewMasterId] = useState('');
  const [isAddingMaster, setIsAddingMaster] = useState(false);
  const [staffProfiles, setStaffProfiles] = useState<Profile[]>([]);
  const [isFetchingStaff, setIsFetchingStaff] = useState(false);
  const [newSpriteName, setNewSpriteName] = useState('');
  const [newSpriteUrl, setNewSpriteUrl] = useState('');
  const [newSpriteScale, setNewSpriteScale] = useState(1.0);
  const [newSpritePositionY, setNewSpritePositionY] = useState(0.0);
  const [bgmInput, setBgmInput] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isUploadingSprite, setIsUploadingSprite] = useState(false);
  
  // Multi-Dice State
  const [isDiceModalOpen, setIsDiceModalOpen] = useState(false);
  const [diceAmount, setDiceAmount] = useState(1);
  const [diceSides, setDiceSides] = useState(100);
  
  const messages = useMessageStore(state => state.messages);
  const fetchMessages = useMessageStore(state => state.fetchMessages);
  const loadMoreMessages = useMessageStore(state => state.loadMoreMessages);
  const hasMoreMessages = useMessageStore(state => state.hasMoreMessages);
  const isLoadingMore = useMessageStore(state => state.isLoadingMore);
  const subscribeToMessages = useMessageStore(state => state.subscribeToMessages);
  const unsubscribeFromMessages = useMessageStore(state => state.unsubscribeFromMessages);
  const sendMessage = useMessageStore(state => state.sendMessage);
  const activeSubscription = useMessageStore(state => state.activeSubscription);

  const [messageInput, setMessageInput] = useState('');
  const [selectedSpriteId, setSelectedSpriteId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  interface ChatroomResource {
    id: string;
    type: 'image' | 'text' | 'map' | 'enemy' | 'item';
    title: string;
    content: string; // Description or main content/URL
    image_url?: string;
    
    // For Enemy
    hp?: number;
    mana?: number;
    offensive_power?: string;
    defensive_power?: string;
    physical_ability?: string;
    luck?: string;
    creator?: string; // mapped to "user"
    blaze?: string;
    advanced_element?: string;
    
    // For Item
    item_type?: string;
    stats?: string;
    effect?: string;
  }

  interface TurnCharacter {
    character_id: string;
    name: string;
    initiative: number;
  }

  interface TurnGroup {
    id: string;
    name: string;
    deadline_text?: string;
    active_character_id: string | null;
    characters: TurnCharacter[];
  }

  interface BgmState {
    playing: boolean;
    time: number;
    timestamp: string | null;
  }

  interface ChatroomData {
    id: string;
    title: string;
    description: string | null;
    background_url?: string;
    creator_id?: string;
    creator_username?: string;
    masters_ids?: string[];
    chatters_ids?: string[];
    chat_type?: string;
    roleplay_type?: string;
    resources?: ChatroomResource[];
    turns?: TurnGroup[];
    bgm_url?: string;
    bgm_state?: BgmState;
  }

  const [chatroomData, setChatroomData] = useState<ChatroomData | null>(null);

  // Whisper / Target state
  const [chatters, setChatters] = useState<{id: string, username: string}[]>([]);
  const [selectedTargetUserId, setSelectedTargetUserId] = useState<string | null>(null);

  // Resource State
  const [isAddResourceModalOpen, setIsAddResourceModalOpen] = useState(false);
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceType, setNewResourceType] = useState<'image' | 'text' | 'map' | 'enemy' | 'item'>('image');
  const [newResourceContent, setNewResourceContent] = useState('');
  const [newResourceImageUrl, setNewResourceImageUrl] = useState('');
  const [newResourceHp, setNewResourceHp] = useState(0);
  const [newResourceMana, setNewResourceMana] = useState(0);
  const [newResourceOffensive, setNewResourceOffensive] = useState('');
  const [newResourceDefensive, setNewResourceDefensive] = useState('');
  const [newResourcePhysical, setNewResourcePhysical] = useState('');
  const [newResourceLuck, setNewResourceLuck] = useState('');
  const [newResourceCreator, setNewResourceCreator] = useState('');
  const [newResourceBlaze, setNewResourceBlaze] = useState('');
  const [newResourceElement, setNewResourceElement] = useState('');
  const [newResourceItemType, setNewResourceItemType] = useState('');
  const [newResourceStats, setNewResourceStats] = useState('');
  const [newResourceEffect, setNewResourceEffect] = useState('');
  const [isUploadingResource, setIsUploadingResource] = useState(false);

  // Turns State
  const [isManageTurnsModalOpen, setIsManageTurnsModalOpen] = useState(false);
  const [availableRoomCharacters, setAvailableRoomCharacters] = useState<{id: string, name: string}[]>([]);
  const [editableTurns, setEditableTurns] = useState<TurnGroup[]>([]);

  const handleOpenManageTurns = useCallback(() => {
    if (chatroomData) {
      setEditableTurns(chatroomData.turns ? JSON.parse(JSON.stringify(chatroomData.turns)) : []);
    }
    const fetchChars = async () => {
      const supabase = createClient();
      const { data } = await supabase.from('chatroom_characters').select('id, name').eq('chatroom_id', id);
      if (data) setAvailableRoomCharacters(data);
    };
    fetchChars();
    setIsManageTurnsModalOpen(true);
  }, [chatroomData, id]);

  const isMaster = myChatroomCharacters.some(c => c.name === 'TMC: Master');

  const handleAddResource = useCallback(async () => {
    if (!chatroomData || !newResourceTitle) return;
    setIsUploadingResource(true);
    
    const newResource: ChatroomResource = {
      id: crypto.randomUUID(),
      type: newResourceType,
      title: newResourceTitle,
      content: newResourceContent,
      image_url: newResourceImageUrl,
      ...(newResourceType === 'enemy' ? {
         hp: newResourceHp,
         mana: newResourceMana,
         offensive_power: newResourceOffensive,
         defensive_power: newResourceDefensive,
         physical_ability: newResourcePhysical,
         luck: newResourceLuck,
         creator: newResourceCreator,
         blaze: newResourceBlaze,
         advanced_element: newResourceElement
      } : {}),
      ...(newResourceType === 'item' ? {
         item_type: newResourceItemType,
         stats: newResourceStats,
         effect: newResourceEffect
      } : {})
    };
    
    const updatedResources = [...(chatroomData.resources || []), newResource];
    
    const supabase = createClient();
    const { error } = await supabase.from('chatrooms').update({ resources: updatedResources }).eq('id', chatroomData.id);
    
    if (!error) {
      setChatroomData({ ...chatroomData, resources: updatedResources });
      setIsAddResourceModalOpen(false);
      
      // Reset states
      setNewResourceTitle('');
      setNewResourceContent('');
      setNewResourceImageUrl('');
      setNewResourceHp(0);
      setNewResourceMana(0);
      setNewResourceOffensive('');
      setNewResourceDefensive('');
      setNewResourcePhysical('');
      setNewResourceLuck('');
      setNewResourceCreator('');
      setNewResourceBlaze('');
      setNewResourceElement('');
      setNewResourceItemType('');
      setNewResourceStats('');
      setNewResourceEffect('');
    } else {
      alert('Error guardando el recurso.');
    }
    setIsUploadingResource(false);
  }, [chatroomData, newResourceTitle, newResourceType, newResourceContent, newResourceImageUrl, newResourceHp, newResourceMana, newResourceOffensive, newResourceDefensive, newResourcePhysical, newResourceLuck, newResourceCreator, newResourceBlaze, newResourceElement, newResourceItemType, newResourceStats, newResourceEffect]);

  const handleSaveSprite = useCallback(async () => {
    if (!activeChatroomCharacter?.vault_character_id || !newSpriteName || !newSpriteUrl) return;
    setIsUploadingSprite(true);
    
    let success = false;
    if (editingSpriteId) {
      success = await updateSprite(editingSpriteId, {
        name: newSpriteName,
        image_url: newSpriteUrl,
        scale: newSpriteScale,
        position_y: newSpritePositionY
      });
    } else {
      success = await addSprite(
        activeChatroomCharacter.vault_character_id, 
        newSpriteName, 
        newSpriteUrl,
        newSpriteScale,
        newSpritePositionY
      );
    }

    if (success) {
      setIsSpriteModalOpen(false);
      setNewSpriteName('');
      setNewSpriteUrl('');
      setNewSpriteScale(1.0);
      setNewSpritePositionY(0.0);
      setEditingSpriteId(null);
      
      // Auto-select the newly added sprite if adding
      if (!editingSpriteId) {
        setTimeout(() => {
          const sprites = useCharacterStore.getState().activeCharacterSprites;
          if (sprites.length > 0) {
             setSelectedSpriteId(sprites[sprites.length - 1].id);
          }
        }, 500);
      }
    } else {
      alert("Error al guardar el sprite.");
    }
    setIsUploadingSprite(false);
  }, [activeChatroomCharacter, newSpriteName, newSpriteUrl, editingSpriteId, updateSprite, addSprite, newSpriteScale, newSpritePositionY]);

  const handleDeleteSprite = useCallback(async (spriteId: string) => {
    if (confirm("¿Seguro que deseas eliminar este sprite?")) {
       await deleteSprite(spriteId);
       if (selectedSpriteId === spriteId) setSelectedSpriteId(null);
    }
  }, [deleteSprite, selectedSpriteId]);

  const openEditSprite = useCallback((sprite: CharacterSprite) => {
    setEditingSpriteId(sprite.id);
    setNewSpriteName(sprite.name);
    setNewSpriteUrl(sprite.image_url);
    setNewSpriteScale(sprite.scale ?? 1.0);
    setNewSpritePositionY(sprite.position_y ?? 0.0);
    setIsSpriteModalOpen(true);
  }, []);

  const openAddSprite = useCallback(() => {
    setEditingSpriteId(null);
    setNewSpriteName('');
    setNewSpriteUrl('');
    setNewSpriteScale(1.0);
    setNewSpritePositionY(0.0);
    setIsSpriteModalOpen(true);
  }, []);

  const handleOpenEditStatus = useCallback(() => {
    if (!activeChatroomCharacter) return;
    setEditHp(activeChatroomCharacter.hp);
    setEditMana(activeChatroomCharacter.mana);
    setEditName(activeChatroomCharacter.name);
    setIsEditStatusModalOpen(true);
  }, [activeChatroomCharacter]);

  const handleSaveStatus = useCallback(async () => {
    if (!activeChatroomCharacter) return;
    
    // Check if name changed
    if (editName !== activeChatroomCharacter.name) {
      const supabase = createClient();
      await supabase.from('chatroom_characters').update({ name: editName }).eq('id', activeChatroomCharacter.id);
    }

    const success = await updateCharacterStatus(activeChatroomCharacter.id, editHp, editMana);
    if (success) {
      setIsEditStatusModalOpen(false);
    } else {
      alert("Hubo un error al actualizar el estado.");
    }
  }, [activeChatroomCharacter, editName, editHp, editMana, updateCharacterStatus]);

  const handleAddMaster = useCallback(async () => {
    if (!newMasterId || !chatroomData) return;
    setIsAddingMaster(true);
    const supabase = createClient();
    
    // Check if user exists
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', newMasterId).single();
    if (!profile) {
      alert('Usuario no encontrado. Asegúrate de que el ID es correcto.');
      setIsAddingMaster(false);
      return;
    }

    const currentMasters = chatroomData.masters_ids || [];
    if (currentMasters.includes(newMasterId)) {
      alert('El usuario ya es master de esta sala.');
      setIsAddingMaster(false);
      return;
    }

    const updatedMasters = [...currentMasters, newMasterId];
    const { error } = await supabase
      .from('chatrooms')
      .update({ masters_ids: updatedMasters })
      .eq('id', chatroomData.id);

    if (!error) {
      setNewMasterId('');
    } else {
      console.error('Error adding master:', error);
    }
    setIsAddingMaster(false);
  }, [newMasterId, chatroomData]);

  const handleRemoveMaster = useCallback(async (masterId: string) => {
    if (!chatroomData) return;
    const updatedMasters = (chatroomData.masters_ids || []).filter(id => id !== masterId);
    const supabase = createClient();
    await supabase.from('chatrooms').update({ masters_ids: updatedMasters }).eq('id', chatroomData.id);
  }, [chatroomData]);

  const handleUpdateChatType = useCallback(async (type: string) => {
    if (!chatroomData) return;
    const supabase = createClient();
    await supabase.from('chatrooms').update({ chat_type: type }).eq('id', chatroomData.id);
  }, [chatroomData]);

  const handleSyncStats = useCallback(async () => {
    if (!activeChatroomCharacter?.vault_character_id) return;
    setIsSyncing(true);
    const success = await syncCharacterStats(activeChatroomCharacter.id, activeChatroomCharacter.vault_character_id);
    if (success) {
      // Re-initialize local state so forms show new max immediately if we stay open
      const updatedChar = useCharacterStore.getState().activeChatroomCharacter;
      if (updatedChar) {
        setEditHp(updatedChar.hp);
        setEditMana(updatedChar.mana);
      }
      alert("¡Estadísticas sincronizadas exitosamente desde el Character Vault!");
    } else {
      alert("Error al intentar sincronizar estadísticas.");
    }
    setIsSyncing(false);
  }, [activeChatroomCharacter, syncCharacterStats]);


  // Set default selected sprite when sprites load or character changes
  useEffect(() => {
    if (activeCharacterSprites.length > 0) {
       const isValid = activeCharacterSprites.some(s => s.id === selectedSpriteId);
       if (!isValid) {
         // Use a small delay or non-sync update to avoid cascading render lint
         const nextId = activeCharacterSprites[0].id;
         setTimeout(() => {
           setSelectedSpriteId(nextId);
         }, 0);
       }
    } else if (selectedSpriteId !== null) {
       setTimeout(() => {
         setSelectedSpriteId(null);
       }, 0);
    }
  }, [activeCharacterSprites, selectedSpriteId]);

  // Chatroom Setup & Data Sync
  useEffect(() => {
    if (!user || !id) return;
    let isMounted = true;
    const supabase = createClient();

    // Fetch specific chatroom data safely inline
    const fetchChatroomData = async () => {
      const { data, error } = await supabase
        .from('chatrooms')
        .select('*, creator:profiles!chatrooms_creator_id_fkey(username, id)')
        .eq('id', id)
        .single();
      if (data && isMounted) {
        setChatroomData({
          id: data.id,
          title: data.title,
          description: data.description,
          background_url: data.background_url,
          creator_id: data.creator_id,
          creator_username: data.creator?.username,
          masters_ids: data.masters_ids || [],
          chatters_ids: data.chatters_ids || [],
          chat_type: data.chat_type || 'Recreativo',
          roleplay_type: data.roleplay_type || 'free_roleplay',
          bgm_url: data.bgm_url,
          resources: data.resources || [],
          turns: data.turns || [],
          bgm_state: data.bgm_state || { playing: false, time: 0, timestamp: null }
        });
      }
    };
    fetchChatroomData();

    // Fetch chatters for whisper targeting
    const fetchChattersForMaster = async () => {
      const { data } = await supabase.from('chatrooms').select('chatters_ids').eq('id', id).single();
      if(data && data.chatters_ids && data.chatters_ids.length > 0) {
         const { data: users } = await supabase.from('profiles').select('id, username').in('id', data.chatters_ids);
         if(users && isMounted) setChatters(users);
      }
    };
    fetchChattersForMaster();

    // Setup realtime subscription for resources and turns
    const subscription = supabase
      .channel(`chatroom-${id}-data`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chatrooms',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          if (isMounted && payload.new) {
            setChatroomData(prev => ({
              ...prev,
              id: payload.new.id,
              title: payload.new.title,
              description: payload.new.description,
              background_url: payload.new.background_url,
              creator_id: payload.new.creator_id,
              masters_ids: payload.new.masters_ids || [],
              chatters_ids: payload.new.chatters_ids || [],
              chat_type: payload.new.chat_type || 'Recreativo',
              roleplay_type: payload.new.roleplay_type || 'free_roleplay',
              bgm_url: payload.new.bgm_url,
              resources: payload.new.resources || [],
              turns: payload.new.turns || [],
              bgm_state: payload.new.bgm_state || { playing: false, time: 0, timestamp: null }
            }));
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(subscription);
    };
  }, [id, user]);

  // Initial Join Check & Messages Subscription
  useEffect(() => {
    if (!user || !id) return;
    let isMounted = true;

    const initRoom = async () => {
      if (useMessageStore.getState().activeSubscription) {
        unsubscribeFromMessages();
      }
      
      subscribeToMessages(id as string, user.id);
      fetchMessages(id as string, user.id); // Always fetch messages on init
      
      // Check if user has joined the room with any character
      const hasJoined = await checkJoinedStatus(id as string, user.id);
      
      // If not joined, or if the active character is no longer valid, prompt to join/select
      if (!hasJoined && isMounted) {
        // Use getState to check if we already have vault characters to avoid unnecessary fetches
        if (useCharacterStore.getState().vaultCharacters.length === 0) {
          await fetchVaultCharacters(user.id);
        }
      }
      
      if (isMounted) setIsChecking(false);
    };

    initRoom();

    return () => {
      isMounted = false;
    };
  }, [id, user, subscribeToMessages, fetchMessages, checkJoinedStatus, fetchVaultCharacters, unsubscribeFromMessages]);

  // When successfully joined from the modal, we must sub and fetch
  const handleJoin = useCallback(async (char: any) => {
    if (!id || !user) return;
    const success = await joinChatroom(id as string, user.id, char);
    if (success) {
      setIsAddCharacterModalOpen(false);
      
      // Update chatters_ids in chatrooms table
      const supabase = createClient();
      
      // We need to fetch current chatters_ids first to avoid overwriting or duplicates
      const { data: roomData } = await supabase.from('chatrooms').select('chatters_ids').eq('id', id).single();
      const existingChatters = roomData?.chatters_ids || [];
      
      if (!existingChatters.includes(user.id)) {
        await supabase.from('chatrooms')
          .update({ chatters_ids: [...existingChatters, user.id] })
          .eq('id', id);
      }

      // Fetch and sub only if we weren't already in the room
      if (myChatroomCharacters.length === 0) {
        fetchMessages(id as string, user.id);
        subscribeToMessages(id as string, user.id);
      }
    }
  }, [id, user, joinChatroom, myChatroomCharacters.length, fetchMessages, subscribeToMessages]);

  useEffect(() => {
    if (isHistoryOpen && messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [messages, isHistoryOpen]);

  // Performance Optimization: Memoize VN Data
  const vnData = useMemo(() => {
    if (messages.length === 0) return null;
    const lastMsg = messages[messages.length - 1];
    const speakerName = lastMsg.chatroom_characters?.name || lastMsg.profiles?.username || 'Sistema';
    const isSystem = lastMsg.is_system_message;

    // Find the most recent non-system message before the current one from a DIFFERENT character
    const prevMsg = [...messages].reverse().find(m => 
      m.character_id && 
      m.character_id !== lastMsg.character_id && 
      !m.is_system_message
    );

    return { lastMsg, speakerName, isSystem, prevMsg };
  }, [messages]);

  const handleLeaveRoom = useCallback(async () => {
    if (!user || !id) return;
    if (confirm("¿Estás seguro de que deseas abandonar esta sala? Tus personajes registrados en esta instancia serán retirados.")) {
      const success = await leaveChatroom(id as string, user.id);
      if (success) {
        router.push('/dashboard');
      } else {
        alert('Hubo un error al intentar abandonar la sala.');
      }
    }
  }, [user, id, leaveChatroom, router]);

  const handlePassTurn = useCallback(async () => {
    if (!activeChatroomCharacter || !chatroomData?.turns || !user || !id) return;
    
    let modified = false;
    const newTurns = JSON.parse(JSON.stringify(chatroomData.turns)) as TurnGroup[];
    
    for (const group of newTurns) {
       if (group.active_character_id === activeChatroomCharacter.id) {
          const chars = group.characters;
          const myIndex = chars.findIndex(c => c.character_id === activeChatroomCharacter.id);
          if (myIndex !== -1) {
             const nextIndex = (myIndex + 1) % chars.length;
             group.active_character_id = chars[nextIndex].character_id;
             modified = true;
          }
       }
    }

    if (modified) {
       const supabase = createClient();
       const { error } = await supabase.from('chatrooms').update({ turns: newTurns }).eq('id', chatroomData.id);
       if (!error) {
          setChatroomData({ ...chatroomData, turns: newTurns });
       }
    }
  }, [activeChatroomCharacter, chatroomData, user, id, sendMessage]);

  const handleSendMessage = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() || !activeChatroomCharacter || !user) return;

    const isMaster = activeChatroomCharacter.name === 'TMC: Master';

    // Turn enforcement
    if (!isMaster && (chatroomData?.roleplay_type === 'combat' || chatroomData?.roleplay_type === 'turn_based')) {
      const turns = chatroomData.turns || [];
      // Check if character is in any turn group
      const relevantGroups = turns.filter(g => g.characters.some(c => c.character_id === activeChatroomCharacter.id));
      
      if (relevantGroups.length > 0) {
        // If in turn groups, at least one must be active for this character
        const isMyTurn = relevantGroups.some(g => g.active_character_id === activeChatroomCharacter.id);
        if (!isMyTurn) {
          alert("No es tu turno de actuar en este modo.");
          return;
        }
      }
    }
    
    const success = await sendMessage({
      chatroom_id: id as string,
      sender_id: user.id,
      character_id: isMaster ? null : activeChatroomCharacter.id, // Only use actual character IDs
      sprite_id: selectedSpriteId || null,
      content: messageInput,
      is_system_message: isMaster && !selectedTargetUserId,
      is_dm_whisper: isMaster && !!selectedTargetUserId,
      target_user_id: isMaster ? selectedTargetUserId : null
    });

    if (success) {
      setMessageInput('');
      
      // Auto-pass turn if in turn-based mode and it's our turn
      if (!isMaster && (chatroomData?.roleplay_type === 'combat' || chatroomData?.roleplay_type === 'turn_based')) {
        const turns = chatroomData.turns || [];
        const isMyTurn = turns.some(g => g.active_character_id === activeChatroomCharacter.id);
        if (isMyTurn) {
          handlePassTurn();
        }
      }
    }
  }, [messageInput, activeChatroomCharacter, user, chatroomData, id, selectedSpriteId, selectedTargetUserId, sendMessage, handlePassTurn]);

  const handleDiceRoll = useCallback(async (amount: number = 1, sides: number = 100) => {
    if (!activeChatroomCharacter || !user) return;
    
    const rolls: number[] = [];
    for (let i = 0; i < amount; i++) {
      rolls.push(Math.floor(Math.random() * sides) + 1);
    }
    
    const total = rolls.reduce((a, b) => a + b, 0);
    const resultsStr = rolls.length > 1 ? `${rolls.join(', ')} [Total: ${total}]` : `${total}`;
    const diceStr = `${amount}d${sides}`;
    
    await sendMessage({
      chatroom_id: id as string,
      sender_id: user.id,
      character_id: activeChatroomCharacter.name === 'TMC: Master' ? null : activeChatroomCharacter.id,
      sprite_id: selectedSpriteId || null,
      content: `ha lanzado ${diceStr} y ha obtenido: ${resultsStr}.`,
      is_system_message: false,
      dice_result: { roll: total, type: diceStr.toUpperCase() }
    });
    
    setIsDiceModalOpen(false);
  }, [activeChatroomCharacter, user, id, selectedSpriteId, sendMessage]);

  const fetchStaffProfiles = useCallback(async () => {
    setIsFetchingStaff(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, username, role')
      .in('role', ['staff', 'superadmin']);
    
    if (!error && data) {
      setStaffProfiles(data as Profile[]);
      // Reset newMasterId selection to first available or empty
      if (data.length > 0) {
        setNewMasterId(data[0].id);
      }
    }
    setIsFetchingStaff(false);
  }, []);

  useEffect(() => {
    const triggerFetch = async () => {
      if (isRoomDetailsOpen && profile?.id === chatroomData?.creator_id) {
        await fetchStaffProfiles();
      }
    };
    triggerFetch();
  }, [isRoomDetailsOpen, profile?.id, chatroomData?.creator_id, fetchStaffProfiles]);

  const handleSaveTurns = useCallback(async () => {
    if (!chatroomData) return;
    const supabase = createClient();
    const { error } = await supabase.from('chatrooms').update({ turns: editableTurns }).eq('id', chatroomData.id);
    if (!error) {
       setChatroomData({ ...chatroomData, turns: editableTurns });
       setIsManageTurnsModalOpen(false);
    } else {
       alert("Error al guardar turnos.");
    }
  }, [chatroomData, editableTurns]);

  const handleToggleBGM = useCallback(async () => {
    if (!chatroomData || !id || !user) return;
    const currentState = chatroomData.bgm_state || { playing: false, time: 0, timestamp: null };
    const newPlaying = !currentState.playing;
    const supabase = createClient();
    
    // Catch current time from local ref if available
    const currentTime = audioRef.current?.currentTime || currentState.time;

    const newState = {
      playing: newPlaying,
      time: currentTime,
      timestamp: new Date().toISOString()
    };

    const { error } = await supabase.from('chatrooms').update({ bgm_state: newState }).eq('id', id);
    if (error) alert("Error al controlar música.");
  }, [chatroomData, id, user]);

  const handleRestartBGM = useCallback(async () => {
     if (!chatroomData || !id || !user) return;
     const supabase = createClient();
     const newState = {
       playing: true,
       time: 0,
       timestamp: new Date().toISOString()
     };
     const { error } = await supabase.from('chatrooms').update({ bgm_state: newState }).eq('id', id);
     if(error) alert("Error al reiniciar música.");
  }, [chatroomData, id, user]);

  // BGM Sync Effect
  useEffect(() => {
    if (!audioRef.current || !chatroomData?.bgm_state) return;
    const { playing, time, timestamp } = chatroomData.bgm_state;
    
    // Sync playing state
    if (playing) {
      audioRef.current.play().catch(() => {
         // Autoplay might be blocked until user interaction
      });
    } else {
      audioRef.current.pause();
    }

    // Playhead sync logic
    let expectedTime = time;
    if (playing && timestamp) {
      const elapsed = (Date.now() - new Date(timestamp).getTime()) / 1000;
      expectedTime += elapsed;
    }

    const drift = Math.abs(audioRef.current.currentTime - expectedTime);
    if (drift > 2) {
      audioRef.current.currentTime = expectedTime;
    }
  }, [chatroomData?.bgm_state]);

  const handleUpdateRoleplayMode = useCallback(async (mode: string) => {
    if (!id || !user) return;
    const supabase = createClient();
    const { error } = await supabase.from('chatrooms').update({ roleplay_type: mode }).eq('id', id);
    if (error) {
      alert("Error al actualizar el modo de rol.");
    }
  }, [id, user]);

  const handleSyncBGM = useCallback(async () => {
    if (!id || !user) return;
    const supabase = createClient();
    const newState = {
      playing: true,
      time: 0,
      timestamp: new Date().toISOString()
    };
    const { error } = await supabase.from('chatrooms').update({ 
      bgm_url: bgmInput,
      bgm_state: newState
    }).eq('id', id);
    if (error) {
      alert("Error al sincronizar música.");
    } else {
      setBgmInput('');
    }
  }, [id, user, bgmInput]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleAddTurnGroup = useCallback(() => {
    setEditableTurns(prev => [...prev, { id: crypto.randomUUID(), name: `Grupo ${prev.length + 1}`, active_character_id: null, characters: [] }]);
  }, []);


  // Only block the entire page on initial auth & room checking.
  // Any character loading later on (like joining) shouldn't completely unmount the page.
  if (isChecking || authLoading || !user) {
     return <div className="h-screen w-full flex items-center justify-center bg-[var(--bg)]"><div className="text-[var(--glow)] animate-pulse font-mono uppercase tracking-widest text-sm text-glow">CONECTANDO A SALA...</div></div>;
  }

  if (!activeChatroomCharacter) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[var(--bg)] text-[var(--text)] p-6 relative">
         <div className="absolute top-6 left-6">
            <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-[var(--text-muted)] hover:text-[var(--glow)] uppercase transition-colors">
              <ChevronLeft size={14} />
              <span>Volver al Servidor Central</span>
            </button>
         </div>
         <h1 className="text-3xl font-serif italic text-[var(--text)] mb-2">Seleccionar Agente</h1>
         <p className="text-[var(--text-muted)] font-mono text-sm mb-12">Elige tu personaje para esta operación</p>
         
         {isCharLoading ? (
            <div className="text-center p-8 bg-[var(--surface-alt)]/50 max-w-md animate-pulse">
               <p className="text-[var(--glow)] font-mono text-sm uppercase tracking-widest">Creando instancia de Agente...</p>
            </div>
         ) : vaultCharacters.length === 0 ? (
            <div className="text-center p-8 border border-dashed border-[var(--border-light)] rounded-sm bg-[var(--surface-alt)]/50 max-w-md">
              <p className="text-[var(--text-muted)] font-mono text-sm mb-4">No tienes personajes registrados en The Character Vault.</p>
              <a href="https://tmc-characters-maker.vercel.app/" target="_blank" className="inline-block bg-[var(--accent)] text-white px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-[var(--accent-hover)] transition-colors">Crear Personaje</a>
            </div>
         ) : (
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 max-w-6xl w-full">
              {vaultCharacters.map(char => (
                <button 
                  key={char.id}
                  onClick={() => handleJoin(char)}
                  className="bg-[var(--surface-alt)] hover:bg-[var(--surface)] border border-[var(--border-light)] hover:border-[var(--glow)]/50 p-5 rounded-sm flex flex-col items-center gap-4 transition-all shadow-lg hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] group relative"
                >
                  {char.is_npc && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-[var(--accent)] text-white text-[8px] font-bold uppercase rounded-sm shadow-[0_0_8px_var(--glow)] z-10">
                      NPC
                    </div>
                  )}
                  <div className="w-24 h-24 relative rounded-full overflow-hidden border-2 border-[var(--surface)] bg-[var(--border)] group-hover:border-[var(--glow)]/30 transition-colors flex items-center justify-center">
                     {char.image_url ? <Image src={char.image_url} alt={char.name} fill className="object-cover" /> : <User size={32} className="text-[var(--text-muted)] absolute inset-0 m-auto" />}
                  </div>
                  <span className="font-bold text-sm text-[var(--text)] font-serif text-center line-clamp-2">{char.name}</span>
                  <span className="text-[9px] mono-label group-hover:text-[var(--glow)] uppercase tracking-wider">Elegir</span>
                </button>
              ))}
           </div>
         )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[var(--bg)] text-[var(--text)] font-sans overflow-hidden selection:bg-[var(--accent)]/30">
      {/* Add Additional Character Modal */}
      {isAddCharacterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
           <div className="w-full max-w-4xl bg-[var(--surface)] border border-[var(--border)] rounded-sm shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-[var(--border)] flex justify-between items-center bg-[var(--surface-alt)]">
                <h2 className="text-xs font-bold text-[var(--text)] tracking-widest uppercase">Añadir otro Agente a la Sala</h2>
                <button onClick={() => setIsAddCharacterModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar">
                 {vaultCharacters.length === 0 ? (
                    <p className="text-[var(--text-muted)] text-center my-10 font-mono">No tienes más personajes.</p>
                 ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {vaultCharacters.filter(vc => !myChatroomCharacters.some(mc => mc.vault_character_id === vc.id)).map(char => (
                        <button 
                          key={char.id}
                          onClick={() => handleJoin(char)}
                          className="bg-[var(--surface-alt)] hover:bg-[var(--surface)] border border-[var(--border-light)] hover:border-[var(--glow)]/50 p-4 rounded-sm flex flex-col items-center gap-3 transition-all group relative"
                        >
                          {char.is_npc && (
                            <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-[var(--accent)] text-white text-[7px] font-bold uppercase rounded-sm z-10">
                              NPC
                            </div>
                          )}
                          <div className="w-16 h-16 relative rounded-full overflow-hidden border-2 border-[var(--surface)] bg-[var(--border)] flex items-center justify-center">
                             {char.image_url ? <Image src={char.image_url} alt={char.name} fill className="object-cover" /> : <User size={24} className="text-[var(--text-muted)]" />}
                          </div>
                          <span className="font-bold text-xs text-[var(--text)] font-serif text-center line-clamp-1">{char.name}</span>
                        </button>
                      ))}
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Manage Sprite Modal */}
      {isSpriteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
           <div className="w-full max-w-2xl bg-[var(--surface)] border border-[var(--border)] rounded-sm shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-[var(--border)] flex justify-between items-center bg-[var(--surface-alt)]">
                <h2 className="text-xs font-bold text-[var(--text)] tracking-widest uppercase">{editingSpriteId ? 'Editar Sprite' : 'Registrar Nuevo Sprite'}</h2>
                <button onClick={() => setIsSpriteModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                  <X size={16} />
                </button>
              </div>
              <div className="p-0 flex flex-col md:flex-row overflow-hidden flex-1">
                 {/* Visual Novel Preview Box */}
                 <div className="h-64 md:h-[500px] md:flex-1 bg-[var(--bg)] border-b md:border-b-0 md:border-r border-[var(--border)] relative flex items-end justify-center overflow-hidden z-0">
                    <div className="absolute top-4 left-4 z-10 mono-label text-[9px] opacity-70 drop-shadow-md bg-[var(--surface-alt)]/80 px-2 py-1 rounded-sm">PREVIEW (VN STYLE)</div>
                    {/* Background mock */}
                    <div className="absolute inset-0 z-0 opacity-20"><div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')]"></div></div>
                    {newSpriteUrl ? (
                      <div className="w-[300px] h-[500px] relative pointer-events-none" style={{ transform: `scale(${newSpriteScale}) translateY(${newSpritePositionY * -1}px)`, transformOrigin: 'bottom center' }}>
                         <Image src={newSpriteUrl} alt="Preview" fill className="object-contain object-bottom drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]" />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full w-full opacity-30 pb-20">
                         <User size={80} className="mb-4" />
                         <span className="font-mono text-sm tracking-widest uppercase">Sin Imagen</span>
                      </div>
                    )}
                 </div>

                 <div className="flex-1 max-w-[320px] p-6 flex flex-col overflow-y-auto custom-scrollbar bg-[var(--surface)]">
                    <div className="space-y-5 flex-1">
                      <div className="space-y-2">
                        <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Nombre / Expresión</label>
                        <input 
                          type="text" 
                          value={newSpriteName}
                          onChange={e => setNewSpriteName(e.target.value)}
                          placeholder="Ej: Enojado, Sonriendo..."
                          className="w-full bg-[var(--surface-alt)] border border-[var(--border-light)] text-[var(--text)] font-mono text-sm rounded-sm p-3 outline-none focus:border-[var(--glow)]/50 transition-colors"
                        />
                      </div>

                      <div className="mb-2">
                       <ImageUploader 
                         value={newSpriteUrl} 
                         onChange={setNewSpriteUrl} 
                         label="Imagen del Sprite"
                         bucket="character-sprites"
                       />
                     </div>

                     <div className="space-y-5 py-4 border-t border-[var(--border-light)] mt-2">
                       <div>
                         <div className="flex justify-between items-center mb-3">
                            <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Escala (Tamaño)</label>
                            <span className="text-[10px] py-0.5 px-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-sm font-mono text-[var(--glow)]">{(newSpriteScale * 100).toFixed(0)}%</span>
                         </div>
                         <input type="range" min="0.5" max="3.0" step="0.05" value={newSpriteScale} onChange={(e) => setNewSpriteScale(parseFloat(e.target.value))} className="w-full h-1.5 bg-[var(--border)] rounded-sm appearance-none cursor-pointer" />
                       </div>

                       <div>
                         <div className="flex justify-between items-center mb-3">
                            <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Posición Y (Altura)</label>
                            <span className="text-[10px] py-0.5 px-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-sm font-mono text-[var(--glow)]">{newSpritePositionY}px</span>
                         </div>
                         <input type="range" min="-300" max="300" step="1" value={newSpritePositionY} onChange={(e) => setNewSpritePositionY(parseFloat(e.target.value))} className="w-full h-1.5 bg-[var(--border)] rounded-sm appearance-none cursor-pointer" />
                         <p className="text-[9px] text-[var(--text-muted)] mt-2 text-center">+ Valores suben, - Valores bajan el sprite</p>
                       </div>
                     </div>
                   </div>

                   <div className="pt-4 flex flex-col gap-3 border-t border-[var(--border)] mt-4">
                     <button 
                       type="button" 
                       onClick={handleSaveSprite}
                       disabled={isUploadingSprite || !newSpriteName || !newSpriteUrl}
                       className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                     >
                       {isUploadingSprite ? 'Guardando...' : 'Guardar Transformaciones'}
                     </button>
                     <div className="flex gap-2">
                       {editingSpriteId && (
                          <button 
                            type="button" 
                            onClick={() => handleDeleteSprite(editingSpriteId)}
                            className="flex-1 py-2 border border-transparent text-[var(--danger)] hover:bg-[var(--danger)]/10 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                          >
                             <Trash2 size={12} /> Eliminar
                          </button>
                       )}
                       <button 
                         type="button" 
                         onClick={() => setIsSpriteModalOpen(false)}
                         className="flex-1 py-2 border border-[var(--border-light)] text-[var(--text-muted)] hover:text-[var(--text)] rounded-sm text-[10px] font-bold uppercase tracking-widest transition-colors"
                       >
                         Cancelar
                       </button>
                     </div>
                   </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Add Resource Modal */}
      {isAddResourceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
           <div className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-sm shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-[var(--border)] flex justify-between items-center bg-[var(--surface-alt)]">
                <h2 className="text-xs font-bold text-[var(--text)] tracking-widest uppercase">Añadir Recurso</h2>
                <button onClick={() => setIsAddResourceModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                 <div>
                   <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">Tipo de Recurso</label>
                   <select 
                     value={newResourceType}
                     onChange={(e: any) => setNewResourceType(e.target.value)}
                     className="w-full bg-[var(--surface-alt)] border border-[var(--border-light)] text-[var(--text)] font-sans text-sm rounded-sm p-2.5 outline-none focus:border-[var(--glow)]/50 transition-colors"
                   >
                     <option value="image">Imagen General</option>
                     <option value="map">Mapa / Plano</option>
                     <option value="text">Nota / Texto</option>
                     <option value="enemy">Enemigo / Bestia</option>
                     <option value="item">Objeto / Ítem</option>
                   </select>
                 </div>
                 <div>
                   <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">Título / Nombre</label>
                   <input 
                     type="text" 
                     value={newResourceTitle}
                     onChange={e => setNewResourceTitle(e.target.value)}
                     placeholder="Ej: Mapa del Sector 7 / Rey Demonio"
                     className="w-full bg-[var(--surface-alt)] border border-[var(--border-light)] text-[var(--text)] font-sans text-sm rounded-sm p-2.5 outline-none focus:border-[var(--glow)]/50 transition-colors"
                   />
                 </div>
                 
                 {newResourceType === 'text' ? (
                   <div>
                     <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">Contenido de la Nota</label>
                     <textarea 
                       value={newResourceContent}
                       onChange={e => setNewResourceContent(e.target.value)}
                       placeholder="Escribe la descripción o notas aquí..."
                       className="w-full bg-[var(--surface-alt)] border border-[var(--border-light)] text-[var(--text)] font-sans text-sm rounded-sm p-2.5 outline-none focus:border-[var(--glow)]/50 transition-colors min-h-[120px]"
                     />
                   </div>
                 ) : newResourceType === 'enemy' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">Descripción</label>
                        <textarea value={newResourceContent} onChange={e => setNewResourceContent(e.target.value)} className="w-full bg-[var(--surface-alt)] border border-[var(--border-light)] text-[var(--text)] font-sans text-sm rounded-sm p-2.5 outline-none focus:border-[var(--glow)]/50 min-h-[60px]" placeholder="Breve lore o descripción..." />
                      </div>
                      <ImageUploader value={newResourceImageUrl} onChange={setNewResourceImageUrl} label="Imagen del Enemigo (Opcional)" bucket="chatroom_images" />
                      <div className="grid grid-cols-2 gap-3">
                         <div><label className="block font-mono text-[10px] text-[var(--text-muted)]">HP</label><input type="number" value={newResourceHp} onChange={e => setNewResourceHp(Number(e.target.value))} className="w-full bg-[var(--surface-alt)] border border-[var(--border-light)] outline-none focus:border-[var(--glow)]/50 p-2 rounded-sm text-sm" /></div>
                         <div><label className="block font-mono text-[10px] text-[var(--text-muted)]">Mana</label><input type="number" value={newResourceMana} onChange={e => setNewResourceMana(Number(e.target.value))} className="w-full bg-[var(--surface-alt)] border border-[var(--border-light)] outline-none focus:border-[var(--glow)]/50 p-2 rounded-sm text-sm" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                         <div><label className="block font-mono text-[10px] text-[var(--text-muted)]">Poder Ofensivo</label><input type="text" value={newResourceOffensive} onChange={e => setNewResourceOffensive(e.target.value)} className="w-full bg-[var(--surface-alt)] border border-[var(--border-light)] outline-none focus:border-[var(--glow)]/50 p-2 rounded-sm text-sm" /></div>
                         <div><label className="block font-mono text-[10px] text-[var(--text-muted)]">Poder Defensivo</label><input type="text" value={newResourceDefensive} onChange={e => setNewResourceDefensive(e.target.value)} className="w-full bg-[var(--surface-alt)] border border-[var(--border-light)] outline-none focus:border-[var(--glow)]/50 p-2 rounded-sm text-sm" /></div>
                         <div><label className="block font-mono text-[10px] text-[var(--text-muted)]">Habilidad Física</label><input type="text" value={newResourcePhysical} onChange={e => setNewResourcePhysical(e.target.value)} className="w-full bg-[var(--surface-alt)] border border-[var(--border-light)] outline-none focus:border-[var(--glow)]/50 p-2 rounded-sm text-sm" /></div>
                         <div><label className="block font-mono text-[10px] text-[var(--text-muted)]">Suerte</label><input type="text" value={newResourceLuck} onChange={e => setNewResourceLuck(e.target.value)} className="w-full bg-[var(--surface-alt)] border border-[var(--border-light)] outline-none focus:border-[var(--glow)]/50 p-2 rounded-sm text-sm" /></div>
                         <div><label className="block font-mono text-[10px] text-[var(--text-muted)]">Llama (Blaze)</label><input type="text" value={newResourceBlaze} onChange={e => setNewResourceBlaze(e.target.value)} className="w-full bg-[var(--surface-alt)] border border-[var(--border-light)] outline-none focus:border-[var(--glow)]/50 p-2 rounded-sm text-sm" /></div>
                         <div><label className="block font-mono text-[10px] text-[var(--text-muted)]">Elemento Avanzado</label><input type="text" value={newResourceElement} onChange={e => setNewResourceElement(e.target.value)} className="w-full bg-[var(--surface-alt)] border border-[var(--border-light)] outline-none focus:border-[var(--glow)]/50 p-2 rounded-sm text-sm" /></div>
                      </div>
                      <div>
                        <label className="block font-mono text-[10px] text-[var(--text-muted)]">Usuario / Creador</label><input type="text" value={newResourceCreator} onChange={e => setNewResourceCreator(e.target.value)} className="w-full bg-[var(--surface-alt)] border border-[var(--border-light)] outline-none focus:border-[var(--glow)]/50 p-2 rounded-sm text-sm" />
                      </div>
                    </div>
                  ) : newResourceType === 'item' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">Descripción</label>
                        <textarea value={newResourceContent} onChange={e => setNewResourceContent(e.target.value)} className="w-full bg-[var(--surface-alt)] border border-[var(--border-light)] text-[var(--text)] font-sans text-sm rounded-sm p-2.5 outline-none focus:border-[var(--glow)]/50 min-h-[60px]" placeholder="Breve descripción..." />
                      </div>
                      <ImageUploader value={newResourceImageUrl} onChange={setNewResourceImageUrl} label="Imagen del Objeto (Opcional)" bucket="chatroom_images" />
                      <div>
                        <label className="block font-mono text-[10px] text-[var(--text-muted)]">Tipo</label><input type="text" value={newResourceItemType} onChange={e => setNewResourceItemType(e.target.value)} className="w-full bg-[var(--surface-alt)] border border-[var(--border-light)] outline-none focus:border-[var(--glow)]/50 p-2 rounded-sm text-sm" />
                      </div>
                      <div>
                        <label className="block font-mono text-[10px] text-[var(--text-muted)]">Estadísticas</label><input type="text" value={newResourceStats} onChange={e => setNewResourceStats(e.target.value)} placeholder="Ej: +10 Ataque" className="w-full bg-[var(--surface-alt)] border border-[var(--border-light)] outline-none focus:border-[var(--glow)]/50 p-2 rounded-sm text-sm" />
                      </div>
                      <div>
                        <label className="block font-mono text-[10px] text-[var(--text-muted)]">Efecto</label><input type="text" value={newResourceEffect} onChange={e => setNewResourceEffect(e.target.value)} className="w-full bg-[var(--surface-alt)] border border-[var(--border-light)] outline-none focus:border-[var(--glow)]/50 p-2 rounded-sm text-sm" />
                      </div>
                    </div>
                  ) : (
                   <div className="mb-2">
                     <ImageUploader 
                       value={newResourceContent} 
                       onChange={setNewResourceContent} 
                       label="Subir Imagen/Mapa (URL o Archivo)"
                       bucket="chatroom_images"
                     />
                   </div>
                 )}
                 <div className="pt-2 flex justify-end gap-3">
                   <button 
                     type="button" 
                     onClick={() => setIsAddResourceModalOpen(false)}
                     className="px-4 py-2 border border-[var(--border-light)] text-[var(--text-muted)] hover:text-[var(--text)] rounded-sm text-[10px] font-bold uppercase tracking-widest transition-colors"
                   >
                     Cancelar
                   </button>
                   <button 
                     type="button" 
                     onClick={handleAddResource}
                     disabled={isUploadingResource || !newResourceTitle || (!newResourceContent && !newResourceImageUrl)}
                     className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                   >
                     {isUploadingResource ? 'Guardando...' : 'Confirmar'}
                   </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Manage Turns Modal */}
      {isManageTurnsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
           <div className="w-full max-w-2xl bg-[var(--surface)] border border-[var(--border)] rounded-sm shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-[var(--border)] flex justify-between items-center bg-[var(--surface-alt)]">
                <h2 className="text-xs font-bold text-[var(--text)] tracking-widest uppercase">Gestor de Turnos</h2>
                <div className="flex gap-4">
                  <button onClick={handleAddTurnGroup} className="flex items-center gap-2 text-[10px] font-bold text-[var(--glow)] hover:text-white transition-colors bg-[var(--glow)]/10 px-3 py-1.5 rounded-sm">
                    <Plus size={14} /> Añadir Grupo
                  </button>
                  <button onClick={() => setIsManageTurnsModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                    <X size={16} />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-[var(--bg)]/50">
                {editableTurns.length === 0 ? (
                  <p className="text-center text-[var(--text-muted)] text-sm font-mono mt-8">No hay grupos de turnos. Crea uno para empezar.</p>
                ) : (
                  editableTurns.map((group, groupIndex) => (
                    <div key={group.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-sm p-4 space-y-4 shadow-lg shadow-black/50">
                      
                      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div className="flex-1 space-y-2 w-full">
                          <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-widest">Nombre del Grupo</label>
                          <input 
                            value={group.name} 
                            onChange={(e) => {
                              const newTurns = [...editableTurns];
                              newTurns[groupIndex].name = e.target.value;
                              setEditableTurns(newTurns);
                            }}
                            className="bg-[var(--surface-alt)] border border-[var(--border-light)] text-[var(--text)] px-3 py-1.5 text-sm outline-none rounded-sm w-full focus:border-[var(--glow)]/50 transition-colors"
                          />
                        </div>
                        <div className="flex-1 space-y-2 w-full">
                          <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-widest">Aviso (Deadline)</label>
                          <input 
                            value={group.deadline_text || ''} 
                            onChange={(e) => {
                              const newTurns = [...editableTurns];
                              newTurns[groupIndex].deadline_text = e.target.value;
                              setEditableTurns(newTurns);
                            }}
                            placeholder="Ej: dos días para turno"
                            className="bg-[var(--surface-alt)] border border-[var(--border-light)] text-[var(--text)] px-3 py-1.5 text-sm outline-none rounded-sm w-full focus:border-[var(--glow)]/50 transition-colors"
                          />
                        </div>
                        <button 
                          onClick={() => setEditableTurns(editableTurns.filter(g => g.id !== group.id))}
                          className="mt-6 p-2 text-[var(--danger)]/70 hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 rounded-sm transition-colors border border-transparent hover:border-[var(--danger)]/30"
                          title="Eliminar Grupo"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            const newTurns = [...editableTurns];
                            newTurns[groupIndex].characters = newTurns[groupIndex].characters.map(c => ({
                              ...c,
                              initiative: Math.floor(Math.random() * 20) + 1
                            }));
                            newTurns[groupIndex].characters.sort((a,b) => b.initiative - a.initiative);
                            setEditableTurns(newTurns);
                          }}
                          className="mt-6 px-3 py-1.5 bg-[var(--glow)]/10 border border-[var(--glow)]/30 text-[var(--glow)] hover:bg-[var(--glow)] hover:text-white rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                        >
                          <RotateCcw size={12} /> Tirar Todo
                        </button>
                      </div>

                      <div className="border border-[var(--border-light)] rounded-sm bg-[var(--surface-alt)]">
                         <div className="p-3 border-b border-[var(--border-light)] flex justify-between items-center">
                            <h4 className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)]">Personajes ({group.characters.length})</h4>
                            <select 
                              className="bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-[10px] px-2 py-1 outline-none rounded-sm"
                              onChange={(e) => {
                                if(!e.target.value) return;
                                const char = availableRoomCharacters.find(c => c.id === e.target.value);
                                if(char) {
                                  const newTurns = [...editableTurns];
                                  if (!newTurns[groupIndex].characters.some(c => c.character_id === char.id)) {
                                     // Auto-roll initiative d20
                                     const roll = Math.floor(Math.random() * 20) + 1;
                                     newTurns[groupIndex].characters.push({ 
                                       character_id: char.id, 
                                       name: char.name, 
                                       initiative: roll 
                                     });
                                     // Sort by initiative descending
                                     newTurns[groupIndex].characters.sort((a,b) => b.initiative - a.initiative);
                                  }
                                  setEditableTurns(newTurns);
                                }
                                e.target.value = "";
                              }}
                            >
                              <option value="">+ Añadir al Turno</option>
                              {availableRoomCharacters.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                         </div>

                         <div className="p-2 space-y-1">
                           {group.characters.length === 0 ? (
                              <p className="text-center text-[var(--text-muted)] text-[10px] py-4">Agrega participantes desde el menú.</p>
                           ) : (
                             group.characters.map((char, charIndex) => (
                               <div key={char.character_id} className={`flex items-center gap-3 p-2 rounded-sm border ${group.active_character_id === char.character_id ? 'border-[var(--glow)] bg-[var(--glow)]/10' : 'border-transparent bg-[var(--surface)]/50'}`}>
                                  <button 
                                     onClick={() => {
                                       const newTurns = [...editableTurns];
                                       newTurns[groupIndex].active_character_id = newTurns[groupIndex].active_character_id === char.character_id ? null : char.character_id;
                                       setEditableTurns(newTurns);
                                     }}
                                     className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${group.active_character_id === char.character_id ? 'border-[var(--glow)] bg-[var(--glow)] shadow-[0_0_8px_var(--glow)]' : 'border-[var(--border)] hover:border-[var(--glow)]/50'}`}
                                     title="Marcar como turno actual"
                                  >
                                    {group.active_character_id === char.character_id && <div className="w-1.5 h-1.5 bg-[var(--bg)] rounded-full" />}
                                  </button>
                                  
                                  <span className="flex-1 text-sm text-[var(--text)] font-mono">{char.name}</span>
                                  
                                  <div className="flex items-center gap-2">
                                     <label className="text-[10px] text-[var(--text-muted)]">INICIATIVA:</label>
                                     <input 
                                       type="number" 
                                       value={char.initiative}
                                       onChange={(e) => {
                                          const newTurns = [...editableTurns];
                                          newTurns[groupIndex].characters[charIndex].initiative = Number(e.target.value) || 0;
                                          newTurns[groupIndex].characters.sort((a,b) => b.initiative - a.initiative);
                                          setEditableTurns(newTurns);
                                       }}
                                       className="w-16 bg-[var(--bg)] border border-[var(--border)] text-center text-sm py-1 rounded-sm text-[var(--glow)] font-bold outline-none"
                                     />
                                  </div>
                                  
                                  <button 
                                    onClick={() => {
                                      const newTurns = [...editableTurns];
                                      newTurns[groupIndex].characters = newTurns[groupIndex].characters.filter(c => c.character_id !== char.character_id);
                                      if(newTurns[groupIndex].active_character_id === char.character_id) newTurns[groupIndex].active_character_id = null;
                                      setEditableTurns(newTurns);
                                    }}
                                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
                                  >
                                    <X size={14} />
                                  </button>
                               </div>
                             ))
                           )}
                         </div>
                      </div>

                    </div>
                  ))
                )}
              </div>
              <div className="p-5 border-t border-[var(--border)] bg-[var(--surface-alt)] flex justify-end gap-3 shrink-0">
                 <button 
                   onClick={() => setIsManageTurnsModalOpen(false)}
                   className="px-4 py-2 border border-[var(--border-light)] text-[var(--text-muted)] hover:text-[var(--text)] rounded-sm text-[10px] font-bold uppercase tracking-widest transition-colors"
                 >
                   Cancelar
                 </button>
                 <button 
                   onClick={handleSaveTurns}
                   className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                 >
                   Guardar Cambios
                 </button>
              </div>
           </div>
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none z-0 grid-overlay"></div>
      
      {/* Top Bar */}
      <header className="h-14 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between px-6 z-20 relative shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-[var(--text-muted)] hover:text-[var(--glow)] uppercase transition-colors">
            <ChevronLeft size={14} />
            <span>Volver</span>
          </button>
          <div className="h-4 w-px bg-[var(--border)]"></div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-[var(--glow)]">◆</span>
              <h1 className="text-xs font-bold tracking-[0.15em] text-[var(--text)] uppercase line-clamp-1">{chatroomData?.title || 'Cargando...'}</h1>
            </div>
            <div className="flex items-center gap-4 mt-0.5 ml-4">
              <div className="mono-label">ID: {typeof id === 'string' ? id.split('-')[0].toUpperCase() : ''}</div>
              <div className="h-2 w-px bg-[var(--border)] opacity-30"></div>
              <div className="flex items-center gap-1.5" title="Participantes Totales">
                <User size={10} className="text-[var(--text-muted)]" />
                <span className="text-[9px] font-mono text-[var(--text-muted)]">
                  {chatroomData?.masters_ids ? (chatroomData.masters_ids.length + (chatroomData.creator_id ? 1 : 0) + (chatroomData.chatters_ids ? chatroomData.chatters_ids.length : 0)) : chatters.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5" title="Staff Activo">
                <RefreshCw size={10} className="text-[var(--accent)]" />
                <span className="text-[9px] font-mono text-[var(--accent)]">
                  {(chatroomData?.masters_ids?.length || 0) + 1}
                </span>
              </div>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setIsRoomDetailsOpen(true)}
          className="p-2 border border-transparent hover:border-[var(--border)] bg-[var(--surface-alt)]/50 rounded-sm transition-colors text-[var(--text-muted)] hover:text-[var(--text)] flex items-center gap-2"
        >
          <span className="text-[9px] font-bold uppercase tracking-widest hidden md:inline">Opciones</span>
          <MoreVertical size={16} />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative z-10">
        
        {/* Center Area (Visual Novel & Background) */}
        <div className="flex-1 relative flex flex-col overflow-hidden">
           {/* Background Image & Gradient */}
           <div className="absolute inset-0 z-0">
             {chatroomData?.background_url && (
               <div className="absolute inset-0 opacity-60">
                 <Image src={chatroomData.background_url} alt="Room Background" fill className="object-cover" />
               </div>
             )}
             <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-transparent to-transparent"></div>
           </div>

          {/* Top Right: Mode Indicator */}
          <div className="absolute top-6 right-6 z-20 flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-[var(--surface-alt)]/90 border border-[var(--border)] backdrop-blur-md px-3 py-1.5 rounded-sm shadow-sm">
                <span className="w-1.5 h-1.5 bg-[var(--glow)] rounded-full animate-pulse"></span>
                <span className="text-[9px] font-bold tracking-[0.2em] text-[var(--glow)] uppercase">
                  {chatroomData?.chat_type || 'Recreativo'}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-[var(--surface)]/80 border border-[var(--border)] backdrop-blur-md px-4 py-2 rounded-sm shadow-lg">
                <Clock size={12} className="text-[var(--glow)]" />
                <span className="text-[10px] font-bold tracking-widest text-[var(--text)] uppercase">
                  {chatroomData?.roleplay_type === 'combat' ? 'Modo Combate' 
                  : chatroomData?.roleplay_type === 'turn_based' ? 'Roleplay por Turnos' 
                  : 'Roleplay Libre'}
                </span>
              </div>
            </div>
            {chatroomData?.description && (
              <div className="bg-[var(--surface)]/80 border border-[var(--border)] backdrop-blur-md px-4 py-3 rounded-sm shadow-lg max-w-sm">
                <p className="text-[11px] font-sans text-[var(--text-muted)] italic leading-relaxed">&quot;{chatroomData.description}&quot;</p>
              </div>
            )}
          </div>


           {/* Visual Novel Area (Active Message) */}
           <div className="absolute w-full bottom-0 px-6 pb-6 z-30 flex flex-col justify-end pointer-events-none">
             {vnData && (() => {
                const { lastMsg, speakerName, isSystem, prevMsg } = vnData;
                
                 return (
                   <div className="relative w-full flex flex-col justify-end mt-auto">
                     {/* Combined Sprite Area */}
                     <div className="absolute bottom-0 w-full h-[600px] pointer-events-none flex items-end justify-center z-20 px-[10%] mb-10">
                       
                       {/* Previous Speaker Sprite - Dimmed and to the Left */}
                       {prevMsg && prevMsg.character_sprites?.image_url && !isSystem && (
                         <div 
                           className="absolute bottom-0 left-[12%] w-[400px] h-[550px] transition-all duration-700 ease-in-out brightness-[0.35] contrast-[1.1] z-10"
                           style={{ 
                             transform: `scale(${prevMsg.character_sprites.scale ?? 0.9}) translateY(${(prevMsg.character_sprites.position_y ?? 0) * -1}px) translateX(-20px)`, 
                             transformOrigin: 'bottom center' 
                           }}
                         >
                           <Image 
                             src={prevMsg.character_sprites.image_url} 
                             alt="Previous Speaker" 
                             fill
                             className="object-contain object-bottom" 
                           />
                         </div>
                       )}
 
                       {/* Current Speaker Sprite - Bright and to the Right/Center */}
                       {!isSystem && lastMsg.character_sprites?.image_url && (
                         <div 
                           className="absolute bottom-0 right-[12%] w-[450px] h-[600px] pointer-events-auto transition-all duration-500 z-20 animate-in fade-in slide-in-from-bottom-5"
                           style={{ 
                             transform: `scale(${lastMsg.character_sprites.scale ?? 1.0}) translateY(${(lastMsg.character_sprites.position_y ?? 0) * -1}px)`, 
                             transformOrigin: 'bottom center' 
                           }}
                         >
                           <Image 
                             src={lastMsg.character_sprites.image_url} 
                             alt={speakerName} 
                             fill
                             className="object-contain object-bottom drop-shadow-[0_0_30px_rgba(0,0,0,0.9)]" 
                           />
                         </div>
                       )}
 
                       {!isSystem && !lastMsg.character_sprites?.image_url && (
                          <div className="absolute bottom-0 right-[20%] w-[450px] h-[600px] flex justify-center items-end pb-10">
                             <User size={200} className="text-[var(--text-muted)] opacity-50 drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]" />
                          </div>
                       )}
                     </div>
 
                     {/* Text Box - Full Width */}
                     <div className="w-full bg-[#0a0a0a]/95 backdrop-blur-3xl p-8 shadow-[0_-10px_60px_rgba(0,0,0,0.8)] relative overflow-hidden pointer-events-auto z-30 mt-4 min-h-[180px] transition-all duration-500">
                      {/* Cinematic Background Texture */}
                      <div className="absolute inset-0 z-[-1] opacity-[0.03] pointer-events-none">
                         <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] scale-150"></div>
                      </div>
                      
                      {/* Subtle Gradient Shadow */}
                      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/20 to-transparent pointer-events-none"></div>
                      
                      <div className="flex flex-col gap-4 relative">
                        {/* Speaker Name Label - Cinematic Style */}
                        {!isSystem && (
                          <div className="inline-block self-start mb-1">
                            <h3 className="text-[var(--accent)] font-serif italic text-3xl font-extrabold tracking-[0.08em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] border-b-2 border-[var(--accent)]/30 pb-1">
                              {speakerName}
                            </h3>
                          </div>
                        )}

                        {isSystem && (
                          <div className="inline-block self-start mb-1">
                            <h3 className="text-[var(--danger)] font-mono text-xl font-bold tracking-widest uppercase px-3 py-1 bg-[var(--danger)]/10 border border-[var(--danger)]/30">
                              SISTEMA
                            </h3>
                          </div>
                        )}
                        
                        {/* Message Content */}
                        <div className="relative group">
                          <p className="text-white/95 text-xl leading-relaxed font-sans font-medium drop-shadow-[1px_1px_2px_rgba(0,0,0,0.5)] max-w-[90%]">
                             {isSystem ? lastMsg.content : `"${lastMsg.content}"`}
                          </p>
                          
                          {chatroomData?.roleplay_type !== 'free_roleplay' && chatroomData?.turns?.some(g => g.active_character_id === lastMsg.character_id) && (
                            <div className="absolute -right-4 top-0 flex items-center gap-2 px-3 py-1 bg-[var(--glow)]/10 border border-[var(--glow)]/30 rounded-full animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                              <div className="w-2 h-2 bg-[var(--glow)] rounded-full shadow-[0_0_10px_var(--glow)]"></div>
                              <span className="text-[10px] font-bold text-[var(--glow)] tracking-[0.2em] uppercase">Activo</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {lastMsg.dice_result && (
                        <div className="mt-8 inline-flex items-center gap-3 bg-black/40 border border-[var(--glow)]/20 px-4 py-2 rounded-sm text-base font-mono shadow-2xl backdrop-blur-sm group hover:border-[var(--glow)]/50 transition-all">
                          <Dices size={20} className="text-[var(--glow)] group-hover:rotate-12 transition-transform" />
                          <span className="text-[var(--glow)] font-black text-xl tracking-tighter">{lastMsg.dice_result.roll}</span>
                          <span className="text-white/40 text-xs uppercase tracking-widest">{lastMsg.dice_result.type}</span>
                        </div>
                      )}

                      {/* Cinematic corner decorations */}
                      <div className="absolute bottom-4 right-6 opacity-20 flex gap-2">
                         <div className="w-1 h-1 bg-white rounded-full"></div>
                         <div className="w-1 h-1 bg-white rounded-full"></div>
                         <div className="w-12 h-[1px] bg-white self-center"></div>
                      </div>
                    </div>
                  </div>
                )
             })()}
          </div>

          {/* Drawers */}
          {/* History Drawer */}
          <div className={`absolute top-0 right-0 bottom-0 w-80 md:w-[400px] bg-[var(--surface)]/95 backdrop-blur-xl border-l border-[var(--border)] z-30 flex flex-col shadow-2xl transform transition-transform duration-300 ${isHistoryOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <div className="flex items-center gap-2 text-[var(--glow)]">
                <MessageSquare size={14} />
                <h2 className="text-[10px] font-bold tracking-widest uppercase text-[var(--text)]">Historial de Chat</h2>
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4 scroll-smooth custom-scrollbar">
              {messages.length === 0 ? (
                <div className="text-center text-[var(--text-muted)] text-xs font-mono uppercase tracking-widest mt-10">Sin Historial</div>
              ) : (
                <>
                  {hasMoreMessages && (
                    <div className="flex justify-center pb-2">
                       <button 
                          onClick={() => loadMoreMessages(id as string, user?.id || '')}
                          disabled={isLoadingMore}
                          className="bg-[var(--surface-alt)] border border-[var(--border)] text-[var(--glow)] hover:text-white hover:border-[var(--glow)] text-[10px] font-bold tracking-widest uppercase px-4 py-2 rounded-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                       >
                          {isLoadingMore ? 'Cargando...' : '▲ Cargar mensajes anteriores'}
                       </button>
                    </div>
                  )}
                  {messages.map(msg => {
                    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const senderName = msg.chatroom_characters?.name || msg.profiles?.username || 'Sistema';
                    const color = msg.is_system_message ? 'text-[var(--danger)]' : 'text-[var(--accent)]';

                    if (msg.dice_result) {
                      return <DiceMessage key={msg.id} sender={senderName} time={time} text={msg.content} result={msg.dice_result.roll.toString()} color={color} />
                    }
                    return <Message key={msg.id} sender={senderName} time={time} text={msg.content} color={color} isWhisper={msg.is_dm_whisper} targetName={msg.target_profile?.username} />
                  })}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Turn Order Drawer */}
          <div className={`absolute top-0 right-0 bottom-0 w-80 bg-[var(--surface)]/95 backdrop-blur-xl border-l border-[var(--border)] z-30 flex flex-col shadow-2xl transform transition-transform duration-300 ${isTurnOrderOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <div className="flex items-center gap-2 text-[var(--glow)]">
                <Clock size={14} />
                <h2 className="text-[10px] font-bold tracking-widest uppercase text-[var(--text)]">Orden de Turnos</h2>
              </div>
              <div className="flex items-center gap-3">
                {isMaster && (
                  <button onClick={handleOpenManageTurns} className="text-[var(--glow)] hover:text-white bg-[var(--glow)]/10 p-1 rounded-sm" title="Gestionar Turnos">
                    <Plus size={14} />
                  </button>
                )}
                <button onClick={() => setIsTurnOrderOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
              {chatroomData?.turns && chatroomData.turns.length > 0 ? (
                chatroomData.turns.map(group => (
                  <div key={group.id}>
                    <div className="flex justify-between items-end mb-4">
                      <h3 className="mono-label">{group.name}</h3>
                      {group.deadline_text && (
                        <span className="text-[8px] text-[var(--glow)] border border-[var(--glow)]/30 bg-[var(--glow)]/10 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">{group.deadline_text}</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {group.characters.map(char => (
                        <TurnItem 
                           key={char.character_id}
                           name={char.name} 
                           status={group.active_character_id === char.character_id ? "Turno Actual" : "En espera"} 
                           initiative={char.initiative.toString()} 
                           isActive={group.active_character_id === char.character_id} 
                        />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-[var(--text-muted)] text-xs font-mono uppercase tracking-widest mt-10">Sin Grupos Activos</div>
              )}
            </div>
          </div>

          {/* Resources Drawer */}
          <div className={`absolute top-0 right-0 bottom-0 w-80 bg-[var(--surface)]/95 backdrop-blur-xl border-l border-[var(--border)] z-30 flex flex-col shadow-2xl transform transition-transform duration-300 ${isResourcesOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <div className="flex items-center gap-2 text-[var(--glow)]">
                <FolderOpen size={14} />
                <h2 className="text-[10px] font-bold tracking-widest uppercase text-[var(--text)]">Recursos & Mapas</h2>
              </div>
              <div className="flex items-center gap-3">
                {isMaster && (
                  <button onClick={() => setIsAddResourceModalOpen(true)} className="text-[var(--glow)] hover:text-white bg-[var(--glow)]/10 p-1 rounded-sm" title="Añadir Recurso">
                    <Plus size={14} />
                  </button>
                )}
                <button onClick={() => setIsResourcesOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
              {chatroomData?.resources?.filter(r => r.type === 'map' || r.type === 'image').length ? (
                <div className="space-y-4">
                  <h3 className="mono-label mb-2">Imágenes y Mapas</h3>
                  {chatroomData.resources.filter(r => r.type === 'map' || r.type === 'image').map(r => (
                    <div key={r.id} className="space-y-2">
                       <div className="relative w-full h-40 rounded-sm overflow-hidden border border-[var(--border)]">
                         <Image src={r.content} alt={r.title} fill className="object-cover transition-all grayscale hover:grayscale-0" />
                       </div>
                       <div className="flex justify-between items-center">
                         <h3 className="mono-label text-[var(--text)]">{r.title}</h3>
                         {r.type === 'map' && <Map size={14} className="text-[var(--glow)] mr-2" />}
                         <a href={r.content} target="_blank" rel="noreferrer" className="text-[var(--glow)] hover:text-white transition-colors bg-[var(--glow)]/10 p-1.5 rounded-sm">
                           <Maximize2 size={12} />
                         </a>
                       </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {chatroomData?.resources?.filter(r => r.type === 'enemy').length ? (
                <div className="space-y-4">
                  <h3 className="mono-label mb-2 border-b border-[var(--danger)]/30 pb-2 text-[var(--danger)]">Enemigos y Bestias</h3>
                  {chatroomData.resources.filter(r => r.type === 'enemy').map(r => (
                    <div key={r.id} className="bg-[var(--surface-alt)] border border-[var(--danger)]/30 rounded-sm overflow-hidden flex flex-col">
                       {r.image_url && (
                         <div className="w-full h-32 relative border-b border-[var(--border)]">
                            <Image src={r.image_url} alt={r.title} fill className="object-cover object-center" />
                         </div>
                       )}
                       <div className="p-4 space-y-3">
                         <h4 className="font-bold text-sm text-[var(--danger)] tracking-wide uppercase">{r.title}</h4>
                         {r.content && <p className="text-[10px] text-[var(--text-muted)] font-mono italic leading-relaxed">{r.content}</p>}
                         
                         <div className="grid grid-cols-2 gap-2 mt-2">
                           {r.hp !== undefined && <div className="bg-[var(--bg)] px-2 py-1.5 rounded-sm flex justify-between items-center"><span className="text-[9px] text-[var(--text-muted)] font-mono">HP</span><span className="text-xs font-bold text-[var(--danger)]">{r.hp}</span></div>}
                           {r.mana !== undefined && <div className="bg-[var(--bg)] px-2 py-1.5 rounded-sm flex justify-between items-center"><span className="text-[9px] text-[var(--text-muted)] font-mono">MANA</span><span className="text-xs font-bold text-[var(--glow)]">{r.mana}</span></div>}
                         </div>
                         
                         {(r.offensive_power || r.defensive_power || r.physical_ability || r.luck) && (
                           <div className="grid grid-cols-2 gap-2">
                             {r.offensive_power && <div className="bg-[var(--bg)] px-2 py-1.5 rounded-sm flex justify-between items-center"><span className="text-[8px] text-[var(--text-muted)] font-mono">ATK</span><span className="text-[10px] font-bold text-[var(--text)]">{r.offensive_power}</span></div>}
                             {r.defensive_power && <div className="bg-[var(--bg)] px-2 py-1.5 rounded-sm flex justify-between items-center"><span className="text-[8px] text-[var(--text-muted)] font-mono">DEF</span><span className="text-[10px] font-bold text-[var(--text)]">{r.defensive_power}</span></div>}
                             {r.physical_ability && <div className="bg-[var(--bg)] px-2 py-1.5 rounded-sm flex justify-between items-center"><span className="text-[8px] text-[var(--text-muted)] font-mono">PHY</span><span className="text-[10px] font-bold text-[var(--text)]">{r.physical_ability}</span></div>}
                             {r.luck && <div className="bg-[var(--bg)] px-2 py-1.5 rounded-sm flex justify-between items-center"><span className="text-[8px] text-[var(--text-muted)] font-mono">LCK</span><span className="text-[10px] font-bold text-[var(--text)]">{r.luck}</span></div>}
                           </div>
                         )}
                         
                         {(r.blaze || r.advanced_element) && (
                           <div className="space-y-1.5 pt-2 border-t border-[var(--border)]">
                             {r.blaze && <div className="flex justify-between items-center"><span className="text-[9px] text-[var(--accent)] font-mono uppercase">Blaze</span><span className="text-[10px] font-bold">{r.blaze}</span></div>}
                             {r.advanced_element && <div className="flex justify-between items-center"><span className="text-[9px] text-[var(--glow)] font-mono uppercase">Elemento</span><span className="text-[10px] font-bold">{r.advanced_element}</span></div>}
                           </div>
                         )}
                         
                         {r.creator && (
                           <div className="pt-2 border-t border-[var(--border)] flex justify-between items-center">
                             <span className="text-[8px] text-[var(--text-muted)] font-mono">CREADOR</span>
                             <span className="text-[9px] text-[var(--text)] uppercase tracking-wider">{r.creator}</span>
                           </div>
                         )}
                       </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {chatroomData?.resources?.filter(r => r.type === 'item').length ? (
                <div className="space-y-4">
                  <h3 className="mono-label mb-2 border-b border-[var(--accent)]/30 pb-2 text-[var(--accent)]">Inventario y Objetos</h3>
                  {chatroomData.resources.filter(r => r.type === 'item').map(r => (
                    <div key={r.id} className="bg-[var(--surface-alt)] border border-[var(--accent)]/30 rounded-sm overflow-hidden flex flex-col p-4 relative group">
                       <div className="flex gap-4">
                         {r.image_url && (
                           <div className="w-16 h-16 relative border border-[var(--border)] rounded-sm shrink-0 overflow-hidden bg-[var(--bg)]">
                              <Image src={r.image_url} alt={r.title} fill className="object-cover object-center" />
                           </div>
                         )}
                         <div className="flex-1 space-y-2">
                           <div className="flex justify-between items-start">
                             <h4 className="font-bold text-xs text-[var(--accent)] tracking-wide uppercase line-clamp-2">{r.title}</h4>
                             {r.item_type && <span className="text-[8px] bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 px-1.5 py-0.5 rounded-sm">{r.item_type}</span>}
                           </div>
                           {r.content && <p className="text-[10px] text-[var(--text-muted)] font-mono leading-relaxed">{r.content}</p>}
                         </div>
                       </div>
                       
                       {(r.stats || r.effect) && (
                         <div className="top-full mt-3 pt-3 border-t border-[var(--border)] space-y-2">
                           {r.stats && <div className="flex flex-col"><span className="text-[8px] text-[var(--text-muted)] font-mono">ESTADÍSTICAS</span><span className="text-[10px] font-bold text-[var(--glow)]">{r.stats}</span></div>}
                           {r.effect && <div className="flex flex-col"><span className="text-[8px] text-[var(--text-muted)] font-mono">EFECTO MÁGICO/PASIVA</span><span className="text-[10px] font-bold font-serif italic text-[var(--text)]">{r.effect}</span></div>}
                         </div>
                       )}
                    </div>
                  ))}
                </div>
              ) : null}

              {chatroomData?.resources?.filter(r => r.type === 'text').length ? (
                <div className="space-y-4">
                  <h3 className="mono-label mb-2">Notas y Documentos</h3>
                  {chatroomData.resources.filter(r => r.type === 'text').map(r => (
                    <div key={r.id} className="bg-[var(--accent)]/10 border-l-2 border-[var(--accent)] p-4 rounded-r-sm space-y-2 relative group">
                       <h4 className="mono-label text-[var(--glow)]">{r.title}</h4>
                       <p className="text-xs text-[var(--text)] font-sans leading-relaxed whitespace-pre-wrap">{r.content}</p>
                    </div>
                  ))}
                </div>
              ) : null}
              
              {(!chatroomData?.resources || chatroomData.resources.length === 0) && (
                <div className="text-center text-[var(--text-muted)] text-xs font-mono uppercase tracking-widest mt-10">Sin Recursos</div>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Bottom Bar (Input Area) */}
      <footer className="h-32 border-t border-[var(--border)] bg-[var(--surface)] flex items-center px-6 gap-6 z-20 relative shrink-0">
        
        {/* Character Stats */}
        <button 
          onClick={handleOpenEditStatus}
          className="flex items-center gap-4 bg-[var(--surface-alt)] hover:bg-[var(--surface)] border border-[var(--border-light)] hover:border-[var(--glow)]/50 p-3 rounded-sm min-w-[260px] shadow-inner transition-colors text-left group"
          title="Editar Estado (HP/Mana)"
        >
          <div className="relative w-16 h-16 rounded-sm overflow-hidden border border-[var(--surface)] bg-[var(--border)] group-hover:border-[var(--glow)]/30 transition-colors">
             <User size={24} className="text-[var(--text-muted)] absolute inset-0 m-auto" />
          </div>
          <div className="flex-1 flex flex-col justify-center gap-1.5">
            {/* Character Name */}
            <div className="text-xs font-bold text-[var(--text)] uppercase tracking-wider mb-0.5 line-clamp-1">{activeChatroomCharacter?.name}</div>
            
            {/* HP */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[9px] font-mono">
                <span className="text-[var(--danger)] font-bold">HP</span>
                <span className="text-[var(--text-muted)]">{activeChatroomCharacter?.hp}/{activeChatroomCharacter?.max_hp}</span>
              </div>
              <div className="h-1 w-full bg-[var(--border)] rounded-none overflow-hidden">
                <div className="h-full bg-[var(--danger)] w-full shadow-[0_0_5px_var(--danger)]" style={{ width: `${Math.max(0, Math.min(100, ((activeChatroomCharacter?.hp || 0) / (activeChatroomCharacter?.max_hp || 1)) * 100))}%` }}></div>
              </div>
            </div>
            {/* Mana */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[9px] font-mono">
                <span className="text-[var(--glow)] font-bold">MANA</span>
                <span className="text-[var(--text-muted)]">{activeChatroomCharacter?.mana}/{activeChatroomCharacter?.max_mana}</span>
              </div>
              <div className="h-1 w-full bg-[var(--border)] rounded-none overflow-hidden">
                <div className="h-full bg-[var(--glow)] w-full shadow-[0_0_5px_var(--glow)]" style={{ width: `${Math.max(0, Math.min(100, ((activeChatroomCharacter?.mana || 0) / (activeChatroomCharacter?.max_mana || 1)) * 100))}%` }}></div>
              </div>
            </div>
          </div>
          {/* Status Badge */}
          {activeChatroomCharacter?.advantage_status && activeChatroomCharacter.advantage_status !== 'normal' && (
            <div className="h-full flex flex-col justify-start">
              <div className="inline-flex items-center justify-center px-1.5 py-0.5 bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-sm text-[8px] text-[var(--danger)] font-bold uppercase tracking-widest">
                {activeChatroomCharacter.advantage_status}
              </div>
            </div>
          )}
        </button>

        {/* Input Area */}
        <form className="flex-1 flex flex-col gap-3 h-full py-4" onSubmit={handleSendMessage}>
          <div className="flex items-center gap-3">
            {/* Expression / Sprite Selection */}
            {activeCharacterSprites.length > 0 && (
              <div className="relative flex items-center gap-1">
                <div className="relative">
                  <select 
                    value={selectedSpriteId || activeCharacterSprites[0]?.id || ''}
                    onChange={(e) => setSelectedSpriteId(e.target.value)}
                    className="bg-[var(--surface-alt)] border border-[var(--border-light)] text-[var(--text)] text-[10px] uppercase tracking-wider font-bold rounded-sm px-3 py-1.5 outline-none focus:border-[var(--glow)]/50 appearance-none min-w-[200px] pr-8 cursor-pointer hover:bg-[var(--border)] transition-colors"
                  >
                  {activeCharacterSprites.map(sprite => (
                      <option key={sprite.id} value={sprite.id}>{sprite.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
                     <User size={12} />
                  </div>
                </div>
                {selectedSpriteId && (
                  <button
                     type="button"
                     onClick={() => openEditSprite(activeCharacterSprites.find(s => s.id === selectedSpriteId)!)}
                     className="p-1.5 text-[var(--text-muted)] hover:text-[var(--glow)] hover:bg-[var(--glow)]/10 rounded-sm transition-colors border border-transparent"
                     title="Editar o Eliminar este Sprite"
                  >
                     <Pencil size={14} />
                  </button>
                )}
              </div>
            )}
            
            <button 
              type="button"
              onClick={openAddSprite}
              className="px-2 py-1.5 bg-[var(--surface-alt)] border border-[var(--border-light)] hover:border-[var(--glow)]/50 hover:text-[var(--glow)] text-[var(--text-muted)] rounded-sm transition-colors"
              title="Añadir un nuevo Sprite"
            >
               <ImagePlus size={14} />
            </button>

            {/* Target Selector (Master Only) */}
            {activeChatroomCharacter?.name === 'TMC: Master' && (
               <div className="relative animate-in fade-in slide-in-from-bottom-2">
                 <select 
                     value={selectedTargetUserId || ''} 
                     onChange={e => setSelectedTargetUserId(e.target.value)}
                     className="bg-[var(--surface-alt)] border border-[var(--glow)]/30 text-[var(--glow)] text-[10px] uppercase tracking-wider font-bold rounded-sm px-3 py-1.5 outline-none focus:border-[var(--glow)] appearance-none min-w-[200px] pr-8 cursor-pointer hover:bg-[var(--glow)]/10 transition-colors shadow-[0_0_10px_rgba(59,130,246,0.1)] truncate"
                 >
                     <option value="">Narrativa General</option>
                     {chatters.map(c => <option key={c.id} value={c.id}>Susurro: {c.username}</option>)}
                 </select>
                 <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--glow)]">
                    <User size={12} />
                 </div>
               </div>
            )}

            {/* Character Switcher */}
            <div className="relative">
              <select 
                value={activeChatroomCharacter.id}
                onChange={(e) => setActiveCharacter(e.target.value)}
                className="bg-[var(--surface-alt)] border border-[var(--border-light)] text-[var(--accent)] text-[10px] uppercase tracking-wider font-bold rounded-sm px-3 py-1.5 outline-none focus:border-[var(--glow)]/50 appearance-none min-w-[150px] pr-8 cursor-pointer hover:bg-[var(--border)] transition-colors"
              >
                {myChatroomCharacters.map(char => (
                  <option key={char.id} value={char.id}>{char.name}</option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
                 <User size={12} />
              </div>
            </div>

            <button 
              type="button"
              onClick={() => {
                if (user && vaultCharacters.length === 0) fetchVaultCharacters(user.id);
                setIsAddCharacterModalOpen(true);
              }}
              className="px-2 py-1.5 bg-[var(--surface-alt)] border border-[var(--border-light)] hover:border-[var(--glow)]/50 hover:text-[var(--glow)] text-[var(--text-muted)] rounded-sm transition-colors"
              title="Añadir otro personaje"
            >
               <Plus size={14} />
            </button>
          </div>

          <div className="flex-1 relative flex items-end gap-2">
              <textarea 
                value={messageInput}
                onChange={e => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if(e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                className={`w-full h-full bg-[var(--surface-alt)] border ${activeChatroomCharacter?.name === 'TMC: Master' && selectedTargetUserId ? 'border-[var(--glow)] focus:ring-[var(--glow)]' : 'border-[var(--border-light)] focus:ring-[var(--glow)]/50'} rounded-sm p-3 pr-12 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] resize-none outline-none focus:ring-1 custom-scrollbar transition-all font-mono`}
                placeholder={activeChatroomCharacter?.name === 'TMC: Master' && selectedTargetUserId ? `Escribiendo susurro oculto...` : "Escribe tu mensaje... (Enter para enviar)"}
              ></textarea>
              <button type="submit" className="absolute right-2 bottom-2 p-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-sm transition-colors shadow-[0_0_10px_var(--glow)]">
                <Send size={14} />
              </button>
          </div>
        </form>

        {/* Paneles (Drawers) */}
        <div className="flex flex-col gap-2 min-w-[140px] h-full py-4 justify-end border-r border-[var(--border)] pr-6">
          <div className="text-[9px] font-bold tracking-[0.2em] text-[var(--text-muted)] uppercase text-center mb-0.5">PÁNELES</div>
          <div className="flex justify-between gap-2">
            <button 
              onClick={() => { setIsHistoryOpen(!isHistoryOpen); setIsTurnOrderOpen(false); setIsResourcesOpen(false); }} 
              className={`flex-1 h-9 rounded-sm flex items-center justify-center transition-all border ${isHistoryOpen ? 'bg-[var(--accent)] border-[var(--glow)] text-white shadow-[0_0_10px_var(--glow)]' : 'bg-[var(--surface-alt)] border-[var(--border-light)] text-[var(--text-muted)] hover:text-[var(--glow)] hover:border-[var(--glow)]/50'}`}
              title="Historial de Chat"
            >
              <MessageSquare size={14} />
            </button>
            <button 
              onClick={() => { setIsResourcesOpen(!isResourcesOpen); setIsTurnOrderOpen(false); setIsHistoryOpen(false); }} 
              className={`flex-1 h-9 rounded-sm flex items-center justify-center transition-all border ${isResourcesOpen ? 'bg-[var(--accent)] border-[var(--glow)] text-white shadow-[0_0_10px_var(--glow)]' : 'bg-[var(--surface-alt)] border-[var(--border-light)] text-[var(--text-muted)] hover:text-[var(--glow)] hover:border-[var(--glow)]/50'}`}
              title="Recursos"
            >
              <FolderOpen size={14} />
            </button>
            <button 
              onClick={() => { setIsTurnOrderOpen(!isTurnOrderOpen); setIsResourcesOpen(false); setIsHistoryOpen(false); }} 
              className={`flex-1 h-9 rounded-sm flex items-center justify-center transition-all border ${isTurnOrderOpen ? 'bg-[var(--accent)] border-[var(--glow)] text-white shadow-[0_0_10px_var(--glow)]' : 'bg-[var(--surface-alt)] border-[var(--border-light)] text-[var(--text-muted)] hover:text-[var(--glow)] hover:border-[var(--glow)]/50'}`}
              title="Orden de Turnos"
            >
              <Clock size={14} />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 min-w-[160px] h-full py-4 justify-end">
          <button onClick={() => setIsDiceModalOpen(true)} className="flex items-center justify-center gap-2 bg-transparent hover:bg-[var(--accent)]/10 border border-[var(--accent)]/50 text-[var(--accent)] px-4 py-2.5 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all shadow-[0_0_10px_rgba(59,130,246,0.05)] hover:shadow-[0_0_15px_rgba(59,130,246,0.15)]">
            <Dices size={14} />
            Tirar Dado
          </button>
          <button onClick={handlePassTurn} className="flex items-center justify-center gap-2 bg-transparent hover:bg-[var(--border)] border border-[var(--border-light)] text-[var(--text)] px-4 py-2.5 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-colors hover:text-[var(--glow)]">
            <SkipForward size={14} />
            Pasar Turno
          </button>
        </div>
      </footer>

      {/* Room Details Modal */}
      {isRoomDetailsOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-sm shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] flex justify-between items-center bg-[var(--surface-alt)]">
              <h2 className="text-xs font-bold text-[var(--text)] tracking-widest uppercase">Detalles de la Sala</h2>
              <button onClick={() => setIsRoomDetailsOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div>
                <h3 className="mono-label mb-2">Sala</h3>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-[var(--text)] font-medium tracking-wide">{chatroomData?.title || 'Cargando...'}</p>
                  <span className="text-[9px] px-2 py-0.5 bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 rounded-full font-bold uppercase tracking-widest">
                    {chatroomData?.chat_type || 'Recreativo'}
                  </span>
                </div>
              </div>
              
              <div>
                <h3 className="mono-label mb-2">Descripción</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed font-mono">
                  {chatroomData?.description || 'Sin descripción.'}
                </p>
              </div>

              <div className="flex gap-6 border-t border-[var(--border-light)]/30 pt-4">
                <div>
                  <h4 className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tighter mb-1">Creador</h4>
                  <p className="text-xs font-mono">{chatroomData?.creator_username || 'Desconocido'}</p>
                </div>
                <div>
                  <h4 className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tighter mb-1">Participantes</h4>
                  <p className="text-xs font-mono">{chatroomData?.masters_ids ? (chatroomData.masters_ids.length + (chatroomData.creator_id ? 1 : 0) + (chatroomData.chatters_ids ? chatroomData.chatters_ids.length : 0)) : chatters.length}</p>
                </div>
                <div>
                  <h4 className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tighter mb-1">Masters</h4>
                  <p className="text-xs font-mono">{(chatroomData?.masters_ids?.length || 0) + 1}</p>
                </div>
              </div>

              {/* Staff Management Section - Only for Creator */}
              {profile?.id === chatroomData?.creator_id && (
                <div className="pt-4 border-t border-[var(--border-light)]/30 space-y-4">
                  <h3 className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest">Gestión de Staff</h3>
                  
                  <div className="space-y-2">
                    <label className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Modo de Rol</label>
                    <div className="flex gap-2">
                      {[
                        { id: 'free_roleplay', label: 'Libre' },
                        { id: 'combat', label: 'Combate' },
                        { id: 'turn_based', label: 'Turnos' }
                      ].map(mode => (
                        <button
                          key={mode.id}
                          onClick={() => handleUpdateRoleplayMode(mode.id)}
                          className={`flex-1 py-1.5 text-[9px] font-bold uppercase rounded-sm border transition-all ${chatroomData?.roleplay_type === mode.id ? 'bg-[var(--accent)] border-[var(--glow)] text-white shadow-[0_0_10px_var(--glow)]' : 'bg-[var(--surface-alt)] border-[var(--border-light)] text-[var(--text-muted)] hover:border-[var(--glow)]/30'}`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Control de Música (BGM)</label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={bgmInput}
                        onChange={(e) => setBgmInput(e.target.value)}
                        placeholder="Link directo .mp3"
                        className="flex-1 bg-[var(--surface-alt)] border border-[var(--border-light)] text-[10px] font-mono rounded-sm px-3 py-2 outline-none focus:border-[var(--glow)]/50"
                      />
                      <button 
                        onClick={handleSyncBGM}
                        className="bg-[var(--glow)]/10 hover:bg-[var(--glow)]/20 text-[var(--glow)] border border-[var(--glow)]/30 px-3 py-1 rounded-sm text-[9px] font-bold uppercase tracking-widest transition-all"
                      >
                        Set
                      </button>
                    </div>
                    {chatroomData?.bgm_url && (
                      <div className="flex flex-col gap-2 bg-[var(--surface-alt)]/50 p-3 rounded-sm border border-[var(--border-light)]">
                        <div className="flex items-center justify-between">
                          <p className="text-[8px] font-mono text-[var(--text-muted)] truncate uppercase tracking-tighter max-w-[150px]">Link: {chatroomData.bgm_url}</p>
                          <button onClick={() => { setBgmInput(''); handleSyncBGM(); }} className="text-[var(--danger)] hover:text-red-500">
                            <Trash2 size={10} />
                          </button>
                        </div>
                        <div className="flex gap-2">
                           <button 
                             onClick={handleToggleBGM}
                             className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-sm border transition-all text-[9px] font-bold uppercase ${chatroomData?.bgm_state?.playing ? 'bg-[var(--danger)]/10 border-[var(--danger)]/30 text-[var(--danger)]' : 'bg-[var(--glow)]/10 border-[var(--glow)]/30 text-[var(--glow)]'}`}
                           >
                             {chatroomData?.bgm_state?.playing ? <Pause size={12} /> : <Play size={12} />}
                             {chatroomData?.bgm_state?.playing ? 'Pausar' : 'Reproducir'}
                           </button>
                           <button 
                             onClick={handleRestartBGM}
                             className="flex items-center justify-center gap-2 px-3 py-1.5 bg-[var(--surface-alt)] border border-[var(--border-light)] text-[var(--text-muted)] hover:text-[var(--text)] rounded-sm text-[9px] font-bold uppercase transition-all"
                           >
                             <RotateCcw size={12} />
                             Reiniciar
                           </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                       <label className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Volumen Local</label>
                       <span className="text-[10px] font-mono text-[var(--glow)]">{(volume * 100).toFixed(0)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.01" 
                      value={volume} 
                      onChange={(e) => setVolume(parseFloat(e.target.value))} 
                      className="w-full h-1 bg-[var(--border-light)] rounded-full appearance-none cursor-pointer accent-[var(--glow)]" 
                    />
                  </div>

                   <div className="pt-4 border-t border-[var(--border-light)]/30 space-y-3">
                     <label className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Imagen de Fondo (Background)</label>
                     <ImageUploader 
                       value={chatroomData?.background_url || ''} 
                       onChange={async (url) => {
                         const supabase = createClient();
                         const { error } = await supabase.from('chatrooms').update({ background_url: url }).eq('id', id);
                         if (!error) {
                           setChatroomData(prev => prev ? { ...prev, background_url: url } : null);
                         }
                       }}
                       label="Fondo de la Sala"
                       bucket="chatroom_images"
                     />
                   </div>

                  <div className="space-y-2">
                    <label className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Tipo de Sala</label>
                    <div className="flex flex-wrap gap-2">
                      {['Recreativo', 'Off-rol', 'Eventos', 'Misiones'].map(type => (
                        <button
                          key={type}
                          onClick={() => handleUpdateChatType(type)}
                          className={`px-3 py-1 text-[9px] font-bold uppercase rounded-sm border transition-all ${chatroomData?.chat_type === type ? 'bg-[var(--accent)] border-[var(--glow)] text-white' : 'bg-[var(--surface-alt)] border-[var(--border-light)] text-[var(--text-muted)] hover:border-[var(--accent)]/50'}`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Añadir Master (Staff)</label>
                    <div className="flex gap-2">
                      <select 
                        value={newMasterId}
                        onChange={(e) => setNewMasterId(e.target.value)}
                        className="flex-1 bg-[var(--surface-alt)] border border-[var(--border-light)] text-xs font-mono rounded-sm px-3 py-2 outline-none focus:border-[var(--accent)]"
                      >
                        <option value="" disabled>{isFetchingStaff ? 'Cargando Staff...' : 'Seleccionar Staff...'}</option>
                        {staffProfiles
                          .filter(p => !chatroomData?.masters_ids?.includes(p.id))
                          .map(p => (
                          <option key={p.id} value={p.id}>
                            {p.username} ({maskEmail(p.email)})
                          </option>
                        ))}
                      </select>
                      <button 
                        onClick={handleAddMaster}
                        disabled={isAddingMaster || !newMasterId}
                        className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-3 py-2 rounded-sm disabled:opacity-50 transition-colors"
                      >
                        {isAddingMaster ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                      </button>
                    </div>
                  </div>

                  {chatroomData?.masters_ids && chatroomData.masters_ids.length > 0 && (
                     <div className="space-y-2">
                       <label className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Masters Actuales</label>
                       <div className="space-y-1">
                         {chatroomData.masters_ids.map(mid => (
                           <div key={mid} className="flex items-center justify-between bg-[var(--surface-alt)] p-2 rounded-sm border border-[var(--border-light)]">
                              <span className="text-[10px] font-bold text-[var(--accent)] truncate max-w-[200px]">
                                {staffProfiles.find(p => p.id === mid)?.username || 'Cargando...'}
                              </span>
                             <button 
                               onClick={() => handleRemoveMaster(mid)}
                               className="text-[var(--danger)] hover:text-red-500 p-1"
                             >
                               <Trash2 size={12} />
                             </button>
                           </div>
                         ))}
                       </div>
                     </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-5 border-t border-[var(--border)] bg-[var(--surface-alt)] flex justify-end">
              <button 
                onClick={handleLeaveRoom}
                className="px-4 py-2 bg-transparent text-[var(--danger)] hover:bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-colors"
               >
                Abandonar Sala
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Status Modal */}
      {isEditStatusModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-sm shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] flex justify-between items-center bg-[var(--surface-alt)]">
              <h2 className="text-xs font-bold text-[var(--text)] tracking-widest uppercase">Modificar Estado</h2>
              <button onClick={() => setIsEditStatusModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-6">
               <div className="flex flex-col gap-2">
                 <label className="text-[10px] font-bold tracking-widest text-[var(--accent)] uppercase">Nombre del Personaje</label>
                 <input 
                   type="text" 
                   value={editName}
                   onChange={(e) => setEditName(e.target.value)}
                   className="w-full bg-[var(--surface-alt)] border border-[var(--border-light)] text-[var(--text)] font-mono text-sm rounded-sm p-3 outline-none focus:border-[var(--accent)] transition-colors"
                 />
               </div>

               <div className="flex flex-col gap-2">
                 <label className="text-[10px] font-bold tracking-widest text-[var(--danger)] uppercase">Health Points (HP)</label>
                 <div className="flex items-center gap-3">
                   <input 
                     type="number" 
                     value={editHp}
                     onChange={(e) => {
                       const val = Number(e.target.value);
                       setEditHp(Math.min(Math.max(0, val), activeChatroomCharacter?.max_hp || 0));
                     }}
                     className="w-full bg-[var(--surface-alt)] border border-[var(--border-light)] text-[var(--text)] font-mono text-lg rounded-sm p-3 outline-none focus:border-[var(--danger)] transition-colors text-center"
                   />
                   <span className="text-[var(--text-muted)] font-mono text-sm whitespace-nowrap">/ {activeChatroomCharacter?.max_hp}</span>
                 </div>
               </div>

               <div className="flex flex-col gap-2">
                 <label className="text-[10px] font-bold tracking-widest text-[var(--glow)] uppercase">Mana Points (MP)</label>
                 <div className="flex items-center gap-3">
                   <input 
                     type="number" 
                     value={editMana}
                     onChange={(e) => {
                       const val = Number(e.target.value);
                       setEditMana(Math.min(Math.max(0, val), activeChatroomCharacter?.max_mana || 0));
                     }}
                     className="w-full bg-[var(--surface-alt)] border border-[var(--border-light)] text-[var(--text)] font-mono text-lg rounded-sm p-3 outline-none focus:border-[var(--glow)] transition-colors text-center"
                   />
                   <span className="text-[var(--text-muted)] font-mono text-sm whitespace-nowrap">/ {activeChatroomCharacter?.max_mana}</span>
                 </div>
               </div>
            </div>
            <div className="p-5 border-t border-[var(--border)] bg-[var(--surface-alt)] flex justify-between items-center gap-4">
              <button 
                onClick={handleSyncStats}
                disabled={isSyncing}
                title="Restaurar HP/Mana al máximo (Sincronizar Vault)"
                className="w-10 h-10 flex items-center justify-center shrink-0 border border-[var(--glow)]/30 text-[var(--glow)] hover:bg-[var(--glow)]/10 rounded-sm transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
              </button>
              
              <div className="flex w-full sm:w-auto gap-3 justify-end shrink-0">
                <button 
                  onClick={() => setIsEditStatusModalOpen(false)}
                  className="px-4 py-2 border border-[var(--border-light)] text-[var(--text-muted)] hover:text-[var(--text)] rounded-sm text-[10px] font-bold uppercase tracking-widest transition-colors"
                  >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveStatus}
                  className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-sm text-[10px] font-bold uppercase tracking-widest transition-colors shadow-[0_0_10px_var(--glow)]"
                 >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BGM Player */}
      {chatroomData?.bgm_url && (
        <audio 
          ref={audioRef}
          src={chatroomData.bgm_url} 
          autoPlay 
          loop 
        />
      )}

      {/* Dice Roll Modal */}
      {isDiceModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xs bg-[var(--surface)] border border-[var(--border)] rounded-sm shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--surface-alt)]">
              <h2 className="text-[10px] font-bold text-[var(--text)] tracking-widest uppercase">Lanzar Dados</h2>
              <button onClick={() => setIsDiceModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                <X size={14} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Cantidad</label>
                <div className="flex bg-[var(--surface-alt)] border border-[var(--border-light)] rounded-sm overflow-hidden">
                   <button 
                    onClick={() => setDiceAmount(Math.max(1, diceAmount - 1))}
                    className="flex-1 py-2 hover:bg-[var(--border)] text-[var(--text)] text-sm font-bold"
                   >-</button>
                   <div className="flex-[2] py-2 text-center text-sm font-bold text-[var(--glow)] border-x border-[var(--border-light)]">{diceAmount}</div>
                   <button 
                    onClick={() => setDiceAmount(Math.min(20, diceAmount + 1))}
                    className="flex-1 py-2 hover:bg-[var(--border)] text-[var(--text)] text-sm font-bold"
                   >+</button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Tipo de Dado</label>
                <div className="grid grid-cols-3 gap-2">
                  {[4, 6, 8, 10, 12, 20, 100].map(sides => (
                    <button
                      key={sides}
                      onClick={() => setDiceSides(sides)}
                      className={`py-2 text-[10px] border rounded-sm transition-all font-bold ${diceSides === sides ? 'bg-[var(--accent)] border-[var(--glow)] text-white shadow-[0_0_8px_var(--glow)]' : 'bg-[var(--surface-alt)] border-[var(--border-light)] text-[var(--text-muted)] hover:border-[var(--glow)]/30'}`}
                    >
                      D{sides}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-alt)]">
              <button 
                onClick={() => handleDiceRoll(diceAmount, diceSides)}
                className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all shadow-[0_0_10px_var(--glow)]"
              >
                Lanzar {diceAmount}d{diceSides}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
