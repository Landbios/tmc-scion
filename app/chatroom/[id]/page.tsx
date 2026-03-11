'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useCharacterStore } from '@/store/characterStore';
import { useMessageStore } from '@/store/messageStore';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
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
  Maximize2
} from 'lucide-react';
import Image from 'next/image';
import ImageUploader from '@/components/ImageUploader';

// --- Subcomponents ---

const Message = ({ sender, time, text, color, isWhisper, targetName }: { sender: string, time: string, text: string, color?: string, isWhisper?: boolean, targetName?: string }) => (
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
);

const DiceMessage = ({ sender, time, text, result, color }: { sender: string, time: string, text: string, result: string, color?: string }) => (
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
);

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

export default function ChatUI() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { 
    checkJoinedStatus, 
    activeChatroomCharacter, 
    myChatroomCharacters,
    setActiveCharacter,
    activeCharacterSprites,
    isLoading: isCharLoading, 
    vaultCharacters, 
    fetchVaultCharacters, 
    joinChatroom,
    leaveChatroom,
    updateCharacterStatus,
    syncCharacterStats
  } = useCharacterStore();
  const [isChecking, setIsChecking] = useState(true);

  const [isTurnOrderOpen, setIsTurnOrderOpen] = useState(false);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
  const [isRoomDetailsOpen, setIsRoomDetailsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAddCharacterModalOpen, setIsAddCharacterModalOpen] = useState(false);
  const [isAddSpriteModalOpen, setIsAddSpriteModalOpen] = useState(false);
  const [isEditStatusModalOpen, setIsEditStatusModalOpen] = useState(false);
  const [editHp, setEditHp] = useState(0);
  const [editMana, setEditMana] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [newSpriteName, setNewSpriteName] = useState('');
  const [newSpriteUrl, setNewSpriteUrl] = useState('');
  const [isUploadingSprite, setIsUploadingSprite] = useState(false);
  
  interface ChatroomResource {
    id: string;
    type: 'image' | 'text' | 'map';
    title: string;
    content: string;
  }

  interface ChatroomData {
    id: string;
    title: string;
    description: string | null;
    background_url?: string;
    roleplay_type?: string;
    resources?: ChatroomResource[];
  }

  const [chatroomData, setChatroomData] = useState<ChatroomData | null>(null);

  // Whisper / Target state
  const [chatters, setChatters] = useState<{id: string, username: string}[]>([]);
  const [selectedTargetUserId, setSelectedTargetUserId] = useState<string | null>(null);

  // Resource State
  const [isAddResourceModalOpen, setIsAddResourceModalOpen] = useState(false);
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceType, setNewResourceType] = useState<'image' | 'text' | 'map'>('image');
  const [newResourceContent, setNewResourceContent] = useState('');
  const [isUploadingResource, setIsUploadingResource] = useState(false);

  const isMaster = myChatroomCharacters.some(c => c.name === 'TMC: Master');

  const handleAddResource = async () => {
    if (!chatroomData || !newResourceTitle || !newResourceContent) return;
    setIsUploadingResource(true);
    
    const newResource: ChatroomResource = {
      id: crypto.randomUUID(),
      type: newResourceType,
      title: newResourceTitle,
      content: newResourceContent
    };
    
    const updatedResources = [...(chatroomData.resources || []), newResource];
    
    const supabase = createClient();
    const { error } = await supabase.from('chatrooms').update({ resources: updatedResources }).eq('id', chatroomData.id);
    
    if (!error) {
      setChatroomData({ ...chatroomData, resources: updatedResources });
      setIsAddResourceModalOpen(false);
      setNewResourceTitle('');
      setNewResourceContent('');
    } else {
      alert('Error guardando el recurso.');
    }
    setIsUploadingResource(false);
  };

  const handleAddSprite = async () => {
    if (!activeChatroomCharacter?.vault_character_id || !newSpriteName || !newSpriteUrl) return;
    setIsUploadingSprite(true);
    const success = await useCharacterStore.getState().addSprite(activeChatroomCharacter.vault_character_id, newSpriteName, newSpriteUrl);
    if (success) {
      setIsAddSpriteModalOpen(false);
      setNewSpriteName('');
      setNewSpriteUrl('');
      
      // Auto-select the newly added sprite by fetching the latest sprites and selecting the newest one
      setTimeout(() => {
        const sprites = useCharacterStore.getState().activeCharacterSprites;
        if (sprites.length > 0) {
           setSelectedSpriteId(sprites[sprites.length - 1].id);
        }
      }, 500);
    }
    setIsUploadingSprite(false);
  };

  const handleOpenEditStatus = () => {
    if (!activeChatroomCharacter) return;
    setEditHp(activeChatroomCharacter.hp);
    setEditMana(activeChatroomCharacter.mana);
    setIsEditStatusModalOpen(true);
  };

  const handleSaveStatus = async () => {
    if (!activeChatroomCharacter) return;
    const success = await updateCharacterStatus(activeChatroomCharacter.id, editHp, editMana);
    if (success) {
      setIsEditStatusModalOpen(false);
    } else {
      alert("Hubo un error al actualizar el estado.");
    }
  };

  const handleSyncStats = async () => {
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
  };

  const { 
    messages, 
    fetchMessages, 
    subscribeToMessages, 
    unsubscribeFromMessages, 
    sendMessage,
    activeSubscription
  } = useMessageStore();

  const [messageInput, setMessageInput] = useState('');
  const [selectedSpriteId, setSelectedSpriteId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set default selected sprite when sprites load or character changes
  useEffect(() => {
    if (activeCharacterSprites.length > 0) {
       // Only default to the first sprite if we haven't selected one, or if the selected one doesn't belong to this character
       const isValid = activeCharacterSprites.some(s => s.id === selectedSpriteId);
       if (!isValid) {
         setSelectedSpriteId(activeCharacterSprites[0].id);
       }
    } else {
       setSelectedSpriteId(null);
    }
  }, [activeCharacterSprites, selectedSpriteId]);

  useEffect(() => {
    if (user && id) {
      // Fetch specific chatroom data safely inline
      const fetchChatroomData = async () => {
        const supabase = createClient();
        const { data } = await supabase.from('chatrooms').select('*').eq('id', id).maybeSingle();
        if (data) {
          setChatroomData({
            id: data.id,
            title: data.title,
            description: data.description,
            background_url: data.background_url,
            roleplay_type: data.roleplay_type,
            resources: data.resources || []
          });
        }
      };
      fetchChatroomData();

      if (!activeSubscription) {
        subscribeToMessages(id as string, user.id);
        fetchMessages(id as string, user.id);
      }

      const verifyJoin = async () => {
        const hasJoined = await checkJoinedStatus(id as string, user.id);
        if (!hasJoined) {
          if (vaultCharacters.length === 0) fetchVaultCharacters(user.id);
        }
        setIsChecking(false);
      };
      verifyJoin();

      // Fetch chatters for whisper targeting
      const fetchChattersForMaster = async () => {
        const supabase = createClient();
        const { data } = await supabase.from('chatrooms').select('chatters_ids').eq('id', id).single();
        if(data && data.chatters_ids && data.chatters_ids.length > 0) {
           const { data: users } = await supabase.from('profiles').select('id, username').in('id', data.chatters_ids);
           if(users) setChatters(users);
        }
      };
      fetchChattersForMaster();
    }
  }, [id, user, subscribeToMessages, fetchMessages, checkJoinedStatus, activeSubscription, fetchVaultCharacters, vaultCharacters.length]);

  // When successfully joined from the modal, we must sub and fetch
  const handleJoin = async (char: any) => {
    const success = await joinChatroom(id as string, user!.id, char);
    if (success) {
      setIsAddCharacterModalOpen(false);
      // Fetch and sub only if we weren't already in the room
      if (myChatroomCharacters.length === 0) {
        fetchMessages(id as string, user!.id);
        subscribeToMessages(id as string, user!.id);
      }
    }
  };

  useEffect(() => {
    if (isHistoryOpen && messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [messages, isHistoryOpen]);

  const handleLeaveRoom = async () => {
    if (!user || !id) return;
    if (confirm("¿Estás seguro de que deseas abandonar esta sala? Tus personajes registrados en esta instancia serán retirados.")) {
      const success = await leaveChatroom(id as string, user.id);
      if (success) {
        router.push('/dashboard');
      } else {
        alert('Hubo un error al intentar abandonar la sala.');
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChatroomCharacter || !user) return;
    
    // Safety check: ensure we actually send a valid sprite ID if one is available
    if (activeChatroomCharacter) {
      const isMaster = activeChatroomCharacter.name === 'TMC: Master';
      
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
      } else {
        alert("Error al enviar el mensaje.");
      }
    }
  };

  const handleDiceRoll = async () => {
    if (!activeChatroomCharacter || !user) return;
    const roll = Math.floor(Math.random() * 20) + 1;
    await sendMessage({
      chatroom_id: id as string,
      sender_id: user.id,
      character_id: activeChatroomCharacter.id,
      content: `Tirada de ${activeChatroomCharacter.name}`,
      is_system_message: true,
      dice_result: { roll, type: '1d20' }
    });
  };

  if (isChecking || isCharLoading) {
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
         
         {vaultCharacters.length === 0 ? (
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
                  className="bg-[var(--surface-alt)] hover:bg-[var(--surface)] border border-[var(--border-light)] hover:border-[var(--glow)]/50 p-5 rounded-sm flex flex-col items-center gap-4 transition-all shadow-lg hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] group"
                >
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
                          className="bg-[var(--surface-alt)] hover:bg-[var(--surface)] border border-[var(--border-light)] hover:border-[var(--glow)]/50 p-4 rounded-sm flex flex-col items-center gap-3 transition-all group"
                        >
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

      {/* Add Sprite Modal */}
      {isAddSpriteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
           <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-sm shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-[var(--border)] flex justify-between items-center bg-[var(--surface-alt)]">
                <h2 className="text-xs font-bold text-[var(--text)] tracking-widest uppercase">Registrar Nuevo Sprite</h2>
                <button onClick={() => setIsAddSpriteModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                 <div>
                   <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">Nombre / Expresión</label>
                   <input 
                     type="text" 
                     value={newSpriteName}
                     onChange={e => setNewSpriteName(e.target.value)}
                     placeholder="Ej: Enojado, Sonriendo..."
                     className="w-full bg-[var(--surface-alt)] border border-[var(--border-light)] text-[var(--text)] font-mono text-sm rounded-sm p-2.5 outline-none focus:border-[var(--glow)]/50 transition-colors"
                   />
                 </div>
                 <div className="mb-2">
                   <ImageUploader 
                     value={newSpriteUrl} 
                     onChange={setNewSpriteUrl} 
                     label="Imagen del Sprite (URL o Subir)"
                     bucket="character-sprites"
                   />
                 </div>
                 <div className="pt-2 flex justify-end gap-3">
                   <button 
                     type="button" 
                     onClick={() => setIsAddSpriteModalOpen(false)}
                     className="px-4 py-2 border border-[var(--border-light)] text-[var(--text-muted)] hover:text-[var(--text)] rounded-sm text-[10px] font-bold uppercase tracking-widest transition-colors"
                   >
                     Cancelar
                   </button>
                   <button 
                     type="button" 
                     onClick={handleAddSprite}
                     disabled={isUploadingSprite || !newSpriteName || !newSpriteUrl}
                     className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                   >
                     {isUploadingSprite ? 'Guardando...' : 'Confirmar'}
                   </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Add Resource Modal */}
      {isAddResourceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
           <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-sm shadow-2xl flex flex-col max-h-[90vh]">
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
                   </select>
                 </div>
                 <div>
                   <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">Título</label>
                   <input 
                     type="text" 
                     value={newResourceTitle}
                     onChange={e => setNewResourceTitle(e.target.value)}
                     placeholder="Ej: Mapa del Sector 7"
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
                     disabled={isUploadingResource || !newResourceTitle || !newResourceContent}
                     className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                   >
                     {isUploadingResource ? 'Guardando...' : 'Confirmar'}
                   </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Background Image & Pattern */}
      {chatroomData?.background_url && (
          <div className="absolute inset-0 z-0 opacity-30 grayscale-[50%]">
             <Image src={chatroomData.background_url} alt="Room Background" fill className="object-cover" />
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
            <div className="mono-label mt-0.5 ml-4">ID: {typeof id === 'string' ? id.split('-')[0].toUpperCase() : ''}</div>
          </div>
        </div>
        <button 
          onClick={() => setIsRoomDetailsOpen(true)}
          className="p-2 border border-transparent hover:border-[var(--border)] rounded-sm transition-colors text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          <MoreVertical size={16} />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative z-10">
        
        {/* Center Area (Visual Novel & Background) */}
        <div className="flex-1 relative flex flex-col overflow-hidden">
          {/* Background Gradient */}
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-transparent to-transparent"></div>
          </div>

          {/* Top Right: Mode Indicator */}
          <div className="absolute top-6 right-6 z-20 flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 bg-[var(--surface)]/80 border border-[var(--border)] backdrop-blur-md px-4 py-2 rounded-sm shadow-lg">
              <Clock size={12} className="text-[var(--glow)]" />
              <span className="text-[10px] font-bold tracking-widest text-[var(--text)] uppercase">
                {chatroomData?.roleplay_type === 'combat' ? 'Modo Combate' 
                : chatroomData?.roleplay_type === 'turn_based' ? 'Roleplay por Turnos' 
                : 'Roleplay Libre'}
              </span>
            </div>
            {chatroomData?.description && (
              <div className="bg-[var(--surface)]/80 border border-[var(--border)] backdrop-blur-md px-4 py-3 rounded-sm shadow-lg max-w-sm">
                <p className="text-[11px] font-sans text-[var(--text-muted)] italic leading-relaxed">&quot;{chatroomData.description}&quot;</p>
              </div>
            )}
          </div>


          {/* Visual Novel Area (Active Message) */}
          <div className="absolute w-full bottom-0 px-6 pb-6 z-30 flex flex-col justify-end pointer-events-none">
            {messages.length > 0 && (() => {
               const lastMsg = messages[messages.length - 1];
               const speakerName = lastMsg.chatroom_characters?.name || lastMsg.profiles?.username || 'Sistema';
               const isSystem = lastMsg.is_system_message;
               
               return (
                 <div className="relative w-full flex flex-col justify-end mt-auto">
                  {/* Sprite - Positioned to the right */}
                  {!isSystem && (
                    <div className="absolute bottom-full right-[10%] w-[450px] h-[600px] pointer-events-auto transition-all animate-in fade-in slide-in-from-bottom-5 z-20">
                      {lastMsg.character_sprites?.image_url ? (
                        <div className="w-full h-full relative">
                          <Image 
                            src={lastMsg.character_sprites.image_url} 
                            alt={speakerName} 
                            fill
                            className="object-contain drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]" 
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full flex justify-center items-end pb-10">
                           <User size={200} className="text-[var(--text-muted)] opacity-50 drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Text Box - Full Width */}
                  <div className="w-full bg-[var(--surface)]/95 border border-[var(--border)] backdrop-blur-xl rounded-sm p-6 shadow-[0_10px_40px_rgba(0,0,0,0.8)] relative overflow-hidden pointer-events-auto z-30 mt-4 h-auto min-h-[120px]">
                    {/* Accent Line */}
                    <div className={`absolute top-0 left-0 w-48 h-1 ${isSystem ? 'bg-[var(--danger)]' : 'bg-[var(--accent)]'}`}></div>
                    
                    <h3 className={`${isSystem ? 'text-[var(--danger)]' : 'text-[var(--accent)]'} font-bold text-2xl mb-3 tracking-wide font-serif italic`}>
                      {isSystem ? 'SISTEMA' : speakerName}
                    </h3>
                    <p className="text-[var(--text)] text-lg leading-relaxed font-mono whitespace-pre-wrap">{lastMsg.content}</p>
                    
                    {lastMsg.dice_result && (
                      <div className="mt-5 inline-flex items-center gap-2 bg-[var(--surface-alt)] border border-[var(--border-light)] px-3 py-1.5 rounded-sm text-sm font-mono shadow-inner">
                        <Dices size={16} className="text-[var(--glow)]" />
                        <span className="text-[var(--glow)] font-bold">{lastMsg.dice_result.roll}</span>
                        <span className="text-[var(--text-muted)]">{lastMsg.dice_result.type}</span>
                      </div>
                    )}
                  </div>
                 </div>
               );
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
                messages.map(msg => {
                  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const senderName = msg.chatroom_characters?.name || msg.profiles?.username || 'Sistema';
                  const color = msg.is_system_message ? 'text-[var(--danger)]' : 'text-[var(--accent)]';

                  if (msg.dice_result) {
                    return <DiceMessage key={msg.id} sender={senderName} time={time} text={msg.content} result={msg.dice_result.roll.toString()} color={color} />
                  }
                  return <Message key={msg.id} sender={senderName} time={time} text={msg.content} color={color} isWhisper={msg.is_dm_whisper} targetName={msg.target_profile?.username} />
                })
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
              <button onClick={() => setIsTurnOrderOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
              {/* Group 1 */}
              <div>
                <div className="flex justify-between items-end mb-4">
                  <h3 className="mono-label">Grupo 1</h3>
                  <span className="text-[8px] text-[var(--glow)] border border-[var(--glow)]/30 bg-[var(--glow)]/10 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">dos días para el siguiente turno</span>
                </div>
                <div className="space-y-2">
                  <TurnItem name="Ekaterina" status="Turno Actual" initiative="20" isActive />
                  <TurnItem name="Romilda" status="En espera" initiative="15" />
                  <TurnItem name="Zhao" status="En espera" initiative="4" />
                  <TurnItem name="Scharlacrot" status="En espera" initiative="1" />
                </div>
              </div>
              {/* Group 2 */}
              <div>
                <div className="flex justify-between items-end mb-4">
                  <h3 className="mono-label">Grupo 2</h3>
                </div>
                <div className="space-y-2">
                  <TurnItem name="Heilig" status="Turno Actual" initiative="20" isActive />
                  <TurnItem name="Markus" status="En espera" initiative="10" />
                </div>
              </div>
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
            )}
            
            <button 
              type="button"
              onClick={() => setIsAddSpriteModalOpen(true)}
              className="px-2 py-1.5 bg-[var(--surface-alt)] border border-[var(--border-light)] hover:border-[var(--glow)]/50 hover:text-[var(--glow)] text-[var(--text-muted)] rounded-sm transition-colors"
              title="Subir un nuevo Sprite"
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
          <button onClick={handleDiceRoll} className="flex items-center justify-center gap-2 bg-transparent hover:bg-[var(--accent)]/10 border border-[var(--accent)]/50 text-[var(--accent)] px-4 py-2.5 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all shadow-[0_0_10px_rgba(59,130,246,0.05)] hover:shadow-[0_0_15px_rgba(59,130,246,0.15)]">
            <Dices size={14} />
            Tirar Dado
          </button>
          <button className="flex items-center justify-center gap-2 bg-transparent hover:bg-[var(--border)] border border-[var(--border-light)] text-[var(--text)] px-4 py-2.5 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-colors hover:text-[var(--glow)]">
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
            <div className="p-6 space-y-6">
              <div>
                <h3 className="mono-label mb-2">Nombre</h3>
                <p className="text-sm text-[var(--text)] font-medium tracking-wide">Operación: Sombra Azul</p>
              </div>
              <div>
                <h3 className="mono-label mb-2">Descripción</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed font-mono">
                  Infiltración en el sector 7. El objetivo es recuperar los datos del servidor principal antes de que la corporación inicie el borrado de emergencia.
                </p>
              </div>
              <div>
                <h3 className="mono-label mb-3">Participantes</h3>
                <div className="flex -space-x-2">
                  {[1,2,3,4].map(i => (
                          <div key={i} className="w-8 h-8 rounded-sm border-2 border-[var(--surface)] overflow-hidden relative">
                            <Image src={`https://picsum.photos/seed/user${i}/100/100`} alt="User" fill className="object-cover" />
                          </div>
                  ))}
                </div>
              </div>
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
    </div>
  );
}
