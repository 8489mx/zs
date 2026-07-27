const fs = require('fs');

const settingsFile = 'c:/zn/frontend/src/features/hr/pages/HrSettingsPage.tsx';
let settings = fs.readFileSync(settingsFile, 'utf8');
if(settings.includes('interface LeaveTypeDraft { name: string; code: string; description: string; isPaid: \'paid\' | \'unpaid\'; }')) {
  settings = settings.replace('interface LeaveTypeDraft { name: string; code: string; description: string; isPaid: \'paid\' | \'unpaid\'; }', 'interface LeaveTypeDraft { name: string; code: string; description: string; isPaid: \'paid\' | \'unpaid\'; deductsFromBalance?: boolean; }');
  fs.writeFileSync(settingsFile, settings);
  console.log('Fixed HrSettingsPage.tsx type');
} else {
  console.log('Could not find interface in HrSettingsPage.tsx');
}
