'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { colors, typography } from '@/config/tokens';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // 1. Autenticar con Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('Email o contraseña incorrectos');
        } else {
          setError('Error al iniciar sesión. Intenta nuevamente.');
        }
        return;
      }

      if (!authData.user) {
        setError('No se pudo obtener la sesión');
        return;
      }

      // 2. Obtener rol del usuario desde public.users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, is_active')
        .eq('id', authData.user.id)
        .single();

      if (userError || !userData) {
        await supabase.auth.signOut();
        setError('Cuenta no autorizada. Contacta al administrador.');
        return;
      }

      if (!userData.is_active) {
        await supabase.auth.signOut();
        setError('Tu cuenta está desactivada. Contacta al administrador.');
        return;
      }

      // 3. Redirigir según rol
      const role = userData.role as string;
      switch (role) {
        case 'owner':
        case 'city_admin':
          router.push('/admin');
          break;
        case 'agent':
          router.push('/agente');
          break;
        case 'restaurant':
          router.push('/restaurante');
          break;
        case 'rider':
          router.push('/rider');
          break;
        default:
          await supabase.auth.signOut();
          setError('Rol no reconocido. Contacta al administrador.');
      }
    } catch {
      setError('Error inesperado. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      {/* Background subtle pattern */}
      <div
        className="absolute inset-0 opacity-40 dark:opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, ${colors.brand.primary}20 0%, transparent 50%),
                            radial-gradient(circle at 75% 75%, ${colors.brand.secondary}20 0%, transparent 50%)`,
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg"
            style={{ backgroundColor: colors.brand.primary }}
          >
            <span className="text-2xl font-black text-white tracking-tighter">Y</span>
          </div>
          <h1
            className="text-2xl font-black tracking-tight text-gray-900 dark:text-white"
            style={{ color: undefined }}
          >
            YUMI
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Panel de administración
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Iniciar sesión
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@yumi.pe"
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                           bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white
                           placeholder-gray-400 dark:placeholder-gray-500
                           focus:outline-none focus:ring-2 focus:border-transparent
                           text-sm transition-all"
                style={{ '--tw-ring-color': colors.brand.primary } as React.CSSProperties}
                onFocus={(e) => { e.target.style.boxShadow = `0 0 0 2px ${colors.brand.primary}40`; }}
                onBlur={(e) => { e.target.style.boxShadow = ''; }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                           bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white
                           placeholder-gray-400 dark:placeholder-gray-500
                           focus:outline-none focus:ring-2 focus:border-transparent
                           text-sm transition-all"
                onFocus={(e) => { e.target.style.boxShadow = `0 0 0 2px ${colors.brand.primary}40`; }}
                onBlur={(e) => { e.target.style.boxShadow = ''; }}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50">
                <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm text-white
                         transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                         active:scale-[0.98]"
              style={{ backgroundColor: isLoading ? colors.brand.primaryDark : colors.brand.primary }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verificando...
                </span>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
          YUMI Platform v2.2 · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
