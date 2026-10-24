/**
 * Canonical HR payroll line orchestration.
 *
 * All earnings and approved payroll adjustments are folded into the wage base
 * BEFORE tax/insurance are calculated. Do not use attendance preview numbers as
 * statutory withholding: those previews exclude manual adjustments.
 *
 * Does not supply legal rates: tenant reviewed effective-dated policies are required.
 */
import { calculateEmployeePayrollLine, type PayrollLineItemInput } from './payroll-calculation.engine';
import { calculateHrStatutoryAmounts, type HrStatutoryPolicy } from './hr-statutory-policy.engine';

export interface HrPayrollRunLineInput {
  policy: HrStatutoryPolicy;
  period: { from: string; to: string };
  line: Omit<PayrollLineItemInput, 'employeeSocialInsurance' | 'employerSocialInsurance' | 'incomeTax'>;
  eligibility: { insured: boolean; taxable: boolean };
  /** Employee's explicit insured salary; 0 is valid when the selected wage basis is 'earned_base'. */
  configuredInsuranceSalary: number;
}

const money = (n: number) => Number(n.toFixed(2));
const nonnegative = (n: unknown, label: string): number => {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) {
    throw new RangeError(`Invalid HR payroll amount: ${label}`);
  }
  return money(n);
};

/** All financial elements returned by the canonical line engine, including statutory amounts. */
export function calculateHrPayrollRunLine(input: HrPayrollRunLineInput) {
  const line = input.line;
  // Never silently accept refunds or negative deductions as negative payroll
  // amounts. Refunds must be entered as explicit positive allowances.
  nonnegative(line.otherDeductions, 'otherDeductions');
  nonnegative(line.assetRecoveryDeduction, 'assetRecoveryDeduction');
  nonnegative(line.scheduledLoanDeduction, 'scheduledLoanDeduction');
  const ceiling = line.maxDeductionPct ?? 1;
  if (!Number.isFinite(ceiling) || ceiling <= 0 || ceiling > 1) {
    throw new RangeError('Payroll deduction ceiling must be between zero and one');
  }
  const gross = money(
    nonnegative(line.baseSalary, 'baseSalary') +
    nonnegative(line.allowanceAmount, 'allowanceAmount') +
    nonnegative(line.overtimeAmount, 'overtimeAmount') +
    nonnegative(line.commissionAmount, 'commissionAmount'),
  );
  const attendance = nonnegative(line.attendanceDeduction, 'attendanceDeduction');
  const unpaidLeave = nonnegative(line.leaveDeduction, 'leaveDeduction');
  const wageAfterAbsence = Math.max(0, money(gross - attendance - unpaidLeave));

  let insuranceSalary: number;
  if (input.policy.hrSocialInsuranceEnabled && input.eligibility.insured
      && input.policy.insuranceWageBasis === 'employee_insurance_salary') {
    insuranceSalary = nonnegative(input.configuredInsuranceSalary, 'configuredInsuranceSalary');
    if (insuranceSalary === 0) {
      throw new RangeError('أجر التأمينات الخاص بالموظف غير محدد وفق سياسة المنشأة');
    }
  } else {
    insuranceSalary = nonnegative(line.baseSalary, 'baseSalary');
  }
  // First pass calculates insurance; second pass calculates tax against the
  // explicitly selected tax base (with or without the employee insurance share).
  const insurance = calculateHrStatutoryAmounts(
    { ...input.policy, hrIncomeTaxEnabled: false },
    input.period,
    { insured: input.eligibility.insured, taxable: false,
      insuranceWage: insuranceSalary, taxableMonthlyWage: 0 },
  );
  const taxableBeforeInsurance = input.policy.taxableEarningsBasis === 'gross_after_attendance_leave'
    ? wageAfterAbsence : gross;
  const taxableWage = Math.max(0, money(
    taxableBeforeInsurance - (input.policy.taxDeductEmployeeInsurance ? insurance.employeeInsurance : 0),
  ));
  const tax = calculateHrStatutoryAmounts(
    { ...input.policy, hrSocialInsuranceEnabled: false },
    input.period,
    { insured: false, taxable: input.eligibility.taxable,
      insuranceWage: 0, taxableMonthlyWage: taxableWage },
  );

  return calculateEmployeePayrollLine({
    ...line,
    employeeSocialInsurance: insurance.employeeInsurance,
    employerSocialInsurance: insurance.employerInsurance,
    incomeTax: tax.incomeTax,
  });
}
