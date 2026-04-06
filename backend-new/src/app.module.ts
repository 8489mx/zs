import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { LoggingModule } from './logging/logging.module';
import { AuthFoundationModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { ConfigAccessModule } from './config/config-access.module';
import { UsersModule } from './users/users.module';
import { SettingsModule } from './settings/settings.module';
import { SessionsModule } from './sessions/sessions.module';
import { CatalogModule } from './catalog/catalog.module';
import { PartnersModule } from './partners/partners.module';
import { InventoryModule } from './inventory/inventory.module';
import { SalesModule } from './sales/sales.module';
import { PurchasesModule } from './purchases/purchases.module';
import { ReportsModule } from './reports/reports.module';
import { CashDrawerModule } from './cash-drawer/cash-drawer.module';
import { ReturnsModule } from './returns/returns.module';

@Module({
  imports: [
    AppConfigModule,
    ConfigAccessModule,
    LoggingModule,
    DatabaseModule,
    AuthFoundationModule,
    AuditModule,
    HealthModule,
    UsersModule,
    SettingsModule,
    SessionsModule,
    CatalogModule,
    PartnersModule,
    InventoryModule,
    SalesModule,
    PurchasesModule,
    ReportsModule,
    CashDrawerModule,
    ReturnsModule,
  ],
})
export class AppModule {}
