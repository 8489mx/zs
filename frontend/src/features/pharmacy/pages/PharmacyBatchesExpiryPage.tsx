import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pharmacyApi } from '../api/pharmacy.api';
import type { PharmacyBatch } from '../types/pharmacy.types';
import { DialogShell } from '@/shared/components/dialog-shell';
import { MAJOR_DISTRIBUTORS } from '../constants/pharmacy.constants';

export default function PharmacyBatchesExpiryPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Partial<PharmacyBatch> | null>(null);

  const { data, isLoading } = useQuery({
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch || !editingBatch.batch_number || !editingBatch.expiry_date) return;
    upsertMutation.mutate(editingBatch);
  };

  return (
    <div className="page-stack" dir="rtl" style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 20px', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⏳</span> إدارة التشغيلات وتواريخ الصلاحية ومرتجعات الشركات
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            تتبع أرقام التشغيلات (Batches)، تواريخ الانتهاء، ورصد الأدوية الوشيكة لتجهيز أذون الإرجاع للموزعين
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="btn btn-primary"
          style={{ fontWeight: 800, fontSize: '0.85rem', background: '#d97706', borderColor: '#d97706', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span>➕</span> تسجيل تشغيلة / شحنة
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', background: '#ffffff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="بحث برقم التشغيلة، الموزع، أو الملاحظات..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          style={{ flex: '1 1 280px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
        />

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
        >
          <option value="all">كل الحالات</option>
          <option value="active">صلاحية سارية</option>
          <option value="near_expiry">وشيك الانتهاء (أقل من 3 شهور)</option>
          <option value="expired">منتهي الصلاحية (اكسباير)</option>
          <option value="returned">تم إرجاعه للموزع</option>
        </select>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'right' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 800 }}>
              <th style={{ padding: '12px 14px' }}>رقم التشغيلة (Batch No)</th>
              <th style={{ padding: '12px 14px' }}>تاريخ الانتهاء (Expiry)</th>
              <th style={{ padding: '12px 14px' }}>الكمية المتبقية</th>
              <th style={{ padding: '12px 14px' }}>سعر التكلفة</th>
              <th style={{ padding: '12px 14px' }}>الشركة الموزعة</th>
              <th style={{ padding: '12px 14px' }}>الحالة</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>جاري التحميل...</td>
              </tr>
            ) : data?.batches.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>لا توجد تشغيلات مسجلة</td>
              </tr>
            ) : (
              data?.batches.map((batch: PharmacyBatch) => (
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
                        padding: '2px 8px',
                        borderRadius: '4px',
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
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBatch(batch);
                        setModalOpen(true);
                      }}
                      className="btn btn-sm btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    >
                      تعديل
                    </button>
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
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                {editingBatch.id ? '✏️ تعديل بيانات التشغيلة' : '➕ إضافة تشغيلة وصلاحية جديدة'}
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  رقم التشغيلة (Batch Number)*:
                </label>
                <input
                  type="text"
                  required
                  value={editingBatch.batch_number || ''}
                  onChange={(e) => setEditingBatch({ ...editingBatch, batch_number: e.target.value })}
                  placeholder="e.g. B260812"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  تاريخ الانتهاء (Expiry Date)*:
                </label>
                <input
                  type="text"
                  required
                  value={editingBatch.expiry_date || ''}
                  onChange={(e) => setEditingBatch({ ...editingBatch, expiry_date: e.target.value })}
                  placeholder="مثال: 2026-11 أو 11/2026"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  الكمية (العلب):
                </label>
                <input
                  type="number"
                  value={editingBatch.quantity ?? 1}
                  onChange={(e) => setEditingBatch({ ...editingBatch, quantity: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  سعر التكلفة / الشراء:
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editingBatch.unit_cost ?? 0}
                  onChange={(e) => setEditingBatch({ ...editingBatch, unit_cost: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  الموزع / المورد:
                </label>
                <select
                  value={editingBatch.supplier_name || MAJOR_DISTRIBUTORS[0]}
                  onChange={(e) => setEditingBatch({ ...editingBatch, supplier_name: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
                >
                  {MAJOR_DISTRIBUTORS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  حالة التشغيلة:
                </label>
                <select
                  value={editingBatch.status || 'active'}
                  onChange={(e) => setEditingBatch({ ...editingBatch, status: e.target.value as any })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
                >
                  <option value="active">صلاحية سارية</option>
                  <option value="near_expiry">وشيك الانتهاء</option>
                  <option value="expired">منتهي الصلاحية</option>
                  <option value="returned">تم إرجاعه للموزع</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '18px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>إلغاء</button>
              <button type="submit" className="btn btn-primary" disabled={upsertMutation.isPending}>
                {upsertMutation.isPending ? 'جاري الحفظ...' : '💾 حفظ التشغيلة'}
              </button>
            </div>
          </form>
        </DialogShell>
      )}
    </div>
  );
}
