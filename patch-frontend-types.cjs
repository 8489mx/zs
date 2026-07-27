const fs = require('fs');

// Fix hr.api.ts
let apiFile = fs.readFileSync('c:/zn/frontend/src/features/hr/api/hr.api.ts', 'utf8');
const searchEos = "endOfService: (id: string, payload: unknown) => http<{ success: boolean; openAssets: number; unpaidLoans: number }>(`/api/hr/employees/${id}/end-of-service`, { method: 'POST', body: JSON.stringify(payload) }),";
const replacementEos = searchEos + "\n  getEndOfServicePreview: (id: string, endDate: string) => http<{ preview: any }>(`/api/hr/employees/${id}/end-of-service/preview?endDate=${endDate}`),";
if(apiFile.includes(searchEos)) {
  apiFile = apiFile.replace(searchEos, replacementEos);
  fs.writeFileSync('c:/zn/frontend/src/features/hr/api/hr.api.ts', apiFile);
  console.log('Fixed hr.api.ts');
} else {
  console.log('Could not find searchEos in hr.api.ts');
}

// Fix unused useEffect
let modalFile = fs.readFileSync('c:/zn/frontend/src/features/hr/pages/employee-profile/EndOfServiceModal.tsx', 'utf8');
modalFile = modalFile.replace('import { FormEvent, useState, useEffect } from \'react\';', 'import { FormEvent, useState } from \'react\';');
fs.writeFileSync('c:/zn/frontend/src/features/hr/pages/employee-profile/EndOfServiceModal.tsx', modalFile);
console.log('Fixed EndOfServiceModal.tsx');

// Fix HrEmployee interface
const typeFile = 'c:/zn/frontend/src/features/hr/types/hr.types.ts';
let types = fs.readFileSync(typeFile, 'utf8');
if(types.includes('hasIncomeTax?: boolean;')) {
  types = types.replace('hasIncomeTax?: boolean;', 'hasIncomeTax?: boolean;\n  annualLeaveBalance?: string | number;\n  usedAnnualLeaves?: string | number;');
  fs.writeFileSync(typeFile, types);
  console.log('Fixed hr.types.ts');
}

// Fix LeaveTypeDraft interface
const settingsFile = 'c:/zn/frontend/src/features/hr/pages/HrSettingsPage.tsx';
let settings = fs.readFileSync(settingsFile, 'utf8');
if(settings.includes('isPaid: \'paid\' | \'unpaid\';')) {
  settings = settings.replace('isPaid: \'paid\' | \'unpaid\';', 'isPaid: \'paid\' | \'unpaid\';\n  deductsFromBalance?: boolean;');
  fs.writeFileSync(settingsFile, settings);
  console.log('Fixed HrSettingsPage.tsx type');
}
