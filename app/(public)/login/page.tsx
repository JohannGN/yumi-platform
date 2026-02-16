'use client';

// ============================================================
// Login Page — Email + Password → Supabase Auth
// Chat 5 — Fragment 2/7
// ============================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(
          authError.message === 'Invalid login credentials'
            ? 'Correo o contraseña incorrectos'
            : authError.message
        );
        return;
      }

      if (!data.user) {
        setError('Error al iniciar sesión');
        return;
      }

      // Check user role to redirect appropriately
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (userData?.role === 'restaurant') {
        router.push('/restaurante');
      } else if (userData?.role === 'owner' || userData?.role === 'city_admin') {
        router.push('/admin');
      } else if (userData?.role === 'rider') {
        router.push('/rider');
      } else {
        router.push('/');
      }

      router.refresh();
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#FF6B35] flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
            Y
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            YUMI Panel
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Inicia sesión para continuar
          </p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                required
                autoComplete="email"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent outline-none transition-all text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent outline-none transition-all text-sm"
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`
                w-full py-2.5 rounded-lg font-semibold text-sm text-white
                transition-all duration-200
                ${
                  isLoading
                    ? 'bg-gray-400 cursor-wait'
                    : 'bg-[#FF6B35] hover:bg-[#E55A25] active:scale-[0.98]'
                }
              `}
            >
              {isLoading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>

        {/* Back to home */}
        <p className="text-center mt-6">
          <a
            href="/"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#FF6B35] transition-colors"
          >
            ← Volver a YUMI
          </a>
        </p>
      </motion.div>
    </div>
  );
}
