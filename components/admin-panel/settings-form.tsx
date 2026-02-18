'use client';

import { useState, useEffect } from 'react';
import { Save, Info } from 'lucide-react';
import { colors, formatCurrency } from '@/config/tokens';
import type { PlatformSettings } from '@/types/admin-panel';

interface SettingsFormProps {
  settings: PlatformSettings | null;
  canEdit: boolean;
  onSave: (updated: Partial<PlatformSettings>) => Promise<void>;
}

export function SettingsForm({ settings, canEdit, onSave }: SettingsFormProps) {
  const [enabled, setEnabled] = useState(settings?.pos_surcharge_enabled ?? true);
  const [rate, setRate] = useState((settings ? settings.pos_commission_rate * 100 : 4.5).toFixed(2));
  const [igvRate, setIgvRate] = useState((settings ? settings.pos_igv_rate * 100 : 0).toFixed(2));
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.pos_surcharge_enabled);
      setRate((settings.pos_commission_rate * 100).toFixed(2));
      setIgvRate((settings.pos_igv_rate * 100).toFixed(2));
    }
  }, [settings]);

  // Preview cálculo: pedido POS de S/ 50.00
  const sampleOrder = 5000; // 50.00 soles en céntimos
  const rateDecimal = parseFloat(rate) / 100 || 0;
  const igvDecimal = parseFloat(igvRate) / 100 || 0;
  const surcharge = enabled ? Math.ceil(sampleOrder * rateDecimal * (1 + igvDecimal) / 10) * 10 : 0;
  const totalWithSurcharge = sampleOrder + surcharge;

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSave({
        pos_surcharge_enabled: enabled,
        pos_commission_rate: parseFloat(rate) / 100,
        pos_igv_rate: parseFloat(igvRate) / 100,
      });
      setToast('Configuración guardada');
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast('Error al guardar');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white"
          style={{ backgroundColor: toast.includes('Error') ? colors.semantic.error : colors.semantic.success }}
        >
          {toast}
        </div>
      )}

      {/* POS Surcharge section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Recargo POS</h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
              Comisión por pagos con tarjeta (POS terminal)
            </p>
          </div>
          {/* Toggle */}
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              disabled={!canEdit}
            />
            <div
              className={`w-11 h-6 rounded-full transition-colors peer-checked:after:translate-x-full
                after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform
                ${enabled ? '' : 'bg-gray-200 dark:bg-gray-700'}`}
              style={enabled ? { backgroundColor: colors.brand.primary } : {}}
            />
          </label>
        </div>

        <div className={`space-y-4 ${!enabled ? 'opacity-40 pointer-events-none' : ''}`}>
          {/* Rate input */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Tasa de comisión (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  min="0"
                  max="20"
                  step="0.01"
                  disabled={!canEdit}
                  className="w-full pl-4 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                             bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                             focus:outline-none disabled:cursor-not-allowed"
                  onFocus={(e) => { e.target.style.boxShadow = `0 0 0 2px ${colors.brand.primary}40`; }}
                  onBlur={(e) => { e.target.style.boxShadow = ''; }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                IGV sobre comisión (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={igvRate}
                  onChange={(e) => setIgvRate(e.target.value)}
                  min="0"
                  max="25"
                  step="0.01"
                  disabled={!canEdit}
                  className="w-full pl-4 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                             bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                             focus:outline-none disabled:cursor-not-allowed"
                  onFocus={(e) => { e.target.style.boxShadow = `0 0 0 2px ${colors.brand.primary}40`; }}
                  onBlur={(e) => { e.target.style.boxShadow = ''; }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
            </div>
          </div>

          {/* Fórmula info */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Fórmula: <code className="font-mono">total × tasa × (1 + igv)</code>
              {' '}→ resultado redondeado arriba al múltiplo de S/ 0.10
            </p>
          </div>

          {/* Preview */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">PREVIEW — Pedido POS de S/ 50.00</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>Subtotal</span>
                <span>{formatCurrency(sampleOrder)}</span>
              </div>
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>Recargo POS ({rate}% + IGV {igvRate}%)</span>
                <span>+ {formatCurrency(surcharge)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-1 mt-1">
                <span>Total cliente</span>
                <span>{formatCurrency(totalWithSurcharge)}</span>
              </div>
            </div>
          </div>
        </div>

        {canEdit && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white
                       transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: colors.brand.primary }}
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        )}

        {!canEdit && (
          <p className="mt-4 text-xs text-gray-400 dark:text-gray-600 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Solo el owner puede modificar la configuración nacional
          </p>
        )}
      </div>

      {/* Sección info YUMI */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Información YUMI</h3>
        <dl className="space-y-3 text-sm">
          {[
            { label: 'WhatsApp YUMI', value: '+51 953 211 536' },
            { label: 'Ciudad actual', value: 'Jaén, Cajamarca' },
            { label: 'Versión schema BD', value: '2.2 (Post-Chat 6)' },
            { label: 'Tablas activas', value: '23 (incl. platform_settings, shift_logs)' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
              <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
