import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { useAppToolbar } from '@/stores/toolbar-store';
import { pharmacyApi } from '../api/pharmacy.api';
import type { PharmacyBatch } from '../types/pharmacy.types';
import { DialogShell } from '@/shared/components/dialog-shell';
import { MAJOR_DISTRIBUTORS } from '../constants/pharmacy.constants';
import {
  IconExpiry,
  IconPlus,
  IconRefresh,
  IconEdit,
  IconSave,
  IconCheck,
} from '../components/PharmacyIcons';

export default function PharmacyBatchesExpiryPage() {
  useAppToolbar([{ label: 'الصلاحيات والمرتجعات' }]);
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Partial<PharmacyBatch> | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pharmacy', 'batches', searchQuery, statusFilter, page],
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
      queryClient.invalidateQueries({ queryKey: ['pharmacy', 'batches'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy', 'stats'] });
      setModalOpen(false);
      setEditingBatch(null);
    },
  });

  const totalItems = data?.pagination.totalItems || 0;
  const batchesList = data?.batches || [];

  const activeCount = batchesList.filter((b: PharmacyBatch) => b.status === 'active').length;
  const nearExpiryCount = batchesList.filter((b: PharmacyBatch) => b.status === 'near_expiry').length;
  const expiredCount = batchesList.filter((b: PharmacyBatch) => b.status === 'expired').length;
  const returnedCount = batchesList.filter((b: PharmacyBatch) => b.status === 'returned').length;

  const handleOpenAdd = () => {
    setEditingBatch({
      batch_number: '',
      expiry_date: '',
      quantity: 1,
      unit_cost: 0,
      supplier_name: MAJOR_DISTRIBUTORS[0],
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
    setEditingBatch((prev) => ({ ...prev, expiry_date: yyyy + '-' + mm }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch || !editingBatch.batch_number || !editingBatch.expiry_date) return;
    upsertMutation.mutate(editingBatch);
  };

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px', margin: '0 auto' }}>
        <PageHeader
          title="إدارة التشغيلات وتواريخ الصلاحية ومرتجعات الشركات"
          description="تتبع أرقام التشغيلات (Batches)، تواريخ الانتهاء، ورصد الأدوية الوشيكة لتجهيز أذون الإرجاع للموزعين"
          badge={<span className="nav-pill">{totalItems} تشغيلة مسجلة</span>}
          actions={
            <div className="actions compact-actions">
              <Button
                variant="primary"
                onClick={handleOpenAdd}
                style={{ background: '#d97706', borderColor: '#d97706', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <IconPlus size={16} />
                <span>تسجيل تشغيلة / شحنة</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => void refetch()}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <IconRefresh size={16} />
                <span>تحديث</span>
              </Button>
            </div>
          }
        />

        {/* 4 KPI Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>تشغيلات صالحة وسارية</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#16a34a', marginTop: '2px' }}>{activeCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <IconCheck size={20} />
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>وشيك الانتهاء (أقل من 3 شهور)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#d97706', marginTop: '2px' }}>{nearExpiryCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
              <IconExpiry size={20} />
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>منتهي الصلاحية (اكسباير)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#dc2626', marginTop: '2px' }}>{expiredCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
              <IconExpiry size={20} />
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>تم إرجاعه لشركات التوزيع</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#475569', marginTop: '2px' }}>{returnedCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
              <IconRefresh size={20} />
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={'btn btn-sm ' + (statusFilter === 'all' ? 'btn-primary' : 'btn-secondary')}
              onClick={() => { setStatusFilter('all'); setPage(1); }}
            >
              الكل ({totalItems})
            </button>
            <button
              type="button"
              className={'btn btn-sm ' + (statusFilter === 'active' ? 'btn-primary' : 'btn-secondary')}
              onClick={() => { setStatusFilter('active'); setPage(1); }}
            >
              سارية
            </button>
            <button
              type="button"
              className={'btn btn-sm ' + (statusFilter === 'near_expiry' ? 'btn-primary' : 'btn-secondary')}
              onClick={() => { setStatusFilter('near_expiry'); setPage(1); }}
            >
              وشيك الانتهاء
            </button>
            <button
              type="button"
              className={'btn btn-sm ' + (statusFilter === 'expired' ? 'btn-primary' : 'btn-secondary')}
              onClick={() => { setStatusFilter('expired'); setPage(1); }}
            >
              منتهي الصلاحية
            </button>
            <button
              type="button"
              className={'btn btn-sm ' + (statusFilter === 'returned' ? 'btn-primary' : 'btn-secondary')}
              onClick={() => { setStatusFilter('returned'); setPage(1); }}
            >
              مرتجع للموزع
            </button>
          </div>

          <div style={{ minWidth: '300px' }}>
            <input
              type="text"
              className="purchase-prototype-field-input"
              placeholder="بحث برقم التشغيلة، الموزع، أو الملاحظات..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '6px 12px' }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 800 }}>
                <th style={{ padding: '10px 14px' }}>رقم التشغيلة (Batch No)</th>
                <th style={{ padding: '10px 14px' }}>تاريخ الانتهاء (Expiry)</th>
                <th style={{ padding: '10px 14px' }}>الكمية المتبقية</th>
                <th style={{ padding: '10px 14px' }}>سعر التكلفة</th>
                <th style={{ padding: '10px 14px' }}>الشركة الموزعة</th>
                <th style={{ padding: '10px 14px' }}>الحالة</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>جاري التحميل...</td>
                </tr>
              ) : batchesList.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>لا توجد تشغيلات مسجلة</td>
                </tr>
              ) : (
                batchesList.map((batch: PharmacyBatch) => (
                  <tr key={batch.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 800, fontFamily: 'monospace' }}>
                      {batch.batch_number}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#dc2626' }}>
                      {batch.expiry_date}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                      {batch.quantity} علبة
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {Number(batch.unit_cost).toFixed(2)} ج.م
                    </td>
                    <td style={{ padding: '10px 14px', color: '#475569' }}>
                      {batch.supplier_name || '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid transparent',
                          background:
                            batch.status === 'expired'
                              ? '#fee2e2'
                              : batch.status === 'near_expiry'
                              ? '#fef3c7'
                              : batch.status === 'returned'
                              ? '#f1f5f9'
                              : '#dcfce7',
                          color:
                            batch.status === 'expired'
                              ? '#dc2626'
                              : batch.status === 'near_expiry'
                              ? '#d97706'
                              : batch.status === 'returned'
                              ? '#475569'
                              : '#16a34a',
                          borderColor:
                            batch.status === 'expired'
                              ? '#fca5a5'
                              : batch.status === 'near_expiry'
                              ? '#fde68a'
                              : batch.status === 'returned'
                              ? '#cbd5e1'
                              : '#86efac',
                        }}
                      >
                        {batch.status === 'expired'
                          ? 'منتهي الصلاحية'
                          : batch.status === 'near_expiry'
                          ? 'وشيك الانتهاء'
                          : batch.status === 'returned'
                          ? 'مرتجع للشركة'
                          : 'سارٍ وصالح'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <Button
                        variant="secondary"
                        className="btn-sm"
                        onClick={() => {
                          setEditingBatch(batch);
                          setModalOpen(true);
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <IconEdit size={14} />
                        <span>تعديل</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {modalOpen && editingBatch && (
          <DialogShell open={modalOpen} onClose={() => setModalOpen(false)} width="min(600px, 95vw)" ariaLabel="بيانات التشغيلة">
            <form onSubmit={handleSave} dir="rtl" style={{ padding: '16px 20px' }}>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IconExpiry size={20} color="#d97706" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  {editingBatch.id ? 'تعديل بيانات التشغيلة' : 'إضافة تشغيلة وصلاحية جديدة'}
                </h3>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    رقم التشغيلة (Batch Number) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="purchase-prototype-field-input"
                    value={editingBatch.batch_number || ''}
                    onChange={(e) => setEditingBatch({ ...editingBatch, batch_number: e.target.value })}
                    placeholder="e.g. B260812"
                    style={{ width: '100%', padding: '8px 12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    تاريخ الانتهاء (Expiry Date) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="purchase-prototype-field-input"
                    value={editingBatch.expiry_date || ''}
                    onChange={(e) => setEditingBatch({ ...editingBatch, expiry_date: e.target.value })}
                    placeholder="مثال: 2026-11 أو 11/2026"
                    style={{ width: '100%', padding: '8px 12px' }}
                  />
                  {/* Quick Expiry Date Preset Buttons */}
                  <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                    <button type="button" onClick={() => handleSetQuickExpiry(6)} className="btn btn-sm btn-secondary" style={{ padding: '2px 6px', fontSize: '0.7rem' }}>+6 شهور</button>
                    <button type="button" onClick={() => handleSetQuickExpiry(12)} className="btn btn-sm btn-secondary" style={{ padding: '2px 6px', fontSize: '0.7rem' }}>+1 سنة</button>
                    <button type="button" onClick={() => handleSetQuickExpiry(24)} className="btn btn-sm btn-secondary" style={{ padding: '2px 6px', fontSize: '0.7rem' }}>+2 سنة</button>
                    <button type="button" onClick={() => handleSetQuickExpiry(36)} className="btn btn-sm btn-secondary" style={{ padding: '2px 6px', fontSize: '0.7rem' }}>+3 سنوات</button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    الكمية (العلب)
                  </label>
                  <input
                    type="number"
                    className="purchase-prototype-field-input"
                    value={editingBatch.quantity ?? 1}
                    onChange={(e) => setEditingBatch({ ...editingBatch, quantity: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '8px 12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    سعر التكلفة / الشراء
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="purchase-prototype-field-input"
                    value={editingBatch.unit_cost ?? 0}
                    onChange={(e) => setEditingBatch({ ...editingBatch, unit_cost: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '8px 12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    الموزع / المورد
                  </label>
                  <select
                    className="purchase-prototype-field-input"
                    value={editingBatch.supplier_name || MAJOR_DISTRIBUTORS[0]}
                    onChange={(e) => setEditingBatch({ ...editingBatch, supplier_name: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', background: '#fff' }}
                  >
                    {MAJOR_DISTRIBUTORS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    حالة التشغيلة
                  </label>
                  <select
                    className="purchase-prototype-field-input"
                    value={editingBatch.status || 'active'}
                    onChange={(e) => setEditingBatch({ ...editingBatch, status: e.target.value as any })}
                    style={{ width: '100%', padding: '8px 12px', background: '#fff' }}
                  >
                    <option value="active">صلاحية سارية</option>
                    <option value="near_expiry">وشيك الانتهاء</option>
                    <option value="expired">منتهي الصلاحية</option>
                    <option value="returned">تم إرجاعه للموزع</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                <Button variant="secondary" onClick={() => setModalOpen(false)}>إلغاء</Button>
                <Button variant="primary" type="submit" disabled={upsertMutation.isPending} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconSave size={16} />
                  <span>{upsertMutation.isPending ? 'جاري الحفظ...' : 'حفظ التشغيلة'}</span>
                </Button>
              </div>
            </form>
          </DialogShell>
        )}
      </main>
    </div>
  );
}
