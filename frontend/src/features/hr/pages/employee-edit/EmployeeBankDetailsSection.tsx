import { useTranslation } from 'react-i18next';
import React from 'react';
import { Button } from '@/shared/ui/button';
import type { EmployeeEditDraft } from './employee-edit.helpers';

interface EmployeeBankDetailsSectionProps {
  draft: EmployeeEditDraft;
  setDraft: React.Dispatch<React.SetStateAction<EmployeeEditDraft>>;
  submitError: string;
  isBusy: boolean;
  onCancel: () => void;
}

export const EmployeeBankDetailsSection: React.FC<EmployeeBankDetailsSectionProps> = ({
  draft,
  setDraft,
  submitError,
  isBusy,
  onCancel,
}) => {
  const { t } = useTranslation();
  return (
    <>
      {/* Bank & WPS Details Card */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{t('hr.employee_edit.employee_bank_details_section.s0', "البيانات البنكية وحماية الأجور (WPS / SIF)")}</span>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{t('hr.employee_edit.employee_bank_details_section.s1', "مطلوب للتحويلات البنكية المباشرة ونظام حماية الأجور")}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_edit.employee_bank_details_section.s2', "اسم البنك")}</label>
            <input
              value={draft.bankName || ''}
              onChange={(e) => setDraft((current) => ({ ...current, bankName: e.target.value }))}
              placeholder={t('hr.employee_edit.employee_bank_details_section.s3', "مثال: مصرف الراجحي / البنك الأهلي")}
              style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_edit.employee_bank_details_section.s4', "رقم الحساب البنكي")}</label>
            <input
              value={draft.bankAccountNumber || ''}
              onChange={(e) => setDraft((current) => ({ ...current, bankAccountNumber: e.target.value }))}
              placeholder={t('hr.employee_edit.employee_bank_details_section.s5', "رقم الحساب البنكي")}
              style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_edit.employee_bank_details_section.s6', "رقم الآيبان الدولي (IBAN)")}</label>
            <input
              value={draft.iban || ''}
              onChange={(e) => setDraft((current) => ({ ...current, iban: e.target.value.toUpperCase() }))}
              placeholder="SA0000000000000000000000"
              dir="ltr"
              style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box', textAlign: 'left', fontFamily: 'monospace' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_edit.employee_bank_details_section.s7', "رمز السويفت / كود البنك (SWIFT / Routing)")}</label>
            <input
              value={draft.bankSwiftCode || ''}
              onChange={(e) => setDraft((current) => ({ ...current, bankSwiftCode: e.target.value.toUpperCase() }))}
              placeholder={t('hr.employee_edit.employee_bank_details_section.s8', "مثال: RJHI / NCBK")}
              dir="ltr"
              style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box', textAlign: 'left', fontFamily: 'monospace' }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Section: Notes & Submit */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_edit.employee_bank_details_section.s9', "ملاحظات إدارية (اختياري)")}</label>
          <input
            value={draft.notes}
            onChange={(e) => setDraft((current) => ({ ...current, notes: e.target.value }))}
            placeholder={t('hr.employee_edit.employee_bank_details_section.s10', "أدخل أي ملاحظات إدارية على ملف الموظف...")}
            style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
          />
        </div>

        {submitError ? <div className="error-box" style={{ margin: 0 }}>{submitError}</div> : null}

        <div className="actions compact-actions" style={{ justifyContent: 'flex-start', gap: '10px', marginTop: '4px' }}>
          <Button type="submit" disabled={isBusy} style={{ minWidth: '140px' }}>{isBusy ? t('hr.employee_edit.employee_bank_details_section.s11', "جاري الحفظ...") : t('hr.employee_edit.employee_bank_details_section.s12', "حفظ التعديلات")}</Button>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isBusy}>{t('hr.employee_edit.employee_bank_details_section.s13', "إلغاء")}</Button>
        </div>
      </div>
    </>
  );
};
