'use client';

import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, LogIn, UserPlus, ChevronRight } from 'lucide-react';
import { Suspense } from 'react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'auth_callback_failed') {
      toast.error('La confirmación de correo falló. Inténtalo de nuevo.');
    }
  }, [searchParams]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: { username: username || email.split('@')[0] },
          },
        });
        if (error) throw error;
        setEmailSent(true);
        toast.success('Correo de confirmación enviado — ¡revisa tu bandeja de entrada!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Acceso concedido. Bienvenido de nuevo.');
        router.push('/dashboard');
        router.refresh();
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Ocurrió un error';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ── Shared styles ──────────────────────────────────────── */
  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: 'var(--surface-alt)',
    border: '1px solid var(--border-light)',
    color: 'var(--text)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.85rem',
    padding: '0.6rem 0.85rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.65rem',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginBottom: '0.35rem',
  };

  return (
    <div
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
      className="min-h-screen flex items-center justify-center p-4 relative"
    >
      {/* Dot-grid background */}
      <div className="fixed inset-0 grid-overlay pointer-events-none" />

      {/* Corner classification label */}
      <div
        className="fixed top-5 left-6"
        style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.18em', color: 'var(--glow)', opacity: 0.7 }}
      >
        KIZOKU NO YOZAI // PORTAL DE ACCESO SEGURO
      </div>

      <div
        className="relative z-10 w-full max-w-sm"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 0 40px rgba(59,130,246,0.12)',
        }}
      >
        {/* Header bar */}
        <div
          style={{
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--surface-alt)',
            padding: '0.6rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--glow)', boxShadow: '0 0 6px var(--glow)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>
            {isSignUp ? 'RECLUTAR // NUEVO CADETE' : 'AUTENTICAR // OFICIAL'}
          </span>
        </div>

        <div className="p-8">
          {/* Icon + title */}
          <div className="flex flex-col items-center mb-8">
            <Shield
              style={{ color: 'var(--glow)', filter: 'drop-shadow(0 0 8px rgba(59,130,246,0.6))' }}
              className="w-10 h-10 mb-4"
            />
            <h1
              style={{
                fontFamily: 'var(--font-cinzel)',
                color: 'var(--text)',
                letterSpacing: '0.1em',
                textShadow: '0 0 16px rgba(59,130,246,0.4)',
              }}
              className="text-2xl font-bold uppercase text-center"
            >
              {isSignUp ? 'Reclutar Cadete' : 'Acceder a Bóveda'}
            </h1>
            <p
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}
              className="mt-2 text-center"
            >
              {isSignUp
                ? 'Crea tu perfil de oficial para comenzar'
                : 'Ingresa tus credenciales para acceder a tus archivos'}
            </p>
          </div>

          {/* Email-sent confirmation state */}
          {emailSent ? (
            <div
              style={{
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-alt)',
                padding: '1.5rem',
                textAlign: 'center',
              }}
            >
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--glow)', marginBottom: '0.5rem' }}>
                ◈ TRANSMISIÓN ENVIADA
              </div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                Revisa <strong style={{ color: 'var(--text)' }}>{email}</strong> para un enlace de confirmación y completar tu registro.
              </p>
              <button
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--glow)', marginTop: '1rem', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.1em' }}
                onClick={() => { setEmailSent(false); setIsSignUp(false); }}
              >
                Volver a Iniciar Sesión →
              </button>
            </div>
          ) : (
            <form onSubmit={handleAuth} className="space-y-5">
              {isSignUp && (
                <div>
                  <label style={labelStyle}>Nombre de usuario</label>
                  <input
                    type="text"
                    placeholder="cadete_nombre"
                    style={inputStyle}
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--glow)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" style={labelStyle}>Correo Electrónico</label>
                <input
                  id="email"
                  type="email"
                  placeholder="oficial@academia.xyz"
                  style={inputStyle}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--glow)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="password" style={labelStyle}>Contraseña</label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••••"
                  style={inputStyle}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--glow)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}
                  required
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  backgroundColor: loading ? 'var(--border)' : '#0353a4',
                  color: '#fff',
                  border: '1px solid #0353a4',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  padding: '0.7rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'background-color 0.2s, box-shadow 0.2s',
                  marginTop: '0.5rem',
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 18px rgba(59,130,246,0.5)';
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent-hover)';
                  }
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = loading ? 'var(--border)' : 'var(--accent)';
                }}
              >
                {loading ? (
                  <span className="animate-pulse">Procesando…</span>
                ) : isSignUp ? (
                  <><UserPlus size={14} /> Registrar</>
                ) : (
                  <><LogIn size={14} /> Autenticar <ChevronRight size={14} /></>
                )}
              </button>
            </form>
          )}

          {/* External Providers */}
          {!emailSent && (
            <div className="mt-6 space-y-4">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', opacity: 0.6 }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>O ACCESO EXTERNO</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  try {
                    setLoading(true);
                    const { error } = await supabase.auth.signInWithOAuth({
                      provider: 'discord',
                      options: {
                        redirectTo: `${window.location.origin}/auth/callback`,
                      },
                    });
                    if (error) throw error;
                  } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : 'Error iniciando sesión con Discord');
                    setLoading(false);
                  }
                }}
                style={{
                  width: '100%',
                  backgroundColor: 'transparent',
                  color: 'var(--text)',
                  border: '1px solid rgba(88, 101, 242, 0.5)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  letterSpacing: '0.1em',
                  padding: '0.7rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  transition: 'all 0.2s ease',
                  opacity: loading ? 0.5 : 1,
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(88, 101, 242, 0.1)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(88, 101, 242, 0.8)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 12px rgba(88, 101, 242, 0.2)';
                  }
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(88, 101, 242, 0.5)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 127.14 96.36">
                  <path fill="#5865F2" d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a67.55,67.55,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.16,46,96.06,53,91.08,65.69,84.69,65.69Z"/>
                </svg>
                Continuar con Discord
              </button>
            </div>
          )}

          {/* Toggle sign-in / sign-up */}
          {!emailSent && (
            <div className="mt-8 text-center">
              <div className="rule-glow mb-5" />
              <button
                onClick={() => { setIsSignUp(!isSignUp); setEmail(''); setPassword(''); setUsername(''); }}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.68rem',
                  letterSpacing: '0.1em',
                  color: 'var(--text-muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--glow)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                {isSignUp
                  ? '← ¿Ya estás registrado? Inicia sesión'
                  : '¿Nuevo recluta? → Solicitar registro'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
