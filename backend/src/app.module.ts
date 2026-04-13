import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { ConfigAccessModule } from './config/config-access.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './core/health/health.module';
import { LoggingModule } from './core/logging/logging.module';
import { AuthFoundationModule } from './core/auth/auth.module';
import { AuditModule } from './core/audit/audit.module';
import { UsersModule } from './modules/users/users.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { PartnersModule } from './modules/partners/partners.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SalesModule } from './modules/sales/sales.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { ReportsModule } from './modules/reports/reports.module';
import { CashDrawerModule } from './modules/cash-drawer/cash-drawer.module';
import { ReturnsModule } from './modules/returns/returns.module';
import { TreasuryModule } from './modules/treasury/treasury.module';
import { ServicesModule } from './modules/services/services.module';
import { ActivationModule } from './modules/activation/activation.module';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { LoginRateLimitMiddleware } from './common/middleware/login-rate-limit.middleware';
import { AuthBurstRateLimitMiddleware } from './common/middleware/auth-burst-rate-limit.middleware';
import { InMemoryRateLimitService } from './common/security/in-memory-rate-limit.service';

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
    TreasuryModule,
    ServicesModule,
    ActivationModule,
  ],
  providers: [InMemoryRateLimitService, LoginRateLimitMiddleware, AuthBurstRateLimitMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(SecurityHeadersMiddleware).forRoutes('*');

    consumer
      .apply(LoginRateLimitMiddleware)
      .forRoutes({ path: 'api/auth/login', method: RequestMethod.POST });

    consumer
      .apply(AuthBurstRateLimitMiddleware)
      .forRoutes(
        { path: 'api/auth/logout', method: RequestMethod.POST },
        { path: 'api/auth/change-password', method: RequestMethod.POST },
        { path: 'api/auth/sessions/revoke-others', method: RequestMethod.POST },
        { path: 'api/auth/sessions/:id', method: RequestMethod.DELETE },
      );
  }
}
