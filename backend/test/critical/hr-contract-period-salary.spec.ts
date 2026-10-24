import { strict as assert } from 'node:assert';
import { calculateEffectiveContractPay, calculateEffectiveCompensationPay, payrollCalendarMonthFraction } from '../../src/modules/hr/engines/hourly-attendance-pay.engine';

// Pure examples: 31-day October 2026. 15 days at 3100 + 16 days at 6200.
const contracts = [
  { id: 1, startDate: '2026-01-01', endDate: '2026-10-15', baseSalary: 3100 },
  { id: 2, startDate: '2026-10-16', endDate: null, baseSalary: 6200 },
];
const switched = calculateEffectiveContractPay(contracts, '2026-10-01', '2026-10-31');
assert.equal(switched.baseWage, 4700);
assert.equal(switched.referenceMonthlySalary, 4700);
assert.equal(switched.latestContractId, 2);
assert.ok(Math.abs(switched.serviceFraction - 1) < 0.000001);

const hiredMidMonth = calculateEffectiveContractPay(
  [{ id: 5, startDate: '2026-10-11', endDate: null, baseSalary: 3100 }],
  '2026-10-11', '2026-10-20',
);
assert.equal(hiredMidMonth.baseWage, 1000);
assert.equal(hiredMidMonth.referenceMonthlySalary, 3100);
assert.ok(Math.abs(hiredMidMonth.serviceFraction - 10 / 31) < 0.000001);

const gap = [{ ...contracts[0], endDate: '2026-10-14' }, contracts[1]];
assert.throws(() => calculateEffectiveContractPay(gap, '2026-10-01', '2026-10-31'), /Uncovered/);
const overlap = [contracts[0], { ...contracts[1], startDate: '2026-10-15' }];
assert.throws(() => calculateEffectiveContractPay(overlap, '2026-10-01', '2026-10-31'), /Overlapping/);
assert.throws(() => calculateEffectiveContractPay([], '2026-10-01', '2026-10-31'), /no salary contract/);
assert.ok(Math.abs(payrollCalendarMonthFraction('2026-09-01', '2026-10-31') - 2) < 0.000001);

const allowances = calculateEffectiveCompensationPay([
  { id: 10, startDate: '2026-01-01', endDate: '2026-10-15', allowanceAmount: 310, deductionAmount: 0 },
  { id: 11, startDate: '2026-10-16', endDate: null, allowanceAmount: 620, deductionAmount: 31 },
], '2026-10-01', '2026-10-31');
assert.equal(allowances.allowance, 470);
assert.equal(allowances.deduction, 16);
assert.deepEqual(calculateEffectiveCompensationPay([], '2026-10-01', '2026-10-31'),
  { allowance: 0, deduction: 0 });
assert.throws(() => calculateEffectiveCompensationPay([
  { id: 1, startDate: null, endDate: null, allowanceAmount: 10, deductionAmount: 0 },
  { id: 2, startDate: '2026-10-10', endDate: null, allowanceAmount: 20, deductionAmount: 0 },
], '2026-10-01', '2026-10-31'), /Overlapping/);
