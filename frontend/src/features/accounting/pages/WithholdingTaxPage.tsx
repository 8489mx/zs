import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import {
  FileTextIcon,
  SearchIcon,
  PlusIcon,
  RefreshCwIcon,
  DownloadIcon,
  PrinterIcon,
  CheckCircleIcon,
  Trash2Icon,
  SparklesIcon,
} from '@/shared/components/icons/AppIcons';
import {
  withholdingTaxApi,
  type WithholdingTaxRecord,
  type Form41SummaryResponse,
  type CreateWhtTransactionPayload,
} from '@/features/accounting/api/accounting.api';

const WHT_TYPE_LABELS: Record<string, { label: string; rate: number; badge: string }> = {
  goods: { label: 'توريدات وسلع', rate: 1, badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  services: { label: 'خدمات ومصنعيات', rate: 3, badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  professional: { label: 'مهن حرة وعمولات', rate: 5, badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  custom: { label: 'نسبة أخرى', rate: 0, badge: 'bg-slate-50 text-slate-700 border-slate-200' },
};

const QUARTERS = [
  { id: 'Q1', label: 'الربع الأول Q1 (يناير - مارس)', period: 'يقدم خلال شهر أبريل' },
  { id: 'Q2', label: 'الربع الثاني Q2 (أبريل - يونيو)', period: 'يقدم خلال شهر يوليو' },
  { id: 'Q3', label: 'الربع الثالث Q3 (يوليو - سبتمبر)', period: 'يقدم خلال شهر أكتوبر' },
  { id: 'Q4', label: 'الربع الرابع Q4 (أكتوبر - ديسمبر)', period: 'يقدم خلال شهر يناير' },
];

export function WithholdingTaxPage() {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const initialQ = currentMonth <= 3 ? 'Q1' : currentMonth <= 6 ? 'Q2' : currentMonth <= 9 ? 'Q3' : 'Q4';

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedQuarter, setSelectedQuarter] = useState<string>(initialQ);
  const [selectedDirection, setSelectedDirection] = useState<'payable' | 'receivable'>('payable');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Form State
  const [newTx, setNewTx] = useState<CreateWhtTransactionPayload>({
    direction: 'payable',
    invoice_number: '',
    invoice_date: new Date().toISOString().slice(0, 10),
    partner_name: '',
    tax_id_number: '',
    file_number: '',
    tax_office_code: '',
    partner_address: '',
    wht_type: 'goods',
    wht_rate: 1,
    base_amount: 0,
    notes: '',
  });

  // Extract Form State
  const [extractDates, setExtractDates] = useState<{
    fromDate: string;
    toDate: string;
    defaultWhtType: 'goods' | 'services' | 'professional';
    defaultWhtRate: number;
  }>({
    fromDate: `${currentYear}-01-01`,
    toDate: new Date().toISOString().slice(0, 10),
    defaultWhtType: 'goods',
    defaultWhtRate: 1,
  });

  // Query
  const reportQuery = useQuery({
    queryKey: ['wht-form41', selectedYear, selectedQuarter, selectedDirection],
    queryFn: () =>
      withholdingTaxApi.getForm41({
        year: selectedYear,
        quarter: selectedQuarter,
        direction: selectedDirection,
      }),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: CreateWhtTransactionPayload) => withholdingTaxApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wht-form41'] });
      setShowCreateModal(false);
      resetNewTxForm();
    },
  });

  const extractMutation = useMutation({
    mutationFn: () => withholdingTaxApi.extractFromPurchases(extractDates),
    onSuccess: (data) => {
      alert(data.message);
      queryClient.invalidateQueries({ queryKey: ['wht-form41'] });
      setShowExtractModal(false);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'draft' | 'declared' | 'paid' }) =>
      withholdingTaxApi.updateStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wht-form41'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => withholdingTaxApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wht-form41'] });
    },
  });

  const resetNewTxForm = () => {
    setNewTx({
      direction: selectedDirection,
      invoice_number: '',
      invoice_date: new Date().toISOString().slice(0, 10),
      partner_name: '',
      tax_id_number: '',
      file_number: '',
      tax_office_code: '',
      partner_address: '',
      wht_type: 'goods',
      wht_rate: 1,
      base_amount: 0,
      notes: '',
    });
  };

  const handleWhtTypeChange = (type: 'goods' | 'services' | 'professional' | 'custom') => {
    let rate = 1;
    if (type === 'goods') rate = 1;
    else if (type === 'services') rate = 3;
    else if (type === 'professional') rate = 5;
    setNewTx((prev) => ({
      ...prev,
      wht_type: type,
      wht_rate: rate,
    }));
  };

  const reportData: Form41SummaryResponse | undefined = reportQuery.data;
  const rawList: WithholdingTaxRecord[] = reportData?.transactions || [];

  const filteredTransactions = rawList.filter((t) => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchPartner = t.partner_name.toLowerCase().includes(q);
      const matchInvoice = t.invoice_number.toLowerCase().includes(q);
      const matchTaxId = t.tax_id_number ? t.tax_id_number.includes(q) : false;
      if (!matchPartner && !matchInvoice && !matchTaxId) return false;
    }
    if (statusFilter !== 'all' && t.status !== statusFilter) {
      return false;
    }
    return true;
  });

  // Export to Egyptian Tax Authority (ETA) Form 41 Standard CSV
  const handleExportEtaCsv = () => {
    if (filteredTransactions.length === 0) return;
    const headers = [
      'مسلسل',
      'اسم الممول / المورد',
      'الرقم الضريبي (9 أرقام)',
      'رقم الملف الضريبي',
      'المأمورية الضريبية',
      'عنوان الممول',
      'رقم الفاتورة',
      'تاريخ الفاتورة',
      'نوع التعامل',
      'نسبة الخصم (%)',
      'القيمة الإجمالية للتعامل (قبل الضريبة)',
      'قيمة الضريبة المخصومة المحصلة',
      'الحالة',
      'ملاحظات',
    ];
    const rows = filteredTransactions.map((t, idx) => [
      idx + 1,
      `"${t.partner_name}"`,
      `"${t.tax_id_number || ''}"`,
      `"${t.file_number || ''}"`,
      `"${t.tax_office_code || ''}"`,
      `"${t.partner_address || ''}"`,
      `"${t.invoice_number}"`,
      t.invoice_date,
      WHT_TYPE_LABELS[t.wht_type]?.label || t.wht_type,
      t.wht_rate,
      t.base_amount,
      t.tax_amount,
      t.status === 'paid' ? 'تم التوريد' : t.status === 'declared' ? 'مقدم بالإقرار' : 'مسودة',
      `"${t.notes || ''}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ETA_Form41_${selectedYear}_${selectedQuarter}_${selectedDirection}.csv`;
    link.click;
    URL.revokeObjectURL(url);
  };

  return (
    <div dir="rtl" className="w-full min-h-screen bg-[#f8fafc] text-slate-900 pb-16 space-y-6">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                <FileTextIcon size={22} strokeWidth={2} />
              </span>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                ضريبة الخصم والإضافة المصرية ونموذج 41 ضرائب (Withholding Tax - WHT)
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              إعداد واستخراج إقرار نموذج 41 الربع سنوي المعتمد لمصلحة الضرائب المصرية (ETA) وتصدير شيت البوابة الرسمية
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => {
                resetNewTxForm();
                setShowCreateModal(true);
              }}
              className="bg-[#170e5e] hover:bg-[#120b4c] text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <PlusIcon size={15} />
              <span>إضافة معاملة خصم</span>
            </Button>

            {selectedDirection === 'payable' && (
              <Button
                onClick={() => setShowExtractModal(true)}
                variant="secondary"
                className="border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5"
              >
                <SparklesIcon size={15} />
                <span>استيراد آلي من فواتير الشراء</span>
              </Button>
            )}

            <Button
              onClick={handleExportEtaCsv}
              variant="secondary"
              className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1"
              title="تصدير شيت البوابة الإلكترونية لمصلحة الضرائب"
            >
              <DownloadIcon size={14} />
              <span>تصدير نموذج 41 (CSV)</span>
            </Button>

            <Button
              onClick={() => setShowPrintModal(true)}
              variant="secondary"
              className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1"
            >
              <PrinterIcon size={14} />
              <span>طباعة الإقرار الرسمي</span>
            </Button>

            <Button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['wht-form41'] })}
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
        {/* Period Selector & Direction Switcher */}
        <Card className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Direction Tabs */}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setSelectedDirection('payable')}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  selectedDirection === 'payable'
                    ? 'bg-white text-[#170e5e] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                نموذج 41 (خصم من الموردين لتوريده للضرائب)
              </button>
              <button
                onClick={() => setSelectedDirection('receivable')}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  selectedDirection === 'receivable'
                    ? 'bg-white text-[#170e5e] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                إشعارات الخصم من العملاء (مبالغ مستردة للشركة)
              </button>
            </div>

            {/* Quarter & Year Selector */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-600">السنة الضريبية:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:bg-white"
                >
                  {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
                {QUARTERS.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => setSelectedQuarter(q.id)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                      selectedQuarter === q.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                    title={q.period}
                  >
                    {q.id}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-xs font-bold">
                {selectedDirection === 'payable' ? 'إجمالي الضريبة واجبة التوريد' : 'إجمالي مبالغ الخصم المستردة'}
              </span>
              <CheckCircleIcon size={18} className="text-emerald-600" />
            </div>
            <div className="text-xl font-extrabold text-emerald-700">
              {formatCurrency(reportData?.total_tax_amount || 0)} ج.م
            </div>
            <div className="text-[11px] text-emerald-600 mt-1">
              عن {reportData?.total_count || 0} معاملة في {selectedQuarter} {selectedYear}
            </div>
          </Card>

          <Card className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium">وعاء توريدات السلع (1%)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">1%</span>
            </div>
            <div className="text-lg font-bold text-slate-900">
              {formatCurrency(reportData?.breakdown.goods.base_amount || 0)} ج.م
            </div>
            <div className="text-[11px] text-blue-600 mt-1 font-medium">
              الضريبة: {formatCurrency(reportData?.breakdown.goods.tax_amount || 0)} ج.م ({reportData?.breakdown.goods.count || 0} معاملة)
            </div>
          </Card>

          <Card className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium">وعاء الخدمات والمصنعيات (3%)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">3%</span>
            </div>
            <div className="text-lg font-bold text-slate-900">
              {formatCurrency(reportData?.breakdown.services.base_amount || 0)} ج.م
            </div>
            <div className="text-[11px] text-emerald-600 mt-1 font-medium">
              الضريبة: {formatCurrency(reportData?.breakdown.services.tax_amount || 0)} ج.م ({reportData?.breakdown.services.count || 0} معاملة)
            </div>
          </Card>

          <Card className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium">وعاء المهن الحرة والعمولات (5%)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-bold">5%</span>
            </div>
            <div className="text-lg font-bold text-slate-900">
              {formatCurrency(reportData?.breakdown.professional.base_amount || 0)} ج.م
            </div>
            <div className="text-[11px] text-purple-600 mt-1 font-medium">
              الضريبة: {formatCurrency(reportData?.breakdown.professional.tax_amount || 0)} ج.م ({reportData?.breakdown.professional.count || 0} معاملة)
            </div>
          </Card>
        </div>

        {/* Filter Bar */}
        <Card className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 relative">
              <SearchIcon size={16} className="absolute right-3 top-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث باسم الممول/المورد، رقم الفاتورة، أو الرقم الضريبي..."
                className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:bg-white"
              >
                <option value="all">كافة الحالات</option>
                <option value="draft">مسودة</option>
                <option value="declared">مقدم بالإقرار</option>
                <option value="paid">تم السداد والتوريد</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Form 41 Detailed Table */}
        <Card className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {reportQuery.isLoading ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              جاري تحميل بيانات إقرار نموذج 41...
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
                <FileTextIcon size={24} />
              </div>
              <h3 className="text-sm font-semibold text-slate-700">
                لا توجد معاملات خصم وإضافة مسجلة في {selectedQuarter} {selectedYear}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                يمكنك إضافة معاملة يدوية أو استخدام زر الاستيراد الآلي من فواتير الشراء أعلاه
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-4">م</th>
                    <th className="py-3 px-4">اسم الممول / المورد</th>
                    <th className="py-3 px-4">الرقم الضريبي / الملف</th>
                    <th className="py-3 px-4">رقم الفاتورة</th>
                    <th className="py-3 px-4">تاريخ التعامل</th>
                    <th className="py-3 px-4">نوع التعامل والنسبة</th>
                    <th className="py-3 px-4">الوعاء الخاضع للضريبة</th>
                    <th className="py-3 px-4">الضريبة المخصومة</th>
                    <th className="py-3 px-4 text-center">الحالة</th>
                    <th className="py-3 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((t, index) => {
                    const typeInfo = WHT_TYPE_LABELS[t.wht_type] || WHT_TYPE_LABELS.custom;
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 text-slate-400 font-mono">{index + 1}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{t.partner_name}</div>
                          {t.partner_address && (
                            <span className="text-[10px] text-slate-400 block truncate max-w-xs">
                              {t.partner_address}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">
                          <div>{t.tax_id_number || 'غير مسجل'}</div>
                          {t.tax_office_code && (
                            <span className="text-[10px] text-slate-400 font-sans">
                              مأمورية: {t.tax_office_code}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-800">
                          {t.invoice_number}
                        </td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {t.invoice_date}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${typeInfo.badge}`}
                          >
                            {typeInfo.label} ({t.wht_rate}%)
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                          {formatCurrency(t.base_amount)} ج.م
                        </td>
                        <td className="py-3 px-4 font-extrabold text-emerald-700 whitespace-nowrap">
                          {formatCurrency(t.tax_amount)} ج.م
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                              t.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : t.status === 'declared'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {t.status === 'paid' ? 'تم السداد' : t.status === 'declared' ? 'مقدم بالإقرار' : 'مسودة'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {t.status === 'draft' && (
                              <button
                                onClick={() => updateStatusMutation.mutate({ id: t.id, status: 'declared' })}
                                className="px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-[11px]"
                                title="تضمين في الإقرار النهائي"
                              >
                                اعتماد بالإقرار
                              </button>
                            )}
                            {t.status === 'declared' && (
                              <button
                                onClick={() => updateStatusMutation.mutate({ id: t.id, status: 'paid' })}
                                className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-[11px]"
                                title="تأكيد التوريد والسداد لمصلحة الضرائب"
                              >
                                تأكيد التوريد
                              </button>
                            )}
                            {t.status !== 'paid' && (
                              <button
                                onClick={() => {
                                  if (confirm(`هل أنت متأكد من حذف معاملة الفاتورة ${t.invoice_number}؟`)) {
                                    deleteMutation.mutate(t.id);
                                  }
                                }}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                title="حذف"
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
        </Card>
      </div>

      {/* Modal 1: Create Manual Transaction */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-lg shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">
                تسجيل معاملة خصم وتحصيل جديدة (نموذج 41)
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="md:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">
                  اسم المورد / الممول <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTx.partner_name}
                  onChange={(e) => setNewTx({ ...newTx, partner_name: e.target.value })}
                  placeholder="اسم الشركة أو التاجر أو المهني"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  رقم الفاتورة <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTx.invoice_number}
                  onChange={(e) => setNewTx({ ...newTx, invoice_number: e.target.value })}
                  placeholder="مثال: INV-10492"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  تاريخ الفاتورة <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={newTx.invoice_date}
                  onChange={(e) => setNewTx({ ...newTx, invoice_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  الرقم الضريبي (9 أرقام)
                </label>
                <input
                  type="text"
                  value={newTx.tax_id_number || ''}
                  onChange={(e) => setNewTx({ ...newTx, tax_id_number: e.target.value })}
                  placeholder="مثال: 100234567"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  المأمورية الضريبية
                </label>
                <input
                  type="text"
                  value={newTx.tax_office_code || ''}
                  onChange={(e) => setNewTx({ ...newTx, tax_office_code: e.target.value })}
                  placeholder="مثال: مأمورية قصر النيل"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  نوع التعامل <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newTx.wht_type}
                  onChange={(e) => handleWhtTypeChange(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white"
                >
                  <option value="goods">توريدات وسلع (1%)</option>
                  <option value="services">خدمات ومصنعيات (3%)</option>
                  <option value="professional">مهن حرة واستشارات (5%)</option>
                  <option value="custom">نسبة مخصصة أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  نسبة الخصم (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newTx.wht_rate || 0}
                  onChange={(e) => setNewTx({ ...newTx, wht_rate: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">
                  القيمة الإجمالية للتعامل (وعاء الخصم قبل الضريبة) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newTx.base_amount || ''}
                  onChange={(e) => setNewTx({ ...newTx, base_amount: Number(e.target.value) })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:bg-white"
                />
                {newTx.base_amount > 0 && (
                  <div className="mt-1 text-[11px] text-emerald-700 font-semibold">
                    قيمة الضريبة المحتسبة: {formatCurrency(newTx.base_amount * ((newTx.wht_rate || 1) / 100))} ج.م
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <Button
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
                className="text-xs px-4 py-2"
              >
                إلغاء
              </Button>
              <Button
                onClick={() => createMutation.mutate(newTx)}
                disabled={
                  createMutation.isPending ||
                  !newTx.partner_name ||
                  !newTx.invoice_number ||
                  !newTx.base_amount
                }
                className="bg-[#170e5e] hover:bg-[#120b4c] text-white text-xs font-semibold px-5 py-2 shadow-sm"
              >
                {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ المعاملة'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal 2: Smart Extract from Purchases */}
      {showExtractModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-sm">
                <SparklesIcon size={16} />
                <span>استيراد آلي من فواتير المشتريات المسجلة</span>
              </div>
              <button
                onClick={() => setShowExtractModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              يقوم هذا المعالج بفحص جميع فواتير الشراء غير الملغاة التي تجاوزت 300 ج.م في الفترة المحددة، ويستخرج بيانات المورد والرقم الضريبي والوعاء تلقائياً لتضمينها في نموذج 41 دون تكرار.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">من تاريخ</label>
                <input
                  type="date"
                  value={extractDates.fromDate}
                  onChange={(e) => setExtractDates({ ...extractDates, fromDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">إلى تاريخ</label>
                <input
                  type="date"
                  value={extractDates.toDate}
                  onChange={(e) => setExtractDates({ ...extractDates, toDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">نسبة الخصم الافتراضية</label>
                <select
                  value={extractDates.defaultWhtRate}
                  onChange={(e) =>
                    setExtractDates({
                      ...extractDates,
                      defaultWhtRate: Number(e.target.value),
                      defaultWhtType: Number(e.target.value) === 1 ? 'goods' : Number(e.target.value) === 5 ? 'professional' : 'services',
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value={1}>1% (توريدات ومشتريات سلع وبضائع)</option>
                  <option value={3}>3% (خدمات ومقاولات ومصنعيات)</option>
                  <option value={5}>5% (مهن حرة واستشارات)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <Button
                variant="secondary"
                onClick={() => setShowExtractModal(false)}
                className="text-xs px-4 py-2"
              >
                إلغاء
              </Button>
              <Button
                onClick={() => extractMutation.mutate()}
                disabled={extractMutation.isPending}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-5 py-2 shadow-sm"
              >
                {extractMutation.isPending ? 'جاري الفحص والاستيراد...' : 'بدء الاستيراد الآلي'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal 3: Printable Official Form 41 Declaration */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-4xl shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                إقرار نموذج 41 ضرائب (الخصم والتحصيل تحت حساب الضريبة)
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => window.print()}
                  variant="secondary"
                  className="text-xs px-3 py-1 flex items-center gap-1 text-slate-700"
                >
                  <PrinterIcon size={14} />
                  <span>طباعة (A4)</span>
                </Button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Form 41 Official Paper */}
            <div className="border border-slate-300 rounded-xl p-6 bg-white space-y-5 text-xs text-slate-900">
              {/* Official Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold">جمهورية مصر العربية - وزارة المالية</h3>
                  <h4 className="text-xs font-semibold text-slate-700">مصلحة الضرائب المصرية</h4>
                  <p className="text-[11px] text-slate-500">إدارة تجميع نماذج الخصم والتحصيل</p>
                </div>
                <div className="text-center">
                  <div className="border-2 border-slate-800 px-4 py-1.5 rounded font-bold text-base bg-slate-50">
                    نموذج 41 ضرائب
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600 block mt-1">
                    عن {QUARTERS.find((q) => q.id === selectedQuarter)?.label} سنة {selectedYear}
                  </span>
                </div>
              </div>

              {/* Summary Stats Grid */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">إجمالي عدد المعاملات:</span>
                  <span className="font-bold text-sm text-slate-900">{reportData?.total_count || 0}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">إجمالي وعاء التعامل:</span>
                  <span className="font-bold text-sm text-slate-900">{formatCurrency(reportData?.total_base_amount || 0)} ج.م</span>
                </div>
                <div>
                  <span className="text-slate-500 block">إجمالي الضريبة واجبة التوريد:</span>
                  <span className="font-bold text-sm text-emerald-800">{formatCurrency(reportData?.total_tax_amount || 0)} ج.م</span>
                </div>
              </div>

              {/* Printable Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-right border border-slate-300 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300">
                      <th className="p-2 border-r border-slate-300">م</th>
                      <th className="p-2 border-r border-slate-300">اسم الممول</th>
                      <th className="p-2 border-r border-slate-300">الرقم الضريبي</th>
                      <th className="p-2 border-r border-slate-300">رقم الفاتورة</th>
                      <th className="p-2 border-r border-slate-300">تاريخها</th>
                      <th className="p-2 border-r border-slate-300">طبيعة التعامل</th>
                      <th className="p-2 border-r border-slate-300">النسبة</th>
                      <th className="p-2 border-r border-slate-300">قيمة التعامل</th>
                      <th className="p-2">الضريبة المحصلة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((t, i) => (
                      <tr key={t.id} className="border-b border-slate-200">
                        <td className="p-1.5 border-r border-slate-300 text-center">{i + 1}</td>
                        <td className="p-1.5 border-r border-slate-300 font-semibold">{t.partner_name}</td>
                        <td className="p-1.5 border-r border-slate-300 font-mono">{t.tax_id_number || '-'}</td>
                        <td className="p-1.5 border-r border-slate-300 font-mono">{t.invoice_number}</td>
                        <td className="p-1.5 border-r border-slate-300">{t.invoice_date}</td>
                        <td className="p-1.5 border-r border-slate-300">{WHT_TYPE_LABELS[t.wht_type]?.label || t.wht_type}</td>
                        <td className="p-1.5 border-r border-slate-300 text-center">{t.wht_rate}%</td>
                        <td className="p-1.5 border-r border-slate-300 font-bold">{formatCurrency(t.base_amount)}</td>
                        <td className="p-1.5 font-bold text-emerald-800">{formatCurrency(t.tax_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Official Declarations & Signatures */}
              <div className="pt-6 border-t border-slate-200 space-y-4">
                <p className="text-[11px] text-slate-600 leading-relaxed text-justify">
                  أقر أنا الموقع أدناه بصفتي المسئول عن المنشأة بأن كافة البيانات والمعاملات والمبالغ الموضحة بهذا الإقرار صحيحة وحقيقية ومطابقة للدفاتر والسجلات والمستندات المؤيدة، وأنه تم خصم المبالغ الموضحة وتوريدها لمصلحة الضرائب المصرية طبقاً لأحكام القانون 91 لسنة 2005 وتعديلاته.
                </p>
                <div className="grid grid-cols-2 gap-8 pt-4 text-center">
                  <div>
                    <span className="text-xs text-slate-500 block mb-10">المحاسب القانوني المعتمد</span>
                    <div className="border-b border-slate-400 w-44 mx-auto" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block mb-10">توقيع وخاتم المنشأة / الممول</span>
                    <div className="border-b border-slate-400 w-44 mx-auto" />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
