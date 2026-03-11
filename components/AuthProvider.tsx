'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const initializeUser = useAuthStore(state => state.initializeUser);
  const isLoading = useAuthStore(state => state.isLoading);

  useEffect(() => {
    initializeUser();
  }, [initializeUser]);

  // Optionally, return a loading spinner if you want to block rendering entirely while checking session.
  // For now, we will just render children because middleware already protects routes.

  return <>{children}</>;
}
