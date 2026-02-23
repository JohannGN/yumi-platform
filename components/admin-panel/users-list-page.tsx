'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, ChevronLeft, ChevronRight, Shield,
  ToggleLeft, ToggleRight, Loader2, SlidersHorizontal, X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  userRoleLabels,
  userRoleColors,
  vehicleTypeLabels,
  riderPayTypeLabels,
  formatDate,
} from '@/config/tokens';
import type { AdminUser } from '@/types/admin-panel-additions';

const ROLES = ['owner', 'city_admin', 'agent', 'restaurant', 'rider'] as const;
const LIMIT = 25;

export function UsersListPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Filters
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Cities for filter dropdown
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);

  const supabase = createClient();

  // Load cities for filter
  useEffect(() => {
    supabase
      .from('cities')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setCities(data ?? []));
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeRole) params.set('role', activeRole);
      if (cityFilter) params.set('city_id', cityFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);
      params.set('page', String(page));
      params.set('limit', String(LIMIT));

      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error('Error fetching users');
      const data = await res.json();
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      console.error('[UsersListPage]', err);
    } finally {
      setLoading(false);
    }
  }, [activeRole, cityFilter, debouncedSearch, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Toggle active
  const handleToggleActive = async (u: AdminUser) => {
    setTogglingId(u.id);
    try {
      let endpoint = '';
      if (u.role === 'agent') endpoint = `/api/admin/agents/${u.id}`;
      else if (u.role === 'rider') {
        const { data: rider } = await supabase
          .from('riders')
          .select('id')
          .eq('user_id', u.id)
          .single();
        if (rider) endpoint = `/api/admin/riders/${rider.id}`;
      } else if (u.role === 'restaurant') {
        const { data: rest } = await supabase
          .from('restaurants')
          .select('id')
          .eq('owner_id', u.id)
          .single();
        if (rest) endpoint = `/api/admin/restaurants/${rest.id}`;
      }

      if (endpoint) {
        await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: !u.is_active }),
        });
      } else {
        await supabase
          .from('users')
          .update({ is_active: !u.is_active })
          .eq('id', u.id);
      }

      fetchUsers();
    } catch (err) {
      console.error('[toggle user]', err);
    } finally {
      setTogglingId(null);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);
  const hasActiveFilters = !!activeRole || !!cityFilter;

  // Skeleton
  if (loading && users.length === 0 && !debouncedSearch) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-6 h-6 text-orange-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Usuarios</h1>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Usuarios</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {total} usuario{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Search + Filters button */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
          />
        </div>

        <button
          onClick={() => setShowFilters((prev) => !prev)}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm border rounded-lg transition-colors ${
            showFilters || hasActiveFilters
              ? 'border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtros
          {hasActiveFilters && (
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          )}
        </button>
      </div>

      {/* Role pills */}
      <div className="flex flex-wrap items-center gap-2">
        {ROLES.map((role) => {
          const isActive = activeRole === role;
          const color = userRoleColors[role];
          return (
            <button
              key={role}
              onClick={() => { setActiveRole(isActive ? null : role); setPage(1); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? 'ring-2 ring-offset-1 dark:ring-offset-gray-900'
                  : 'hover:opacity-80'
              }`}
              style={{
                backgroundColor: `${color}${isActive ? '25' : '12'}`,
                color: color,
                ...(isActive ? { ringColor: color } : {}),
              }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              {userRoleLabels[role]}
            </button>
          );
        })}
      </div>

      {/* Expanded filters */}
      <AnimatePresence>
        {showFilters ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              {cities.length > 1 && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Ciudad:</label>
                  <select
                    value={cityFilter}
                    onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
                    className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none"
                  >
                    <option value="">Todas</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {hasActiveFilters && (
                <button
                  onClick={() => { setActiveRole(null); setCityFilter(''); setPage(1); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <X className="w-3 h-3" />
                  Limpiar filtros
                </button>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 text-left text-xs uppercase tracking-wider">
              <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400">Nombre</th>
              <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400">Email</th>
              <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400">Teléfono</th>
              <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400">Rol</th>
              <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400">Ciudad</th>
              <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400">Estado</th>
              <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400">Fecha</th>
              <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="wait">
              {loading ? (
                <tr key="loading">
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr key="empty">
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{u.name}</p>
                        {u.restaurant_name && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{u.restaurant_name}</p>
                        )}
                        {u.vehicle_type && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {vehicleTypeLabels[u.vehicle_type] ?? u.vehicle_type}
                            {u.pay_type ? ` · ${riderPayTypeLabels[u.pay_type] ?? u.pay_type}` : ''}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 truncate max-w-[180px]">
                      {u.email ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {u.phone ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${userRoleColors[u.role] ?? '#6B7280'}18`,
                          color: userRoleColors[u.role] ?? '#6B7280',
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: userRoleColors[u.role] ?? '#6B7280' }}
                        />
                        {userRoleLabels[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {u.city_name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.is_active
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {u.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.role !== 'owner' ? (
                        <button
                          onClick={() => handleToggleActive(u)}
                          disabled={togglingId === u.id}
                          title={u.is_active ? 'Desactivar usuario' : 'Activar usuario'}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                          {togglingId === u.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          ) : u.is_active ? (
                            <ToggleRight className="w-5 h-5 text-green-500" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      ) : (
                        <Shield className="w-4 h-4 text-purple-400 mx-auto" title="Propietario — no editable" />
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-500 dark:text-gray-400">
            Mostrando {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} de {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-gray-700 dark:text-gray-300 tabular-nums">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
