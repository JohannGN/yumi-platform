'use client';

import { useState, useEffect } from 'react';
import {
  X, Loader2, Check, CloudRain, Cloud, AlertTriangle, Wine, Clock,
} from 'lucide-react';
import { AdminCity, CitySettings } from '@/types/admin-panel';
import { formatCurrency } from '@/config/tokens';

interface CitySettingsFormProps {
  cityId: string;
  onClose: () => void;
  onSaved: () => void;
  isOwner: boolean;
}

// Toggle switch component — usa inline styles para evitar purga de Tailwind JIT
function Toggle({
  checked,
  onChange,
  disabled = false,
  color = 'bg-orange-500',
  size = 'md',
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  color?: string;
  size?: 'sm' | 'md';
}) {
  const isSm = size === 'sm';
  const trackW = isSm ? 40 : 48;
  const trackH = isSm ? 20 : 24;
  const thumbSize = isSm ? 16 : 16;
  const thumbOff = 2;
  const thumbOn = trackW - thumbSize - thumbOff;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      style={{ width: trackW, height: trackH, minWidth: trackW }}
      className={`relative rounded-full shrink-0 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? color : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        style={{
          position: 'absolute',
          top: thumbOff,
          left: checked ? thumbOn : thumbOff,
          width: thumbSize,
          height: thumbSize,
          transition: 'left 0.2s ease',
        }}
        className="bg-white rounded-full shadow-sm"
      />
    </button>
  );
}

const DAYS = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

export default function CitySettingsForm({ cityId, onClose, onSaved, isOwner }: CitySettingsFormProps) {
  const [city, setCity] = useState<AdminCity | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{
    name: string;
    slug: string;
    is_active: boolean;
    settings: CitySettings;
  } | null>(null);

  useEffect(() => {
    fetch('/api/admin/cities').then(r => r.json()).then(data => {
      const c = (data.cities ?? []).find((c: AdminCity) => c.id === cityId);
      if (c) {
        setCity(c);
        setForm({ name: c.name, slug: c.slug, is_active: c.is_active, settings: { ...c.settings } });
      }
      setLoading(false);
    });
  }, [cityId]);

  const updateSetting = <K extends keyof CitySettings>(key: K, value: CitySettings[K]) => {
    setForm(f => f ? { ...f, settings: { ...f.settings, [key]: value } } : f);
  };

  const updateHours = (day: string, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    setForm(f => {
      if (!f) return f;
      return {
        ...f,
        settings: {
          ...f.settings,
          operating_hours: {
            ...f.settings.operating_hours,
            [day]: { ...f.settings.operating_hours[day], [field]: value },
          },
        },
      };
    });
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/cities/${cityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      onSaved();
    } else {
      const data = await res.json();
      setError(data.error ?? 'Error al guardar');
    }
    setSaving(false);
  };

  if (loading || !form) {
    return (
      <div className="flex flex-col h-full border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40 animate-pulse" />
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Configuración — {city?.name}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{city?.slug} · {city?.country}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !isOwner}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            title={!isOwner ? 'Solo el owner puede editar ciudades' : ''}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Guardar
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {!isOwner && (
        <div className="mx-6 mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Solo el owner puede editar la configuración de ciudades
        </div>
      )}

      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Estado y básicos */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">General</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nombre</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => f ? { ...f, name: e.target.value } : f)}
                  disabled={!isOwner}
                  className="w-full form-input disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Slug</label>
                <input
                  value={form.slug}
                  onChange={e => setForm(f => f ? { ...f, slug: e.target.value } : f)}
                  disabled={!isOwner}
                  className="w-full form-input font-mono disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Ciudad activa</p>
                <p className="text-xs text-gray-500">Visible para clientes</p>
              </div>
              <Toggle
                checked={form.is_active}
                onChange={() => isOwner && setForm(f => f ? { ...f, is_active: !f.is_active } : f)}
                disabled={!isOwner}
              />
            </div>
          </div>
        </section>

        {/* Tarifas */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Tarifas y operación</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Pedido mínimo (S/)</label>
              <input
                type="number" min="0" step="0.5"
                value={form.settings.min_order_cents / 100}
                onChange={e => updateSetting('min_order_cents', Math.round(parseFloat(e.target.value) * 100))}
                disabled={!isOwner}
                className="w-full form-input disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Fee de servicio (S/)</label>
              <input
                type="number" min="0" step="0.1"
                value={form.settings.service_fee_cents / 100}
                onChange={e => updateSetting('service_fee_cents', Math.round(parseFloat(e.target.value) * 100))}
                disabled={!isOwner}
                className="w-full form-input disabled:opacity-50"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tiempo de preparación default (min)</label>
              <input
                type="number" min="5"
                value={form.settings.default_prep_time_minutes}
                onChange={e => updateSetting('default_prep_time_minutes', parseInt(e.target.value))}
                disabled={!isOwner}
                className="w-full form-input disabled:opacity-50"
              />
            </div>
          </div>
        </section>

        {/* Alcohol */}
        <section>
          <div className="flex items-center justify-between gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3 min-w-0">
              <Wine className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Venta de alcohol</p>
                <p className="text-xs text-amber-600 dark:text-amber-400">Solo restaurantes autorizados por YUMI</p>
              </div>
            </div>
            <Toggle
              checked={form.settings.alcohol_sales_enabled}
              onChange={() => isOwner && updateSetting('alcohol_sales_enabled', !form.settings.alcohol_sales_enabled)}
              disabled={!isOwner}
              color="bg-amber-500"
            />
          </div>
        </section>

        {/* Lluvia */}
        <section>
          <div className={`p-4 rounded-xl border-2 transition-all ${
            form.settings.rain_surcharge_active
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
              : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          }`}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                {form.settings.rain_surcharge_active ? (
                  <CloudRain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                ) : (
                  <Cloud className="w-5 h-5 text-gray-400" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Recargo por lluvia</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">El agente activa esto manualmente</p>
                </div>
              </div>
              <Toggle
                checked={form.settings.rain_surcharge_active}
                onChange={() => isOwner && updateSetting('rain_surcharge_active', !form.settings.rain_surcharge_active)}
                disabled={!isOwner}
                color="bg-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Monto del recargo (S/)</label>
              <input
                type="number" min="0" step="0.5"
                value={form.settings.rain_surcharge_cents / 100}
                onChange={e => updateSetting('rain_surcharge_cents', Math.round(parseFloat(e.target.value) * 100))}
                disabled={!isOwner}
                className="w-full form-input disabled:opacity-50"
              />
            </div>
          </div>
        </section>

        {/* Horarios operativos */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Horarios operativos</h3>
          </div>
          <div className="space-y-2">
            {DAYS.map(({ key, label }) => {
              const hours = form.settings.operating_hours[key] ?? { open: '07:00', close: '23:00', closed: false };
              return (
                <div key={key} className={`flex items-center gap-3 p-3 rounded-xl transition-opacity ${hours.closed ? 'opacity-50' : ''}`}>
                  <Toggle
                    checked={!hours.closed}
                    onChange={() => isOwner && updateHours(key, 'closed', !hours.closed)}
                    disabled={!isOwner}
                    size="sm"
                  />
                  <span className="text-sm w-24 text-gray-700 dark:text-gray-200 shrink-0">{label}</span>
                  <input
                    type="time"
                    value={hours.open}
                    onChange={e => updateHours(key, 'open', e.target.value)}
                    disabled={!isOwner || hours.closed}
                    className="form-input w-28 text-sm disabled:opacity-40"
                  />
                  <span className="text-gray-400 text-sm">—</span>
                  <input
                    type="time"
                    value={hours.close}
                    onChange={e => updateHours(key, 'close', e.target.value)}
                    disabled={!isOwner || hours.closed}
                    className="form-input w-28 text-sm disabled:opacity-40"
                  />
                  {hours.closed && <span className="text-xs text-gray-400">Cerrado</span>}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
