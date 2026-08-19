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
import { BrandCombobox } from '@/shared/components/BrandCombobox';
import { SearchableCombobox } from '@/shared/ui/searchable-combobox';
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
  const [lockType, setLockType] = useState<'pin' | 'pattern'>('pin');

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
  const [partSearchText, setPartSearchText] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [partPrice, setPartPrice] = useState(0);
  const [editingCost, setEditingCost] = useState<number | null>(null);

  // Settlement delivery state
  const [settlementTicket, setSettlementTicket] = useState<MaintenanceTicket | null>(null);
  const [collectedAmount, setCollectedAmount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('فصال ومراضاة للعميل');
  const [customReason, setCustomReason] = useState<string>('');

  const openSettlementModal = (ticket: MaintenanceTicket) => {
    const totalCost = ticket.finalCost || ticket.expectedCost || 0;
    const advancePaid = ticket.advancePayment || 0;
    const rem = Math.max(0, totalCost - advancePaid);
    setSettlementTicket(ticket);
    setCollectedAmount(rem);
    setDiscountReason('فصال ومراضاة للعميل');
    setCustomReason('');
  };

  const handleConfirmSettlement = () => {
    if (!settlementTicket) return;
    const totalCost = settlementTicket.finalCost || settlementTicket.expectedCost || 0;
    const advancePaid = settlementTicket.advancePayment || 0;
    const rem = Math.max(0, totalCost - advancePaid);
    const diff = rem - collectedAmount;

    let notes = settlementTicket.technicianNotes || '';
    let finalCost = totalCost;

    if (diff > 0) {
      const finalReason = discountReason === 'custom' ? customReason.trim() || 'خصم عند التسليم' : discountReason;
      notes = `[خصم تسليم: ${diff.toFixed(2)} ج.م - السبب: ${finalReason}] ${notes}`.trim();
      finalCost = advancePaid + collectedAmount;
    }

    updateStatusMutation.mutate({
      id: settlementTicket.id,
      status: 'delivered',
      finalCost,
      technicianNotes: notes,
    });
    setSettlementTicket(null);
  };

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

  const inProgressCount = tickets.filter((t) => ['received', 'inspecting', 'in_progress'].includes(t.status)).length;
  const readyCount = tickets.filter((t) => t.status === 'repaired').length;
  const deliveredCount = tickets.filter((t) => t.status === 'delivered').length;
  const totalRemainingSum = tickets.reduce((acc, t) => {
    if (t.status !== 'delivered') {
      return acc + Math.max(0, (t.finalCost || t.expectedCost || 0) - (t.advancePayment || 0));
    }
    return acc;
  }, 0);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName.trim() || !formData.customerPhone.trim() || !formData.deviceModel.trim() || !formData.problemDescription.trim()) {
      alert('يرجى ملء كافة الحقول الأساسية: اسم العميل، الهاتف، موديل الجهاز، ووصف العطل');
      return;
    }
    createMutation.mutate(formData);
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

  const sendWhatsAppMessage = (ticket: MaintenanceTicket) => {
    const storeName = settingsQuery.data?.storeName || 'مركز الصيانة';
    const cleanPhone = ticket.customerPhone.replace(/\D/g, '');
    const phoneFormatted = cleanPhone.startsWith('01') ? `2${cleanPhone}` : cleanPhone;
    const totalCost = ticket.finalCost || ticket.expectedCost || 0;
    const advancePaid = ticket.advancePayment || 0;
    const remaining = Math.max(0, totalCost - advancePaid);
    const deviceName = `${ticket.deviceBrand ? `${ticket.deviceBrand} - ` : ''}${ticket.deviceModel}`.trim();

    let lines: string[] = [];
    lines.push(`مرحباً أستاذ *${ticket.customerName}*`);
    lines.push(`معك *${storeName}* بخصوص جهازك: *${deviceName}*`);
    lines.push(`▪ *كود الجهاز:* ${ticket.ticketNo}`);
    lines.push(``);

    if (ticket.status === 'unrepairable' || ticket.status === 'cancelled') {
      lines.push(`[!] *الحالة:* نعتذر منك، تعذر إصلاح الجهاز ويمكنك استلامه.`);
      if (advancePaid > 0) {
        lines.push(`▪ *المبلغ المسترد لك:* ${advancePaid.toFixed(2)} ج.م`);
        lines.push(`(يرجى التفضل بزيارة الفرع لاستلام الجهاز واسترداد العربون المدفوع بالكامل).`);
      } else {
        lines.push(`(يمكنك التفضل باستلام جهازك - لا توجد أي رسوم مطلوبة).`);
      }
    } else if (ticket.status === 'delivered') {
      lines.push(`[✓] *الحالة:* تم تسليم الجهاز بنجاح.`);
      lines.push(`▪ *إجمالي الحساب:* ${totalCost.toFixed(2)} ج.م (تم السداد بالكامل)`);
      if (ticket.warrantyDays) {
        lines.push(`▪ *فترة الضمان:* ${ticket.warrantyDays} يوماً بموجب إيصال الاستلام.`);
      }
      lines.push(``);
      lines.push(`شكراً لثقتك بنا!`);
    } else if (ticket.status === 'repaired') {
      lines.push(`[✓] *الحالة:* تم الانتهاء من صيانة جهازك بنجاح وهو جاهز للاستلام الآن!`);
      lines.push(`▪ *إجمالي حساب الصيانة:* ${totalCost.toFixed(2)} ج.م`);
      if (advancePaid > 0) {
        lines.push(`▪ *المدفوع مقدماً:* ${advancePaid.toFixed(2)} ج.م`);
      }
      if (remaining > 0) {
        lines.push(`▪ *المتبقي عند الاستلام:* ${remaining.toFixed(2)} ج.م`);
      } else {
        lines.push(`[✓] *الحساب خالص بالكامل*`);
      }
      lines.push(``);
      lines.push(`نحن بانتظارك لاستلام الجهاز في أي وقت.`);
    } else if (ticket.status === 'in_progress') {
      lines.push(`▪ *الحالة:* جهازك الآن قيد أعمال الصيانة والإصلاح.`);
      lines.push(`▪ *التكلفة التقديرية:* ${totalCost.toFixed(2)} ج.م`);
      if (advancePaid > 0) {
        lines.push(`▪ *المدفوع مقدماً:* ${advancePaid.toFixed(2)} ج.م`);
      }
      if (remaining > 0) {
        lines.push(`▪ *المتبقي المتوقع:* ${remaining.toFixed(2)} ج.م`);
      }
    } else if (ticket.status === 'inspecting') {
      lines.push(`▪ *الحالة:* جهازك الآن قيد الفحص الفني والتسعير.`);
      if (totalCost > 0) {
        lines.push(`▪ *التكلفة المبدئية المتوقعة:* ${totalCost.toFixed(2)} ج.م`);
      }
    } else {
      // received
      lines.push(`[✓] *الحالة:* تم استلام جهازك بنجاح في قسم الصيانة وجارٍ الفحص.`);
      if (totalCost > 0) {
        lines.push(`▪ *التكلفة التقديرية:* ${totalCost.toFixed(2)} ج.م`);
      }
      if (advancePaid > 0) {
        lines.push(`▪ *العربون المدفوع:* ${advancePaid.toFixed(2)} ج.م`);
      }
    }

    lines.push(``);
    lines.push(`نسعد دائماً بخدمتكم!`);

    const message = lines.join('\n');
    const url = `https://api.whatsapp.com/send/?phone=${phoneFormatted}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const statusLabels: Record<MaintenanceStatus, { label: string; bg: string; color: string }> = {
    received: { label: 'استلام جديد', bg: '#fef9c3', color: '#854d0e' },
    inspecting: { label: 'قيد الفحص والتسعير', bg: '#e0e7ff', color: '#3730a3' },
    in_progress: { label: 'قيد الصيانة', bg: '#fef3c7', color: '#92400e' },
    repaired: { label: 'جاهز للتسليم', bg: '#dcfce7', color: '#166534' },
    delivered: { label: 'تم التسليم والتحصيل', bg: '#f1f5f9', color: '#475569' },
    unrepairable: { label: 'تعذر الإصلاح', bg: '#fee2e2', color: '#991b1b' },
    cancelled: { label: 'ملغي', bg: '#f3f4f6', color: '#6b7280' },
  };

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px', margin: '0 auto' }}>
        <PageHeader
          title="قسم الصيانة وتذاكر الإصلاح"
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

        {/* KPI Metrics Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>أجهزة قيد العمل والفحص</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#b45309', marginTop: '2px' }}>{inProgressCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>أجهزة جاهزة للتسليم</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#16a34a', marginTop: '2px' }}>{readyCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>تم تسليمها للعملاء</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#2563eb', marginTop: '2px' }}>{deliveredCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>مبالغ متبقية للتحصيل</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#dc2626', marginTop: '2px' }}>
                {totalRemainingSum.toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>ج.م</span>
              </div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button type="button" className={`btn btn-sm ${filterStatus === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setFilterStatus('all'); setPage(1); }}>الكل ({totalItems})</button>
            <button type="button" className={`btn btn-sm ${filterStatus === 'received' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setFilterStatus('received'); setPage(1); }}>استلام جديد</button>
            <button type="button" className={`btn btn-sm ${filterStatus === 'in_progress' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setFilterStatus('in_progress'); setPage(1); }}>قيد الصيانة</button>
            <button type="button" className={`btn btn-sm ${filterStatus === 'repaired' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setFilterStatus('repaired'); setPage(1); }}>جاهز للتسليم</button>
            <button type="button" className={`btn btn-sm ${filterStatus === 'delivered' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setFilterStatus('delivered'); setPage(1); }}>تم التسليم</button>
          </div>
          <div style={{ minWidth: '320px' }}>
            <input type="text" className="purchase-prototype-field-input" placeholder="بحث بكود الجهاز ZM-XXXX، العميل، الهاتف، أو IMEI..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} style={{ width: '100%', padding: '6px 12px' }} />
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                <th style={{ padding: '10px 14px' }}>كود الجهاز</th>
                <th style={{ padding: '10px 14px' }}>العميل / الهاتف</th>
                <th style={{ padding: '10px 14px' }}>الجهاز / IMEI</th>
                <th style={{ padding: '10px 14px' }}>العطل</th>
                <th style={{ padding: '10px 14px' }}>التكلفة / المدفوع / المتبقي</th>
                <th style={{ padding: '10px 14px' }}>الحالة</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>جاري تحميل تذاكر الصيانة...</td></tr>
              ) : tickets.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>لا توجد تذاكر صيانة مسجلة تطابق البحث.</td></tr>
              ) : (
                tickets.map((t) => {
                  const isDelivered = t.status === 'delivered';
                  const isCancelled = t.status === 'cancelled' || t.status === 'unrepairable';
                  const totalCost = t.finalCost || t.expectedCost || 0;
                  const advancePaid = t.advancePayment || 0;
                  const remaining = isDelivered || isCancelled ? 0 : Math.max(0, totalCost - advancePaid);
                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <button
                          type="button"
                          onClick={() => void maintenanceApi.get(t.id).then((r) => setSelectedTicket(r.ticket))}
                          title="فتح تفاصيل التذكرة"
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: '0.92rem',
                            color: '#0284c7',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'inline-block',
                          }}
                        >
                          {t.ticketNo}
                        </button>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <strong style={{ display: 'block', color: '#1e293b' }}>{t.customerName}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }} dir="ltr">{t.customerPhone}</div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '2px' }}>
                          {t.deviceBrand && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: '#f1f5f9',
                                color: '#334155',
                                border: '1px solid #e2e8f0',
                              }}
                            >
                              {t.deviceBrand}
                            </span>
                          )}
                          <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>{t.deviceModel}</strong>
                        </div>
                        {t.serialNumber && (
                          <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <span>📱</span>
                            <span dir="ltr">IMEI: {t.serialNumber}</span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.problemDescription}>
                        {t.problemDescription}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
                          {totalCost.toFixed(2)} <span style={{ fontSize: '0.7rem', color: '#64748b' }}>ج.م</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', marginTop: '2px', flexWrap: 'wrap' }}>
                          {advancePaid > 0 ? (
                            <span style={{ color: '#16a34a', fontWeight: 600 }}>
                              مدفوع: {advancePaid.toFixed(2)}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>بدون مقدم</span>
                          )}
                          <span style={{ color: '#cbd5e1' }}>•</span>
                          {isDelivered ? (
                            <span style={{ color: '#16a34a', fontWeight: 700 }}>
                              خالص ✓
                            </span>
                          ) : isCancelled ? (
                            <span style={{ color: '#94a3b8', fontWeight: 600 }}>
                              {advancePaid > 0 ? `مسترد: ${advancePaid.toFixed(2)}` : 'ملغي'}
                            </span>
                          ) : remaining > 0 ? (
                            <span style={{ color: '#dc2626', fontWeight: 700 }}>
                              متبقي: {remaining.toFixed(2)}
                            </span>
                          ) : (
                            <span style={{ color: '#16a34a', fontWeight: 700 }}>
                              خالص ✓
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <select
                          value={t.status}
                          onChange={(e) => {
                            const newStatus = e.target.value as MaintenanceStatus;
                            if (newStatus === 'delivered') {
                              openSettlementModal(t);
                            } else {
                              updateStatusMutation.mutate({ id: t.id, status: newStatus });
                            }
                          }}
                          disabled={updateStatusMutation.isPending}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: '1px solid transparent',
                            background: statusLabels[t.status]?.bg || '#f1f5f9',
                            color: statusLabels[t.status]?.color || '#334155',
                            outline: 'none',
                          }}
                        >
                          <option value="received">استلام جديد</option>
                          <option value="inspecting">قيد الفحص والتسعير</option>
                          <option value="in_progress">قيد الصيانة</option>
                          <option value="repaired">جاهز للتسليم</option>
                          <option value="delivered">تم التسليم والتحصيل</option>
                          <option value="unrepairable">تعذر الإصلاح</option>
                          <option value="cancelled">ملغي</option>
                        </select>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '4px' }}>
                          <button type="button" className="btn btn-sm btn-secondary" onClick={() => void maintenanceApi.get(t.id).then((r) => setSelectedTicket(r.ticket))}>صرف قطع / حساب</button>
                          <button type="button" className="btn btn-sm btn-secondary" title="إرسال واتساب للعميل" onClick={() => sendWhatsAppMessage(t)} style={{ color: '#16a34a' }}>واتساب 💬</button>
                          <button type="button" className="btn btn-sm btn-secondary" title="طباعة إيصال أو ستيكر" onClick={() => setReceiptTicket(t)}>إيصال / ستيكر</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {createModalOpen && (
          <DialogShell
            open={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
            width="min(1040px, 96vw)"
            ariaLabel="استلام جهاز صيانة جديد"
          >
            <div style={{ padding: '22px 28px' }}>
              <form onSubmit={handleCreateSubmit} dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                        <line x1="12" y1="18" x2="12.01" y2="18"></line>
                      </svg>
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>استلام جهاز صيانة جديد</h3>
                      <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#64748b' }}>تسجيل بيانات العميل، فحص العطل، وإصدار كود الجهاز ZM-XXXX</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', width: '34px', height: '34px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '1rem', fontWeight: 700, transition: 'all 0.15s ease' }}
                    title="إغلاق"
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        بيانات العميل
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                            اسم العميل <span style={{ color: '#dc2626' }}>*</span>
                          </label>
                          <input
                            type="text"
                            required
                            className="purchase-prototype-field-input"
                            value={formData.customerName}
                            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                            placeholder="الاسم الثلاثي أو الرباعي"
                            style={{ width: '100%', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '0.9rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                            رقم الهاتف <span style={{ color: '#dc2626' }}>*</span>
                          </label>
                          <input
                            type="tel"
                            required
                            dir="ltr"
                            className="purchase-prototype-field-input"
                            value={formData.customerPhone}
                            onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                            placeholder="01012345678"
                            style={{ width: '100%', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'right', boxSizing: 'border-box', fontSize: '0.9rem' }}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                        مواصفات الجهاز والـ IMEI
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                            الماركة
                          </label>
                          <BrandCombobox
                            value={formData.deviceBrand || ''}
                            onChange={(val) => setFormData({ ...formData, deviceBrand: val })}
                            placeholder="...Apple, Samsung"
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                            موديل الجهاز <span style={{ color: '#dc2626' }}>*</span>
                          </label>
                          <input
                            type="text"
                            required
                            className="purchase-prototype-field-input"
                            value={formData.deviceModel}
                            onChange={(e) => setFormData({ ...formData, deviceModel: e.target.value })}
                            placeholder="iPhone 13 Pro Max"
                            style={{ width: '100%', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '0.9rem' }}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                          السيريال / IMEI (مسح بالسكانر أو كتابة)
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          className="purchase-prototype-field-input"
                          value={formData.serialNumber || ''}
                          onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                          placeholder="354092019203741"
                          style={{ width: '100%', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.9rem', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        الفحص وحالة الجهاز
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                          وصف العطل المشتكى منه <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <input
                          type="text"
                          required
                          className="purchase-prototype-field-input"
                          value={formData.problemDescription}
                          onChange={(e) => setFormData({ ...formData, problemDescription: e.target.value })}
                          placeholder="مثال: الشاشة مكسورة، أو الجهاز فاصل شحن..."
                          style={{ width: '100%', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '0.9rem' }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                            حالة الجهاز الظاهرية (خدوش، ملحقات)
                          </label>
                          <input
                            type="text"
                            className="purchase-prototype-field-input"
                            value={formData.deviceCondition || ''}
                            onChange={(e) => setFormData({ ...formData, deviceCondition: e.target.value })}
                            placeholder="مثال: خدوش بالظهر، مستلم بدون شاحن..."
                            style={{ width: '100%', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '0.9rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                            الفني المسؤول (اختياري)
                          </label>
                          <input
                            type="text"
                            className="purchase-prototype-field-input"
                            value={formData.technicianName || ''}
                            onChange={(e) => setFormData({ ...formData, technicianName: e.target.value })}
                            placeholder="اسم الفني..."
                            style={{ width: '100%', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '0.9rem' }}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '0.825rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                          رمز أو قفل الشاشة (Screen Lock)
                        </label>
                        <div style={{ display: 'flex', gap: '4px', background: '#e2e8f0', padding: '2px', borderRadius: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setLockType('pin')}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              border: 'none',
                              background: lockType === 'pin' ? '#fff' : 'transparent',
                              fontWeight: lockType === 'pin' ? 700 : 500,
                              color: lockType === 'pin' ? '#0f172a' : '#64748b',
                              boxShadow: lockType === 'pin' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                            }}
                          >
                            كلمة المرور / PIN
                          </button>
                          <button
                            type="button"
                            onClick={() => setLockType('pattern')}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              border: 'none',
                              background: lockType === 'pattern' ? '#fff' : 'transparent',
                              fontWeight: lockType === 'pattern' ? 700 : 500,
                              color: lockType === 'pattern' ? '#0f172a' : '#64748b',
                              boxShadow: lockType === 'pattern' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                            }}
                          >
                            نمط الشاشة (Pattern)
                          </button>
                        </div>
                      </div>

                      {lockType === 'pin' ? (
                        <div>
                          <input
                            type="text"
                            dir="ltr"
                            className="purchase-prototype-field-input"
                            value={formData.passcode || ''}
                            onChange={(e) => setFormData({ ...formData, passcode: e.target.value })}
                            placeholder="أو لا يوجد قفل، مثال: 1234 أو Passcode..."
                            style={{ width: '100%', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.9rem', boxSizing: 'border-box' }}
                          />
                        </div>
                      ) : (
                        <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <PatternLockWidget
                            value={formData.passcode || ''}
                            onChange={(pat) => setFormData({ ...formData, passcode: pat })}
                          />
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            النمط المسجل: <strong dir="ltr" style={{ color: '#2563eb', fontFamily: 'monospace' }}>{formData.passcode || 'لم يتم الرسم بعد'}</strong>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    الحساب المالي وفترة الضمان
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    <div style={{ background: '#fff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        التكلفة التقديرية
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="purchase-prototype-field-input"
                          value={formData.expectedCost || ''}
                          onChange={(e) => setFormData({ ...formData, expectedCost: Number(e.target.value) })}
                          placeholder="0.00"
                          style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 700, fontSize: '0.95rem' }}
                        />
                        <span style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>ج.م</span>
                      </div>
                    </div>

                    <div style={{ background: '#fff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        الدفعة المقدمة
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="purchase-prototype-field-input"
                          value={formData.advancePayment || ''}
                          onChange={(e) => setFormData({ ...formData, advancePayment: Number(e.target.value) })}
                          placeholder="0.00"
                          style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 700, fontSize: '0.95rem' }}
                        />
                        <span style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>ج.م</span>
                      </div>
                    </div>

                    <div style={{ background: '#fff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        المتبقي التقديري
                      </label>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#2563eb', lineHeight: 1.3 }}>
                        {Math.max(0, (formData.expectedCost || 0) - (formData.advancePayment || 0)).toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>ج.م</span>
                      </div>
                    </div>

                    <div style={{ background: '#fff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        فترة الضمان
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="number"
                          min="0"
                          className="purchase-prototype-field-input"
                          value={formData.warrantyDays || 30}
                          onChange={(e) => setFormData({ ...formData, warrantyDays: Number(e.target.value) })}
                          style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 700, fontSize: '0.95rem' }}
                        />
                        <span style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>يوم</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                  <Button type="button" variant="secondary" onClick={() => setCreateModalOpen(false)} style={{ padding: '8px 24px', fontSize: '0.9rem' }}>
                    إلغاء
                  </Button>
                  <Button type="submit" variant="primary" disabled={createMutation.isPending} style={{ padding: '8px 28px', fontWeight: 700, fontSize: '0.9rem' }}>
                    {createMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ واستخراج إيصال الاستلام'}
                  </Button>
                </div>
              </form>
            </div>
          </DialogShell>
        )}

        {selectedTicket && (
          <DialogShell
            open={Boolean(selectedTicket)}
            onClose={() => setSelectedTicket(null)}
            width="min(860px, 95vw)"
            ariaLabel={`تذكرة رقم ${selectedTicket.ticketNo}`}
          >
            <div className="page-stack" dir="rtl" style={{ gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                      بطاقة صيانة الجهاز: <span style={{ fontFamily: 'monospace', color: '#0284c7', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '6px' }}>{selectedTicket.ticketNo}</span>
                    </h3>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: statusLabels[selectedTicket.status]?.bg || '#f1f5f9',
                        color: statusLabels[selectedTicket.status]?.color || '#334155',
                      }}
                    >
                      {statusLabels[selectedTicket.status]?.label || selectedTicket.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                    تاريخ الاستلام: {new Date(selectedTicket.receivedAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    variant="secondary"
                    onClick={() => sendWhatsAppMessage(selectedTicket)}
                    style={{ fontSize: '0.85rem', color: '#16a34a', borderColor: '#86efac', background: '#f0fdf4', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    إرسال واتساب للعميل 💬
                  </Button>
                  <Button variant="secondary" onClick={() => setReceiptTicket(selectedTicket)} style={{ fontSize: '0.85rem' }}>
                    طباعة إيصال / ستيكر
                  </Button>
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '1rem', fontWeight: 700 }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  مرحلة عمل وصيانة الجهاز:
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {(['received', 'inspecting', 'in_progress', 'repaired', 'delivered', 'unrepairable'] as MaintenanceStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      className={`btn btn-sm ${selectedTicket.status === st ? 'btn-primary' : 'btn-secondary'}`}
                      disabled={updateStatusMutation.isPending}
                      onClick={() => updateStatusMutation.mutate({ id: selectedTicket.id, status: st })}
                      style={{ fontSize: '0.8rem', padding: '4px 12px' }}
                    >
                      {statusLabels[st]?.label || st}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', fontSize: '0.85rem' }}>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    العميل:
                  </div>
                  <strong>{selectedTicket.customerName}</strong>
                  <div style={{ color: '#475569', fontSize: '0.8rem' }} dir="ltr">{selectedTicket.customerPhone}</div>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                    الجهاز:
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '2px' }}>
                    {selectedTicket.deviceBrand && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: '#f1f5f9',
                          color: '#334155',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        {selectedTicket.deviceBrand}
                      </span>
                    )}
                    <strong>{selectedTicket.deviceModel}</strong>
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <span>📱</span>
                    <span dir="ltr">IMEI: {selectedTicket.serialNumber || '—'}</span>
                  </div>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    قفل الشاشة:
                  </div>
                  <strong dir="ltr" style={{ color: '#2563eb' }}>{selectedTicket.passcode || 'بدون قفل'}</strong>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    فترة الضمان:
                  </div>
                  <strong>{selectedTicket.warrantyDays || 30} يوماً</strong>
                </div>
              </div>

              <div>
                <div style={{ color: '#dc2626', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>عطل الجهاز المشتكى منه:</div>
                <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', padding: '8px 12px', borderRadius: '6px', fontSize: '0.875rem', color: '#991b1b' }}>
                  {selectedTicket.problemDescription}
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                    صرف قطع الغيار من المخزن على الكود ({selectedTicket.ticketNo})
                  </h4>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{(selectedTicket.parts || []).length} قطعة مسجلة</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 85px 105px auto', gap: '8px', marginBottom: '10px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', alignItems: 'center' }}>
                  <SearchableCombobox
                    inline
                    inputClassName="purchase-prototype-field-input"
                    placeholder="ابحث عن قطعة غيار في المخزن بالاسم أو الباركود..."
                    value={partSearchText}
                    onChange={setPartSearchText}
                    options={(productsQuery.data || []).map((p: any) => ({
                      id: String(p.id),
                      name: p.name,
                      stock: p.stock ?? p.stock_qty ?? 0,
                      retailPrice: p.retailPrice ?? p.retail_price ?? 0,
                      barcode: p.barcode || '',
                    }))}
                    getLabel={(p) => `${p.name} (متاح: ${p.stock}) - ${p.retailPrice} ج.م`}
                    getMeta={(p) => `${p.barcode} ${p.name}`}
                    onSelect={(p) => {
                      setSelectedProductId(p.id);
                      setPartSearchText(p.name);
                      setPartPrice(Number(p.retailPrice || 0));
                    }}
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="الكمية"
                    className="purchase-prototype-field-input"
                    value={partQty}
                    onChange={(e) => setPartQty(Number(e.target.value))}
                    style={{ height: '38px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', margin: 0 }}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="السعر"
                    className="purchase-prototype-field-input"
                    value={partPrice}
                    onChange={(e) => setPartPrice(Number(e.target.value))}
                    style={{ height: '38px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', margin: 0 }}
                  />
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => {
                      handleAddPartSubmit();
                      setPartSearchText('');
                    }}
                    disabled={!selectedProductId || addPartMutation.isPending}
                    style={{ height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', margin: 0 }}
                  >
                    {addPartMutation.isPending ? 'جاري الصرف...' : '+ صرف على الجهاز'}
                  </Button>
                </div>

                {(selectedTicket.parts || []).length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                        <th style={{ padding: '8px 10px' }}>القطعة</th>
                        <th style={{ padding: '8px 10px' }}>الكمية</th>
                        <th style={{ padding: '8px 10px' }}>سعر الوحدة</th>
                        <th style={{ padding: '8px 10px' }}>الإجمالي</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>إلغاء الصرف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTicket.parts?.map((p) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 600 }}>{p.productName}</td>
                          <td style={{ padding: '8px 10px' }}>{p.qty}</td>
                          <td style={{ padding: '8px 10px' }}>{p.unitPrice.toFixed(2)} ج.م</td>
                          <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>{p.totalPrice.toFixed(2)} ج.م</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <button
                              type="button"
                              style={{ color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}
                              onClick={() => removePartMutation.mutate({ ticketId: selectedTicket.id, partId: p.id })}
                              title="إلغاء وإرجاع للمخزن"
                            >
                              ✕ إرجاع
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '12px', background: '#f8fafc', borderRadius: '6px' }}>
                    لم يتم صرف أي قطع غيار على هذا الجهاز بعد.
                  </div>
                )}
              </div>

              {(() => {
                const totalCost = selectedTicket.finalCost || selectedTicket.expectedCost || 0;
                const partsCost = (selectedTicket.parts || []).reduce((acc, p) => acc + (p.qty * p.unitCost), 0);
                const partsPrice = (selectedTicket.parts || []).reduce((acc, p) => acc + (p.qty * p.unitPrice), 0);
                const laborPrice = Math.max(0, totalCost - partsPrice);
                const technicianCommission = laborPrice * 0.3; 
                const storeProfit = Math.max(0, totalCost - partsCost - technicianCommission);

                return (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                        حساب أرباح الصيانة وعمولة الفني:
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                        <span style={{ color: '#64748b' }}>تعديل إجمالي الحساب:</span>
                        <input
                          type="number"
                          min="0"
                          step="10"
                          className="purchase-prototype-field-input"
                          value={editingCost ?? totalCost}
                          onChange={(e) => setEditingCost(Number(e.target.value))}
                          style={{ width: '90px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: 700, textAlign: 'center' }}
                        />
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          disabled={editingCost === null || editingCost === totalCost || updateStatusMutation.isPending}
                          onClick={() => {
                            if (editingCost !== null) {
                              updateStatusMutation.mutate({ id: selectedTicket.id, status: selectedTicket.status, finalCost: editingCost });
                              setEditingCost(null);
                            }
                          }}
                          style={{ padding: '3px 10px', fontSize: '0.75rem' }}
                        >
                          تحديث الحساب
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '0.8rem', textAlign: 'center' }}>
                      <div style={{ background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#64748b' }}>تكلفة قطع الغيار</div>
                        <strong style={{ color: '#0f172a' }}>{partsCost.toFixed(2)} ج.م</strong>
                      </div>
                      <div style={{ background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#64748b' }}>صافي المصنعية</div>
                        <strong style={{ color: '#0284c7' }}>{laborPrice.toFixed(2)} ج.م</strong>
                      </div>
                      <div style={{ background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#64748b' }}>عمولة الفني (30%)</div>
                        <strong style={{ color: '#d97706' }}>{technicianCommission.toFixed(2)} ج.م</strong>
                      </div>
                      <div style={{ background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#64748b' }}>صافي ربح المحل</div>
                        <strong style={{ color: '#16a34a' }}>{storeProfit.toFixed(2)} ج.م</strong>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {selectedTicket.status === 'delivered' ? (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>إجمالي حساب الصيانة والتسليم:</div>
                    <strong style={{ fontSize: '1.25rem', color: '#14532d' }}>
                      {(selectedTicket.finalCost || selectedTicket.expectedCost || 0).toFixed(2)} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>ج.م</span>
                    </strong>
                    <div style={{ fontSize: '0.78rem', color: '#16a34a', marginTop: '2px', fontWeight: 700 }}>
                      ✓ تم السداد والتحصيل في الخزينة بالكامل
                      {selectedTicket.advancePayment > 0 && ` (مقدم: ${selectedTicket.advancePayment.toFixed(2)} ج.م + عند الاستلام: ${(Math.max(0, (selectedTicket.finalCost || selectedTicket.expectedCost || 0) - selectedTicket.advancePayment)).toFixed(2)} ج.م)`}
                    </div>
                    {selectedTicket.technicianNotes && selectedTicket.technicianNotes.includes('[خصم تسليم:') && (
                      <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '4px', background: '#fef3c7', padding: '3px 8px', borderRadius: '4px', display: 'inline-block' }}>
                        📝 {selectedTicket.technicianNotes}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 700 }}>الرصيد المتبقي:</div>
                      <strong style={{ fontSize: '1.35rem', color: '#16a34a', fontWeight: 800 }}>
                        0.00 <span style={{ fontSize: '0.85rem' }}>ج.م (خالص)</span>
                      </strong>
                    </div>
                    <span style={{ padding: '8px 16px', borderRadius: '8px', background: '#dcfce7', color: '#166534', fontWeight: 800, fontSize: '0.9rem', border: '1px solid #86efac' }}>
                      ✓ تم تسليم الجهاز والتحصيل
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>إجمالي حساب الصيانة والقطع:</div>
                    <strong style={{ fontSize: '1.25rem', color: '#0f172a' }}>
                      {(selectedTicket.finalCost || selectedTicket.expectedCost || 0).toFixed(2)} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>ج.م</span>
                    </strong>
                    {selectedTicket.advancePayment > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: '2px' }}>
                        (المدفوع مقدماً: {selectedTicket.advancePayment.toFixed(2)} ج.م)
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 700 }}>المتبقي للتحصيل:</div>
                      <strong style={{ fontSize: '1.35rem', color: '#dc2626', fontWeight: 800 }}>
                        {Math.max(0, (selectedTicket.finalCost || selectedTicket.expectedCost || 0) - (selectedTicket.advancePayment || 0)).toFixed(2)} <span style={{ fontSize: '0.85rem' }}>ج.م</span>
                      </strong>
                    </div>

                    <Button
                      variant="primary"
                      onClick={() => openSettlementModal(selectedTicket)}
                      disabled={updateStatusMutation.isPending}
                      style={{ padding: '8px 18px', fontWeight: 700, fontSize: '0.9rem', background: '#16a34a', borderColor: '#16a34a' }}
                    >
                      ✓ تسليم الجهاز والتحصيل
                    </Button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button variant="secondary" onClick={() => setSelectedTicket(null)}>
                  إغلاق
                </Button>
              </div>
            </div>
          </DialogShell>
        )}

        {/* Delivery & Settlement Modal */}
        {settlementTicket && (
          <DialogShell
            open={Boolean(settlementTicket)}
            onClose={() => setSettlementTicket(null)}
            width="min(520px, 95vw)"
            ariaLabel="تأكيد تحصيل وتسليم جهاز الصيانة"
          >
            <div className="page-stack" dir="rtl" style={{ gap: '14px', padding: '18px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800 }}>
                    ✓
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                      تحصيل وتسليم الجهاز: <span style={{ fontFamily: 'monospace', color: '#0284c7' }}>{settlementTicket.ticketNo}</span>
                    </h3>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      العميل: <strong>{settlementTicket.customerName}</strong> ({settlementTicket.deviceBrand ? `${settlementTicket.deviceBrand} ` : ''}{settlementTicket.deviceModel})
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSettlementTicket(null)}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 700 }}
                >
                  ✕
                </button>
              </div>

              {(() => {
                const totalCost = settlementTicket.finalCost || settlementTicket.expectedCost || 0;
                const advancePaid = settlementTicket.advancePayment || 0;
                const expectedRem = Math.max(0, totalCost - advancePaid);
                const diff = expectedRem - collectedAmount;

                return (
                  <>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center', fontSize: '0.8rem' }}>
                      <div style={{ background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#64748b' }}>إجمالي الحساب</div>
                        <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{totalCost.toFixed(2)} ج.م</strong>
                      </div>
                      <div style={{ background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#64748b' }}>المدفوع مقدماً</div>
                        <strong style={{ fontSize: '0.95rem', color: '#16a34a' }}>{advancePaid.toFixed(2)} ج.م</strong>
                      </div>
                      <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                        <div style={{ color: '#1e40af' }}>المطلوب تحصيله</div>
                        <strong style={{ fontSize: '1rem', color: '#1d4ed8' }}>{expectedRem.toFixed(2)} ج.م</strong>
                      </div>
                    </div>

                    <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        💵 المبلغ المستلم فعلياً من العميل الآن:
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="number"
                          min="0"
                          step="5"
                          className="purchase-prototype-field-input"
                          value={collectedAmount}
                          onChange={(e) => setCollectedAmount(Number(e.target.value))}
                          style={{ width: '100%', height: '40px', fontSize: '1.15rem', fontWeight: 800, padding: '0 12px', borderRadius: '6px', border: '2px solid #3b82f6', color: '#0f172a' }}
                        />
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#64748b', whiteSpace: 'nowrap' }}>ج.م</span>
                      </div>
                    </div>

                    {diff > 0 && (
                      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#b45309', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            ⚠️ فرق / خصم ممنوح للعميل:
                          </span>
                          <strong style={{ fontSize: '1rem', color: '#d97706' }}>{diff.toFixed(2)} ج.م</strong>
                        </div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#92400e', marginBottom: '4px' }}>
                          اختر سبب الخصم / الفرق:
                        </label>
                        <select
                          value={discountReason}
                          onChange={(e) => setDiscountReason(e.target.value)}
                          className="purchase-prototype-field-input"
                          style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #fcd34d', background: '#fff', fontWeight: 600, fontSize: '0.85rem', marginBottom: discountReason === 'custom' ? '8px' : '0' }}
                        >
                          <option value="فصال ومراضاة للعميل">فصال ومراضاة للعميل (خصم مسموح به)</option>
                          <option value="خصم عميل مميز / إكرامية">خصم عميل مميز / إكرامية</option>
                          <option value="تقريب كسور وفكة">تقريب كسور وفكة</option>
                          <option value="custom">سبب آخر (اكتب يدوياً)</option>
                        </select>
                        {discountReason === 'custom' && (
                          <input
                            type="text"
                            placeholder="اكتب سبب الخصم..."
                            value={customReason}
                            onChange={(e) => setCustomReason(e.target.value)}
                            className="purchase-prototype-field-input"
                            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #fcd34d', background: '#fff', fontSize: '0.85rem' }}
                          />
                        )}
                      </div>
                    )}

                    {diff < 0 && (
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#166534' }}>باقي مستحق للعميل:</span>
                        <strong style={{ fontSize: '1rem', color: '#16a34a' }}>{Math.abs(diff).toFixed(2)} ج.م</strong>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                      <Button type="button" variant="secondary" onClick={() => setSettlementTicket(null)}>
                        إلغاء
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={handleConfirmSettlement}
                        disabled={updateStatusMutation.isPending}
                        style={{ padding: '8px 24px', fontWeight: 800, fontSize: '0.92rem', background: '#16a34a', borderColor: '#16a34a' }}
                      >
                        {updateStatusMutation.isPending ? 'جاري التحصيل...' : '✓ تأكيد التحصيل والتسليم النهائي'}
                      </Button>
                    </div>
                  </>
                );
              })()}
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
