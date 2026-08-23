import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
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
  IconSearch,
} from '../components/PharmacyIcons';

export default function PharmacyBatchesExpiryPage() {
  useAppToolbar([
    { label: 'الرئيسية', to: '/' },
    { label: 'الصيدلية والأدوية', to: '/pharmacy' },
    { label: 'الصلاحيات والمرتجعات' },
  ]);
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

  const totalItems = data?.pagination?.totalItems || (data?.batches?.length || 0);
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
      <main className="document-prototype-column" style={{ paddingBottom: '80px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        <PageHeader
          title="إدارة التشغيلات وتواريخ الصلاحية ومرتجعات الشركات"
          description="تتبع أرقام التشغيلات (Batches)، تواريخ الانتهاء، ورصد الأدوية الوشيكة لتجهيز أذون الإرجاع للموزعين"
          badge={<span className="cashier-chip" style={{ fontWeight: 700, color: 'var(--primary, #1e1b4b)', background: '#f1f5f9', border: '1px solid #e2e8f0' }}>{totalItems} تشغيلة مسجلة</span>}
          actions={
            <div className="actions compact-actions">
              <Button
                variant="primary"
                onClick={handleOpenAdd}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <IconPlus size={15} />
                <span>تسجيل تشغيلة جديدة</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => void refetch()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <IconRefresh size={15} />
                <span>تحديث</span>
              </Button>
            </div>
          }
        />

        {/* 4 KPI Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>تشغيلات صالحة وسارية</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>{activeCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <IconCheck size={18} />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>وشيك الانتهاء (أقل من 3 شهور)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>{nearExpiryCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
              <IconExpiry size={18} />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>منتهي الصلاحية (اكسباير)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#b91c1c', marginTop: '2px' }}>{expiredCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b91c1c' }}>
              <IconExpiry size={18} />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>تم إرجاعه لشركات التوزيع</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{returnedCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}>
              <IconRefresh size={18} />
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', background: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '14px', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.02)' }}>
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

          <div style={{ minWidth: '300px', position: 'relative', flex: '1 1 300px', maxWidth: '460px' }}>
            <input
              type="text"
              className="purchase-prototype-field-input"
              placeholder="بحث برقم التشغيلة، الموزع، أو الملاحظات..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              style={{ width: '100%', paddingInlineStart: '34px', boxSizing: 'border-box' }}
            />
            <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: '10px', color: '#94a3b8', display: 'flex' }}>
              <IconSearch size={16} />
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
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
                    <td style={{ padding: '10px 14px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--primary, #1e1b4b)' }}>
                      {batch.batch_number}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: batch.status === 'expired' ? '#b91c1c' : batch.status === 'near_expiry' ? '#d97706' : '#0f172a' }}>
                      {batch.expiry_date}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
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
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          border: '1px solid transparent',
                          background:
                            batch.status === 'expired'
                              ? '#fee2e2'
                              : batch.status === 'near_expiry'
                              ? '#fef3c7'
                              : batch.status === 'returned'
                              ? '#f1f5f9'
                              : '#f0fdf4',
                          color:
                            batch.status === 'expired'
                              ? '#b91c1c'
                              : batch.status === 'near_expiry'
                              ? '#b45309'
                              : batch.status === 'returned'
                              ? '#475569'
                              : '#166534',
                          borderColor:
                            batch.status === 'expired'
                              ? '#fca5a5'
                              : batch.status === 'near_expiry'
                              ? '#fde68a'
                              : batch.status === 'returned'
                              ? '#e2e8f0'
                              : '#bbf7d0',
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
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
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
          <DialogShell
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            width="min(600px, 95vw)"
            ariaLabel={editingBatch.id ? 'تعديل بيانات التشغيلة' : 'إضافة تشغيلة وصلاحية جديدة'}
          >
            <div dir="rtl" style={{ background: '#ffffff', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  {editingBatch.id ? 'تعديل بيانات التشغيلة' : 'إضافة تشغيلة وصلاحية جديدة'}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ border: 'none', background: '#f1f5f9', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 700 }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      رقم التشغيلة (Batch Number) <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="purchase-prototype-field-input"
                      value={editingBatch.batch_number || ''}
                      onChange={(e) => setEditingBatch({ ...editingBatch, batch_number: e.target.value })}
                      placeholder="e.g. B260812"
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      تاريخ الانتهاء (Expiry Date) <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="purchase-prototype-field-input"
                      value={editingBatch.expiry_date || ''}
                      onChange={(e) => setEditingBatch({ ...editingBatch, expiry_date: e.target.value })}
                      placeholder="مثال: 2026-11 أو 11/2026"
                      style={{ width: '100%', boxSizing: 'border-box' }}
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
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      الكمية (العلب)
                    </label>
                    <input
                      type="number"
                      className="purchase-prototype-field-input"
                      value={editingBatch.quantity ?? 1}
                      onChange={(e) => setEditingBatch({ ...editingBatch, quantity: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      سعر التكلفة / الشراء
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="purchase-prototype-field-input"
                      value={editingBatch.unit_cost ?? 0}
                      onChange={(e) => setEditingBatch({ ...editingBatch, unit_cost: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      الموزع / المورد
                    </label>
                    <CustomSelect
                      value={editingBatch.supplier_name || MAJOR_DISTRIBUTORS[0]}
                      onChange={(val) => setEditingBatch({ ...editingBatch, supplier_name: val })}
                      options={MAJOR_DISTRIBUTORS.map((d) => ({ value: d, label: d }))}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      حالة التشغيلة
                    </label>
                    <CustomSelect
                      value={editingBatch.status || 'active'}
                      onChange={(val) => setEditingBatch({ ...editingBatch, status: val as any })}
                      options={[
                        { value: 'active', label: 'صلاحية سارية' },
                        { value: 'near_expiry', label: 'وشيك الانتهاء' },
                        { value: 'expired', label: 'منتهي الصلاحية' },
                        { value: 'returned', label: 'تم إرجاعه للموزع' },
                      ]}
                    />
                  </div>

                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                  <Button variant="secondary" onClick={() => setModalOpen(false)}>إلغاء</Button>
                  <Button variant="primary" type="submit" disabled={upsertMutation.isPending} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <IconSave size={15} />
                    <span>{upsertMutation.isPending ? 'جاري الحفظ...' : 'حفظ التشغيلة'}</span>
                  </Button>
                </div>
              </form>
            </div>
          </DialogShell>
        )}
      </main>
    </div>
  );
}
