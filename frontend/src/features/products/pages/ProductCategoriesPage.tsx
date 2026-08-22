import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { StatsGrid } from '@/shared/components/stats-grid';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { Field } from '@/shared/ui/field';
import { productsApi } from '@/features/products/api/products.api';
import { getErrorMessage } from '@/lib/errors';
import { DialogShell } from '@/shared/components/dialog-shell';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import { inventoryApi } from '@/shared/api/inventory.api';
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
    <main className="document-prototype-column" style={{ paddingBottom: '60px', maxWidth: '1280px' }} dir="rtl">
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
        {categoriesQuery.isLoading ? (
          <div className="muted small" style={{ padding: 40, textAlign: 'center' }}>جاري التحميل...</div>
        ) : filteredCategories.length > 0 ? (
          <DataTable
            rows={filteredCategories}
            rowKey={(r) => String(r.id)}
            density="regular"
            columns={[
              {
                key: 'name',
                header: 'اسم القسم',
                cell: (row) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(99, 102, 241, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--primary, #170c5c)',
                      flexShrink: 0,
                    }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
                    </div>
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>{row.name}</strong>
                  </div>
                )
              },
              {
                key: 'productCount',
                header: 'عدد الأصناف',
                cell: (row) => {
                  const count = row.productCount || 0;
                  const isZero = count === 0;
                  return (
                    <span style={{
                      fontWeight: 700,
                      fontSize: '12.5px',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: isZero ? '#f1f5f9' : '#ecfdf5',
                      color: isZero ? '#64748b' : '#047857',
                      border: `1px solid ${isZero ? '#e2e8f0' : '#a7f3d0'}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      <span>{count} صنف</span>
                    </span>
                  );
                }
              },
              {
                key: 'actions',
                header: 'الإجراءات',
                cell: (row) => {
                  const hasProducts = (row.productCount || 0) > 0;
                  return (
                    <div style={{ textAlign: 'left', display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <Button 
                        variant="secondary" 
                        onClick={() => {
                          setEditingCategory({ id: row.id, name: row.name });
                          setEditError('');
                        }}
                        title="تعديل الاسم"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        تعديل
                      </Button>
                      
                      {hasProducts ? (
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
                            style={{ padding: '6px 12px', fontSize: '12px' }}
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
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                          >
                            نقل المخزن
                          </Button>
                        </>
                      ) : (
                        <Button 
                          variant="secondary" 
                          onClick={() => setDeletingCategory({ id: row.id, name: row.name })}
                          title="حذف القسم"
                          style={{ padding: '6px 12px', fontSize: '12px', color: '#dc2626', borderColor: '#fecaca', background: '#fff1f2' }}
                        >
                          حذف
                        </Button>
                      )}
                    </div>
                  );
                }
              }
            ]}
          />
        ) : (
          <div className="muted" style={{ padding: '48px 24px', textAlign: 'center', color: '#94a3b8' }}>
            لا توجد أقسام متطابقة مع البحث.
          </div>
        )}
      </div>

      {editingCategory && (
        <DialogShell 
          open={true} 
          onClose={() => setEditingCategory(null)}
          width="440px"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '18px 24px', borderBottom: '1px solid var(--border, #e2e8f0)' }}>
            <div style={{ width: 4, height: 18, backgroundColor: 'var(--primary, #170c5c)', borderRadius: 2 }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>تعديل اسم القسم</h3>
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
          <div className="actions compact-actions" style={{ padding: '16px 24px', borderTop: '1px solid var(--border, #e2e8f0)', display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: '#f8fafc' }}>
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
          width="440px"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '18px 24px', borderBottom: '1px solid var(--border, #e2e8f0)' }}>
            <div style={{ width: 4, height: 18, backgroundColor: 'var(--primary, #170c5c)', borderRadius: 2 }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>إضافة قسم جديد</h3>
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
          <div className="actions compact-actions" style={{ padding: '16px 24px', borderTop: '1px solid var(--border, #e2e8f0)', display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: '#f8fafc' }}>
            <Button variant="secondary" onClick={() => setIsCreatingCategory(false)}>إلغاء</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'جاري الإضافة...' : 'إضافة القسم'}
            </Button>
          </div>
        </DialogShell>
      )}

      {transferringCategory && (
        <DialogShell 
          open={true} 
          onClose={() => setTransferringCategory(null)}
          width="520px"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '18px 24px', borderBottom: '1px solid var(--border, #e2e8f0)' }}>
            <div style={{ width: 4, height: 18, backgroundColor: 'var(--primary, #170c5c)', borderRadius: 2 }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>نقل أصناف قسم: {transferringCategory.name}</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
            <div style={{ padding: '14px 16px', backgroundColor: '#eff6ff', color: '#1e40af', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #dbeafe' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 5.072 10.5 5c1.333-.2 2.667-.2 4 0l.5.072m-4 13.856L10.5 19c1.333.2 2.667.2 4 0l.5-.072m-9.5-4.428L5 14c-.2-1.333-.2-2.667 0-4l.072-.5m13.856 4.5L19 14c.2-1.333.2-2.667 0-4l-.072-.5m-3.5 1.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>
              <div>
                <strong style={{ display: 'block', marginBottom: '2px', fontSize: '13.5px' }}>نقل أصناف لقسم آخر</strong>
                <span className="small" style={{ fontSize: '12px', color: '#3b82f6' }}>يمكنك نقل كل أصناف هذا القسم أو تحديد أصناف معينة لنقلها.</span>
              </div>
            </div>
            
            <Field label="القسم الوجهة">
              <select 
                value={targetCategoryId} 
                onChange={(e) => setTargetCategoryId(e.target.value)}
                className="purchase-prototype-field-input"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                <option value="">اختر القسم الوجهة...</option>
                {categories.filter(c => c.id !== transferringCategory.id).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>تحديد الأصناف للنقل</strong>
                  <span className="muted" style={{ fontSize: '12px', color: '#64748b' }}>
                    {selectedProductIds.size === 0 
                      ? 'إذا لم تحدد، سيتم نقل جميع أصناف القسم.' 
                      : `تم تحديد ${selectedProductIds.size} من أصل ${categoryProducts.length} صنف.`}
                  </span>
                </div>
                <Button 
                  variant="secondary" 
                  onClick={toggleAllProducts}
                  disabled={productsQuery.isLoading || categoryProducts.length === 0}
                  style={{ padding: '4px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                >
                  {selectedProductIds.size === categoryProducts.length && categoryProducts.length > 0 ? 'إلغاء التحديد' : 'تحديد الكل'}
                </Button>
              </div>
              
              <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff' }}>
                {productsQuery.isLoading ? (
                  <div className="muted small" style={{ textAlign: 'center', padding: '24px' }}>جاري تحميل الأصناف...</div>
                ) : categoryProducts.length === 0 ? (
                  <div className="muted small" style={{ textAlign: 'center', padding: '24px' }}>لا توجد أصناف في هذا القسم.</div>
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
                          gap: '10px', 
                          padding: '10px 14px', 
                          cursor: 'pointer', 
                          borderBottom: index < categoryProducts.length - 1 ? '1px solid #f1f5f9' : 'none',
                          margin: 0,
                          backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                          transition: 'background-color 0.15s'
                        }}
                      >
                        <input 
                          type="checkbox" 
                          checked={isSelected} 
                          onChange={() => toggleProductSelection(Number(p.id))}
                          style={{ margin: 0, width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px', color: isSelected ? '#1d4ed8' : '#0f172a' }}>{p.name}</span>
                          {p.barcode && <span className="muted" style={{ fontSize: '11px', color: '#64748b' }}>{p.barcode}</span>}
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {editError && <div className="error-box">{editError}</div>}
          </div>
          <div className="actions compact-actions" style={{ padding: '16px 24px', borderTop: '1px solid var(--border, #e2e8f0)', display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: '#f8fafc' }}>
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
          width="520px"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '18px 24px', borderBottom: '1px solid var(--border, #e2e8f0)' }}>
            <div style={{ width: 4, height: 18, backgroundColor: 'var(--primary, #170c5c)', borderRadius: 2 }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>نقل أرصدة القسم: {transferringWarehouseCategory.name}</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
            <div style={{ padding: '14px 16px', backgroundColor: '#eff6ff', color: '#1e40af', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #dbeafe' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 5.072 10.5 5c1.333-.2 2.667-.2 4 0l.5.072m-4 13.856L10.5 19c1.333.2 2.667.2 4 0l.5-.072m-9.5-4.428L5 14c-.2-1.333-.2-2.667 0-4l.072-.5m13.856 4.5L19 14c.2-1.333.2-2.667 0-4l-.072-.5m-3.5 1.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>
              <div>
                <strong style={{ display: 'block', marginBottom: '2px', fontSize: '13.5px' }}>نقل أرصدة قسم لمخزن آخر</strong>
                <span className="small" style={{ fontSize: '12px', color: '#3b82f6' }}>سيتم إنشاء مناقلة لكافة أرصدة منتجات هذا القسم إلى المخزن الوجهة.</span>
              </div>
            </div>
            <Field label="من المخزن">
              <select
                value={fromLocationId}
                onChange={(e) => setFromLocationId(e.target.value)}
                className="purchase-prototype-field-input"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
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
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                <option value="">اختر المخزن المحول إليه...</option>
                {locations?.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </Field>

            {editError && <div className="error-message" style={{ color: 'var(--text-danger)', padding: '10px 14px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fee2e2' }}>{editError}</div>}
          </div>
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border, #e2e8f0)', display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: '#f8fafc' }}>
            <Button variant="secondary" onClick={() => setTransferringWarehouseCategory(null)}>إلغاء</Button>
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
    </main>
  );
}
