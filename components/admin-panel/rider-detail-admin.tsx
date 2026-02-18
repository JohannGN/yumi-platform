'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, Star, Bike, Clock, Package, Edit3, Save,
  ToggleLeft, ToggleRight, Loader2, CheckCircle, MapPin,
} from 'lucide-react';
import {
  vehicleTypeLabels,
  riderPayTypeLabels,
  formatCurrency,
  formatDate,
  formatOrderCode,
  orderStatusLabels,
  colors,
  googleMapsConfig,
} from '@/config/tokens';
import { ShiftLogsTable } from './shift-logs-table';
import type { AdminRider, ShiftLog } from '@/types/admin-panel';

declare global {
  interface Window {
    google: typeof google;
    initRiderDetailMap?: () => void;
  }
}

interface RiderDetailAdminProps {
  riderId: string | null;
  onClose: () => void;
  onRefresh: () => void;
}

interface RiderDetailFull extends AdminRider {
  shift_logs: ShiftLog[];
  recent_orders: Array<{
    id: string;
    code: string;
    status: string;
    total_cents: number;
    created_at: string;
    restaurant_name: string;
  }>;
}

// ── Mini mapa para la ubicación del rider ────────────────────────────────────
function RiderLocationMap({ rider }: { rider: RiderDetailFull }) {
  const containerRef = useRef<HTMLDivElement>(null); // altura explícita
  const mapRef       = useRef<HTMLDivElement>(null);  // absolute inset-0
  const mapInstance  = useRef<google.maps.Map | null>(null);
  const markerRef    = useRef<google.maps.Marker | null>(null);
  const [ready, setReady] = useState(false);

  // ── Detectar / cargar SDK ────────────────────────────────────────────────
  useEffect(() => {
    const markReady = () => setReady(true);

    if (window.google?.maps) { markReady(); return; }

    // Polling — el SDK puede estar cargándose por otro componente
    const interval = setInterval(() => {
      if (window.google?.maps) { clearInterval(interval); markReady(); }
    }, 200);

    // Solo inyectar script si nadie lo hizo antes
    const alreadyLoading =
      document.getElementById('google-maps-riders') ||
      document.getElementById('google-maps-zones');

    if (!alreadyLoading) {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
      if (apiKey) {
        window.initRiderDetailMap = () => { clearInterval(interval); markReady(); };
        const s    = document.createElement('script');
        s.id       = 'google-maps-riders';
        s.src      = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=drawing,geometry&callback=initRiderDetailMap`;
        s.async    = true;
        document.head.appendChild(s);
      }
    }

    return () => {
      clearInterval(interval);
      delete window.initRiderDetailMap;
    };
  }, []);

  // ── Inicializar mapa ─────────────────────────────────────────────────────
  // requestAnimationFrame garantiza que mapRef.current tenga dimensiones reales
  useEffect(() => {
    if (!ready) return;

    let rafId: number;
    rafId = requestAnimationFrame(() => {
      if (!mapRef.current || mapInstance.current) return;

      const center = rider.current_lat && rider.current_lng
        ? { lat: Number(rider.current_lat), lng: Number(rider.current_lng) }
        : googleMapsConfig.defaultCenter;

      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: 15,
        styles: [
          { featureType: 'poi',     stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        ],
        disableDefaultUI:  true,
        zoomControl:       true,
        fullscreenControl: true,
      });

      if (rider.current_lat && rider.current_lng) {
        const color = rider.is_online
          ? (rider.current_order_id ? '#F59E0B' : '#22C55E')
          : '#9CA3AF';

        markerRef.current = new window.google.maps.Marker({
          position: { lat: Number(rider.current_lat), lng: Number(rider.current_lng) },
          map: mapInstance.current,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 14,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 3,
          },
          title: rider.name,
        });

        const iw = new window.google.maps.InfoWindow({
          content: `<div style="font-family:sans-serif;padding:6px 2px">
            <strong style="font-size:14px">${rider.name}</strong><br/>
            <span style="font-size:12px;color:#6B7280">
              ${rider.current_order_id
                ? `📦 Pedido: ${rider.current_order_code ?? '—'}`
                : '✅ Disponible'}
            </span>
          </div>`,
        });
        markerRef.current.addListener('click', () => {
          iw.open(mapInstance.current!, markerRef.current!);
        });
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [ready, rider]);

  // ── Sin GPS ──────────────────────────────────────────────────────────────
  if (!rider.current_lat || !rider.current_lng) {
    return (
      <div className="h-64 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center gap-2 text-gray-400">
        <MapPin className="w-8 h-8" />
        <p className="text-sm font-medium">Sin ubicación GPS</p>
        <p className="text-xs text-gray-400">
          {rider.is_online ? 'GPS no enviado aún (espera 30s)' : 'El rider no tiene turno activo'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Contenedor con altura explícita + position:relative para que absolute inset-0 funcione */}
      <div ref={containerRef} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ height: '280px', position: 'relative' }}>
        {/* Spinner mientras carga SDK */}
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {/* Google Maps necesita absolute inset-0 — igual que en riders-map.tsx */}
        <div ref={mapRef} style={{ position: 'absolute', inset: 0 }} />
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        Último GPS: {rider.last_location_update ? formatDate(rider.last_location_update) : 'Desconocido'}
      </p>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export function RiderDetailAdmin({ riderId, onClose, onRefresh }: RiderDetailAdminProps) {
  const [detail, setDetail]   = useState<RiderDetailFull | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [activeTab, setActiveTab] = useState<'perfil' | 'mapa' | 'turnos' | 'pedidos'>('perfil');

  const [form, setForm] = useState({
    vehicle_type:          '',
    vehicle_plate:         '',
    pay_type:              '',
    fixed_salary_cents:    '',
    commission_percentage: '',
    show_earnings:         false,
    is_active:             true,
  });

  const fetchDetail = useCallback(async () => {
    if (!riderId) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/riders/${riderId}`);
      const data = await res.json() as RiderDetailFull;
      setDetail(data);
      setForm({
        vehicle_type:          data.vehicle_type,
        vehicle_plate:         data.vehicle_plate ?? '',
        pay_type:              data.pay_type,
        fixed_salary_cents:    data.fixed_salary_cents?.toString() ?? '',
        commission_percentage: data.commission_percentage?.toString() ?? '',
        show_earnings:         data.show_earnings,
        is_active:             data.is_active,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [riderId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  // Reset tab al abrir otro rider
  useEffect(() => { setActiveTab('perfil'); setEditing(false); }, [riderId]);

  const handleSave = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/riders/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_type:          form.vehicle_type,
          vehicle_plate:         form.vehicle_plate || null,
          pay_type:              form.pay_type,
          fixed_salary_cents:    form.fixed_salary_cents ? parseInt(form.fixed_salary_cents) * 100 : null,
          commission_percentage: form.commission_percentage ? parseFloat(form.commission_percentage) : null,
          show_earnings:         form.show_earnings,
          is_active:             form.is_active,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setEditing(false);
      await fetchDetail();
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  if (!riderId) return null;

  const TABS = [
    { id: 'perfil',  label: 'Perfil'  },
    { id: 'mapa',    label: 'Mapa'    },
    { id: 'turnos',  label: 'Turnos'  },
    { id: 'pedidos', label: 'Pedidos' },
  ] as const;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          {loading || !detail ? (
            <div className="space-y-2 flex-1">
              <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0 ${
                detail.is_online
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}>
                {detail.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{detail.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    detail.is_online
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${detail.is_online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                    {detail.is_online ? 'En línea' : 'Offline'}
                  </span>
                  {!detail.is_active && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                      Inactivo
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Stats rápidos */}
        {detail && (
          <div className="grid grid-cols-3 gap-px bg-gray-200 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
            {[
              { icon: <Package className="w-4 h-4" />, value: detail.total_deliveries, label: 'Entregas' },
              {
                icon:  <Star className="w-4 h-4 text-yellow-400" />,
                value: detail.avg_rating > 0 ? detail.avg_rating.toFixed(1) : '—',
                label: `${detail.total_ratings} ratings`,
              },
              {
                icon:  <Bike className="w-4 h-4" />,
                value: vehicleTypeLabels[detail.vehicle_type] ?? detail.vehicle_type,
                label: detail.vehicle_plate ?? 'Sin placa',
              },
            ].map((stat, i) => (
              <div key={i} className="bg-white dark:bg-gray-900 px-4 py-3 flex flex-col items-center text-center">
                <div className="text-gray-400 mb-1">{stat.icon}</div>
                <p className="font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition -mb-px ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : detail ? (
            <>
              {/* TAB: Perfil */}
              {activeTab === 'perfil' && (
                <div className="p-6 space-y-6">
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Datos de contacto</h4>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2.5">
                      <InfoRow label="Email"            value={detail.email} />
                      <InfoRow label="Teléfono"         value={detail.phone} mono />
                      <InfoRow label="Tipo pago"        value={riderPayTypeLabels[detail.pay_type] ?? detail.pay_type} />
                      {detail.pay_type === 'fixed_salary' && detail.fixed_salary_cents && (
                        <InfoRow label="Salario mensual" value={formatCurrency(detail.fixed_salary_cents)} />
                      )}
                      {detail.pay_type === 'commission' && detail.commission_percentage && (
                        <InfoRow label="Comisión" value={`${detail.commission_percentage}%`} />
                      )}
                      <InfoRow label="Ver ganancias en app" value={detail.show_earnings ? 'Sí' : 'No'} />
                    </div>
                  </div>

                  {!editing ? (
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition w-full justify-center"
                    >
                      <Edit3 className="w-4 h-4" />
                      Editar datos
                    </button>
                  ) : (
                    <div className="space-y-4 bg-orange-50 dark:bg-orange-900/10 rounded-xl p-5 border border-orange-200 dark:border-orange-800">
                      <h4 className="text-sm font-semibold text-orange-800 dark:text-orange-400">Editar rider</h4>

                      <div className="space-y-3">
                        <FormField label="Tipo vehículo">
                          <select
                            value={form.vehicle_type}
                            onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
                            className="form-select"
                          >
                            {Object.entries(vehicleTypeLabels).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                        </FormField>

                        <FormField label="Placa">
                          <input
                            type="text"
                            value={form.vehicle_plate}
                            onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value })}
                            placeholder="Opcional"
                            className="form-input"
                          />
                        </FormField>

                        <FormField label="Tipo de pago">
                          <select
                            value={form.pay_type}
                            onChange={(e) => setForm({ ...form, pay_type: e.target.value })}
                            className="form-select"
                          >
                            {Object.entries(riderPayTypeLabels).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                        </FormField>

                        {form.pay_type === 'fixed_salary' && (
                          <FormField label="Salario mensual (S/)">
                            <input
                              type="number"
                              value={form.fixed_salary_cents}
                              onChange={(e) => setForm({ ...form, fixed_salary_cents: e.target.value })}
                              placeholder="1200"
                              className="form-input"
                            />
                          </FormField>
                        )}

                        {form.pay_type === 'commission' && (
                          <FormField label="Comisión (%)">
                            <input
                              type="number"
                              value={form.commission_percentage}
                              onChange={(e) => setForm({ ...form, commission_percentage: e.target.value })}
                              placeholder="15"
                              step="0.5"
                              className="form-input"
                            />
                          </FormField>
                        )}

                        <div className="flex items-center justify-between">
                          <label className="text-sm text-gray-700 dark:text-gray-300">Ver ganancias en app</label>
                          <button
                            onClick={() => setForm({ ...form, show_earnings: !form.show_earnings })}
                            className="text-gray-400 dark:text-gray-500 hover:text-orange-500 transition"
                          >
                            {form.show_earnings
                              ? <ToggleRight className="w-8 h-8 text-orange-500" />
                              : <ToggleLeft className="w-8 h-8" />}
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <label className="text-sm text-gray-700 dark:text-gray-300">Cuenta activa</label>
                          <button
                            onClick={() => setForm({ ...form, is_active: !form.is_active })}
                            className="text-gray-400 dark:text-gray-500 hover:text-orange-500 transition"
                          >
                            {form.is_active
                              ? <ToggleRight className="w-8 h-8 text-green-500" />
                              : <ToggleLeft className="w-8 h-8 text-red-400" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                          {saving ? 'Guardando…' : saved ? '¡Guardado!' : 'Guardar'}
                        </button>
                        <button
                          onClick={() => setEditing(false)}
                          className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: Mapa */}
              {activeTab === 'mapa' && (
                <div className="p-6">
                  <RiderLocationMap rider={detail} />
                </div>
              )}

              {/* TAB: Turnos */}
              {activeTab === 'turnos' && (
                <div className="p-6">
                  <ShiftLogsTable shifts={detail.shift_logs} compact />
                </div>
              )}

              {/* TAB: Pedidos recientes */}
              {activeTab === 'pedidos' && (
                <div className="p-6 space-y-2">
                  {detail.recent_orders.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Sin pedidos registrados</p>
                  ) : (
                    detail.recent_orders.map((order) => {
                      const color = colors.orderStatus[order.status as keyof typeof colors.orderStatus] ?? '#6B7280';
                      return (
                        <div key={order.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-gray-900 dark:text-gray-100">{formatOrderCode(order.code)}</span>
                              <span
                                className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                                style={{ backgroundColor: `${color}20`, color }}
                              >
                                {orderStatusLabels[order.status] ?? order.status}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{order.restaurant_name} · {formatDate(order.created_at)}</p>
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums text-sm">
                            {formatCurrency(order.total_cents)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{label}</span>
      <span className={`text-sm font-medium text-gray-900 dark:text-gray-100 text-right ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</label>
      {children}
    </div>
  );
}
