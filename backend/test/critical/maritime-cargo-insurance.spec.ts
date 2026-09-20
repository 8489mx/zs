import { strict as assert } from 'node:assert';
import {
  INSURANCE_CLAIM_CODES,
  checkInsuranceClaim,
} from '../../src/modules/maritime-freight/engines/cargo-insurance.engine';

/**
 * يحرس البوابتين اللتين لم تكونا موجودتين إطلاقاً قبل مراجعة البند 5:
 * مطالبة تتجاوز القيمة المؤمَّن عليها، ومطالبة ثانية تستبدل الأولى بصمت.
 */
function run(): void {
  // ── مطالبة سليمة ──────────────────────────────────────────────────────────
  assert.equal(checkInsuranceClaim({ insuredValue: 100000, status: 'active' }, 40000).ok, true);
  assert.equal(
    checkInsuranceClaim({ insuredValue: 100000, status: 'active' }, 100000).ok,
    true,
    'claiming exactly the insured value is allowed',
  );

  // ── تجاوز القيمة المؤمَّن عليها (F10: الحقل كان يُخزَّن ولا يُقرأ) ────────
  const over = checkInsuranceClaim({ insuredValue: 100000, status: 'active' }, 100000.01);
  assert.equal(over.ok, false);
  assert.equal(over.code, INSURANCE_CLAIM_CODES.EXCEEDS_INSURED_VALUE);

  const wayOver = checkInsuranceClaim({ insuredValue: 5000, status: 'active' }, 5_000_000);
  assert.equal(wayOver.ok, false);
  assert.equal(wayOver.code, INSURANCE_CLAIM_CODES.EXCEEDS_INSURED_VALUE);

  // قيمة تأمين غائبة أو صفرية لا تفتح الباب
  for (const insuredValue of [0, null, undefined, '']) {
    const res = checkInsuranceClaim({ insuredValue: insuredValue as any, status: 'active' }, 1);
    assert.equal(res.ok, false, `insuredValue=${String(insuredValue)} must not accept a claim`);
    assert.equal(res.code, INSURANCE_CLAIM_CODES.EXCEEDS_INSURED_VALUE);
  }

  // القيم النصية تُعامَل رقمياً (الأعمدة NUMERIC ترجع نصوصاً من الدرايفر)
  assert.equal(checkInsuranceClaim({ insuredValue: '100000', status: 'active' }, '40000').ok, true);
  assert.equal(checkInsuranceClaim({ insuredValue: '1000', status: 'active' }, '1000.5').ok, false);

  // ── منع المطالبة المزدوجة ─────────────────────────────────────────────────
  const twice = checkInsuranceClaim({ insuredValue: 100000, status: 'claimed', claimAmount: 30000 }, 50000);
  assert.equal(twice.ok, false);
  assert.equal(twice.code, INSURANCE_CLAIM_CODES.ALREADY_CLAIMED);
  assert.match(String(twice.message), /30,000|30000/, 'must surface the already-recorded amount');

  // الحالة المسجَّلة تُفحص **قبل** السقف، فلا تتحول رسالة "مطالبة مسجلة" إلى "تجاوز"
  const twiceAndOver = checkInsuranceClaim({ insuredValue: 100, status: 'claimed', claimAmount: 10 }, 999999);
  assert.equal(twiceAndOver.code, INSURANCE_CLAIM_CODES.ALREADY_CLAIMED);

  // ── مبالغ غير صالحة ───────────────────────────────────────────────────────
  for (const bad of [0, -1, null, undefined, 'abc', NaN]) {
    const res = checkInsuranceClaim({ insuredValue: 100000, status: 'active' }, bad as any);
    assert.equal(res.ok, false, `claim=${String(bad)} must be rejected`);
    assert.equal(res.code, INSURANCE_CLAIM_CODES.INVALID_AMOUNT);
  }

  console.log('maritime-cargo-insurance.spec: ok');
}

run();
