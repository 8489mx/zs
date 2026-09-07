import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { DialogShell } from '@/shared/components/dialog-shell';
import { pharmacyApi } from '@/features/pharmacy/api/pharmacy.api';
import type { PharmacyBatch } from '@/features/pharmacy/types/pharmacy.types';
import { PackageIcon } from '@/shared/components/icons/AppIcons';

export function InventoryBatchesPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Partial<PharmacyBatch> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', 'batches', searchQuery, statusFilter, page],
    queryFn: () =>
      pharmacyApi.listBatches({
        q: searchQuery,
        status: statusFilter,
        page,
        pageSize: 20,
      }),
  });

  const upsertMutation = useMutation({
    mutationFn: pharmacyApi.upsertBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'batches'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy', 'batches'] });
      setModalOpen(false);
      setEditingBatch(null);
    },
  });

  const totalItems = data?.pagination?.totalItems || (data?.batches?.length || 0);
  const batchesList = (data?.batches || []) as Array<PharmacyBatch & { product_name?: string; product_barcode?: string }>;

  const activeCount = batchesList.filter((b) => b.status === 'active').length;
  const nearExpiryCount = batchesList.filter((b) => b.status === 'near_expiry').length;
  const expiredCount = batchesList.filter((b) => b.status === 'expired').length;
  const returnedCount = batchesList.filter((b) => b.status === 'returned').length;

  const handleOpenAdd = () => {
    setEditingBatch({
      batch_number: '',
      expiry_date: '',
      quantity: 1,
      unit_cost: 0,
      supplier_name: '',
      status: 'active',
      notes: '',
    });
    setModalOpen(true);
  };

  const handleSetQuickExpiry = (monthsAhead: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthsAhead);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    setEditingBatch((prev) => ({ ...prev, expiry_date: `${yyyy}-${mm}` }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch || !editingBatch.batch_number || !editingBatch.expiry_date) return;
    upsertMutation.mutate(editingBatch);
  };

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '40px', width: '100%' }}>
        <PageHeader
          title="إدارة التشغيلات وتواريخ الصلاحية (Lots & Expiration)"
          description="تتبع أرقام التشغيلات (Batches)، تواريخ الصلاحية، وأرصدة الدفعات عبر المستودعات لجميع الأصناف"
          badge={
            <span style={{ fontWeight: 700, color: '#1e1b4b', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '3px 10px', fontSize: '0.8rem' }}>
              {totalItems} تشغيلة مسجلة
            </span>
          }
          actions={
            <div className="actions compact-actions">
              <Button type="button" onClick={handleOpenAdd} style={{ background: '#170e5e', color: '#ffffff', fontWeight: 600 }}>
                إضافة تشغيلة جديدة
              </Button>
            </div>
          }
        />

        {/* KPI Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>إجمالي التشغيلات</span>
            <strong style={{ fontSize: '1.4rem', color: '#0f172a' }}>{totalItems}</strong>
          </div>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <span style={{ fontSize: '0.75rem', color: '#16a34a', display: 'block' }}>تشغيلات صالحة ونشطة</span>
            <strong style={{ fontSize: '1.4rem', color: '#16a34a' }}>{activeCount}</strong>
          </div>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <span style={{ fontSize: '0.75rem', color: '#d97706', display: 'block' }}>وشيكة الانتهاء (&le; 60 يوم)</span>
            <strong style={{ fontSize: '1.4rem', color: '#d97706' }}>{nearExpiryCount}</strong>
          </div>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <span style={{ fontSize: '0.75rem', color: '#dc2626', display: 'block' }}>منتهية الصلاحية</span>
            <strong style={{ fontSize: '1.4rem', color: '#dc2626' }}>{expiredCount}</strong>
          </div>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>مرتجعة للمورد</span>
            <strong style={{ fontSize: '1.4rem', color: '#64748b' }}>{returnedCount}</strong>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '280px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                placeholder="بحث برقم التشغيلة، اسم الصنف، الباركود، أو المورد..."
                style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ width: '200px' }}>
            <CustomSelect
              value={statusFilter}
              onChange={(val) => { setStatusFilter(val); setPage(1); }}
              options={[
                { value: 'all', label: 'جميع الحالات' },
                { value: 'active', label: 'صالحة ونشطة' },
                { value: 'near_expiry', label: 'وشيكة الانتهاء' },
                { value: 'expired', label: 'منتهية الصلاحية' },
                { value: 'returned', label: 'مرتجعة للمورد' },
              ]}
            />
          </div>
        </div>

        {/* Table Container */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          {isLoading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>جارٍ تحميل التشغيلات...</div>
          ) : batchesList.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <PackageIcon size={32} color="#94a3b8" style={{ margin: '0 auto 8px auto', display: 'block' }} />
              <div>لا توجد تشغيلات مسجلة تطابق معايير البحث.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'right' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '10px 14px', color: '#475569' }}>رقم التشغيلة</th>
                    <th style={{ padding: '10px 14px', color: '#475569' }}>اسم الصنف</th>
                    <th style={{ padding: '10px 14px', color: '#475569' }}>الباركود</th>
                    <th style={{ padding: '10px 14px', color: '#475569' }}>تاريخ الصلاحية</th>
                    <th style={{ padding: '10px 14px', color: '#475569' }}>الرصيد المتاح</th>
                    <th style={{ padding: '10px 14px', color: '#475569' }}>تكلفة الوحدة</th>
                    <th style={{ padding: '10px 14px', color: '#475569' }}>المورد</th>
                    <th style={{ padding: '10px 14px', color: '#475569' }}>الحالة</th>
                    <th style={{ padding: '10px 14px', color: '#475569' }}>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {batchesList.map((batch) => {
                    const isExp = batch.status === 'expired';
                    const isNear = batch.status === 'near_expiry';
                    const isRet = batch.status === 'returned';

                    let statusBg = '#f0fdf4';
                    let statusColor = '#166534';
                    let statusLabel = 'صالحة ونشطة';

                    if (isExp) {
                      statusBg = '#fef2f2';
                      statusColor = '#991b1b';
                      statusLabel = 'منتهية الصلاحية';
                    } else if (isNear) {
                      statusBg = '#fffbeb';
                      statusColor = '#92400e';
                      statusLabel = 'وشيكة الانتهاء';
                    } else if (isRet) {
                      statusBg = '#f1f5f9';
                      statusColor = '#475569';
                      statusLabel = 'مرتجعة';
                    }

                    return (
                      <tr key={batch.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 700, fontFamily: 'monospace' }}>{batch.batch_number}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>{batch.product_name || '—'}</td>
                        <td style={{ padding: '10px 14px', color: '#64748b', fontFamily: 'monospace' }}>{batch.product_barcode || '—'}</td>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', direction: 'ltr', textAlign: 'left' }}>
                          <span style={{ fontWeight: 600, color: isExp ? '#dc2626' : isNear ? '#d97706' : '#0f172a' }}>
                            {batch.expiry_date}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 700 }}>{Number(batch.quantity || 0).toLocaleString()}</td>
                        <td style={{ padding: '10px 14px' }}>{Number(batch.unit_cost || 0).toFixed(2)}</td>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>{batch.supplier_name || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, background: statusBg, color: statusColor }}>
                            {statusLabel}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => { setEditingBatch(batch); setModalOpen(true); }}
                            style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                          >
                            تعديل
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {modalOpen && editingBatch && (
          <DialogShell
            open
            onClose={() => setModalOpen(false)}
            width="min(650px, 95vw)"
          >
            <div style={{ paddingBottom: '10px', borderBottom: '1px solid #e2e8f0', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                {editingBatch.id ? `تعديل التشغيلة #${editingBatch.batch_number}` : 'إضافة تشغيلة جديدة للمستودع'}
              </h3>
            </div>
            <form onSubmit={handleSave} dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    رقم التشغيلة (Batch / Lot No) *
                  </label>
                  <input
                    value={editingBatch.batch_number || ''}
                    onChange={(e) => setEditingBatch((prev) => ({ ...prev, batch_number: e.target.value.toUpperCase() }))}
                    placeholder="مثال: LOT-2026-X1"
                    dir="ltr"
                    required
                    style={{ width: '100%', padding: '7px 10px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    تاريخ الصلاحية (YYYY-MM أو YYYY-MM-DD) *
                  </label>
                  <input
                    value={editingBatch.expiry_date || ''}
                    onChange={(e) => setEditingBatch((prev) => ({ ...prev, expiry_date: e.target.value }))}
                    placeholder="YYYY-MM"
                    dir="ltr"
                    required
                    style={{ width: '100%', padding: '7px 10px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    <button type="button" onClick={() => handleSetQuickExpiry(3)} style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer' }}>+3 أشهر</button>
                    <button type="button" onClick={() => handleSetQuickExpiry(6)} style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer' }}>+6 أشهر</button>
                    <button type="button" onClick={() => handleSetQuickExpiry(12)} style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer' }}>+سنة</button>
                    <button type="button" onClick={() => handleSetQuickExpiry(24)} style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer' }}>+سنتين</button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    الكمية الرصيد *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={editingBatch.quantity ?? 1}
                    onChange={(e) => setEditingBatch((prev) => ({ ...prev, quantity: Number(e.target.value) }))}
                    required
                    style={{ width: '100%', padding: '7px 10px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    تكلفة الوحدة (Unit Cost)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingBatch.unit_cost ?? 0}
                    onChange={(e) => setEditingBatch((prev) => ({ ...prev, unit_cost: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '7px 10px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    المورد / جهة التوريد
                  </label>
                  <input
                    value={editingBatch.supplier_name || ''}
                    onChange={(e) => setEditingBatch((prev) => ({ ...prev, supplier_name: e.target.value }))}
                    placeholder="اسم المورد أو شركة التوزيع"
                    style={{ width: '100%', padding: '7px 10px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    الحالة
                  </label>
                  <select
                    value={editingBatch.status || 'active'}
                    onChange={(e) => setEditingBatch((prev) => ({ ...prev, status: e.target.value as any }))}
                    style={{ width: '100%', padding: '7px 10px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                  >
                    <option value="active">صالحة ونشطة</option>
                    <option value="near_expiry">وشيكة الانتهاء</option>
                    <option value="expired">منتهية الصلاحية</option>
                    <option value="returned">مرتجعة للشركة</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  ملاحظات
                </label>
                <input
                  value={editingBatch.notes || ''}
                  onChange={(e) => setEditingBatch((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="أي ملاحظات إضافية حول التشغيلة..."
                  style={{ width: '100%', padding: '7px 10px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '10px', marginTop: '10px' }}>
                <Button type="submit" disabled={upsertMutation.isPending} style={{ background: '#170e5e', color: '#ffffff' }}>
                  {upsertMutation.isPending ? 'جاري الحفظ...' : 'حفظ بيانات التشغيلة'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogShell>
        )}
      </main>
    </div>
  );
}
export default InventoryBatchesPage;
