import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import {
  FileTextIcon,
  SearchIcon,
  PlusIcon,
  RefreshCwIcon,
  DownloadIcon,
  PrinterIcon,
  Trash2Icon,
  SparklesIcon,
  XIcon,
} from '@/shared/components/icons/AppIcons';
import { DialogShell } from '@/shared/components/dialog-shell';
import {
  withholdingTaxApi,
  type WithholdingTaxRecord,
  type Form41SummaryResponse,
  type CreateWhtTransactionPayload,
} from '@/features/accounting/api/accounting.api';
import { PageHeader } from '@/shared/components/page-header';
import { StatsGrid } from '@/shared/components/stats-grid';
import { useAppToolbar } from '@/stores/toolbar-store';

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
  useAppToolbar([{ label: 'المالية والمحاسبة', to: '/accounting' }, { label: 'الخصم والإضافة ن41' }]);
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
    <div className="page-stack page-shell withholding-tax-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        <PageHeader
          title="ضريبة الخصم والإضافة ونموذج 41 ضرائب"
          description="إعداد واستخراج إقرار نموذج 41 الربع سنوي المعتمد لمصلحة الضرائب المصرية (ETA) وتصدير شيت البوابة الرسمية."
          badge={<span className="nav-pill">{reportData?.total_count || 0} معاملة</span>}
          actions={(
            <div className="actions compact-actions page-header-actions">
              <Button
                onClick={() => {
                  resetNewTxForm();
                  setShowCreateModal(true);
                }}
                className="btn btn-primary flex items-center gap-1.5"
                style={{ backgroundColor: '#170e5e', color: '#ffffff' }}
              >
                <PlusIcon size={15} />
                <span>+ إضافة معاملة</span>
              </Button>

              {selectedDirection === 'payable' && (
                <Button
                  onClick={() => setShowExtractModal(true)}
                  variant="secondary"
                  className="flex items-center gap-1.5 text-emerald-800 border-emerald-300"
                >
                  <SparklesIcon size={15} />
                  <span>استيراد آلي من المشتريات</span>
                </Button>
              )}

              <Button
                onClick={handleExportEtaCsv}
                variant="secondary"
                className="flex items-center gap-1.5"
                title="تصدير شيت البوابة الإلكترونية لمصلحة الضرائب"
              >
                <DownloadIcon size={14} />
                <span>تصدير CSV</span>
              </Button>

              <Button
                onClick={() => setShowPrintModal(true)}
                variant="secondary"
                className="flex items-center gap-1.5"
              >
                <PrinterIcon size={14} />
                <span>طباعة A4</span>
              </Button>

              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['wht-form41'] })}
                variant="secondary"
                className="flex items-center gap-1.5"
                title="تحديث البيانات"
              >
                <RefreshCwIcon size={14} />
                <span>تحديث</span>
              </Button>
            </div>
          )}
        />

        {/* Period Selector & Direction Switcher */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            {/* Direction Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
              <button
                type="button"
                onClick={() => setSelectedDirection('payable')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: selectedDirection === 'payable' ? '#ffffff' : 'transparent',
                  color: selectedDirection === 'payable' ? '#170e5e' : '#64748b',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: selectedDirection === 'payable' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                نموذج 41 (خصم من الموردين لتوريده للضرائب)
              </button>
              <button
                type="button"
                onClick={() => setSelectedDirection('receivable')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: selectedDirection === 'receivable' ? '#ffffff' : 'transparent',
                  color: selectedDirection === 'receivable' ? '#170e5e' : '#64748b',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: selectedDirection === 'receivable' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                إشعارات الخصم من العملاء (مبالغ مستردة للشركة)
              </button>
            </div>

            {/* Quarter & Year Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>السنة الضريبية:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  style={{ padding: '6px 12px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: '#0f172a', outline: 'none' }}
                >
                  {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#f8fafc', padding: '4px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                {QUARTERS.map((q) => {
                  const isActive = selectedQuarter === q.id;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setSelectedQuarter(q.id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: isActive ? '#170e5e' : 'transparent',
                        color: isActive ? '#ffffff' : '#64748b',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      title={q.period}
                    >
                      {q.id}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ marginBottom: '16px' }}>
          <StatsGrid
            items={[
              {
                key: 'tax',
                label: selectedDirection === 'payable' ? 'إجمالي الضريبة واجبة التوريد' : 'إجمالي مبالغ الخصم المستردة',
                value: `${formatCurrency(reportData?.total_tax_amount || 0)} ج.م`,
              },
              {
                key: 'goods',
                label: 'وعاء توريدات السلع (1%)',
                value: `${formatCurrency(reportData?.breakdown.goods.base_amount || 0)} ج.م`,
              },
              {
                key: 'services',
                label: 'وعاء الخدمات والمصنعيات (3%)',
                value: `${formatCurrency(reportData?.breakdown.services.base_amount || 0)} ج.م`,
              },
              {
                key: 'prof',
                label: 'وعاء المهن الحرة والعمولات (5%)',
                value: `${formatCurrency(reportData?.breakdown.professional.base_amount || 0)} ج.م`,
              },
            ]}
          />
        </div>

        {/* Main Workspace Panel & Table */}
        <section className="document-prototype-section workspace-panel">
          <div className="section-header-compact-row">
            <h3 className="document-prototype-section-title">سجل معاملات نموذج 41 ضرائب</h3>
            <div className="section-header-actions-group">
              <span className="text-xs text-slate-500 font-medium">الربع {selectedQuarter} لسنة {selectedYear} ({filteredTransactions.length} حركة)</span>
            </div>
          </div>
          <p className="muted small section-header-subtitle">
            بيانات الخصم والتحصيل المعتمدة لمصلحة الضرائب المصرية وتصنيف الأوعية الضريبية.
          </p>

          {/* Filter Bar */}
          <div className="products-table-toolbar" style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '12px 0 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', width: '100%', flexWrap: 'wrap' }}>
              <div className="relative flex-1 min-w-[280px]">
                <SearchIcon size={15} className="absolute right-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث باسم الممول/المورد، رقم الفاتورة، أو الرقم الضريبي..."
                  className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white"
                />
              </div>

              <div style={{ width: '180px' }}>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:bg-white"
                >
                  <option value="all">كافة الحالات</option>
                  <option value="draft">مسودة</option>
                  <option value="declared">مقدم بالإقرار</option>
                  <option value="paid">تم السداد والتوريد</option>
                </select>
              </div>
            </div>
          </div>

          {/* Form 41 Detailed Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
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
          </div>
        </section>
      </main>

      {/* Modal 1: Create Manual Transaction */}
      {showCreateModal && (
        <DialogShell
          open={true}
          onClose={() => setShowCreateModal(false)}
          width="min(680px, 95vw)"
          ariaLabel="تسجيل معاملة خصم وتحصيل جديدة"
        >
          <div dir="rtl" style={{ width: '100%', boxSizing: 'border-box' }}>
            <div className="standard-dialog-header">
              <div className="standard-dialog-header-info">
                <h3 className="standard-dialog-title">تسجيل معاملة خصم وتحصيل جديدة (نموذج 41)</h3>
                <p className="standard-dialog-subtitle">إثبات خصم الضريبة من منبع الفاتورة وتوريدها لمصلحة الضرائب</p>
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                    اسم المورد / الممول <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={newTx.partner_name}
                    onChange={(e) => setNewTx({ ...newTx, partner_name: e.target.value })}
                    placeholder="اسم الشركة أو التاجر أو المهني"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                    رقم الفاتورة <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={newTx.invoice_number}
                    onChange={(e) => setNewTx({ ...newTx, invoice_number: e.target.value })}
                    placeholder="مثال: INV-10492"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                    تاريخ الفاتورة <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={newTx.invoice_date}
                    onChange={(e) => setNewTx({ ...newTx, invoice_date: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                    الرقم الضريبي (9 أرقام)
                  </label>
                  <input
                    type="text"
                    value={newTx.tax_id_number || ''}
                    onChange={(e) => setNewTx({ ...newTx, tax_id_number: e.target.value })}
                    placeholder="مثال: 100234567"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                    المأمورية الضريبية
                  </label>
                  <input
                    type="text"
                    value={newTx.tax_office_code || ''}
                    onChange={(e) => setNewTx({ ...newTx, tax_office_code: e.target.value })}
                    placeholder="مثال: مأمورية قصر النيل"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                    نوع التعامل <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={newTx.wht_type}
                    onChange={(e) => handleWhtTypeChange(e.target.value as any)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                  >
                    <option value="goods">توريدات وسلع (1%)</option>
                    <option value="services">خدمات ومصنعيات (3%)</option>
                    <option value="professional">مهن حرة واستشارات (5%)</option>
                    <option value="custom">نسبة مخصصة أخرى</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                    نسبة الخصم (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newTx.wht_rate || 0}
                    onChange={(e) => setNewTx({ ...newTx, wht_rate: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                    القيمة الإجمالية للتعامل (وعاء الخصم قبل الضريبة) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newTx.base_amount || ''}
                    onChange={(e) => setNewTx({ ...newTx, base_amount: Number(e.target.value) })}
                    placeholder="0.00"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                  />
                  {newTx.base_amount > 0 && (
                    <div style={{ marginTop: '6px', fontSize: '11.5px', color: '#059669', fontWeight: 700 }}>
                      قيمة الضريبة المحتسبة: {formatCurrency(newTx.base_amount * ((newTx.wht_rate || 1) / 100))} ج.م
                    </div>
                  )}
                </div>
              </div>

              <div className="standard-dialog-footer">
                <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
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
                  style={{ backgroundColor: '#170e5e', color: '#ffffff' }}
                >
                  {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ المعاملة'}
                </Button>
              </div>
            </div>
          </div>
        </DialogShell>
      )}

      {/* Modal 2: Smart Extract from Purchases */}
      {showExtractModal && (
        <DialogShell
          open={true}
          onClose={() => setShowExtractModal(false)}
          width="min(540px, 95vw)"
          ariaLabel="استيراد آلي من فواتير المشتريات المسجلة"
        >
          <div dir="rtl" style={{ width: '100%', boxSizing: 'border-box' }}>
            <div className="standard-dialog-header">
              <div className="standard-dialog-header-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46' }}>
                  <SparklesIcon size={18} />
                  <h3 className="standard-dialog-title" style={{ color: '#065f46' }}>استيراد آلي من فواتير المشتريات المسجلة</h3>
                </div>
                <p className="standard-dialog-subtitle">فحص الفواتير التي تجاوزت 300 ج.م واستخراج بيانات الموردين</p>
              </div>
              <button
                type="button"
                onClick={() => setShowExtractModal(false)}
                className="standard-dialog-close-btn"
                aria-label="إغلاق"
              >
                <XIcon size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                يقوم هذا المعالج بفحص جميع فواتير الشراء غير الملغاة التي تجاوزت 300 ج.م في الفترة المحددة، ويستخرج بيانات المورد والرقم الضريبي والوعاء تلقائياً لتضمينها في نموذج 41 دون تكرار.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>من تاريخ</label>
                  <input
                    type="date"
                    value={extractDates.fromDate}
                    onChange={(e) => setExtractDates({ ...extractDates, fromDate: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>إلى تاريخ</label>
                  <input
                    type="date"
                    value={extractDates.toDate}
                    onChange={(e) => setExtractDates({ ...extractDates, toDate: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>نسبة الخصم الافتراضية</label>
                  <select
                    value={extractDates.defaultWhtRate}
                    onChange={(e) =>
                      setExtractDates({
                        ...extractDates,
                        defaultWhtRate: Number(e.target.value),
                        defaultWhtType: Number(e.target.value) === 1 ? 'goods' : Number(e.target.value) === 5 ? 'professional' : 'services',
                      })
                    }
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                  >
                    <option value={1}>1% (توريدات ومشتريات سلع وبضائع)</option>
                    <option value={3}>3% (خدمات ومقاولات ومصنعيات)</option>
                    <option value={5}>5% (مهن حرة واستشارات)</option>
                  </select>
                </div>
              </div>

              <div className="standard-dialog-footer">
                <Button variant="secondary" onClick={() => setShowExtractModal(false)}>
                  إلغاء
                </Button>
                <Button
                  onClick={() => extractMutation.mutate()}
                  disabled={extractMutation.isPending}
                  style={{ backgroundColor: '#059669', color: '#ffffff' }}
                >
                  {extractMutation.isPending ? 'جاري الفحص والاستيراد...' : 'بدء الاستيراد الآلي'}
                </Button>
              </div>
            </div>
          </div>
        </DialogShell>
      )}

      {/* Modal 3: Printable Official Form 41 Declaration */}
      {showPrintModal && (
        <DialogShell
          open={true}
          onClose={() => setShowPrintModal(false)}
          width="min(960px, 96vw)"
          ariaLabel="إقرار نموذج 41 ضرائب"
        >
          <div dir="rtl" style={{ width: '100%', boxSizing: 'border-box' }}>
            <div className="standard-dialog-header">
              <div className="standard-dialog-header-info">
                <h3 className="standard-dialog-title">إقرار نموذج 41 ضرائب (الخصم والتحصيل تحت حساب الضريبة)</h3>
                <p className="standard-dialog-subtitle">عن {QUARTERS.find((q) => q.id === selectedQuarter)?.label} سنة {selectedYear}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button
                  onClick={() => window.print()}
                  variant="secondary"
                  style={{ fontSize: '12px', height: '32px' }}
                >
                  <PrinterIcon size={14} className="ml-1" />
                  طباعة A4
                </Button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="standard-dialog-close-btn"
                  aria-label="إغلاق"
                >
                  <XIcon size={18} />
                </button>
              </div>
            </div>

            {/* Printable Form 41 Official Paper */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '12px', padding: '24px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '18px', fontSize: '12px', color: '#0f172a' }}>
              {/* Official Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0 }}>جمهورية مصر العربية - وزارة المالية</h3>
                  <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#334155', margin: '4px 0' }}>مصلحة الضرائب المصرية</h4>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>إدارة تجميع نماذج الخصم والتحصيل</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ border: '2px solid #0f172a', padding: '6px 16px', borderRadius: '8px', fontWeight: 800, fontSize: '15px', backgroundColor: '#f8fafc' }}>
                    نموذج 41 ضرائب
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginTop: '4px' }}>
                    عن {QUARTERS.find((q) => q.id === selectedQuarter)?.label} سنة {selectedYear}
                  </span>
                </div>
              </div>

              {/* Summary Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>إجمالي عدد المعاملات:</span>
                  <span style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>{reportData?.total_count || 0}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>إجمالي وعاء التعامل:</span>
                  <span style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>{formatCurrency(reportData?.total_base_amount || 0)} ج.م</span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>إجمالي الضريبة واجبة التوريد:</span>
                  <span style={{ fontWeight: 800, fontSize: '14px', color: '#059669' }}>{formatCurrency(reportData?.total_tax_amount || 0)} ج.م</span>
                </div>
              </div>

              {/* Printable Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>م</th>
                      <th style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>اسم الممول</th>
                      <th style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>الرقم الضريبي</th>
                      <th style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>رقم الفاتورة</th>
                      <th style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>تاريخها</th>
                      <th style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>طبيعة التعامل</th>
                      <th style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>النسبة</th>
                      <th style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>قيمة التعامل</th>
                      <th style={{ padding: '8px' }}>الضريبة المحصلة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((t, i) => (
                      <tr key={t.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>{i + 1}</td>
                        <td style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', fontWeight: 600 }}>{t.partner_name}</td>
                        <td style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', fontFamily: 'monospace' }}>{t.tax_id_number || '-'}</td>
                        <td style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', fontFamily: 'monospace' }}>{t.invoice_number}</td>
                        <td style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1' }}>{t.invoice_date}</td>
                        <td style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1' }}>{WHT_TYPE_LABELS[t.wht_type]?.label || t.wht_type}</td>
                        <td style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>{t.wht_rate}%</td>
                        <td style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', fontWeight: 700 }}>{formatCurrency(t.base_amount)}</td>
                        <td style={{ padding: '6px 8px', fontWeight: 700, color: '#065f46' }}>{formatCurrency(t.tax_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Official Declarations & Signatures */}
              <div style={{ paddingTop: '20px', borderTop: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '11px', color: '#475569', lineHeight: 1.6, textAlign: 'justify', margin: 0 }}>
                  أقر أنا الموقع أدناه بصفتي المسئول عن المنشأة بأن كافة البيانات والمعاملات والمبالغ الموضحة بهذا الإقرار صحيحة وحقيقية ومطابقة للدفاتر والسجلات والمستندات المؤيدة، وأنه تم خصم المبالغ الموضحة وتوريدها لمصلحة الضرائب المصرية طبقاً لأحكام القانون 91 لسنة 2005 وتعديلاته.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', paddingTop: '16px', textAlign: 'center' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '36px' }}>المحاسب القانوني المعتمد</span>
                    <div style={{ borderBottom: '1px solid #94a3b8', width: '180px', margin: '0 auto' }} />
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '36px' }}>توقيع وخاتم المنشأة / الممول</span>
                    <div style={{ borderBottom: '1px solid #94a3b8', width: '180px', margin: '0 auto' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogShell>
      )}
    </div>
  );
}
