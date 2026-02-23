'use client';

import { useState, useEffect, useCallback } from 'react';
import { SettlementsTable } from '@/components/admin-panel/settlements-table';
import { RestaurantSettlementDetail } from '@/components/admin-panel/restaurant-settlement-detail';
import { CreateSettlementForm } from '@/components/admin-panel/create-settlement-form';
import { ExportCSVButton } from '@/components/shared/export-csv-button';
import { RestaurantSettlement } from '@/types/settlement-types';
import { createClient } from '@/lib/supabase/client';
import { DeprecationBanner } from '@/components/shared/deprecation-banner';

// ─── Filter Bar ─────────────────────────────────────────────
interface Filters {
  status: string;
  restaurant_id: string;
  month: string;
}

function FilterBar({
  filters,
  onChange,
  restaurants,
}: {
  filters: Filters;
  onChange: (f: Partial<Filters>) => void;
  restaurants: Array<{ id: string; name: string }>;
}) {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    months.push(`${y}-${m}`);
  }

  const selectClass =
    'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500';

  return (
    <div className="flex flex-wrap gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      <select
        value={filters.status}
        onChange={e => onChange({ status: e.target.value })}
        className={selectClass}
      >
        <option value="">Todo estado</option>
        <option value="pending">Pendiente</option>
        <option value="paid">Pagado</option>
        <option value="disputed">En disputa</option>
      </select>

      <select
        value={filters.restaurant_id}
        onChange={e => onChange({ restaurant_id: e.target.value })}
        className={`${selectClass} max-w-40 truncate`}
      >
        <option value="">Todos los restaurantes</option>
        {restaurants.map(r => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>

      <select
        value={filters.month}
        onChange={e => onChange({ month: e.target.value })}
        className={selectClass}
      >
        <option value="">Todo período</option>
        {months.map(m => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Empty right panel ─────────────────────────────────────
function EmptyDetail({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div className="text-4xl">💰</div>
      <div>
        <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
          Liquidaciones de restaurantes
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Selecciona una liquidación para ver el detalle o crea una nueva.
        </p>
      </div>
      <button
        onClick={onNew}
        className="rounded-xl bg-orange-500 hover:bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
      >
        + Nueva liquidación
      </button>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────
export default function RestaurantSettlementsPage() {
  const supabase = createClient();

  const [settlements, setSettlements] = useState<RestaurantSettlement[]>([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [showCreate, setShowCreate]   = useState(false);
  const [restaurants, setRestaurants] = useState<Array<{ id: string; name: string }>>([]);

  const [filters, setFilters] = useState<Filters>({
    status: '',
    restaurant_id: '',
    month: '',
  });

  // Load restaurant options for filter
  useEffect(() => {
    supabase.from('restaurants').select('id, name').eq('is_active', true).order('name')
      .then(({ data }) => setRestaurants(data ?? []));
  }, [supabase]);

  // Fetch settlements
  const fetchSettlements = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status)        params.set('status', filters.status);
      if (filters.restaurant_id) params.set('restaurant_id', filters.restaurant_id);
      if (filters.month)         params.set('month', filters.month);

      const res  = await fetch(`/api/admin/settlements/restaurants?${params.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setSettlements(json.settlements ?? []);
        setTotal(json.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchSettlements(); }, [fetchSettlements]);

  const handleFilterChange = (partial: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...partial }));
    setSelectedId(null);
  };

  const handleUpdate = (updated: RestaurantSettlement) => {
    setSettlements(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  const handleCreated = (created: RestaurantSettlement) => {
    setSettlements(prev => [created, ...prev]);
    setTotal(t => t + 1);
    setSelectedId(created.id);
    setShowCreate(false);
  };

  // ADMIN-FIN-2: Build export params from filters
  const exportParams: Record<string, string> = {};
  if (filters.restaurant_id) exportParams.restaurant_id = filters.restaurant_id;

  return (
    <div className="flex flex-col h-full">
      {/* ─── Deprecation Banner (CREDITOS-3B) ─────────────── */}
      <div className="px-4 pt-3">
        <DeprecationBanner
          message="Esta vista usa el modelo de liquidaciones de restaurantes anterior."
          targetLabel="Finanzas → Créditos"
          targetHref="/admin/finanzas/creditos"
        />
      </div>

      {/* ─── Split Layout ───────────────────────────────────── */}
      <div className="-mx-4 lg:-mx-6 -mb-4 lg:-mb-6 flex-1 flex overflow-hidden bg-white dark:bg-gray-900">
        {/* ─── Left Panel ─────────────────────────────────── */}
        <div className="w-2/5 flex flex-col border-r border-gray-200 dark:border-gray-700 shrink-0">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Liquidaciones · Restaurantes
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">{total} registros</p>
            </div>
            <div className="flex items-center gap-2">
              {/* ADMIN-FIN-2: Export CSV */}
              <ExportCSVButton
                mode="server"
                endpoint="/api/admin/export/liquidations"
                params={exportParams}
                filenamePrefix="liquidaciones"
                label="CSV"
              />
              <button
                onClick={() => setShowCreate(true)}
                className="rounded-lg bg-orange-500 hover:bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
              >
                + Nueva
              </button>
            </div>
          </div>

          {/* Filters */}
          <FilterBar filters={filters} onChange={handleFilterChange} restaurants={restaurants} />

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            <SettlementsTable
              type="restaurant"
              settlements={settlements}
              selectedId={selectedId}
              onSelect={setSelectedId}
              loading={loading}
            />
          </div>
        </div>

        {/* ─── Right Panel ────────────────────────────────── */}
        <div className="flex-1 min-w-0 relative">
          {selectedId ? (
            <RestaurantSettlementDetail
              key={selectedId}
              settlementId={selectedId}
              onUpdate={handleUpdate}
            />
          ) : (
            <EmptyDetail onNew={() => setShowCreate(true)} />
          )}
        </div>

        {/* ─── Create Modal ───────────────────────────────── */}
        {showCreate && (
          <CreateSettlementForm
            type="restaurant"
            onSuccess={s => handleCreated(s as RestaurantSettlement)}
            onClose={() => setShowCreate(false)}
          />
        )}
      </div>
    </div>
  );
}
