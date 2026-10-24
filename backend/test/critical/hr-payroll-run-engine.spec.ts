import { strict as assert } from 'node:assert';
import { calculateHrPayrollRunLine } from '../../src/modules/hr/engines/hr-payroll-run.engine';
import type { HrPayrollRunLineInput } from '../../src/modules/hr/engines/hr-payroll-run.engine';

// Deliberately synthetic rates, NOT the legislation of Egypt or any GCC country.
const base: HrPayrollRunLineInput = {
  period: { from: '2026-10-01', to: '2026-10-31' },
  policy: {
    statutoryCountry: 'EG', statutoryEffectiveFrom: '2026-01-01',
    statutoryReviewed: true, statutoryLegalReference: 'synthetic reviewed test',
    hrSocialInsuranceEnabled: true, hrIncomeTaxEnabled: true,
    insuranceWageBasis: 'employee_insurance_salary',
    taxableEarningsBasis: 'gross_after_attendance_leave',
    taxDeductEmployeeInsurance: true,
    insuranceConfig: { employeePct: 10, employerPct: 15, maxSalary: 10000 },
    taxPersonalExemption: 0, taxBrackets: [{ max: null, rate: 10 }],
  },
  eligibility: { insured: true, taxable: true },
  configuredInsuranceSalary: 8000,
  line: {
    employeeId: 10, baseSalary: 10000, allowanceAmount: 1500,
    overtimeAmount: 500, commissionAmount: 0,
    attendanceDeduction: 1000, leaveDeduction: 0,
    otherDeductions: 0, assetRecoveryDeduction: 0,
    scheduledLoanDeduction: 2000, maxDeductionPct: 1,
  },
};
const result = calculateHrPayrollRunLine(base);
assert.equal(result.grossPay, 12000);
assert.equal(result.employeeSocialInsurance, 800);
assert.equal(result.employerSocialInsurance, 1200);
assert.equal(result.incomeTax, 1020); // 12k - 1k absence - 800 insurance
assert.equal(result.appliedLoanDeduction, 2000);
assert.equal(result.netPay, 7180);
assert.equal(result.totalDeductions, 4820);

const addedAllowance = calculateHrPayrollRunLine({ ...base, line: {
  ...base.line, allowanceAmount: 2500,
} });
assert.equal(addedAllowance.incomeTax, 1120); // Manual approved earnings increase tax
assert.equal(addedAllowance.netPay, 8080);

const noInsurance = calculateHrPayrollRunLine({ ...base,
  policy: { ...base.policy, hrSocialInsuranceEnabled: false },
  eligibility: { insured: false, taxable: true },
});
assert.equal(noInsurance.employeeSocialInsurance, 0);
assert.equal(noInsurance.incomeTax, 1100);
assert.throws(() => calculateHrPayrollRunLine({ ...base,
  line: { ...base.line, otherDeductions: -10 },
}), /Invalid/);
assert.throws(() => calculateHrPayrollRunLine({ ...base,
  configuredInsuranceSalary: 0,
}), /أجر التأمينات/);
assert.throws(() => calculateHrPayrollRunLine({ ...base,
  period: { from: '2026-10-15', to: '2026-10-31' },
}), /شهرًا ميلاديًا كاملًا/);
