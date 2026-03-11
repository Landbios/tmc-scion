'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const initializeUser = useAuthStore(state => state.initializeUser);
  const isLoading = useAuthStore(state => state.isLoading);

  useEffect(() => {
    initializeUser();
  }, [initializeUser]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0a0f18] text-white">
        <div className="text-[#3b82f6] animate-pulse font-mono uppercase tracking-widest text-sm drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]">
          VERIFICANDO IDENTIDAD...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
