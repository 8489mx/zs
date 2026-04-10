import { strict as assert } from 'node:assert';
import { buildLastNDays, dateKey, getBusinessDayBounds } from '../../src/modules/reports/helpers/reports-range.helper';

function withTimezone<T>(timezone: string, fn: () => T): T {
  const previous = process.env.BUSINESS_TIMEZONE;
  process.env.BUSINESS_TIMEZONE = timezone;
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env.BUSINESS_TIMEZONE;
    else process.env.BUSINESS_TIMEZONE = previous;
  }
}

withTimezone('Asia/Kuwait', () => {
  const saleAt2330Utc = new Date('2026-04-08T23:30:00.000Z');
  assert.equal(dateKey(saleAt2330Utc), '2026-04-09');
  const bounds = getBusinessDayBounds('2026-04-09T12:00:00.000Z');
  assert.equal(bounds.key, '2026-04-09');
  assert.equal(bounds.start.toISOString(), '2026-04-08T21:00:00.000Z');
});

withTimezone('Europe/Berlin', () => {
  const saleAt2330Utc = new Date('2026-04-08T23:30:00.000Z');
  assert.equal(dateKey(saleAt2330Utc), '2026-04-09');
  const keys = buildLastNDays(2, 'Europe/Berlin', new Date('2026-04-09T10:00:00.000Z'));
  assert.deepEqual(keys, ['2026-04-08', '2026-04-09']);
});

withTimezone('Bad/Timezone', () => {
  const utcDate = new Date('2026-04-08T23:30:00.000Z');
  assert.equal(dateKey(utcDate), '2026-04-08');
});

console.log('reports-business-timezone.spec: ok');
