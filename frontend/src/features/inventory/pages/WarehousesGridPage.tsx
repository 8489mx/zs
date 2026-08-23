import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { FormSection } from '@/shared/components/form-section';
import { StatsGrid } from '@/shared/components/stats-grid';
import { Button } from '@/shared/ui/button';
import { NetworkIcon, PackageIcon } from '@/shared/components/icons/AppIcons';
import { Field } from '@/shared/ui/field';
import { DialogShell } from '@/shared/components/dialog-shell';
import { useInventoryActionCatalog } from '@/features/inventory/hooks/useInventoryActionCatalog';
import { inventoryApi } from '@/features/inventory/api/inventory.api';
import { useCreateLocationMutation, useUpdateLocationMutation, useDeleteLocationMutation } from '@/shared/hooks/use-location-mutations';
import { formatCurrency } from '@/lib/format';
import type { Location } from '@/types/domain';

function formatLocationType(type?: string) {
  if (!type) return 'مخزن نشط';
  const map: Record<string, string> = {
    internal_warehouse: 'مخزن داخلي',
    branch_stock: 'رصيد فرع (متاح للبيع)',
    store: 'محل / نقطة بيع',
    main: 'مخزن رئيسي',
    warehouse: 'مخزن',
    transit: 'مخزن ترانزيت',
    damaged: 'مخزن تالف',
  };
  return map[type] || type;
}

export function WarehousesGridPage() {
  const navigate = useNavigate();
  const { locationsQuery, branchesQuery } = useInventoryActionCatalog();
  const locations = locationsQuery.data || [];

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [branchId, setBranchId] = useState('');
  const [locationType, setLocationType] = useState<'internal_warehouse' | 'branch_stock'>('internal_warehouse');

  const createMutation = useCreateLocationMutation(() => {
    setModalOpen(false);
    locationsQuery.refetch();
  });
  const updateMutation = useUpdateLocationMutation(() => {
    setModalOpen(false);
    locationsQuery.refetch();
  });
  const deleteMutation = useDeleteLocationMutation(() => {
    locationsQuery.refetch();
  });

  const { data: overviewData, isLoading: isOverviewLoading } = useQuery({
    queryKey: ['inventory', 'advanced-overview'],
    queryFn: inventoryApi.advancedOverview,
  });

  const totalValue = overviewData?.totalGlobalValue || 0;
  const avgLocationValue = locations.length > 0 ? totalValue / locations.length : 0;
  const uniqueBranches = new Set(locations.map((loc) => loc.branchName || loc.branchId).filter(Boolean)).size;

  const stats = [
    { key: 'total_value', label: 'إجمالي قيمة المخزون (Landed Cost)', value: formatCurrency(totalValue) },
    { key: 'total_locations', label: 'إجمالي أماكن المخزون', value: locations.length },
    { key: 'unique_branches', label: 'الفروع التابعة', value: uniqueBranches || 1 },
    { key: 'avg_value', label: 'متوسط قيمة المخزن', value: formatCurrency(avgLocationValue) },
  ] as const;

  const handleEdit = (loc: Location, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLocation(loc);
    setName(loc.name);
    setCode(loc.code || '');
    setBranchId(String(loc.branchId || ''));
    setLocationType((loc as any).locationType || 'internal_warehouse');
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditingLocation(null);
    setName('');
    setCode('');
    setBranchId('');
    setLocationType('internal_warehouse');
    setModalOpen(true);
  };

  const handleDelete = async (loc: Location, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`هل أنت متأكد من حذف المخزن "${loc.name}"؟`)) return;
    deleteMutation.mutate(String(loc.id));
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLocation) {
      updateMutation.mutate({ locationId: String(editingLocation.id), values: { name, code, branchId, locationType } });
    } else {
      createMutation.mutate({ name, code, branchId, locationType });
    }
  };

  const filteredLocations = useMemo(() => {
    if (!search.trim()) return locations;
    const q = search.trim().toLowerCase();
    return locations.filter(l => 
      l.name.toLowerCase().includes(q) || 
      (l.code && l.code.toLowerCase().includes(q)) ||
      (l.branchName && l.branchName.toLowerCase().includes(q))
    );
  }, [locations, search]);

  return (
    <main className="document-prototype-column" dir="rtl" style={{ paddingBottom: '32px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
      <PageHeader 
        title="أماكن المخزون" 
        description="استعراض وإدارة أماكن التخزين والفروع ومتابعة الأرصدة والقيم المالية" 
        actions={(
          <div className="actions compact-actions page-header-actions">
            <Button 
              variant="primary"
              onClick={handleCreate}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginInlineEnd: 6 }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              إضافة مخزن جديد
            </Button>
            <Button 
              variant="secondary"
              onClick={() => navigate('/inventory/tree')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <NetworkIcon size={16} /> شجرة المخازن الشاملة
            </Button>
          </div>
        )}
      />

      <StatsGrid items={stats} className="stats-grid compact-grid grid-cols-4" />

      {/* Filter / Search Bar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid var(--border, #e2e8f0)',
        borderRadius: '12px',
        padding: '12px 18px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)',
      }}>
        <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
          <input
            type="text"
            placeholder="ابحث باسم المخزن أو الكود أو الفرع..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
          إجمالي الأماكن: <strong style={{ color: '#0f172a' }}>{filteredLocations.length}</strong>
        </div>
      </div>

      <FormSection title="قائمة أماكن المخزون">
        {locationsQuery.isLoading || isOverviewLoading ? (
          <div className="muted small" style={{ padding: 32, textAlign: 'center' }}>جاري تحميل المخازن...</div>
        ) : filteredLocations.length === 0 ? (
          <div className="muted small" style={{ padding: 32, textAlign: 'center' }}>لا توجد مخازن مطابقة للبحث</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '18px', marginTop: '14px' }}>
            {filteredLocations.map((loc) => {
              const locInfo = overviewData?.locations?.find((l: any) => String(l.id) === String(loc.id));
              const locValue = locInfo?.totalValue || 0;
              const productCount = locInfo?.categories?.reduce((sum: number, c: any) => sum + (c.productCount || 0), 0) || 0;

              return (
                <div 
                  key={loc.id} 
                  className="surface-card hoverable-card"
                  style={{ 
                    padding: '20px', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '16px',
                    border: '1px solid var(--border, #e2e8f0)',
                    borderRadius: '14px',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                    transition: 'all 0.2s ease-in-out',
                    position: 'relative',
                  }}
                  onClick={() => navigate(`/inventory/warehouses/${loc.id}`)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(99, 102, 241, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary, #170c5c)',
                      }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                          <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
                          <path d="M2 7h20"/>
                          <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
                        </svg>
                      </div>
                      <span style={{ 
                        fontSize: '11px', 
                        fontWeight: 700, 
                        padding: '3px 8px', 
                        borderRadius: '8px', 
                        backgroundColor: '#ecfdf5', 
                        color: '#047857',
                        border: '1px solid #a7f3d0'
                      }}>
                        {formatLocationType(loc.locationType)}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => handleEdit(loc, e)}
                        title="تعديل المخزن"
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          color: '#475569',
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(loc, e)}
                        title="حذف المخزن"
                        style={{
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '6px',
                          padding: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          color: '#dc2626',
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                      {loc.name}
                    </h3>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {loc.branchName ? `الفرع: ${loc.branchName}` : loc.code ? `كود المخزن: ${loc.code}` : 'موقع تخزين رئيسي'}
                    </div>
                  </div>

                  <div style={{ 
                    marginTop: 'auto', 
                    paddingTop: '14px', 
                    borderTop: '1px solid #f1f5f9', 
                    display: 'flex', 
                    alignItems: 'flex-end', 
                    justifyContent: 'space-between' 
                  }}>
                    <div>
                      <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                        <PackageIcon size={14} color="#64748b" />
                        <span>{productCount} {productCount === 1 ? 'صنف' : 'أصناف'}</span>
                      </span>
                      <strong style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary, #170c5c)' }}>
                        {formatCurrency(locValue)}
                      </strong>
                    </div>
                    <span style={{ fontSize: '12.5px', color: 'var(--primary, #170c5c)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      عرض الأصناف <span>←</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </FormSection>

      {/* Dialog for Create/Edit Location */}
      {modalOpen && (
        <DialogShell 
          open={true} 
          onClose={() => setModalOpen(false)}
          width="min(520px, 95vw)"
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{editingLocation ? 'تعديل بيانات المخزن' : 'إضافة مخزن جديد'}</h3>
          </div>
          <div style={{ padding: '20px' }}>
            <form onSubmit={onSave} className="form-grid single-col" id="location-form">
              <Field label="اسم المخزن">
                <input required value={name} onChange={(e) => setName(e.target.value)} disabled={createMutation.isPending || updateMutation.isPending} placeholder="مثال: المخزن الرئيسي" />
              </Field>
              <Field label="كود المخزن">
                <input value={code} onChange={(e) => setCode(e.target.value)} disabled={createMutation.isPending || updateMutation.isPending} placeholder="اختياري" />
              </Field>
              <Field label="الفرع المرتبط">
                <select value={branchId} onChange={(e) => setBranchId(e.target.value)} disabled={createMutation.isPending || updateMutation.isPending}>
                  <option value="">بدون ربط (فرع رئيسي)</option>
                  {(branchesQuery.data || []).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="نوع المخزن">
                <select value={locationType} onChange={(e) => setLocationType(e.target.value as 'internal_warehouse' | 'branch_stock')} disabled={createMutation.isPending || updateMutation.isPending}>
                  <option value="internal_warehouse">مخزن داخلي (لا يظهر كأرصدة فروع)</option>
                  <option value="branch_stock">رصيد فرع (متاح للبيع)</option>
                </select>
              </Field>
            </form>
          </div>
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: 'var(--bg-muted)' }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>إلغاء</Button>
            <Button variant="primary" type="submit" form="location-form" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingLocation ? 'حفظ التعديلات' : 'إضافة المخزن'}
            </Button>
          </div>
        </DialogShell>
      )}
    </main>
  );
}
