/**
 * محرك نقي لتوزيع خصم القرض من الراتب على أقساطه.
 *
 * **لماذا محرك منفصل:** `calculateLoanDeduction` تجمع **كل** الأقساط المستحقة
 * للموظف في رقم واحد، فقد يغطي خصم الشهر الواحد قسطين أو أكثر من **نفس القرض**
 * (موظف فاته شهر). حلقة التسوية كانت تقرأ `paid_amount` من القاعدة في كل دورة
 * لكنها تستخدم `remaining_amount` من **لقطة الاستعلام الأولى** بلا تحديث:
 *
 *   قرض متبقٍ منه 1000، قسطان 600 + 600، والخصم يغطيهما:
 *     القسط 1: min(1200, 600, 1000) = 600 → المتبقي 1000-600 = 400 ✔
 *     القسط 2: min(600, 600, **1000**) = 600 → المتبقي **1000**-600 = 400 ✘
 *   النتيجة: `paid_amount` صار 1200 و`remaining_amount` ثابت على 400، فلا
 *   يتصالحان مع أصل القرض، والقرض يظهر مديناً بـ400 بعد سداده بالكامل فيُخصم
 *   من راتب الشهر التالي مرة أخرى. والأخطر: سقف `min(..., loanRemaining)` يفقد
 *   معناه لأنه يقارن بقيمة قديمة، فيسمح بخصم أكثر مما على القرض فعلاً.
 *
 * القاعدة المفروضة هنا: **كل حساب يعتمد على رصيد القرض لحظة التوزيع، لا على لقطة.**
 * المستدعي ملزم بتمرير `loanRemaining`/`loanPaid` مقروءين حديثاً داخل نفس المعاملة.
 */

/** Sum scheduled installments without ever exceeding each loan's live outstanding principal.
 * Input rows must already be filtered to the payroll period's DUE installments.
 * Using cents avoids false surplus when two installments share a nearly repaid loan.
 */
export function calculatePayrollLoanDueTotal(rows: Array<{
  loanId: number; installmentAmount: number; installmentPaid: number; loanRemaining: number;
}>): number {
  const balances = new Map<number, number>();
  let dueCents = 0;
  const toCents = (value: number): number => {
    if (!Number.isFinite(value) || value < 0) throw new RangeError('Invalid payroll loan balance or installment');
    const result = Math.round(value * 100);
    if (!Number.isSafeInteger(result)) throw new RangeError('Payroll loan balance exceeds safe currency precision');
    return result;
  };
  for (const row of rows) {
    if (!Number.isSafeInteger(row.loanId) || row.loanId <= 0) {
      throw new RangeError('Invalid payroll loan ID');
    }
    const amount = toCents(row.installmentAmount);
    const paid = toCents(row.installmentPaid);
    const outstanding = toCents(row.loanRemaining);
    if (paid > amount) throw new RangeError('Payroll installment paid amount exceeds original amount');
    const available = balances.get(row.loanId) ?? outstanding;
    const applied = Math.min(amount - paid, available);
    dueCents += applied;
    balances.set(row.loanId, available - applied);
  }
  return dueCents / 100;
}

/** Clamp due dates to target month's last calendar day (31 Jan -> 28/29 Feb). */
export function addLoanInstallmentMonths(dateOnly: string, offset: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
  if (!match || !Number.isSafeInteger(offset) || Math.abs(offset) > 6000) throw new RangeError('Invalid installment date');
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const original = new Date(Date.UTC(year, month - 1, day));
  if (original.toISOString().slice(0, 10) !== dateOnly) throw new RangeError('Invalid calendar date');
  const target = new Date(Date.UTC(year, month - 1 + offset, 1));
  const maxDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(day, maxDay))).toISOString().slice(0, 10);
}

/** Strictly positive, bounded, cent-accurate installments with exact principal reconciliation. */
export function calculateLoanInstallmentSchedule(principal: number, countRequested: number, monthly?: number) {
  const total = Math.round(principal * 100);
  if (!Number.isFinite(principal) || principal <= 0 || !Number.isSafeInteger(total)
      || Math.abs(principal - total / 100) > 0.000001) throw new RangeError('Loan principal requires two decimal places');
  const installment = monthly === undefined ? 0 : Math.round(monthly * 100);
  if (monthly !== undefined && (!Number.isFinite(monthly) || monthly <= 0
      || !Number.isSafeInteger(installment) || Math.abs(monthly - installment / 100) > 0.000001)) {
    throw new RangeError('Monthly installment requires two decimal places');
  }
  const count = monthly === undefined ? countRequested : Math.ceil(total / Math.min(total, installment));
  if (!Number.isSafeInteger(count) || count < 1 || count > 360 || count > total) {
    throw new RangeError('Invalid installment count (maximum 360 and at least one cent each)');
  }
  const per = monthly === undefined ? Math.floor(total / count) : Math.min(total, installment);
  const values = Array.from({length: count}, (_, i) => (i === count - 1 ? total - per * (count - 1) : per) / 100);
  if (values.some(x => x <= 0)) throw new RangeError('Invalid non-positive installment');
  return { installmentCount: count, installmentAmount: per / 100, installmentValues: values };
}

export type LoanAllocationInput = {
  /** ما تبقى من مبلغ خصم الراتب الذي لم يوزَّع بعد */
  remainingToDeduct: number;
  /** قيمة القسط الكاملة */
  installmentAmount: number;
  /** المسدَّد من هذا القسط حتى الآن */
  installmentPaid: number;
  /** رصيد القرض المتبقي **الحالي** (لا لقطة) */
  loanRemaining: number;
  /** المسدَّد من القرض **حالياً** (لا لقطة) */
  loanPaid: number;
};

export type LoanAllocationResult = {
  deductAmount: number;
  newInstallmentPaid: number;
  newInstallmentStatus: 'paid' | 'partial';
  newLoanRemaining: number;
  newLoanPaid: number;
  newLoanStatus: 'repaid' | 'partially_repaid';
  /** ما يتبقى من مبلغ الخصم بعد هذه الدورة */
  remainingToDeductAfter: number;
};

function round2(value: number): number {
  return Number(Number(value).toFixed(2));
}

/**
 * يحسب دورة توزيع واحدة. يعيد `null` إذا لم يكن هناك ما يُخصم
 * (قسط مسدَّد، أو قرض بلا رصيد، أو لا يتبقى من الخصم شيء).
 */
export function allocateLoanDeduction(input: LoanAllocationInput): LoanAllocationResult | null {
  const remainingToDeduct = round2(Math.max(0, Number(input.remainingToDeduct) || 0));
  const installmentAmount = round2(Math.max(0, Number(input.installmentAmount) || 0));
  const installmentPaid = round2(Math.max(0, Number(input.installmentPaid) || 0));
  const loanRemaining = round2(Math.max(0, Number(input.loanRemaining) || 0));
  const loanPaid = round2(Math.max(0, Number(input.loanPaid) || 0));

  const installmentRemaining = round2(installmentAmount - installmentPaid);
  if (installmentRemaining <= 0) return null;

  const deductAmount = round2(Math.min(remainingToDeduct, installmentRemaining, loanRemaining));
  if (deductAmount <= 0) return null;

  const newInstallmentPaid = round2(installmentPaid + deductAmount);
  // `Math.max(0, ...)` حارس: رصيد القرض لا يصير سالباً مهما كانت البيانات التاريخية
  const newLoanRemaining = round2(Math.max(0, loanRemaining - deductAmount));

  return {
    deductAmount,
    newInstallmentPaid,
    newInstallmentStatus: newInstallmentPaid >= installmentAmount ? 'paid' : 'partial',
    newLoanRemaining,
    newLoanPaid: round2(loanPaid + deductAmount),
    newLoanStatus: newLoanRemaining <= 0 ? 'repaid' : 'partially_repaid',
    remainingToDeductAfter: round2(remainingToDeduct - deductAmount),
  };
}
