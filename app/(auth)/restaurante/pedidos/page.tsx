'use client';

// ============================================================
// Pedidos Page — Kanban view of restaurant orders
// Chat 5 — Fragment 3/7
// ============================================================

import OrdersKanban from '@/components/restaurant-panel/orders-kanban';

export default function PedidosPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Pedidos
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Gestiona tus pedidos en tiempo real
        </p>
      </div>

      <OrdersKanban />
    </div>
  );
}
