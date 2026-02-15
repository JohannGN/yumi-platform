import Link from 'next/link';
import { colors } from '@/config/tokens';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <span className="text-6xl">🍕</span>
      <h1 className="mt-4 text-2xl font-bold">Página no encontrada</h1>
      <p className="mt-2 text-sm text-gray-500">
        No encontramos lo que buscas. Puede que el restaurante o la ciudad no existan.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl px-6 py-3 text-sm font-bold text-white"
        style={{ backgroundColor: colors.brand.primary }}
      >
        Volver al inicio
      </Link>
    </div>
  );
}
