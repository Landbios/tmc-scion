'use client';
import { useAuthStore } from '@/store/authStore';
import { useChatroomsStore } from '@/store/chatroomStore';
import { LogOut, Plus, Search, User, X, Settings } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ImageUploader from '@/components/ImageUploader';

export default function Dashboard() {
  const user = useAuthStore(state => state.user);
  const profile = useAuthStore(state => state.profile);
  const signOut = useAuthStore(state => state.signOut);
  const authLoading = useAuthStore(state => state.isLoading);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const chatrooms = useChatroomsStore(state => state.chatrooms);
  const fetchChatrooms = useChatroomsStore(state => state.fetchChatrooms);
  const createChatroom = useChatroomsStore(state => state.createChatroom);
  const isLoading = useChatroomsStore(state => state.isLoading);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomImage, setNewRoomImage] = useState('');
  const [newRoomBg, setNewRoomBg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('Explorar');
  const [newRoomType, setNewRoomType] = useState('Recreativo');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectionNote, setRejectionNote] = useState('');
  const [isReviewingId, setIsReviewingId] = useState<string | null>(null);

  useEffect(() => {
    fetchChatrooms();
  }, [fetchChatrooms]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newRoomTitle.trim()) return;
    setIsSubmitting(true);
    
    await createChatroom({
      creator_id: user.id,
      title: newRoomTitle,
      description: newRoomDesc,
      portrait_url: newRoomImage,
      background_url: newRoomBg,
      roleplay_type: 'free_roleplay',
      chat_type: newRoomType,
      chatters_ids: [],
      masters_ids: [user.id], 
      resources: [],
      turns: []
    });
    
    setIsSubmitting(false);
    setIsCreateModalOpen(false);
    setNewRoomTitle('');
    setNewRoomDesc('');
    setNewRoomImage('');
    setNewRoomBg('');
  };

  const handleOpenEdit = (e: React.MouseEvent, room: any) => {
    e.preventDefault();
    e.stopPropagation();
    setNewRoomTitle(room.title);
    setNewRoomDesc(room.description || '');
    setNewRoomImage(room.portrait_url || '');
    setNewRoomBg(room.background_url || '');
    setNewRoomType(room.chat_type || 'Recreativo');
    setEditingRoomId(room.id);
    setIsEditModalOpen(true);
  };

  const handleEditRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoomId || !newRoomTitle.trim()) return;
    setIsSubmitting(true);
    
    await useChatroomsStore.getState().updateChatroom(editingRoomId, {
      title: newRoomTitle,
      description: newRoomDesc,
      portrait_url: newRoomImage,
      background_url: newRoomBg,
      chat_type: newRoomType
    });
    
    setIsSubmitting(false);
    setIsEditModalOpen(false);
    setEditingRoomId(null);
    setNewRoomTitle('');
    setNewRoomDesc('');
    setNewRoomImage('');
    setNewRoomBg('');
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans relative">
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none z-0 grid-overlay"></div>

      {/* Top Navbar */}
      <header className="h-16 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md flex items-center justify-between px-8 z-20 relative">
        <div className="flex items-center gap-4">
          <div className="w-6 h-6 rounded-sm bg-[var(--accent)] flex items-center justify-center shadow-[0_0_10px_var(--glow)]">
            <span className="text-[10px] font-bold text-white uppercase tracking-widest font-serif">S</span>
          </div>
          <h1 className="text-sm font-bold tracking-[0.2em] text-[var(--text)] uppercase hidden sm:block">S.C.I.O.N</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text)]">{profile?.username || 'Cargando...'}</div>
              <div className="text-[9px] font-mono uppercase tracking-widest text-[var(--glow)]">{profile?.role || 'OFICIAL'}</div>
            </div>
            <div className="w-8 h-8 rounded-sm border border-[var(--border-light)] bg-[var(--surface-alt)] flex items-center justify-center">
              <User size={14} className="text-[var(--text-muted)]" />
            </div>
          </div>
          <button 
            onClick={signOut}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors border border-transparent hover:border-[var(--danger)]/30 rounded-sm"
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="relative z-10 max-w-6xl mx-auto p-8 pt-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono text-[var(--glow)]">◆</span>
              <h2 className="mono-label">Servidor Central</h2>
            </div>
            <h1 className="text-3xl font-bold font-serif italic tracking-wide text-[var(--text)]">Salas de Operaciones</h1>
          </div>
          
          <div className="flex flex-col gap-6 w-full sm:w-auto">
            {/* Tabs */}
            <div className="flex items-center bg-[var(--surface-alt)] border border-[var(--border-light)] p-1 rounded-sm self-start">
               {['Explorar', 'Recreativo', 'Off-rol', 'Evento', 'Misiones', 
                 ...(profile?.role && ['staff', 'superadmin'].includes(profile.role) ? ['Propuestas'] : [])
               ].map(tab => (
                 <button
                   key={tab}
                   onClick={() => setActiveTab(tab)}
                   className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded-sm ${activeTab === tab ? 'bg-[var(--accent)] text-white shadow-[0_0_8px_rgba(59,130,246,0.3)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
                 >
                   {tab}
                 </button>
               ))}
            </div>

            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input 
                  type="text" 
                  placeholder="Buscar sala..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-[var(--surface-alt)] border border-[var(--border-light)] text-[var(--text)] text-[11px] uppercase tracking-wider font-bold rounded-sm pl-9 pr-4 py-2.5 outline-none focus:border-[var(--glow)]/50 focus:ring-1 focus:ring-[var(--glow)]/50 transition-all min-w-[200px]"
                />
              </div>
              
              {/* Only Staff/Superadmins can create, users propose */}
              <button 
                onClick={() => {
                  setNewRoomType('Recreativo');
                  setIsCreateModalOpen(true);
                }}
                className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-5 py-2.5 rounded-sm text-[11px] font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]"
              >
                <Plus size={14} />
                {profile?.role && ['staff', 'superadmin'].includes(profile.role) ? 'Crear Sala' : 'Proponer Sala'}
              </button>
            </div>
          </div>
        </div>

        {/* Chatrooms Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="text-[var(--glow)] animate-pulse font-mono uppercase tracking-widest text-sm text-glow">Cargando datos...</div>
          </div>
        ) : (() => {
          const filteredRooms = chatrooms.filter(room => {
            const matchesTab = activeTab === 'Explorar' ? room.status === 'approved' : 
                              activeTab === 'Propuestas' ? room.status === 'pending' :
                              room.chat_type === activeTab && room.status === 'approved';
            
            // Special case: Creators see their own pending/rejected in 'Explorar' or matching tab
            const isOwnProposal = room.creator_id === user?.id;
            const shouldShowOwn = isOwnProposal && (activeTab === 'Explorar' || room.chat_type === activeTab);
            
            const finalMatchesTab = matchesTab || shouldShowOwn;
            const matchesSearch = room.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 (room.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());
            return finalMatchesTab && matchesSearch;
          });

          return (
            <div className="flex flex-col gap-6 w-full max-w-5xl">
              {filteredRooms.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-[var(--border-light)] rounded-sm bg-[var(--surface-alt)]/50">
                  <p className="text-[var(--text-muted)] font-mono text-sm">No se encontraron salas en esta categoría.</p>
                </div>
              ) : (
                filteredRooms.map((room) => (
                  <Link key={room.id} href={`/chatroom/${room.id}`} className="block group w-full">
                <div className="relative bg-[var(--surface)]/80 backdrop-blur-sm border border-[var(--border)] group-hover:border-[var(--glow)]/80 transition-all w-full flex flex-col md:flex-row shadow-[0_0_15px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_25px_rgba(59,130,246,0.2)] overflow-hidden">
                  
                  {/* Decorative side bar */}
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--border)] group-hover:bg-[var(--accent)] transition-colors z-10"></div>

                  {/* Left Side: Image */}
                  <div className="w-full md:w-1/3 xl:w-[280px] h-48 md:h-auto relative bg-[var(--surface-alt)] border-r border-[var(--border-light)] overflow-hidden shrink-0">
                    {room.portrait_url ? (
                       <img src={room.portrait_url} alt={room.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity grayscale group-hover:grayscale-0" />
                    ) : (
                       <div className="absolute inset-0 grid-overlay opacity-30"></div>
                    )}
                    
                    {/* Roleplay type tag overlay */}
                    <div className="absolute top-4 left-4 bg-[var(--surface)]/90 backdrop-blur border border-[var(--border)] px-3 py-1.5 flex flex-col gap-1 z-20">
                       <div className="flex items-center gap-2">
                         <span className="w-1.5 h-1.5 bg-[var(--glow)] rounded-full animate-pulse"></span>
                         <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--glow)]">
                           {room.chat_type || 'Recreativo'}
                         </span>
                       </div>
                       {room.status !== 'approved' && (
                         <div className={`text-[8px] font-bold uppercase tracking-widest px-1 py-0.5 border ${
                           room.status === 'pending' ? 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10' : 'text-red-500 border-red-500/30 bg-red-500/10'
                         }`}>
                           {room.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                         </div>
                       )}
                    </div>

                    {/* Edit Button for Staff */}
                    {profile?.role && ['staff', 'superadmin'].includes(profile.role) && (
                      <button 
                        onClick={(e) => handleOpenEdit(e, room)}
                        className="absolute bottom-4 left-4 bg-[var(--surface)]/90 backdrop-blur border border-[var(--border)] hover:border-[var(--glow)] hover:text-[var(--glow)] text-[var(--text-muted)] p-2 transition-colors z-20 shadow-lg"
                        title="Editar Sala"
                      >
                        <Settings size={14} />
                      </button>
                    )}
                  </div>
                  
                  {/* Right Side: Data */}
                  <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between relative pl-8">
                    {/* Top Tech Decor */}
                    <div className="absolute top-4 right-4 flex gap-1 opacity-50">
                      <div className="w-1.5 h-3 bg-[var(--text-muted)]"></div>
                      <div className="w-1.5 h-3 bg-[var(--text-muted)]"></div>
                      <div className="w-1.5 h-3 bg-[var(--accent)] animate-pulse"></div>
                    </div>

                    <div className="mb-6 mt-2">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-mono text-[var(--text-muted)] tracking-widest uppercase">SYS_CODE :: {room.id.substring(0,8)}</span>
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-bold text-[var(--text)] font-serif uppercase tracking-wider mb-2 group-hover:text-[var(--accent)] transition-colors">{room.title}</h3>
                      
                      {room.status === 'rejected' && room.proposal_note && (
                        <div className="mb-4 p-3 bg-red-500/10 border-l-2 border-red-500 text-[10px] font-mono text-red-400 italic">
                           RECHAZADO: {room.proposal_note}
                        </div>
                      )}

                      <div className="bg-[var(--surface-alt)]/50 p-4 border-l-2 border-[var(--border-light)] font-mono text-[11px] text-[var(--text-muted)] leading-relaxed max-w-2xl">
                        {room.description || '>[DATOS_NO_ENCONTRADOS_O_CLASIFICADOS...]'}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[var(--border)] flex justify-between items-end">
                      <div className="flex items-center gap-8">
                        <div className="flex flex-col">
                           <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest font-mono mb-1">Agentes Asignados</span>
                           <span className="text-sm font-bold text-[var(--text)] font-mono">{(room.chatters_ids?.length || 0) + (room.masters_ids?.length || 0)}</span>
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest font-mono mb-1">Status Op</span>
                           <span className="text-sm font-bold text-[var(--glow)] font-mono uppercase">En Curso</span>
                        </div>
                      </div>
                      
                      <div className="text-[10px] font-bold tracking-widest uppercase text-[var(--text-muted)] group-hover:text-[var(--glow)] transition-colors flex items-center gap-2">
                        {room.status === 'approved' ? (
                          <>Conectar Enlace <span className="text-lg">→</span></>
                        ) : room.status === 'pending' ? (
                          <span className="text-yellow-500/70 italic">[EVALUANDO...]</span>
                        ) : (
                          <span className="text-red-500/70 italic">[OPERACION_CANCELADA]</span>
                        )}
                      </div>
                    </div>

                    {/* Staff Review Actions */}
                    {activeTab === 'Propuestas' && profile?.role && ['staff', 'superadmin'].includes(profile.role) && (
                      <div className="absolute top-4 right-12 z-20 flex gap-2">
                         {isReviewingId === room.id ? (
                           <div className="flex flex-col gap-2 p-3 bg-[var(--surface-alt)] border border-[var(--border)] shadow-xl animate-in fade-in slide-in-from-top-2">
                              <textarea 
                                placeholder="Nota de rechazo (opcional)..."
                                value={rejectionNote}
                                onChange={e => setRejectionNote(e.target.value)}
                                className="text-[10px] font-mono bg-[var(--bg)] border border-[var(--border)] p-2 w-48 h-16 outline-none focus:border-red-500"
                              />
                              <div className="flex gap-2 justify-end">
                                <button 
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsReviewingId(null); }}
                                  className="text-[9px] uppercase font-bold text-[var(--text-muted)]"
                                >
                                  Cancelar
                                </button>
                                <button 
                                  onClick={async (e) => {
                                     e.preventDefault();
                                     e.stopPropagation();
                                     await useChatroomsStore.getState().updateRoomStatus(room.id, 'rejected', rejectionNote);
                                     setIsReviewingId(null);
                                     setRejectionNote('');
                                  }}
                                  className="text-[9px] uppercase font-bold text-red-500"
                                >
                                  Confirmar Rechazo
                                </button>
                              </div>
                           </div>
                         ) : (
                           <>
                             <button 
                               onClick={async (e) => {
                                 e.preventDefault();
                                 e.stopPropagation();
                                 await useChatroomsStore.getState().updateRoomStatus(room.id, 'approved');
                               }}
                               className="bg-green-500/20 border border-green-500/50 hover:bg-green-500/40 text-green-400 px-3 py-1 text-[9px] font-bold uppercase tracking-widest transition-all"
                             >
                               Aprobar
                             </button>
                             <button 
                               onClick={(e) => {
                                 e.preventDefault();
                                 e.stopPropagation();
                                 setIsReviewingId(room.id);
                               }}
                               className="bg-red-500/20 border border-red-500/50 hover:bg-red-500/40 text-red-400 px-3 py-1 text-[9px] font-bold uppercase tracking-widest transition-all"
                             >
                               Rechazar
                             </button>
                           </>
                         )}
                      </div>
                    )}
                  </div>
                  
                </div>
              </Link>
                ))
              )}
            </div>
          );
        })()}
      </main>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-sm shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] flex justify-between items-center bg-[var(--surface-alt)]">
              <h2 className="text-xs font-bold text-[var(--text)] tracking-widest uppercase">Inicializar Nueva Sala</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateRoom} className="p-6 space-y-5">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">Nombre de Operación</label>
                <input 
                  type="text" 
                  value={newRoomTitle}
                  onChange={e => setNewRoomTitle(e.target.value)}
                  className="w-full bg-[var(--surface-alt)] border border-[var(--border-light)] text-[var(--text)] font-mono text-sm rounded-sm p-3 outline-none focus:border-[var(--glow)]/50 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">Descripción del Objetivo</label>
                <textarea 
                  value={newRoomDesc}
                  onChange={e => setNewRoomDesc(e.target.value)}
                  className="w-full h-24 bg-[var(--surface-alt)] border border-[var(--border-light)] text-[var(--text)] font-mono text-sm rounded-sm p-3 outline-none focus:border-[var(--glow)]/50 transition-colors resize-none custom-scrollbar"
                ></textarea>
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">Categoría del Despliegue</label>
                <select 
                  value={newRoomType}
                  onChange={e => setNewRoomType(e.target.value)}
                  className="w-full bg-[var(--surface-alt)] border border-[var(--border-light)] text-[var(--text)] font-mono text-sm rounded-sm p-3 outline-none focus:border-[var(--glow)]/50 transition-colors cursor-pointer mb-5"
                >
                  <option value="Recreativo">Recreativo</option>
                  <option value="Off-rol">Off-rol</option>
                  <option value="Evento">Evento</option>
                  <option value="Misiones">Misiones</option>
                </select>
              </div>
              <div className="mb-2">
                <ImageUploader 
                  value={newRoomImage} 
                  onChange={setNewRoomImage} 
                  label="Imagen de la Sala (URL o Subir)"
                  bucket="chatroom_images"
                />
              </div>
              <div className="mb-2">
                <ImageUploader 
                  value={newRoomBg} 
                  onChange={setNewRoomBg} 
                  label="Fondo de la Sala (Background URL o Subir)"
                  bucket="chatroom_images"
                />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-[var(--border-light)] text-[var(--text-muted)] hover:text-[var(--text)] rounded-sm text-[10px] font-bold uppercase tracking-widest transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting || !newRoomTitle.trim()}
                  className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                >
                  {isSubmitting ? 'Iniciando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-sm shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] flex justify-between items-center bg-[var(--surface-alt)]">
              <h2 className="text-xs font-bold text-[var(--text)] tracking-widest uppercase">Actualizar Operación</h2>
              <button onClick={() => { setIsEditModalOpen(false); setEditingRoomId(null); }} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleEditRoom} className="p-6 space-y-5">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">Nombre de Operación</label>
                <input 
                  type="text" 
                  value={newRoomTitle}
                  onChange={e => setNewRoomTitle(e.target.value)}
                  className="w-full bg-[var(--surface-alt)] border border-[var(--border-light)] text-[var(--text)] font-mono text-sm rounded-sm p-3 outline-none focus:border-[var(--glow)]/50 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">Descripción del Objetivo</label>
                <textarea 
                  value={newRoomDesc}
                  onChange={e => setNewRoomDesc(e.target.value)}
                  className="w-full h-24 bg-[var(--surface-alt)] border border-[var(--border-light)] text-[var(--text)] font-mono text-sm rounded-sm p-3 outline-none focus:border-[var(--glow)]/50 transition-colors resize-none custom-scrollbar"
                ></textarea>
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">Categoría del Despliegue</label>
                <select 
                  value={newRoomType}
                  onChange={e => setNewRoomType(e.target.value)}
                  className="w-full bg-[var(--surface-alt)] border border-[var(--border-light)] text-[var(--text)] font-mono text-sm rounded-sm p-3 outline-none focus:border-[var(--glow)]/50 transition-colors cursor-pointer mb-5"
                >
                  <option value="Recreativo">Recreativo</option>
                  <option value="Off-rol">Off-rol</option>
                  <option value="Evento">Evento</option>
                  <option value="Misiones">Misiones</option>
                </select>
              </div>
              <div className="mb-2">
                <ImageUploader 
                  value={newRoomImage} 
                  onChange={setNewRoomImage} 
                  label="Imagen de la Sala (URL o Subir)"
                  bucket="chatroom_images"
                />
              </div>
              <div className="mb-2">
                <ImageUploader 
                  value={newRoomBg} 
                  onChange={setNewRoomBg} 
                  label="Fondo de la Sala (Background URL o Subir)"
                  bucket="chatroom_images"
                />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => { setIsEditModalOpen(false); setEditingRoomId(null); }}
                  className="px-4 py-2 border border-[var(--border-light)] text-[var(--text-muted)] hover:text-[var(--text)] rounded-sm text-[10px] font-bold uppercase tracking-widest transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting || !newRoomTitle.trim()}
                  className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                >
                  {isSubmitting ? 'Guardando...' : 'Actualizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
