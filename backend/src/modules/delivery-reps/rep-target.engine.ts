/**
 * Pure Calculation Engine for Representative Monthly Sales Targets.
 * 
 * Complies with Rule 13 (Strict Financial & Operational Audit Protocol:
 * Tests Must Import Production Code). Both the backend service and unit
 * tests must import this exact file.
 */

export interface RepTargetCalculationInput {
  targetAmount: number;
  actualSalesMTD: number;
  currentDate?: Date | string;
  weekendDays?: number[]; // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat (Default [5] for Friday)
  officialHolidays?: string[]; // Array of 'YYYY-MM-DD' strings
}

export interface RepTargetCalculationResult {
  periodMonth: string; // 'YYYY-MM'
  targetAmount: number;
  actualSalesMTD: number;
  achievementRate: number; // percentage (e.g. 62.5)
  remainingTarget: number;
  isTargetAchieved: boolean;
  totalDaysInMonth: number;
  currentDayOfMonth: number;
  remainingDaysTotal: number;
  remainingWorkingDays: number;
  requiredDailyTarget: number;
  excludedFridaysCount: number;
  excludedHolidaysCount: number;
}

export function calculateRepTargetMetrics(input: RepTargetCalculationInput): RepTargetCalculationResult {
  const target = Math.max(0, Number(Number(input.targetAmount || 0).toFixed(2)));
  const actual = Math.max(0, Number(Number(input.actualSalesMTD || 0).toFixed(2)));

  // Date parsing in local/UTC context
  let dateObj: Date;
  if (!input.currentDate) {
    dateObj = new Date();
  } else if (input.currentDate instanceof Date) {
    dateObj = new Date(input.currentDate.getTime());
  } else {
    // If string like '2026-09-26'
    const parts = String(input.currentDate).split('T')[0].split('-');
    if (parts.length === 3) {
      dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    } else {
      dateObj = new Date(input.currentDate);
    }
  }

  const year = dateObj.getFullYear();
  const month = dateObj.getMonth(); // 0-indexed (0=Jan, 8=Sep)
  const currentDay = dateObj.getDate();

  const periodMonth = `${year}-${String(month + 1).padStart(2, '0')}`;

  // Total calendar days in this month
  const lastDayOfMonthObj = new Date(year, month + 1, 0);
  const totalDaysInMonth = lastDayOfMonthObj.getDate();

  const weekendDays = input.weekendDays && input.weekendDays.length ? input.weekendDays : [5]; // Default Friday (5)
  const holidaySet = new Set<string>((input.officialHolidays || []).map((h) => String(h).trim().slice(0, 10)));

  // Remaining days counting from today inclusive through end of month
  let remainingDaysTotal = 0;
  let remainingWorkingDays = 0;
  let excludedFridaysCount = 0;
  let excludedHolidaysCount = 0;

  for (let d = currentDay; d <= totalDaysInMonth; d++) {
    remainingDaysTotal++;
    const testDate = new Date(year, month, d);
    const dayOfWeek = testDate.getDay(); // 0=Sun, 5=Fri, 6=Sat
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    const isWeekend = weekendDays.includes(dayOfWeek);
    const isHoliday = holidaySet.has(dateStr);

    if (isWeekend) {
      excludedFridaysCount++;
    } else if (isHoliday) {
      excludedHolidaysCount++;
    } else {
      remainingWorkingDays++;
    }
  }

  const achievementRate = target > 0 ? Number(((actual / target) * 100).toFixed(1)) : 0;
  const remainingTarget = Number(Math.max(0, target - actual).toFixed(2));
  const isTargetAchieved = actual >= target && target > 0;

  let requiredDailyTarget = 0;
  if (!isTargetAchieved && remainingTarget > 0) {
    if (remainingWorkingDays > 0) {
      requiredDailyTarget = Number((remainingTarget / remainingWorkingDays).toFixed(2));
    } else {
      // If no working days left in the month, remaining must be done today
      requiredDailyTarget = remainingTarget;
    }
  }

  return {
    periodMonth,
    targetAmount: target,
    actualSalesMTD: actual,
    achievementRate,
    remainingTarget,
    isTargetAchieved,
    totalDaysInMonth,
    currentDayOfMonth: currentDay,
    remainingDaysTotal,
    remainingWorkingDays,
    requiredDailyTarget,
    excludedFridaysCount,
    excludedHolidaysCount,
  };
}
