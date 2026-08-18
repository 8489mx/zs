import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { DialogShell } from '@/shared/components/dialog-shell';
import { useSettingsQuery, useProductsQuery } from '@/shared/hooks/use-catalog-queries';
import { useAppToolbar } from '@/stores/toolbar-store';
import { maintenanceApi, type UpsertMaintenanceTicketPayload } from '../api/maintenance.api';
import { MaintenanceReceiptModal } from '../components/MaintenanceReceiptModal';
import { PatternLockWidget } from '../components/PatternLockWidget';
import type { MaintenanceTicket, MaintenanceStatus } from '@/types/domain-models/maintenance';

export function MaintenanceTicketsPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useSettingsQuery();
  const productsQuery = useProductsQuery();

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);
  const [receiptTicket, setReceiptTicket] = useState<MaintenanceTicket | null>(null);

  // New ticket form state
  const [formData, setFormData] = useState<UpsertMaintenanceTicketPayload>({
    customerName: '',
    customerPhone: '',
    deviceBrand: '',
    deviceModel: '',
    serialNumber: '',
    passcode: '',
    problemDescription: '',
    deviceCondition: '',
    expectedCost: 0,
    advancePayment: 0,
    warrantyDays: 30,
    status: 'received',
  });

  // Part adding state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [partPrice, setPartPrice] = useState(0);

  useAppToolbar([{ label: 'قسم الصيانة وتذاكر الإصلاح' }]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['maintenance-tickets', filterStatus, searchQuery, page],
    queryFn: () =>
      maintenanceApi.list({
        status: filterStatus === 'all' ? undefined : filterStatus,
        q: searchQuery || undefined,
        page,
        pageSize: 20,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: UpsertMaintenanceTicketPayload) => maintenanceApi.create(payload),
    onSuccess: (res) => {
      setCreateModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] });
      // Open receipt print directly
      void maintenanceApi.get(res.id).then((r) => setReceiptTicket(r.ticket));
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, finalCost, technicianNotes }: { id: string; status: MaintenanceStatus; finalCost?: number; technicianNotes?: string }) =>
      maintenanceApi.updateStatus(id, { status, finalCost, technicianNotes }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] });
      if (selectedTicket) {
        void maintenanceApi.get(selectedTicket.id).then((r) => setSelectedTicket(r.ticket));
      }
    },
  });

  const addPartMutation = useMutation({
    mutationFn: ({ ticketId, payload }: { ticketId: string; payload: any }) =>
      maintenanceApi.addPart(ticketId, payload),
    onSuccess: () => {
      setSelectedProductId('');
      setPartQty(1);
      setPartPrice(0);
      void queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] });
      if (selectedTicket) {
        void maintenanceApi.get(selectedTicket.id).then((r) => setSelectedTicket(r.ticket));
      }
    },
  });

  const removePartMutation = useMutation({
    mutationFn: ({ ticketId, partId }: { ticketId: string; partId: string }) =>
      maintenanceApi.removePart(ticketId, partId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] });
      if (selectedTicket) {
        void maintenanceApi.get(selectedTicket.id).then((r) => setSelectedTicket(r.ticket));
      }
    },
  });

  const tickets = data?.tickets || [];
  const totalItems = data?.pagination.totalItems || 0;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName.trim() || !formData.customerPhone.trim() || !formData.deviceModel.trim() || !formData.problemDescription.trim()) {
      alert('يرجى ملء كافة الحقول الأساسية: اسم العميل، الهاتف، موديل الجهاز، ووصف العطل');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleProductSelectForPart = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = (productsQuery.data || []).find((p: any) => String(p.id) === prodId);
    if (prod) {
      setPartPrice(Number(prod.retailPrice || 0));
    }
  };

  const handleAddPartSubmit = () => {
    if (!selectedTicket || !selectedProductId) return;
    const prod = (productsQuery.data || []).find((p: any) => String(p.id) === selectedProductId);
    if (!prod) return;

    addPartMutation.mutate({
      ticketId: selectedTicket.id,
      payload: {
        productId: Number(prod.id),
        productName: prod.name,
        qty: Number(partQty || 1),
        unitCost: Number(prod.costPrice || 0),
        unitPrice: Number(partPrice || 0),
      },
    });
  };

  const statusLabels: Record<MaintenanceStatus, { label: string; bg: string; color: string }> = {
    received: { label: '🟡 استلام جديد', bg: '#fef9c3', color: '#854d0e' },
    inspecting: { label: '🔍 قيد الفحص والتسعير', bg: '#e0e7ff', color: '#3730a3' },
    in_progress: { label: '⚙️ قيد الصيانة', bg: '#fef3c7', color: '#92400e' },
    repaired: { label: '🟢 جاهز للتسليم', bg: '#dcfce7', color: '#166534' },
    delivered: { label: '✔️ تم التسليم والتحصيل', bg: '#f1f5f9', color: '#475569' },
    unrepairable: { label: '🔴 تعذر الإصلاح', bg: '#fee2e2', color: '#991b1b' },
    cancelled: { label: '❌ ملغي', bg: '#f3f4f6', color: '#6b7280' },
  };

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px', margin: '0 auto' }}>
        <PageHeader
          title="🛠️ قسم الصيانة وتذاكر الإصلاح"
          description="إدارة ومتابعة أجهزة الصيانة، الفحص، صرف قطع الغيار، وطباعة إيصالات الاستلام وحسابات التسليم."
          badge={<span className="nav-pill">{totalItems} تذكرة صيانة</span>}
          actions={
            <div className="actions compact-actions">
              <Button
                variant="primary"
                onClick={() => {
                  setFormData({
                    customerName: '',
                    customerPhone: '',
                    deviceBrand: '',
                    deviceModel: '',
                    serialNumber: '',
                    passcode: '',
                    problemDescription: '',
                    deviceCondition: '',
                    expectedCost: 0,
                    advancePayment: 0,
                    warrantyDays: 30,
                    status: 'received',
                  });
                  setCreateModalOpen(true);
                }}
              >
                + استلام جهاز صيانة جديد
              </Button>
              <Button variant="secondary" onClick={() => void refetch()}>
                تحديث
              </Button>
            </div>
          }
        />

        {/* Filter Tabs & Search Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn btn-sm ${filterStatus === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setFilterStatus('all'); setPage(1); }}
            >
              الكل ({totalItems})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${filterStatus === 'received' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setFilterStatus('received'); setPage(1); }}
            >
              استلام جديد
            </button>
            <button
              type="button"
              className={`btn btn-sm ${filterStatus === 'in_progress' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setFilterStatus('in_progress'); setPage(1); }}
            >
              قيد الصيانة
            </button>
            <button
              type="button"
              className={`btn btn-sm ${filterStatus === 'repaired' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setFilterStatus('repaired'); setPage(1); }}
            >
              جاهز للتسليم
            </button>
            <button
              type="button"
              className={`btn btn-sm ${filterStatus === 'delivered' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setFilterStatus('delivered'); setPage(1); }}
            >
              تم التسليم
            </button>
          </div>

          <div style={{ minWidth: '260px' }}>
            <input
              type="text"
              className="purchase-prototype-field-input"
              placeholder="بحث برقم التذكرة، العميل، الهاتف، أو IMEI..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '6px 12px' }}
            />
          </div>
        </div>

        {/* Tickets Table */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                <th style={{ padding: '10px 14px' }}>رقم التذكرة</th>
                <th style={{ padding: '10px 14px' }}>العميل / الهاتف</th>
                <th style={{ padding: '10px 14px' }}>الجهاز / IMEI</th>
                <th style={{ padding: '10px 14px' }}>العطل</th>
                <th style={{ padding: '10px 14px' }}>التكلفة / المتبقي</th>
                <th style={{ padding: '10px 14px' }}>الحالة</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    جاري تحميل تذاكر الصيانة...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    لا توجد تذاكر صيانة مطابقة للبحث أو الفلتر.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => {
                  const remaining = Math.max(0, (t.finalCost || t.expectedCost || 0) - (t.advancePayment || 0));
                  const badge = statusLabels[t.status] || { label: t.status, bg: '#f1f5f9', color: '#334155' };
                  return (
                    <tr
                      key={t.id}
                      style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                      onClick={() => void maintenanceApi.get(t.id).then((r) => setSelectedTicket(r.ticket))}
                    >
                      <td style={{ padding: '10px 14px', fontWeight: 700, fontFamily: 'monospace' }}>
                        {t.ticketNo}
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>
                          {new Date(t.receivedAt).toLocaleDateString('ar-EG')}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <strong>{t.customerName}</strong>
                        <div style={{ color: '#64748b', fontSize: '0.8rem', direction: 'ltr', textAlign: 'right' }}>
                          {t.customerPhone}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div>{t.deviceBrand ? `${t.deviceBrand} ` : ''}<strong>{t.deviceModel}</strong></div>
                        {t.serialNumber && (
                          <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#7e22ce', direction: 'ltr', textAlign: 'right' }}>
                            IMEI: {t.serialNumber}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', maxWidth: '220px' }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#334155' }}>
                          {t.problemDescription}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div><strong>{(t.finalCost || t.expectedCost || 0).toFixed(2)} ج.م</strong></div>
                        {remaining > 0 ? (
                          <div style={{ fontSize: '0.75rem', color: '#dc2626' }}>متبقي: {remaining.toFixed(2)}</div>
                        ) : (
                          <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>مدفوع بالكامل</div>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: badge.bg,
                            color: badge.color,
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            title="عرض وتعديل التفاصيل"
                            onClick={() => void maintenanceApi.get(t.id).then((r) => setSelectedTicket(r.ticket))}
                          >
                            تفاصيل
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            title="طباعة إيصال استلام"
                            onClick={() => setReceiptTicket(t)}
                          >
                            📄 إيصال
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Create Ticket Modal */}
        {createModalOpen && (
          <DialogShell open={createModalOpen} onClose={() => setCreateModalOpen(false)} ariaLabel="استلام جهاز صيانة جديد">
            <form onSubmit={handleCreateSubmit} className="page-stack" dir="rtl" style={{ gap: '14px', maxWidth: '580px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>📱 استلام جهاز صيانة جديد</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>اسم العميل *</label>
                  <input
                    type="text"
                    required
                    className="purchase-prototype-field-input"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="مثال: أحمد محمد"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>رقم الهاتف *</label>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    className="purchase-prototype-field-input"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    placeholder="01012345678"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>الماركة (Brand)</label>
                  <input
                    type="text"
                    className="purchase-prototype-field-input"
                    value={formData.deviceBrand || ''}
                    onChange={(e) => setFormData({ ...formData, deviceBrand: e.target.value })}
                    placeholder="مثال: Apple, Samsung, Xiaomi"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>موديل الجهاز *</label>
                  <input
                    type="text"
                    required
                    className="purchase-prototype-field-input"
                    value={formData.deviceModel}
                    onChange={(e) => setFormData({ ...formData, deviceModel: e.target.value })}
                    placeholder="مثال: iPhone 13 Pro Max"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>رقم السيريال / IMEI</label>
                  <input
                    type="text"
                    dir="ltr"
                    className="purchase-prototype-field-input"
                    value={formData.serialNumber || ''}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    placeholder="354892019283741"
                  />
                </div>
              </div>

              <div>
                <PatternLockWidget
                  value={formData.passcode || ''}
                  onChange={(val) => setFormData({ ...formData, passcode: val })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>وصف العطل المشتكى منه *</label>
                <textarea
                  rows={2}
                  required
                  className="purchase-prototype-field-input"
                  value={formData.problemDescription}
                  onChange={(e) => setFormData({ ...formData, problemDescription: e.target.value })}
                  placeholder="مثال: الشاشة مكسورة ولا تستجيب للمس، أو الجهاز لا يشحن..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>ملاحظات حالة الجهاز الظاهرية</label>
                <input
                  type="text"
                  className="purchase-prototype-field-input"
                  value={formData.deviceCondition || ''}
                  onChange={(e) => setFormData({ ...formData, deviceCondition: e.target.value })}
                  placeholder="مثال: خدوش في الباغة، بدون كارت ميموري، كسر بالظهر..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>التكلفة التقديرية</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="purchase-prototype-field-input"
                    value={formData.expectedCost}
                    onChange={(e) => setFormData({ ...formData, expectedCost: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>دفعة مقدمة</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="purchase-prototype-field-input"
                    value={formData.advancePayment}
                    onChange={(e) => setFormData({ ...formData, advancePayment: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>أيام الضمان</label>
                  <input
                    type="number"
                    min="0"
                    className="purchase-prototype-field-input"
                    value={formData.warrantyDays}
                    onChange={(e) => setFormData({ ...formData, warrantyDays: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <Button type="button" variant="secondary" onClick={() => setCreateModalOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" variant="primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ واستخراج إيصال'}
                </Button>
              </div>
            </form>
          </DialogShell>
        )}

        {/* Ticket Details & Parts Drawer */}
        {selectedTicket && (
          <DialogShell open={Boolean(selectedTicket)} onClose={() => setSelectedTicket(null)} ariaLabel={`تذكرة رقم ${selectedTicket.ticketNo}`}>
            <div className="page-stack" dir="rtl" style={{ gap: '16px', maxWidth: '640px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                  🛠️ تذكرة صيانة: {selectedTicket.ticketNo}
                </h3>
                <Button variant="secondary" onClick={() => setReceiptTicket(selectedTicket)}>
                  📄 طباعة الإيصال
                </Button>
              </div>

              {/* Status Change Bar */}
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>تحديث حالة التذكرة:</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {(['received', 'inspecting', 'in_progress', 'repaired', 'delivered', 'unrepairable'] as MaintenanceStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      className={`btn btn-sm ${selectedTicket.status === st ? 'btn-primary' : 'btn-secondary'}`}
                      disabled={updateStatusMutation.isPending}
                      onClick={() => updateStatusMutation.mutate({ id: selectedTicket.id, status: st })}
                    >
                      {statusLabels[st]?.label || st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#f1f5f9', padding: '12px', borderRadius: '8px', fontSize: '0.85rem' }}>
                <div>العميل: <strong>{selectedTicket.customerName}</strong></div>
                <div>الهاتف: <strong dir="ltr">{selectedTicket.customerPhone}</strong></div>
                <div>الجهاز: <strong>{selectedTicket.deviceModel}</strong></div>
                <div>السيريال/IMEI: <strong dir="ltr">{selectedTicket.serialNumber || '—'}</strong></div>
                <div>الرمز/النمط: <strong dir="ltr">{selectedTicket.passcode || '—'}</strong></div>
                <div>الدفعة المقدمة: <strong>{selectedTicket.advancePayment.toFixed(2)} ج.م</strong></div>
              </div>

              {/* Problem */}
              <div>
                <strong style={{ color: '#dc2626', fontSize: '0.85rem' }}>وصف العطل:</strong>
                <div style={{ background: '#fef2f2', padding: '8px 12px', borderRadius: '6px', fontSize: '0.9rem', marginTop: '4px' }}>
                  {selectedTicket.problemDescription}
                </div>
              </div>

              {/* Parts Used on this Device */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 700 }}>
                  🔩 قطع الغيار المصروفة على هذا الجهاز
                </h4>

                {/* Add Part Section */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '6px', marginBottom: '8px' }}>
                  <select
                    className="purchase-prototype-field-input"
                    value={selectedProductId}
                    onChange={(e) => handleProductSelectForPart(e.target.value)}
                  >
                    <option value="">-- اختر قطعة غيار من المخزن --</option>
                    {(productsQuery.data || []).map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (متاح: {p.stock || 0}) - {p.retailPrice} ج.م
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    placeholder="الكمية"
                    className="purchase-prototype-field-input"
                    value={partQty}
                    onChange={(e) => setPartQty(Number(e.target.value))}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="السعر"
                    className="purchase-prototype-field-input"
                    value={partPrice}
                    onChange={(e) => setPartPrice(Number(e.target.value))}
                  />
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleAddPartSubmit}
                    disabled={!selectedProductId || addPartMutation.isPending}
                  >
                    + إضافة
                  </Button>
                </div>

                {/* Parts Table */}
                {(selectedTicket.parts || []).length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '6px 8px' }}>القطعة</th>
                        <th style={{ padding: '6px 8px' }}>الكمية</th>
                        <th style={{ padding: '6px 8px' }}>سعر الوحدة</th>
                        <th style={{ padding: '6px 8px' }}>الإجمالي</th>
                        <th style={{ padding: '6px 8px' }}>حذف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTicket.parts?.map((p) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 8px' }}>{p.productName}</td>
                          <td style={{ padding: '6px 8px' }}>{p.qty}</td>
                          <td style={{ padding: '6px 8px' }}>{p.unitPrice.toFixed(2)}</td>
                          <td style={{ padding: '6px 8px', fontWeight: 600 }}>{p.totalPrice.toFixed(2)}</td>
                          <td style={{ padding: '6px 8px' }}>
                            <button
                              type="button"
                              style={{ color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 700 }}
                              onClick={() => removePartMutation.mutate({ ticketId: selectedTicket.id, partId: p.id })}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>
                    لم يتم صرف أي قطع غيار على هذه التذكرة بعد.
                  </div>
                )}
              </div>

              {/* Total Settlement */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>إجمالي حساب الصيانة:</div>
                  <strong style={{ fontSize: '1.2rem', color: '#0f172a' }}>{(selectedTicket.finalCost || selectedTicket.expectedCost || 0).toFixed(2)} ج.م</strong>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.85rem', color: '#dc2626' }}>المتبقي للتحصيل:</div>
                  <strong style={{ fontSize: '1.2rem', color: '#dc2626' }}>
                    {Math.max(0, (selectedTicket.finalCost || selectedTicket.expectedCost || 0) - (selectedTicket.advancePayment || 0)).toFixed(2)} ج.م
                  </strong>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button variant="secondary" onClick={() => setSelectedTicket(null)}>
                  إغلاق
                </Button>
              </div>
            </div>
          </DialogShell>
        )}

        {/* Receipt Print Modal */}
        <MaintenanceReceiptModal
          open={Boolean(receiptTicket)}
          ticket={receiptTicket}
          settings={settingsQuery.data}
          onClose={() => setReceiptTicket(null)}
        />
      </main>
    </div>
  );
}
