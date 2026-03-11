import React, { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Image as ImageIcon, Link as LinkIcon, Loader2, Upload, X } from 'lucide-react';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
  label?: string;
}

export default function ImageUploader({ value, onChange, bucket = 'avatars', label = 'Imagen' }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [inputType, setInputType] = useState<'url' | 'upload'>('url');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsUploading(true);
      if (!e.target.files || e.target.files.length === 0) {
        return;
      }
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const supabase = createClient();
      
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      onChange(data.publicUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error al subir la imagen. Verifica que el bucket existe y tiene permisos públicos.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-1">
         <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{label}</label>
         <div className="flex gap-2">
           <button 
             type="button" 
             onClick={() => setInputType('url')}
             className={`text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-sm transition-colors ${inputType === 'url' ? 'bg-[var(--accent)] text-white' : 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text)]'}`}
           >
             URL
           </button>
           <button 
             type="button" 
             onClick={() => setInputType('upload')}
             className={`text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-sm transition-colors ${inputType === 'upload' ? 'bg-[var(--accent)] text-white' : 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text)]'}`}
           >
             Archivo
           </button>
         </div>
      </div>

      {value ? (
        <div className="relative w-full h-32 rounded-sm border border-[var(--border-light)] overflow-hidden bg-[var(--surface-alt)] group">
          <img src={value} alt="Preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button 
              type="button"
              onClick={() => onChange('')}
              className="bg-[var(--danger)] text-white p-2 rounded-full hover:bg-red-600 transition-transform scale-90 group-hover:scale-100"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full">
          {inputType === 'url' ? (
            <div className="relative">
              <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input 
                type="url" 
                placeholder="https://ejemplo.com/imagen.jpg" 
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-[var(--surface-alt)] border border-[var(--border-light)] text-[var(--text)] font-mono text-sm rounded-sm py-2.5 pl-9 pr-3 outline-none focus:border-[var(--glow)]/50 transition-colors"
              />
            </div>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-24 bg-[var(--surface-alt)] border border-dashed border-[var(--border-light)] hover:border-[var(--glow)]/50 rounded-sm flex flex-col items-center justify-center cursor-pointer transition-colors group"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleUpload} 
                accept="image/*" 
                className="hidden" 
                disabled={isUploading}
              />
              {isUploading ? (
                <Loader2 size={24} className="text-[var(--accent)] animate-spin mb-2" />
              ) : (
                <Upload size={24} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors mb-2" />
              )}
              <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)] font-mono">
                {isUploading ? 'Subiendo...' : 'Click para subir imagen'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
