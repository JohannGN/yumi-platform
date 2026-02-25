'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Upload, Loader2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency, recurringPeriodLabels } from '@/config/tokens';
import { createClient } from '@/lib/supabase/client';
import { logAuditAction } from '@/lib/utils/audit';
import type { Expense, ExpenseCategory, CreateExpensePayload } from '@/types/expenses';

interface CityOption {
  id: string;
  name: string;
}

interface RiderOption {
  id: string;
  name: string;
}

interface RestaurantOption {
  id: string;
  name: string;
}

interface ExpenseFormModalProps {
  expense: Expense | null;
  categories: ExpenseCategory[];
  cities: CityOption[];
  onClose: (saved?: boolean) => void;
}

export function ExpenseFormModal({ expense, categories, cities, onClose }: ExpenseFormModalProps) {
  const isEditing = !!expense;
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [categoryId, setCategoryId] = useState(expense?.category_id || '');
  const [amountStr, setAmountStr] = useState(
    expense ? (expense.amount_cents / 100).toFixed(2) : ''
  );
  const [description, setDescription] = useState(expense?.description || '');
  const [date, setDate] = useState(
    expense?.date || new Date().toISOString().split('T')[0]
  );
  const [cityId, setCityId] = useState(expense?.city_id || '');
  const [recurring, setRecurring] = useState(expense?.recurring || false);
  const [recurringPeriod, setRecurringPeriod] = useState(expense?.recurring_period || '');
  const [linkedRiderId, setLinkedRiderId] = useState(expense?.linked_rider_id || '');
  const [linkedRestaurantId, setLinkedRestaurantId] = useState(expense?.linked_restaurant_id || '');
  const [notes, setNotes] = useState(expense?.notes || '');
  const [receiptUrl, setReceiptUrl] = useState(expense?.receipt_url || '');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  // Options
  const [riders, setRiders] = useState<RiderOption[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);

  // UI
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load riders and restaurants for linking
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [ridersRes, restRes] = await Promise.all([
          fetch('/api/admin/riders'),
          fetch('/api/admin/restaurants'),
        ]);
        if (ridersRes.ok) {
          const data = await ridersRes.json();
          const riderList = Array.isArray(data) ? data : data.data || [];
          setRiders(riderList.map((r: { id: string; rider_name?: string; name?: string }) => ({
            id: r.id,
            name: r.rider_name || r.name || 'Rider',
          })));
        }
        if (restRes.ok) {
          const data = await restRes.json();
          const restList = Array.isArray(data) ? data : data.data || [];
          setRestaurants(restList.map((r: { id: string; name: string }) => ({
            id: r.id,
            name: r.name,
          })));
        }
      } catch (err) {
        console.error('Error loading options:', err);
      }
    };
    loadOptions();
  }, []);

  // Load signed URL for existing receipt
  useEffect(() => {
    if (expense?.receipt_url && !receiptPreview) {
      const loadPreview = async () => {
        try {
          const { data } = await supabase.storage
            .from('yumi-evidence')
            .createSignedUrl(expense.receipt_url!, 3600);
          if (data?.signedUrl) setReceiptPreview(data.signedUrl);
        } catch (err) {
          console.error('Error loading receipt preview:', err);
        }
      };
      loadPreview();
    }
  }, [expense?.receipt_url, receiptPreview, supabase]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setErrors((prev) => ({ ...prev, receipt: 'Solo imágenes o PDF' }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, receipt: 'Máximo 10 MB' }));
      return;
    }

    setReceiptFile(file);
    setErrors((prev) => {
      const { receipt, ...rest } = prev;
      return rest;
    });

    // Preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setReceiptPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview(null);
    }
  };

  const uploadReceipt = async (expenseId: string): Promise<string | null> => {
    if (!receiptFile) return receiptUrl || null;

    setUploading(true);
    try {
      const ext = receiptFile.name.split('.').pop() || 'jpg';
      const path = `expenses/${expenseId}/${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage
        .from('yumi-evidence')
        .upload(path, receiptFile, {
          contentType: receiptFile.type,
          upsert: false,
        });
      if (error) throw error;
      return data.path;
    } catch (err) {
      console.error('Upload error:', err);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const amountNum = parseFloat(amountStr);

    if (!categoryId) errs.category = 'Categoría requerida';
    if (!amountStr || isNaN(amountNum) || amountNum <= 0) errs.amount = 'Monto debe ser mayor a 0';
    if (!description.trim()) errs.description = 'Descripción requerida';
    if (!date) errs.date = 'Fecha requerida';
    if (!cityId) errs.city = 'Ciudad requerida';
    if (recurring && !recurringPeriod) errs.period = 'Selecciona período';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const amountCents = Math.round(parseFloat(amountStr) * 100);

      if (isEditing) {
        // PATCH existing
        const body: Record<string, unknown> = {
          category_id: categoryId,
          amount_cents: amountCents,
          description: description.trim(),
          date,
          city_id: cityId,
          recurring,
          recurring_period: recurring ? recurringPeriod : null,
          linked_rider_id: linkedRiderId || null,
          linked_restaurant_id: linkedRestaurantId || null,
          notes: notes.trim() || null,
        };

        // Upload receipt if new file
        if (receiptFile) {
          const path = await uploadReceipt(expense!.id);
          if (path) body.receipt_url = path;
        }

        const res = await fetch(`/api/admin/expenses/${expense!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Error al actualizar');
        }

        // Audit
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          logAuditAction(supabase, user.id, 'update', 'expense', expense!.id, { description: description.trim() });
        }
      } else {
        // POST new
        const payload: CreateExpensePayload = {
          city_id: cityId,
          category_id: categoryId,
          amount_cents: Math.round(parseFloat(amountStr) * 100),
          description: description.trim(),
          date,
          recurring,
          recurring_period: recurring ? recurringPeriod : undefined,
          linked_rider_id: linkedRiderId || undefined,
          linked_restaurant_id: linkedRestaurantId || undefined,
          notes: notes.trim() || undefined,
        };

        const res = await fetch('/api/admin/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Error al crear');
        }

        const created = await res.json();

        // Upload receipt if file selected
        if (receiptFile && created.id) {
          const path = await uploadReceipt(created.id);
          if (path) {
            await fetch(`/api/admin/expenses/${created.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ receipt_url: path }),
            });
          }
        }

        // Audit
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          logAuditAction(supabase, user.id, 'create', 'expense', created.id, { description: description.trim() });
        }
      }

      onClose(true);
    } catch (err) {
      console.error('Save error:', err);
      setErrors({ general: err instanceof Error ? err.message : 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    setReceiptUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50"
        onClick={() => onClose()}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-[600px] max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? 'Editar egreso' : 'Nuevo egreso'}
          </h2>
          <button
            onClick={() => onClose()}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {errors.general && (
            <div className="p-3 rounded-md text-sm" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
              {errors.general}
            </div>
          )}

          {/* Category + Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Categoría *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={`w-full h-10 px-3 rounded-md border text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                  errors.category ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'
                }`}
              >
                <option value="">Seleccionar...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                  </option>
                ))}
              </select>
              {errors.category && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.category}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Monto (S/) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                className={`w-full h-10 px-3 rounded-md border text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 tabular-nums ${
                  errors.amount ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'
                }`}
              />
              {errors.amount && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.amount}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descripción *
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Combustible moto rider Juan"
              className={`w-full h-10 px-3 rounded-md border text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                errors.description ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'
              }`}
            />
            {errors.description && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.description}</p>}
          </div>

          {/* Date + City */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fecha *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full h-10 px-3 rounded-md border text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                  errors.date ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'
                }`}
              />
              {errors.date && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.date}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ciudad *
              </label>
              <select
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                className={`w-full h-10 px-3 rounded-md border text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                  errors.city ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'
                }`}
              >
                <option value="">Seleccionar...</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
              {errors.city && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.city}</p>}
            </div>
          </div>

          {/* Recurring */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={recurring}
                onChange={(e) => {
                  setRecurring(e.target.checked);
                  if (!e.target.checked) setRecurringPeriod('');
                }}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Gasto recurrente
              </span>
            </label>

            {recurring && (
              <div>
                <select
                  value={recurringPeriod}
                  onChange={(e) => setRecurringPeriod(e.target.value)}
                  className={`w-full h-10 px-3 rounded-md border text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                    errors.period ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <option value="">Seleccionar período...</option>
                  {Object.entries(recurringPeriodLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                {errors.period && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.period}</p>}
              </div>
            )}
          </div>

          {/* Linked entities */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Rider vinculado
              </label>
              <select
                value={linkedRiderId}
                onChange={(e) => setLinkedRiderId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-gray-200 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Ninguno</option>
                {riders.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Restaurante vinculado
              </label>
              <select
                value={linkedRestaurantId}
                onChange={(e) => setLinkedRestaurantId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-gray-200 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Ninguno</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notas
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Notas adicionales (opcional)"
              className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
            />
          </div>

          {/* Receipt upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Comprobante
            </label>

            {receiptPreview ? (
              <div className="relative inline-block">
                <img
                  src={receiptPreview}
                  alt="Comprobante"
                  className="w-32 h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                />
                <button
                  type="button"
                  onClick={removeReceipt}
                  className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white shadow-md hover:bg-red-600 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors w-full justify-center"
              >
                <Upload className="w-4 h-4" />
                Subir foto o PDF
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            {errors.receipt && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.receipt}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <button
            onClick={() => onClose()}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-60"
            style={{ backgroundColor: '#FF6B35' }}
          >
            {(saving || uploading) && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEditing ? 'Guardar cambios' : 'Crear egreso'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
