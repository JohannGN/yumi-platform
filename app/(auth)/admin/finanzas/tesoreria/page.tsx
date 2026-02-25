import { Landmark } from 'lucide-react';

export default function TesoreriaPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <Landmark className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Tesorería
      </h2>
      <p className="text-gray-500 dark:text-gray-400 max-w-md">
        Control de efectivo y bancarización. Próximamente.
      </p>
    </div>
  );
}
