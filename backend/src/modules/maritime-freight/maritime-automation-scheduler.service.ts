import { Inject, Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { KYSELY_DB } from '../../database/database.constants';
import { Kysely, sql } from '../../database/kysely';
import { Database } from '../../database/database.types';
import { MaritimeFreightService } from './maritime-freight.service';
import { MaritimeMailService } from './maritime-mail.service';
import { WhatsAppGatewayService } from '../settings/services/whatsapp-gateway.service';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';

@Injectable()
export class MaritimeAutomationSchedulerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(MaritimeAutomationSchedulerService.name);
  private syncTimer: NodeJS.Timeout | null = null;
  private demurrageTimer: NodeJS.Timeout | null = null;
  private isSyncRunning = false;
  private isDemurrageRunning = false;

  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly freightService: MaritimeFreightService,
    private readonly mailService: MaritimeMailService,
    private readonly whatsAppGatewayService: WhatsAppGatewayService,
  ) {}

  onApplicationBootstrap() {
    this.logger.log('Starting Maritime Automation Background Services (IMAP Sync & Demurrage Radar)...');

    // 1. Initial IMAP bids check 45 seconds after application boot
    setTimeout(() => {
      this.runPeriodicBidsSync().catch((err) => {
        this.logger.warn(`Initial maritime bids sync check error: ${err?.message}`);
      });
    }, 45000);

    // 2. Periodic IMAP bids check every 15 minutes (15 * 60 * 1000 ms)
    this.syncTimer = setInterval(() => {
      this.runPeriodicBidsSync().catch((err) => {
        this.logger.warn(`Periodic maritime bids sync check error: ${err?.message}`);
      });
    }, 15 * 60 * 1000);

    // 3. Demurrage expiry scan every 6 hours
    this.demurrageTimer = setInterval(() => {
      this.runPeriodicDemurrageScan().catch((err) => {
        this.logger.warn(`Periodic maritime demurrage scan error: ${err?.message}`);
      });
    }, 6 * 60 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    if (this.demurrageTimer) {
      clearInterval(this.demurrageTimer);
      this.demurrageTimer = null;
    }
  }

  /**
   * Automatically scans active tenants with autoReadInboundBids = true
   * and fetches incoming email bids from carriers.
   */
  async runPeriodicBidsSync(): Promise<void> {
    if (this.isSyncRunning) return;
    this.isSyncRunning = true;

    try {
      // Find tenants that have configured maritime mail settings
      const settingsRows = await this.db
        .selectFrom('settings')
        .select(['tenant_id', 'value'])
        .where('key', '=', 'maritime_mail_config')
        .execute();

      for (const row of settingsRows) {
        if (!row.value || !row.tenant_id) continue;
        try {
          const config = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
          if (config && config.autoReadInboundBids && config.imapUser && config.imapPassword) {
            this.logger.debug(`Running automated inbound bids sync for tenant [${row.tenant_id}]...`);
            
            const syntheticAuth: AuthContext = {
              userId: 0,
              sessionId: 'scheduler-system',
              username: 'system',
              role: 'admin',
              tenantId: row.tenant_id,
              accountId: row.tenant_id,
              permissions: ['maritime_freight', 'all'],
            };

            await this.mailService.syncInboundBids(syntheticAuth, (text) =>
              this.freightService.parseCarrierEmailText(text),
            );
          }
        } catch (err: any) {
          this.logger.warn(`Failed automated IMAP sync for tenant [${row.tenant_id}]: ${err?.message}`);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed runPeriodicBidsSync: ${err?.message}`);
    } finally {
      this.isSyncRunning = false;
    }
  }

  /**
   * Scans active containers across tenants, updates overdue flags,
   * and logs proactive warnings for containers with <= 3 days remaining.
   */
  async runPeriodicDemurrageScan(): Promise<void> {
    if (this.isDemurrageRunning) return;
    this.isDemurrageRunning = true;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find active containers that have not been returned yet
      const activeContainers = await this.db
        .selectFrom('maritime_containers')
        .selectAll()
        .where('empty_returned_at', 'is', null)
        .where('return_deadline', 'is not', null)
        .execute();

      for (const c of activeContainers) {
        if (!c.return_deadline) continue;
        const deadline = new Date(c.return_deadline);
        deadline.setHours(0, 0, 0, 0);
        const diffTime = deadline.getTime() - today.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysRemaining < 0) {
          // Overdue
          const overdueDays = Math.abs(daysRemaining);
          const rate = Number(c.demurrage_rate_per_day || 50);
          const demurrageAmount = overdueDays * rate;

          await this.db
            .updateTable('maritime_containers')
            .set({
              is_overdue: true,
              overdue_days: overdueDays,
              demurrage_amount: demurrageAmount,
              updated_at: sql`NOW()`,
            })
            .where('id', '=', c.id as any)
            .execute();
        } else {
          // Within safe or warning window
          if (c.is_overdue) {
            await this.db
              .updateTable('maritime_containers')
              .set({
                is_overdue: false,
                overdue_days: 0,
                demurrage_amount: 0,
                updated_at: sql`NOW()`,
              })
              .where('id', '=', c.id as any)
              .execute();
          }

          if (daysRemaining <= 3 && daysRemaining >= 0) {
            this.logger.log(`[Demurrage Warning] Container ${c.container_number} (Job #${c.job_id}) has ${daysRemaining} free days remaining!`);

            // Proactive WhatsApp Demurrage Alert to Customer
            try {
              const job = await this.db
                .selectFrom('maritime_jobs')
                .select(['job_number', 'customer_name', 'customer_id', 'pod_name'])
                .where('id', '=', c.job_id as any)
                .executeTakeFirst();

              if (job && job.customer_id) {
                const customer = await this.db
                  .selectFrom('customers')
                  .select(['phone'])
                  .where('id', '=', job.customer_id as any)
                  .executeTakeFirst();

                if (customer?.phone) {
                  const alertText =
                    `⚠️ تنبيه هام بخصوص شحنتكم [${job.job_number}]:\n` +
                    `الحاوية رقم (${c.container_number}) بميناء ${job.pod_name || ''} متبقي عليها [${daysRemaining}] أيام فقط قبل انتهاء مهلة السماح (تاريخ الإعادة: ${c.return_deadline}).\n` +
                    `يرجى سرعة التفريغ وإعادة الحاوية الفارغة لتجنب احتساب غرامات الأرضيات والتأخير.\n\n` +
                    `إدارة العمليات واللوجستيات — Z-Systems`;

                  await this.whatsAppGatewayService.sendRawMessage(c.tenant_id, customer.phone, alertText);
                }
              }
            } catch (err: any) {
              this.logger.debug(`Could not send proactive demurrage WhatsApp: ${err?.message}`);
            }
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed runPeriodicDemurrageScan: ${err?.message}`);
    } finally {
      this.isDemurrageRunning = false;
    }
  }
}
