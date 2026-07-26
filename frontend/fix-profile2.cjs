const fs = require('fs');
const path = 'c:/zn/frontend/src/features/hr/pages/EmployeeProfilePage.tsx';
let c = fs.readFileSync(path, 'utf8');

if (!c.includes('import { EndOfServiceModal } from \'./employee-profile/EndOfServiceModal\';')) {
  c = c.replace(
    'import { EmployeeAdjustmentsSection } from \'@/features/hr/pages/employee-profile/EmployeeAdjustmentsSection\';',
    'import { EndOfServiceModal } from \'./employee-profile/EndOfServiceModal\';\nimport { EmployeeAdjustmentsSection } from \'@/features/hr/pages/employee-profile/EmployeeAdjustmentsSection\';'
  );
}

if (!c.includes('const [showEndOfServiceModal, setShowEndOfServiceModal] = useState(false);')) {
  c = c.replace(
    'const [showContractForm, setShowContractForm] = useState(false);',
    'const [showContractForm, setShowContractForm] = useState(false);\n  const [showEndOfServiceModal, setShowEndOfServiceModal] = useState(false);'
  );
}

// Ensure EndOfServiceModal is added right before PageHeader if it is missing
if (!c.includes('<EndOfServiceModal')) {
  c = c.replace(
    '<PageHeader',
    '{id && employee ? <EndOfServiceModal employeeId={id} employeeName={employeeName(employee)} isOpen={showEndOfServiceModal} onClose={() => setShowEndOfServiceModal(false)} onSuccess={() => void profile.refetch()} /> : null}\n      <PageHeader'
  );
}

fs.writeFileSync(path, c);
console.log('done');
