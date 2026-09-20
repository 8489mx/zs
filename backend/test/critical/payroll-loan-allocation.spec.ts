import { strict as assert } from 'node:assert';
import { allocateLoanDeduction } from '../../src/modules/hr/payroll-loan-allocation.engine';

/**
 * يحرس العطل الفعلي: خصم شهر واحد يغطي قسطين من **نفس القرض**، وكان رصيد القرض
 * يُحسب من لقطة قديمة في الدورة الثانية فيختل تصالح المسدَّد مع المتبقي.
 */
function run(): void {
  // ── الحالة التي كانت تنكسر: قرض 1000، قسطان 600 + 600، الخصم يغطيهما ──────
  {
    let remainingToDeduct = 1200;
    let loanRemaining = 1000;
    let loanPaid = 0;
    const installments = [
      { amount: 600, paid: 0 },
      { amount: 600, paid: 0 },
    ];

    const applied: number[] = [];
    for (const inst of installments) {
      const res = allocateLoanDeduction({
        remainingToDeduct,
        installmentAmount: inst.amount,
        installmentPaid: inst.paid,
        loanRemaining, // القيمة الحالية، كما يمررها الإنتاج بعد إعادة القراءة
        loanPaid,
      });
      if (!res) continue;
      applied.push(res.deductAmount);
      remainingToDeduct = res.remainingToDeductAfter;
      loanRemaining = res.newLoanRemaining;
      loanPaid = res.newLoanPaid;
    }

    assert.deepEqual(applied, [600, 400], 'the second installment is capped by what the loan still owes');
    assert.equal(loanPaid, 1000, 'paid must never exceed the loan principal');
    assert.equal(loanRemaining, 0, 'remaining must reach zero, not stay at the stale 400');
    assert.equal(loanPaid + loanRemaining, 1000, 'paid + remaining must reconcile with the principal');
    assert.equal(remainingToDeduct, 200, 'the unallocatable surplus is surfaced to the caller');
  }

  // ── السقف يحترم رصيد القرض لا قيمة القسط ─────────────────────────────────
  {
    const res = allocateLoanDeduction({
      remainingToDeduct: 5000,
      installmentAmount: 600,
      installmentPaid: 0,
      loanRemaining: 250,
      loanPaid: 750,
    })!;
    assert.equal(res.deductAmount, 250, 'capped by the loan remaining');
    assert.equal(res.newLoanRemaining, 0);
    assert.equal(res.newLoanStatus, 'repaid');
    assert.equal(res.newInstallmentStatus, 'partial', 'the installment is only partly covered');
    assert.equal(res.newLoanPaid, 1000);
  }

  // ── سداد جزئي عادي ────────────────────────────────────────────────────────
  {
    const res = allocateLoanDeduction({
      remainingToDeduct: 300,
      installmentAmount: 600,
      installmentPaid: 100,
      loanRemaining: 2000,
      loanPaid: 100,
    })!;
    assert.equal(res.deductAmount, 300);
    assert.equal(res.newInstallmentPaid, 400);
    assert.equal(res.newInstallmentStatus, 'partial');
    assert.equal(res.newLoanRemaining, 1700);
    assert.equal(res.newLoanStatus, 'partially_repaid');
    assert.equal(res.remainingToDeductAfter, 0);
  }

  // القسط يكتمل بالضبط
  {
    const res = allocateLoanDeduction({
      remainingToDeduct: 500,
      installmentAmount: 600,
      installmentPaid: 100,
      loanRemaining: 600,
      loanPaid: 0,
    })!;
    assert.equal(res.newInstallmentPaid, 600);
    assert.equal(res.newInstallmentStatus, 'paid');
  }

  // ── الحالات التي لا يُخصم فيها شيء ────────────────────────────────────────
  assert.equal(
    allocateLoanDeduction({ remainingToDeduct: 100, installmentAmount: 600, installmentPaid: 600, loanRemaining: 900, loanPaid: 0 }),
    null,
    'a fully paid installment is skipped',
  );
  assert.equal(
    allocateLoanDeduction({ remainingToDeduct: 100, installmentAmount: 600, installmentPaid: 0, loanRemaining: 0, loanPaid: 600 }),
    null,
    'a loan with nothing left owing is skipped',
  );
  assert.equal(
    allocateLoanDeduction({ remainingToDeduct: 0, installmentAmount: 600, installmentPaid: 0, loanRemaining: 900, loanPaid: 0 }),
    null,
    'nothing left to deduct',
  );

  // ── حارس عدم السالب وبيانات تاريخية مشوّهة ───────────────────────────────
  {
    const res = allocateLoanDeduction({
      remainingToDeduct: 100,
      installmentAmount: 600,
      installmentPaid: 0,
      loanRemaining: -50 as any,
      loanPaid: 0,
    });
    assert.equal(res, null, 'a negative remaining is clamped to zero, not deducted against');
  }

  // القيم النصية (أعمدة NUMERIC ترجع نصوصاً من الدرايفر)
  {
    const res = allocateLoanDeduction({
      remainingToDeduct: '300' as any,
      installmentAmount: '600' as any,
      installmentPaid: '0' as any,
      loanRemaining: '1000' as any,
      loanPaid: '0' as any,
    })!;
    assert.equal(res.deductAmount, 300);
    assert.equal(res.newLoanRemaining, 700);
  }

  // دقة السنت
  {
    const res = allocateLoanDeduction({
      remainingToDeduct: 33.34,
      installmentAmount: 100,
      installmentPaid: 66.66,
      loanRemaining: 33.34,
      loanPaid: 66.66,
    })!;
    assert.equal(res.deductAmount, 33.34);
    assert.equal(res.newInstallmentPaid, 100);
    assert.equal(res.newInstallmentStatus, 'paid');
    assert.equal(res.newLoanRemaining, 0);
    assert.equal(res.newLoanPaid, 100);
  }

  console.log('payroll-loan-allocation.spec: ok');
}

run();
