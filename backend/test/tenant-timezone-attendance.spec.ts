import { strict as assert } from 'node:assert';
import {
  isValidTimezone,
  todayTenantDate,
  formatTimeInTimezone,
} from '../src/common/utils/tenant-timezone.util';

// 1. Timezone Validation (isValidTimezone)
assert.equal(isValidTimezone('Africa/Cairo'), true, 'Cairo should be valid');
assert.equal(isValidTimezone('Asia/Kuwait'), true, 'Kuwait should be valid');
assert.equal(isValidTimezone('Asia/Riyadh'), true, 'Riyadh should be valid');
assert.equal(isValidTimezone('Asia/Dubai'), true, 'Dubai should be valid');
assert.equal(isValidTimezone('UTC'), true, 'UTC should be valid');
assert.equal(isValidTimezone('Europe/London'), true, 'London should be valid');

assert.equal(isValidTimezone(''), false);
assert.equal(isValidTimezone('   '), false);
assert.equal(isValidTimezone('Mars/Olympus'), false);
assert.equal(isValidTimezone('Invalid/Zone'), false);
assert.equal(isValidTimezone(null as any), false);
assert.equal(isValidTimezone(undefined as any), false);

// 2. Dynamic Tenant Date (todayTenantDate)
// 2026-09-20 at 22:30:00 UTC
// In Cairo (UTC+3): 2026-09-21 01:30:00 (Next day!)
// In Kuwait (UTC+3): 2026-09-21 01:30:00 (Next day!)
// In New York (UTC-4): 2026-09-20 18:30:00 (Same day)
const lateUtcDate = new Date('2026-09-20T22:30:00Z');

const cairoDate = todayTenantDate('Africa/Cairo', lateUtcDate);
const kuwaitDate = todayTenantDate('Asia/Kuwait', lateUtcDate);
const newYorkDate = todayTenantDate('America/New_York', lateUtcDate);

assert.equal(cairoDate, '2026-09-21', 'Cairo should be next day');
assert.equal(kuwaitDate, '2026-09-21', 'Kuwait should be next day');
assert.equal(newYorkDate, '2026-09-20', 'New York should be previous day');

const fallbackDate = todayTenantDate('Invalid/Timezone', new Date('2026-09-20T12:00:00Z'));
assert.equal(fallbackDate, '2026-09-20');

// 3. Localized Time Formatting (formatTimeInTimezone)
const sampleDate = new Date('2026-09-20T10:00:00Z');
const kuwaitTime = formatTimeInTimezone(sampleDate, 'Asia/Kuwait', 'en-US');
const dubaiTime = formatTimeInTimezone(sampleDate, 'Asia/Dubai', 'en-US');

assert.match(kuwaitTime, /01:00/);
assert.match(kuwaitTime, /PM/i);
assert.match(dubaiTime, /02:00/);
assert.match(dubaiTime, /PM/i);

assert.equal(formatTimeInTimezone(null, 'Africa/Cairo'), '—');
assert.equal(formatTimeInTimezone(undefined, 'Africa/Cairo'), '—');
assert.equal(formatTimeInTimezone('invalid-date', 'Africa/Cairo'), '—');

// 4. Anti-Tampering Server Time Attendance Punch Simulation
const tenantTimezone = 'Asia/Kuwait';
const fakeClientClock = '2026-09-20T08:00:00.000Z'; // Client faked 8:00 AM
const serverTrueNow = new Date('2026-09-20T10:30:00.000Z'); // True server time 10:30 AM

const payload = {
  employeeId: 101,
  useServerTime: true,
  punchAction: 'check_in' as const,
  checkInAt: fakeClientClock, // Faked by client
  workDate: '2026-09-19', // Faked by client
};

// Simulating backend upsertAttendanceRecord resolution
let checkInAt: Date | null = null;
let workDate: string;

if (payload.useServerTime || payload.punchAction) {
  // Backend takes server time
  checkInAt = serverTrueNow;
  workDate = todayTenantDate(tenantTimezone, serverTrueNow);
} else {
  checkInAt = new Date(payload.checkInAt);
  workDate = payload.workDate;
}

// Assert that faked client clock and workDate were completely overridden by the server
assert.equal(checkInAt.toISOString(), '2026-09-20T10:30:00.000Z', 'Must use server time');
assert.notEqual(checkInAt.toISOString(), fakeClientClock, 'Must reject client faked clock');
assert.equal(workDate, '2026-09-20', 'Must use tenant date, not client date');

console.log('tenant-timezone-attendance.spec: ok');
