import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { Field } from '@/shared/ui/field';
import { DialogShell } from '@/shared/components/dialog-shell';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import { getErrorMessage } from '@/lib/errors';
import { settingsApi } from '@/features/settings/api/settings.api';
import { inventoryApi } from '@/features/inventory/api/inventory.api';
import { useAppToolbar } from '@/stores/toolbar-store';
import type { Location } from '@/types/domain';

export function AdvancedLocationsManagementPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);
  const [formState, setFormState] = useState({ name: '', address: '' });
  const [editError, setEditError] = useState('');

  // Accordion state
  const [expandedLocationIds, setExpandedLocationIds] = useState<Set<string>>(new Set());

  // Transfer Modals State
  const [transferringCategory, setTransferringCategory] = useState<{ locationId: string, categoryId: string, categoryName: string } | null>(null);
  const [targetLocationId, setTargetLocationId] = useState('');
  
  const [transferringProducts, setTransferringProducts] = useState<{ locationId: string, categoryId: string, categoryName: string } | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [productsTargetLocationId, setProductsTargetLocationId] = useState('');

  useAppToolbar([{ label: 'المخازن', path: '/inventory/warehouses' }, { label: 'إدارة المخازن المتقدمة' }]);

  const overviewQuery = useQuery({ queryKey: ['advanced-overview'], queryFn: inventoryApi.advancedOverview });
  const locationsQuery = useQuery({ queryKey: ['locations'], queryFn: settingsApi.locations });
  
  const rawOverview = overviewQuery.data?.locations || [];
  const locations = locationsQuery.data || [];

  // Data for Group Transfer Modal
  const categoryProductsQuery = useQuery({
    queryKey: ['location-category-products', transferringProducts?.locationId, transferringProducts?.categoryId],
    queryFn: () => inventoryApi.locationCategoryProducts(Number(transferringProducts!.locationId), transferringProducts!.categoryId),
    enabled: !!transferringProducts
  });

  const filteredOverview = useMemo(() => {
    if (!search.trim()) return rawOverview;
    const s = search.trim().toLowerCase();
    return rawOverview.filter((loc: any) => loc.name.toLowerCase().includes(s) || loc.categories.some((c: any) => c.name.toLowerCase().includes(s)));
  }, [rawOverview, search]);

  const toggleLocation = (id: string) => {
    setExpandedLocationIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const createMutation = useMutation({
    mutationFn: (payload: Location) => settingsApi.createLocation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['advanced-overview'] });
      setIsCreating(false);
      setFormState({ name: '', address: '' });
      setEditError('');
    },
    onError: (err) => setEditError(getErrorMessage(err, 'حدث خطأ أثناء إضافة المخزن'))
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Location) => settingsApi.updateLocation(String(payload.id), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['advanced-overview'] });
      setEditingLocation(null);
      setEditError('');
    },
    onError: (err) => setEditError(getErrorMessage(err, 'حدث خطأ أثناء تعديل المخزن'))
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => settingsApi.deleteLocation(String(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['advanced-overview'] });
      setDeletingLocation(null);
    }
  });

  const transferCategoryMutation = useMutation({
    mutationFn: (payload: { categoryId: number; fromLocationId: number; toLocationId: number }) => inventoryApi.internalTransferCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advanced-overview'] });
      queryClient.invalidateQueries({ queryKey: ['location-category-products'] });
      setTransferringCategory(null);
      setTargetLocationId('');
    },
    onError: (err) => setEditError(getErrorMessage(err, 'فشل نقل القسم'))
  });

  const transferProductsMutation = useMutation({
    mutationFn: (payload: any) => inventoryApi.internalTransferProducts(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advanced-overview'] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['location-category-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-all'] });
      queryClient.invalidateQueries({ queryKey: ['location-stocks'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setTransferringProducts(null);
      setSelectedProductIds(new Set());
      setProductsTargetLocationId('');
    },
    onError: (err) => setEditError(getErrorMessage(err, 'فشل نقل الأصناف'))
  });

  const handleSaveLocation = () => {
    if (!formState.name.trim()) {
      setEditError('اسم المخزن مطلوب');
      return;
    }
    
    if (editingLocation) {
      updateMutation.mutate({ ...editingLocation, name: formState.name });
    } else {
      createMutation.mutate({ name: formState.name, branchId: '' } as unknown as Location);
    }
  };

  const submitCategoryTransfer = () => {
    if (!transferringCategory || !targetLocationId) return;
    transferCategoryMutation.mutate({
      categoryId: Number(transferringCategory.categoryId),
      fromLocationId: Number(transferringCategory.locationId),
      toLocationId: Number(targetLocationId)
    });
  };

  const submitProductsTransfer = () => {
    if (!transferringProducts || !productsTargetLocationId || selectedProductIds.size === 0) return;
    const products = categoryProductsQuery.data || [];
    const items = products
      .filter((p: any) => selectedProductIds.has(p.id))
      .map((p: any) => ({ productId: Number(p.id), qty: Number(p.stockQty) }));
      
    if (items.length === 0) return;

    transferProductsMutation.mutate({
      fromLocationId: Number(transferringProducts.locationId),
      toLocationId: Number(productsTargetLocationId),
      note: `نقل مجموعة أصناف من قسم ${transferringProducts.categoryName}`,
      items
    });
  };

  return (
    <div className="page-shell document-prototype-shell purchase-new-prototype" dir="rtl">
      <div className="purchase-prototype-sticky-stack">
        <div className="purchase-prototype-document-surface">
          <div className="document-prototype-topbar">
            <div>
              <h2 className="document-prototype-topbar-title">إدارة المخازن المتقدمة</h2>
              <div className="muted small">نظرة شاملة وإدارة لأرصدة الأقسام والأصناف عبر جميع المخازن.</div>
            </div>
            <div className="actions compact-actions">
              <Button onClick={() => {
                setFormState({ name: '', address: '' });
                setIsCreating(true);
                setEditError('');
              }}>إضافة مخزن جديد</Button>
            </div>
          </div>
        </div>
      </div>
      
      <main className="document-prototype-column">
        <FormSection title="اللوحة الاستراتيجية (Helicopter View)" description="استعرض جميع المخازن والأقسام بداخلها وقم بإجراء النقل الجماعي للأرصدة.">
          <div className="form-grid single-col" style={{ marginBottom: 16 }}>
            <label className="field">
              <input 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن مخزن أو قسم..."
              />
            </label>
          </div>

          {overviewQuery.isLoading ? (
            <div className="muted">جاري تحميل البيانات الشاملة...</div>
          ) : filteredOverview.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredOverview.map((loc: any) => {
                const isExpanded = expandedLocationIds.has(loc.id);
                const rawLoc = locations.find(l => String(l.id) === String(loc.id));
                return (
                  <div key={loc.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)' }}>
                    <div 
                      onClick={() => toggleLocation(loc.id)}
                      style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'var(--table-header-bg)', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                        <strong>{loc.name}</strong>
                        <span className="muted small">({loc.categories.length} قسم نشط)</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                        <Button 
                          variant="secondary"
                          onClick={() => {
                            setFormState({ name: rawLoc?.name || loc.name, address: '' });
                            setEditingLocation(rawLoc || loc);
                            setEditError('');
                          }}
                        >
                          تعديل
                        </Button>
                        <Button 
                          variant="secondary"
                          onClick={() => setDeletingLocation(rawLoc || loc)}
                          style={{ color: 'var(--text-danger)' }}
                        >
                          حذف
                        </Button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
                        {loc.categories.length === 0 ? (
                          <div className="muted small">لا توجد أصناف بأرصدة في هذا المخزن.</div>
                        ) : (
                          <DataTable
                            rows={loc.categories}
                            rowKey={(r: any) => String(r.id)}
                            density="compact"
                            columns={[
                              { key: 'name', header: 'القسم', cell: (row: any) => <strong>{row.name}</strong> },
                              { key: 'productCount', header: 'عدد الأصناف المتاحة', cell: (row: any) => <span className="nav-pill">{row.productCount}</span> },
                              {
                                key: 'actions',
                                header: '',
                                cell: (row: any) => (
                                  <div style={{ textAlign: 'left', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                    <Button 
                                      variant="secondary" 
                                      title="نقل أرصدة مجموعة محددة من الأصناف"
                                      onClick={() => {
                                        setTransferringProducts({ locationId: loc.id, categoryId: String(row.id), categoryName: row.name });
                                        setSelectedProductIds(new Set());
                                        setProductsTargetLocationId('');
                                      }}
                                    >
                                      نقل أصناف محددة
                                    </Button>
                                    <Button 
                                      variant="secondary" 
                                      title="نقل أرصدة جميع أصناف القسم"
                                      onClick={() => {
                                        setTransferringCategory({ locationId: loc.id, categoryId: String(row.id), categoryName: row.name });
                                        setTargetLocationId('');
                                      }}
                                    >
                                      نقل كل القسم
                                    </Button>
                                  </div>
                                )
                              }
                            ]}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="muted">لا توجد بيانات מתطابقة.</div>
          )}
        </FormSection>
      </main>

      {(isCreating || editingLocation) && (
        <DialogShell 
          open={true} 
          onClose={() => { setIsCreating(false); setEditingLocation(null); }}
          width="400px"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{editingLocation ? 'تعديل المخزن' : 'إضافة مخزن جديد'}</h3>
            <button className="icon-btn" onClick={() => { setIsCreating(false); setEditingLocation(null); }} aria-label="إغلاق">✕</button>
          </div>
          <div className="form-grid single-col" style={{ padding: '24px' }}>
            <Field label="اسم المخزن">
              <input 
                value={formState.name} 
                onChange={(e) => setFormState(s => ({ ...s, name: e.target.value }))}
                placeholder="أدخل اسم المخزن (مثال: المخزن الرئيسي)"
                autoFocus
              />
            </Field>
            <Field label="العنوان (اختياري)">
              <input 
                value={formState.address} 
                onChange={(e) => setFormState(s => ({ ...s, address: e.target.value }))}
                placeholder="أدخل تفاصيل أو عنوان المخزن"
              />
            </Field>
            {editError && <div className="error-message" style={{ color: 'var(--text-danger)' }}>{editError}</div>}
          </div>
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="secondary" onClick={() => { setIsCreating(false); setEditingLocation(null); }}>إلغاء</Button>
            <Button variant="primary" disabled={!formState.name.trim() || createMutation.isPending || updateMutation.isPending} onClick={handleSaveLocation}>
              {editingLocation ? 'حفظ التعديلات' : 'إضافة'}
            </Button>
          </div>
        </DialogShell>
      )}

      {deletingLocation && (
        <ActionConfirmDialog
          open={true}
          title="تأكيد الحذف"
          description={`هل أنت متأكد من حذف المخزن "${deletingLocation.name}"؟ لا يمكن التراجع.`}
          confirmLabel="حذف المخزن"
          cancelLabel="إلغاء"
          onConfirm={() => deleteMutation.mutate(String(deletingLocation.id))}
          onCancel={() => setDeletingLocation(null)}
        />
      )}

      {/* Full Category Transfer Modal */}
      {transferringCategory && (
        <DialogShell 
          open={true} 
          onClose={() => setTransferringCategory(null)}
          width="400px"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>نقل قسم كامل</h3>
            <button className="icon-btn" onClick={() => setTransferringCategory(null)} aria-label="إغلاق">✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '32px 24px', backgroundColor: 'var(--surface-color)' }}>
            <div style={{ padding: '16px', backgroundColor: 'var(--blue-50)', color: 'var(--blue-800)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 5.072 10.5 5c1.333-.2 2.667-.2 4 0l.5.072m-4 13.856L10.5 19c1.333.2 2.667.2 4 0l.5-.072m-9.5-4.428L5 14c-.2-1.333-.2-2.667 0-4l.072-.5m13.856 4.5L19 14c.2-1.333.2-2.667 0-4l-.072-.5m-3.5 1.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>
              <div>
                <strong style={{ display: 'block', marginBottom: '4px' }}>تنبيه نقل الأرصدة</strong>
                <span className="small">سيتم نقل أرصدة قسم <strong>{transferringCategory.categoryName}</strong> بالكامل إلى المخزن المحدد أدناه.</span>
              </div>
            </div>
            <Field label="نقل إلى مخزن">
              <select className="purchase-prototype-field-input" value={targetLocationId} onChange={(e) => setTargetLocationId(e.target.value)} style={{ width: '100%' }}>
                <option value="">-- اختر المخزن الهدف --</option>
                {locations.filter(l => String(l.id) !== transferringCategory.locationId).map((l: any) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </Field>
            {editError && <div className="error-message" style={{ color: 'var(--text-danger)', marginTop: '16px', padding: '12px', backgroundColor: 'var(--danger-50)', borderRadius: '6px' }}>{editError}</div>}
          </div>
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: 'var(--bg-muted)' }}>
            <Button variant="secondary" onClick={() => setTransferringCategory(null)} style={{ padding: '0 24px' }}>إلغاء</Button>
            <Button variant="primary" disabled={!targetLocationId || transferCategoryMutation.isPending} onClick={submitCategoryTransfer} style={{ padding: '0 24px' }}>
              تأكيد النقل
            </Button>
          </div>
        </DialogShell>
      )}

      {/* Selective Products Transfer Modal */}
      {transferringProducts && (
        <DialogShell 
          open={true} 
          onClose={() => setTransferringProducts(null)}
          width="500px"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>نقل أصناف محددة من ({transferringProducts.categoryName})</h3>
            <button className="icon-btn" onClick={() => setTransferringProducts(null)} aria-label="إغلاق">✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px', backgroundColor: 'var(--surface-color)' }}>
            <Field label="نقل إلى مخزن">
              <select className="purchase-prototype-field-input" value={productsTargetLocationId} onChange={(e) => setProductsTargetLocationId(e.target.value)} style={{ width: '100%' }}>
                <option value="">-- اختر المخزن الهدف --</option>
                {locations.filter(l => String(l.id) !== transferringProducts.locationId).map((l: any) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </Field>

            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, backgroundColor: 'var(--bg-muted)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                  <strong style={{ fontSize: '0.95rem' }}>تحديد الأصناف للنقل</strong>
                  <span className="muted" style={{ fontSize: '0.85rem' }}>اختر الأصناف المراد نقل أرصدتها</span>
                </div>
                {categoryProductsQuery.data && ((categoryProductsQuery.data as any[]).filter(p => Number(p.stockQty) > 0).length > 0) && (
                  <Button 
                    variant="secondary" 
                    type="button"
                    style={{ fontSize: '0.85rem', padding: '4px 12px', height: '32px' }}
                    onClick={() => {
                      const validProducts = ((categoryProductsQuery.data || []) as any[]).filter(p => Number(p.stockQty) > 0);
                      if (selectedProductIds.size === validProducts.length) {
                        setSelectedProductIds(new Set());
                      } else {
                        setSelectedProductIds(new Set(validProducts.map(p => p.id)));
                      }
                    }}
                  >
                    {selectedProductIds.size === ((categoryProductsQuery.data || []) as any[]).filter(p => Number(p.stockQty) > 0).length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                  </Button>
                )}
              </div>

              {categoryProductsQuery.isLoading ? (
                <div className="muted small" style={{ padding: '24px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: '8px' }}>جاري تحميل الأصناف...</div>
              ) : (
                <div style={{ border: '1px solid var(--border)', borderRadius: '8px', maxHeight: '300px', overflowY: 'auto', backgroundColor: 'var(--card-bg, #fff)' }}>
                  {((categoryProductsQuery.data || []) as any[]).filter(p => Number(p.stockQty) > 0).map((p: any, index: number, arr: any[]) => {
                    const isSelected = selectedProductIds.has(p.id);
                    return (
                      <label key={p.id} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '12px 16px', borderBottom: index < arr.length - 1 ? '1px solid var(--border-light)' : 'none', backgroundColor: isSelected ? 'var(--blue-50)' : 'transparent', transition: 'background-color 0.2s', cursor: 'pointer', gap: '12px' }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <input 
                            type="checkbox" 
                            style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--primary-color)' }}
                            checked={isSelected}
                            onChange={(e) => {
                              const next = new Set(selectedProductIds);
                              if (e.target.checked) next.add(p.id);
                              else next.delete(p.id);
                              setSelectedProductIds(next);
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                          <strong style={{ fontSize: '0.95rem', color: isSelected ? 'var(--blue-900)' : 'var(--text-primary)' }}>{p.name}</strong>
                          <span className="muted" style={{ fontSize: '0.85rem' }}>الرصيد المتاح: <strong style={{ color: 'var(--primary-color)' }}>{p.stockQty}</strong></span>
                        </div>
                      </label>
                    );
                  })}
                  {((categoryProductsQuery.data || []) as any[]).filter(p => Number(p.stockQty) > 0).length === 0 && (
                    <div className="muted small" style={{ padding: '32px 16px', textAlign: 'center' }}>لا يوجد أصناف بأرصدة إيجابية في هذا القسم لنقلها.</div>
                  )}
                </div>
              )}
            </div>
            {editError && <div className="error-message" style={{ color: 'var(--text-danger)', marginTop: '16px', padding: '12px', backgroundColor: 'var(--danger-50)', borderRadius: '6px' }}>{editError}</div>}
          </div>
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: 'var(--bg-muted)' }}>
            <Button variant="secondary" onClick={() => setTransferringProducts(null)} style={{ padding: '0 24px' }}>إلغاء</Button>
            <Button variant="primary" disabled={!productsTargetLocationId || selectedProductIds.size === 0 || transferProductsMutation.isPending} onClick={submitProductsTransfer} style={{ padding: '0 24px' }}>
              تأكيد نقل ({selectedProductIds.size}) أصناف
            </Button>
          </div>
        </DialogShell>
      )}

    </div>
  );
}
