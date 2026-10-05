/**
 * End-of-Service (EOS) & Gratuity Calculation Pure Engine
 *
 * Implements statutory labor law calculation algorithms:
 * - Saudi Labor Law: Article 84 (Service Gratuity) & Article 85 (Resignation scale) & Article 80 (Gross Misconduct).
 * - Egyptian Labor Law: Article 125.
 * - Custom / Policy-driven calculation.
 * - Entitlement absorption invariants: Payout deductions are strictly bounded by total entitlements.
 *
 * Rule 13 (AGENTS.md):
 * Must be pure functions without database or external state side-effects.
 * Imported identically by production services and critical spec tests.
 */

export type LawType = 'saudi' | 'egyptian' | 'custom';

export type TerminationReason =
  | 'resignation'
  | 'termination_by_employer'
  | 'contract_expiration'
  | 'retirement'
  | 'force_majeure'
  | 'termination_article_80'
  | 'other';

export interface GratuityCalculationParams {
  serviceYearsDecimal: number;
  totalSalary: number;
  dailyWage: number;
  lawType: LawType;
  reason: TerminationReason | string;
  customGratuityDaysPerYear?: number;
}

export interface GratuityCalculationResult {
  baseGratuity: number;
  gratuityPercentage: number;
  gratuityAmount: number;
}

export interface SettlementAbsorptionParams {
  gratuityAmount: number;
  leaveEncashmentAmount: number;
  pendingSalaryAmount: number;
  noticePeriodAmount: number;
  otherEntitlementsAmount: number;
  unpaidLoansDeduction: number;
  assetsDeduction: number;
  otherDeductions: number;
}

export interface SettlementAbsorptionResult {
  totalEntitlements: number;
  appliedAssets: number;
  appliedOther: number;
  appliedLoans: number;
  unabsorbedLoans: number;
  unabsorbedAssets: number;
  unabsorbedOther: number;
  totalDeductions: number;
  netPayable: number;
}

const toMoney = (v: number): number => Number((Number(v || 0)).toFixed(2));

/**
 * Calculates end-of-service gratuity according to the applicable labor law.
 */
export function calculateGratuity(params: GratuityCalculationParams): GratuityCalculationResult {
  const serviceYears = Math.max(0, Number(params.serviceYearsDecimal || 0));
  const totalSalary = Math.max(0, Number(params.totalSalary || 0));
  const dailyWage = Math.max(0, Number(params.dailyWage || (totalSalary / 30)));
  const lawType = params.lawType || 'saudi';
  const reason = params.reason || 'resignation';

  let gratuityPercentage = 100;
  let baseGratuity = 0;

  if (lawType === 'saudi') {
    // Saudi Labor Law: Art. 84:
    // Half month wage for each of the first 5 years, and a full month wage for each following year.
    const first5Years = Math.min(serviceYears, 5);
    const subsequentYears = Math.max(0, serviceYears - 5);
    baseGratuity = (first5Years * 0.5 * totalSalary) + (subsequentYears * 1.0 * totalSalary);

    // Saudi Labor Law: Art. 85 (Resignation scale)
    if (reason === 'resignation') {
      if (serviceYears < 2) {
        gratuityPercentage = 0;
      } else if (serviceYears >= 2 && serviceYears < 5) {
        gratuityPercentage = 33.333; // 1/3
      } else if (serviceYears >= 5 && serviceYears < 10) {
        gratuityPercentage = 66.667; // 2/3
      } else {
        gratuityPercentage = 100; // Full
      }
    } else if (reason === 'termination_article_80') {
      // Gross misconduct under Article 80 forfeits gratuity entirely
      gratuityPercentage = 0;
    } else {
      // Employer termination, end of contract, retirement, or female resignation within statutory window
      gratuityPercentage = 100;
    }
  } else if (lawType === 'egyptian') {
    // Egyptian Labor Law: Art. 125:
    // Half month wage for each of the first 5 years, and a full month wage for each following year.
    const first5Years = Math.min(serviceYears, 5);
    const subsequentYears = Math.max(0, serviceYears - 5);
    baseGratuity = (first5Years * 0.5 * totalSalary) + (subsequentYears * 1.0 * totalSalary);
    gratuityPercentage = 100;
  } else {
    // Custom policy
    const daysPerYear = params.customGratuityDaysPerYear || 15;
    baseGratuity = (daysPerYear * dailyWage) * serviceYears;
    gratuityPercentage = 100;
  }

  let gratuityAmount = 0;
  if (lawType === 'saudi' && reason === 'resignation') {
    if (serviceYears >= 2 && serviceYears < 5) {
      gratuityAmount = toMoney(baseGratuity / 3);
    } else if (serviceYears >= 5 && serviceYears < 10) {
      gratuityAmount = toMoney((baseGratuity * 2) / 3);
    } else if (serviceYears >= 10) {
      gratuityAmount = toMoney(baseGratuity);
    } else {
      gratuityAmount = 0;
    }
  } else {
    gratuityAmount = toMoney((baseGratuity * gratuityPercentage) / 100);
  }

  return {
    baseGratuity: toMoney(baseGratuity),
    gratuityPercentage,
    gratuityAmount,
  };
}

/**
 * Calculates leave encashment compensation for remaining unused annual leave days.
 */
export function calculateLeaveEncashment(remainingLeaveDays: number, dailyWage: number): number {
  const days = Math.max(0, Number(remainingLeaveDays || 0));
  const rate = Math.max(0, Number(dailyWage || 0));
  return toMoney(days * rate);
}

/**
 * Enforces the absorption invariant:
 * In any settlement payout, total deductions cannot exceed total entitlements (net payable >= 0).
 * Any remaining excess deductions are tracked as unabsorbed employee debts.
 */
export function calculateSettlementAbsorption(params: SettlementAbsorptionParams): SettlementAbsorptionResult {
  const gratuity = toMoney(params.gratuityAmount);
  const leavePay = toMoney(params.leaveEncashmentAmount);
  const pendingSalary = toMoney(params.pendingSalaryAmount);
  const noticePeriod = toMoney(params.noticePeriodAmount);
  const otherEntitlements = toMoney(params.otherEntitlementsAmount);

  const totalEntitlements = toMoney(gratuity + leavePay + pendingSalary + noticePeriod + otherEntitlements);

  let pool = totalEntitlements;

  // Deduction absorption order:
  // 1. Assets / Custody recovery
  const requestedAssets = toMoney(params.assetsDeduction);
  const appliedAssets = Math.min(requestedAssets, pool);
  pool = toMoney(pool - appliedAssets);
  const unabsorbedAssets = toMoney(requestedAssets - appliedAssets);

  // 2. Disciplinary / other deductions
  const requestedOther = toMoney(params.otherDeductions);
  const appliedOther = Math.min(requestedOther, pool);
  pool = toMoney(pool - appliedOther);
  const unabsorbedOther = toMoney(requestedOther - appliedOther);

  // 3. Outstanding loans / advances
  const requestedLoans = toMoney(params.unpaidLoansDeduction);
  const appliedLoans = Math.min(requestedLoans, pool);
  pool = toMoney(pool - appliedLoans);
  const unabsorbedLoans = toMoney(requestedLoans - appliedLoans);

  const netPayable = pool;
  const totalDeductions = toMoney(appliedAssets + appliedOther + appliedLoans);

  return {
    totalEntitlements,
    appliedAssets,
    appliedOther,
    appliedLoans,
    unabsorbedLoans,
    unabsorbedAssets,
    unabsorbedOther,
    totalDeductions,
    netPayable,
  };
}
