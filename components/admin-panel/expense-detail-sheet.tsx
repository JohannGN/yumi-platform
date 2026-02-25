'use client';

import { useState, useEffect } from 'react';
import { X, Pencil, Trash2, ExternalLink, AlertTriangle, Calendar, MapPin, User, Building2, Bike, FileText, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, formatDate, recurringPeriodLabels } from '@/config/tokens';
import { createClient } from '@/lib/supabase/client';
import type { Expense } from '@/types/expenses';

interface ExpenseDetailSheetProps {
  expense: Expense | null;
  open: boolean;
  onClose: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
}

export function ExpenseDetailSheet({ expense, open, onClose, onEdit, onDelete }: ExpenseDetailSheetProps) {
  const [userRole, setUserRole] = useState<string>('');
  const [receiptSignedUrl, setReceiptSignedUrl] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const supabase = createClient();

  // Get current user role
  useEffect(() => {
    const getRole = async () => {
      try {
        const res = await fetch('/api/admin/stats');
        if (res.ok) {
          // Role is inferred from having access to admin APIs
          setUserRole('owner'); // owner/city_admin have edit/delete access
        }
      } catch {
        // Fallback
      }
    };
    getRole();
  }, []);

  // Fetch user role from users table
  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        if (data) setUserRole(data.role);
      }
    };
    fetchRole();
  }, [supabase]);

  // Signed URL for receipt
  useEffect(() => {
    setReceiptSignedUrl(null);
    if (expense?.receipt_url) {
      const loadReceipt = async () => {
        try {
          const { data } = await supabase.storage
            .from('yumi-evidence')
            .createSignedUrl(expense.receipt_url!, 3600);
          if (data?.signedUrl) setReceiptSignedUrl(data.signedUrl);
        } catch (err) {
          console.error('Error loading receipt:', err);
        }
      };
      loadReceipt();
    }
  }, [expense?.receipt_url, supabase]);

  const handleDeleteConfirm = async () => {
    if (!expense) return;
    setDeleting(true);
    await onDelete(expense.id);
    setDeleting(false);
    setConfirmDelete(false);
  };

  const canEditDelete = userRole === 'owner' || userRole === 'city_admin';

  return (
    <AnimatePresence>
      {open ? (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-[500px] bg-white dark:bg-gray-800 shadow-xl overflow-y-auto"
          >
            {expense && (
              <>
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Detalle del egreso
                  </h2>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Content */}
                <div className="px-6 py-5 space-y-6">
                  {/* Amount + Category */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Monto</p>
                      <p className="text-3xl font-bold tabular-nums" style={{ color: '#EF4444' }}>
                        {formatCurrency(expense.amount_cents)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      {expense.category_icon && (
                        <span className="text-xl">{expense.category_icon}</span>
                      )}
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {expense.category_name || 'Sin categoría'}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Descripción</p>
                    <p className="text-gray-900 dark:text-gray-100">{expense.description}</p>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <DetailItem
                      icon={Calendar}
                      label="Fecha"
                      value={formatDate(expense.date)}
                    />
                    <DetailItem
                      icon={MapPin}
                      label="Ciudad"
                      value={expense.city_name || '—'}
                    />
                    <DetailItem
                      icon={User}
                      label="Creado por"
                      value={expense.creator_name || '—'}
                    />
                    <DetailItem
                      icon={Calendar}
                      label="Registrado"
                      value={formatDate(expense.created_at)}
                    />
                  </div>

                  {/* Recurring */}
                  {expense.recurring && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#FEF3C7' }}>
                      <RefreshCw className="w-4 h-4" style={{ color: '#92400E' }} />
                      <span className="text-sm font-medium" style={{ color: '#92400E' }}>
                        Gasto recurrente — {recurringPeriodLabels[expense.recurring_period || ''] || expense.recurring_period}
                      </span>
                    </div>
                  )}

                  {/* Linked entities */}
                  {(expense.linked_rider_name || expense.linked_restaurant_name) && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Vinculado a</p>
                      {expense.linked_rider_name && (
                        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <Bike className="w-4 h-4 text-gray-400" />
                          Rider: {expense.linked_rider_name}
                        </div>
                      )}
                      {expense.linked_restaurant_name && (
                        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          Restaurante: {expense.linked_restaurant_name}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {expense.notes && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Notas</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                        {expense.notes}
                      </p>
                    </div>
                  )}

                  {/* Receipt */}
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Comprobante</p>
                    {receiptSignedUrl ? (
                      <div className="space-y-2">
                        <img
                          src={receiptSignedUrl}
                          alt="Comprobante"
                          className="w-full max-w-[300px] rounded-lg border border-gray-200 dark:border-gray-600"
                        />
                        <a
                          href={receiptSignedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm hover:underline"
                          style={{ color: '#3B82F6' }}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Ver tamaño completo
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                        Sin comprobante adjunto
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer actions */}
                {canEditDelete && (
                  <div className="sticky bottom-0 flex items-center gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    {confirmDelete ? (
                      <div className="flex items-center gap-2 w-full">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#EF4444' }} />
                        <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                          ¿Eliminar este egreso?
                        </span>
                        <button
                          onClick={() => setConfirmDelete(false)}
                          disabled={deleting}
                          className="px-3 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleDeleteConfirm}
                          disabled={deleting}
                          className="px-3 py-1.5 text-sm rounded-md text-white font-medium"
                          style={{ backgroundColor: '#EF4444' }}
                        >
                          {deleting ? 'Eliminando...' : 'Confirmar'}
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => onEdit(expense)}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                          Editar
                        </button>
                        <button
                          onClick={() => setConfirmDelete(true)}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Eliminar
                        </button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

// Helper sub-component
function DetailItem({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm text-gray-900 dark:text-gray-100">{value}</p>
      </div>
    </div>
  );
}
