/**
 * Verifiable configuration input for payroll, NOT a statement of any country's
 * laws. Authorised payroll staff must review the applicable effective-dated rules.
 */
export interface HrStatutoryPolicy {
  hrSocialInsuranceEnabled?: boolean;
  hrIncomeTaxEnabled?: boolean;
  statutoryCountry?: 'EG' | 'SA' | 'KW' | 'QA' | 'OM';
  statutoryEffectiveFrom?: string;
  statutoryEffectiveTo?: string;
  statutoryLegalReference?: string;
  statutoryReviewed?: boolean;
  insuranceConfig?: { employeePct: number; employerPct: number; minSalary?: number; maxSalary?: number };
  taxPersonalExemption?: number;
  /** Progressive annual taxable-income bracket upper bounds; rate in percent. */
  taxBrackets?: { max: number | null; rate: number }[];
}

const money = (v: number): number => Number(v.toFixed(2));
function validDate(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(d)
    && Number.isFinite(Date.parse(d + 'T00:00:00Z'))
    && new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) === d;
}
function percent(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || num > 100) throw new Error('نسبة ضريبة أو تأمينات غير صحيحة');
  return num;
}
export function validateHrStatutoryPolicy(p: HrStatutoryPolicy, period?: { from: string; to: string }): void {
  if (!p.hrSocialInsuranceEnabled && !p.hrIncomeTaxEnabled) return;
  if (!p.statutoryReviewed || !['EG', 'SA', 'KW', 'QA', 'OM'].includes(String(p.statutoryCountry || ''))
    || !validDate(String(p.statutoryEffectiveFrom || '')) || !String(p.statutoryLegalReference || '').trim()) {
    throw new Error('حدد الدولة وتاريخ السريان والمرجع القانوني وأكد المراجعة قبل حساب الاستقطاعات');
  }
  if (p.statutoryEffectiveTo && (!validDate(p.statutoryEffectiveTo) || p.statutoryEffectiveTo < p.statutoryEffectiveFrom!)) {
    throw new Error('تاريخ انتهاء سريان قانون الاستقطاعات غير صحيح');
  }
  if (period && (period.from < p.statutoryEffectiveFrom! || (p.statutoryEffectiveTo && period.to > p.statutoryEffectiveTo))) {
    throw new Error('فترة الراتب خارج سريان قواعد الضريبة والتأمينات');
  }
  if (p.hrSocialInsuranceEnabled) {
    const c = p.insuranceConfig;
    if (!c || c.employeePct == null || c.employerPct == null) throw new Error('نسب التأمينات غير محددة');
    percent(c.employeePct); percent(c.employerPct);
    const min = Number(c.minSalary ?? 0), max = Number(c.maxSalary ?? 0);
    if (!Number.isFinite(min) || min < 0 || !Number.isFinite(max) || max < 0 || (max > 0 && min > max)) {
      throw new Error('حدود الأجر التأميني غير صحيحة');
    }
  }
  if (p.hrIncomeTaxEnabled) {
    if (!Number.isFinite(Number(p.taxPersonalExemption)) || Number(p.taxPersonalExemption) < 0
      || !Array.isArray(p.taxBrackets) || !p.taxBrackets.length) throw new Error('الإعفاء والشرائح الضريبية غير محددين');
    let lower = 0;
    for (let i = 0; i < p.taxBrackets.length; i += 1) {
      const band = p.taxBrackets[i];
      percent(band.rate);
      if (band.max === null) {
        if (i !== p.taxBrackets.length - 1) throw new Error('الشريحة المفتوحة يجب أن تكون أخيرة');
      } else {
        const upper = Number(band.max);
        if (!Number.isFinite(upper) || upper <= lower) throw new Error('شرائح الضريبة يجب أن تكون مرتبة تصاعدياً');
        lower = upper;
      }
    }
    if (p.taxBrackets[p.taxBrackets.length - 1].max !== null) throw new Error('شريحة الدخل الأعلى يجب أن تكون مفتوحة');
  }
}
export function calculateHrStatutoryAmounts(
  p: HrStatutoryPolicy,
  period: { from: string; to: string },
  employee: { insured: boolean; taxable: boolean; insuranceWage: number; taxableMonthlyWage: number },
) {
  validateHrStatutoryPolicy(p, period);
  let employeeInsurance = 0, employerInsurance = 0, incomeTax = 0;
  if (p.hrSocialInsuranceEnabled && employee.insured) {
    const ins = p.insuranceConfig!;
    let wage = Number(employee.insuranceWage);
    if (!Number.isFinite(wage) || wage < 0) throw new Error('أجر التأمينات غير صالح');
    wage = Math.max(Number(ins.minSalary || 0), wage);
    if (Number(ins.maxSalary || 0) > 0) wage = Math.min(Number(ins.maxSalary), wage);
    employeeInsurance = money(wage * Number(ins.employeePct) / 100);
    employerInsurance = money(wage * Number(ins.employerPct) / 100);
  }
  if (p.hrIncomeTaxEnabled && employee.taxable) {
    const monthly = Number(employee.taxableMonthlyWage);
    if (!Number.isFinite(monthly) || monthly < 0) throw new Error('الدخل الخاضع للضريبة غير صالح');
    const taxableAnnual = Math.max(0, monthly * 12 - Number(p.taxPersonalExemption));
    let lower = 0, annualTax = 0;
    for (const band of p.taxBrackets!) {
      const upper = band.max === null ? Infinity : Number(band.max);
      annualTax += Math.max(0, Math.min(taxableAnnual, upper) - lower) * Number(band.rate) / 100;
      if (taxableAnnual <= upper) break;
      lower = upper;
    }
    incomeTax = money(annualTax / 12);
  }
  return { employeeInsurance, employerInsurance, incomeTax };
}
