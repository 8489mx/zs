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
