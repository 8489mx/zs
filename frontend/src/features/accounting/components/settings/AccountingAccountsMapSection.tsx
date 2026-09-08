import { Dispatch, SetStateAction } from 'react';
import { FormSection } from '@/shared/components/form-section';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Button } from '@/shared/ui/button';


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
  return (
    <FormSection
      title="ربط الحسابات التلقائية"
      description="تحديد الحسابات الافتراضية للعمليات الآلية، مثل حسابات المبيعات، المشتريات، الخزينة، والمخزون."
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
                      {accountsQuery.data?.accounts?.map((acc: any) => (
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
  );
}
