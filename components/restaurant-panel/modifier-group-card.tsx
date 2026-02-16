// ============================================================
// ModifierGroupCard — Displays a modifier group with its options
// ============================================================
// FILE: components/restaurant-panel/modifier-group-card.tsx

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { ModifierOptionRow, type ModifierOption } from './modifier-option-row';
import { ModifierOptionForm } from './modifier-option-form';
import type { ModifierGroup } from './modifier-group-form';

interface ModifierGroupCardProps {
  group: ModifierGroup & { item_modifiers: ModifierOption[] };
  onEditGroup: (group: ModifierGroup) => void;
  onDeleteGroup: (group: ModifierGroup) => void;
  onMoveGroup: (groupId: string, direction: 'up' | 'down') => void;
  onSaveOption: (data: {
    modifier_group_id: string;
    name: string;
    price_cents: number;
    is_default: boolean;
    is_available: boolean;
    id?: string;
  }) => Promise<void>;
  onToggleOptionAvailable: (id: string, available: boolean) => Promise<void>;
  onDeleteOption: (option: ModifierOption) => void;
  isFirst: boolean;
  isLast: boolean;
}

export function ModifierGroupCard({
  group,
  onEditGroup,
  onDeleteGroup,
  onMoveGroup,
  onSaveOption,
  onToggleOptionAvailable,
  onDeleteOption,
  isFirst,
  isLast,
}: ModifierGroupCardProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingOption, setEditingOption] = useState<ModifierOption | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const options = group.item_modifiers || [];
  const availableCount = options.filter((o) => o.is_available).length;

  const handleSaveOption = async (data: any) => {
    await onSaveOption(data);
    setShowAddForm(false);
    setEditingOption(null);
  };

  const handleEditOption = (option: ModifierOption) => {
    setEditingOption(option);
    setShowAddForm(false);
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingOption(null);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
    >
      {/* Group Header */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-3">
          {/* Collapse toggle */}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="mt-0.5 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            {collapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>

          {/* Group info */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {group.name}
            </h4>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  group.is_required
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {group.is_required ? 'Obligatorio' : 'Opcional'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Min: {group.min_selections} · Max: {group.max_selections}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                · {availableCount}/{options.length} opciones
              </span>
            </div>
          </div>

          {/* Group actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Move up/down */}
            <button
              type="button"
              onClick={() => onMoveGroup(group.id, 'up')}
              disabled={isFirst}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Mover arriba"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onMoveGroup(group.id, 'down')}
              disabled={isLast}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Mover abajo"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-0.5" />
            <button
              type="button"
              onClick={() => onEditGroup(group)}
              className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
              title="Editar grupo"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteGroup(group)}
              className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors"
              title="Eliminar grupo"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Options list */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-2">
              {/* Options */}
              <AnimatePresence mode="popLayout">
                {options.map((option) =>
                  editingOption?.id === option.id ? (
                    <ModifierOptionForm
                      key={`edit-${option.id}`}
                      groupId={group.id}
                      editingOption={option}
                      onSave={handleSaveOption}
                      onCancel={handleCancelForm}
                    />
                  ) : (
                    <ModifierOptionRow
                      key={option.id}
                      option={option}
                      onToggleAvailable={onToggleOptionAvailable}
                      onEdit={handleEditOption}
                      onDelete={onDeleteOption}
                    />
                  )
                )}
              </AnimatePresence>

              {/* Empty state */}
              {options.length === 0 && !showAddForm && (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                  Sin opciones. Agrega la primera.
                </p>
              )}

              {/* Add option form */}
              <AnimatePresence>
                {showAddForm && (
                  <ModifierOptionForm
                    key="add-form"
                    groupId={group.id}
                    onSave={handleSaveOption}
                    onCancel={handleCancelForm}
                  />
                )}
              </AnimatePresence>

              {/* Add option button */}
              {!showAddForm && !editingOption && (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/10 rounded-lg border border-dashed border-orange-300 dark:border-orange-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Agregar opcion
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
