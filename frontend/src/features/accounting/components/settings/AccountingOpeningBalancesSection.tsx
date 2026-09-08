import { FormSection } from '@/shared/components/form-section';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { formatCurrency, formatDate } from '@/lib/format';
import { OpeningBalancesPreviewResponse } from '@/features/accounting/api/accounting.api';

interface AccountingOpeningBalancesSectionProps {
  systemStartDate: string;
  setSystemStartDate: (v: string) => void;
  cashOpeningInput: string;
  setCashOpeningInput: (v: string) => void;
  bankOpeningInput: string;
  setBankOpeningInput: (v: string) => void;
  previewData: OpeningBalancesPreviewResponse | null;
  previewMutation: any;
  postMutation: any;
  showPostConfirm: boolean;
  setShowPostConfirm: (v: boolean) => void;
  canPost: boolean;
  isBalanced: boolean;
  cashOpening: number;
  bankOpening: number;
  openingEntry: any;
}

export function AccountingOpeningBalancesSection({
  systemStartDate,
  setSystemStartDate,
  cashOpeningInput,
  setCashOpeningInput,
  bankOpeningInput,
  setBankOpeningInput,
  previewData,
  previewMutation,
  postMutation,
  showPostConfirm,
  setShowPostConfirm,
  canPost,
  isBalanced,
  openingEntry,
}: AccountingOpeningBalancesSectionProps) {
  return (
    <>
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
            <Button
              type="button"
              variant="secondary"
              onClick={() => previewMutation.mutate()}
              disabled={previewMutation.isPending}
            >
              معاينة القيد الافتتاحي
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => setShowPostConfirm(true)}
              disabled={!canPost || postMutation.isPending}
            >
              ترحيل الأرصدة الافتتاحية
            </Button>
          </div>

          {previewMutation.isError && (
            <div className="error-box">تعذر تجهيز معاينة الأرصدة الافتتاحية</div>
          )}
          {previewMutation.isSuccess && (
            <div className="success-box">تم تجهيز معاينة القيد الافتتاحي بنجاح.</div>
          )}

          {postMutation.isError && (
            <div className="error-box">تعذر ترحيل الأرصدة الافتتاحية</div>
          )}
          {postMutation.isSuccess && (
            <div className="success-box">تم ترحيل الأرصدة الافتتاحية بنجاح.</div>
          )}

          {openingEntry && (
            <div className="alert alert-info">
              تم ترحيل الأرصدة الافتتاحية بالفعل برقم القيد {openingEntry.entryNumber} بتاريخ {formatDate(openingEntry.entryDate)}.
            </div>
          )}

          {previewData && (
            <div className="page-stack">
              <div className="kpi-grid">
                <div className="kpi-card">
                  <span className="muted small">إجمالي المدين</span>
                  <strong>{formatCurrency((previewData as any).totalDebit ?? 0)}</strong>
                </div>
                <div className="kpi-card">
                  <span className="muted small">إجمالي الدائن</span>
                  <strong>{formatCurrency((previewData as any).totalCredit ?? 0)}</strong>
                </div>
                <div className="kpi-card">
                  <span className="muted small">حالة القيد</span>
                  <strong className={isBalanced ? 'text-success' : 'text-danger'}>
                    {isBalanced ? 'القيد متزن' : 'القيد غير متزن'}
                  </strong>
                </div>
              </div>

              <table className="table-shell">
                <thead>
                  <tr>
                    <th>الحساب</th>
                    <th>البيان</th>
                    <th>مدين</th>
                    <th>دائن</th>
                  </tr>
                </thead>
                <tbody>
                  {((previewData as any).lines || (previewData as any).linesPreview || []).map((line: any, index: number) => (
                    <tr key={`${line.accountId}-${index}`}>
                      <td>{line.accountCode} - {line.accountNameAr}</td>
                      <td>{line.description}</td>
                      <td>{line.debit > 0 ? formatCurrency(line.debit) : '—'}</td>
                      <td>{line.credit > 0 ? formatCurrency(line.credit) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </FormSection>

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
    </>
  );
}
