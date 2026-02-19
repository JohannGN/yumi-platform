'use client';

import { useState } from 'react';
import CategoriesList from '@/components/admin-panel/categories-list';
import CategoryForm from '@/components/admin-panel/category-form';
import { AdminCategory } from '@/types/admin-panel';

export default function AdminCategoriasPage() {
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null | undefined>(undefined);
  const [showForm, setShowForm]   = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEditClick = (category: AdminCategory) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleCreateClick = () => {
    setEditingCategory(null);
    setShowForm(true);
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditingCategory(undefined);
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="-m-4 lg:-m-6 h-[calc(100%+2rem)] lg:h-[calc(100%+3rem)] overflow-hidden bg-white dark:bg-gray-900">
      <CategoriesList
        key={refreshKey}
        onEditClick={handleEditClick}
        onCreateClick={handleCreateClick}
      />

      {showForm && (
        <CategoryForm
          category={editingCategory}
          onClose={() => { setShowForm(false); setEditingCategory(undefined); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
