import { Global, Module } from '@nestjs/common';
import { ConfigAccessService } from './config-access.service';

@Global()
@Module({
  providers: [ConfigAccessService],
  exports: [ConfigAccessService],
})
export class ConfigAccessModule {}
