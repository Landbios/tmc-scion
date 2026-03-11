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
          
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input 
                type="text" 
                placeholder="Buscar sala..." 
                className="bg-[var(--surface-alt)] border border-[var(--border-light)] text-[var(--text)] text-[11px] uppercase tracking-wider font-bold rounded-sm pl-9 pr-4 py-2.5 outline-none focus:border-[var(--glow)]/50 focus:ring-1 focus:ring-[var(--glow)]/50 transition-all min-w-[200px]"
              />
            </div>
            
            {/* Only Staff/Superadmins can create */}
            {profile?.role && ['staff', 'superadmin'].includes(profile.role) && (
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-5 py-2.5 rounded-sm text-[11px] font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]"
              >
                <Plus size={14} />
                Crear Sala
              </button>
            )}
          </div>
        </div>

        {/* Chatrooms Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="text-[var(--glow)] animate-pulse font-mono uppercase tracking-widest text-sm text-glow">Cargando datos...</div>
          </div>
        ) : chatrooms.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-[var(--border-light)] rounded-sm bg-[var(--surface-alt)]/50">
            <p className="text-[var(--text-muted)] font-mono text-sm">No se encontraron salas de operaciones activas.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 w-full max-w-5xl">
            {chatrooms.map((room) => (
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
                    <div className="absolute top-4 left-4 bg-[var(--surface)]/90 backdrop-blur border border-[var(--border)] px-3 py-1.5 flex items-center gap-2">
                       <span className="w-1.5 h-1.5 bg-[var(--glow)] rounded-full animate-pulse"></span>
                       <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--glow)]">
                         {room.roleplay_type.replace('_', ' ')}
                       </span>
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
                      <h3 className="text-2xl sm:text-3xl font-bold text-[var(--text)] font-serif uppercase tracking-wider mb-4 group-hover:text-[var(--accent)] transition-colors">{room.title}</h3>
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
                        Conectar Enlace <span className="text-lg">→</span>
                      </div>
                    </div>
                  </div>
                  
                </div>
              </Link>
            ))}
          </div>
        )}
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
