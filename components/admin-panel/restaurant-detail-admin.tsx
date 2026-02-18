'use client';

import { useState, useEffect } from 'react';
import {
  X, Store, MapPin, Phone, Globe, Star, TrendingUp,
  Package, Tag, Clock, Pencil, Check, Loader2, ExternalLink,
  AlertTriangle, ToggleLeft, ToggleRight, DollarSign, ShoppingBag,
} from 'lucide-react';
import { AdminRestaurant, AdminRestaurantDetail } from '@/types/admin-panel';
import { formatCurrency, formatDate, orderStatusLabels, colors } from '@/config/tokens';

interface RestaurantDetailAdminProps {
  restaurantId: string;
  onClose: () => void;
  onUpdated: () => void;
  isOwner: boolean;
}

type Tab = 'info' | 'stats' | 'orders' | 'config';

export default function RestaurantDetailAdmin({
  restaurantId,
  onClose,
  onUpdated,
  isOwner,
}: RestaurantDetailAdminProps) {
  const [data, setData] = useState<{
    restaurant: AdminRestaurantDetail;
    stats: { menu_categories_count: number; menu_items_count: number; orders_today: number; orders_week: number; orders_month: number };
    recent_orders: Array<{ id: string; code: string; status: string; total_cents: number; created_at: string; customer_name: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('info');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<AdminRestaurant>>({});

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/restaurants/${restaurantId}`);
    if (res.ok) {
      const d = await res.json();
      setData(d);
      setEditForm(d.restaurant);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [restaurantId]);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    const res = await fetch(`/api/admin/restaurants/${restaurantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      await fetchData();
      setEditing(false);
      onUpdated();
    }
    setSaving(false);
  };

  const handleToggleActive = async () => {
    if (!data) return;
    setSaving(true);
    await fetch(`/api/admin/restaurants/${restaurantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !data.restaurant.is_active }),
    });
    await fetchData();
    onUpdated();
    setSaving(false);
  };

  const handleToggleOpen = async () => {
    if (!data) return;
    setSaving(true);
    await fetch(`/api/admin/restaurants/${restaurantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_open: !data.restaurant.is_open }),
    });
    await fetchData();
    onUpdated();
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full border-l border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40 animate-pulse" />
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4 animate-pulse">
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!data) return null;
  const { restaurant, stats, recent_orders } = data;
  const statusColor = (status: string) => (colors.orderStatus as Record<string, string>)[status] ?? '#6B7280';

  const THEME_COLORS: Record<string, string> = {
    orange: '#FF6B35', red: '#EF4444', green: '#22C55E', blue: '#3B82F6', purple: '#8B5CF6',
  };

  return (
    <div className="flex flex-col h-full border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
            style={{ backgroundColor: THEME_COLORS[restaurant.theme_color] ?? THEME_COLORS.orange }}
          >
            {restaurant.logo_url ? (
              <img src={restaurant.logo_url} alt={restaurant.name} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <Store className="w-5 h-5" />
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">{restaurant.name}</h2>
            <p className="text-xs text-gray-400 font-mono">/{restaurant.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Editar
            </button>
          ) : (
            <>
              <button
                onClick={() => setEditing(false)}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Guardar
              </button>
            </>
          )}
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
          restaurant.is_active
            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${restaurant.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
          {restaurant.is_active ? 'Activo' : 'Inactivo'}
        </span>
        {restaurant.is_active && (
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
            restaurant.is_open
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${restaurant.is_open ? 'bg-blue-500' : 'bg-gray-400'}`} />
            {restaurant.is_open ? 'Abierto' : 'Cerrado'}
          </span>
        )}
        <span className="text-xs text-gray-400">{restaurant.city_name}</span>
        <span className="ml-auto text-xs text-gray-400">{restaurant.category_emoji} {restaurant.category_name}</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
        {(['info', 'stats', 'orders', 'config'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
              tab === t
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {t === 'info' ? 'Info' : t === 'stats' ? 'Estadísticas' : t === 'orders' ? 'Pedidos' : 'Configuración'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* TAB INFO */}
        {tab === 'info' && (
          <div className="space-y-5">
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nombre</label>
                  <input
                    value={editForm.name ?? ''}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full form-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Slug</label>
                  <input
                    value={editForm.slug ?? ''}
                    onChange={e => setEditForm(f => ({ ...f, slug: e.target.value }))}
                    className="w-full form-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Descripción</label>
                  <textarea
                    value={editForm.description ?? ''}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="w-full form-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Teléfono</label>
                    <input
                      value={editForm.phone ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full form-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">WhatsApp</label>
                    <input
                      value={editForm.whatsapp ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, whatsapp: e.target.value }))}
                      className="w-full form-input"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Dirección</label>
                  <input
                    value={editForm.address ?? ''}
                    onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                    className="w-full form-input"
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Vende alcohol</p>
                    <p className="text-xs text-gray-500">Solo YUMI autoriza venta</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditForm(f => ({ ...f, sells_alcohol: !f.sells_alcohol }))}
                    className={`transition-colors ${editForm.sells_alcohol ? 'text-orange-500' : 'text-gray-400'}`}
                  >
                    {editForm.sells_alcohol ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {restaurant.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">{restaurant.description}</p>
                )}
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-gray-700 dark:text-gray-200">{restaurant.address}</p>
                  </div>
                  {restaurant.phone && (
                    <div className="flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                      <p className="text-sm text-gray-700 dark:text-gray-200">{restaurant.phone}</p>
                    </div>
                  )}
                  {restaurant.whatsapp && (
                    <div className="flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-green-400 shrink-0" />
                      <p className="text-sm text-gray-700 dark:text-gray-200">{restaurant.whatsapp}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5">
                    <Globe className="w-4 h-4 text-gray-400 shrink-0" />
                    <p className="text-sm font-mono text-gray-500">/{restaurant.city_name?.toLowerCase()}/{restaurant.slug}</p>
                  </div>
                </div>

                {/* Owner info */}
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Propietario</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{restaurant.owner_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{restaurant.owner_email}</p>
                </div>

                {restaurant.sells_alcohol && (
                  <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-700 dark:text-amber-400 text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Autorizado para venta de alcohol
                  </div>
                )}
              </div>
            )}

            {/* Controles de estado */}
            <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-3">

              {/* Abrir / Cerrar (operativo en tiempo real) */}
              {restaurant.is_active && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {restaurant.is_open ? '🟢 Restaurante abierto' : '🔴 Restaurante cerrado'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {restaurant.is_open
                        ? 'Visible y recibiendo pedidos'
                        : 'No aparece como disponible para clientes'}
                    </p>
                  </div>
                  <button
                    onClick={handleToggleOpen}
                    disabled={saving}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                      restaurant.is_open
                        ? 'bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400'
                        : 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400'
                    }`}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {restaurant.is_open ? 'Cerrar ahora' : 'Abrir ahora'}
                  </button>
                </div>
              )}

              {/* Activar / Desactivar (visibilidad en plataforma) */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Visibilidad en plataforma</p>
                  <p className="text-xs text-gray-500">{restaurant.is_active ? 'Activo y visible' : 'Oculto de la plataforma'}</p>
                </div>
                <button
                  onClick={handleToggleActive}
                  disabled={saving}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                    restaurant.is_active
                      ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400'
                      : 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400'
                  }`}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {restaurant.is_active ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB ESTADÍSTICAS */}
        {tab === 'stats' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Hoy', value: stats.orders_today, icon: Clock },
                { label: 'Semana', value: stats.orders_week, icon: TrendingUp },
                { label: 'Mes', value: stats.orders_month, icon: Package },
                { label: 'Total', value: restaurant.total_orders, icon: ShoppingBag },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span className="text-xs text-amber-700 dark:text-amber-400">Rating</span>
                </div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {restaurant.avg_rating > 0 ? restaurant.avg_rating.toFixed(1) : '—'}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                  {restaurant.total_ratings} calificaciones
                </p>
              </div>
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-orange-500" />
                  <span className="text-xs text-orange-700 dark:text-orange-400">Comisión</span>
                </div>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                  {restaurant.commission_percentage > 0 ? `${restaurant.commission_percentage}%` : '0%'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                <Tag className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{stats.menu_categories_count}</p>
                <p className="text-xs text-gray-500">Categorías menú</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                <Package className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{stats.menu_items_count}</p>
                <p className="text-xs text-gray-500">Platos en menú</p>
              </div>
            </div>

            {/* Links */}
            <div className="flex flex-col gap-2 pt-2">
              <a
                href={`/restaurante`}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm text-gray-700 dark:text-gray-200"
              >
                <span>Ir al panel del restaurante</span>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </a>
            </div>
          </div>
        )}

        {/* TAB PEDIDOS */}
        {tab === 'orders' && (
          <div className="space-y-2">
            {recent_orders.length === 0 ? (
              <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Sin pedidos recientes</p>
              </div>
            ) : recent_orders.map(order => (
              <div key={order.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-gray-700 dark:text-gray-200">{order.code}</span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: `${statusColor(order.status)}20`,
                        color: statusColor(order.status),
                      }}
                    >
                      {orderStatusLabels[order.status] ?? order.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{order.customer_name}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{formatCurrency(order.total_cents)}</p>
                  <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB CONFIGURACIÓN */}
        {tab === 'config' && (
          <div className="space-y-4">
            {editing ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Comisión (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={editForm.commission_percentage ?? 0}
                      onChange={e => setEditForm(f => ({ ...f, commission_percentage: parseFloat(e.target.value) }))}
                      className="w-full form-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tiempo prep. (min)</label>
                    <input
                      type="number"
                      min="5"
                      value={editForm.estimated_prep_minutes ?? 30}
                      onChange={e => setEditForm(f => ({ ...f, estimated_prep_minutes: parseInt(e.target.value) }))}
                      className="w-full form-input"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Pedido mínimo (S/)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={(editForm.min_order_cents ?? 0) / 100}
                    onChange={e => setEditForm(f => ({ ...f, min_order_cents: Math.round(parseFloat(e.target.value) * 100) }))}
                    className="w-full form-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Color del tema</label>
                  <div className="flex gap-2">
                    {(['orange', 'red', 'green', 'blue', 'purple'] as const).map(color => {
                      const colorMap = { orange: '#FF6B35', red: '#EF4444', green: '#22C55E', blue: '#3B82F6', purple: '#8B5CF6' };
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setEditForm(f => ({ ...f, theme_color: color }))}
                          className={`w-8 h-8 rounded-full transition-transform ${editForm.theme_color === color ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : ''}`}
                          style={{ backgroundColor: colorMap[color] }}
                        />
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Orden de display</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.display_order ?? 0}
                    onChange={e => setEditForm(f => ({ ...f, display_order: parseInt(e.target.value) }))}
                    className="w-full form-input"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'Comisión YUMI', value: `${restaurant.commission_percentage}%` },
                  { label: 'Tiempo de preparación', value: `${restaurant.estimated_prep_minutes} min` },
                  { label: 'Pedido mínimo', value: restaurant.min_order_cents > 0 ? formatCurrency(restaurant.min_order_cents) : 'Sin mínimo' },
                  { label: 'Orden de display', value: `#${restaurant.display_order}` },
                  { label: 'Vende alcohol', value: restaurant.sells_alcohol ? 'Sí (autorizado)' : 'No' },
                  { label: 'Registrado', value: formatDate(restaurant.created_at) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
