import { Module } from '@nestjs/common';
import { EtaAuthService } from './services/eta-auth/eta-auth.service';
import { EtaSerializerService } from './services/eta-serializer/eta-serializer.service';
import { EtaSubmissionService } from './services/eta-submission/eta-submission.service';
import { TaxSettingsService } from './services/tax-settings/tax-settings.service';
import { TaxSettingsController } from './controllers/tax-settings/tax-settings.controller';
import { EtaInvoicesController } from './controllers/eta-invoices/eta-invoices.controller';

@Module({
  providers: [EtaAuthService, EtaSerializerService, EtaSubmissionService, TaxSettingsService],
  controllers: [TaxSettingsController, EtaInvoicesController]
})
export class TaxIntegrationModule {}
