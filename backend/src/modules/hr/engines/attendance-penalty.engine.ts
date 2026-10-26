/**
 * Unified Attendance Penalty & Overtime Calculation Engine
 * Single Source of Truth for calculating financial impact of attendance exceptions
 * (late check in, early check out, absent, overtime, missing punch)
 * based on employee contract, compensation type, and delay/attendance policies.
 */

export interface AttendancePenaltyEngineInput {
  exceptionType: string;
  durationMinutes: number;
  compensationType: 'monthly' | 'hourly' | string;
  baseSalary: number;
  hourlyRate: number;
  expectedDailyHours: number;
  delayPolicy: string; // 'inherit' | 'standard' | 'progressive' | 'strict' | 'disabled'
  incidentIndexInMonth?: number; // 1-based sequential occurrence in month
  globalDelayPolicyEnabled?: boolean;
  globalFirstTimeDeduction?: number; // default: 0.25 (quarter day)
  globalSecondTimeDeduction?: number; // default: 0.50 (half day)
  globalThirdTimeDeduction?: number; // default: 1.00 (full day)
  globalFourthTimeDeduction?: number; // default: 1.00 (full day)
  graceMinutes?: number;
  overtimeMultiplier?: number; // default: 1.5
}

export interface AttendancePenaltyEngineResult {
  estimatedAmount: number;
  policyDescription: string;
  hourlyRate: number;
  dailyRate: number;
  effectivePolicy: string;
}

export function calculateAttendancePenalty(input: AttendancePenaltyEngineInput): AttendancePenaltyEngineResult {
  const isHourly = String(input.compensationType || '').toLowerCase() === 'hourly';
  const hourlyRateInput = Number(input.hourlyRate || 0);
  const expectedHours = Number(input.expectedDailyHours || 8) || 8;
  const baseSalary = Number(input.baseSalary || 0);

  const dailyRate = isHourly ? (hourlyRateInput * expectedHours) : (baseSalary > 0 ? (baseSalary / 30) : 0);
  const calculatedHourlyRate = isHourly ? hourlyRateInput : (expectedHours > 0 ? dailyRate / expectedHours : 0);
  const minuteRate = calculatedHourlyRate / 60;

  if (dailyRate === 0 && calculatedHourlyRate === 0) {
    return {
      estimatedAmount: 0,
      policyDescription: 'لم يسجل راتب للموظف',
      hourlyRate: 0,
      dailyRate: 0,
      effectivePolicy: 'no_salary',
    };
  }

  const duration = Math.max(0, Number(input.durationMinutes || 0));
  const isOvertime = input.exceptionType === 'early_check_in' || input.exceptionType === 'late_check_out' || input.exceptionType === 'extra_hours';

  if (isOvertime) {
    const rawMult = Number(input.overtimeMultiplier ?? 1.5);
    const mult = Number.isFinite(rawMult) && rawMult >= 1 ? rawMult : 1;
    const amount = Number(((duration / 60) * calculatedHourlyRate * mult).toFixed(2));
    return {
      estimatedAmount: amount,
      policyDescription: `إضافي (${mult}x)`,
      hourlyRate: Number(calculatedHourlyRate.toFixed(2)),
      dailyRate: Number(dailyRate.toFixed(2)),
      effectivePolicy: 'overtime',
    };
  }

  if (input.exceptionType === 'absent') {
    return {
      estimatedAmount: Number(dailyRate.toFixed(2)),
      policyDescription: 'غياب (يوم كامل)',
      hourlyRate: Number(calculatedHourlyRate.toFixed(2)),
      dailyRate: Number(dailyRate.toFixed(2)),
      effectivePolicy: 'absent',
    };
  }

  if (input.exceptionType === 'late_check_in' || input.exceptionType === 'early_check_out') {
    let mode = String(input.delayPolicy || 'inherit').toLowerCase();
    if (mode === 'inherit') {
      mode = input.globalDelayPolicyEnabled ? 'progressive' : 'standard';
    }

    if (mode === 'disabled') {
      return {
        estimatedAmount: 0,
        policyDescription: 'معفى (سياسة معطلة)',
        hourlyRate: Number(calculatedHourlyRate.toFixed(2)),
        dailyRate: Number(dailyRate.toFixed(2)),
        effectivePolicy: 'disabled',
      };
    }

    if (mode === 'progressive') {
      const idx = Math.max(1, Number(input.incidentIndexInMonth || 1));
      let fraction = 0.25;
      let label = `تأخير ${idx}: ربع يوم`;
      if (idx === 1) {
        fraction = Number(input.globalFirstTimeDeduction ?? 0.25);
        label = `تأخير 1: ${fraction === 0.25 ? 'ربع يوم' : `${fraction} يوم`}`;
      } else if (idx === 2) {
        fraction = Number(input.globalSecondTimeDeduction ?? 0.50);
        label = `تأخير 2: ${fraction === 0.5 ? 'نصف يوم' : `${fraction} يوم`}`;
      } else if (idx === 3) {
        fraction = Number(input.globalThirdTimeDeduction ?? 1.00);
        label = `تأخير 3: ${fraction === 1 ? 'يوم كامل' : `${fraction} يوم`}`;
      } else {
        fraction = Number(input.globalFourthTimeDeduction ?? 1.00);
        label = `تأخير ${idx}: ${fraction === 1 ? 'يوم كامل' : `${fraction} يوم`}`;
      }
      const amount = Number((dailyRate * fraction).toFixed(2));
      return {
        estimatedAmount: amount,
        policyDescription: label,
        hourlyRate: Number(calculatedHourlyRate.toFixed(2)),
        dailyRate: Number(dailyRate.toFixed(2)),
        effectivePolicy: 'progressive',
      };
    }

    if (mode === 'strict') {
      const grace = Number(input.graceMinutes || 0);
      if (duration > grace) {
        const amount = Number((dailyRate * 0.5).toFixed(2));
        return {
          estimatedAmount: amount,
          policyDescription: 'صارم (نصف يوم)',
          hourlyRate: Number(calculatedHourlyRate.toFixed(2)),
          dailyRate: Number(dailyRate.toFixed(2)),
          effectivePolicy: 'strict',
        };
      }
      const amount = Number((duration * minuteRate).toFixed(2));
      return {
        estimatedAmount: amount,
        policyDescription: 'دقائق فعلية (سماح)',
        hourlyRate: Number(calculatedHourlyRate.toFixed(2)),
        dailyRate: Number(dailyRate.toFixed(2)),
        effectivePolicy: 'strict_grace',
      };
    }

    // standard
    const amount = Number((duration * minuteRate).toFixed(2));
    return {
      estimatedAmount: amount,
      policyDescription: 'دقائق فعلية',
      hourlyRate: Number(calculatedHourlyRate.toFixed(2)),
      dailyRate: Number(dailyRate.toFixed(2)),
      effectivePolicy: 'standard',
    };
  }

  if (input.exceptionType === 'missing_check_in' || input.exceptionType === 'missing_check_out') {
    const amount = Number((dailyRate * 0.5).toFixed(2));
    return {
      estimatedAmount: amount,
      policyDescription: 'بصمة معلقة (نصف يوم)',
      hourlyRate: Number(calculatedHourlyRate.toFixed(2)),
      dailyRate: Number(dailyRate.toFixed(2)),
      effectivePolicy: 'missing_punch',
    };
  }

  return {
    estimatedAmount: 0,
    policyDescription: '—',
    hourlyRate: Number(calculatedHourlyRate.toFixed(2)),
    dailyRate: Number(dailyRate.toFixed(2)),
    effectivePolicy: 'unknown',
  };
}
