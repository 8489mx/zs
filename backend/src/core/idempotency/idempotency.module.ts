import { Global, Module } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';
import { IdempotencyController } from './idempotency.controller';
import { DatabaseModule } from '../../database/database.module';

@Global()
@Module({
  imports: [DatabaseModule],
  controllers: [IdempotencyController],
  providers: [IdempotencyService],
  exports: [IdempotencyService],
})
export class IdempotencyModule {}
