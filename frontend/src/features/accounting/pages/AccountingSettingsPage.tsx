import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import { Card } from '@/shared/ui/card';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { formatCurrency, formatDate } from '@/lib/format';
import { accountingApi, type OpeningBalancesPreviewResponse } from '@/features/accounting/api/accounting.api';

type AccountRef = { id?: string; code?: string; nameAr?: string; nameEn?: string } | null;
type SettingsSection = 'accounts-map' | 'opening-balances';

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
  const [activeSection, setActiveSection] = useState<SettingsSection>('accounts-map');
  const [systemStartDate, setSystemStartDate] = useState(todayIsoDate());
  const [cashOpeningInput, setCashOpeningInput] = useState('');
  const [bankOpeningInput, setBankOpeningInput] = useState('');
  const [previewData, setPreviewData] = useState<OpeningBalancesPreviewResponse | null>(null);
  const [showPostConfirm, setShowPostConfirm] = useState(false);

  const query = useQuery({
    queryKey: ['accounting', 'settings'],
    queryFn: () => accountingApi.settings(),
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
    <div className="page-shell document-prototype-shell purchase-new-prototype" dir="rtl">
      <div className="purchase-prototype-sticky-stack">
        <div className="purchase-prototype-document-surface">
          <div className="document-prototype-topbar">
            <div>
              <h2 className="document-prototype-topbar-title">الحسابات</h2>
              <div className="muted small">إعدادات الحسابات والأرصدة الافتتاحية</div>
            </div>
            <div className="actions compact-actions">
              <Button type="button" variant={activeSection === 'accounts-map' ? 'primary' : 'secondary'} onClick={() => setActiveSection('accounts-map')}>
                دليل الربط المحاسبي
              </Button>
              <Button type="button" variant={activeSection === 'opening-balances' ? 'primary' : 'secondary'} onClick={() => setActiveSection('opening-balances')}>
                الأرصدة الافتتاحية
              </Button>
            </div>
          </div>
        </div>
      </div>
      <main className="document-prototype-column">

      {activeSection === 'accounts-map' ? (
        <Card title="إعدادات الحسابات">
          <QueryFeedback
            isLoading={query.isLoading}
            isError={query.isError}
            error={query.error}
            isEmpty={!query.data?.settings}
            loadingText="جاري تحميل إعدادات الحسابات..."
            errorTitle="تعذر تحميل إعدادات الحسابات"
            emptyTitle="لا توجد إعدادات حسابات"
          >
            <table className="table-shell">
              <thead>
                <tr>
                  <th>الإعداد</th>
                  <th>الحساب</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <td>{row.label}</td>
                    <td>{renderAccountRef(settings[row.key])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </QueryFeedback>
        </Card>
      ) : (
        <Card title="الأرصدة الافتتاحية">
          <div className="page-stack">
            <p className="muted">
              استخدم هذه الصفحة لتسجيل أرصدة بداية استخدام النظام. يتم ترحيل الأرصدة الافتتاحية مرة واحدة فقط لكل منشأة.
            </p>
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
        </Card>
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
