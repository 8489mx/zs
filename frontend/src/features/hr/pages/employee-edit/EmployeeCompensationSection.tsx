import React from 'react';
import { getGlobalCurrencySymbol } from '@/lib/currencies';
import { CustomSelect } from '@/shared/ui/custom-select';
import type { EmployeeEditDraft } from './employee-edit.helpers';

interface EmployeeCompensationSectionProps {
  draft: EmployeeEditDraft;
  setDraft: React.Dispatch<React.SetStateAction<EmployeeEditDraft>>;
}

export const EmployeeCompensationSection: React.FC<EmployeeCompensationSectionProps> = ({
  draft,
  setDraft,
}) => {
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', boxSizing: 'border-box' }}>
      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>نظام الأجور والراتب</span>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1 }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>نوع الأجر</label>
          <CustomSelect
            value={draft.compensationType}
            onChange={(val) => setDraft((current) => ({ ...current, compensationType: val === 'hourly' ? 'hourly' : 'monthly' }))}
            options={[
              { value: 'monthly', label: 'راتب شهري ثابت' },
              { value: 'hourly', label: 'أجر بالساعة' },
            ]}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>دورة القبض</label>
          <CustomSelect
            value={draft.payFrequency}
            onChange={(val) => setDraft((current) => ({ ...current, payFrequency: val as any }))}
            options={[
              { value: 'monthly', label: 'شهري' },
              { value: 'weekly', label: 'أسبوعي' },
              { value: 'biweekly', label: 'نصف شهري' },
              { value: 'daily', label: 'يومي' },
            ]}
          />
        </div>

        {draft.compensationType === 'hourly' ? (
          <>
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>أجر الساعة (${getGlobalCurrencySymbol()})</label>
              <input
                inputMode="decimal"
                min="0"
                value={draft.hourlyRate}
                onChange={(e) => setDraft((current) => ({ ...current, hourlyRate: e.target.value }))}
                style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>ساعات العمل اليومية</label>
              <input
                inputMode="decimal"
                min="0"
                value={draft.expectedDailyHours}
                onChange={(e) => setDraft((current) => ({ ...current, expectedDailyHours: e.target.value }))}
                style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>
          </>
        ) : (
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>الراتب التأميني</label>
            <input
              inputMode="decimal"
              min="0"
              value={draft.insuranceSalary}
              onChange={(e) => setDraft((current) => ({ ...current, insuranceSalary: e.target.value }))}
              placeholder="اختياري"
              style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
            />
          </div>
        )}
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>التأمينات والضرائب</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 14px', minHeight: '38px', boxSizing: 'border-box' }}>
            <label style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', margin: 0, userSelect: 'none' }}>
              <input type="checkbox" checked={draft.hasSocialInsurance} onChange={(e) => setDraft((current) => ({ ...current, hasSocialInsurance: e.target.checked }))} style={{ width: '16px', height: '16px', margin: 0, cursor: 'pointer' }} />
              <span style={{ whiteSpace: 'nowrap' }}>تأمينات اجتماعية</span>
            </label>
            <label style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', margin: 0, userSelect: 'none' }}>
              <input type="checkbox" checked={draft.hasIncomeTax} onChange={(e) => setDraft((current) => ({ ...current, hasIncomeTax: e.target.checked }))} style={{ width: '16px', height: '16px', margin: 0, cursor: 'pointer' }} />
              <span style={{ whiteSpace: 'nowrap' }}>ضريبة كسب عمل</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
