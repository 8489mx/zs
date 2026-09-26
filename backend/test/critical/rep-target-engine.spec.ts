import { strict as assert } from 'node:assert';
import { calculateRepTargetMetrics } from '../../src/modules/delivery-reps/rep-target.engine';

// 1. Correctly calculates remaining working days excluding Fridays and official holidays
const result1 = calculateRepTargetMetrics({
  targetAmount: 100000,
  actualSalesMTD: 50000,
  currentDate: '2026-09-24',
  weekendDays: [5], // Friday
  officialHolidays: ['2026-09-28'],
});

assert.equal(result1.periodMonth, '2026-09');
assert.equal(result1.targetAmount, 100000);
assert.equal(result1.actualSalesMTD, 50000);
assert.equal(result1.achievementRate, 50);
assert.equal(result1.remainingTarget, 50000);
assert.equal(result1.isTargetAchieved, false);
assert.equal(result1.totalDaysInMonth, 30);
assert.equal(result1.remainingDaysTotal, 7);
assert.equal(result1.excludedFridaysCount, 1);
assert.equal(result1.excludedHolidaysCount, 1);
assert.equal(result1.remainingWorkingDays, 5);
// Required daily target: 50,000 / 5 = 10,000
assert.equal(result1.requiredDailyTarget, 10000);

// 2. Handles target fully achieved or exceeded
const result2 = calculateRepTargetMetrics({
  targetAmount: 80000,
  actualSalesMTD: 95000,
  currentDate: '2026-09-26',
  weekendDays: [5],
});

assert.equal(result2.achievementRate, 118.8);
assert.equal(result2.remainingTarget, 0);
assert.equal(result2.isTargetAchieved, true);
assert.equal(result2.requiredDailyTarget, 0);

// 3. Handles zero target gracefully
const result3 = calculateRepTargetMetrics({
  targetAmount: 0,
  actualSalesMTD: 5000,
  currentDate: '2026-09-26',
});

assert.equal(result3.achievementRate, 0);
assert.equal(result3.remainingTarget, 0);
assert.equal(result3.isTargetAchieved, false);
assert.equal(result3.requiredDailyTarget, 0);

// 4. Handles month end day
const result4 = calculateRepTargetMetrics({
  targetAmount: 50000,
  actualSalesMTD: 40000,
  currentDate: '2026-09-30',
  weekendDays: [5],
});

assert.equal(result4.remainingDaysTotal, 1);
assert.equal(result4.remainingWorkingDays, 1);
assert.equal(result4.remainingTarget, 10000);
assert.equal(result4.requiredDailyTarget, 10000);

console.log('✅ RepTargetEngine tests passed successfully!');
