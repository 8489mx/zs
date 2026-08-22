import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { useAppToolbar } from '@/stores/toolbar-store';
import { pharmacyApi } from '../api/pharmacy.api';
import type { PharmacyShortage } from '../types/pharmacy.types';
import { MAJOR_DISTRIBUTORS } from '../constants/pharmacy.constants';
import { DialogShell } from '@/shared/components/dialog-shell';
import {
  IconShortage,
  IconSparkles,
  IconPlus,
  IconRefresh,
  IconEdit,
  IconSave,
  IconCheck,
  IconSearch,
} from '../components/PharmacyIcons';

export default function PharmacyShortagesPage() {
  useAppToolbar([
    { label: 'الرئيسية', to: '/' },
    { label: 'الصيدلية والأدوية', to: '/pharmacy' },
    { label: 'كشكول النواقص الرقمي' },
  ]);
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Fast inline addition state
  const [quickName, setQuickName] = useState('');
  const [quickQty, setQuickQty] = useState(1);
  const [quickDist, setQuickDist] = useState(MAJOR_DISTRIBUTORS[0]);
  const [quickPriority, setQuickPriority] = useState<'normal' | 'urgent' | 'customer_request'>('normal');

  // Detailed Modal state
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
      setQuickName('');
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

  const totalItems = data?.pagination?.totalItems || (data?.shortages?.length || 0);
  const shortagesList = data?.shortages || [];

  const neededCount = shortagesList.filter((s: PharmacyShortage) => s.status === 'needed').length;
  const urgentCount = shortagesList.filter((s: PharmacyShortage) => s.priority === 'urgent').length;
  const customerCount = shortagesList.filter((s: PharmacyShortage) => s.priority === 'customer_request').length;
  const receivedCount = shortagesList.filter((s: PharmacyShortage) => s.status === 'received').length;

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;
    upsertMutation.mutate({
      product_name: quickName.trim(),
      requested_quantity: Number(quickQty) || 1,
      suggested_distributor: quickDist,
      priority: quickPriority,
      status: 'needed',
    });
  };

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
      <main className="document-prototype-column" style={{ paddingBottom: '80px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        <PageHeader
          title="كشكول النواقص الرقمي اليومي (Shortages Book)"
          description="تسجيل الأدوية الناقصة، طلبات العملاء العاجلة، وإعداد طلبيات شركات التوزيع"
          badge={<span className="cashier-chip" style={{ fontWeight: 700, color: 'var(--primary, #1e1b4b)', background: '#f1f5f9', border: '1px solid #e2e8f0' }}>{totalItems} صنف مسجل</span>}
          actions={
            <div className="actions compact-actions">
              <Button
                variant="primary"
                onClick={handleOpenAdd}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <IconPlus size={15} />
                <span>تسجيل صنف مفصل</span>
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

        {/* 4 Summary KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>مطلوب إدراجه بالطلبية</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#b91c1c', marginTop: '2px' }}>{neededCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b91c1c' }}>
              <IconShortage size={18} />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>نواقص عاجلة جداً</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#b91c1c', marginTop: '2px' }}>{urgentCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b91c1c' }}>
              <IconSparkles size={18} />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>طلبات خاصة لعملاء</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{customerCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}>
              <IconShortage size={18} />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>أصناف تم استلامها</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>{receivedCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <IconCheck size={18} />
            </div>
          </div>
        </div>

        {/* 1-Step Instant Quick Add One-Liner Bar */}
        <form
          onSubmit={handleQuickAdd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '14px',
            flexWrap: 'wrap',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0f172a', fontWeight: 700, fontSize: '0.82rem' }}>
            <IconPlus size={15} color="var(--primary, #1e1b4b)" />
            <span>إضافة فورية للكشكول:</span>
          </div>

          <input
            type="text"
            required
            className="purchase-prototype-field-input"
            placeholder="اسم الدواء الناقص..."
            value={quickName}
            onChange={(e) => setQuickName(e.target.value)}
            style={{ flex: '1 1 200px', fontSize: '0.84rem' }}
          />

          <input
            type="number"
            min="1"
            className="purchase-prototype-field-input"
            placeholder="العدد"
            value={quickQty}
            onChange={(e) => setQuickQty(Number(e.target.value) || 1)}
            style={{ width: '70px', fontSize: '0.84rem', textAlign: 'center' }}
            title="الكمية المطلوبة بالعلب"
          />

          <select
            className="purchase-prototype-field-input"
            value={quickDist}
            onChange={(e) => setQuickDist(e.target.value)}
            style={{ width: '140px', fontSize: '0.82rem', background: '#fff' }}
          >
            {MAJOR_DISTRIBUTORS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            className="purchase-prototype-field-input"
            value={quickPriority}
            onChange={(e) => setQuickPriority(e.target.value as any)}
            style={{ width: '110px', fontSize: '0.82rem', background: '#fff' }}
          >
            <option value="normal">عادي</option>
            <option value="urgent">عاجل جداً</option>
            <option value="customer_request">طلب مريض</option>
          </select>

          <Button
            type="submit"
            variant="primary"
            disabled={upsertMutation.isPending || !quickName.trim()}
            style={{ whiteSpace: 'nowrap', padding: '6px 14px' }}
          >
            {upsertMutation.isPending ? 'جاري الإضافة...' : '+ إدراج بالكشكول'}
          </Button>
        </form>

        {/* Filter Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', background: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '14px', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.02)' }}>
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
              style={{ padding: '6px 10px', fontSize: '0.82rem', background: '#fff', width: '130px' }}
            >
              <option value="all">كل الأولويات</option>
              <option value="urgent">عاجل جداً</option>
              <option value="customer_request">طلب عميل</option>
              <option value="normal">عادي</option>
            </select>

            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                className="purchase-prototype-field-input"
                placeholder="بحث باسم الدواء، المادة الفعالة، الموزع..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                style={{ width: '100%', paddingInlineStart: '34px', boxSizing: 'border-box' }}
              />
              <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: '10px', color: '#94a3b8', display: 'flex' }}>
                <IconSearch size={16} />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                <th style={{ padding: '10px 14px' }}>اسم الدواء الناقص</th>
                <th style={{ padding: '10px 14px' }}>المادة الفعالة</th>
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
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          طالب الصنف: {s.customer_name} {s.customer_phone ? ('(' + s.customer_phone + ')') : ''}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#0f766e', fontWeight: 600 }}>
                      {s.active_ingredient || '—'}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#475569' }}>
                      {s.suggested_distributor || 'أي موزع'}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0f172a' }}>
                      {s.requested_quantity} علبة
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: s.priority === 'urgent' ? '#fee2e2' : '#f1f5f9',
                          color: s.priority === 'urgent' ? '#b91c1c' : '#475569',
                          border: s.priority === 'urgent' ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                          whiteSpace: 'nowrap'
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

        {modalOpen && editingShortage && (
          <DialogShell
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            width="min(640px, 95vw)"
            ariaLabel={editingShortage.id ? 'تعديل بيانات الصنف الناقص' : 'تسجيل صنف مفصل في كشكول النواقص'}
          >
            <div dir="rtl" style={{ background: '#ffffff', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  {editingShortage.id ? 'تعديل بيانات الصنف الناقص' : 'تسجيل صنف مفصل في كشكول النواقص'}
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      اسم الدواء الناقص <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="purchase-prototype-field-input"
                      value={editingShortage.product_name || ''}
                      onChange={(e) => setEditingShortage({ ...editingShortage, product_name: e.target.value })}
                      placeholder="اسم الدواء والشكل..."
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      المادة الفعالة
                    </label>
                    <input
                      type="text"
                      className="purchase-prototype-field-input"
                      value={editingShortage.active_ingredient || ''}
                      onChange={(e) => setEditingShortage({ ...editingShortage, active_ingredient: e.target.value })}
                      placeholder="المادة الفعالة (اختياري)..."
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      الشركة الموزعة المفضلة
                    </label>
                    <select
                      className="purchase-prototype-field-input"
                      value={editingShortage.suggested_distributor || MAJOR_DISTRIBUTORS[0]}
                      onChange={(e) => setEditingShortage({ ...editingShortage, suggested_distributor: e.target.value })}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    >
                      {MAJOR_DISTRIBUTORS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      الكمية المطلوبة (العلب)
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="purchase-prototype-field-input"
                      value={editingShortage.requested_quantity ?? 1}
                      onChange={(e) => setEditingShortage({ ...editingShortage, requested_quantity: parseFloat(e.target.value) || 1 })}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      الأولوية
                    </label>
                    <select
                      className="purchase-prototype-field-input"
                      value={editingShortage.priority || 'normal'}
                      onChange={(e) => setEditingShortage({ ...editingShortage, priority: e.target.value as any })}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    >
                      <option value="urgent">عاجل جداً (نقص شديد)</option>
                      <option value="customer_request">طلب مريض محجوز</option>
                      <option value="normal">عادي (طلبية دورية)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      اسم العميل (في حال الحجز)
                    </label>
                    <input
                      type="text"
                      className="purchase-prototype-field-input"
                      value={editingShortage.customer_name || ''}
                      onChange={(e) => setEditingShortage({ ...editingShortage, customer_name: e.target.value })}
                      placeholder="اسم العميل..."
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                  <Button variant="secondary" onClick={() => setModalOpen(false)}>إلغاء</Button>
                  <Button variant="primary" type="submit" disabled={upsertMutation.isPending} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <IconSave size={15} />
                    <span>{upsertMutation.isPending ? 'جاري الحفظ...' : 'حفظ في كشكول النواقص'}</span>
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
