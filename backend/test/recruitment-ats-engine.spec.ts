import assert from 'node:assert/strict';
import {
  validateStageTransition,
  checkJobOpeningHeadcount,
  buildEmployeeFromApplicant,
  calculateRecruitmentFunnel,
} from '../src/modules/hr/engines/recruitment-ats.engine';

console.log('--- Starting Recruitment ATS Engine Tests ---');

// Test 1: Stage Transitions
{
  const validAdvance = validateStageTransition('new', 'screening');
  assert.equal(validAdvance.valid, true);

  const validReject = validateStageTransition('interview', 'rejected');
  assert.equal(validReject.valid, true);

  const blockedHiredMove = validateStageTransition('hired', 'interview');
  assert.equal(blockedHiredMove.valid, false);
  assert.ok(blockedHiredMove.reason?.includes('لا يمكن تعديل مرحلة مرشح تم توظيفه'));

  console.log('✓ Test 1 Passed: Pipeline stage transition guards strictly enforced');
}

// Test 2: Headcount checks
{
  const openSlot = checkJobOpeningHeadcount(3, 1);
  assert.equal(openSlot.canHire, true);
  assert.equal(openSlot.remainingSlots, 2);
  assert.equal(openSlot.shouldCloseJob, false);

  const lastSlot = checkJobOpeningHeadcount(2, 1);
  assert.equal(lastSlot.canHire, true);
  assert.equal(lastSlot.remainingSlots, 1);
  assert.equal(lastSlot.shouldCloseJob, true);

  const fullSlot = checkJobOpeningHeadcount(2, 2);
  assert.equal(fullSlot.canHire, false);
  assert.equal(fullSlot.remainingSlots, 0);

  console.log('✓ Test 2 Passed: Headcount capacity and auto-close trigger working accurately');
}

// Test 3: 1-Click Employee Conversion Payload
{
  const applicant = {
    fullName: 'أحمد محمود علي',
    phone: '01012345678',
    email: 'ahmed@example.com',
    expectedSalary: 12000,
  };
  const job = {
    title: 'Senior Backend Engineer',
    department: 'Software Engineering',
  };

  const employee = buildEmployeeFromApplicant(applicant, job, 13000);
  assert.equal(employee.name, 'أحمد محمود علي');
  assert.equal(employee.position, 'Senior Backend Engineer');
  assert.equal(employee.department, 'Software Engineering');
  assert.equal(employee.basic_salary, 13000);

  console.log('✓ Test 3 Passed: 1-Click Employee conversion maps all fields accurately');
}

// Test 4: Recruitment Funnel Metrics
{
  const applicants = [
    { stage: 'new' },
    { stage: 'new' },
    { stage: 'screening' },
    { stage: 'interview' },
    { stage: 'offer' },
    { stage: 'hired' },
    { stage: 'hired' },
    { stage: 'rejected' },
    { stage: 'rejected' },
    { stage: 'rejected' },
  ];
  // Total 10, Hired 2 -> 20.0% conversion rate
  const funnel = calculateRecruitmentFunnel(applicants);
  assert.equal(funnel.totalApplicants, 10);
  assert.equal(funnel.newCount, 2);
  assert.equal(funnel.hiredCount, 2);
  assert.equal(funnel.rejectedCount, 3);
  assert.equal(funnel.conversionRatePercent, 20.0);

  console.log('✓ Test 4 Passed: Funnel metrics and conversion rate aggregate with precision');
}

console.log('\nAll 4 Recruitment ATS Engine tests passed with 100% precision.');
