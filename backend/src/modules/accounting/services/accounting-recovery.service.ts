import { Inject, Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { KYSELY_DB } from '../../../database/database.constants';
import { Kysely, sql } from '../../../database/kysely';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { AccountingPostingService } from '../accounting-posting.service';
import { AccountingTenantFoundationService } from '../accounting-tenant-foundation.service';

/**
 * حارسان دوريّان على الدفاتر: أن تكون **أسس كل منشأة مكتملة**، وأن لا يبقى **قيدٌ فاشل** بلا
 * إعادة محاولة.
 *
 * ## لماذا
 *
 * جولة حِمل على الإنتاج (24 سبتمبر 2026) كشفت منشأةً بـ2,281 فاتورة وصفر قيد محاسبي. السبب
 * سلسلة من ثلاث حلقات، كل واحدة وحدها تبدو صغيرة:
 *
 *  1. الهجرة 106 زرعت حسابين في **كل** منشأة، فأبطلت فحص `accounts.count === 0` الذي كان يقرر
 *     «هل أزرع شجرة الحسابات؟» — فلم تُزرع لأحد بعدها.
 *  2. صفُّ `accounting_settings` موجود لكن كل أعمدته `NULL`، فأبطل فحص `!settingsRow`.
 *  3. فشل الترحيل كان يُبتلع في `catch { logger.error }`.
 *
 * الحلقتان الأوليان أُصلحتا في `accounting-tenant-foundation.service.ts` (اكتمالٌ بدل وجود)،
 * لكن الإصلاح هناك كسول: لا يعمل إلا عند أول ترحيل. وهذا يعني أن منشأةً معطوبة تظل معطوبة حتى
 * تبيع. فهذا العامل **يمرّ على كل المنشآت عند الإقلاع** ويصلحها قبل أن يكتشفها عميل.
 *
 * والحلقة الثالثة صارت صفاً في `accounting_posting_failures`. وصفٌّ لا أحد يعيد محاولته هو سطر
 * سجلٍّ آخر بثوب أفخم — فهنا من يعيد المحاولة.
 */
@Injectable()
export class AccountingRecoveryService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(AccountingRecoveryService.name);
  private retryTimer: NodeJS.Timeout | null = null;
  private isRetrying = false;

  /** إعادة المحاولة سريعة عمداً: الفترة المحاسبية قد تُقفل، وقيدٌ متأخر لا يُرحَّل في شهره. */
  private static readonly RETRY_INTERVAL_MS = 5 * 60 * 1000;
  private static readonly RETRY_BATCH = 50;

  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly foundation: AccountingTenantFoundationService,
    private readonly posting: AccountingPostingService,
  ) {}

  onApplicationBootstrap(): void {
    setTimeout(() => {
      this.repairAllTenantFoundations().catch((error) => {
        this.logger.error(`Foundation sweep failed: ${error instanceof Error ? error.message : String(error)}`);
      });
    }, 20_000);

    this.retryTimer = setInterval(() => {
      this.retryFailedPostings().catch((error) => {
        this.logger.warn(`Journal retry pass failed: ${error instanceof Error ? error.message : String(error)}`);
      });
    }, AccountingRecoveryService.RETRY_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
  }

  /**
   * يمرّ على كل منشأة ويضمن أن أسسها المحاسبية مكتملة.
   *
   * المرور كسول من حيث الأثر: `ensureForScope` لا يكتب شيئاً لمنشأة مكتملة أصلاً، فالتكلفة
   * استعلاما قراءة لكل منشأة عند الإقلاع.
   */
  async repairAllTenantFoundations(): Promise<{ checked: number; repaired: number; failed: number }> {
    const tenants = await this.db.selectFrom('tenants').select(['id', 'slug']).execute();
    let repaired = 0;
    let failed = 0;

    for (const tenant of tenants) {
      const tenantId = String(tenant.id);
      try {
        const before = await this.countAccounts(tenantId);
        await this.foundation.ensureForScope(this.db, {
          tenantId,
          accountId: await this.resolveAccountId(tenantId),
        });
        const after = await this.countAccounts(tenantId);
        if (after > before) {
          repaired += 1;
          this.logger.warn(
            `Accounting foundation repaired for tenant "${tenant.slug || tenantId}": `
            + `chart of accounts went from ${before} to ${after}. This tenant could not post a journal before now.`,
          );
        }
      } catch (error) {
        failed += 1;
        this.logger.error(
          `Accounting foundation could not be repaired for tenant "${tenant.slug || tenantId}": `
          + (error instanceof Error ? error.message : String(error)),
        );
      }
    }

    if (repaired > 0 || failed > 0) {
      this.logger.warn(`Foundation sweep: ${tenants.length} checked, ${repaired} repaired, ${failed} still broken.`);
    }
    return { checked: tenants.length, repaired, failed };
  }

  /** يعيد ترحيل القيود التي فشلت، الأقدم محاولةً أولاً. */
  async retryFailedPostings(): Promise<{ attempted: number; recovered: number }> {
    if (this.isRetrying) return { attempted: 0, recovered: 0 };
    this.isRetrying = true;
    try {
      const pending = await this.db
        .selectFrom('accounting_posting_failures')
        .select(['id', 'tenant_id', 'account_id', 'source_type', 'source_id', 'attempts'])
        .where('resolved_at', 'is', null)
        .orderBy('last_attempt_at', 'asc')
        .limit(AccountingRecoveryService.RETRY_BATCH)
        .execute();

      let recovered = 0;
      for (const row of pending) {
        const auth = this.systemAuthFor(String(row.tenant_id), String(row.account_id));
        try {
          await this.db.transaction().execute(async (trx) => {
            if (row.source_type === 'sale') {
              await this.posting.postSale(trx, Number(row.source_id), auth);
            } else {
              throw new Error(`No retry handler for source type "${row.source_type}"`);
            }
            await sql`
              UPDATE accounting_posting_failures
              SET resolved_at = NOW(), last_attempt_at = NOW()
              WHERE id = ${Number(row.id)}
            `.execute(trx);
          });
          recovered += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          await sql`
            UPDATE accounting_posting_failures
            SET attempts = attempts + 1, last_attempt_at = NOW(), error_message = ${message.slice(0, 2000)}
            WHERE id = ${Number(row.id)}
          `.execute(this.db);
        }
      }

      if (pending.length > 0) {
        this.logger.warn(`Journal retry: ${pending.length} attempted, ${recovered} recovered.`);
      }
      return { attempted: pending.length, recovered };
    } finally {
      this.isRetrying = false;
    }
  }

  private async countAccounts(tenantId: string): Promise<number> {
    const row = await this.db
      .selectFrom('accounting_accounts')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();
    return Number(row?.count || 0);
  }

  /** نطاق الحساب كما تكتبه بقية المنظومة (`<tenant>:main` حيث وُجد، وإلا معرّف المنشأة). */
  private async resolveAccountId(tenantId: string): Promise<string> {
    const existing = await this.db
      .selectFrom('accounting_accounts')
      .select(['account_id'])
      .where('tenant_id', '=', tenantId)
      .limit(1)
      .executeTakeFirst();
    if (existing?.account_id) return String(existing.account_id);

    const settings = await this.db
      .selectFrom('accounting_settings')
      .select(['account_id'])
      .where('tenant_id', '=', tenantId)
      .limit(1)
      .executeTakeFirst();
    if (settings?.account_id) return String(settings.account_id);

    return `${tenantId}:main`;
  }

  /**
   * سياق نظامي للترحيل المؤجَّل. لا مستخدم وراءه، فـ`userId` صفر — والترحيل نفسه لا يقرأ من
   * السياق إلا نطاق المنشأة، وهو ما يمنع أي تسرّب بين المستأجرين.
   */
  private systemAuthFor(tenantId: string, accountId: string): AuthContext {
    return {
      userId: 0,
      sessionId: 'accounting-recovery',
      username: 'system',
      role: 'admin',
      permissions: ['accounting'],
      tenantId,
      accountId,
    } as AuthContext;
  }
}
