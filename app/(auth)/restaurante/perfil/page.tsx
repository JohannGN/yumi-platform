'use client';

// ============================================================
// Restaurant Profile — Edit description, hours, theme, settings
// Chat 5 — Fragment 4/7
// ============================================================

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRestaurant } from '@/components/restaurant-panel';
import { formatPrice } from '@/lib/utils/rounding';
import { restaurantThemes } from '@/config/tokens';
import type { DayOfWeek, OpeningHours, DayHours } from '@/types/restaurant-panel';

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

const THEME_OPTIONS = Object.entries(restaurantThemes).map(([key, val]) => ({
  key,
  label: val.label,
  color: val.primary,
}));

export default function PerfilPage() {
  const { restaurant, refetch } = useRestaurant();

  // Form state
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [themeColor, setThemeColor] = useState('orange');
  const [prepMinutes, setPrepMinutes] = useState(30);
  const [minOrderCents, setMinOrderCents] = useState(0);
  const [hours, setHours] = useState<OpeningHours | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Init form from restaurant data
  useEffect(() => {
    if (!restaurant) return;
    setDescription(restaurant.description || '');
    setPhone(restaurant.phone || '');
    setWhatsapp(restaurant.whatsapp || '');
    setThemeColor(restaurant.theme_color || 'orange');
    setPrepMinutes(restaurant.estimated_prep_minutes || 30);
    setMinOrderCents(restaurant.min_order_cents || 0);
    setHours(restaurant.opening_hours);
  }, [restaurant]);

  // ─── Hours editor ─────────────────────────────────────────

  const updateHour = (day: DayOfWeek, field: keyof DayHours, value: string | boolean) => {
    if (!hours) return;
    setHours({
      ...hours,
      [day]: { ...hours[day], [field]: value },
    });
  };

  // ─── Save ─────────────────────────────────────────────────

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch('/api/restaurant/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          phone: phone || null,
          whatsapp: whatsapp || null,
          theme_color: themeColor,
          estimated_prep_minutes: prepMinutes,
          min_order_cents: minOrderCents,
          opening_hours: hours,
        }),
      });

      if (res.ok) {
        setSaveMessage({ type: 'success', text: '¡Cambios guardados!' });
        refetch();
      } else {
        const err = await res.json();
        setSaveMessage({ type: 'error', text: err.error || 'Error al guardar' });
      }
    } catch {
      setSaveMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 4000);
    }
  };

  if (!restaurant) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Perfil del restaurante
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Edita la información visible para tus clientes
        </p>
      </div>

      {/* General info */}
      <FormSection title="Información general">
        <div className="space-y-4">
          {/* Name (read-only) */}
          <FieldReadOnly label="Nombre" value={restaurant.name} />
          <FieldReadOnly label="Dirección" value={restaurant.address} />

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe tu restaurante en una frase..."
              rows={2}
              maxLength={500}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent outline-none resize-none"
            />
            <p className="text-[10px] text-gray-400 mt-0.5 text-right">{description.length}/500</p>
          </div>

          {/* Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="Teléfono"
              value={phone}
              onChange={setPhone}
              placeholder="+51987654321"
            />
            <InputField
              label="WhatsApp"
              value={whatsapp}
              onChange={setWhatsapp}
              placeholder="+51987654321"
            />
          </div>
        </div>
      </FormSection>

      {/* Theme */}
      <FormSection title="Color del restaurante">
        <div className="flex flex-wrap gap-3">
          {THEME_OPTIONS.map((t) => (
            <button
              key={t.key}
              onClick={() => setThemeColor(t.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all ${
                themeColor === t.key
                  ? 'border-gray-900 dark:border-white shadow-sm'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <span
                className="w-5 h-5 rounded-full"
                style={{ backgroundColor: t.color }}
              />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </FormSection>

      {/* Settings */}
      <FormSection title="Configuración">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Tiempo de preparación (min)
            </label>
            <input
              type="number"
              min={5}
              max={120}
              value={prepMinutes}
              onChange={(e) => setPrepMinutes(parseInt(e.target.value) || 30)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Pedido mínimo (S/)
            </label>
            <input
              type="number"
              min={0}
              step={100}
              value={minOrderCents}
              onChange={(e) => setMinOrderCents(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent outline-none"
            />
            <p className="text-[10px] text-gray-400 mt-0.5">
              En céntimos. Ej: 1000 = {formatPrice(1000)}
            </p>
          </div>
        </div>
      </FormSection>

      {/* Opening hours */}
      <FormSection title="Horarios de atención">
        {hours && (
          <div className="space-y-2">
            {DAYS.map(({ key, label }) => {
              const day = hours[key];
              return (
                <div
                  key={key}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                    day.closed
                      ? 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 opacity-60'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                  }`}
                >
                  {/* Day name */}
                  <span className="w-20 text-sm font-medium text-gray-700 dark:text-gray-300 flex-shrink-0">
                    {label}
                  </span>

                  {/* Closed toggle */}
                  <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={!day.closed}
                      onChange={(e) => updateHour(key, 'closed', !e.target.checked)}
                      className="rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35]"
                    />
                    <span className="text-[10px] text-gray-500">Abierto</span>
                  </label>

                  {/* Time inputs */}
                  {!day.closed && (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        value={day.open}
                        onChange={(e) => updateHour(key, 'open', e.target.value)}
                        className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:ring-1 focus:ring-[#FF6B35] outline-none"
                      />
                      <span className="text-xs text-gray-400">a</span>
                      <input
                        type="time"
                        value={day.close}
                        onChange={(e) => updateHour(key, 'close', e.target.value)}
                        className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:ring-1 focus:ring-[#FF6B35] outline-none"
                      />
                    </div>
                  )}

                  {day.closed && (
                    <span className="text-xs text-gray-400 italic">Cerrado</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </FormSection>

      {/* Save button */}
      <div className="sticky bottom-20 md:bottom-4 z-10">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-lg flex items-center gap-3">
          {saveMessage && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`text-sm flex-1 ${
                saveMessage.type === 'success'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {saveMessage.text}
            </motion.p>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`ml-auto px-6 py-2.5 rounded-xl font-semibold text-sm text-white transition-all ${
              isSaving
                ? 'bg-gray-400 cursor-wait'
                : 'bg-[#FF6B35] hover:bg-[#E55A25] active:scale-[0.98]'
            }`}
          >
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reusable components ────────────────────────────────────

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5"
    >
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h2>
      {children}
    </motion.div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent outline-none"
      />
    </div>
  );
}

function FieldReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
      </label>
      <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2.5">
        {value}
      </p>
    </div>
  );
}
