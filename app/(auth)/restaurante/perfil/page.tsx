'use client';

// ============================================================
// Restaurant Profile — Edit description, hours, theme, settings
// Chat 5 — Fragment 4/7
// ============================================================

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRestaurant } from '@/components/restaurant-panel';
import { formatPrice } from '@/lib/utils/rounding';
// restaurantThemes removed — labels hardcoded to avoid UTF-8 encoding issues
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

const THEME_OPTIONS = [
  { key: 'orange', label: 'Naranja (YUMI)', color: '#FF6B35' },
  { key: 'red', label: 'Rojo Fuego', color: '#EF4444' },
  { key: 'green', label: 'Verde Fresco', color: '#22C55E' },
  { key: 'blue', label: 'Azul Oceano', color: '#3B82F6' },
  { key: 'purple', label: 'Purpura Real', color: '#8B5CF6' },
];

export default function PerfilPage() {
  const { restaurant, refetch } = useRestaurant();

  // Form state
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [themeColor, setThemeColor] = useState('orange');
  const [prepMinutes, setPrepMinutes] = useState(30);
  const [minOrderSoles, setMinOrderSoles] = useState('0.00');
  const [hours, setHours] = useState<OpeningHours | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [sameAsPhone, setSameAsPhone] = useState(false);

  // Init form from restaurant data
  useEffect(() => {
    if (!restaurant) return;
    setDescription(restaurant.description || '');
    setPhone(restaurant.phone || '');
    setWhatsapp(restaurant.whatsapp || '');
    setSameAsPhone(restaurant.phone === restaurant.whatsapp && !!restaurant.phone);
    setThemeColor(restaurant.theme_color || 'orange');
    setPrepMinutes(restaurant.estimated_prep_minutes || 30);
    setMinOrderSoles(((restaurant.min_order_cents || 0) / 100).toFixed(2));
    setHours(restaurant.opening_hours);
    setLogoUrl(restaurant.logo_url || null);
    setLogoPreview(restaurant.logo_url || null);
    setBannerUrl(restaurant.banner_url || null);
    setBannerPreview(restaurant.banner_url || null);
  }, [restaurant]);

  // ——— Image upload ———
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file || !restaurant) return;

    if (file.size > 5 * 1024 * 1024) {
      setSaveMessage({ type: 'error', text: 'La imagen no puede pesar más de 5MB' });
      setTimeout(() => setSaveMessage(null), 4000);
      return;
    }

    // Preview inmediato
    const preview = URL.createObjectURL(file);
    if (type === 'logo') setLogoPreview(preview);
    else setBannerPreview(preview);

    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `restaurants/${restaurant.id}/${type}-${Date.now()}.${ext}`;

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/yumi-images/${path}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${(await (await import('@/lib/supabase/client')).createClient().auth.getSession()).data.session?.access_token}`,
          },
          body: formData,
        }
      );

      if (!res.ok) throw new Error('Upload failed');

      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/yumi-images/${path}`;

      if (type === 'logo') {
        setLogoUrl(publicUrl);
        setLogoPreview(publicUrl);
      } else {
        setBannerUrl(publicUrl);
        setBannerPreview(publicUrl);
      }

      setSaveMessage({ type: 'success', text: `${type === 'logo' ? 'Logo' : 'Portada'} subida. Guarda para aplicar.` });
    } catch {
      setSaveMessage({ type: 'error', text: 'Error al subir imagen' });
      if (type === 'logo') setLogoPreview(logoUrl);
      else setBannerPreview(bannerUrl);
    } finally {
      setIsUploading(false);
      setTimeout(() => setSaveMessage(null), 4000);
    }
  };

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
          logo_url: logoUrl,
          banner_url: bannerUrl,
          description,
          phone: phone || null,
          whatsapp: sameAsPhone ? (phone || null) : (whatsapp || null),
          theme_color: themeColor,
          estimated_prep_minutes: prepMinutes,
          min_order_cents: Math.max(0, Math.round(parseFloat(minOrderSoles || '0') * 100)),
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
          <div className="space-y-3">
            <InputField
              label="Teléfono"
              value={phone}
              onChange={setPhone}
              placeholder="+51987654321"
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="same-whatsapp"
                checked={sameAsPhone}
                onChange={(e) => {
                  setSameAsPhone(e.target.checked);
                  if (e.target.checked) setWhatsapp(phone);
                }}
                className="rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35]"
              />
              <label htmlFor="same-whatsapp" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                Usar el mismo número para WhatsApp
              </label>
            </div>
            {!sameAsPhone && (
              <InputField
                label="WhatsApp"
                value={whatsapp}
                onChange={setWhatsapp}
                placeholder="+51987654321"
              />
            )}
            <p className="text-[10px] text-gray-400">
              Puedes dejar ambos vacíos si no deseas mostrar contacto.
            </p>
          </div>
        </div>
      </FormSection>

    {/* Logo & Banner */}
      <FormSection title="Logo y portada">
        <div className="space-y-5">
          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Logo del restaurante
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">🍽️</span>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium cursor-pointer transition-all ${isUploading ? 'bg-gray-400 cursor-wait' : 'bg-[#FF6B35] hover:bg-[#E55A25] active:scale-[0.97]'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  {isUploading ? 'Subiendo...' : 'Subir logo'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={isUploading} onChange={(e) => handleImageUpload(e, 'logo')} />
                </label>
                {logoPreview && (
                  <button onClick={() => { setLogoPreview(null); setLogoUrl(null); }} className="text-xs text-red-500 hover:text-red-600">
                    Eliminar
                  </button>
                )}
                <p className="text-[10px] text-gray-400">JPG, PNG o WebP. Max 5MB.</p>
              </div>
            </div>
          </div>

          {/* Banner */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Portada del restaurante
            </label>
            <div className="relative w-full h-32 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 overflow-hidden bg-gray-50 dark:bg-gray-800">
              {bannerPreview ? (
                <img src={bannerPreview} alt="Portada" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span className="text-xs">Sube una imagen de portada</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium cursor-pointer transition-all ${isUploading ? 'bg-gray-400 cursor-wait' : 'bg-[#FF6B35] hover:bg-[#E55A25] active:scale-[0.97]'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {isUploading ? 'Subiendo...' : 'Subir portada'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={isUploading} onChange={(e) => handleImageUpload(e, 'banner')} />
              </label>
              {bannerPreview && (
                <button onClick={() => { setBannerPreview(null); setBannerUrl(null); }} className="text-xs text-red-500 hover:text-red-600">
                  Eliminar
                </button>
              )}
              <p className="text-[10px] text-gray-400">Recomendado: 1200x400px</p>
            </div>
          </div>
        </div>
      </FormSection>

      {/* Theme */}
      <FormSection title="Color del restaurante">
        <div className="flex flex-wrap gap-3">
          {THEME_OPTIONS.map((t) => (
            <motion.button
              key={t.key}
              onClick={() => setThemeColor(t.key)}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all ${
                themeColor === t.key
                  ? 'shadow-md ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-sm'
              }`}
              style={{
                borderColor: themeColor === t.key ? t.color : undefined,
                ['--tw-ring-color' as string]: themeColor === t.key ? t.color : undefined,
              }}
            >
              <span
                className={`w-5 h-5 rounded-full transition-transform ${themeColor === t.key ? 'scale-110' : ''}`}
                style={{ backgroundColor: t.color }}
              />
              <span className={`text-xs font-medium transition-colors ${
                themeColor === t.key
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {t.label}
              </span>
              {themeColor === t.key && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-xs"
                >
                  ✓
                </motion.span>
              )}
            </motion.button>
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
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">S/</span>
              <input
                type="number"
                min={0}
                step={0.10}
                value={minOrderSoles}
                onChange={(e) => setMinOrderSoles(e.target.value)}
                className="w-full px-3 py-2.5 pl-8 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white tabular-nums text-right focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent outline-none"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">
              0 = sin mínimo
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
