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
  return (
    <>
      {/* Bank & WPS Details Card */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>البيانات البنكية وحماية الأجور (WPS / SIF)</span>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>مطلوب للتحويلات البنكية المباشرة ونظام حماية الأجور</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>اسم البنك</label>
            <input
              value={draft.bankName || ''}
              onChange={(e) => setDraft((current) => ({ ...current, bankName: e.target.value }))}
              placeholder="مثال: مصرف الراجحي / البنك الأهلي"
              style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>رقم الحساب البنكي</label>
            <input
              value={draft.bankAccountNumber || ''}
              onChange={(e) => setDraft((current) => ({ ...current, bankAccountNumber: e.target.value }))}
              placeholder="رقم الحساب البنكي"
              style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>رقم الآيبان الدولي (IBAN)</label>
            <input
              value={draft.iban || ''}
              onChange={(e) => setDraft((current) => ({ ...current, iban: e.target.value.toUpperCase() }))}
              placeholder="SA0000000000000000000000"
              dir="ltr"
              style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box', textAlign: 'left', fontFamily: 'monospace' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>رمز السويفت / كود البنك (SWIFT / Routing)</label>
            <input
              value={draft.bankSwiftCode || ''}
              onChange={(e) => setDraft((current) => ({ ...current, bankSwiftCode: e.target.value.toUpperCase() }))}
              placeholder="مثال: RJHI / NCBK"
              dir="ltr"
              style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box', textAlign: 'left', fontFamily: 'monospace' }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Section: Notes & Submit */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>ملاحظات إدارية (اختياري)</label>
          <input
            value={draft.notes}
            onChange={(e) => setDraft((current) => ({ ...current, notes: e.target.value }))}
            placeholder="أدخل أي ملاحظات إدارية على ملف الموظف..."
            style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
          />
        </div>

        {submitError ? <div className="error-box" style={{ margin: 0 }}>{submitError}</div> : null}

        <div className="actions compact-actions" style={{ justifyContent: 'flex-start', gap: '10px', marginTop: '4px' }}>
          <Button type="submit" disabled={isBusy} style={{ minWidth: '140px' }}>{isBusy ? 'جاري الحفظ...' : 'حفظ التعديلات'}</Button>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isBusy}>إلغاء</Button>
        </div>
      </div>
    </>
  );
};
