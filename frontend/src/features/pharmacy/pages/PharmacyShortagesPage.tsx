import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { useAppToolbar } from '@/stores/toolbar-store';
import { pharmacyApi } from '../api/pharmacy.api';
import type { PharmacyShortage } from '../types/pharmacy.types';
import { MAJOR_DISTRIBUTORS } from '../constants/pharmacy.constants';
import { DialogShell } from '@/shared/components/dialog-shell';

export default function PharmacyShortagesPage() {
  useAppToolbar([{ label: 'كشكول النواقص الرقمي' }]);
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingShortage, setEditingShortage] = useState<Partial<PharmacyShortage> | null>(null);

  const { data, isLoading, refetch } = useQuery({
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

  const totalItems = data?.pagination.totalItems || 0;
  const shortagesList = data?.shortages || [];

  const neededCount = shortagesList.filter((s: PharmacyShortage) => s.status === 'needed').length;
  const urgentCount = shortagesList.filter((s: PharmacyShortage) => s.priority === 'urgent').length;
  const customerCount = shortagesList.filter((s: PharmacyShortage) => s.priority === 'customer_request').length;
  const receivedCount = shortagesList.filter((s: PharmacyShortage) => s.status === 'received').length;

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
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px', margin: '0 auto' }}>
        <PageHeader
          title="كشكول النواقص الرقمي اليومي (Shortages Book)"
          description="تسجيل الأدوية الناقصة، طلبات العملاء العاجلة، وإعداد طلبيات شركات التوزيع (المتحدة، ابن سينا، فارما أوفرسيز)"
          badge={<span className="nav-pill">{totalItems} صنف مسجل</span>}
          actions={
            <div className="actions compact-actions">
              <Button
                variant="primary"
                onClick={handleOpenAdd}
                style={{ background: '#dc2626', borderColor: '#dc2626' }}
              >
                + تسجيل صنف ناقص
              </Button>
              <Button variant="secondary" onClick={() => void refetch()}>
                تحديث
              </Button>
            </div>
          }
        />

        {/* 4 Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>مطلوب إدراجه بالطلبية</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#dc2626', marginTop: '2px' }}>{neededCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>نواقص عاجلة جداً</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#b91c1c', marginTop: '2px' }}>{urgentCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b91c1c' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>طلبات خاصة لعملاء</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0369a1', marginTop: '2px' }}>{customerCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>أصناف تم استلامها</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#16a34a', marginTop: '2px' }}>{receivedCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className={'btn btn-sm ' + (statusFilter === 'all' ? 'btn-primary' : 'btn-secondary')}
              onClick={() => { setStatusFilter('all'); setPage(1); }}
            >
              الكل ({totalItems})
            </button>
            <button
              type="button"
              className={'btn btn-sm ' + (statusFilter === 'needed' ? 'btn-primary' : 'btn-secondary')}
              onClick={() => { setStatusFilter('needed'); setPage(1); }}
            >
              مطلوب
            </button>
            <button
              type="button"
              className={'btn btn-sm ' + (statusFilter === 'ordered' ? 'btn-primary' : 'btn-secondary')}
              onClick={() => { setStatusFilter('ordered'); setPage(1); }}
            >
              تم الطلب
            </button>
            <button
              type="button"
              className={'btn btn-sm ' + (statusFilter === 'received' ? 'btn-primary' : 'btn-secondary')}
              onClick={() => { setStatusFilter('received'); setPage(1); }}
            >
              تم الاستلام
            </button>
            <button
              type="button"
              className={'btn btn-sm ' + (statusFilter === 'unavailable' ? 'btn-primary' : 'btn-secondary')}
              onClick={() => { setStatusFilter('unavailable'); setPage(1); }}
            >
              غير متوفر بالسوق
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', flex: '1 1 340px', maxWidth: '520px' }}>
            <select
              className="purchase-prototype-field-input"
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
              style={{ padding: '6px 10px', fontSize: '0.82rem', background: '#fff' }}
            >
              <option value="all">كل الأولويات</option>
              <option value="urgent">عاجل جداً</option>
              <option value="customer_request">طلب عميل</option>
              <option value="normal">عادي</option>
            </select>

            <input
              type="text"
              className="purchase-prototype-field-input"
              placeholder="بحث باسم الدواء، المادة الفعالة، الموزع، أو العميل..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              style={{ flex: 1, padding: '6px 12px' }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 800 }}>
                <th style={{ padding: '10px 14px' }}>اسم الدواء الناقص</th>
                <th style={{ padding: '10px 14px' }}>المادة الفعالة والشكل</th>
                <th style={{ padding: '10px 14px' }}>الموزع المفضل</th>
                <th style={{ padding: '10px 14px' }}>الكمية</th>
                <th style={{ padding: '10px 14px' }}>الأولوية</th>
                <th style={{ padding: '10px 14px' }}>الحالة</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>جاري التحميل...</td>
                </tr>
              ) : shortagesList.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>لا توجد نواقص مسجلة</td>
                </tr>
              ) : (
                shortagesList.map((s: PharmacyShortage) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <strong style={{ color: '#0f172a' }}>{s.product_name}</strong>
                      {s.customer_name && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          طالب الصنف: {s.customer_name} {s.customer_phone ? ('(' + s.customer_phone + ')') : ''}
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
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid transparent',
                          background: s.priority === 'urgent' ? '#fee2e2' : s.priority === 'customer_request' ? '#e0f2fe' : '#f1f5f9',
                          color: s.priority === 'urgent' ? '#dc2626' : s.priority === 'customer_request' ? '#0369a1' : '#475569',
                          borderColor: s.priority === 'urgent' ? '#fca5a5' : s.priority === 'customer_request' ? '#93c5fd' : '#cbd5e1',
                        }}
                      >
                        {s.priority === 'urgent' ? 'عاجل جداً' : s.priority === 'customer_request' ? 'طلب عميل' : 'عادي'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <select
                        className="purchase-prototype-field-input"
                        value={s.status}
                        onChange={(e) => statusMutation.mutate({ id: s.id, status: e.target.value })}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
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
                      <Button
                        variant="secondary"
                        className="btn-sm"
                        onClick={() => {
                          setEditingShortage(s);
                          setModalOpen(true);
                        }}
                      >
                        تعديل
                      </Button>
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

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    اسم الدواء الناقص <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="purchase-prototype-field-input"
                    value={editingShortage.product_name || ''}
                    onChange={(e) => setEditingShortage({ ...editingShortage, product_name: e.target.value })}
                    placeholder="اسم الدواء والشكل..."
                    style={{ width: '100%', padding: '8px 12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    المادة الفعالة
                  </label>
                  <input
                    type="text"
                    className="purchase-prototype-field-input"
                    value={editingShortage.active_ingredient || ''}
                    onChange={(e) => setEditingShortage({ ...editingShortage, active_ingredient: e.target.value })}
                    placeholder="المادة الفعالة (اختياري)..."
                    style={{ width: '100%', padding: '8px 12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    الشركة الموزعة المفضلة
                  </label>
                  <select
                    className="purchase-prototype-field-input"
                    value={editingShortage.suggested_distributor || MAJOR_DISTRIBUTORS[0]}
                    onChange={(e) => setEditingShortage({ ...editingShortage, suggested_distributor: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', background: '#fff' }}
                  >
                    {MAJOR_DISTRIBUTORS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    الكمية المطلوبة (العلب)
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="purchase-prototype-field-input"
                    value={editingShortage.requested_quantity ?? 1}
                    onChange={(e) => setEditingShortage({ ...editingShortage, requested_quantity: parseFloat(e.target.value) || 1 })}
                    style={{ width: '100%', padding: '8px 12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    الأولوية
                  </label>
                  <select
                    className="purchase-prototype-field-input"
                    value={editingShortage.priority || 'normal'}
                    onChange={(e) => setEditingShortage({ ...editingShortage, priority: e.target.value as any })}
                    style={{ width: '100%', padding: '8px 12px', background: '#fff' }}
                  >
                    <option value="urgent">عاجل جداً (نقص شديد)</option>
                    <option value="customer_request">طلب مريض محجوز</option>
                    <option value="normal">عادي (طلبية دورية)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    اسم العميل (في حال الحجز)
                  </label>
                  <input
                    type="text"
                    className="purchase-prototype-field-input"
                    value={editingShortage.customer_name || ''}
                    onChange={(e) => setEditingShortage({ ...editingShortage, customer_name: e.target.value })}
                    placeholder="اسم العميل..."
                    style={{ width: '100%', padding: '8px 12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                <Button variant="secondary" onClick={() => setModalOpen(false)}>إلغاء</Button>
                <Button variant="primary" type="submit" disabled={upsertMutation.isPending}>
                  {upsertMutation.isPending ? 'جاري الحفظ...' : '💾 حفظ في كشكول النواقص'}
                </Button>
              </div>
            </form>
          </DialogShell>
        )}
      </main>
    </div>
  );
}
