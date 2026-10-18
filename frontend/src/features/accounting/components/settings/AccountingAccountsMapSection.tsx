import { useTranslation } from 'react-i18next';
import { Dispatch, SetStateAction } from 'react';
import { FormSection } from '@/shared/components/form-section';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Button } from '@/shared/ui/button';
import { translateUiText } from '@/lib/auto-translator';


interface AccountingAccountsMapSectionProps {
  query: any;
  accountsQuery: any;
  updateSettingsMutation: any;
  isEditingSettings: boolean;
  setIsEditingSettings: (v: boolean) => void;
  settingsForm: Record<string, string>;
  setSettingsForm: Dispatch<SetStateAction<Record<string, string>>>;
  rows: Array<{ key: string; label: string }>;
  settings: Record<string, any>;
  renderAccountRef: (val: any) => string;
}

export function AccountingAccountsMapSection({
  query,
  accountsQuery,
  updateSettingsMutation,
  isEditingSettings,
  setIsEditingSettings,
  settingsForm,
  setSettingsForm,
  rows,
  settings,
  renderAccountRef,
}: AccountingAccountsMapSectionProps) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  return (
    <FormSection
      title={t('accounting.settings.accounting_accounts_map_section.s0', "ربط الحسابات التلقائية")}
      description={t('accounting.settings.accounting_accounts_map_section.s1', "تحديد الحسابات الافتراضية للعمليات الآلية، مثل حسابات المبيعات، المشتريات، الخزينة، والمخزون.")}
      actions={
        !isEditingSettings ? (
          <Button type="button" variant="secondary" onClick={() => {
            const initialForm: Record<string, string> = {};
            for (const r of rows) {
              const acc = settings[r.key];
              if (acc?.id) initialForm[r.key] = String(acc.id);
            }
            setSettingsForm(initialForm);
            setIsEditingSettings(true);
          }}>
            {t('accounting.settings.accounting_accounts_map_section.s2', "تعديل الإعدادات")}
          </Button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="button" variant="secondary" onClick={() => setIsEditingSettings(false)} disabled={updateSettingsMutation.isPending}>{t('accounting.settings.accounting_accounts_map_section.s3', "إلغاء")}</Button>
            <Button type="button" variant="primary" disabled={updateSettingsMutation.isPending} onClick={() => {
              const payload: Record<string, number | null> = {};
              for (const [k, v] of Object.entries(settingsForm)) {
                payload[k + 'Id'] = v ? Number(v) : null;
              }
              updateSettingsMutation.mutate(payload);
            }}>
              {updateSettingsMutation.isPending ? t('accounting.settings.accounting_accounts_map_section.s4', "جاري الحفظ...") : t('accounting.settings.accounting_accounts_map_section.s5', "حفظ التعديلات")}
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
        loadingText={t('accounting.settings.accounting_accounts_map_section.s6', "جاري تحميل إعدادات الحسابات...")}
        errorTitle={t('accounting.settings.accounting_accounts_map_section.s7', "تعذر تحميل إعدادات الحسابات")}
        emptyTitle={t('accounting.settings.accounting_accounts_map_section.s8', "لا توجد إعدادات حسابات")}
      >
        {isEditingSettings && accountsQuery.isLoading && (
          <div className="muted small" style={{ marginBottom: 16 }}>{t('accounting.settings.accounting_accounts_map_section.s9', "جاري تحميل قائمة الحسابات...")}</div>
        )}
        {updateSettingsMutation.isError && (
          <div className="alert alert-danger" style={{ marginBottom: 16 }}>{t('accounting.settings.accounting_accounts_map_section.s10', "تعذر حفظ الإعدادات.")}</div>
        )}
        <table className="table-shell">
          <thead>
            <tr>
              <th style={{ width: '40%' }}>{t('accounting.settings.accounting_accounts_map_section.s11', "الإعداد")}</th>
              <th>{t('accounting.settings.accounting_accounts_map_section.s12', "الحساب")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td><strong>{isEn ? (translateUiText(row.label) || row.label) : row.label}</strong></td>
                <td>
                  {isEditingSettings ? (
                    <select 
                      className="form-control" 
                      value={settingsForm[row.key] || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, [row.key]: e.target.value })}
                      disabled={updateSettingsMutation.isPending}
                      style={{ minWidth: '300px' }}
                    >
                      <option value="">{t('accounting.settings.accounting_accounts_map_section.s13', "-- لم يتم التحديد --")}</option>
                      {accountsQuery.data?.accounts?.map((acc: any) => (
                        <option key={acc.id} value={acc.id}>{acc.code} - {isEn && acc.nameEn ? acc.nameEn : (isEn ? translateUiText(acc.nameAr) || acc.nameAr : acc.nameAr)}</option>
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
  );
}
