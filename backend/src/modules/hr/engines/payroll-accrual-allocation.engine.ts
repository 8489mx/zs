/** HR accrual posting amounts, calculated in integer cents. */
export type PayrollAccrualInput = {
  grossPay: number; netPay: number; loanDeductions: number;
  assetRecoveryDeductions: number; operationalDeductions: number; employeeInsurance: number;
  employerInsurance: number; incomeTax: number;
};
export function allocatePayrollAccrual(input: PayrollAccrualInput) {
  const cents = (value: number): number => {
    if (!Number.isFinite(value) || value < 0) throw new RangeError('Payroll amount must be finite and non-negative');
    return Math.round((value + Number.EPSILON) * 100);
  };
  const gross = cents(input.grossPay);
  const net = cents(input.netPay);
  const loan = cents(input.loanDeductions);
  const assets = cents(input.assetRecoveryDeductions);
  const deductions = cents(input.operationalDeductions);
  const insurance = cents(input.employeeInsurance);
  const employer = cents(input.employerInsurance);
  const tax = cents(input.incomeTax);
  // Stored operationalDeductions includes insurance + tax; both must be
  // reconciled with the actual employee payroll lines, not inferred as a plug.
  if (gross !== net + loan + assets + deductions) {
    throw new RangeError('Payroll persisted gross, net and deductions do not reconcile');
  }
  const wageReduction = deductions - insurance - tax;
  if (wageReduction < 0) {
    throw new RangeError('Payroll statutory withholding exceeds stored deductions');
  }
  // Attendance, leave and operational wage deductions reduce wage expense;
  // asset recoveries are separately classified as recoveries, not attendance income.
  const salaryExpense = gross - wageReduction;
  const explicitCredits = net + loan + assets + insurance + tax;
  if (salaryExpense + employer !== explicitCredits + employer) throw new RangeError('Payroll journal unbalanced');
  const money = (n: number) => n / 100;
  return {
    salaryExpense: money(salaryExpense), wageReduction: money(wageReduction),
    netPayable: money(net), loanCredit: money(loan), assetRecoveryCredit: money(assets),
    employeeInsurancePayable: money(insurance), employerInsuranceExpense: money(employer),
    incomeTaxPayable: money(tax),
    totalDebit: money(salaryExpense + employer),
    totalCredit: money(explicitCredits + employer),
  };
}
