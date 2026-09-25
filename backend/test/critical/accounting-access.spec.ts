import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ForbiddenException } from '@nestjs/common';
import { AccountingAccessGuard } from '../../src/core/auth/guards/accounting-access.guard';

/**
 * ACC-ACCESS-1 … ACC-ACCESS-3 — دفاتر المنشأة المالية لا يفتحها كاشير.
 *
 * ## الثغرة (مثبتة على الإنتاج، 25 سبتمبر 2026)
 *
 * متحكّم المحاسبة كان يقبل `accounting` **أو** `accounts`. وقالب «كاشير» يمنح `accounts` لكل كاشير
 * (اسمها المعروض «الحسابات»، فتُفهم على أنها حسابات العملاء والموردين — وهي كذلك في المشتريات).
 *
 * ما منع الكارثة جزئياً أن `AccountingService.assertAccountingAccess` تطلب `accounting` تحديداً.
 * لكنه فحصٌ داخل الخدمة تنفّذه 31 دالة من 42، و**الميزانية العمومية وقائمة التدفقات النقدية في
 * خدمتين منفصلتين لا تفحصان شيئاً**. فثبت بطلب حقيقي بحساب `c1`:
 *
 *   GET /api/accounting/reports/balance-sheet → HTTP 200 وفيه الأصول والخزينة والمركز المالي
 *   GET /api/accounting/reports/cash-flow     → HTTP 200
 *
 * والدرس ليس «أضف الفحص في الخدمتين». حمايةٌ معلَّقة على أن يتذكّرها كاتبُ كل خدمة جديدة بين 82
 * مساراً ستُنسى مرة أخرى. البوابة عند الباب، والفحص داخل الخدمة طبقةٌ ثانية.
 */

const SRC = join(__dirname, '..', '..', 'src');
const read = (relative: string) => readFileSync(join(SRC, relative), 'utf8');

function contextFor(auth: unknown) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ authContext: auth }) }),
  } as any;
}

/** ACC-ACCESS-1 — الحارس يطبّق قاعدة `assertAccountingAccess` حرفياً: لا أوسع ولا أضيق. */
function testGuardRule(): void {
  const guard = new AccountingAccessGuard();

  // مسموح: نفس من كانت الخدمة تسمح لهم — فلا يُمنع أحد كان يعمل.
  assert.equal(guard.canActivate(contextFor({ role: 'super_admin', permissions: [] })), true);
  assert.equal(guard.canActivate(contextFor({ role: 'admin', permissions: [] })), true,
    'an admin passed the service check by role, so the door must not be stricter than the room');
  assert.equal(guard.canActivate(contextFor({ role: 'cashier', permissions: ['accounting'] })), true);

  // ممنوع: الكاشير بقالب المنشأة — وهذه هي الثغرة نفسها.
  assert.throws(
    () => guard.canActivate(contextFor({
      role: 'cashier',
      permissions: ['sales', 'cashDrawer', 'customers', 'suppliers', 'accounts', 'purchases', 'products', 'returns'],
    })),
    ForbiddenException,
    '"accounts" must NOT open the books: every cashier created from the template has it',
  );
  assert.throws(() => guard.canActivate(contextFor({ role: 'cashier', permissions: [] })), ForbiddenException);
  assert.throws(() => guard.canActivate(contextFor(undefined)), ForbiddenException);
}

/** ACC-ACCESS-2 — الحارس مركَّب فعلاً على المتحكّم، فالقاعدة تسري على المسارات كلها. */
function testGuardIsMounted(): void {
  const controller = read('modules/accounting/accounting.controller.ts');
  assert.ok(
    /@UseGuards\([^)]*AccountingAccessGuard[^)]*\)/.test(controller),
    'the accounting controller must mount AccountingAccessGuard: 82 routes cannot each be remembered',
  );
  assert.ok(
    /import \{ AccountingAccessGuard \}/.test(controller),
    'the guard must be imported, not merely named',
  );

  // الفحص داخل الخدمة يبقى طبقة ثانية، فلا يُحذف بحجة وجود الحارس.
  const service = read('modules/accounting/accounting.service.ts');
  assert.ok(
    /private assertAccountingAccess/.test(service) && /permissions\.includes\('accounting'\)/.test(service),
    'the in-service check stays as the second layer',
  );
}

/**
 * ACC-ACCESS-3 — أي متحكّم مالي جديد يجب أن يحرس نفسه.
 *
 * الثغرة لم تكن في سطر، بل في أن تقريرين وُضعا في خدمتين جديدتين ولم يتذكّر أحدٌ الفحص. هذا
 * الفحص يجعل النسيان يسقط الحارس بدل أن يفتح الدفاتر.
 */
function testFinancialControllersAreGuarded(): void {
  const accountingDir = join(SRC, 'modules', 'accounting');
  const controllers = readdirSync(accountingDir).filter((name) => name.endsWith('.controller.ts'));
  assert.ok(controllers.length > 0, 'no accounting controller found — did the module move?');

  for (const name of controllers) {
    const source = readFileSync(join(accountingDir, name), 'utf8');
    const guarded = /AccountingAccessGuard/.test(source)
      || /@RequirePermissions\('accounting'\)/.test(source);
    assert.ok(
      guarded,
      `${name} serves financial data but neither mounts AccountingAccessGuard nor requires the `
      + '"accounting" permission outright. A cashier holds "accounts", and that is not the same thing.',
    );
  }
}

function run(): void {
  testGuardRule();
  testGuardIsMounted();
  testFinancialControllersAreGuarded();
  // eslint-disable-next-line no-console
  console.log('accounting-access.spec: ACC-ACCESS-1..3 hold — "accounts" no longer opens the books');
}

try {
  run();
  process.exit(0);
} catch (error) {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
}
