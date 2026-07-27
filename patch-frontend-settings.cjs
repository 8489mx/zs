const fs = require('fs');
let c = fs.readFileSync('c:/zn/frontend/src/features/hr/pages/HrSettingsPage.tsx', 'utf8');

c = c.replace(`isActive: true } });`, `deductsFromBalance: leaveTypeDraft.deductsFromBalance, isActive: true } });`);
c = c.replace(`<FormSelect label="النوع المالي"`, `<div className="checkbox-field" style={{ marginBottom: 12 }}><label><input type="checkbox" checked={leaveTypeDraft.deductsFromBalance || false} onChange={(e) => setLeaveTypeDraft({ ...leaveTypeDraft, deductsFromBalance: e.target.checked })} /> تخصم من الرصيد السنوي؟</label></div>\n              <FormSelect label="النوع المالي"`);

fs.writeFileSync('c:/zn/frontend/src/features/hr/pages/HrSettingsPage.tsx', c);
