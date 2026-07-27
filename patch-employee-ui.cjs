const fs = require('fs');

const helpers = [
  'c:/zn/frontend/src/features/hr/pages/employee-create/employee-create.helpers.ts',
  'c:/zn/frontend/src/features/hr/pages/employee-edit/employee-edit.helpers.ts'
];

helpers.forEach(file => {
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace('hasIncomeTax?: boolean;', 'hasIncomeTax?: boolean;\n  annualLeaveBalance?: string;');
  c = c.replace('hasIncomeTax: false,', 'hasIncomeTax: false,\n  annualLeaveBalance: "21",');
  fs.writeFileSync(file, c);
});

let createPage = fs.readFileSync('c:/zn/frontend/src/features/hr/pages/EmployeeCreatePage.tsx', 'utf8');
createPage = createPage.replace('hasIncomeTax: draft.hasIncomeTax,', 'hasIncomeTax: draft.hasIncomeTax, annualLeaveBalance: draft.annualLeaveBalance ? Number(draft.annualLeaveBalance) : 21,');
createPage = createPage.replace('<label>خاضع لضريبة كسب العمل</label>', '<label>خاضع لضريبة كسب العمل</label>\n            </div>\n            <div className="checkbox-field" style={{ flex: 1, display: \'flex\', alignItems: \'center\', gap: 8 }}>\n              <FormInput label="رصيد الإجازات السنوي" type="number" min={0} max={100} value={draft.annualLeaveBalance} onChange={(e) => setDraft((current) => ({ ...current, annualLeaveBalance: e.target.value }))} style={{ width: 100 }} />');
fs.writeFileSync('c:/zn/frontend/src/features/hr/pages/EmployeeCreatePage.tsx', createPage);

let editPage = fs.readFileSync('c:/zn/frontend/src/features/hr/pages/EmployeeEditPage.tsx', 'utf8');
editPage = editPage.replace('hasIncomeTax: draft.hasIncomeTax,', 'hasIncomeTax: draft.hasIncomeTax, annualLeaveBalance: draft.annualLeaveBalance ? Number(draft.annualLeaveBalance) : 21,');
editPage = editPage.replace('hasIncomeTax: employee.hasIncomeTax === true,', 'hasIncomeTax: employee.hasIncomeTax === true,\n      annualLeaveBalance: String(employee.annualLeaveBalance ?? 21),');
editPage = editPage.replace('<label>خاضع لضريبة كسب العمل</label>', '<label>خاضع لضريبة كسب العمل</label>\n            </div>\n            <div className="checkbox-field" style={{ flex: 1, display: \'flex\', alignItems: \'center\', gap: 8 }}>\n              <FormInput label="رصيد الإجازات السنوي" type="number" min={0} max={100} value={draft.annualLeaveBalance} onChange={(e) => setDraft((current) => ({ ...current, annualLeaveBalance: e.target.value }))} style={{ width: 100 }} />');
fs.writeFileSync('c:/zn/frontend/src/features/hr/pages/EmployeeEditPage.tsx', editPage);

let profilePage = fs.readFileSync('c:/zn/frontend/src/features/hr/pages/EmployeeProfilePage.tsx', 'utf8');
profilePage = profilePage.replace('<tr>\n                      <th>سياسة الحضور</th>', '<tr>\n                      <th>رصيد الإجازات السنوي</th>\n                      <td>{employee.annualLeaveBalance ?? 21} يوم (المستخدم: {employee.usedAnnualLeaves ?? 0} | المتبقي: {Math.max(0, (employee.annualLeaveBalance ?? 21) - (employee.usedAnnualLeaves ?? 0))})</td>\n                    </tr>\n                    <tr>\n                      <th>سياسة الحضور</th>');
fs.writeFileSync('c:/zn/frontend/src/features/hr/pages/EmployeeProfilePage.tsx', profilePage);
