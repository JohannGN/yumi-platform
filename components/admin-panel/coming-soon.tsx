import type { LucideIcon } from 'lucide-react';
import { Clock } from 'lucide-react';
import { colors } from '@/config/tokens';

interface ComingSoonProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
}

export function ComingSoon({ title, description, icon: Icon = Clock }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 opacity-20"
        style={{ backgroundColor: colors.brand.primary }}
      >
        <Icon className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h2>
      <p className="text-sm text-gray-400 dark:text-gray-500 max-w-sm">
        {description || 'Este módulo está en desarrollo y estará disponible próximamente.'}
      </p>
      <div
        className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-white"
        style={{ backgroundColor: colors.brand.primary }}
      >
        <Clock className="w-3 h-3" />
        Próximamente en Chat 7B / 7C
      </div>
    </div>
  );
}
