import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { DialogShell } from '@/shared/components/dialog-shell';
import { useSettingsQuery, useProductsQuery } from '@/shared/hooks/use-catalog-queries';
import { useAppToolbar } from '@/stores/toolbar-store';
import { maintenanceApi, type UpsertMaintenanceTicketPayload } from '../api/maintenance.api';
import { MaintenanceReceiptModal, extractTicketDiscount } from '../components/MaintenanceReceiptModal';
import { PatternLockWidget } from '../components/PatternLockWidget';
import { BrandCombobox } from '@/shared/components/BrandCombobox';
import { SearchableCombobox } from '@/shared/ui/searchable-combobox';
import type { MaintenanceTicket, MaintenanceStatus } from '@/types/domain-models/maintenance';
import { getMaintenanceProfile } from '../constants/maintenance-profiles';

// Premium Minimal Vector SVG Icons (Eye-friendly, 1.5 - 1.75 stroke)
const Icons = {
  Wrench: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  CheckCircle: () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  DeliveryBox: () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  ),
  Coins: () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
      <path d="M7 6h1v4" />
      <path d="M16.7 13.8a4 4 0 0 0-4-4" />
    </svg>
  ),
  WhatsApp: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#16a34a" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  Printer: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Device: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Lock: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  ChevronDown: () => (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  Refresh: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Copy: () => (
    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
};

const statusConfig: Record<MaintenanceStatus, { label: string; bg: string; border: string; color: string; dot: string }> = {
  received: {
    label: 'استلام جديد',
    bg: '#f0f9ff',
    border: '#bae6fd',
    color: '#0369a1',
    dot: '#0ea5e9',
  },
  inspecting: {
    label: 'قيد الفحص والتسعير',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    color: '#6d28d9',
    dot: '#8b5cf6',
  },
  in_progress: {
    label: 'قيد الصيانة',
    bg: '#fffbeb',
    border: '#fde68a',
    color: '#92400e',
    dot: '#d97706',
  },
  repaired: {
    label: 'جاهز للتسليم',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    color: '#065f46',
    dot: '#10b981',
  },
  delivered: {
    label: 'تم التسليم والتحصيل',
    bg: '#f8fafc',
    border: '#e2e8f0',
    color: '#475569',
    dot: '#94a3b8',
  },
  unrepairable: {
    label: 'تعذر الإصلاح',
    bg: '#fff1f2',
    border: '#fecdd3',
    color: '#9f1239',
    dot: '#e11d48',
  },
  cancelled: {
    label: 'ملغي',
    bg: '#f8fafc',
    border: '#e2e8f0',
    color: '#64748b',
    dot: '#cbd5e1',
  },
};

export function MaintenanceTicketsPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useSettingsQuery();
  const productsQuery = useProductsQuery();

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

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

  // Quick suggestions popover toggles
  const [showFaultsPopover, setShowFaultsPopover] = useState(false);
  const [showAccessoriesPopover, setShowAccessoriesPopover] = useState(false);

  const handleCopyPhone = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

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

    if (diff > 0) {
      const finalReason = discountReason === 'custom' ? customReason.trim() || 'خصم عند التسليم' : discountReason;
      notes = `[خصم تسليم: ${diff.toFixed(2)} ج.م - السبب: ${finalReason}] ${notes}`.trim();
    }

    updateStatusMutation.mutate({
      id: settlementTicket.id,
      status: 'delivered',
      finalCost: totalCost,
      collectedAmount,
      technicianNotes: notes,
    });
    setSettlementTicket(null);
  };

  const maintenanceProfile = getMaintenanceProfile(settingsQuery.data?.maintenanceProfile);
  useAppToolbar([{ label: maintenanceProfile.title }]);

  const { data, isLoading, refetch, isRefetching } = useQuery({
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
      void maintenanceApi.get(res.id).then((r) => setReceiptTicket(r.ticket));
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, finalCost, collectedAmount, technicianNotes }: { id: string; status: MaintenanceStatus; finalCost?: number; collectedAmount?: number; technicianNotes?: string }) =>
      maintenanceApi.updateStatus(id, { status, finalCost, collectedAmount, technicianNotes }),
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

  const receivedCount = tickets.filter((t) => t.status === 'received').length;
  const inProgressCount = tickets.filter((t) => ['inspecting', 'in_progress'].includes(t.status)).length;
  const readyCount = tickets.filter((t) => t.status === 'repaired').length;
  const deliveredCount = tickets.filter((t) => t.status === 'delivered').length;
  const totalRemainingSum = tickets.reduce((acc, t) => {
    if (!['delivered', 'unrepairable', 'cancelled'].includes(t.status)) {
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
    lines.push(`- *كود الجهاز:* ${ticket.ticketNo}`);
    lines.push(`----------------------------------------`);

    if (ticket.status === 'unrepairable' || ticket.status === 'cancelled') {
      lines.push(`- *الحالة:* نعتذر منك، تعذر إصلاح الجهاز ويمكنك استلامه.`);
      if (advancePaid > 0) {
        lines.push(`- *المبلغ المسترد لك:* ${advancePaid.toFixed(2)} ج.م`);
        lines.push(`(يرجى التفضل بزيارة الفرع لاستلام الجهاز واسترداد العربون المدفوع بالكامل).`);
      } else {
        lines.push(`(يمكنك التفضل باستلام جهازك - لا توجد أي رسوم مطلوبة).`);
      }
    } else if (ticket.status === 'delivered') {
      lines.push(`- *الحالة:* تم تسليم الجهاز بنجاح.`);
      lines.push(`- *إجمالي الحساب:* ${totalCost.toFixed(2)} ج.م (تم السداد بالكامل)`);
      if (ticket.warrantyDays) {
        lines.push(`- *فترة الضمان:* ${ticket.warrantyDays} يوماً بموجب إيصال الاستلام.`);
      }
      lines.push(`----------------------------------------`);
      lines.push(`شكراً لثقتك بنا!`);
    } else if (ticket.status === 'repaired') {
      lines.push(`- *الحالة:* تم الانتهاء من صيانة جهازك بنجاح وهو جاهز للاستلام الآن!`);
      lines.push(`- *إجمالي حساب الصيانة:* ${totalCost.toFixed(2)} ج.م`);
      if (advancePaid > 0) {
        lines.push(`- *المدفوع مقدماً:* ${advancePaid.toFixed(2)} ج.م`);
      }
      if (remaining > 0) {
        lines.push(`- *المتبقي عند الاستلام:* ${remaining.toFixed(2)} ج.م`);
      } else {
        lines.push(`- *الحساب خالص بالكامل*`);
      }
      lines.push(`----------------------------------------`);
      lines.push(`نحن بانتظارك لاستلام الجهاز في أي وقت.`);
    } else if (ticket.status === 'in_progress') {
      lines.push(`- *الحالة:* جهازك الآن قيد أعمال الصيانة والإصلاح.`);
      lines.push(`- *التكلفة التقديرية:* ${totalCost.toFixed(2)} ج.م`);
      if (advancePaid > 0) {
        lines.push(`- *المدفوع مقدماً:* ${advancePaid.toFixed(2)} ج.م`);
      }
      if (remaining > 0) {
        lines.push(`- *المتبقي المتوقع:* ${remaining.toFixed(2)} ج.م`);
      }
    } else if (ticket.status === 'inspecting') {
      lines.push(`- *الحالة:* جهازك الآن قيد الفحص الفني والتسعير.`);
      if (totalCost > 0) {
        lines.push(`- *التكلفة المبدئية المتوقعة:* ${totalCost.toFixed(2)} ج.م`);
      }
    } else {
      lines.push(`- *الحالة:* تم استلام جهازك بنجاح في قسم الصيانة وجارٍ الفحص.`);
      if (totalCost > 0) {
        lines.push(`- *التكلفة التقديرية:* ${totalCost.toFixed(2)} ج.م`);
      }
      if (advancePaid > 0) {
        lines.push(`- *العربون المدفوع:* ${advancePaid.toFixed(2)} ج.م`);
      }
    }

    lines.push(`----------------------------------------`);
    lines.push(`*نسعد دائماً بخدمتكم!*`);

    const message = lines.join('\n');
    const url = `https://api.whatsapp.com/send/?phone=${phoneFormatted}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '80px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        <PageHeader
          title={maintenanceProfile.title}
          description={maintenanceProfile.subtitle}
          badge={<span className="nav-pill" style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}>{totalItems} تذكرة</span>}
          actions={
            <div className="actions compact-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              >
                <Icons.Plus />
                <span>استلام جهاز صيانة جديد</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => void refetch()}
                disabled={isRefetching}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Icons.Refresh />
                <span>تحديث</span>
              </Button>
            </div>
          }
        />

        {/* KPI Metrics Summary Cards - Calm, Enterprise Dashboard Style */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '14px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>أجهزة قيد العمل والفحص</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{inProgressCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <Icons.Clock />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>أجهزة جاهزة للتسليم</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{readyCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <Icons.CheckCircle />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>تم تسليمها للعملاء</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{deliveredCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <Icons.DeliveryBox />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>مبالغ متبقية للتحصيل</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                {totalRemainingSum.toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>ج.م</span>
              </div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <Icons.Coins />
            </div>
          </div>
        </div>

        {/* Filter Toolbar & Search Bar - Calm Neutral Styling with Mini Badges */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', gap: '4px', background: '#f8fafc', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            {[
              { key: 'all', label: 'الكل', count: totalItems },
              { key: 'received', label: 'استلام جديد', count: receivedCount },
              { key: 'in_progress', label: 'قيد الصيانة', count: inProgressCount },
              { key: 'repaired', label: 'جاهز للتسليم', count: readyCount },
              { key: 'delivered', label: 'تم التسليم', count: deliveredCount },
            ].map((tab) => {
              const active = filterStatus === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => { setFilterStatus(tab.key); setPage(1); }}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: active ? 700 : 500,
                    border: active ? '1px solid #cbd5e1' : '1px solid transparent',
                    background: active ? '#ffffff' : 'transparent',
                    color: active ? '#0f172a' : '#64748b',
                    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>{tab.label}</span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: '10px',
                      background: active ? '#0f172a' : '#e2e8f0',
                      color: active ? '#ffffff' : '#475569',
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ position: 'relative', minWidth: '320px', flex: '1', maxWidth: '420px' }}>
            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
              <Icons.Search />
            </span>
            <input
              type="text"
              placeholder={`بحث بكود ZM-XXXX، العميل، الهاتف، أو ${maintenanceProfile.serialLabel}...`}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              style={{
                width: '100%',
                padding: '7px 34px 7px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
                background: '#ffffff',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Tickets Table */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.8rem', fontWeight: 700 }}>
                  <th style={{ padding: '10px 14px', width: '105px' }}>كود الجهاز</th>
                  <th style={{ padding: '10px 14px', width: '160px' }}>العميل / الهاتف</th>
                  <th style={{ padding: '10px 14px', width: '180px' }}>الجهاز / {maintenanceProfile.serialLabel}</th>
                  <th style={{ padding: '10px 14px', minWidth: '140px' }}>العطل المشتكى منه</th>
                  <th style={{ padding: '10px 14px', width: '150px' }}>الحساب المالي</th>
                  <th style={{ padding: '10px 14px', width: '165px' }}>حالة الصيانة</th>
                  <th style={{ padding: '10px 14px', width: '185px', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                        <Icons.Refresh />
                        <span>جاري تحميل تذاكر الصيانة...</span>
                      </div>
                    </td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '44px', textAlign: 'center', color: '#64748b' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>لا توجد تذاكر صيانة مسجلة</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>استخدم زر "استلام جهاز صيانة جديد" لفتح تذكرة جديدة.</div>
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => {
                    const isDelivered = t.status === 'delivered';
                    const isCancelled = t.status === 'cancelled';
                    const isUnrepairable = t.status === 'unrepairable';
                    const isTerminated = isCancelled || isUnrepairable;
                    const totalCost = t.finalCost || t.expectedCost || 0;
                    const advancePaid = t.advancePayment || 0;
                    const remaining = isDelivered || isTerminated ? 0 : Math.max(0, totalCost - advancePaid);
                    const cfg = statusConfig[t.status] || statusConfig.received;

                    return (
                      <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}>
                        {/* Code */}
                        <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => void maintenanceApi.get(t.id).then((r) => setSelectedTicket(r.ticket))}
                            title="فتح بطاقة الجهاز وإدارة الصيانة"
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '0.825rem',
                              color: '#0f172a',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              padding: '3px 8px',
                              borderRadius: '5px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>{t.ticketNo}</span>
                          </button>
                        </td>

                        {/* Customer with Click-to-copy */}
                        <td style={{ padding: '11px 14px' }}>
                          <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.85rem' }}>{t.customerName}</strong>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                            <button
                              type="button"
                              onClick={(e) => handleCopyPhone(t.customerPhone, e)}
                              title="اضغط لنسخ رقم الهاتف"
                              style={{
                                fontFamily: 'monospace',
                                fontSize: '0.75rem',
                                color: '#64748b',
                                background: 'transparent',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <span dir="ltr">{t.customerPhone}</span>
                              {copiedPhone === t.customerPhone ? (
                                <span style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 700 }}>تم النسخ ✓</span>
                              ) : (
                                <Icons.Copy />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Device */}
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginBottom: '1px' }}>
                            {t.deviceBrand && (
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  background: '#f1f5f9',
                                  color: '#475569',
                                  border: '1px solid #e2e8f0',
                                }}
                              >
                                {t.deviceBrand}
                              </span>
                            )}
                            <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{t.deviceModel}</strong>
                          </div>
                          {t.serialNumber && (
                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>
                              <span dir="ltr">{t.serialNumber}</span>
                            </div>
                          )}
                        </td>

                        {/* Problem */}
                        <td style={{ padding: '11px 14px', maxWidth: '200px' }} title={t.problemDescription}>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#334155', fontSize: '0.8rem' }}>
                            {t.problemDescription}
                          </div>
                        </td>

                        {/* Financials */}
                        <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                          {isTerminated ? (
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.8rem', color: isUnrepairable ? '#9f1239' : '#64748b' }}>
                                {isUnrepairable ? 'تعذر الإصلاح' : 'ملغي'}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', marginTop: '2px' }}>
                                {advancePaid > 0 ? (
                                  <span style={{ color: '#c2410c', fontWeight: 700 }}>
                                    عربون مسترد: {advancePaid.toFixed(0)} ج.م
                                  </span>
                                ) : (
                                  <span style={{ color: '#94a3b8' }}>بدون تكلفة</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>
                                {totalCost.toFixed(2)} <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>ج.م</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', marginTop: '1px' }}>
                                {advancePaid > 0 ? (
                                  <span style={{ color: '#475569', fontWeight: 600 }}>
                                    مدفوع: {advancePaid.toFixed(0)}
                                  </span>
                                ) : (
                                  <span style={{ color: '#94a3b8' }}>بدون مقدم</span>
                                )}
                                <span style={{ color: '#cbd5e1' }}>•</span>
                                {isDelivered ? (
                                  <span style={{ color: '#16a34a', fontWeight: 700 }}>خالص ✓</span>
                                ) : remaining > 0 ? (
                                  <span style={{ color: '#b45309', fontWeight: 700 }}>متبقي: {remaining.toFixed(0)}</span>
                                ) : (
                                  <span style={{ color: '#16a34a', fontWeight: 700 }}>خالص ✓</span>
                                )}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Status Select Badge - Subtle Soft Pastel Tint */}
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ position: 'relative', width: '100%', minWidth: '150px' }}>
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
                                width: '100%',
                                padding: '5px 24px 5px 10px',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                border: `1px solid ${cfg.border}`,
                                background: cfg.bg,
                                color: cfg.color,
                                outline: 'none',
                                appearance: 'none',
                                WebkitAppearance: 'none',
                                MozAppearance: 'none',
                                whiteSpace: 'nowrap',
                                textOverflow: 'ellipsis',
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
                            <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: cfg.color, display: 'flex', alignItems: 'center' }}>
                              <Icons.ChevronDown />
                            </span>
                          </div>
                        </td>

                        {/* Actions - Unified Minimal Buttons */}
                        <td style={{ padding: '11px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => void maintenanceApi.get(t.id).then((r) => setSelectedTicket(r.ticket))}
                              title="صرف قطع غيار وإدارة الحساب"
                              style={{
                                padding: '4px 8px',
                                borderRadius: '5px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                border: '1px solid #e2e8f0',
                                background: '#ffffff',
                                color: '#334155',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Icons.Wrench />
                              <span>قطع / حساب</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => sendWhatsAppMessage(t)}
                              title="إرسال إشعار وتحديث حالة عبر واتساب"
                              style={{
                                padding: '4px 8px',
                                borderRadius: '5px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                border: '1px solid #e2e8f0',
                                background: '#ffffff',
                                color: '#334155',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Icons.WhatsApp />
                              <span>واتساب</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setReceiptTicket(t)}
                              title="طباعة إيصال استلام أو ستيكر لاصق"
                              style={{
                                padding: '4px 8px',
                                borderRadius: '5px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                border: '1px solid #e2e8f0',
                                background: '#ffffff',
                                color: '#475569',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Icons.Printer />
                              <span>طباعة</span>
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
        </div>

        {/* 1. Modal: Create New Maintenance Ticket */}
        {createModalOpen && (
          <DialogShell
            open={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
            width="min(1040px, 96vw)"
            ariaLabel="استلام جهاز صيانة جديد"
          >
            <div style={{ padding: '24px 28px' }}>
              <form onSubmit={handleCreateSubmit} dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}>
                      <Icons.Device />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>استلام جهاز صيانة جديد</h3>
                      <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>تسجيل بيانات العميل، فحص العطل المشتكى منه، وتوليد كود الصيانة</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.9rem', fontWeight: 700 }}
                    title="إغلاق"
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  {/* Left Column: Customer & Device Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Customer Card */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#64748b' }}><Icons.User /></span>
                        <span>بيانات العميل</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                            اسم العميل <span style={{ color: '#dc2626' }}>*</span>
                          </label>
                          <input
                            type="text"
                            required
                            className="purchase-prototype-field-input"
                            value={formData.customerName}
                            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                            placeholder="الاسم الثلاثي أو الثنائي"
                            style={{ width: '100%', background: '#fff', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '0.85rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
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
                            style={{ width: '100%', background: '#fff', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'right', boxSizing: 'border-box', fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Device Specs Card */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#64748b' }}><Icons.Device /></span>
                        <span>مواصفات الجهاز و {maintenanceProfile.serialLabel}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                            الماركة
                          </label>
                          <BrandCombobox
                            value={formData.deviceBrand || ''}
                            onChange={(val) => setFormData({ ...formData, deviceBrand: val })}
                            categoryKey={maintenanceProfile.key}
                            sampleBrands={maintenanceProfile.sampleBrands}
                            placeholder={`...${maintenanceProfile.sampleBrands.slice(0, 3).join(', ')}`}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                            موديل الجهاز <span style={{ color: '#dc2626' }}>*</span>
                          </label>
                          <input
                            type="text"
                            required
                            className="purchase-prototype-field-input"
                            value={formData.deviceModel}
                            onChange={(e) => setFormData({ ...formData, deviceModel: e.target.value })}
                            placeholder={`مثال: ${maintenanceProfile.sampleBrands[0]}...`}
                            style={{ width: '100%', background: '#fff', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                          {maintenanceProfile.serialLabel} (مسح بالسكانر أو كتابة)
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          className="purchase-prototype-field-input"
                          value={formData.serialNumber || ''}
                          onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                          placeholder={maintenanceProfile.serialPlaceholder}
                          style={{ width: '100%', background: '#fff', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.85rem', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Problem & Passcode */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Problem Description & Faults */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#64748b' }}><Icons.Wrench /></span>
                        <span>وصف العطل والفحص الفني</span>
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', margin: 0 }}>
                            العطل المشتكى منه <span style={{ color: '#dc2626' }}>*</span>
                          </label>
                          {maintenanceProfile.commonFaults?.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setShowFaultsPopover(!showFaultsPopover)}
                              style={{
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                color: '#475569',
                                borderRadius: '5px',
                                padding: '2px 8px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <span>أعطال شائعة</span>
                              <span style={{ fontSize: '0.65rem' }}>{showFaultsPopover ? '▲' : '▼'}</span>
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          required
                          className="purchase-prototype-field-input"
                          value={formData.problemDescription}
                          onChange={(e) => setFormData({ ...formData, problemDescription: e.target.value })}
                          placeholder="مثال: الشاشة مكسورة، الجهاز لا يشحن..."
                          style={{ width: '100%', background: '#fff', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '0.85rem' }}
                        />
                        {showFaultsPopover && maintenanceProfile.commonFaults?.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px', padding: '8px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, width: '100%', marginBottom: '2px' }}>اضغط للإضافة السريعة:</span>
                            {maintenanceProfile.commonFaults.map((fault) => (
                              <button
                                key={fault}
                                type="button"
                                onClick={() => {
                                  const cur = formData.problemDescription ? `${formData.problemDescription} + ${fault}` : fault;
                                  setFormData({ ...formData, problemDescription: cur });
                                }}
                                style={{
                                  background: '#f8fafc',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '4px',
                                  padding: '3px 8px',
                                  fontSize: '0.72rem',
                                  color: '#334155',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                }}
                              >
                                + {fault}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '22px', marginBottom: '4px' }}>
                            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', margin: 0, whiteSpace: 'nowrap' }}>
                              الحالة والملحقات
                            </label>
                            {maintenanceProfile.defaultAccessories?.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setShowAccessoriesPopover(!showAccessoriesPopover)}
                                style={{
                                  background: '#ffffff',
                                  border: '1px solid #cbd5e1',
                                  color: '#475569',
                                  borderRadius: '4px',
                                  padding: '1px 6px',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <span>ملحقات</span>
                                <span style={{ fontSize: '0.62rem' }}>{showAccessoriesPopover ? '▲' : '▼'}</span>
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            className="purchase-prototype-field-input"
                            value={formData.deviceCondition || ''}
                            onChange={(e) => setFormData({ ...formData, deviceCondition: e.target.value })}
                            placeholder="خدوش بالظهر، مستلم بدون شاحن..."
                            style={{ width: '100%', background: '#fff', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '0.85rem' }}
                          />
                          {showAccessoriesPopover && maintenanceProfile.defaultAccessories?.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px', padding: '8px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, width: '100%', marginBottom: '2px' }}>اضغط لإضافة الملحق:</span>
                              {maintenanceProfile.defaultAccessories.map((acc) => (
                                <button
                                  key={acc}
                                  type="button"
                                  onClick={() => {
                                    const cur = formData.deviceCondition ? `${formData.deviceCondition}، ${acc}` : acc;
                                    setFormData({ ...formData, deviceCondition: cur });
                                  }}
                                  style={{
                                    background: '#f8fafc',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '4px',
                                    padding: '3px 8px',
                                    fontSize: '0.72rem',
                                    color: '#334155',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                  }}
                                >
                                  + {acc}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', height: '22px', marginBottom: '4px' }}>
                            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', margin: 0, whiteSpace: 'nowrap' }}>
                              الفني المسؤول
                            </label>
                          </div>
                          <input
                            type="text"
                            className="purchase-prototype-field-input"
                            value={formData.technicianName || ''}
                            onChange={(e) => setFormData({ ...formData, technicianName: e.target.value })}
                            placeholder="اسم الفني..."
                            style={{ width: '100%', background: '#fff', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Passcode & Security Lock Card */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#64748b' }}><Icons.Lock /></span>
                          <span>{maintenanceProfile.passcodeLabel}</span>
                        </label>
                        {maintenanceProfile.passcodeType === 'mobile_lock' && (
                          <div style={{ display: 'flex', gap: '4px', background: '#e2e8f0', padding: '2px', borderRadius: '6px' }}>
                            <button
                              type="button"
                              onClick={() => setLockType('pin')}
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                border: 'none',
                                background: lockType === 'pin' ? '#fff' : 'transparent',
                                fontWeight: lockType === 'pin' ? 700 : 500,
                                color: lockType === 'pin' ? '#0f172a' : '#64748b',
                                cursor: 'pointer',
                                fontSize: '0.72rem',
                              }}
                            >
                              PIN / رمز
                            </button>
                            <button
                              type="button"
                              onClick={() => setLockType('pattern')}
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                border: 'none',
                                background: lockType === 'pattern' ? '#fff' : 'transparent',
                                fontWeight: lockType === 'pattern' ? 700 : 500,
                                color: lockType === 'pattern' ? '#0f172a' : '#64748b',
                                cursor: 'pointer',
                                fontSize: '0.72rem',
                              }}
                            >
                              نمط الشاشة
                            </button>
                          </div>
                        )}
                      </div>

                      {maintenanceProfile.passcodeType === 'mobile_lock' && lockType === 'pattern' ? (
                        <div style={{ background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <PatternLockWidget
                            value={formData.passcode || ''}
                            onChange={(pat) => setFormData({ ...formData, passcode: pat })}
                          />
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            النمط المسجل: <strong dir="ltr" style={{ color: '#0f172a', fontFamily: 'monospace' }}>{formData.passcode || 'لم يتم الرسم بعد'}</strong>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <input
                            type="text"
                            dir={maintenanceProfile.passcodeType === 'password' ? 'ltr' : 'rtl'}
                            className="purchase-prototype-field-input"
                            value={formData.passcode || ''}
                            onChange={(e) => setFormData({ ...formData, passcode: e.target.value })}
                            placeholder={maintenanceProfile.passcodePlaceholder}
                            style={{ width: '100%', background: '#fff', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: maintenanceProfile.passcodeType === 'password' ? 'monospace' : 'inherit', fontSize: '0.85rem', boxSizing: 'border-box' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Financial Overview & Warranty Days */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 18px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#64748b' }}><Icons.Coins /></span>
                    <span>الحساب المالي والضمان</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    <div style={{ background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
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
                          style={{ width: '100%', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '5px', fontWeight: 700, fontSize: '0.9rem' }}
                        />
                        <span style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>ج.م</span>
                      </div>
                    </div>

                    <div style={{ background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        الدفعة المقدمة (عربون)
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
                          style={{ width: '100%', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '5px', fontWeight: 700, fontSize: '0.9rem' }}
                        />
                        <span style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>ج.م</span>
                      </div>
                    </div>

                    <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                        المتبقي التقديري
                      </label>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                        {Math.max(0, (formData.expectedCost || 0) - (formData.advancePayment || 0)).toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>ج.م</span>
                      </div>
                    </div>

                    <div style={{ background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        فترة الضمان
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="number"
                          min="0"
                          className="purchase-prototype-field-input"
                          value={formData.warrantyDays || 30}
                          onChange={(e) => setFormData({ ...formData, warrantyDays: Number(e.target.value) })}
                          style={{ width: '100%', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '5px', fontWeight: 700, fontSize: '0.9rem' }}
                        />
                        <span style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>يوم</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                  <Button type="button" variant="secondary" onClick={() => setCreateModalOpen(false)} style={{ padding: '7px 20px', fontSize: '0.85rem' }}>
                    إلغاء
                  </Button>
                  <Button type="submit" variant="primary" disabled={createMutation.isPending} style={{ padding: '7px 24px', fontWeight: 700, fontSize: '0.85rem' }}>
                    {createMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ واستخراج إيصال الاستلام'}
                  </Button>
                </div>
              </form>
            </div>
          </DialogShell>
        )}

        {/* 2. Modal: Selected Ticket Details & Parts Management */}
        {selectedTicket && (
          <DialogShell
            open={Boolean(selectedTicket)}
            onClose={() => setSelectedTicket(null)}
            width="min(880px, 96vw)"
            ariaLabel={`تذكرة رقم ${selectedTicket.ticketNo}`}
          >
            <div className="page-stack" dir="rtl" style={{ gap: '14px', padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                      بطاقة صيانة الجهاز:{' '}
                      <span style={{ fontFamily: 'monospace', color: '#0f172a', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '5px' }}>
                        {selectedTicket.ticketNo}
                      </span>
                    </h3>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '5px',
                        fontSize: '0.775rem',
                        fontWeight: 700,
                        background: '#ffffff',
                        color: '#475569',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      {statusConfig[selectedTicket.status]?.label || selectedTicket.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>
                    تاريخ الاستلام: {new Date(selectedTicket.receivedAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <Button
                    variant="secondary"
                    onClick={() => sendWhatsAppMessage(selectedTicket)}
                    style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    <Icons.WhatsApp />
                    <span>إرسال واتساب</span>
                  </Button>
                  <Button variant="secondary" onClick={() => setReceiptTicket(selectedTicket)} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Icons.Printer />
                    <span>طباعة</span>
                  </Button>
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.9rem', fontWeight: 700 }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Status Stepper / Switcher */}
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                  مرحلة عمل وصيانة الجهاز:
                </div>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {(['received', 'inspecting', 'in_progress', 'repaired', 'delivered', 'unrepairable'] as MaintenanceStatus[]).map((st) => {
                    const isCurrent = selectedTicket.status === st;
                    const cfg = statusConfig[st];
                    return (
                      <button
                        key={st}
                        type="button"
                        disabled={updateStatusMutation.isPending}
                        onClick={() => {
                          if (st === 'delivered') {
                            openSettlementModal(selectedTicket);
                          } else {
                            updateStatusMutation.mutate({ id: selectedTicket.id, status: st });
                          }
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: isCurrent ? 700 : 500,
                          border: isCurrent ? '1px solid #cbd5e1' : '1px solid #e2e8f0',
                          background: isCurrent ? '#ffffff' : '#f8fafc',
                          color: isCurrent ? '#0f172a' : '#64748b',
                          boxShadow: isCurrent ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isCurrent ? cfg.dot : '#cbd5e1' }} />
                        <span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Customer, Device & Passcode Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '8px', fontSize: '0.825rem' }}>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ color: '#64748b', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                    <Icons.User />
                    <span>العميل:</span>
                  </div>
                  <strong style={{ color: '#0f172a' }}>{selectedTicket.customerName}</strong>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '1px' }} dir="ltr">{selectedTicket.customerPhone}</div>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ color: '#64748b', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                    <Icons.Device />
                    <span>الجهاز:</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginBottom: '1px' }}>
                    {selectedTicket.deviceBrand && (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        {selectedTicket.deviceBrand}
                      </span>
                    )}
                    <strong style={{ color: '#0f172a' }}>{selectedTicket.deviceModel}</strong>
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#64748b' }}>
                    <span dir="ltr">{maintenanceProfile.serialLabel}: {selectedTicket.serialNumber || '—'}</span>
                  </div>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ color: '#64748b', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                    <Icons.Lock />
                    <span>{maintenanceProfile.passcodeLabel}:</span>
                  </div>
                  <strong dir="ltr" style={{ color: '#0f172a', fontFamily: 'monospace' }}>{selectedTicket.passcode || 'بدون قفل'}</strong>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ color: '#64748b', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                    <Icons.Shield />
                    <span>فترة الضمان:</span>
                  </div>
                  <strong style={{ color: '#0f172a' }}>{selectedTicket.warrantyDays || 30} يوماً</strong>
                </div>
              </div>

              <div>
                <div style={{ color: '#475569', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>عطل الجهاز المشتكى منه:</div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', color: '#1e293b', lineHeight: 1.5 }}>
                  {selectedTicket.problemDescription}
                </div>
              </div>

              {/* Parts Dispatch Area */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icons.Wrench />
                    <span>صرف قطع الغيار من المخزن على الكود ({selectedTicket.ticketNo})</span>
                  </h4>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{(selectedTicket.parts || []).length} قطعة مسجلة</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 85px 105px auto', gap: '8px', marginBottom: '8px', background: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', alignItems: 'center' }}>
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
                    style={{ height: '36px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.825rem', width: '100%', boxSizing: 'border-box', margin: 0 }}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="السعر"
                    className="purchase-prototype-field-input"
                    value={partPrice}
                    onChange={(e) => setPartPrice(Number(e.target.value))}
                    style={{ height: '36px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.825rem', width: '100%', boxSizing: 'border-box', margin: 0 }}
                  />
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => {
                      handleAddPartSubmit();
                      setPartSearchText('');
                    }}
                    disabled={!selectedProductId || addPartMutation.isPending}
                    style={{ height: '36px', padding: '0 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', margin: 0, fontWeight: 700, fontSize: '0.825rem' }}
                  >
                    {addPartMutation.isPending ? 'جاري...' : '+ صرف'}
                  </Button>
                </div>

                {(selectedTicket.parts || []).length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'right', color: '#475569', fontSize: '0.78rem' }}>
                        <th style={{ padding: '7px 10px' }}>القطعة</th>
                        <th style={{ padding: '7px 10px' }}>الكمية</th>
                        <th style={{ padding: '7px 10px' }}>سعر الوحدة</th>
                        <th style={{ padding: '7px 10px' }}>الإجمالي</th>
                        <th style={{ padding: '7px 10px', textAlign: 'center' }}>إلغاء الصرف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTicket.parts?.map((p) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '7px 10px', fontWeight: 600, color: '#0f172a' }}>{p.productName}</td>
                          <td style={{ padding: '7px 10px' }}>{p.qty}</td>
                          <td style={{ padding: '7px 10px' }}>{p.unitPrice.toFixed(2)} ج.م</td>
                          <td style={{ padding: '7px 10px', fontWeight: 700, color: '#0f172a' }}>{p.totalPrice.toFixed(2)} ج.م</td>
                          <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                            <button
                              type="button"
                              style={{ color: '#9f1239', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
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
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', padding: '12px', background: '#f8fafc', borderRadius: '6px', border: '1px dashed #e2e8f0' }}>
                    لم يتم صرف أي قطع غيار على هذا الجهاز بعد.
                  </div>
                )}
              </div>

              {/* Profit & Labor Commission Breakdown */}
              {(() => {
                const totalCost = selectedTicket.finalCost || selectedTicket.expectedCost || 0;
                const partsCost = (selectedTicket.parts || []).reduce((acc, p) => acc + (p.qty * (p.unitCost || 0)), 0);
                const partsPrice = (selectedTicket.parts || []).reduce((acc, p) => acc + (p.qty * (p.unitPrice || 0)), 0);
                const partsProfit = Math.max(0, partsPrice - partsCost);
                const laborPrice = Math.max(0, totalCost - partsPrice);
                const commissionRate = Number(settingsQuery.data?.technicianCommissionRate ?? 30);
                const technicianCommission = laborPrice * (commissionRate / 100);
                const storeProfit = Math.max(0, (laborPrice - technicianCommission) + partsProfit);

                return (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Icons.Coins />
                        <span>حساب أرباح الصيانة وعمولة الفني:</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
                        <span style={{ color: '#64748b' }}>تعديل إجمالي الحساب:</span>
                        <input
                          type="number"
                          min="0"
                          step="10"
                          className="purchase-prototype-field-input"
                          value={editingCost ?? totalCost}
                          onChange={(e) => setEditingCost(Number(e.target.value))}
                          style={{ width: '90px', padding: '3px 6px', borderRadius: '5px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: 700, textAlign: 'center', fontSize: '0.85rem' }}
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
                          style={{ padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700 }}
                        >
                          تحديث الحساب
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '0.78rem', textAlign: 'center' }}>
                      <div style={{ background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#64748b', marginBottom: '1px' }}>قطع الغيار (قطاعي)</div>
                        <strong style={{ color: '#0f172a', fontSize: '0.875rem' }}>{partsPrice.toFixed(2)} ج.م</strong>
                        {partsProfit > 0 && <div style={{ fontSize: '0.68rem', color: '#16a34a', marginTop: '1px', fontWeight: 600 }}>ربح بضاعة: +{partsProfit.toFixed(0)}</div>}
                      </div>
                      <div style={{ background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#64748b', marginBottom: '1px' }}>صافي المصنعية</div>
                        <strong style={{ color: '#0f172a', fontSize: '0.875rem' }}>{laborPrice.toFixed(2)} ج.م</strong>
                      </div>
                      <div style={{ background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#64748b', marginBottom: '1px' }}>عمولة الفني ({commissionRate}%)</div>
                        <strong style={{ color: '#0f172a', fontSize: '0.875rem' }}>{technicianCommission.toFixed(2)} ج.م</strong>
                      </div>
                      <div style={{ background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#64748b', marginBottom: '1px' }}>صافي ربح المحل</div>
                        <strong style={{ color: '#16a34a', fontSize: '0.875rem' }}>{storeProfit.toFixed(2)} ج.م</strong>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Settlement Card */}
              {selectedTicket.status === 'delivered' ? (() => {
                const totalCost = selectedTicket.finalCost || selectedTicket.expectedCost || 0;
                const discountInfo = extractTicketDiscount(selectedTicket.technicianNotes);
                const netTotal = Math.max(0, totalCost - discountInfo.amount);
                const advancePaid = selectedTicket.advancePayment || 0;
                const collectedAtDelivery = Math.max(0, netTotal - advancePaid);

                return (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>إجمالي حساب الصيانة والتسليم:</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '1.2rem', color: '#0f172a' }}>
                          {totalCost.toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>ج.م</span>
                        </strong>
                        {discountInfo.amount > 0 && (
                          <span style={{ fontSize: '0.75rem', color: '#475569', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            خصم: -{discountInfo.amount.toFixed(2)} ج.م (الصافي: {netTotal.toFixed(2)} ج.م)
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '3px', fontWeight: 600 }}>
                        ✓ تم السداد والتحصيل في الخزينة بالكامل
                        {advancePaid > 0 ? ` (مقدم: ${advancePaid.toFixed(2)} ج.م + عند الاستلام: ${collectedAtDelivery.toFixed(2)} ج.م)` : ` (المحصل عند الاستلام: ${collectedAtDelivery.toFixed(2)} ج.م)`}
                      </div>
                      {discountInfo.amount > 0 && (
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px' }}>
                          سبب الخصم: {discountInfo.reason}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>الرصيد المتبقي:</div>
                        <strong style={{ fontSize: '1.2rem', color: '#16a34a', fontWeight: 800 }}>
                          0.00 <span style={{ fontSize: '0.75rem' }}>ج.م (خالص)</span>
                        </strong>
                      </div>
                      <span style={{ padding: '6px 12px', borderRadius: '6px', background: '#f0fdf4', color: '#166534', fontWeight: 700, fontSize: '0.85rem', border: '1px solid #dcfce7' }}>
                        ✓ تم تسليم الجهاز
                      </span>
                    </div>
                  </div>
                );
              })() : (selectedTicket.status === 'unrepairable' || selectedTicket.status === 'cancelled') ? (() => {
                const advancePaid = selectedTicket.advancePayment || 0;
                const isUnrep = selectedTicket.status === 'unrepairable';
                return (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.825rem', color: isUnrep ? '#9f1239' : '#475569', fontWeight: 700 }}>
                        {isUnrep ? '✕ تعذر إصلاح الجهاز (تم إلغاء رسوم الصيانة)' : '✕ تم إلغاء تذكرة الصيانة'}
                      </div>
                      {advancePaid > 0 ? (
                        <div style={{ fontSize: '0.78rem', color: '#c2410c', marginTop: '3px', fontWeight: 600 }}>
                          ⚠️ مستحق رد العربون للعميل بالكامل: {advancePaid.toFixed(2)} ج.م عند تسليم الجهاز
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                          لا توجد أي مستحقات مالية مطلوبة من العميل.
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>المطلوب تحصيله:</div>
                      <strong style={{ fontSize: '1.2rem', color: '#64748b', fontWeight: 700 }}>
                        0.00 <span style={{ fontSize: '0.75rem' }}>ج.م</span>
                      </strong>
                    </div>
                  </div>
                );
              })() : (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>إجمالي حساب الصيانة والقطع:</div>
                    <strong style={{ fontSize: '1.2rem', color: '#0f172a' }}>
                      {(selectedTicket.finalCost || selectedTicket.expectedCost || 0).toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>ج.م</span>
                    </strong>
                    {selectedTicket.advancePayment > 0 && (
                      <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '2px', fontWeight: 600 }}>
                        (المدفوع مقدماً: {selectedTicket.advancePayment.toFixed(2)} ج.م)
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>المتبقي للتحصيل:</div>
                      <strong style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>
                        {Math.max(0, (selectedTicket.finalCost || selectedTicket.expectedCost || 0) - (selectedTicket.advancePayment || 0)).toFixed(2)} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>ج.م</span>
                      </strong>
                    </div>

                    <Button
                      variant="primary"
                      onClick={() => openSettlementModal(selectedTicket)}
                      disabled={updateStatusMutation.isPending}
                      style={{ padding: '7px 18px', fontWeight: 700, fontSize: '0.85rem' }}
                    >
                      ✓ تسليم الجهاز والتحصيل
                    </Button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button variant="secondary" onClick={() => setSelectedTicket(null)} style={{ fontSize: '0.85rem' }}>
                  إغلاق
                </Button>
              </div>
            </div>
          </DialogShell>
        )}

        {/* 3. Modal: Delivery Settlement Modal */}
        {settlementTicket && (
          <DialogShell
            open={Boolean(settlementTicket)}
            onClose={() => setSettlementTicket(null)}
            width="min(540px, 95vw)"
            ariaLabel="تأكيد تحصيل وتسليم جهاز الصيانة"
          >
            <div className="page-stack" dir="rtl" style={{ gap: '14px', padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icons.CheckCircle />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                      تحصيل وتسليم الجهاز: <span style={{ fontFamily: 'monospace', color: '#0f172a' }}>{settlementTicket.ticketNo}</span>
                    </h3>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                      العميل: <strong>{settlementTicket.customerName}</strong> ({settlementTicket.deviceBrand ? `${settlementTicket.deviceBrand} ` : ''}{settlementTicket.deviceModel})
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSettlementTicket(null)}
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 700 }}
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
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center', fontSize: '0.78rem' }}>
                      <div style={{ background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#64748b', marginBottom: '2px' }}>إجمالي الحساب</div>
                        <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{totalCost.toFixed(2)} ج.م</strong>
                      </div>
                      <div style={{ background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#64748b', marginBottom: '2px' }}>المدفوع مقدماً</div>
                        <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{advancePaid.toFixed(2)} ج.م</strong>
                      </div>
                      <div style={{ background: '#ffffff', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                        <div style={{ color: '#475569', marginBottom: '2px' }}>المطلوب تحصيله</div>
                        <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{expectedRem.toFixed(2)} ج.م</strong>
                      </div>
                    </div>

                    <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        المبلغ المستلم فعلياً من العميل الآن:
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="number"
                          min="0"
                          step="5"
                          className="purchase-prototype-field-input"
                          value={collectedAmount}
                          onChange={(e) => setCollectedAmount(Number(e.target.value))}
                          style={{ width: '100%', height: '38px', fontSize: '1.1rem', fontWeight: 800, padding: '0 12px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a' }}
                        />
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap' }}>ج.م</span>
                      </div>
                    </div>

                    {diff > 0 && (
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                            فرق / خصم مسموح به للعميل:
                          </span>
                          <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{diff.toFixed(2)} ج.م</strong>
                        </div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                          اختر سبب الخصم / الفرق:
                        </label>
                        <select
                          value={discountReason}
                          onChange={(e) => setDiscountReason(e.target.value)}
                          className="purchase-prototype-field-input"
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '5px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: 600, fontSize: '0.8rem', marginBottom: discountReason === 'custom' ? '6px' : '0' }}
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
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '5px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.8rem' }}
                          />
                        )}
                      </div>
                    )}

                    {diff < 0 && (
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>باقي مستحق للعميل:</span>
                        <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{Math.abs(diff).toFixed(2)} ج.م</strong>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                      <Button type="button" variant="secondary" onClick={() => setSettlementTicket(null)} style={{ fontSize: '0.85rem' }}>
                        إلغاء
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={handleConfirmSettlement}
                        disabled={updateStatusMutation.isPending}
                        style={{ padding: '7px 20px', fontWeight: 700, fontSize: '0.85rem' }}
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

        {/* 4. Modal: Printable Receipt & Sticker */}
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
