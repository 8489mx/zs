const fs = require('fs');
const path = 'c:/zn/frontend/src/features/hr/pages/settings/HrSettingsStaticSections.tsx';
let c = fs.readFileSync(path, 'utf8');

const DEFAULT_TAX_BRACKETS = [
  { max: 40000, rate: 0 },
  { max: 55000, rate: 10 },
  { max: 70000, rate: 15 },
  { max: 200000, rate: 20 },
  { max: 400000, rate: 22.5 },
  { max: 999999999, rate: 25 },
];

const DEFAULT_INSURANCE_CONFIG = {
  employeePct: 11,
  employerPct: 18.75,
  minSalary: 2000,
  maxSalary: 12600
};

// 1. Add state fields
if (!c.includes('taxBrackets:')) {
  c = c.replace(
    'hrIncomeTaxEnabled: false,',
    `hrIncomeTaxEnabled: false,
    taxPersonalExemption: '20000',
    taxBrackets: ${JSON.stringify(DEFAULT_TAX_BRACKETS)},
    insuranceConfig: ${JSON.stringify(DEFAULT_INSURANCE_CONFIG)},`
  );
}

// 2. Add hydration
if (!c.includes('taxBrackets: (policiesQuery.data as any).taxBrackets')) {
  c = c.replace(
    'hrIncomeTaxEnabled: (policiesQuery.data as any).hrIncomeTaxEnabled === true,',
    `hrIncomeTaxEnabled: (policiesQuery.data as any).hrIncomeTaxEnabled === true,
        taxPersonalExemption: String((policiesQuery.data as any).taxPersonalExemption ?? '20000'),
        taxBrackets: (policiesQuery.data as any).taxBrackets || ${JSON.stringify(DEFAULT_TAX_BRACKETS)},
        insuranceConfig: (policiesQuery.data as any).insuranceConfig || ${JSON.stringify(DEFAULT_INSURANCE_CONFIG)},`
  );
}

// 3. Add to save payload
if (!c.includes('taxBrackets: draft.taxBrackets,')) {
  c = c.replace(
    'hrIncomeTaxEnabled: draft.hrIncomeTaxEnabled,',
    `hrIncomeTaxEnabled: draft.hrIncomeTaxEnabled,
      taxPersonalExemption: Number(draft.taxPersonalExemption) || 0,
      taxBrackets: draft.taxBrackets,
      insuranceConfig: draft.insuranceConfig,`
  );
}

// 4. Add to UI
const uiAddition = `
        <FormSection title="التأمينات الاجتماعية" description="تفعيل إعدادات التأمينات ونسب الخصم والحدود (تطبق فقط على الموظفين المفعل لهم التأمين).">
          <div className="card-soft" style={{ padding: 16 }}>
            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <input type="checkbox" checked={draft.hrSocialInsuranceEnabled} onChange={(e) => setDraft({ ...draft, hrSocialInsuranceEnabled: e.target.checked })} />
              <strong>تفعيل خصم التأمينات الاجتماعية</strong>
            </label>
            {draft.hrSocialInsuranceEnabled && (
              <div className="form-grid">
                <label className="field">
                  <span>نسبة استقطاع الموظف (%)</span>
                  <input type="number" step="0.1" value={draft.insuranceConfig.employeePct} onChange={(e) => setDraft({ ...draft, insuranceConfig: { ...draft.insuranceConfig, employeePct: Number(e.target.value) } })} />
                </label>
                <label className="field">
                  <span>نسبة حصة الشركة (%)</span>
                  <input type="number" step="0.1" value={draft.insuranceConfig.employerPct} onChange={(e) => setDraft({ ...draft, insuranceConfig: { ...draft.insuranceConfig, employerPct: Number(e.target.value) } })} />
                </label>
                <label className="field">
                  <span>الحد الأدنى للأجر التأميني (سنوي)</span>
                  <input type="number" value={draft.insuranceConfig.minSalary} onChange={(e) => setDraft({ ...draft, insuranceConfig: { ...draft.insuranceConfig, minSalary: Number(e.target.value) } })} />
                </label>
                <label className="field">
                  <span>الحد الأقصى للأجر التأميني (سنوي)</span>
                  <input type="number" value={draft.insuranceConfig.maxSalary} onChange={(e) => setDraft({ ...draft, insuranceConfig: { ...draft.insuranceConfig, maxSalary: Number(e.target.value) } })} />
                </label>
              </div>
            )}
          </div>
        </FormSection>

        <FormSection title="ضرائب كسب العمل" description="تفعيل واعداد شرائح الضرائب والإعفاء الشخصي (تطبق فقط على الموظفين الخاضعين للضريبة).">
          <div className="card-soft" style={{ padding: 16 }}>
            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <input type="checkbox" checked={draft.hrIncomeTaxEnabled} onChange={(e) => setDraft({ ...draft, hrIncomeTaxEnabled: e.target.checked })} />
              <strong>تفعيل استقطاع ضريبة كسب العمل</strong>
            </label>
            {draft.hrIncomeTaxEnabled && (
              <>
                <div className="form-grid" style={{ marginBottom: 16 }}>
                  <label className="field">
                    <span>الإعفاء الشخصي السنوي</span>
                    <input type="number" value={draft.taxPersonalExemption} onChange={(e) => setDraft({ ...draft, taxPersonalExemption: e.target.value })} />
                  </label>
                </div>
                <div className="table-responsive" style={{ background: '#fff', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>الشريحة</th>
                        <th>حتى مبلغ (سنوي)</th>
                        <th>نسبة الضريبة (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draft.taxBrackets.map((bracket: any, idx: number) => (
                        <tr key={idx}>
                          <td>شريحة {idx + 1}</td>
                          <td>
                            <input 
                              type="number" 
                              value={bracket.max} 
                              onChange={(e) => {
                                const newBrackets = [...draft.taxBrackets];
                                newBrackets[idx].max = Number(e.target.value);
                                setDraft({ ...draft, taxBrackets: newBrackets });
                              }}
                              style={{ width: '100%', padding: '4px 8px' }}
                              disabled={idx === draft.taxBrackets.length - 1} // Last bracket is usually open-ended
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              step="0.1"
                              value={bracket.rate} 
                              onChange={(e) => {
                                const newBrackets = [...draft.taxBrackets];
                                newBrackets[idx].rate = Number(e.target.value);
                                setDraft({ ...draft, taxBrackets: newBrackets });
                              }}
                              style={{ width: '100%', padding: '4px 8px' }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="muted" style={{ marginTop: 8 }}>
                  ملاحظة: الشريحة الأخيرة تمثل ما زاد عن الحد الأقصى السابق.
                </p>
              </>
            )}
          </div>
        </FormSection>
`;

if (!c.includes('التأمينات الاجتماعية')) {
  c = c.replace(
    '<div className="actions compact-actions" style={{ marginTop: 16 }}>',
    uiAddition + '\n        <div className="actions compact-actions" style={{ marginTop: 16 }}>'
  );
}

fs.writeFileSync(path, c);
console.log('done');
