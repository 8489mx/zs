import { Module } from '@nestjs/common';
import { EtaAuthService } from './services/eta-auth/eta-auth.service';
import { EtaSerializerService } from './services/eta-serializer/eta-serializer.service';
import { EtaSubmissionService } from './services/eta-submission/eta-submission.service';
import { ZatcaPhase2Service } from './services/zatca/zatca-phase2.service';
import { TaxSettingsService } from './services/tax-settings/tax-settings.service';
import { TaxSettingsController } from './controllers/tax-settings/tax-settings.controller';
import { EtaInvoicesController } from './controllers/eta-invoices/eta-invoices.controller';
import { ZatcaController } from './controllers/zatca/zatca.controller';

@Module({
  providers: [
    EtaAuthService,
    EtaSerializerService,
    EtaSubmissionService,
    ZatcaPhase2Service,
    TaxSettingsService
  ],
  controllers: [
    TaxSettingsController,
    EtaInvoicesController,
    ZatcaController
  ],
  exports: [
    EtaSubmissionService,
    ZatcaPhase2Service
  ]
})
export class TaxIntegrationModule {}
