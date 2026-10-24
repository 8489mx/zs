import { useTranslation } from 'react-i18next';
import { FormSection } from '@/shared/components/form-section';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
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
  const { t } = useTranslation();
  return (
    <>
      <FormSection title={t('accounting.settings.accounting_opening_balances_section.s0', "الأرصدة الافتتاحية")} description={t('accounting.settings.accounting_opening_balances_section.s1', "استخدم هذه الصفحة لتسجيل أرصدة بداية استخدام النظام. يتم ترحيل الأرصدة الافتتاحية مرة واحدة فقط لكل منشأة.")}>
        <div className="page-stack">
          <p className="muted">
            {t('accounting.settings.accounting_opening_balances_section.s2', "هذا القيد يثبت رصيد الخزنة والبنك فقط. أرصدة العملاء والموردين والمخزون تُرحّل من مستنداتها عند إنشائها.")}
          </p>

          <div className="form-grid three-col-form">
            <label className="field">
              <span>{t('accounting.settings.accounting_opening_balances_section.s3', "تاريخ بداية النظام")}</span>
              <input type="date" value={systemStartDate} onChange={(event) => setSystemStartDate(event.target.value)} />
            </label>
            <label className="field">
              <span>{t('accounting.settings.accounting_opening_balances_section.s4', "رصيد الخزنة الافتتاحي")}</span>
              <input
                inputMode="decimal"
                value={cashOpeningInput}
                onChange={(event) => setCashOpeningInput(event.target.value)}
                placeholder="0.00"
              />
            </label>
            <label className="field">
              <span>{t('accounting.settings.accounting_opening_balances_section.s5', "رصيد البنك الافتتاحي")}</span>
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
              {t('accounting.settings.accounting_opening_balances_section.s6', "معاينة القيد الافتتاحي")}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => setShowPostConfirm(true)}
              disabled={!canPost || postMutation.isPending}
            >
              {t('accounting.settings.accounting_opening_balances_section.s7', "ترحيل الأرصدة الافتتاحية")}
            </Button>
          </div>

          {previewMutation.isError && (
            <div className="error-box">{t('accounting.settings.accounting_opening_balances_section.s8', "تعذر تجهيز معاينة الأرصدة الافتتاحية")}</div>
          )}
          {previewMutation.isSuccess && (
            <div className="success-box">{t('accounting.settings.accounting_opening_balances_section.s9', "تم تجهيز معاينة القيد الافتتاحي بنجاح.")}</div>
          )}

          {postMutation.isError && (
            <div className="error-box">{t('accounting.settings.accounting_opening_balances_section.s10', "تعذر ترحيل الأرصدة الافتتاحية")}</div>
          )}
          {postMutation.isSuccess && (
            <div className="success-box">{t('accounting.settings.accounting_opening_balances_section.s11', "تم ترحيل الأرصدة الافتتاحية بنجاح.")}</div>
          )}

          {openingEntry && (
            <div className="alert alert-info">
              {t('accounting.settings.accounting_opening_balances_section.s12', "تم ترحيل الأرصدة الافتتاحية بالفعل برقم القيد")} {openingEntry.entryNumber} {t('accounting.settings.accounting_opening_balances_section.s13', "بتاريخ")} {formatDate(openingEntry.entryDate)}.
            </div>
          )}

          {previewData && (
            <div className="page-stack">
              <div className="kpi-grid">
                <div className="kpi-card">
                  <span className="muted small">{t('accounting.settings.accounting_opening_balances_section.s14', "إجمالي المدين")}</span>
                  <strong>{formatCurrency((previewData as any).totalDebit ?? 0)}</strong>
                </div>
                <div className="kpi-card">
                  <span className="muted small">{t('accounting.settings.accounting_opening_balances_section.s15', "إجمالي الدائن")}</span>
                  <strong>{formatCurrency((previewData as any).totalCredit ?? 0)}</strong>
                </div>
                <div className="kpi-card">
                  <span className="muted small">{t('accounting.settings.accounting_opening_balances_section.s16', "حالة القيد")}</span>
                  <strong className={isBalanced ? 'text-success' : 'text-danger'}>
                    {isBalanced ? t('accounting.settings.accounting_opening_balances_section.s17', "القيد متزن") : t('accounting.settings.accounting_opening_balances_section.s18', "القيد غير متزن")}
                  </strong>
                </div>
              </div>

              <table className="table-shell">
                <thead>
                  <tr>
                    <th>{t('accounting.settings.accounting_opening_balances_section.s19', "الحساب")}</th>
                    <th>{t('accounting.settings.accounting_opening_balances_section.s20', "البيان")}</th>
                    <th>{t('accounting.settings.accounting_opening_balances_section.s21', "مدين")}</th>
                    <th>{t('accounting.settings.accounting_opening_balances_section.s22', "دائن")}</th>
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

      <StandardDialog
        isOpen={showPostConfirm}
        onClose={() => setShowPostConfirm(false)}
        title={t('accounting.settings.accounting_opening_balances_section.s23', "تأكيد ترحيل الأرصدة الافتتاحية")}
        subtitle={t('accounting.settings.accounting_opening_balances_section.s24', "إنشاء القيد الافتتاحي واعتماد الأرصدة التأسيسية للمنشأة")}
        maxWidth="520px"
        footer={
          <StandardDialogFooter
            onClose={() => setShowPostConfirm(false)}
            closeLabel={t('accounting.settings.accounting_opening_balances_section.s25', "إلغاء")}
            primaryButton={{
              label: postMutation.isPending ? t('accounting.settings.accounting_opening_balances_section.s26', "جاري الترحيل...") : t('accounting.settings.accounting_opening_balances_section.s27', "تأكيد الترحيل النهائي"),
              onClick: () => postMutation.mutate(),
              disabled: !canPost || postMutation.isPending,
              variant: 'danger',
            }}
          />
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              padding: 16,
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 10,
              fontSize: '0.85rem',
              color: '#92400e',
              lineHeight: 1.6,
            }}
          >
            <strong>{t('accounting.settings.accounting_opening_balances_section.s28', "تنبيه مالي رقابي:")}</strong> {t('accounting.settings.accounting_opening_balances_section.s29', "سيتم إنشاء قيد افتتاحي محاسبي مرحّل تلقائياً، ولا يمكن ترحيل الأرصدة الافتتاحية مرة أخرى لنفس المنشأة بعد الاعتماد. هل أنت متأكد من رغبتك في المتابعة؟")}
          </div>
        </div>
      </StandardDialog>
    </>
  );
}
