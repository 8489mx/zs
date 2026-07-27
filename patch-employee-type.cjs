const fs = require('fs');
const typeFile = 'c:/zn/frontend/src/types/domain-models/hr/employee.ts';
let types = fs.readFileSync(typeFile, 'utf8');
if(types.includes('hasIncomeTax?: boolean;')) {
  types = types.replace('hasIncomeTax?: boolean;', 'hasIncomeTax?: boolean;\n  annualLeaveBalance?: string | number;\n  usedAnnualLeaves?: string | number;');
  fs.writeFileSync(typeFile, types);
  console.log('Fixed hr.types.ts');
}
