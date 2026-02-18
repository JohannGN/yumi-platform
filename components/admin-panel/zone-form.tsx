'use client';

import { useState } from 'react';
import { X, Loader2, Check, MapPin } from 'lucide-react';
import { AdminZone, CreateZonePayload } from '@/types/admin-panel';
import { formatCurrency } from '@/config/tokens';

interface ZoneFormProps {
  cityId: string;
  zone?: AdminZone | null;
  pendingGeoJson?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

const COLOR_OPTIONS = [
  { value: '#3B82F6', label: 'Azul' },
  { value: '#22C55E', label: 'Verde' },
  { value: '#F59E0B', label: 'Ámbar' },
  { value: '#EF4444', label: 'Rojo' },
  { value: '#8B5CF6', label: 'Violeta' },
  { value: '#06B6D4', label: 'Cyan' },
];

export default function ZoneForm({ cityId, zone, pendingGeoJson, onClose, onSaved }: ZoneFormProps) {
  const isEdit = Boolean(zone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name:             zone?.name ?? '',
    color:            zone?.color ?? '#3B82F6',
    base_fee_soles:   zone ? (zone.base_fee_cents   / 100).toFixed(2) : '3.00',
    per_km_fee_soles: zone ? (zone.per_km_fee_cents / 100).toFixed(2) : '1.00',
    min_fee_soles:    zone ? (zone.min_fee_cents    / 100).toFixed(2) : '3.00',
    max_fee_soles:    zone ? (zone.max_fee_cents    / 100).toFixed(2) : '10.00',
  });

  const handleSubmit = async () => {
    if (!form.name.trim())            { setError('El nombre es obligatorio');              return; }
    if (!isEdit && !pendingGeoJson)   { setError('Dibuja el polígono en el mapa primero'); return; }

    setLoading(true);
    setError(null);

    const base_fee_cents    = Math.round(parseFloat(form.base_fee_soles)   * 100);
    const per_km_fee_cents  = Math.round(parseFloat(form.per_km_fee_soles) * 100);
    const min_fee_cents     = Math.round(parseFloat(form.min_fee_soles)    * 100);
    const max_fee_cents     = Math.round(parseFloat(form.max_fee_soles)    * 100);

    let res: Response;
    if (isEdit && zone) {
      res = await fetch(`/api/admin/zones/${zone.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, color: form.color, base_fee_cents, per_km_fee_cents, min_fee_cents, max_fee_cents }),
      });
    } else {
      const payload: CreateZonePayload = {
        city_id: cityId,
        name: form.name,
        geojson: pendingGeoJson!,
        color: form.color,
        base_fee_cents,
        per_km_fee_cents,
        min_fee_cents,
        max_fee_cents,
      };
      res = await fetch('/api/admin/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    if (res.ok) {
      onSaved();
    } else {
      const data = await res.json();
      setError(data.error ?? 'Error al guardar zona');
    }
    setLoading(false);
  };

  const previewFee = () => {
    const base  = parseFloat(form.base_fee_soles)   || 0;
    const perKm = parseFloat(form.per_km_fee_soles) || 0;
    return `Ejemplo 2km: S/ ${(base + perKm * 2).toFixed(2)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: form.color }}
            >
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {isEdit ? 'Editar zona' : 'Nueva zona de delivery'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {!isEdit && pendingGeoJson && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              Polígono capturado del mapa ✓
            </div>
          )}

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Centro Histórico"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent placeholder:text-gray-400 transition"
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Color en el mapa</label>
            <div className="flex gap-3 flex-wrap">
              {COLOR_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  title={label}
                  onClick={() => setForm(f => ({ ...f, color: value }))}
                  className={`w-9 h-9 rounded-full transition-all ${
                    form.color === value ? 'scale-125 ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: value }}
                />
              ))}
            </div>
          </div>

          {/* Fees — input con prefijo S/ usando flexbox, sin position:absolute */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Tarifas de delivery (S/)</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Tarifa base',      key: 'base_fee_soles'   as const, hint: 'Al momento de asignar' },
                { label: 'Por km adicional', key: 'per_km_fee_soles' as const, hint: 'Desde restaurante al cliente' },
                { label: 'Mínimo a cobrar',  key: 'min_fee_soles'    as const, hint: 'Floor del cobro' },
                { label: 'Máximo a cobrar',  key: 'max_fee_soles'    as const, hint: 'Cap del cobro' },
              ].map(({ label, key, hint }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
                  {/* Flex row: prefijo fijo + input sin padding izquierdo extra */}
                  <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-orange-400 focus-within:border-transparent transition">
                    <span className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50 border-r border-gray-200 dark:border-gray-700 select-none shrink-0">
                      S/
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.50"
                      value={form[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="flex-1 px-3 py-2 text-sm bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none placeholder:text-gray-400"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 font-medium">
              {previewFee()}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isEdit ? 'Guardar cambios' : 'Crear zona'}
          </button>
        </div>
      </div>
    </div>
  );
}
