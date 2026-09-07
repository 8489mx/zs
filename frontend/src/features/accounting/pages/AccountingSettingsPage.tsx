import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PageHeader } from '@/shared/components/page-header';
import { FormSection } from '@/shared/components/form-section';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { formatCurrency, formatDate } from '@/lib/format';
import { accountingApi, type OpeningBalancesPreviewResponse } from '@/features/accounting/api/accounting.api';

type AccountRef = { id?: string; code?: string; nameAr?: string; nameEn?: string } | null;
type SettingsSection = 'accounts-map' | 'opening-balances' | 'lock-dates';

function normalizeNumerals(value: string): string {
  const arabicIndic = '٠١٢٣٤٥٦٧٨٩';
  const easternArabicIndic = '۰۱۲۳۴۵۶۷۸۹';
  return String(value || '')
    .replace(/[٠-٩]/g, (char) => String(arabicIndic.indexOf(char)))
    .replace(/[۰-۹]/g, (char) => String(easternArabicIndic.indexOf(char)));
}

function parseMoneyInput(value: string): number {
  const normalized = normalizeNumerals(value).replace(/,/g, '.').trim();
  if (!normalized) return 0;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Number(parsed.toFixed(2));
}

function renderAccountRef(value: AccountRef) {
  if (!value) return '—';
  const code = String(value.code || '').trim();
  const nameAr = String(value.nameAr || '').trim();
  if (code && nameAr) return `${code} - ${nameAr}`;
  return code || nameAr || String(value.id || '—');
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function AccountingSettingsPage() {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<SettingsSection>('accounts-map');
  const [systemStartDate, setSystemStartDate] = useState(todayIsoDate());
  const [cashOpeningInput, setCashOpeningInput] = useState('');
  const [bankOpeningInput, setBankOpeningInput] = useState('');
  const [previewData, setPreviewData] = useState<OpeningBalancesPreviewResponse | null>(null);
  const [showPostConfirm, setShowPostConfirm] = useState(false);
  
  const [lockDateAll, setLockDateAll] = useState('');
  const [lockDateNonAdviser, setLockDateNonAdviser] = useState('');
  const [lockDateTax, setLockDateTax] = useState('');
  const [lockDatesSavedNotice, setLockDatesSavedNotice] = useState(false);

  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({});

  const query = useQuery({
    queryKey: ['accounting', 'settings'],
    queryFn: () => accountingApi.settings(),
  });

  useEffect(() => {
    if (query.data?.settings) {
      const s = query.data.settings as any;
      if (s.lockDateAll) setLockDateAll(String(s.lockDateAll).slice(0, 10));
      if (s.lockDateNonAdviser) setLockDateNonAdviser(String(s.lockDateNonAdviser).slice(0, 10));
      if (s.lockDateTax) setLockDateTax(String(s.lockDateTax).slice(0, 10));
    }
  }, [query.data?.settings]);

  const updateLockDatesMutation = useMutation({
    mutationFn: (data: { lockDateAll: string | null; lockDateNonAdviser: string | null; lockDateTax: string | null }) =>
      accountingApi.updateSettings(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting', 'settings'] });
      setLockDatesSavedNotice(true);
      setTimeout(() => setLockDatesSavedNotice(false), 4000);
    },
  });

  const accountsQuery = useQuery({
    queryKey: ['accounting', 'accounts'],
    queryFn: () => accountingApi.accounts(),
    enabled: isEditingSettings,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: Record<string, number | null>) => accountingApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting', 'settings'] });
      setIsEditingSettings(false);
    }
  });

  const previewMutation = useMutation({
    mutationFn: () =>
      accountingApi.openingBalancesPreview({
        system_start_date: systemStartDate || todayIsoDate(),
        cash_opening: parseMoneyInput(cashOpeningInput),
        bank_opening: parseMoneyInput(bankOpeningInput),
      }),
    onSuccess: (data) => setPreviewData(data),
  });

  const postMutation = useMutation({
    mutationFn: () =>
      accountingApi.postOpeningBalances({
        system_start_date: systemStartDate || todayIsoDate(),
        cash_opening: parseMoneyInput(cashOpeningInput),
        bank_opening: parseMoneyInput(bankOpeningInput),
      }),
    onSuccess: (result) => {
      if (result.preview) {
        setPreviewData({
          ...result.preview,
          alreadyPosted: Boolean(result.posted || result.alreadyPosted || result.preview.alreadyPosted),
          existingOpeningEntryId: Number(result.journalEntryId || result.preview.existingOpeningEntryId || 0) || null,
        });
      } else {
        setPreviewData(null);
      }
      setShowPostConfirm(false);
    },
  });

  const settings = (query.data?.settings || {}) as Record<string, AccountRef>;
  const rows = [
    { key: 'cashAccount', label: 'حساب الخزينة' },
    { key: 'bankAccount', label: 'حساب البنك' },
    { key: 'customerReceivableAccount', label: 'حساب العملاء' },
    { key: 'supplierPayableAccount', label: 'حساب الموردين' },
    { key: 'inventoryAccount', label: 'حساب المخزون' },
    { key: 'salesRevenueAccount', label: 'حساب إيرادات المبيعات' },
    { key: 'salesDiscountAccount', label: 'حساب خصومات المبيعات' },
    { key: 'cogsAccount', label: 'حساب تكلفة البضاعة المباعة' },
    { key: 'purchaseAccount', label: 'حساب المشتريات' },
    { key: 'expensesAccount', label: 'حساب المصروفات' },
    { key: 'salesTaxAccount', label: 'حساب ضريبة المبيعات' },
    { key: 'purchaseTaxAccount', label: 'حساب ضريبة المشتريات' },
  ];

  const totals = useMemo(() => {
    const lines = previewData?.linesPreview || [];
    const debit = Number(lines.reduce((sum, line) => sum + Number(line.debit || 0), 0).toFixed(2));
    const credit = Number(lines.reduce((sum, line) => sum + Number(line.credit || 0), 0).toFixed(2));
    const difference = Number((debit - credit).toFixed(2));
    return { debit, credit, difference, balanced: Math.abs(difference) <= 0.0001 };
  }, [previewData]);

  const isAlreadyPosted = Boolean(previewData?.alreadyPosted);
  const canPost = Boolean(previewData && !isAlreadyPosted && totals.balanced && (previewData.linesPreview?.length || 0) > 1);

  useEffect(() => {
    setPreviewData(null);
  }, [cashOpeningInput, bankOpeningInput, systemStartDate]);

  useEffect(() => {
    if (!canPost && showPostConfirm) {
      setShowPostConfirm(false);
    }
  }, [canPost, showPostConfirm]);

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px' }}>
        <PageHeader
          title="إعدادات الحسابات والأرصدة"
          badge={<span className="nav-pill">الربط المحاسبي</span>}
          actions={
            <div className="actions compact-actions">
              <Button type="button" variant={activeSection === 'accounts-map' ? 'primary' : 'secondary'} onClick={() => setActiveSection('accounts-map')}>
                دليل الربط المحاسبي
              </Button>
              <Button type="button" variant={activeSection === 'opening-balances' ? 'primary' : 'secondary'} onClick={() => setActiveSection('opening-balances')}>
                الأرصدة الافتتاحية
              </Button>
              <Button type="button" variant={activeSection === 'lock-dates' ? 'primary' : 'secondary'} onClick={() => setActiveSection('lock-dates')}>
                إقفال الفترات المحاسبية
              </Button>
            </div>
          }
        />

      {activeSection === 'accounts-map' ? (
        <FormSection 
          title="إعدادات الحسابات" 
          description="تحديد الحسابات الافتراضية المرتبطة بالعمليات المختلفة بالنظام."
          actions={
            !isEditingSettings ? (
              <Button type="button" variant="secondary" onClick={() => {
                const initialForm: Record<string, string> = {};
                for (const r of rows) {
                  const s = settings[r.key];
                  initialForm[r.key] = s?.id ? String(s.id) : '';
                }
                setSettingsForm(initialForm);
                setIsEditingSettings(true);
              }}>
                تعديل الإعدادات
              </Button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <Button type="button" variant="secondary" onClick={() => setIsEditingSettings(false)} disabled={updateSettingsMutation.isPending}>إلغاء</Button>
                <Button type="button" variant="primary" disabled={updateSettingsMutation.isPending} onClick={() => {
                  const payload: Record<string, number | null> = {};
                  for (const [k, v] of Object.entries(settingsForm)) {
                    payload[k + 'Id'] = v ? Number(v) : null;
                  }
                  updateSettingsMutation.mutate(payload);
                }}>
                  {updateSettingsMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </Button>
              </div>
            )
          }
        >
          <QueryFeedback
            isLoading={query.isLoading}
            isError={query.isError}
            error={query.error}
            isEmpty={!query.data?.settings}
            loadingText="جاري تحميل إعدادات الحسابات..."
            errorTitle="تعذر تحميل إعدادات الحسابات"
            emptyTitle="لا توجد إعدادات حسابات"
          >
            {isEditingSettings && accountsQuery.isLoading && (
              <div className="muted small" style={{ marginBottom: 16 }}>جاري تحميل قائمة الحسابات...</div>
            )}
            {updateSettingsMutation.isError && (
              <div className="alert alert-danger" style={{ marginBottom: 16 }}>تعذر حفظ الإعدادات.</div>
            )}
            <table className="table-shell">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>الإعداد</th>
                  <th>الحساب</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <td><strong>{row.label}</strong></td>
                    <td>
                      {isEditingSettings ? (
                        <select 
                          className="form-control" 
                          value={settingsForm[row.key] || ''}
                          onChange={(e) => setSettingsForm({ ...settingsForm, [row.key]: e.target.value })}
                          disabled={updateSettingsMutation.isPending}
                          style={{ minWidth: '300px' }}
                        >
                          <option value="">-- لم يتم التحديد --</option>
                          {accountsQuery.data?.accounts?.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.code} - {acc.nameAr}</option>
                          ))}
                        </select>
                      ) : (
                        renderAccountRef(settings[row.key])
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </QueryFeedback>
        </FormSection>
      ) : (
        <FormSection title="الأرصدة الافتتاحية" description="استخدم هذه الصفحة لتسجيل أرصدة بداية استخدام النظام. يتم ترحيل الأرصدة الافتتاحية مرة واحدة فقط لكل منشأة.">
          <div className="page-stack">
            <p className="muted">
              أرصدة العملاء والموردين والمخزون يتم حسابها من البيانات المسجلة داخل النظام، بينما رصيد الخزنة والبنك يتم إدخالهما يدويًا.
            </p>

            <div className="form-grid three-col-form">
              <label className="field">
                <span>تاريخ بداية النظام</span>
                <input type="date" value={systemStartDate} onChange={(event) => setSystemStartDate(event.target.value)} />
              </label>
              <label className="field">
                <span>رصيد الخزنة الافتتاحي</span>
                <input
                  inputMode="decimal"
                  value={cashOpeningInput}
                  onChange={(event) => setCashOpeningInput(event.target.value)}
                  placeholder="0.00"
                />
              </label>
              <label className="field">
                <span>رصيد البنك الافتتاحي</span>
                <input
                  inputMode="decimal"
                  value={bankOpeningInput}
                  onChange={(event) => setBankOpeningInput(event.target.value)}
                  placeholder="0.00"
                />
              </label>
            </div>

            <div className="actions">
              <Button type="button" variant="secondary" onClick={() => previewMutation.mutate()} disabled={previewMutation.isPending || postMutation.isPending}>
                معاينة القيد الافتتاحي
              </Button>
              <Button type="button" variant="primary" onClick={() => setShowPostConfirm(true)} disabled={!canPost || postMutation.isPending}>
                ترحيل الأرصدة الافتتاحية
              </Button>
            </div>

            {isAlreadyPosted ? (
              <div className="status-banner status-info">
                <strong>تم ترحيل الأرصدة الافتتاحية من قبل.</strong>
                {previewData?.existingOpeningEntryId ? <div className="muted small">رقم القيد: {previewData.existingOpeningEntryId}</div> : null}
                {previewData?.existingOpeningEntryId || postMutation.data?.journalEntryId ? (
                  <div className="muted small">
                    <a href={`/accounting/journal-entries`}>عرض القيود اليومية</a>
                  </div>
                ) : null}
              </div>
            ) : null}

            <MutationFeedback
              isError={previewMutation.isError}
              isSuccess={false}
              error={previewMutation.error}
              errorFallback="تعذر تحميل معاينة الأرصدة الافتتاحية."
            />
            <MutationFeedback
              isError={postMutation.isError}
              isSuccess={Boolean(postMutation.isSuccess && postMutation.data?.posted)}
              error={postMutation.error}
              errorFallback="تعذر ترحيل الأرصدة الافتتاحية."
              successText="تم ترحيل الأرصدة الافتتاحية بنجاح."
            />

            {previewData ? (
              <>
                <div className="stats-grid stats-grid-3">
                  <div className="stat-card">
                    <span>أرصدة العملاء</span>
                    <strong>{formatCurrency(Number(previewData.totals?.customerReceivables || 0))}</strong>
                  </div>
                  <div className="stat-card">
                    <span>أرصدة الموردين</span>
                    <strong>{formatCurrency(Number(previewData.totals?.supplierPayables || 0))}</strong>
                  </div>
                  <div className="stat-card">
                    <span>قيمة المخزون</span>
                    <strong>{formatCurrency(Number(previewData.totals?.inventoryValue || 0))}</strong>
                  </div>
                  <div className="stat-card">
                    <span>رصيد الخزنة</span>
                    <strong>{formatCurrency(Number(previewData.totals?.cashOpening || 0))}</strong>
                  </div>
                  <div className="stat-card">
                    <span>رصيد البنك</span>
                    <strong>{formatCurrency(Number(previewData.totals?.bankOpening || 0))}</strong>
                  </div>
                  <div className="stat-card">
                    <span>رأس المال / صافي الافتتاح</span>
                    <strong>{formatCurrency(Math.abs(Number(previewData.totals?.balancingCapital || 0)))}</strong>
                  </div>
                </div>

                <div className="grid-2">
                  <div><strong>إجمالي المدين:</strong> {formatCurrency(totals.debit)}</div>
                  <div><strong>إجمالي الدائن:</strong> {formatCurrency(totals.credit)}</div>
                  <div><strong>الفرق:</strong> {formatCurrency(totals.difference)}</div>
                  <div><strong>تاريخ القيد:</strong> {formatDate(`${previewData.systemStartDate}T00:00:00.000Z`)}</div>
                </div>

                {!totals.balanced ? (
                  <div className="status-banner status-warning">القيد غير متزن، لا يمكن الترحيل.</div>
                ) : null}

                {previewData.warnings?.length ? (
                  <div className="status-banner status-warning">
                    {previewData.warnings.map((warning, index) => (
                      <div key={`${warning}-${index}`}>{warning}</div>
                    ))}
                  </div>
                ) : null}

                <table className="table-shell">
                  <thead>
                    <tr>
                      <th>الحساب</th>
                      <th>الوصف</th>
                      <th>مدين</th>
                      <th>دائن</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(previewData.linesPreview || []).map((line, index) => (
                      <tr key={`${line.accountId}-${index}`}>
                        <td>{[line.accountCode, line.accountNameAr].filter(Boolean).join(' - ')}</td>
                        <td>{line.description || '—'}</td>
                        <td>{formatCurrency(Number(line.debit || 0))}</td>
                        <td>{formatCurrency(Number(line.credit || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : null}
          </div>
        </FormSection>
      )}

      {activeSection === 'lock-dates' && (
        <FormSection
          title="إقفال الفترات المحاسبية والرقابة المالية"
          description="حماية الحسابات والفترات المغلقة ضد أي تعديل أو ترحيل بأثر رجعي لضمان الحوكمة وتطابق القوائم المالية."
          actions={
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                type="button"
                variant="secondary"
                disabled={updateLockDatesMutation.isPending}
                onClick={() => {
                  setLockDateAll('');
                  setLockDateNonAdviser('');
                  setLockDateTax('');
                  updateLockDatesMutation.mutate({
                    lockDateAll: null,
                    lockDateNonAdviser: null,
                    lockDateTax: null,
                  });
                }}
              >
                إلغاء الإقفال (فتح الفترات)
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={updateLockDatesMutation.isPending}
                onClick={() => {
                  updateLockDatesMutation.mutate({
                    lockDateAll: lockDateAll || null,
                    lockDateNonAdviser: lockDateNonAdviser || null,
                    lockDateTax: lockDateTax || null,
                  });
                }}
                style={{
                  backgroundColor: '#170e5e',
                  borderColor: '#170e5e',
                  fontWeight: 700,
                }}
              >
                {updateLockDatesMutation.isPending ? 'جاري الحفظ...' : 'حفظ تواريخ الإقفال'}
              </Button>
            </div>
          }
        >
          {lockDatesSavedNotice && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#ecfdf5',
                borderRight: '4px solid #10b981',
                borderRadius: '8px',
                color: '#065f46',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '16px',
              }}
            >
              تم حفظ تواريخ إقفال الفترات المحاسبية بنجاح وتفعيل الرقابة الصارمة على الحركات المالية.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Card 1: Hard Lock */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#170e5e' }}>
                  تاريخ الإقفال النهائي الشامل
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: lockDateAll ? '#fee2e2' : '#f1f5f9',
                    color: lockDateAll ? '#991b1b' : '#64748b',
                  }}
                >
                  {lockDateAll ? 'إقفال نشط' : 'غير محدد'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
                يمنع تماماً إضافة أو تعديل أي قيد يومية أو فاتورة بيع أو شراء أو سند دفع/قبض يسبق أو يطابق هذا التاريخ <strong>لكافة المستخدمين بما فيهم الإدارة العامة والمدير المالي</strong>.
              </p>
              <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  تاريخ الإقفال النهائي
                </label>
                <input
                  type="date"
                  value={lockDateAll}
                  onChange={(e) => setLockDateAll(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                  }}
                />
              </div>
            </div>

            {/* Card 2: Operational Lock */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#170e5e' }}>
                  إقفال العمليات التشغيلية
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: lockDateNonAdviser ? '#fef3c7' : '#f1f5f9',
                    color: lockDateNonAdviser ? '#92400e' : '#64748b',
                  }}
                >
                  {lockDateNonAdviser ? 'إقفال نشط' : 'غير محدد'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
                يمنع تسجيل أو تعديل العمليات التشغيلية (فواتير المبيعات، المشتريات، المصروفات، المرتجعات) بأثر رجعي قبل هذا التاريخ لمدخلي البيانات وموظفي نقاط البيع، ويسمح فقط للمدقق والمدير المالي.
              </p>
              <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  تاريخ إقفال العمليات التشغيلية
                </label>
                <input
                  type="date"
                  value={lockDateNonAdviser}
                  onChange={(e) => setLockDateNonAdviser(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                  }}
                />
              </div>
            </div>

            {/* Card 3: Tax Lock */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#170e5e' }}>
                  إقفال الإقرار الضريبي
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: lockDateTax ? '#e0e7ff' : '#f1f5f9',
                    color: lockDateTax ? '#3730a3' : '#64748b',
                  }}
                >
                  {lockDateTax ? 'إقفال نشط' : 'غير محدد'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
                يمنع تعديل أو إدراج أي عمليات تؤثر على حسابات ضريبة القيمة المضافة للفترات التي تم تقديم واعتماد إقرارها الضريبي لدى الهيئة الضريبية.
              </p>
              <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  تاريخ إقفال الإقرار الضريبي
                </label>
                <input
                  type="date"
                  value={lockDateTax}
                  onChange={(e) => setLockDateTax(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                  }}
                />
              </div>
            </div>
          </div>
        </FormSection>
      )}

      <DialogShell
        open={showPostConfirm}
        onClose={() => setShowPostConfirm(false)}
        width="min(520px, 100%)"
        ariaLabel="تأكيد ترحيل الأرصدة الافتتاحية"
      >
        <div className="page-stack">
          <div><strong>تأكيد ترحيل الأرصدة الافتتاحية</strong></div>
          <p>
            سيتم إنشاء قيد افتتاحي مرحّل ولا يمكن ترحيل الأرصدة الافتتاحية مرة أخرى لنفس المنشأة. هل تريد المتابعة؟
          </p>
          <div className="actions">
            <Button type="button" variant="primary" onClick={() => postMutation.mutate()} disabled={!canPost || postMutation.isPending}>
              تأكيد الترحيل
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowPostConfirm(false)} disabled={postMutation.isPending}>
              إلغاء
            </Button>
          </div>
        </div>
      </DialogShell>
      </main>
    </div>
  );
}
