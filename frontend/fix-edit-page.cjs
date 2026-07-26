const fs = require('fs');
const path = 'c:/zn/frontend/src/features/hr/pages/EmployeeEditPage.tsx';
let c = fs.readFileSync(path, 'utf8');

const ui = `<FormSection title="الضرائب والتأمينات" description="إعدادات الضرائب والتأمينات الخاصة بالموظف.">
          <div className="form-grid">
            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <input type="checkbox" checked={draft.hasSocialInsurance} onChange={(e) => setDraft((current) => ({ ...current, hasSocialInsurance: e.target.checked }))} style={{ width: 18, height: 18 }} />
              <span>تطبيق استقطاع التأمينات الاجتماعية</span>
            </label>
            {draft.hasSocialInsurance && (
              <label className="field">
                <span>الأجر التأميني (اتركه فارغاً لاستخدام الراتب الأساسي)</span>
                <input inputMode="decimal" min="0" value={draft.insuranceSalary} onChange={(e) => setDraft((current) => ({ ...current, insuranceSalary: e.target.value }))} />
              </label>
            )}
            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <input type="checkbox" checked={draft.hasIncomeTax} onChange={(e) => setDraft((current) => ({ ...current, hasIncomeTax: e.target.checked }))} style={{ width: 18, height: 18 }} />
              <span>تطبيق ضريبة كسب العمل</span>
            </label>
          </div>
        </FormSection>`;

if (!c.includes('تطبيق ضريبة كسب العمل')) {
  c = c.replace('<FormSection title="ملاحظات"', ui + '\\n        <FormSection title="ملاحظات"');
  fs.writeFileSync(path, c);
}
