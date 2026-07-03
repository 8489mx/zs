import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { Field } from '@/shared/ui/field';
import { productsApi } from '@/features/products/api/products.api';
import { getErrorMessage } from '@/lib/errors';
import { DialogShell } from '@/shared/components/dialog-shell';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import { inventoryApi } from '@/features/inventory/api/inventory.api';
import { useLocationsQuery } from '@/shared/hooks/use-catalog-queries';

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

  const filteredCategories = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return categories;
    return categories.filter(c => (c.name || '').toLowerCase().includes(s));
  }, [categories, search]);

  const categoryProducts = useMemo(() => {
    if (!transferringCategory) return [];
    return products.filter(p => String(p.categoryId) === String(transferringCategory.id));
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
      setSelectedProductIds(new Set(categoryProducts.map(p => Number(p.id))));
    }
  };

  return (
    <div className="page-shell document-prototype-shell purchase-new-prototype" dir="rtl">
      <div className="purchase-prototype-sticky-stack">
        <div className="purchase-prototype-document-surface">
          <div className="document-prototype-topbar">
            <div>
              <h2 className="document-prototype-topbar-title">أقسام المنتجات</h2>
              <div className="muted small">إدارة وتعديل أسماء أقسام المنتجات التي تمت إضافتها للنظام.</div>
            </div>
            <div className="actions compact-actions">
              <Button onClick={() => {
                setIsCreatingCategory(true);
                setNewCategoryName('');
                setEditError('');
              }}>إضافة قسم جديد</Button>
            </div>
          </div>
        </div>
      </div>
      
      <main className="document-prototype-column">
        <FormSection title="الأقسام" description="تصفح جميع الأقسام المتاحة أو ابحث للوصول السريع، وقم بإدارة المنتجات داخلها.">
          <div className="form-grid single-col" style={{ marginBottom: 16 }}>
            <label className="field">
              <input 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث في الأقسام..."
              />
            </label>
          </div>

          {categoriesQuery.isLoading ? (
            <div className="muted">جاري التحميل...</div>
          ) : filteredCategories.length > 0 ? (
            <DataTable
              rows={filteredCategories}
              rowKey={(r) => String(r.id)}
              density="compact"
              columns={[
                {
                  key: 'name',
                  header: 'اسم القسم',
                  cell: (row) => <strong>{row.name}</strong>
                },
                {
                  key: 'productCount',
                  header: 'عدد الأصناف',
                  cell: (row) => <span className="nav-pill" style={{ display: 'inline-block' }}>{row.productCount || 0}</span>
                },
                {
                  key: 'actions',
                  header: '',
                  cell: (row) => (
                    <div style={{ textAlign: 'left', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <Button 
                        variant="secondary" 
                        onClick={() => {
                          setEditingCategory({ id: row.id, name: row.name });
                          setEditError('');
                        }}
                        title="تعديل الاسم"
                      >
                        تعديل
                      </Button>
                      {(row.productCount || 0) > 0 ? (
                          <>
                            <Button 
                              variant="secondary" 
                              onClick={() => {
                                setTransferringCategory({ id: row.id, name: row.name });
                                setTargetCategoryId('');
                                setSelectedProductIds(new Set());
                                setEditError('');
                              }}
                              title="نقل الأصناف لقسم آخر"
                            >
                              نقل الأصناف
                            </Button>
                            <Button 
                              variant="secondary" 
                              onClick={() => {
                                setTransferringWarehouseCategory({ id: row.id, name: row.name });
                                setFromLocationId('');
                                setToLocationId('');
                                setEditError('');
                              }}
                              title="نقل أرصدة القسم لمخزن آخر"
                            >
                              نقل المخزن
                            </Button>
                          </>
                      ) : (
                        <Button 
                          variant="secondary" 
                          onClick={() => setDeletingCategory({ id: row.id, name: row.name })}
                          title="حذف القسم"
                          style={{ color: 'var(--text-danger)' }}
                        >
                          حذف
                        </Button>
                      )}
                    </div>
                  )
                }
              ]}
            />
          ) : (
            <div className="muted">لا توجد أقسام متطابقة مع البحث.</div>
          )}
        </FormSection>
      </main>

      {editingCategory && (
        <DialogShell 
          open={true} 
          onClose={() => setEditingCategory(null)}
          width="400px"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>تعديل اسم القسم</h3>
            <button className="icon-btn" onClick={() => setEditingCategory(null)} aria-label="إغلاق" style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>✕</button>
          </div>
          <div className="form-grid single-col" style={{ padding: '24px' }}>
            <Field label="اسم القسم">
              <input 
                value={editingCategory.name} 
                onChange={(e) => setEditingCategory(c => c ? { ...c, name: e.target.value } : null)}
                placeholder="أدخل اسم القسم الجديد"
                autoFocus
              />
            </Field>
            {editError && <div className="error-box">{editError}</div>}
          </div>
          <div className="actions compact-actions" style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: 'var(--bg-muted)' }}>
            <Button variant="secondary" onClick={() => setEditingCategory(null)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديل'}
            </Button>
          </div>
        </DialogShell>
      )}

      {isCreatingCategory && (
        <DialogShell 
          open={true} 
          onClose={() => setIsCreatingCategory(false)}
          width="400px"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>إضافة قسم جديد</h3>
            <button className="icon-btn" onClick={() => setIsCreatingCategory(false)} aria-label="إغلاق" style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>✕</button>
          </div>
          <div className="form-grid single-col" style={{ padding: '24px' }}>
            <Field label="اسم القسم">
              <input 
                value={newCategoryName} 
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="أدخل اسم القسم الجديد"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                }}
              />
            </Field>
            {editError && <div className="error-box">{editError}</div>}
          </div>
          <div className="actions compact-actions" style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: 'var(--bg-muted)' }}>
            <Button variant="secondary" onClick={() => setIsCreatingCategory(false)}>إلغاء</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'جاري الإضافة...' : 'إضافة'}
            </Button>
          </div>
        </DialogShell>
      )}

      {transferringCategory && (
        <DialogShell 
          open={true} 
          onClose={() => setTransferringCategory(null)}
          width="500px"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>نقل أصناف القسم</h3>
            <button className="icon-btn" onClick={() => setTransferringCategory(null)} aria-label="إغلاق" style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '32px 24px', backgroundColor: 'var(--surface-color)' }}>
            <div style={{ padding: '16px', backgroundColor: 'var(--blue-50)', color: 'var(--blue-800)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 5.072 10.5 5c1.333-.2 2.667-.2 4 0l.5.072m-4 13.856L10.5 19c1.333.2 2.667.2 4 0l.5-.072m-9.5-4.428L5 14c-.2-1.333-.2-2.667 0-4l.072-.5m13.856 4.5L19 14c.2-1.333.2-2.667 0-4l-.072-.5m-3.5 1.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>
              <div>
                <strong style={{ display: 'block', marginBottom: '4px' }}>نقل أصناف لقسم آخر</strong>
                <span className="small">يمكنك نقل كل أصناف قسم "{transferringCategory.name}" أو اختيار أصناف محددة لنقلها إلى القسم الوجهة.</span>
              </div>
            </div>
            
            <Field label="القسم الوجهة">
              <select 
                value={targetCategoryId} 
                onChange={(e) => setTargetCategoryId(e.target.value)}
                className="purchase-prototype-field-input"
                style={{ width: '100%' }}
              >
                <option value="">اختر القسم الوجهة...</option>
                {categories.filter(c => c.id !== transferringCategory.id).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>

            <div style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, backgroundColor: 'var(--bg-muted)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                  <strong style={{ fontSize: '0.95rem' }}>تحديد الأصناف للنقل</strong>
                  <span className="muted" style={{ fontSize: '0.85rem' }}>
                    {selectedProductIds.size === 0 
                      ? 'إذا لم تحدد، سيتم نقل جميع أصناف القسم.' 
                      : `تم تحديد ${selectedProductIds.size} من أصل ${categoryProducts.length} صنف.`}
                  </span>
                </div>
                <Button 
                  variant={selectedProductIds.size === categoryProducts.length && categoryProducts.length > 0 ? 'secondary' : 'secondary'} 
                  onClick={toggleAllProducts}
                  disabled={productsQuery.isLoading || categoryProducts.length === 0}
                  style={{ padding: '6px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                >
                  {selectedProductIds.size === categoryProducts.length && categoryProducts.length > 0 ? 'إلغاء التحديد' : 'تحديد الكل'}
                </Button>
              </div>
              
              <div style={{ maxHeight: '260px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--card-bg, #fff)' }}>
                {productsQuery.isLoading ? (
                  <div className="muted small" style={{ textAlign: 'center', padding: '32px' }}>جاري تحميل الأصناف...</div>
                ) : categoryProducts.length === 0 ? (
                  <div className="muted small" style={{ textAlign: 'center', padding: '32px' }}>لا توجد أصناف في هذا القسم.</div>
                ) : (
                  categoryProducts.map((p, index) => {
                    const isSelected = selectedProductIds.has(Number(p.id));
                    return (
                      <label 
                        key={p.id} 
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'row',
                          alignItems: 'center', 
                          justifyContent: 'flex-start',
                          gap: '12px', 
                          padding: '12px 16px', 
                          cursor: 'pointer', 
                          borderBottom: index < categoryProducts.length - 1 ? '1px solid var(--border-light)' : 'none',
                          margin: 0,
                          backgroundColor: isSelected ? 'var(--blue-50)' : 'transparent',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        <input 
                          type="checkbox" 
                          checked={isSelected} 
                          onChange={() => toggleProductSelection(Number(p.id))}
                          style={{ margin: 0, width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                          <span style={{ fontWeight: 500, fontSize: '0.95rem', color: isSelected ? 'var(--blue-700)' : 'inherit' }}>{p.name}</span>
                          {p.barcode && <span className="muted" style={{ fontSize: '0.8rem' }}>{p.barcode}</span>}
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {editError && <div className="error-box">{editError}</div>}
          </div>
          <div className="actions compact-actions" style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: 'var(--bg-muted)' }}>
            <Button variant="secondary" onClick={() => setTransferringCategory(null)}>إلغاء</Button>
            <Button 
              onClick={() => transferMutation.mutate({ 
                id: transferringCategory.id, 
                targetCategoryId,
                productIds: selectedProductIds.size > 0 ? Array.from(selectedProductIds) : undefined
              })} 
              disabled={!targetCategoryId || transferMutation.isPending}
            >
              {transferMutation.isPending ? 'جاري النقل...' : 'نقل الأصناف'}
            </Button>
          </div>
        </DialogShell>
      )}

      {transferringWarehouseCategory && (
        <DialogShell
          open={true}
          onClose={() => setTransferringWarehouseCategory(null)}
          width="500px"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>نقل أرصدة القسم: {transferringWarehouseCategory.name}</h3>
            <button className="icon-btn" onClick={() => setTransferringWarehouseCategory(null)} aria-label="إغلاق" style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '32px 24px', backgroundColor: 'var(--surface-color)' }}>
            <div style={{ padding: '16px', backgroundColor: 'var(--blue-50)', color: 'var(--blue-800)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 5.072 10.5 5c1.333-.2 2.667-.2 4 0l.5.072m-4 13.856L10.5 19c1.333.2 2.667.2 4 0l.5-.072m-9.5-4.428L5 14c-.2-1.333-.2-2.667 0-4l.072-.5m13.856 4.5L19 14c.2-1.333.2-2.667 0-4l-.072-.5m-3.5 1.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>
              <div>
                <strong style={{ display: 'block', marginBottom: '4px' }}>نقل أرصدة قسم لمخزن آخر</strong>
                <span className="small">هذا الإجراء سيقوم بإنشاء طلب نقل لجميع أرصدة منتجات هذا القسم من المخزن الحالي إلى المخزن الجديد.</span>
              </div>
            </div>
            <Field label="من المخزن">
              <select
                value={fromLocationId}
                onChange={(e) => setFromLocationId(e.target.value)}
                className="purchase-prototype-field-input"
                style={{ width: '100%' }}
              >
                <option value="">اختر المخزن المحول منه...</option>
                {locations?.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </Field>
            <Field label="إلى المخزن">
              <select
                value={toLocationId}
                onChange={(e) => setToLocationId(e.target.value)}
                className="purchase-prototype-field-input"
                style={{ width: '100%' }}
              >
                <option value="">اختر المخزن المحول إليه...</option>
                {locations?.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </Field>

            {editError && <div className="error-message" style={{ color: 'var(--text-danger)', marginTop: '16px', padding: '12px', backgroundColor: 'var(--danger-50)', borderRadius: '6px' }}>{editError}</div>}
          </div>
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: 'var(--bg-muted)' }}>
            <Button variant="secondary" onClick={() => setTransferringWarehouseCategory(null)} style={{ padding: '0 24px' }}>إلغاء</Button>
            <Button 
              variant="primary" 
              disabled={!fromLocationId || !toLocationId || fromLocationId === toLocationId || transferWarehouseMutation.isPending}
              onClick={() => {
                transferWarehouseMutation.mutate({
                  categoryId: Number(transferringWarehouseCategory.id),
                  fromLocationId: Number(fromLocationId),
                  toLocationId: Number(toLocationId)
                });
              }}
            >
              {transferWarehouseMutation.isPending ? 'جاري النقل...' : 'تأكيد النقل'}
            </Button>
          </div>
        </DialogShell>
      )}

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
    </div>
  );
}
