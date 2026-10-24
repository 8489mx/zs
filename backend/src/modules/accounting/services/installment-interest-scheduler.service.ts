import { Inject, Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { KYSELY_DB } from '../../../database/database.constants';
import { Kysely, sql } from '../../../database/kysely';
import { Database } from '../../../database/database.types';
import { AccountingPostingService } from '../accounting-posting.service';

@Injectable()
export class InstallmentInterestSchedulerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(InstallmentInterestSchedulerService.name);
  private timer?: ReturnType<typeof setInterval>;
  private startup?: ReturnType<typeof setTimeout>;
  private running = false;
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>, private readonly posting: AccountingPostingService) {}
  onApplicationBootstrap(): void {
    this.startup = setTimeout(() => { void this.accrueDue(); }, 30_000);
    this.timer = setInterval(() => { void this.accrueDue(); }, 60 * 60 * 1000);
  }
  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.startup) clearTimeout(this.startup);
  }
  async accrueDue(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const tenants = await sql<{ tenant_id: string }>`select distinct tenant_id from accounting_installment_interest
        where journal_entry_id is null and recognition_date <= ${today}::date`.execute(this.db);
      for (const row of tenants.rows) {
        try { await this.posting.recognizeInstallmentInterest(this.db, row.tenant_id, today); }
        catch (error) { this.logger.error(`Interest accrual requires reconciliation for tenant ${row.tenant_id}: ${(error as Error).message}`); }
      }
    } catch (error) { this.logger.error(`Interest accrual failed: ${(error as Error).message}`); }
    finally { this.running = false; }
  }
}
