import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import {
  CreditCardIcon,
  SearchIcon,
  PlusIcon,
  RefreshCwIcon,
  DownloadIcon,
  PrinterIcon,
  CheckCircleIcon,
  ClockIcon,
  BuildingIcon,
  FileTextIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ShieldAlertIcon,
  Trash2Icon,
} from '@/shared/components/icons/AppIcons';
import {
  pdcChequesApi,
  type PdcCheque,
  type PdcChequesStats,
  type ChequeType,
  type ChequeStatus,
  type CreatePdcChequePayload,
} from '@/features/accounting/api/accounting.api';

const STATUS_LABELS: Record<ChequeStatus, { text: string; bg: string; textCol: string }> = {
  in_safe: { text: 'في الخزينة', bg: 'bg-blue-50', textCol: 'text-blue-700 border-blue-200' },
  under_collection: { text: 'برسم التحصيل', bg: 'bg-amber-50', textCol: 'text-amber-700 border-amber-200' },
  collected: { text: 'محصل بالبنك', bg: 'bg-emerald-50', textCol: 'text-emerald-700 border-emerald-200' },
  bounced: { text: 'مرتد / مرفوض', bg: 'bg-rose-50', textCol: 'text-rose-700 border-rose-200' },
  endorsed: { text: 'مظهر لمورد', bg: 'bg-purple-50', textCol: 'text-purple-700 border-purple-200' },
  returned: { text: 'مردود للعميل', bg: 'bg-slate-50', textCol: 'text-slate-700 border-slate-200' },
  cancelled: { text: 'ملغى', bg: 'bg-zinc-100', textCol: 'text-zinc-500 border-zinc-200' },
  issued: { text: 'محرر للمورد', bg: 'bg-blue-50', textCol: 'text-blue-700 border-blue-200' },
  cleared: { text: 'تم الصرف بنكياً', bg: 'bg-emerald-50', textCol: 'text-emerald-700 border-emerald-200' },
};

export function PdcChequesPage() {
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
    <div dir="rtl" className="w-full min-h-screen bg-[#f8fafc] text-slate-900 pb-16 space-y-6">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                <CreditCardIcon size={22} strokeWidth={2} />
              </span>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                حافظة الشيكات وأوراق القبض والدفع (PDC Management)
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              إدارة دورة أوراق القبض والدفع، الإيداع البنكي برسم التحصيل، الصرف، الارتداد، والتظهير
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => openCreateModal('receivable')}
              className="bg-[#170e5e] hover:bg-[#120b4c] text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <PlusIcon size={15} />
              <span>تسجيل ورقة قبض (شيك عميل)</span>
            </Button>

            <Button
              onClick={() => openCreateModal('payable')}
              variant="secondary"
              className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5"
            >
              <PlusIcon size={15} />
              <span>تحرير ورقة دفع (شيك مورد)</span>
            </Button>

            <Button
              onClick={handleExportCsv}
              variant="secondary"
              className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1"
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
              className="text-slate-600 hover:text-slate-900 text-xs px-2.5 py-2 rounded-lg"
              title="تحديث البيانات"
            >
              <RefreshCwIcon size={15} />
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-6">
        {/* KPI Metric Summary Cards (6 Cards) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium">أوراق القبض (عملاء)</span>
              <TrendingDownIcon size={16} className="text-emerald-600" />
            </div>
            <div className="text-lg font-bold text-slate-900">
              {formatCurrency(stats?.receivables.totalAmount || 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {stats?.receivables.totalCount || 0} شيك إجمالي
            </div>
          </Card>

          <Card className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium">في الخزينة</span>
              <BuildingIcon size={16} className="text-blue-600" />
            </div>
            <div className="text-lg font-bold text-blue-700">
              {formatCurrency(stats?.receivables.inSafeAmount || 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {stats?.receivables.inSafeCount || 0} شيك جاهز للإيداع
            </div>
          </Card>

          <Card className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium">برسم التحصيل</span>
              <ClockIcon size={16} className="text-amber-600" />
            </div>
            <div className="text-lg font-bold text-amber-700">
              {formatCurrency(stats?.receivables.underCollectionAmount || 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {stats?.receivables.underCollectionCount || 0} شيك مودع بالبنك
            </div>
          </Card>

          <Card className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium">أوراق محصلة</span>
              <CheckCircleIcon size={16} className="text-emerald-600" />
            </div>
            <div className="text-lg font-bold text-emerald-700">
              {formatCurrency(stats?.receivables.collectedAmount || 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {stats?.receivables.collectedCount || 0} شيك محصل بنجاح
            </div>
          </Card>

          <Card className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium">أوراق الدفع (موردين)</span>
              <TrendingUpIcon size={16} className="text-purple-600" />
            </div>
            <div className="text-lg font-bold text-purple-700">
              {formatCurrency(stats?.payables.totalAmount || 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {stats?.payables.issuedCount || 0} محرر لم يصرف بعد
            </div>
          </Card>

          <Card className="bg-white border border-rose-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-rose-600 mb-1">
              <span className="text-xs font-bold">شيكات مرتدة / متأخرة</span>
              <ShieldAlertIcon size={16} className="text-rose-600" />
            </div>
            <div className="text-lg font-bold text-rose-700">
              {formatCurrency(
                (stats?.receivables.bouncedAmount || 0) + (stats?.receivables.overdueAmount || 0),
              )}
            </div>
            <div className="text-[11px] text-rose-600 mt-1 font-medium">
              {(stats?.receivables.bouncedCount || 0) + (stats?.receivables.overdueCount || 0)} شيك يتطلب المتابعة
            </div>
          </Card>
        </div>

        {/* Tab Switcher & Filter Toolbar */}
        <Card className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4">
            {/* Tabs */}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => {
                  setActiveTab('receivable');
                  setStatusFilter('all');
                }}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'receivable'
                    ? 'bg-white text-[#170e5e] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                أوراق القبض (عملاء)
              </button>
              <button
                onClick={() => {
                  setActiveTab('payable');
                  setStatusFilter('all');
                }}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'payable'
                    ? 'bg-white text-[#170e5e] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                أوراق الدفع (موردين)
              </button>
              <button
                onClick={() => {
                  setActiveTab('alerts');
                  setStatusFilter('all');
                }}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1 ${
                  activeTab === 'alerts'
                    ? 'bg-white text-rose-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>تنبيهات الاستحقاق والارتداد</span>
                {((stats?.receivables.overdueCount || 0) + (stats?.receivables.dueSoonCount || 0) > 0) && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse inline-block" />
                )}
              </button>
            </div>

            {/* Quick Status Filter Buttons */}
            {activeTab === 'receivable' && (
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                {[
                  { id: 'all', label: 'الكل' },
                  { id: 'in_safe', label: 'في الخزينة' },
                  { id: 'under_collection', label: 'برسم التحصيل' },
                  { id: 'collected', label: 'محصل' },
                  { id: 'bounced', label: 'مرتد' },
                  { id: 'endorsed', label: 'مظهر' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStatusFilter(s.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      statusFilter === s.id
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'payable' && (
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                {[
                  { id: 'all', label: 'الكل' },
                  { id: 'issued', label: 'محرر لم يصرف' },
                  { id: 'cleared', label: 'تم الصرف بنكياً' },
                  { id: 'bounced', label: 'مرتد' },
                  { id: 'cancelled', label: 'ملغى' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStatusFilter(s.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      statusFilter === s.id
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search & Date Filter Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2 relative">
              <SearchIcon size={16} className="absolute right-3 top-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث برقم الشيك، اسم العميل، اسم المورد، أو اسم البنك..."
                className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white"
              />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 whitespace-nowrap">استحقاق من:</span>
                <input
                  type="date"
                  value={dueFrom}
                  onChange={(e) => setDueFrom(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:bg-white"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 whitespace-nowrap">إلى:</span>
                <input
                  type="date"
                  value={dueTo}
                  onChange={(e) => setDueTo(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:bg-white"
                />
                {(search || dueFrom || dueTo || statusFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearch('');
                      setDueFrom('');
                      setDueTo('');
                      setStatusFilter('all');
                    }}
                    className="text-xs text-rose-600 hover:underline px-2 whitespace-nowrap"
                  >
                    إعادة ضبط
                  </button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Cheques Data Table */}
        <Card className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
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
                      bg: 'bg-slate-50',
                      textCol: 'text-slate-700 border-slate-200',
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
                            className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold border ${statusInfo.bg} ${statusInfo.textCol}`}
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
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* Actions for Receivables */}
                            {c.type === 'receivable' && c.status === 'in_safe' && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedCheque(c);
                                    setActiveActionModal('deposit');
                                  }}
                                  className="px-2 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 text-[11px] font-medium"
                                  title="إيداع الشيك برسم التحصيل في البنك"
                                >
                                  إيداع بالبنك
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedCheque(c);
                                    setActiveActionModal('collect');
                                  }}
                                  className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-medium"
                                  title="تحصيل مباشر"
                                >
                                  تحصيل
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedCheque(c);
                                    setActiveActionModal('endorse');
                                  }}
                                  className="px-2 py-1 rounded bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 text-[11px] font-medium"
                                  title="تظهير الشيك لمورد"
                                >
                                  تظهير
                                </button>
                              </>
                            )}

                            {c.type === 'receivable' && c.status === 'under_collection' && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedCheque(c);
                                    setActiveActionModal('collect');
                                  }}
                                  className="px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-semibold shadow-sm"
                                  title="تأكيد تحصيل الشيك وإضافته للرصيد"
                                >
                                  تأكيد التحصيل
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedCheque(c);
                                    setActiveActionModal('bounce');
                                  }}
                                  className="px-2 py-1 rounded bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 text-[11px] font-medium"
                                  title="تسجيل ارتداد ورفض الشيك"
                                >
                                  ارتداد
                                </button>
                                <button
                                  onClick={() => handleDirectAction(c, 'restore_to_safe')}
                                  className="px-2 py-1 rounded bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 text-[11px]"
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
                                  onClick={() => {
                                    setSelectedCheque(c);
                                    setActiveActionModal('clear');
                                  }}
                                  className="px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-semibold shadow-sm"
                                  title="تأكيد صرف الشيك وخصمه من البنك"
                                >
                                  تأكيد الصرف
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedCheque(c);
                                    setActiveActionModal('bounce');
                                  }}
                                  className="px-2 py-1 rounded bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 text-[11px] font-medium"
                                  title="ارتداد الشيك"
                                >
                                  ارتداد
                                </button>
                              </>
                            )}

                            {/* Bounced Recovery Action */}
                            {c.status === 'bounced' && (
                              <button
                                onClick={() => handleDirectAction(c, 'restore_to_safe')}
                                className="px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-[11px]"
                              >
                                إعادة للحافظة
                              </button>
                            )}

                            {/* Voucher Print Button */}
                            <button
                              onClick={() => {
                                setSelectedCheque(c);
                                setActiveActionModal('voucher');
                              }}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                              title="معاينة وطباعة سند الشيك"
                            >
                              <PrinterIcon size={15} />
                            </button>

                            {/* Delete Button (Allowed for safe, issued, or cancelled) */}
                            {['in_safe', 'issued', 'cancelled', 'bounced'].includes(c.status) && (
                              <button
                                onClick={() => handleDeleteCheque(c)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                title="حذف الشيك"
                              >
                                <Trash2Icon size={15} />
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
        </Card>
      </div>

      {/* Modal 1: Register New Cheque */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <Card className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-xl shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                {createChequeType === 'receivable'
                  ? 'تسجيل ورقة قبض جديدة (شيك عميل)'
                  : 'تحرير ورقة دفع جديدة (شيك مورد)'}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  رقم الشيك <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCheque.chequeNumber}
                  onChange={(e) => setNewCheque({ ...newCheque, chequeNumber: e.target.value })}
                  placeholder="مثال: 00482910"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {createChequeType === 'receivable' ? 'اسم العميل / المستفيد' : 'اسم المورد المستفيد'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCheque.partnerName}
                  onChange={(e) => setNewCheque({ ...newCheque, partnerName: e.target.value })}
                  placeholder="الاسم الثلاثي أو اسم المنشأة"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  البنك المسحوب عليه <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCheque.bankName}
                  onChange={(e) => setNewCheque({ ...newCheque, bankName: e.target.value })}
                  placeholder="مثال: البنك الأهلي المصري / بنك الراجحي"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">فرع البنك</label>
                <input
                  type="text"
                  value={newCheque.branchName || ''}
                  onChange={(e) => setNewCheque({ ...newCheque, branchName: e.target.value })}
                  placeholder="مثال: فرع التجمع الخامس"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  المبلغ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newCheque.amount || ''}
                  onChange={(e) => setNewCheque({ ...newCheque, amount: Number(e.target.value) })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">العملة</label>
                <select
                  value={newCheque.currency}
                  onChange={(e) => setNewCheque({ ...newCheque, currency: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400"
                >
                  <option value="EGP">جنيه مصري (EGP)</option>
                  <option value="SAR">ريال سعودي (SAR)</option>
                  <option value="AED">درهم إماراتي (AED)</option>
                  <option value="USD">دولار أمريكي (USD)</option>
                  <option value="EUR">يورو (EUR)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  تاريخ التحرير <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={newCheque.issueDate}
                  onChange={(e) => setNewCheque({ ...newCheque, issueDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  تاريخ الاستحقاق <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={newCheque.dueDate}
                  onChange={(e) => setNewCheque({ ...newCheque, dueDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">اسم الساحب (اختياري)</label>
                <input
                  type="text"
                  value={newCheque.drawerName || ''}
                  onChange={(e) => setNewCheque({ ...newCheque, drawerName: e.target.value })}
                  placeholder="الاسم الموقع على الشيك إن كان مغايراً للعميل"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">ملاحظات إضافية</label>
                <textarea
                  rows={2}
                  value={newCheque.notes || ''}
                  onChange={(e) => setNewCheque({ ...newCheque, notes: e.target.value })}
                  placeholder="رقم الفاتورة أو العقد المرتبط بالشيك..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <Button
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
                className="text-xs px-4 py-2"
              >
                إلغاء
              </Button>
              <Button
                onClick={() => createMutation.mutate(newCheque)}
                disabled={
                  createMutation.isPending ||
                  !newCheque.chequeNumber ||
                  !newCheque.partnerName ||
                  !newCheque.bankName ||
                  !newCheque.amount ||
                  !newCheque.dueDate
                }
                className="bg-[#170e5e] hover:bg-[#120b4c] text-white text-xs font-semibold px-5 py-2 shadow-sm"
              >
                {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ الشيك بالحافظة'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal 2: Lifecycle Actions (Deposit, Collect, Clear, Bounce, Endorse) */}
      {activeActionModal && activeActionModal !== 'voucher' && selectedCheque && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">
                {activeActionModal === 'deposit' && 'إيداع الشيك برسم التحصيل بالبنك'}
                {activeActionModal === 'collect' && 'تأكيد تحصيل الشيك بالبنك'}
                {activeActionModal === 'clear' && 'تأكيد صرف ورقة الدفع بنكياً'}
                {activeActionModal === 'bounce' && 'تسجيل ارتداد / رفض الشيك'}
                {activeActionModal === 'endorse' && 'تظهير الشيك لمورد'}
              </h2>
              <button
                onClick={() => setActiveActionModal(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500">رقم الشيك:</span>
                <span className="font-mono font-bold text-slate-800">
                  {selectedCheque.cheque_number}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">الطرف:</span>
                <span className="font-semibold text-slate-800">{selectedCheque.partner_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">المبلغ:</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(selectedCheque.amount)} {selectedCheque.currency}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  تاريخ الإجراء <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={actionDate}
                  onChange={(e) => setActionDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>

              {activeActionModal === 'bounce' && (
                <>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      سبب الرفض / الارتداد <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={bouncedReason}
                      onChange={(e) => setBouncedReason(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white"
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
                    <label className="block text-slate-700 font-semibold mb-1">
                      مصاريف الرفض البنكية (إن وجدت)
                    </label>
                    <input
                      type="number"
                      value={bouncedFee}
                      onChange={(e) => setBouncedFee(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white"
                    />
                  </div>
                </>
              )}

              {activeActionModal === 'endorse' && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    اسم المورد المراد تظهير الشيك إليه <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={endorsedSupplier}
                    onChange={(e) => setEndorsedSupplier(e.target.value)}
                    placeholder="اسم المورد المستحق للسداد"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">ملاحظات</label>
                <input
                  type="text"
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="ملاحظات حول الإجراء..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <Button
                variant="secondary"
                onClick={() => setActiveActionModal(null)}
                className="text-xs px-4 py-2"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleActionSubmit}
                disabled={updateStatusMutation.isPending}
                className="bg-[#170e5e] hover:bg-[#120b4c] text-white text-xs font-semibold px-5 py-2 shadow-sm"
              >
                {updateStatusMutation.isPending ? 'جاري التنفيذ...' : 'تأكيد الإجراء'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal 3: Cheque Voucher Print Preview */}
      {activeActionModal === 'voucher' && selectedCheque && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-lg shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">
                سند استلام / حافظة شيك
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => window.print()}
                  variant="secondary"
                  className="text-xs px-3 py-1 flex items-center gap-1 text-slate-700"
                >
                  <PrinterIcon size={14} />
                  <span>طباعة السند</span>
                </Button>
                <button
                  onClick={() => setActiveActionModal(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Voucher Paper */}
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 bg-white space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedCheque.type === 'receivable' ? 'سند استلام شيك (ورقة قبض)' : 'سند تسليم شيك (ورقة دفع)'}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono">
                    رقم الإيصال: REC-CHK-{selectedCheque.id}
                  </p>
                </div>
                <div className="text-left font-mono text-[11px] text-slate-600">
                  <div>التاريخ: {selectedCheque.issue_date}</div>
                  <div>الحالة: {STATUS_LABELS[selectedCheque.status]?.text}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 py-2">
                <div>
                  <span className="text-slate-500 block">وصلنا من / سلم إلى:</span>
                  <span className="font-bold text-sm text-slate-900">{selectedCheque.partner_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">المبلغ وقدره:</span>
                  <span className="font-bold text-sm text-emerald-700">
                    {formatCurrency(selectedCheque.amount)} {selectedCheque.currency}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">رقم الشيك:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedCheque.cheque_number}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">مسحوب على بنك:</span>
                  <span className="font-semibold text-slate-800">{selectedCheque.bank_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">تاريخ الاستحقاق:</span>
                  <span className="font-bold text-slate-900">{selectedCheque.due_date}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">الفرع:</span>
                  <span className="text-slate-800">{selectedCheque.branch_name || 'الرئيسي'}</span>
                </div>
              </div>

              {selectedCheque.notes && (
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block text-[10px]">ملاحظات:</span>
                  <span className="text-slate-700">{selectedCheque.notes}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-center">
                <div>
                  <span className="text-[11px] text-slate-500 block mb-8">توقيع المستلم / أمين الخزينة</span>
                  <div className="border-b border-slate-300 w-32 mx-auto" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block mb-8">توقيع المعتمد / الإدارة المالية</span>
                  <div className="border-b border-slate-300 w-32 mx-auto" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
