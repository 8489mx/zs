import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pharmacyApi } from '../api/pharmacy.api';
import type { PharmacyShortage } from '../types/pharmacy.types';
import { MAJOR_DISTRIBUTORS } from '../constants/pharmacy.constants';
import { DialogShell } from '@/shared/components/dialog-shell';

export default function PharmacyShortagesPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingShortage, setEditingShortage] = useState<Partial<PharmacyShortage> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['pharmacy', 'shortages', searchQuery, statusFilter, priorityFilter, page],
    queryFn: () =>
      pharmacyApi.listShortages({
        q: searchQuery,
        status: statusFilter,
        priority: priorityFilter,
        page,
        pageSize: 20,
      }),
  });

  const upsertMutation = useMutation({
    mutationFn: pharmacyApi.upsertShortage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy', 'shortages'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy', 'stats'] });
      setModalOpen(false);
      setEditingShortage(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      pharmacyApi.updateShortageStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy', 'shortages'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy', 'stats'] });
    },
  });

  const handleOpenAdd = () => {
    setEditingShortage({
      product_name: '',
      active_ingredient: '',
      suggested_distributor: MAJOR_DISTRIBUTORS[0],
      requested_quantity: 2,
      priority: 'normal',
      customer_name: '',
      customer_phone: '',
      status: 'needed',
      notes: '',
    });
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShortage || !editingShortage.product_name) return;
    upsertMutation.mutate(editingShortage);
  };

  return (
    <div className="page-stack" dir="rtl" style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 20px', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📋</span> كشكول النواقص الرقمي اليومي (Pharmacy Shortages Book)
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            تسجيل الأدوية الناقصة، طلبات العملاء العاجلة، وإعداد طلبيات شركات التوزيع (المتحدة، ابن سينا، فارما أوفرسيز)
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="btn btn-primary"
          style={{ fontWeight: 800, fontSize: '0.85rem', background: '#dc2626', borderColor: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span>➕</span> تسجيل صنف ناقص
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', background: '#ffffff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="بحث باسم الدواء، المادة الفعالة، الموزع، أو العميل..."
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
          <option value="needed">مطلوب تسجيله في الطلبية</option>
          <option value="ordered">تم طلبه من الموزع</option>
          <option value="received">تم الاستلام بالصيدلية</option>
          <option value="unavailable">صنف ناقص من السوق وغير متوفر</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
        >
          <option value="all">كل الأولويات</option>
          <option value="urgent">عاجل جداً</option>
          <option value="customer_request">طلب خاص لعميل</option>
          <option value="normal">عادي</option>
        </select>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'right' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 800 }}>
              <th style={{ padding: '12px 14px' }}>اسم الدواء الناقص</th>
              <th style={{ padding: '12px 14px' }}>المادة الفعالة والشكل</th>
              <th style={{ padding: '12px 14px' }}>الموزع المفضل</th>
              <th style={{ padding: '12px 14px' }}>الكمية</th>
              <th style={{ padding: '12px 14px' }}>الأولوية</th>
              <th style={{ padding: '12px 14px' }}>الحالة</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>جاري التحميل...</td>
              </tr>
            ) : data?.shortages.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>لا توجد نواقص مسجلة</td>
              </tr>
            ) : (
              data?.shortages.map((s: PharmacyShortage) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <strong style={{ color: '#0f172a' }}>{s.product_name}</strong>
                    {s.customer_name && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        طالب الصنف: {s.customer_name} {s.customer_phone ? `(${s.customer_phone})` : ''}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#0284c7' }}>
                    {s.active_ingredient || '—'}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#475569' }}>
                    {s.suggested_distributor || 'أي موزع'}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 800 }}>
                    {s.requested_quantity} علبة
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: s.priority === 'urgent' ? '#fee2e2' : s.priority === 'customer_request' ? '#e0f2fe' : '#f1f5f9',
                        color: s.priority === 'urgent' ? '#dc2626' : s.priority === 'customer_request' ? '#0369a1' : '#475569',
                      }}
                    >
                      {s.priority === 'urgent' ? 'عاجل جداً' : s.priority === 'customer_request' ? 'طلب عميل' : 'عادي'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <select
                      value={s.status}
                      onChange={(e) => statusMutation.mutate({ id: s.id, status: e.target.value })}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        border: '1px solid #cbd5e1',
                        background:
                          s.status === 'received'
                            ? '#dcfce7'
                            : s.status === 'ordered'
                            ? '#e0f2fe'
                            : s.status === 'unavailable'
                            ? '#fee2e2'
                            : '#fff',
                      }}
                    >
                      <option value="needed">مطلوب</option>
                      <option value="ordered">تم الطلب</option>
                      <option value="received">تم الاستلام</option>
                      <option value="unavailable">غير متوفر بالسوق</option>
                    </select>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingShortage(s);
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

      {modalOpen && editingShortage && (
        <DialogShell open={modalOpen} onClose={() => setModalOpen(false)} width="min(600px, 95vw)" ariaLabel="تسجيل صنف ناقص">
          <form onSubmit={handleSave} dir="rtl" style={{ padding: '16px 20px' }}>
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                📋 تسجيل صنف في كشكول النواقص
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  اسم الدواء الناقص*:
                </label>
                <input
                  type="text"
                  required
                  value={editingShortage.product_name || ''}
                  onChange={(e) => setEditingShortage({ ...editingShortage, product_name: e.target.value })}
                  placeholder="اسم الدواء والشكل..."
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  المادة الفعالة:
                </label>
                <input
                  type="text"
                  value={editingShortage.active_ingredient || ''}
                  onChange={(e) => setEditingShortage({ ...editingShortage, active_ingredient: e.target.value })}
                  placeholder="المادة الفعالة (اختياري)..."
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  الشركة الموزعة المفضلة:
                </label>
                <select
                  value={editingShortage.suggested_distributor || MAJOR_DISTRIBUTORS[0]}
                  onChange={(e) => setEditingShortage({ ...editingShortage, suggested_distributor: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
                >
                  {MAJOR_DISTRIBUTORS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  الكمية المطلوبة (العلب):
                </label>
                <input
                  type="number"
                  min="1"
                  value={editingShortage.requested_quantity ?? 1}
                  onChange={(e) => setEditingShortage({ ...editingShortage, requested_quantity: parseFloat(e.target.value) || 1 })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  الأولوية:
                </label>
                <select
                  value={editingShortage.priority || 'normal'}
                  onChange={(e) => setEditingShortage({ ...editingShortage, priority: e.target.value as any })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
                >
                  <option value="urgent">عاجل جداً (نقص شديد)</option>
                  <option value="customer_request">طلب مريض محجوز</option>
                  <option value="normal">عادي (طلبية دورية)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  اسم العميل (في حال الحجز):
                </label>
                <input
                  type="text"
                  value={editingShortage.customer_name || ''}
                  onChange={(e) => setEditingShortage({ ...editingShortage, customer_name: e.target.value })}
                  placeholder="اسم العميل..."
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '18px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>إلغاء</button>
              <button type="submit" className="btn btn-primary" disabled={upsertMutation.isPending}>
                {upsertMutation.isPending ? 'جاري الحفظ...' : '💾 حفظ في كشكول النواقص'}
              </button>
            </div>
          </form>
        </DialogShell>
      )}
    </div>
  );
}
