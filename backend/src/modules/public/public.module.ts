import { Module } from '@nestjs/common';
import { InMemoryRateLimitService } from '../../common/security/in-memory-rate-limit.service';
import { DatabaseModule } from '../../database/database.module';
import { SaasAdminModule } from '../saas-admin/saas-admin.module';
import { PublicController } from './public.controller';
import { PublicTrialSignupService } from './public-trial-signup.service';
import { TrialSignupMailService } from './trial-signup-mail.service';

@Module({
  imports: [DatabaseModule, SaasAdminModule],
  controllers: [PublicController],
  providers: [InMemoryRateLimitService, PublicTrialSignupService, TrialSignupMailService],
})
export class PublicModule {}
