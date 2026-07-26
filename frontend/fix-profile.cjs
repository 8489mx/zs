const fs = require('fs');
let c = fs.readFileSync('c:/zn/frontend/src/features/hr/pages/EmployeeProfilePage.tsx', 'utf8');

c = c.replace('import { EmployeeAdjustmentsSection }', 'import { EndOfServiceModal } from \'./employee-profile/EndOfServiceModal\';\nimport { EmployeeAdjustmentsSection }');
c = c.replace('const [showContractForm, setShowContractForm] = useState(false);', 'const [showContractForm, setShowContractForm] = useState(false);\n  const [showEndOfServiceModal, setShowEndOfServiceModal] = useState(false);');

// update PageHeader actions
c = c.replace(
  'actions={<div className="compact-actions">{id && canManageEmployees ? <Button variant="secondary" onClick={() => navigate(`/hr/employees/${id}/edit`)}>تعديل بيانات الموظف</Button> : null}<Button variant="secondary" onClick={() => navigate(\'/hr/employees\')}>رجوع للموظفين</Button></div>}',
  'actions={<div className="compact-actions">{id && canManageEmployees ? <Button variant="secondary" onClick={() => navigate(`/hr/employees/${id}/edit`)}>تعديل بيانات الموظف</Button> : null}<Button variant="secondary" onClick={() => navigate(`/hr/employees/${id}/print-contract`)}>طباعة العقد</Button>{employee?.status !== \'terminated\' && <Button variant="secondary" className="danger" onClick={() => setShowEndOfServiceModal(true)}>إنهاء خدمة</Button>}<Button variant="secondary" onClick={() => navigate(\'/hr/employees\')}>رجوع للموظفين</Button></div>}'
);

// add modal
c = c.replace(
  '{showContractForm && latestContract && id ?',
  '{id && employee ? <EndOfServiceModal employeeId={id} employeeName={employeeName(employee)} isOpen={showEndOfServiceModal} onClose={() => setShowEndOfServiceModal(false)} onSuccess={() => void profile.refetch()} /> : null}\n\n      {showContractForm && latestContract && id ?'
);

fs.writeFileSync('c:/zn/frontend/src/features/hr/pages/EmployeeProfilePage.tsx', c);
console.log('done');
