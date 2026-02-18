'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Store, MapPin, Settings, Eye, EyeOff, ChevronRight, ChevronLeft, Check } from 'lucide-react';

interface CreateRestaurantFormProps {
  onClose: () => void;
  onCreated: () => void;
  isOwner: boolean;
  userCityId: string | null;
}

interface CityOption { id: string; name: string }
interface CategoryOption { id: string; name: string; emoji: string | null }

const THEME_COLORS = [
  { value: 'orange', label: 'Naranja YUMI', hex: '#FF6B35' },
  { value: 'red', label: 'Rojo Fuego', hex: '#EF4444' },
  { value: 'green', label: 'Verde Fresco', hex: '#22C55E' },
  { value: 'blue', label: 'Azul Océano', hex: '#3B82F6' },
  { value: 'purple', label: 'Púrpura Real', hex: '#8B5CF6' },
];

type Step = 1 | 2 | 3;

export default function CreateRestaurantForm({ onClose, onCreated, isOwner, userCityId }: CreateRestaurantFormProps) {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  const [form, setForm] = useState({
    // Step 1 - Básico
    name: '',
    slug: '',
    email: '',
    password: '',
    // Step 2 - Ubicación
    city_id: userCityId ?? '',
    address: '',
    lat: '',
    lng: '',
    phone: '',
    whatsapp: '',
    description: '',
    // Step 3 - Configuración
    category_id: '',
    commission_percentage: '0',
    theme_color: 'orange',
    estimated_prep_minutes: '30',
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/cities').then(r => r.json()),
      fetch('/api/admin/categories').then(r => r.json()),
    ]).then(([citiesData, catsData]) => {
      setCities(citiesData.cities ?? []);
      setCategories(catsData.categories ?? []);
    });
  }, []);

  // Auto-generar slug desde nombre
  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setForm(f => ({ ...f, name, slug }));
  };

  const validateStep = (): string | null => {
    if (step === 1) {
      if (!form.name.trim()) return 'El nombre es obligatorio';
      if (!form.slug.trim()) return 'El slug es obligatorio';
      if (!form.email.trim()) return 'El email es obligatorio';
      if (!form.password.trim() || form.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
    }
    if (step === 2) {
      if (!form.city_id) return 'Selecciona una ciudad';
      if (!form.address.trim()) return 'La dirección es obligatoria';
      if (!form.lat || !form.lng) return 'Las coordenadas son obligatorias';
    }
    if (step === 3) {
      if (!form.category_id) return 'Selecciona una categoría';
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(null);
    setStep(s => (s < 3 ? (s + 1) as Step : s));
  };

  const handleSubmit = async () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setLoading(true);
    setError(null);

    const res = await fetch('/api/admin/restaurants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        commission_percentage: parseFloat(form.commission_percentage),
        estimated_prep_minutes: parseInt(form.estimated_prep_minutes),
      }),
    });

    if (res.ok) {
      onCreated();
    } else {
      const data = await res.json();
      setError(data.error ?? 'Error al crear restaurante');
    }
    setLoading(false);
  };

  const stepTitles = ['Datos básicos', 'Ubicación', 'Configuración'];
  const stepIcons = [Store, MapPin, Settings];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nuevo restaurante</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Paso {step} de 3 — {stepTitles[step - 1]}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex px-6 py-4 gap-3">
          {([1, 2, 3] as Step[]).map((s) => {
            const Icon = stepIcons[s - 1];
            return (
              <div
                key={s}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  step === s
                    ? 'bg-orange-500 text-white'
                    : step > s
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                }`}
              >
                {step > s ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                {stepTitles[s - 1]}
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="px-6 pb-6 space-y-4">
          {/* STEP 1 */}
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                  Nombre del restaurante <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="Ej: Don Pepito"
                  className="w-full form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                  Slug (URL) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-500 text-sm border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-lg">
                    yumi.pe/jaen/
                  </span>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                    className="flex-1 form-input rounded-l-none font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                  Email del propietario <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="propietario@email.com"
                  className="w-full form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                  Contraseña <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full form-input pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <>
              {isOwner && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                    Ciudad <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.city_id}
                    onChange={e => setForm(f => ({ ...f, city_id: e.target.value }))}
                    className="w-full form-select"
                  >
                    <option value="">Seleccionar ciudad</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                  Dirección completa <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Jr. Lima 123, Centro"
                  className="w-full form-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                    Latitud <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.0000001"
                    value={form.lat}
                    onChange={e => setForm(f => ({ ...f, lat: e.target.value }))}
                    placeholder="-5.7083"
                    className="w-full form-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                    Longitud <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.0000001"
                    value={form.lng}
                    onChange={e => setForm(f => ({ ...f, lng: e.target.value }))}
                    placeholder="-78.8089"
                    className="w-full form-input font-mono"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400">💡 Obtén las coordenadas desde Google Maps haciendo clic derecho sobre la ubicación</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Teléfono</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+51 987 654 321"
                    className="w-full form-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">WhatsApp</label>
                  <input
                    type="tel"
                    value={form.whatsapp}
                    onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                    placeholder="+51 987 654 321"
                    className="w-full form-input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Breve descripción del restaurante..."
                  className="w-full form-input"
                />
              </div>
            </>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                  Categoría <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.category_id}
                  onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                  className="w-full form-select"
                >
                  <option value="">Seleccionar categoría</option>
                  {categories.filter(c => c).map(c => (
                    <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Comisión (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={form.commission_percentage}
                    onChange={e => setForm(f => ({ ...f, commission_percentage: e.target.value }))}
                    className="w-full form-input"
                  />
                  <p className="text-xs text-gray-400 mt-1">0% por defecto, negociar luego</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Tiempo prep. (min)</label>
                  <input
                    type="number"
                    min="5"
                    value={form.estimated_prep_minutes}
                    onChange={e => setForm(f => ({ ...f, estimated_prep_minutes: e.target.value }))}
                    className="w-full form-input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Color del tema</label>
                <div className="flex gap-3">
                  {THEME_COLORS.map(({ value, label, hex }) => (
                    <button
                      key={value}
                      type="button"
                      title={label}
                      onClick={() => setForm(f => ({ ...f, theme_color: value }))}
                      className={`w-9 h-9 rounded-full transition-all ${
                        form.theme_color === value ? 'scale-125 ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={() => { setError(null); setStep(s => (s > 1 ? (s - 1) as Step : s)); }}
            disabled={step === 1}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>

          {step < 3 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Crear restaurante
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
