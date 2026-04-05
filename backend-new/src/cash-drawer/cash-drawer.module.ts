import { Module } from '@nestjs/common';
import { AuthFoundationModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { CashDrawerController } from './cash-drawer.controller';
import { CashDrawerService } from './cash-drawer.service';

@Module({
  imports: [DatabaseModule, AuthFoundationModule],
  controllers: [CashDrawerController],
  providers: [CashDrawerService],
})
export class CashDrawerModule {}
