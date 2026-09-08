import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import {
  SearchIcon,
  PlusIcon,
  RefreshCwIcon,
  DownloadIcon,
  PrinterIcon,
  FileTextIcon,
  Trash2Icon,
  XIcon,
} from '@/shared/components/icons/AppIcons';
import { DialogShell } from '@/shared/components/dialog-shell';
import {
  pdcChequesApi,
  type PdcCheque,
  type PdcChequesStats,
  type ChequeType,
  type ChequeStatus,
  type CreatePdcChequePayload,
} from '@/features/accounting/api/accounting.api';
import { PageHeader } from '@/shared/components/page-header';
import { StatsGrid } from '@/shared/components/stats-grid';
import { useAppToolbar } from '@/stores/toolbar-store';

const STATUS_LABELS: Record<ChequeStatus, { text: string; bg: string; color: string; border: string }> = {
  in_safe: { text: 'في الخزينة', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  under_collection: { text: 'برسم التحصيل', bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  collected: { text: 'محصل بالبنك', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  bounced: { text: 'مرتد / مرفوض', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  endorsed: { text: 'مظهر لمورد', bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
  returned: { text: 'مردود للعميل', bg: '#f8fafc', color: '#334155', border: '#cbd5e1' },
  cancelled: { text: 'ملغى', bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
  issued: { text: 'محرر للمورد', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  cleared: { text: 'تم الصرف بنكياً', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
};

export function PdcChequesPage() {
  useAppToolbar([{ label: 'المالية والمحاسبة', to: '/accounting' }, { label: 'حافظة الشيكات (PDC)' }]);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'receivable' | 'payable' | 'alerts'>('receivable');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dueFrom, setDueFrom] = useState('');
  const [dueTo, setDueTo] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createChequeType, setCreateChequeType] = useState<ChequeType>('receivable');
  const [selectedCheque, setSelectedCheque] = useState<PdcCheque | null>(null);
  const [activeActionModal, setActiveActionModal] = useState<
    'deposit' | 'collect' | 'clear' | 'bounce' | 'endorse' | 'return' | 'voucher' | null
  >(null);

  // Form states for actions
  const [actionDate, setActionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [bouncedReason, setBouncedReason] = useState('عدم كفاية الرصيد');
  const [bouncedFee, setBouncedFee] = useState('0');
  const [endorsedSupplier, setEndorsedSupplier] = useState('');
  const [actionNotes, setActionNotes] = useState('');

  // New Cheque Form state
  const [newCheque, setNewCheque] = useState<CreatePdcChequePayload>({
    type: 'receivable',
    chequeNumber: '',
    bankName: '',
    branchName: '',
    drawerName: '',
    partnerName: '',
    amount: 0,
    currency: 'EGP',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    notes: '',
  });

  // Queries
  const statsQuery = useQuery({
    queryKey: ['pdc-cheques-stats'],
    queryFn: () => pdcChequesApi.stats(),
  });

  const chequesQuery = useQuery({
    queryKey: [
      'pdc-cheques-list',
      activeTab === 'alerts' ? undefined : activeTab,
      statusFilter,
      search,
      dueFrom,
      dueTo,
    ],
    queryFn: () =>
      pdcChequesApi.list({
        type: activeTab === 'alerts' ? undefined : activeTab,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search.trim() || undefined,
        dueFrom: dueFrom || undefined,
        dueTo: dueTo || undefined,
        limit: 100,
      }),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: CreatePdcChequePayload) => pdcChequesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdc-cheques-list'] });
      queryClient.invalidateQueries({ queryKey: ['pdc-cheques-stats'] });
      setShowCreateModal(false);
      resetNewChequeForm();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      pdcChequesApi.updateStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdc-cheques-list'] });
      queryClient.invalidateQueries({ queryKey: ['pdc-cheques-stats'] });
      setActiveActionModal(null);
      setSelectedCheque(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => pdcChequesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdc-cheques-list'] });
      queryClient.invalidateQueries({ queryKey: ['pdc-cheques-stats'] });
    },
  });

  const resetNewChequeForm = () => {
    setNewCheque({
      type: createChequeType,
      chequeNumber: '',
      bankName: '',
      branchName: '',
      drawerName: '',
      partnerName: '',
      amount: 0,
      currency: 'EGP',
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: '',
      notes: '',
    });
  };

  const openCreateModal = (type: ChequeType) => {
    setCreateChequeType(type);
    setNewCheque((prev) => ({
      ...prev,
      type,
      chequeNumber: '',
      bankName: '',
      partnerName: '',
      amount: 0,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: '',
      notes: '',
    }));
    setShowCreateModal(true);
  };

  const handleActionSubmit = () => {
    if (!selectedCheque || !activeActionModal || activeActionModal === 'voucher') return;

    const payload: any = {
      action: activeActionModal,
      actionDate,
      notes: actionNotes || undefined,
    };

    if (activeActionModal === 'bounce') {
      payload.bouncedReason = bouncedReason;
      payload.bouncedFee = Number(bouncedFee) || 0;
    } else if (activeActionModal === 'endorse') {
      payload.endorsedToSupplierName = endorsedSupplier;
    }

    updateStatusMutation.mutate({ id: selectedCheque.id, payload });
  };

  const handleDirectAction = (cheque: PdcCheque, action: 'restore_to_safe' | 'cancel') => {
    if (!confirm(`هل أنت متأكد من تنفيذ هذا الإجراء للشيك رقم ${cheque.cheque_number}؟`)) return;
    updateStatusMutation.mutate({
      id: cheque.id,
      payload: { action },
    });
  };

  const handleDeleteCheque = (cheque: PdcCheque) => {
    if (!confirm(`هل أنت متأكد من حذف الشيك رقم ${cheque.cheque_number} نهائياً؟`)) return;
    deleteMutation.mutate(cheque.id);
  };

  const stats: PdcChequesStats | undefined = statsQuery.data;
  const cheques: PdcCheque[] = chequesQuery.data?.data || [];

  const todayStr = new Date().toISOString().slice(0, 10);
  const in7DaysStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Filter for alerts tab
  const displayedCheques = activeTab === 'alerts'
    ? cheques.filter((c) => {
        const isSettled = ['collected', 'cleared', 'cancelled', 'returned'].includes(c.status);
        if (isSettled) return false;
        return c.due_date < todayStr || (c.due_date >= todayStr && c.due_date <= in7DaysStr);
      })
    : cheques;

  // Export to CSV
  const handleExportCsv = () => {
    if (displayedCheques.length === 0) return;
    const headers = [
      'رقم الشيك',
      'النوع',
      'الطرف (العميل/المورد)',
      'البنك المسحوب عليه',
      'الفرع',
      'المبلغ',
      'العملة',
      'تاريخ التحرير',
      'تاريخ الاستحقاق',
      'الحالة',
      'ملاحظات',
    ];
    const rows = displayedCheques.map((c) => [
      `"${c.cheque_number}"`,
      c.type === 'receivable' ? 'ورقة قبض' : 'ورقة دفع',
      `"${c.partner_name}"`,
      `"${c.bank_name}"`,
      `"${c.branch_name || ''}"`,
      c.amount,
      c.currency,
      c.issue_date,
      c.due_date,
      STATUS_LABELS[c.status]?.text || c.status,
      `"${c.notes || ''}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PDC_Cheques_${activeTab}_${todayStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-stack page-shell pdc-cheques-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', width: '100%' }}>
        <PageHeader
          title="حافظة الشيكات وأوراق القبض والدفع (PDC)"
          description="إدارة دورة أوراق القبض والدفع، الإيداع البنكي برسم التحصيل، الصرف، الارتداد، والتظهير."
          badge={<span className="nav-pill">{(stats?.receivables.totalCount || 0) + (stats?.payables.totalCount || 0)} شيك</span>}
          actions={(
            <div className="actions compact-actions page-header-actions">
              <Button
                onClick={() => openCreateModal('receivable')}
                className="btn btn-primary flex items-center gap-1.5"
                style={{ backgroundColor: '#170e5e', color: '#ffffff' }}
              >
                <PlusIcon size={15} />
                <span>+ تسجيل ورقة قبض</span>
              </Button>

              <Button
                onClick={() => openCreateModal('payable')}
                variant="secondary"
                className="flex items-center gap-1.5"
              >
                <PlusIcon size={15} />
                <span>+ تحرير ورقة دفع</span>
              </Button>

              <Button
                onClick={handleExportCsv}
                variant="secondary"
                className="flex items-center gap-1"
                title="تصدير إلى CSV"
              >
                <DownloadIcon size={14} />
                <span>تصدير</span>
              </Button>

              <Button
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['pdc-cheques-list'] });
                  queryClient.invalidateQueries({ queryKey: ['pdc-cheques-stats'] });
                }}
                variant="secondary"
                className="flex items-center gap-1"
                title="تحديث البيانات"
              >
                <RefreshCwIcon size={14} />
                <span>تحديث</span>
              </Button>
            </div>
          )}
        />

        {/* KPI Metric Summary Cards */}
        <div style={{ marginBottom: '16px' }}>
          <StatsGrid
            items={[
              {
                key: 'rec',
                label: 'أوراق القبض (عملاء)',
                value: `${formatCurrency(stats?.receivables.totalAmount || 0)} (${stats?.receivables.totalCount || 0})`,
              },
              {
                key: 'safe',
                label: 'في الخزينة (جاهزة للإيداع)',
                value: `${formatCurrency(stats?.receivables.inSafeAmount || 0)} (${stats?.receivables.inSafeCount || 0})`,
              },
              {
                key: 'col',
                label: 'برسم التحصيل بالبنك',
                value: `${formatCurrency(stats?.receivables.underCollectionAmount || 0)} (${stats?.receivables.underCollectionCount || 0})`,
              },
              {
                key: 'pay',
                label: 'أوراق الدفع (موردين)',
                value: `${formatCurrency(stats?.payables.totalAmount || 0)} (${stats?.payables.issuedCount || 0})`,
              },
            ]}
          />
        </div>

        {/* Main Workspace Panel & Table */}
        <section className="document-prototype-section workspace-panel">
          <div className="section-header-compact-row">
            <h3 className="document-prototype-section-title">حافظة وسجل الشيكات البنكية</h3>
            <div className="section-header-actions-group">
              <span className="text-xs text-slate-500 font-medium">عرض {displayedCheques.length} شيك</span>
            </div>
          </div>
          <p className="muted small section-header-subtitle">
            متابعة استحقاق الشيكات، الإيداع، الصرف البنكي، والارتداد والتظهير المحاسبي.
          </p>

          {/* Tab Switcher & Filter Toolbar */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', background: '#ffffff', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              {/* Tabs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('receivable');
                    setStatusFilter('all');
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: 'none',
                    backgroundColor: activeTab === 'receivable' ? '#ffffff' : 'transparent',
                    color: activeTab === 'receivable' ? '#170e5e' : '#64748b',
                    boxShadow: activeTab === 'receivable' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  أوراق القبض (عملاء)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('payable');
                    setStatusFilter('all');
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: 'none',
                    backgroundColor: activeTab === 'payable' ? '#ffffff' : 'transparent',
                    color: activeTab === 'payable' ? '#170e5e' : '#64748b',
                    boxShadow: activeTab === 'payable' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  أوراق الدفع (موردين)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('alerts');
                    setStatusFilter('all');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: 'none',
                    backgroundColor: activeTab === 'alerts' ? '#ffffff' : 'transparent',
                    color: activeTab === 'alerts' ? '#b91c1c' : '#64748b',
                    boxShadow: activeTab === 'alerts' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  <span>تنبيهات الاستحقاق والارتداد</span>
                  {((stats?.receivables.overdueCount || 0) + (stats?.receivables.dueSoonCount || 0) > 0) && (
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }} />
                  )}
                </button>
              </div>

              {/* Quick Status Filter Buttons */}
              {activeTab === 'receivable' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'all', label: 'الكل' },
                    { id: 'in_safe', label: 'في الخزينة' },
                    { id: 'under_collection', label: 'برسم التحصيل' },
                    { id: 'collected', label: 'محصل' },
                    { id: 'bounced', label: 'مرتد' },
                    { id: 'endorsed', label: 'مظهر' },
                  ].map((s) => {
                    const isActive = statusFilter === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setStatusFilter(s.id)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          border: isActive ? '1px solid #170e5e' : '1px solid #cbd5e1',
                          backgroundColor: isActive ? '#170e5e' : '#ffffff',
                          color: isActive ? '#ffffff' : '#475569',
                          boxShadow: isActive ? '0 1px 3px rgba(23, 14, 94, 0.25)' : 'none',
                        }}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === 'payable' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'all', label: 'الكل' },
                    { id: 'issued', label: 'محرر لم يصرف' },
                    { id: 'cleared', label: 'تم الصرف بنكياً' },
                    { id: 'bounced', label: 'مرتد' },
                    { id: 'cancelled', label: 'ملغى' },
                  ].map((s) => {
                    const isActive = statusFilter === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setStatusFilter(s.id)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          border: isActive ? '1px solid #170e5e' : '1px solid #cbd5e1',
                          backgroundColor: isActive ? '#170e5e' : '#ffffff',
                          color: isActive ? '#ffffff' : '#475569',
                          boxShadow: isActive ? '0 1px 3px rgba(23, 14, 94, 0.25)' : 'none',
                        }}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Search & Date Filter Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', alignItems: 'center' }}>
              <div style={{ position: 'relative', gridColumn: 'span 2' }}>
                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                  <SearchIcon size={16} />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث برقم الشيك، اسم العميل، اسم المورد، أو اسم البنك..."
                  style={{
                    width: '100%',
                    paddingRight: '36px',
                    paddingLeft: '12px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '12px',
                    color: '#1e293b',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>استحقاق من:</span>
                <input
                  type="date"
                  value={dueFrom}
                  onChange={(e) => setDueFrom(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '12px',
                    color: '#1e293b',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>إلى:</span>
                <input
                  type="date"
                  value={dueTo}
                  onChange={(e) => setDueTo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '12px',
                    color: '#1e293b',
                    boxSizing: 'border-box',
                  }}
                />
                {(search || dueFrom || dueTo || statusFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setDueFrom('');
                      setDueTo('');
                      setStatusFilter('all');
                    }}
                    style={{
                      fontSize: '12px',
                      color: '#e11d48',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      padding: '0 4px',
                    }}
                  >
                    إعادة ضبط
                  </button>
                )}
              </div>
            </div>
          </div>

        {/* Cheques Data Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
          {chequesQuery.isLoading ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              جاري تحميل حافظة الشيكات...
            </div>
          ) : displayedCheques.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
                <FileTextIcon size={24} />
              </div>
              <h3 className="text-sm font-semibold text-slate-700">لا توجد شيكات مطابقة للبحث</h3>
              <p className="text-xs text-slate-400 mt-1">
                يمكنك تسجيل ورقة قبض أو دفع جديدة عبر الأزرار بالأعلى
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-4">رقم الشيك</th>
                    <th className="py-3 px-4">الطرف (العميل / المورد)</th>
                    <th className="py-3 px-4">البنك المسحوب عليه</th>
                    <th className="py-3 px-4">المبلغ</th>
                    <th className="py-3 px-4">تاريخ التحرير</th>
                    <th className="py-3 px-4">تاريخ الاستحقاق</th>
                    <th className="py-3 px-4 text-center">الحالة</th>
                    <th className="py-3 px-4">بنك الإيداع / تفاصيل</th>
                    <th className="py-3 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedCheques.map((c) => {
                    const statusInfo = STATUS_LABELS[c.status] || {
                      text: c.status,
                      bg: '#f1f5f9',
                      color: '#64748b',
                      border: '#e2e8f0',
                    };

                    const isSettled = ['collected', 'cleared', 'cancelled', 'returned'].includes(c.status);
                    const isOverdue = !isSettled && c.due_date < todayStr;
                    const isDueSoon = !isSettled && c.due_date >= todayStr && c.due_date <= in7DaysStr;

                    return (
                      <tr
                        key={c.id}
                        className={`hover:bg-slate-50/60 transition-colors ${
                          isOverdue ? 'bg-rose-50/20' : ''
                        }`}
                      >
                        {/* Cheque Number */}
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 font-normal">#</span>
                            <span>{c.cheque_number}</span>
                          </div>
                          {c.drawer_name && (
                            <span className="text-[10px] text-slate-400 block font-sans">
                              الساحب: {c.drawer_name}
                            </span>
                          )}
                        </td>

                        {/* Partner Name */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{c.partner_name}</div>
                          <span className="text-[10px] text-slate-400">
                            {c.partner_type === 'customer' ? 'عميل' : 'مورد'}
                          </span>
                        </td>

                        {/* Bank Name */}
                        <td className="py-3 px-4">
                          <div className="text-slate-700 font-medium">{c.bank_name}</div>
                          {c.branch_name && (
                            <span className="text-[10px] text-slate-400">فرع {c.branch_name}</span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                          {formatCurrency(c.amount)} {c.currency}
                        </td>

                        {/* Issue Date */}
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {c.issue_date}
                        </td>

                        {/* Due Date & Alerts */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-semibold ${
                                isOverdue
                                  ? 'text-rose-600 font-bold'
                                  : isDueSoon
                                  ? 'text-amber-600 font-bold'
                                  : 'text-slate-700'
                              }`}
                            >
                              {c.due_date}
                            </span>
                            {isOverdue && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-medium">
                                متأخر
                              </span>
                            )}
                            {isDueSoon && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                                خلال أسبوع
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-4 text-center">
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: statusInfo.bg,
                              color: statusInfo.color,
                              border: `1px solid ${statusInfo.border}`,
                            }}
                          >
                            {statusInfo.text}
                          </span>
                        </td>

                        {/* Deposit / Clearing info */}
                        <td className="py-3 px-4 text-[11px] text-slate-600">
                          {c.status === 'under_collection' && (
                            <div>
                              <span>مودع بتاريخ {c.deposit_date}</span>
                            </div>
                          )}
                          {c.status === 'collected' && (
                            <span className="text-emerald-700 font-medium">
                              حصل في {c.cleared_date}
                            </span>
                          )}
                          {c.status === 'cleared' && (
                            <span className="text-emerald-700 font-medium">
                              صرف في {c.cleared_date}
                            </span>
                          )}
                          {c.status === 'bounced' && (
                            <div className="text-rose-700">
                              <span className="font-semibold block">{c.bounced_reason}</span>
                              <span className="text-[10px] text-rose-500">
                                في {c.bounced_date}
                                {c.bounced_fee > 0 && ` | مصاريف: ${c.bounced_fee}`}
                              </span>
                            </div>
                          )}
                          {c.status === 'endorsed' && (
                            <span className="text-purple-700 font-medium">
                              ظهر للمورد: {c.endorsed_to_supplier_name}
                            </span>
                          )}
                          {c.status === 'in_safe' && (
                            <span className="text-slate-400">متاح في الخزينة</span>
                          )}
                          {c.status === 'issued' && (
                            <span className="text-slate-400">محرر للمورد</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            {/* Actions for Receivables */}
                            {c.type === 'receivable' && c.status === 'in_safe' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCheque(c);
                                    setActiveActionModal('deposit');
                                  }}
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: '#fffbeb',
                                    color: '#b45309',
                                    border: '1px solid #fde68a',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                  title="إيداع الشيك برسم التحصيل في البنك"
                                >
                                  إيداع بالبنك
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCheque(c);
                                    setActiveActionModal('collect');
                                  }}
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: '#ecfdf5',
                                    color: '#047857',
                                    border: '1px solid #a7f3d0',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                  title="تحصيل مباشر"
                                >
                                  تحصيل
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCheque(c);
                                    setActiveActionModal('endorse');
                                  }}
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: '#faf5ff',
                                    color: '#7e22ce',
                                    border: '1px solid #e9d5ff',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                  title="تظهير الشيك لمورد"
                                >
                                  تظهير
                                </button>
                              </>
                            )}

                            {c.type === 'receivable' && c.status === 'under_collection' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCheque(c);
                                    setActiveActionModal('collect');
                                  }}
                                  style={{
                                    padding: '3px 10px',
                                    borderRadius: '6px',
                                    backgroundColor: '#059669',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(5, 150, 105, 0.25)',
                                  }}
                                  title="تأكيد تحصيل الشيك وإضافته للرصيد"
                                >
                                  تأكيد التحصيل
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCheque(c);
                                    setActiveActionModal('bounce');
                                  }}
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: '#fef2f2',
                                    color: '#b91c1c',
                                    border: '1px solid #fecaca',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                  title="تسجيل ارتداد ورفض الشيك"
                                >
                                  ارتداد
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDirectAction(c, 'restore_to_safe')}
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: '#f8fafc',
                                    color: '#334155',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                  title="استرجاع الشيك للخزينة"
                                >
                                  للخزينة
                                </button>
                              </>
                            )}

                            {/* Actions for Payables */}
                            {c.type === 'payable' && c.status === 'issued' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCheque(c);
                                    setActiveActionModal('clear');
                                  }}
                                  style={{
                                    padding: '3px 10px',
                                    borderRadius: '6px',
                                    backgroundColor: '#059669',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(5, 150, 105, 0.25)',
                                  }}
                                  title="تأكيد صرف الشيك وخصمه من البنك"
                                >
                                  تأكيد الصرف
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCheque(c);
                                    setActiveActionModal('bounce');
                                  }}
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: '#fef2f2',
                                    color: '#b91c1c',
                                    border: '1px solid #fecaca',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                  title="ارتداد الشيك"
                                >
                                  ارتداد
                                </button>
                              </>
                            )}

                            {/* Bounced Recovery Action */}
                            {c.status === 'bounced' && (
                              <button
                                type="button"
                                onClick={() => handleDirectAction(c, 'restore_to_safe')}
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: '#eff6ff',
                                  color: '#1d4ed8',
                                  border: '1px solid #bfdbfe',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                إعادة للحافظة
                              </button>
                            )}

                            {/* Voucher Print Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCheque(c);
                                setActiveActionModal('voucher');
                              }}
                              style={{
                                padding: '4px 6px',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0',
                                backgroundColor: '#ffffff',
                                color: '#64748b',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="معاينة وطباعة سند الشيك"
                            >
                              <PrinterIcon size={14} />
                            </button>

                            {/* Delete Button (Allowed for safe, issued, or cancelled) */}
                            {['in_safe', 'issued', 'cancelled', 'bounced'].includes(c.status) && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCheque(c)}
                                style={{
                                  padding: '4px 6px',
                                  borderRadius: '6px',
                                  border: '1px solid #fee2e2',
                                  backgroundColor: '#ffffff',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                                title="حذف الشيك"
                              >
                                <Trash2Icon size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </section>
      </main>

      {/* Modal 1: Register New Cheque */}
      <DialogShell
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        size="lg"
      >
        <div className="standard-dialog-header">
          <div>
            <h2 className="standard-dialog-title">
              {createChequeType === 'receivable'
                ? 'تسجيل ورقة قبض جديدة (شيك عميل)'
                : 'تحرير ورقة دفع جديدة (شيك مورد)'}
            </h2>
            <p className="standard-dialog-subtitle">
              إدخال بيانات الشيك البنكي وتفاصيل الساحب والمبلغ وتاريخ الاستحقاق
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(false)}
            className="standard-dialog-close-btn"
            aria-label="إغلاق"
          >
            <XIcon size={18} />
          </button>
        </div>

        <div className="standard-dialog-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              رقم الشيك <span style={{ color: '#e11d48' }}>*</span>
            </label>
            <input
              type="text"
              value={newCheque.chequeNumber}
              onChange={(e) => setNewCheque({ ...newCheque, chequeNumber: e.target.value })}
              placeholder="مثال: 00482910"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '12px',
                color: '#1e293b',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              {createChequeType === 'receivable' ? 'اسم العميل / المستفيد' : 'اسم المورد المستفيد'}{' '}
              <span style={{ color: '#e11d48' }}>*</span>
            </label>
            <input
              type="text"
              value={newCheque.partnerName}
              onChange={(e) => setNewCheque({ ...newCheque, partnerName: e.target.value })}
              placeholder="الاسم الثلاثي أو اسم المنشأة"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '12px',
                color: '#1e293b',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              البنك المسحوب عليه <span style={{ color: '#e11d48' }}>*</span>
            </label>
            <input
              type="text"
              value={newCheque.bankName}
              onChange={(e) => setNewCheque({ ...newCheque, bankName: e.target.value })}
              placeholder="مثال: البنك الأهلي المصري / بنك الراجحي"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '12px',
                color: '#1e293b',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              فرع البنك
            </label>
            <input
              type="text"
              value={newCheque.branchName || ''}
              onChange={(e) => setNewCheque({ ...newCheque, branchName: e.target.value })}
              placeholder="مثال: فرع التجمع الخامس"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '12px',
                color: '#1e293b',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              المبلغ <span style={{ color: '#e11d48' }}>*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={newCheque.amount || ''}
              onChange={(e) => setNewCheque({ ...newCheque, amount: Number(e.target.value) })}
              placeholder="0.00"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                color: '#1e293b',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              العملة
            </label>
            <select
              value={newCheque.currency}
              onChange={(e) => setNewCheque({ ...newCheque, currency: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '12px',
                color: '#1e293b',
                boxSizing: 'border-box',
              }}
            >
              <option value="EGP">جنيه مصري (EGP)</option>
              <option value="SAR">ريال سعودي (SAR)</option>
              <option value="AED">درهم إماراتي (AED)</option>
              <option value="USD">دولار أمريكي (USD)</option>
              <option value="EUR">يورو (EUR)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              تاريخ التحرير <span style={{ color: '#e11d48' }}>*</span>
            </label>
            <input
              type="date"
              value={newCheque.issueDate}
              onChange={(e) => setNewCheque({ ...newCheque, issueDate: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '12px',
                color: '#1e293b',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              تاريخ الاستحقاق <span style={{ color: '#e11d48' }}>*</span>
            </label>
            <input
              type="date"
              value={newCheque.dueDate}
              onChange={(e) => setNewCheque({ ...newCheque, dueDate: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                color: '#1e293b',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              اسم الساحب (اختياري)
            </label>
            <input
              type="text"
              value={newCheque.drawerName || ''}
              onChange={(e) => setNewCheque({ ...newCheque, drawerName: e.target.value })}
              placeholder="الاسم الموقع على الشيك إن كان مغايراً للعميل"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '12px',
                color: '#1e293b',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              ملاحظات إضافية
            </label>
            <textarea
              rows={2}
              value={newCheque.notes || ''}
              onChange={(e) => setNewCheque({ ...newCheque, notes: e.target.value })}
              placeholder="رقم الفاتورة أو العقد المرتبط بالشيك..."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '12px',
                color: '#1e293b',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>
        </div>

        <div className="standard-dialog-footer">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowCreateModal(false)}
            style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '8px' }}
          >
            إلغاء
          </Button>
          <Button
            type="button"
            onClick={() => createMutation.mutate(newCheque)}
            disabled={
              createMutation.isPending ||
              !newCheque.chequeNumber ||
              !newCheque.partnerName ||
              !newCheque.bankName ||
              !newCheque.amount ||
              !newCheque.dueDate
            }
            style={{
              backgroundColor: '#170e5e',
              color: '#ffffff',
              padding: '8px 22px',
              fontSize: '13px',
              fontWeight: 700,
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              opacity: createMutation.isPending || !newCheque.chequeNumber ? 0.6 : 1,
            }}
          >
            {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ الشيك بالحافظة'}
          </Button>
        </div>
      </DialogShell>

      {/* Modal 2: Lifecycle Actions (Deposit, Collect, Clear, Bounce, Endorse) */}
      <DialogShell
        isOpen={Boolean(activeActionModal && activeActionModal !== 'voucher' && selectedCheque)}
        onClose={() => setActiveActionModal(null)}
        size="md"
      >
        <div className="standard-dialog-header">
          <div>
            <h2 className="standard-dialog-title">
              {activeActionModal === 'deposit' && 'إيداع الشيك برسم التحصيل بالبنك'}
              {activeActionModal === 'collect' && 'تأكيد تحصيل الشيك بالبنك'}
              {activeActionModal === 'clear' && 'تأكيد صرف ورقة الدفع بنكياً'}
              {activeActionModal === 'bounce' && 'تسجيل ارتداد / رفض الشيك'}
              {activeActionModal === 'endorse' && 'تظهير الشيك لمورد'}
            </h2>
            <p className="standard-dialog-subtitle">
              تنفيذ الحركة المحاسبية وتحديث حالة الشيك
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveActionModal(null)}
            className="standard-dialog-close-btn"
            aria-label="إغلاق"
          >
            <XIcon size={18} />
          </button>
        </div>

        {selectedCheque && (
          <div className="standard-dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ backgroundColor: '#f8fafc', borderRadius: '10px', padding: '12px 14px', border: '1px solid #e2e8f0', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>رقم الشيك:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1e293b' }}>
                  {selectedCheque.cheque_number}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>الطرف:</span>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{selectedCheque.partner_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>المبلغ:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                  {formatCurrency(selectedCheque.amount)} {selectedCheque.currency}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  تاريخ الإجراء <span style={{ color: '#e11d48' }}>*</span>
                </label>
                <input
                  type="date"
                  value={actionDate}
                  onChange={(e) => setActionDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '12px',
                    color: '#1e293b',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {activeActionModal === 'bounce' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      سبب الرفض / الارتداد <span style={{ color: '#e11d48' }}>*</span>
                    </label>
                    <select
                      value={bouncedReason}
                      onChange={(e) => setBouncedReason(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        fontSize: '12px',
                        color: '#1e293b',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="عدم كفاية الرصيد">عدم كفاية الرصيد (رفض مالي)</option>
                      <option value="اختلاف التوقيع">اختلاف التوقيع عن نموذج البنك</option>
                      <option value="شيك ملغى أو عليه أمر إيقاف صرف">
                        شيك ملغى أو عليه أمر إيقاف صرف
                      </option>
                      <option value="خطأ أو شطب في كتابة المبلغ أو التاريخ">
                        خطأ أو شطب في كتابة المبلغ أو التاريخ
                      </option>
                      <option value="الحساب مغلق بالبنك">الحساب مغلق بالبنك</option>
                      <option value="سبب بنكي آخر">سبب بنكي آخر</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      مصاريف الرفض البنكية (إن وجدت)
                    </label>
                    <input
                      type="number"
                      value={bouncedFee}
                      onChange={(e) => setBouncedFee(e.target.value)}
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        fontSize: '12px',
                        color: '#1e293b',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </>
              )}

              {activeActionModal === 'endorse' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    اسم المورد المراد تظهير الشيك إليه <span style={{ color: '#e11d48' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={endorsedSupplier}
                    onChange={(e) => setEndorsedSupplier(e.target.value)}
                    placeholder="اسم المورد المستحق للسداد"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      fontSize: '12px',
                      color: '#1e293b',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  ملاحظات
                </label>
                <input
                  type="text"
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="ملاحظات حول الإجراء..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '12px',
                    color: '#1e293b',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="standard-dialog-footer">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setActiveActionModal(null)}
            style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '8px' }}
          >
            إلغاء
          </Button>
          <Button
            type="button"
            onClick={handleActionSubmit}
            disabled={updateStatusMutation.isPending}
            style={{
              backgroundColor: '#170e5e',
              color: '#ffffff',
              padding: '8px 22px',
              fontSize: '13px',
              fontWeight: 700,
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              opacity: updateStatusMutation.isPending ? 0.6 : 1,
            }}
          >
            {updateStatusMutation.isPending ? 'جاري التنفيذ...' : 'تأكيد الإجراء'}
          </Button>
        </div>
      </DialogShell>

      {/* Modal 3: Cheque Voucher Print Preview */}
      <DialogShell
        isOpen={Boolean(activeActionModal === 'voucher' && selectedCheque)}
        onClose={() => setActiveActionModal(null)}
        size="lg"
      >
        <div className="standard-dialog-header">
          <div>
            <h2 className="standard-dialog-title">
              سند استلام / تسليم شيك بنكي
            </h2>
            <p className="standard-dialog-subtitle">
              معاينة وطباعة السند المالي المعتمد للشيك
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              type="button"
              onClick={() => window.print()}
              variant="secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: '8px',
              }}
            >
              <PrinterIcon size={14} />
              <span>طباعة السند</span>
            </Button>
            <button
              type="button"
              onClick={() => setActiveActionModal(null)}
              className="standard-dialog-close-btn"
              aria-label="إغلاق"
            >
              <XIcon size={18} />
            </button>
          </div>
        </div>

        {selectedCheque && (
          <div className="standard-dialog-body">
            {/* Printable Voucher Paper */}
            <div style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '24px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                    {selectedCheque.type === 'receivable' ? 'سند استلام شيك (ورقة قبض)' : 'سند تسليم شيك (ورقة دفع)'}
                  </h3>
                  <p style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace', margin: 0 }}>
                    رقم الإيصال: REC-CHK-{selectedCheque.id}
                  </p>
                </div>
                <div style={{ textAlign: 'left', fontFamily: 'monospace', fontSize: '11px', color: '#475569' }}>
                  <div>التاريخ: {selectedCheque.issue_date}</div>
                  <div>الحالة: {STATUS_LABELS[selectedCheque.status]?.text}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', padding: '8px 0' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>وصلنا من / سلم إلى:</span>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{selectedCheque.partner_name}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>المبلغ وقدره:</span>
                  <span style={{ fontWeight: 800, fontSize: '14px', color: '#047857' }}>
                    {formatCurrency(selectedCheque.amount)} {selectedCheque.currency}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>رقم الشيك:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{selectedCheque.cheque_number}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>مسحوب على بنك:</span>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: '#334155' }}>{selectedCheque.bank_name}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>تاريخ الاستحقاق:</span>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{selectedCheque.due_date}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>الفرع:</span>
                  <span style={{ fontSize: '13px', color: '#334155' }}>{selectedCheque.branch_name || 'الرئيسي'}</span>
                </div>
              </div>

              {selectedCheque.notes && (
                <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>ملاحظات:</span>
                  <span style={{ color: '#334155', fontSize: '12px' }}>{selectedCheque.notes}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', paddingTop: '24px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '32px' }}>توقيع المستلم / أمين الخزينة</span>
                  <div style={{ borderBottom: '1px solid #cbd5e1', width: '130px', margin: '0 auto' }} />
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '32px' }}>توقيع المعتمد / الإدارة المالية</span>
                  <div style={{ borderBottom: '1px solid #cbd5e1', width: '130px', margin: '0 auto' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="standard-dialog-footer">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setActiveActionModal(null)}
            style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '8px' }}
          >
            إغلاق
          </Button>
        </div>
      </DialogShell>
    </div>
  );
}
