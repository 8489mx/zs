import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { StorefrontService } from '../storefront.service';

/**
 * Periodically sweeps and reaps expired online order reservations across all tenants.
 * Prevents Denial-of-Inventory (DOI) attacks where unpaid/abandoned checkout sessions
 * permanently hold stock in `product_location_stock` and block cashier POS sales.
 */
@Injectable()
export class StorefrontReservationSchedulerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(StorefrontReservationSchedulerService.name);
  private timer?: ReturnType<typeof setInterval>;
  private startup?: ReturnType<typeof setTimeout>;
  private running = false;

  constructor(private readonly storefrontService: StorefrontService) {}

  onApplicationBootstrap(): void {
    // Initial sweep 30s after startup to clean any reservations left over from server restart
    this.startup = setTimeout(() => {
      void this.sweepExpiredReservations();
    }, 30_000);

    // Periodic sweep every 2 minutes (120,000 ms)
    this.timer = setInterval(() => {
      void this.sweepExpiredReservations();
    }, 2 * 60 * 1000);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    if (this.startup) {
      clearTimeout(this.startup);
      this.startup = undefined;
    }
  }

  async sweepExpiredReservations(): Promise<void> {
    if (this.running) return;
    this.running = true;

    try {
      const result = await this.storefrontService.reapExpiredReservations({ limit: 50 });
      if (result.reapedOrdersCount > 0) {
        this.logger.log(
          `Automated reservation reaper: successfully released stock for ${result.reapedOrdersCount} expired orders (${result.reapedOrderNumbers.join(', ')})`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Automated reservation reaper encountered an error: ${(error as Error)?.message || String(error)}`,
      );
    } finally {
      this.running = false;
    }
  }
}
