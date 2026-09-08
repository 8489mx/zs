import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { DialogShell } from '@/shared/components/dialog-shell';
import { formatCurrency } from '@/lib/format';
import { useHrWorkspace } from '@/features/hr/hooks/useHr';
import {
  endOfServiceApi,
  SettlementRecord,
  SettlementPreview,
} from '@/features/hr/api/end-of-service.api';
import {
  FileTextIcon,
  PlusIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  SearchIcon,
  TrashIcon,
  ClockIcon,
  PrinterIcon,
  LayersIcon,
} from '@/shared/components/icons/AppIcons';

export function HrEndOfServicePage() {
  const { employees } = useHrWorkspace({ pageSize: 150 });
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // New Settlement Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | ''>('');
  const [terminationDate, setTerminationDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [terminationReason, setTerminationReason] = useState('resignation');
  const [lawType, setLawType] = useState<'saudi' | 'egyptian' | 'custom'>('saudi');
  const [customDaysPerYear, setCustomDaysPerYear] = useState(15);
  const [noticePeriodAmount, setNoticePeriodAmount] = useState(0);
  const [customEntitlements, setCustomEntitlements] = useState(0);
  const [assetsDeduction, setAssetsDeduction] = useState(0);
  const [otherDeductions, setOtherDeductions] = useState(0);
  const [custodyCleared, setCustodyCleared] = useState(false);
  const [clearanceNotes, setClearanceNotes] = useState('');
  const [confirmTermination, setConfirmTermination] = useState(true);

  // Calculation state
  const [preview, setPreview] = useState<SettlementPreview | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);

  // Print Modal state
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printingSettlement, setPrintingSettlement] = useState<SettlementRecord | null>(null);

  // Post Accounting state
  const [postingId, setPostingId] = useState<number | null>(null);

  useEffect(() => {
    loadSettlements();
  }, []);

  const loadSettlements = async () => {
    setLoading(true);
    try {
      const list = await endOfServiceApi.list();
      setSettlements(list || []);
    } catch {
      setSettlements([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculatePreview = async () => {
    if (!selectedEmployeeId) {
      setFeedback({ text: 'يرجى اختيار الموظف أولاً', error: true });
      return;
    }
    setCalculating(true);
    setFeedback(null);
    try {
      const res = await endOfServiceApi.calculatePreview({
        employeeId: Number(selectedEmployeeId),
        terminationDate,
        terminationReason,
        lawType,
        customGratuityDaysPerYear: customDaysPerYear,
        noticePeriodAmount,
        customEntitlements,
        assetsDeduction,
        otherDeductions,
      });
      setPreview(res);
    } catch (err: any) {
      setFeedback({ text: err?.message || 'تعذر احتساب مستحقات نهاية الخدمة', error: true });
    } finally {
      setCalculating(false);
    }
  };

  const handleSaveSettlement = async () => {
    if (!selectedEmployeeId || !preview) {
      setFeedback({ text: 'يرجى احتساب المستحقات أولاً قبل الحفظ', error: true });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      await endOfServiceApi.create({
        employeeId: Number(selectedEmployeeId),
        terminationDate,
        terminationReason,
        lawType,
        customGratuityDaysPerYear: customDaysPerYear,
        noticePeriodAmount,
        customEntitlements,
        assetsDeduction,
        otherDeductions,
        custodyCleared,
        clearanceNotes,
        confirmTermination,
      });
      setIsCreateOpen(false);
      resetForm();
      await loadSettlements();
    } catch (err: any) {
      setFeedback({ text: err?.message || 'تعذر حفظ المخالصة', error: true });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedEmployeeId('');
    setPreview(null);
    setNoticePeriodAmount(0);
    setCustomEntitlements(0);
    setAssetsDeduction(0);
    setOtherDeductions(0);
    setCustodyCleared(false);
    setClearanceNotes('');
    setConfirmTermination(true);
    setFeedback(null);
  };

  const handlePostAccounting = async (settlement: SettlementRecord) => {
    if (!window.confirm(`هل أنت متأكد من ترحيل القيد المحاسبي للمخالصة رقم ${settlement.settlementNo}؟`)) {
      return;
    }
    setPostingId(settlement.id);
    try {
      const res = await endOfServiceApi.postAccounting(settlement.id, {});
      alert(`تم ترحيل القيد المحاسبي بنجاح برقم قيد #${res.entryNo || res.journalEntryId}`);
      await loadSettlements();
    } catch (err: any) {
      alert(err?.message || 'تعذر ترحيل القيد المحاسبي');
    } finally {
      setPostingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف مسودة هذه المخالصة؟')) return;
    try {
      await endOfServiceApi.remove(id);
      await loadSettlements();
    } catch (err: any) {
      alert(err?.message || 'تعذر حذف المخالصة');
    }
  };

  const handlePrint = (settlement: SettlementRecord) => {
    setPrintingSettlement(settlement);
    setPrintModalOpen(true);
  };

  // KPI Calculations
  const totalCount = settlements.length;
  const pendingAccounting = settlements.filter(s => s.status !== 'posted').length;
  const totalGratuitySum = settlements.reduce((sum, s) => sum + (s.gratuityAmount || 0), 0);
  const clearedCustodies = settlements.filter(s => s.custodyCleared).length;

  const filteredSettlements = useMemo(() => {
    return settlements.filter(s => {
      const matchSearch =
        !searchQuery ||
        s.settlementNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.employeeNo && s.employeeNo.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [settlements, searchQuery, statusFilter]);

  const activeEmployeesList = useMemo(() => {
    const list = (employees.data as any)?.rows || (employees.data as any)?.employees || [];
    return Array.isArray(list) ? list : [];
  }, [employees.data]);

  return (
    <div className="page-stack page-shell hr-end-of-service-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px' }}>
        <PageHeader
          title="مخالصات ومكافأة نهاية الخدمة (End of Service Settlements)"
          description="احتساب مكافأة نهاية الخدمة وتصفية مستحقات وعهد الموظفين وفق أنظمة العمل وإصدار قيود المحاسبة ونماذج المخالصة الرسمية"
          badge={<span className="nav-pill">الموارد البشرية</span>}
          actions={
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                resetForm();
                setIsCreateOpen(true);
              }}
              style={{
                background: '#170e5e',
                borderColor: '#170e5e',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                fontWeight: 700,
              }}
            >
              <PlusIcon size={16} />
              <span>إنشاء مخالصة جديدة</span>
            </Button>
          }
        />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>إجمالي المخالصات المسجلة</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>{totalCount}</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>بانتظار الترحيل المحاسبي</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: pendingAccounting > 0 ? '#b45309' : '#15803d' }}>
            {pendingAccounting}
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>إجمالي مكافآت نهاية الخدمة</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#170e5e' }}>
            {formatCurrency(totalGratuitySum)}
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>إخلاء طرف وعهد معتمد</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#047857' }}>
            {clearedCustodies} / {totalCount}
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {/* Filter bar */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', background: '#ffffff' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
              <SearchIcon size={16} />
            </span>
            <input
              type="text"
              placeholder="بحث برقم المخالصة، اسم الموظف، أو الرقم الوظيفي..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 36px 9px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>الحالة:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="all">كل الحالات</option>
              <option value="draft">مسودة</option>
              <option value="posted">مرحل محاسبياً</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>جاري تحميل سجل المخالصات...</div>
        ) : filteredSettlements.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
            <FileTextIcon size={40} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>لا توجد مخالصات نهاية خدمة مسجلة</div>
            <div style={{ fontSize: '0.85rem', marginTop: 4 }}>اضغط على زر "إنشاء مخالصة نهاية خدمة جديدة" لبدء تصفية مستحقات موظف.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>رقم المخالصة</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>الموظف</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>تاريخ الإنهاء</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>مدة الخدمة</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>مكافأة نهاية الخدمة</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>صافي المستحق</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>إخلاء العهد</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>القيد المحاسبي</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredSettlements.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#170e5e' }}>{s.settlementNo}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{s.employeeName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {s.employeeNo ? `رقم: ${s.employeeNo}` : ''} {s.departmentName ? `| ${s.departmentName}` : ''}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>
                      {String(s.terminationDate).slice(0, 10)}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>
                      {s.serviceYears} سنة
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                      {formatCurrency(s.gratuityAmount)}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 800, color: '#15803d', fontSize: '0.92rem' }}>
                      {formatCurrency(s.netSettlementAmount)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {s.custodyCleared ? (
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircleIcon size={12} />
                          تم الإخلاء
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <ClockIcon size={12} />
                          قيد المتابعة
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {s.status === 'posted' ? (
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, background: '#e0e7ff', color: '#3730a3', padding: '3px 8px', borderRadius: 6 }}>
                          مرحل {s.journalEntryNo ? `#${s.journalEntryNo}` : ''}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: 6 }}>
                          مسودة
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => handlePrint(s)}
                          title="طباعة نموذج المخالصة وإخلاء الطرف"
                          style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#1d4ed8',
                            padding: '6px 10px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: '0.8rem',
                            fontWeight: 600,
                          }}
                        >
                          <PrinterIcon size={14} />
                          <span>طباعة</span>
                        </button>

                        {s.status !== 'posted' && (
                          <button
                            type="button"
                            onClick={() => handlePostAccounting(s)}
                            disabled={postingId === s.id}
                            title="ترحيل القيد المحاسبي"
                            style={{
                              background: '#170e5e',
                              border: 'none',
                              color: '#ffffff',
                              padding: '6px 10px',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                            }}
                          >
                            {postingId === s.id ? 'جاري الترحيل...' : 'ترحيل مالي'}
                          </button>
                        )}

                        {s.status !== 'posted' && (
                          <button
                            type="button"
                            onClick={() => handleDelete(s.id)}
                            title="حذف المسودة"
                            style={{
                              background: '#fee2e2',
                              border: 'none',
                              color: '#b91c1c',
                              padding: '6px 8px',
                              borderRadius: 6,
                              cursor: 'pointer',
                            }}
                          >
                            <TrashIcon size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Settlement Modal */}
      {isCreateOpen && (
        <DialogShell open={isCreateOpen} onClose={() => setIsCreateOpen(false)} width="850px">
          <div style={{ background: '#ffffff', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#e0e7ff', color: '#3730a3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LayersIcon size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>إنشاء مخالصة وتصفية نهاية خدمة</h3>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>احتساب مستحقات الموظف طبقاً لقوانين العمل وتصفية العهد المادية</div>
                </div>
              </div>
            </div>

            <div style={{ padding: 24, maxHeight: '75vh', overflowY: 'auto' }}>
              {feedback && (
                <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: feedback.error ? '#fef2f2' : '#f0fdf4', border: `1px solid ${feedback.error ? '#fecaca' : '#bbf7d0'}`, color: feedback.error ? '#b91c1c' : '#15803d', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircleIcon size={16} />
                  <span>{feedback.text}</span>
                </div>
              )}

              {/* Basic Parameters Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    الموظف المستحق *
                  </label>
                  <select
                    value={selectedEmployeeId}
                    onChange={e => {
                      setSelectedEmployeeId(e.target.value ? Number(e.target.value) : '');
                      setPreview(null);
                    }}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    <option value="">-- اختر الموظف --</option>
                    {activeEmployeesList.map((emp: any) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name || emp.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim()} {emp.employeeNo ? `(${emp.employeeNo})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    تاريخ إنهاء الخدمة *
                  </label>
                  <input
                    type="date"
                    value={terminationDate}
                    onChange={e => {
                      setTerminationDate(e.target.value);
                      setPreview(null);
                    }}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    سبب إنهاء العلاقة العمالية *
                  </label>
                  <select
                    value={terminationReason}
                    onChange={e => {
                      setTerminationReason(e.target.value);
                      setPreview(null);
                    }}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    <option value="resignation">استقالة الموظف (Resignation)</option>
                    <option value="contract_expiry">انتهاء مدة العقد المحدد (Contract Expiry)</option>
                    <option value="termination_by_employer">إنهاء من صاحب العمل (Employer Termination)</option>
                    <option value="termination_article_80">فصل بموجب المادة 80 (بدون مكافأة)</option>
                    <option value="mutual_agreement">اتفاق ودي بين الطرفين (Mutual Agreement)</option>
                    <option value="retirement">بلوغ سن التقاعد (Retirement)</option>
                    <option value="other">أسباب أخرى</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    نظام العمل المطبق *
                  </label>
                  <select
                    value={lawType}
                    onChange={e => {
                      setLawType(e.target.value as any);
                      setPreview(null);
                    }}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    <option value="saudi">نظام العمل السعودي (المادتين 84 و 85)</option>
                    <option value="egyptian">قانون العمل المصري (المادة 125)</option>
                    <option value="custom">سياسة الشركة المخصصة (أيام محددة/سنة)</option>
                  </select>
                </div>
              </div>

              {lawType === 'custom' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    عدد أيام المكافأة المستحقة عن كل سنة خدمة
                  </label>
                  <input
                    type="number"
                    value={customDaysPerYear}
                    onChange={e => setCustomDaysPerYear(Number(e.target.value))}
                    style={{ width: '200px', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              )}

              {/* Adjustments row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18, background: '#f8fafc', padding: 14, borderRadius: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>بدل إنذار (+)</label>
                  <input
                    type="number"
                    value={noticePeriodAmount}
                    onChange={e => setNoticePeriodAmount(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>مستحقات أخرى (+)</label>
                  <input
                    type="number"
                    value={customEntitlements}
                    onChange={e => setCustomEntitlements(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#b91c1c', marginBottom: 4 }}>تلف/فقد عهدة (-)</label>
                  <input
                    type="number"
                    value={assetsDeduction}
                    onChange={e => setAssetsDeduction(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#b91c1c', marginBottom: 4 }}>استقطاعات أخرى (-)</label>
                  <input
                    type="number"
                    value={otherDeductions}
                    onChange={e => setOtherDeductions(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Action: Trigger Calculation */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                <button
                  type="button"
                  onClick={handleCalculatePreview}
                  disabled={!selectedEmployeeId || calculating}
                  style={{
                    background: '#170e5e',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 24px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
                  {calculating ? 'جاري احتساب المستحقات...' : 'احتساب وتحديث المستحقات آلياً'}
                </button>
              </div>

              {/* Preview Result Details */}
              {preview && (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, background: '#ffffff', marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 10, marginBottom: 14 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                      تفاصيل الحسبة النظامية للموظف: {preview.employee.name}
                    </div>
                    <span style={{ fontSize: '0.8rem', background: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                      مدة الخدمة: {preview.servicePeriod.years} سنة و {preview.servicePeriod.months} شهر و {preview.servicePeriod.days} يوم ({preview.servicePeriod.totalYearsDecimal} سنة)
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
                    <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8 }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>الراتب الأساسي</div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{formatCurrency(preview.salaries.basicSalary)}</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8 }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>الراتب الإجمالي للمكافأة</div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{formatCurrency(preview.salaries.totalSalary)}</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8 }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>أجر اليوم الواحد</div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{formatCurrency(preview.salaries.dailyWage)}</div>
                    </div>
                  </div>

                  {/* Financial Breakdown Grid */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: 14 }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 4px', color: '#334155' }}>مكافأة نهاية الخدمة (نسبة الاستحقاق: {preview.gratuity.gratuityPercentage}%)</td>
                        <td style={{ padding: '8px 4px', fontWeight: 700, color: '#15803d', textAlign: 'left' }}>+{formatCurrency(preview.gratuity.gratuityAmount)}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 4px', color: '#334155' }}>بدل رصيد الإجازات المتبقية ({preview.leaveEncashment.remainingLeaveDays} يوم)</td>
                        <td style={{ padding: '8px 4px', fontWeight: 700, color: '#15803d', textAlign: 'left' }}>+{formatCurrency(preview.leaveEncashment.leaveEncashmentAmount)}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 4px', color: '#334155' }}>راتب أيام الشهر الحالي حتى تاريخ الإنهاء</td>
                        <td style={{ padding: '8px 4px', fontWeight: 700, color: '#15803d', textAlign: 'left' }}>+{formatCurrency(preview.pendingSalaryAmount)}</td>
                      </tr>
                      {preview.noticePeriodAmount > 0 && (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 4px', color: '#334155' }}>بدل فترة الإنذار</td>
                          <td style={{ padding: '8px 4px', fontWeight: 700, color: '#15803d', textAlign: 'left' }}>+{formatCurrency(preview.noticePeriodAmount)}</td>
                        </tr>
                      )}
                      {preview.customEntitlements > 0 && (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 4px', color: '#334155' }}>مستحقات ومكافآت إضافية</td>
                          <td style={{ padding: '8px 4px', fontWeight: 700, color: '#15803d', textAlign: 'left' }}>+{formatCurrency(preview.customEntitlements)}</td>
                        </tr>
                      )}
                      {preview.unpaidLoansDeduction > 0 && (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 4px', color: '#b91c1c' }}>سلف وقروض غير مسددة (تخصم تلقائياً)</td>
                          <td style={{ padding: '8px 4px', fontWeight: 700, color: '#b91c1c', textAlign: 'left' }}>-{formatCurrency(preview.unpaidLoansDeduction)}</td>
                        </tr>
                      )}
                      {preview.assetsDeduction > 0 && (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 4px', color: '#b91c1c' }}>استقطاع عهد مفقودة أو تالفة</td>
                          <td style={{ padding: '8px 4px', fontWeight: 700, color: '#b91c1c', textAlign: 'left' }}>-{formatCurrency(preview.assetsDeduction)}</td>
                        </tr>
                      )}
                      {preview.otherDeductions > 0 && (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 4px', color: '#b91c1c' }}>استقطاعات وخصومات أخرى</td>
                          <td style={{ padding: '8px 4px', fontWeight: 700, color: '#b91c1c', textAlign: 'left' }}>-{formatCurrency(preview.otherDeductions)}</td>
                        </tr>
                      )}
                      <tr style={{ background: '#f8fafc', fontWeight: 800, fontSize: '1rem' }}>
                        <td style={{ padding: '12px 8px', color: '#0f172a' }}>صافي المستحق النهائي للموظف</td>
                        <td style={{ padding: '12px 8px', color: '#15803d', textAlign: 'left' }}>{formatCurrency(preview.netSettlementAmount)}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Unreturned Assets checklist */}
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed #cbd5e1' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: 8 }}>
                      كشف العهد والأجهزة المسلمة للموظف ({preview.unreturnedAssets.length} عهدة مسجلة):
                    </div>
                    {preview.unreturnedAssets.length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: '#15803d', background: '#f0fdf4', padding: '8px 12px', borderRadius: 6 }}>
                        لا توجد عهد أو أجهزة معلقة بذمة هذا الموظف.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                        {preview.unreturnedAssets.map(a => (
                          <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: '#fffbeb', borderRadius: 6, border: '1px solid #fde68a', fontSize: '0.8rem' }}>
                            <span>{a.assetName} {a.serialNo ? `(سيريال: ${a.serialNo})` : ''} - {a.assetType}</span>
                            <span style={{ color: '#b45309', fontWeight: 600 }}>تاريخ الاستلام: {String(a.assignedAt).slice(0, 10)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                      <input
                        type="checkbox"
                        id="custodyCheck"
                        checked={custodyCleared}
                        onChange={e => setCustodyCleared(e.target.checked)}
                        style={{ width: 16, height: 16 }}
                      />
                      <label htmlFor="custodyCheck" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>
                        أقر باستلام كافة العهد وإخلاء طرف الموظف من الأجهزة والمتعلقات
                      </label>
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        id="confirmTermCheck"
                        checked={confirmTermination}
                        onChange={e => setConfirmTermination(e.target.checked)}
                        style={{ width: 16, height: 16 }}
                      />
                      <label htmlFor="confirmTermCheck" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#b91c1c', cursor: 'pointer' }}>
                        تحديث حالة الموظف تلقائياً إلى "منهي خدمته" وإنهاء عقده النشط بالنظام
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '8px 18px', fontSize: '0.85rem' }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveSettlement}
                disabled={!preview || saving}
                className="btn btn-primary"
                style={{
                  padding: '8px 24px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  background: '#170e5e',
                  borderColor: '#170e5e',
                }}
              >
                {saving ? 'جاري الحفظ...' : 'اعتماد وحفظ المخالصة'}
              </button>
            </div>
          </div>
        </DialogShell>
      )}

      {/* Printable Official Clearance Document Modal */}
      {printModalOpen && printingSettlement && (
        <DialogShell open={printModalOpen} onClose={() => setPrintModalOpen(false)} width="800px">
          <div style={{ background: '#ffffff', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>نموذج مخالصة وإخلاء طرف نهائي</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn btn-primary"
                  style={{ background: '#170e5e', borderColor: '#170e5e', fontSize: '0.85rem', padding: '6px 14px' }}
                >
                  <PrinterIcon size={14} />
                  <span style={{ marginInlineStart: 6 }}>طباعة فورية</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem', padding: '6px 14px' }}
                >
                  إغلاق
                </button>
              </div>
            </div>

            {/* Printable Paper Canvas */}
            <div id="print-settlement-canvas" style={{ padding: '36px 40px', background: '#ffffff', color: '#0f172a', lineHeight: 1.6 }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 16, marginBottom: 24 }}>
                <h2 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', fontWeight: 800 }}>إشعار مخالصة وتصفية مستحقات نهاية خدمة</h2>
                <div style={{ fontSize: '0.85rem', color: '#475569' }}>رقم المخالصة: {printingSettlement.settlementNo} | التاريخ: {String(printingSettlement.settlementDate).slice(0, 10)}</div>
              </div>

              {/* Employee Bio */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 20 }}>
                <div><strong>اسم الموظف:</strong> {printingSettlement.employeeName}</div>
                <div><strong>الرقم الوظيفي:</strong> {printingSettlement.employeeNo || '-'}</div>
                <div><strong>تاريخ التعيين:</strong> {String(printingSettlement.hireDate).slice(0, 10)}</div>
                <div><strong>تاريخ إنهاء الخدمة:</strong> {String(printingSettlement.terminationDate).slice(0, 10)}</div>
                <div><strong>مدة الخدمة:</strong> {printingSettlement.serviceYears} سنة</div>
                <div><strong>سبب إنهاء الخدمة:</strong> {printingSettlement.terminationReason}</div>
              </div>

              {/* Financial Breakdown */}
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', marginBottom: 20, fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>بيان المستحق / الاستقطاع</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>المبلغ المستحق</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 12px' }}>مكافأة نهاية الخدمة القانونية</td>
                    <td style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>{formatCurrency(printingSettlement.gratuityAmount)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 12px' }}>بدل رصيد الإجازات المتبقية</td>
                    <td style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>{formatCurrency(printingSettlement.leaveEncashmentAmount)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 12px' }}>راتب أيام الفترة الحالية</td>
                    <td style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>{formatCurrency(printingSettlement.pendingSalaryAmount)}</td>
                  </tr>
                  <tr style={{ background: '#f8fafc', fontWeight: 800, fontSize: '1.05rem', borderTop: '2px solid #0f172a' }}>
                    <td style={{ padding: '12px' }}>صافي المبلغ المستحق النهائي</td>
                    <td style={{ padding: '12px', textAlign: 'left', color: '#15803d' }}>{formatCurrency(printingSettlement.netSettlementAmount)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Acknowledgment Statement */}
              <div style={{ padding: '14px 18px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.85rem', marginBottom: 28 }}>
                <strong>إقرار واستلام:</strong> أقر أنا الموظف الموقع أدناه بأنني استلمت كامل مستحقاتي المالية النظامية عن فترة عملي الموضحة أعلاه، وقمت بتسليم كافة العهد والأجهزة والمستندات المسلمة لي، وبذلك أبرئ ذمة المنشأة إبراءً شاملاً ومانعاً لأي مطالبة مستقبلية.
              </div>

              {/* Signatures */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, textAlign: 'center', marginTop: 32 }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 40 }}>توقيع الموظف المقر</div>
                  <div style={{ borderBottom: '1px dashed #94a3b8', width: '80%', margin: '0 auto' }}></div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 40 }}>مدير الموارد البشرية</div>
                  <div style={{ borderBottom: '1px dashed #94a3b8', width: '80%', margin: '0 auto' }}></div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 40 }}>المدير المالي / العام</div>
                  <div style={{ borderBottom: '1px dashed #94a3b8', width: '80%', margin: '0 auto' }}></div>
                </div>
              </div>
            </div>
          </div>
        </DialogShell>
      )}
      </main>
    </div>
  );
}
