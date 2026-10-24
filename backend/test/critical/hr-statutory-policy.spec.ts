import { strict as assert } from 'node:assert';
import {
  calculateHrStatutoryAmounts,
  validateHrStatutoryPolicy,
  type HrStatutoryPolicy,
} from '../../src/modules/hr/engines/hr-statutory-policy.engine';

// Example company-configured values, NOT legally prescribed country rates.
const policy: HrStatutoryPolicy = {
  statutoryCountry: 'EG',
  statutoryEffectiveFrom: '2026-01-01',
  statutoryLegalReference: 'Example accountant-reviewed private fixture',
  statutoryReviewed: true,
  hrSocialInsuranceEnabled: true,
  hrIncomeTaxEnabled: true,
  insuranceConfig: { employeePct: 10, employerPct: 15, maxSalary: 10000 },
  insuranceWageBasis: 'earned_base',
  insuranceProratePartialEmployment: true,
  taxableEarningsBasis: 'gross',
  taxDeductEmployeeInsurance: false,
  taxPersonalExemption: 12000,
  taxBrackets: [{ max: 120000, rate: 5 }, { max: null, rate: 10 }],
};
const month = { from: '2026-10-01', to: '2026-10-31' };

assert.doesNotThrow(() => validateHrStatutoryPolicy(policy, month));
const amount = calculateHrStatutoryAmounts(policy, month, {
  insured: true, taxable: true, insuranceWage: 14000, taxableMonthlyWage: 20000,
});
assert.equal(amount.employeeInsurance, 1000);
assert.equal(amount.employerInsurance, 1500);
assert.equal(amount.incomeTax, 1400); // 228k taxable annual => 6000 + 10800 / 12

assert.deepEqual(calculateHrStatutoryAmounts(policy, month, {
  insured: false, taxable: false, insuranceWage: 0, taxableMonthlyWage: 0,
}), { employeeInsurance: 0, employerInsurance: 0, incomeTax: 0 });

assert.throws(() => validateHrStatutoryPolicy({ ...policy, statutoryReviewed: false }), /تاريخ السريان|المراجعة/);
assert.throws(() => validateHrStatutoryPolicy({ ...policy, statutoryCountry: undefined }), /الدولة/);
assert.throws(() => validateHrStatutoryPolicy({ ...policy, statutoryEffectiveFrom: '2027-01-01' }, month), /خارج سريان/);
assert.throws(() => validateHrStatutoryPolicy({
  ...policy, taxBrackets: [{ max: 120000, rate: 5 }],
}), /مفتوحة/);
assert.throws(() => validateHrStatutoryPolicy({
  ...policy, insuranceConfig: { employeePct: -1, employerPct: 15 },
}), /نسبة/);
assert.throws(() => calculateHrStatutoryAmounts(policy, { from: '2026-10-08', to: '2026-10-14' }, {
  insured: true, taxable: true, insuranceWage: 10000, taxableMonthlyWage: 10000,
}), /شهرًا ميلاديًا كاملًا/);
assert.throws(() => calculateHrStatutoryAmounts({ ...policy, hrIncomeTaxEnabled: false },
  { from: '2026-10-08', to: '2026-10-14' }, {
    insured: true, taxable: false, insuranceWage: 10000, taxableMonthlyWage: 0,
  }), /شهرًا ميلاديًا كاملًا/);
assert.deepEqual(calculateHrStatutoryAmounts({
  hrSocialInsuranceEnabled: false, hrIncomeTaxEnabled: false,
}, { from: '2026-10-08', to: '2026-10-14' }, {
  insured: true, taxable: true, insuranceWage: 10000, taxableMonthlyWage: 10000,
}), { employeeInsurance: 0, employerInsurance: 0, incomeTax: 0 });
