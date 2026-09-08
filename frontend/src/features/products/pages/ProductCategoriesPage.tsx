import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { StatsGrid } from '@/shared/components/stats-grid';
import { Button } from '@/shared/ui/button';
import { productsApi } from '@/features/products/api/products.api';
import { getErrorMessage } from '@/lib/errors';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import { inventoryApi } from '@/shared/api/inventory.api';
import { useLocationsQuery } from '@/shared/hooks/use-catalog-queries';
import { CategoriesDataTable } from '../components/categories/CategoriesDataTable';
import { CategoryFormModal } from '../components/categories/CategoryFormModal';
import { CategoryTransferProductsModal } from '../components/categories/CategoryTransferProductsModal';
import { CategoryTransferWarehouseModal } from '../components/categories/CategoryTransferWarehouseModal';

export function ProductCategoriesPage() {
  const queryClient = useQueryClient();
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: productsApi.categories });
  const productsQuery = useQuery({ queryKey: ['products-all'], queryFn: () => productsApi.listAll() });
  
  const categories = categoriesQuery.data || [];
  const products = productsQuery.data?.products || [];
  
  const [search, setSearch] = useState('');
  const [editingCategory, setEditingCategory] = useState<{ id: string | number; name: string } | null>(null);
  const [transferringCategory, setTransferringCategory] = useState<{ id: string | number; name: string } | null>(null);
  const [transferringWarehouseCategory, setTransferringWarehouseCategory] = useState<{ id: string | number; name: string } | null>(null);
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [targetCategoryId, setTargetCategoryId] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(new Set());
  const [deletingCategory, setDeletingCategory] = useState<{ id: string | number; name: string } | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editError, setEditError] = useState('');

  const statsItems = useMemo(() => {
    const totalCategories = categories.length;
    const totalAssignedProducts = categories.reduce((sum, c) => sum + (c.productCount || 0), 0);
    const emptyCategories = categories.filter((c) => !c.productCount || c.productCount === 0).length;
    
    let maxCategory = { name: '—', count: 0 };
    categories.forEach((c) => {
      if ((c.productCount || 0) > maxCategory.count) {
        maxCategory = { name: c.name, count: c.productCount || 0 };
      }
    });

    return [
      { key: 'total_cats', label: 'إجمالي الأقسام', value: totalCategories },
      { key: 'total_products', label: 'إجمالي الأصناف المربوطة', value: totalAssignedProducts },
      { key: 'empty_cats', label: 'أقسام بدون أصناف', value: emptyCategories },
      { key: 'top_cat', label: 'أكثر قسم كثافة', value: maxCategory.count > 0 ? `${maxCategory.name} (${maxCategory.count})` : '—' },
    ] as const;
  }, [categories]);

  const filteredCategories = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return categories;
    return categories.filter((c) => (c.name || '').toLowerCase().includes(s));
  }, [categories, search]);

  const categoryProducts = useMemo(() => {
    if (!transferringCategory) return [];
    return products.filter((p) => String(p.categoryId) === String(transferringCategory.id));
  }, [transferringCategory, products]);

  const locationsQueryData = useLocationsQuery();
  const locations = locationsQueryData.data || [];

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string | number; name: string }) => productsApi.updateCategory(String(payload.id), { name: payload.name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditingCategory(null);
      setEditError('');
    },
    onError: (err) => {
      setEditError(getErrorMessage(err, 'حدث خطأ أثناء تعديل القسم'));
    }
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => productsApi.createCategory({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsCreatingCategory(false);
      setNewCategoryName('');
      setEditError('');
    },
    onError: (err) => {
      setEditError(getErrorMessage(err, 'حدث خطأ أثناء إضافة القسم'));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => productsApi.deleteCategory(String(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDeletingCategory(null);
    }
  });

  const transferWarehouseMutation = useMutation({
    mutationFn: (payload: { categoryId: number; fromLocationId: number; toLocationId: number }) => 
      inventoryApi.internalTransferCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-all'] });
      setTransferringWarehouseCategory(null);
      setFromLocationId('');
      setToLocationId('');
      setEditError('');
    },
    onError: (err) => {
      setEditError(getErrorMessage(err, 'حدث خطأ أثناء نقل الأرصدة للمخزن الجديد'));
    }
  });

  const transferMutation = useMutation({
    mutationFn: (payload: { id: string | number; targetCategoryId: string; productIds?: number[] }) => 
      productsApi.transferCategory(String(payload.id), { targetCategoryId: Number(payload.targetCategoryId), productIds: payload.productIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-all'] });
      setTransferringCategory(null);
      setTargetCategoryId('');
      setSelectedProductIds(new Set());
      setEditError('');
    },
    onError: (err) => {
      setEditError(getErrorMessage(err, 'حدث خطأ أثناء نقل الأصناف'));
    }
  });

  const handleSave = () => {
    if (!editingCategory) return;
    const name = editingCategory.name.trim();
    if (!name) {
      setEditError('الاسم مطلوب');
      return;
    }
    updateMutation.mutate({ id: editingCategory.id, name });
  };

  const handleCreate = () => {
    const name = newCategoryName.trim();
    if (!name) {
      setEditError('الاسم مطلوب');
      return;
    }
    createMutation.mutate(name);
  };

  const toggleProductSelection = (productId: number) => {
    const next = new Set(selectedProductIds);
    if (next.has(productId)) next.delete(productId);
    else next.add(productId);
    setSelectedProductIds(next);
  };

  const toggleAllProducts = () => {
    if (selectedProductIds.size === categoryProducts.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(categoryProducts.map((p) => Number(p.id))));
    }
  };

  return (
    <div className="page-stack page-shell product-categories-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '60px', maxWidth: '1280px' }}>
        <PageHeader 
          title="أقسام وتصنيفات الأصناف"
          description="إدارة وتعديل تصنيفات الأصناف، نقل المنتجات جماعياً، ومناقلة أرصدة الأقسام بين المخازن"
          actions={(
            <div className="actions compact-actions page-header-actions">
              <Button variant="primary" onClick={() => {
                setIsCreatingCategory(true);
                setNewCategoryName('');
                setEditError('');
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginInlineEnd: 6 }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                إضافة قسم جديد
              </Button>
            </div>
          )}
        />

        <StatsGrid items={statsItems} className="stats-grid compact-grid grid-cols-4" />

        {/* Search Toolbar */}
        <div style={{
          background: '#ffffff',
          border: '1px solid var(--border, #e2e8f0)',
          borderRadius: '12px',
          padding: '12px 18px',
          marginBottom: '16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)',
        }}>
          <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم في الأقسام..."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border, #cbd5e1)',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            إجمالي الأقسام المعروضة: <strong style={{ color: '#0f172a' }}>{filteredCategories.length}</strong> قسم
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid var(--border, #e2e8f0)', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)' }}>
          <CategoriesDataTable
            categories={filteredCategories}
            isLoading={categoriesQuery.isLoading}
            onEdit={(row) => {
              setEditingCategory({ id: row.id, name: row.name });
              setEditError('');
            }}
            onTransferProducts={(row) => {
              setTransferringCategory({ id: row.id, name: row.name });
              setTargetCategoryId('');
              setSelectedProductIds(new Set());
              setEditError('');
            }}
            onTransferWarehouse={(row) => {
              setTransferringWarehouseCategory({ id: row.id, name: row.name });
              setFromLocationId('');
              setToLocationId('');
              setEditError('');
            }}
            onDelete={(row) => setDeletingCategory({ id: row.id, name: row.name })}
          />
        </div>

        {/* Edit Modal */}
        <CategoryFormModal
          isOpen={!!editingCategory}
          title="تعديل اسم القسم"
          name={editingCategory?.name || ''}
          setName={(val) => setEditingCategory(c => c ? { ...c, name: val } : null)}
          error={editError}
          isPending={updateMutation.isPending}
          onClose={() => setEditingCategory(null)}
          onSubmit={handleSave}
          submitLabel="حفظ التعديل"
        />

        {/* Create Modal */}
        <CategoryFormModal
          isOpen={isCreatingCategory}
          title="إضافة قسم جديد"
          name={newCategoryName}
          setName={setNewCategoryName}
          error={editError}
          isPending={createMutation.isPending}
          onClose={() => setIsCreatingCategory(false)}
          onSubmit={handleCreate}
          submitLabel="إضافة القسم"
        />

        {/* Transfer Products Modal */}
        <CategoryTransferProductsModal
          category={transferringCategory}
          categories={categories}
          categoryProducts={categoryProducts}
          selectedProductIds={selectedProductIds}
          targetCategoryId={targetCategoryId}
          setTargetCategoryId={setTargetCategoryId}
          toggleProductSelection={toggleProductSelection}
          toggleAllProducts={toggleAllProducts}
          isLoadingProducts={productsQuery.isLoading}
          isPending={transferMutation.isPending}
          error={editError}
          onClose={() => setTransferringCategory(null)}
          onSubmit={() => transferMutation.mutate({ 
            id: transferringCategory!.id, 
            targetCategoryId,
            productIds: selectedProductIds.size > 0 ? Array.from(selectedProductIds) : undefined
          })}
        />

        {/* Transfer Warehouse Modal */}
        <CategoryTransferWarehouseModal
          category={transferringWarehouseCategory}
          locations={locations}
          fromLocationId={fromLocationId}
          toLocationId={toLocationId}
          setFromLocationId={setFromLocationId}
          setToLocationId={setToLocationId}
          isPending={transferWarehouseMutation.isPending}
          error={editError}
          onClose={() => setTransferringWarehouseCategory(null)}
          onSubmit={() => {
            transferWarehouseMutation.mutate({
              categoryId: Number(transferringWarehouseCategory!.id),
              fromLocationId: Number(fromLocationId),
              toLocationId: Number(toLocationId)
            });
          }}
        />

        {deletingCategory && (
          <ActionConfirmDialog
            open={true}
            title="حذف قسم"
            description={`هل أنت متأكد من حذف قسم "${deletingCategory.name}"؟`}
            confirmLabel="حذف"
            confirmVariant="danger"
            isBusy={deleteMutation.isPending}
            onConfirm={async () => {
              await deleteMutation.mutateAsync(deletingCategory.id);
            }}
            onCancel={() => setDeletingCategory(null)}
          />
        )}
      </main>
    </div>
  );
}
