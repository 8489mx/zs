/**
 * HR payment calculations: hourly staff are paid for completed, valid recorded
 * work sessions, not for a theoretical 30-day attendance schedule.
 */
export type WorkPunch = {
  status?: unknown;
  check_in_at?: unknown;
  check_out_at?: unknown;
};
export function summarizeHourlyAttendance(punches: WorkPunch[], hourlyRate: number) {
  let workedMinutes = 0;
  let completedDays = 0;
  let incompleteCount = 0;
  let invalidCount = 0;
  for (const punch of punches) {
    const status = String(punch.status || '');
    if (status === 'absent' || status === 'leave') continue;
    const start = punch.check_in_at;
    const finish = punch.check_out_at;
    if (!start && !finish) continue;
    if (!start || !finish) {
      incompleteCount++;
      continue;
    }
    const startAt = new Date(start as string).getTime();
    const finishAt = new Date(finish as string).getTime();
    const elapsed = Math.floor((finishAt - startAt) / 60000);
    if (!Number.isFinite(elapsed) || elapsed <= 0 || elapsed > 1440) {
      invalidCount++;
      continue;
    }
    workedMinutes += elapsed;
    completedDays++;
  }
  const rate = Number(hourlyRate);
  return {
    workedMinutes, completedDays, incompleteCount, invalidCount,
    baseWage: Number(((workedMinutes / 60) * (Number.isFinite(rate) ? Math.max(0, rate) : 0)).toFixed(2)),
  };
}

/** Fraction of every calendar month inside a non-monthly payroll period. */
export function prorateMonthlyWage(monthlySalary: number, from: string, to: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) return 0;
  const start = new Date(from + 'T00:00:00Z');
  const end = new Date(to + 'T00:00:00Z');
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return 0;
  if ((end.getTime() - start.getTime()) / 86400000 > 366) return 0;
  let portion = 0;
  for (let day = new Date(start); day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    const daysInMonth = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 0)).getUTCDate();
    portion += 1 / daysInMonth;
  }
  return Number((Math.max(0, monthlySalary) * portion).toFixed(2));
}
