const fs = require('fs');
let c = fs.readFileSync('c:/zn/backend/src/modules/hr/hr.service.ts', 'utf8');

const replaceStr = `      delayPolicy: clean(row.delay_policy) || 'inherit',
      hasSocialInsurance: row.has_social_insurance === true,
      insuranceSalary: row.insurance_salary == null ? null : Number(row.insurance_salary),
      hasIncomeTax: row.has_income_tax === true,
      annualLeaveBalance: row.annual_leave_balance == null ? 21 : Number(row.annual_leave_balance),`;

c = c.replaceAll(`      delayPolicy: clean(row.delay_policy) || 'inherit',`, replaceStr);

// Now for used leaves, I will find `getEmployee` and `listEmployees` and run a query for used leaves if needed, or better, calculate it inside SQL or JS.
// Actually, let's just do a left join in the SQL for `listEmployees` and `getEmployee` to sum approved deducts_from_balance leaves for the current year.
fs.writeFileSync('c:/zn/backend/src/modules/hr/hr.service.ts', c);
console.log("Updated hr.service.ts");
