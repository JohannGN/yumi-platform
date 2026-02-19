'use client';

import { useState } from 'react';
import { X, Loader2, Eye, EyeOff, UserPlus, Camera } from 'lucide-react';
import { vehicleTypeLabels, riderPayTypeLabels } from '@/config/tokens';
import type { CreateRiderPayload } from '@/types/admin-panel';

interface CreateRiderFormProps {
  defaultCityId: string;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateRiderForm({ defaultCityId, onClose, onCreated }: CreateRiderFormProps) {
  const [form, setForm] = useState<CreateRiderPayload>({
    name:          '',
    email:         '',
    password:      '',
    phone:         '',
    city_id:       defaultCityId,
    vehicle_type:  'motorcycle',
    vehicle_plate: '',
    pay_type:      'fixed_salary',
  });

  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CreateRiderPayload, string>>>({});
  const [avatarFile, setAvatarFile]       = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof CreateRiderPayload, string>> = {};
    if (!form.name.trim())    errs.name     = 'Nombre requerido';
    if (!form.email.trim())   errs.email    = 'Email requerido';
    if (!form.email.includes('@')) errs.email = 'Email inválido';
    if (!form.password)       errs.password = 'Contraseña requerida';
    if (form.password.length < 6) errs.password = 'Mínimo 6 caracteres';
    if (!form.phone.trim())   errs.phone    = 'Teléfono requerido';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    const handleSubmit = async () => {
  if (!validate()) return;
  setSaving(true);
  setError('');
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();

    // Subir avatar si hay uno seleccionado
    let avatarUrl: string | undefined;
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop() ?? 'jpg';
      // Usamos timestamp como nombre temporal — el userId aún no existe
      const tempName = `riders/avatars/temp-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('yumi-images')
        .upload(tempName, avatarFile, { upsert: true });

      if (uploadError) throw new Error('Error al subir foto');

      const { data: urlData } = supabase.storage
        .from('yumi-images')
        .getPublicUrl(tempName);
      avatarUrl = urlData.publicUrl;
    }

    const payload = {
      ...form,
      phone: form.phone.startsWith('+51') ? form.phone : `+51${form.phone}`,
      vehicle_plate: form.vehicle_plate || undefined,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    };

    const res = await fetch('/api/admin/riders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json() as { error?: string };
      throw new Error(data.error ?? 'Error al crear rider');
    }

    onCreated();
    onClose();
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Error inesperado');
  } finally {
    setSaving(false);
  }
};
    setError('');
    try {
      const payload: CreateRiderPayload = {
        ...form,
        phone: form.phone.startsWith('+51') ? form.phone : `+51${form.phone}`,
        vehicle_plate: form.vehicle_plate || undefined,
      };

      const res = await fetch('/api/admin/riders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Error al crear rider');
      }

      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSaving(false);
    }
  };

  const f = (field: keyof CreateRiderPayload) => ({
    value: form[field] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm({ ...form, [field]: e.target.value }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100">Nuevo Rider</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">Crea una cuenta de rider</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Datos personales */}
          {/* Foto del rider */}
          <div className="flex flex-col items-center gap-2">
            <label className="cursor-pointer group">
              <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 group-hover:border-orange-400 transition-colors flex items-center justify-center overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-7 h-7 text-gray-400 group-hover:text-orange-400 transition-colors" />
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </label>
            <p className="text-xs text-gray-400">
              {avatarPreview ? 'Toca para cambiar' : 'Foto del rider (opcional)'}
            </p>
          </div>
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
              Datos personales
            </legend>

            <Field label="Nombre completo *" error={fieldErrors.name}>
              <input
                type="text"
                placeholder="Juan Pérez"
                {...f('name')}
                className="form-input"
              />
            </Field>

            <Field label="Teléfono *" error={fieldErrors.phone}>
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 focus-within:border-orange-500 transition-colors overflow-hidden">
              <span className="flex items-center px-3 bg-gray-100 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400 font-mono shrink-0 border-r border-gray-200 dark:border-gray-700">
                +51
              </span>
              <input
                type="tel"
                placeholder="987 654 321"
                value={form.phone.replace('+51', '')}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="flex-1 px-3 py-2.5 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none"
              />
            </div>
            </Field>
          </fieldset>

          {/* Credenciales */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
              Credenciales de acceso
            </legend>

            <Field label="Email *" error={fieldErrors.email}>
              <input
                type="email"
                placeholder="rider@yumi.pe"
                {...f('email')}
                className="form-input"
              />
            </Field>

            <Field label="Contraseña temporal *" error={fieldErrors.password}>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  {...f('password')}
                  className="form-input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>
          </fieldset>

          {/* Vehículo */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
              Vehículo
            </legend>

            <Field label="Tipo de vehículo *">
              <select {...f('vehicle_type')} className="form-select">
                {Object.entries(vehicleTypeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>

            <Field label="Placa (opcional)">
              <input
                type="text"
                placeholder="ABC-123"
                {...f('vehicle_plate')}
                className="form-input"
              />
            </Field>
          </fieldset>

          {/* Pago */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
              Tipo de pago
            </legend>

            <div className="grid grid-cols-2 gap-3">
              {Object.entries(riderPayTypeLabels).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setForm({ ...form, pay_type: k as CreateRiderPayload['pay_type'] })}
                  className={`p-3 rounded-xl border-2 text-sm font-medium text-left transition ${
                    form.pay_type === k
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            {saving ? 'Creando…' : 'Crear Rider'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
    </div>
  );
}
