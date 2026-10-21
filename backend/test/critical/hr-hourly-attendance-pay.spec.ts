import { strict as assert } from 'node:assert';
import { summarizeHourlyAttendance, prorateMonthlyWage } from '../../src/modules/hr/engines/hourly-attendance-pay.engine';

const punch = (start: string, end: string) => ({
  status: 'present', check_in_at: start, check_out_at: end,
});
assert.deepEqual(summarizeHourlyAttendance([], 50), { workedMinutes: 0, completedDays: 0, incompleteCount: 0, invalidCount: 0, baseWage: 0 });
assert.equal(summarizeHourlyAttendance([punch('2026-10-01T09:00:00Z', '2026-10-01T17:30:00Z')], 50).baseWage, 425);
assert.equal(summarizeHourlyAttendance([punch('2026-10-01T21:00:00Z', '2026-10-02T05:00:00Z')], 40).baseWage, 320);
const unfinished = summarizeHourlyAttendance([{ status: 'present', check_in_at: '2026-10-01T10:00:00Z' }], 50);
assert.equal(unfinished.incompleteCount, 1);
assert.equal(unfinished.baseWage, 0);
assert.equal(summarizeHourlyAttendance([punch('2026-10-01T17:00:00Z', '2026-10-01T09:00:00Z')], 50).invalidCount, 1);
assert.equal(summarizeHourlyAttendance([{ ...punch('2026-10-01T09:00:00Z', '2026-10-01T17:00:00Z'), status: 'absent' }], 50).baseWage, 0);
assert.equal(prorateMonthlyWage(3100, '2026-10-01', '2026-10-07'), 700);
assert.equal(prorateMonthlyWage(3000, '2026-10-01', '2026-10-31'), 3000);
console.log('HR hourly attendance/pay tests passed');
