import { Controller, Post, Body, Param, UseGuards, Get } from '@nestjs/common';
import { ImportSalesService } from './import-sales.service';

@Controller('import-sales')
export class ImportSalesController {
  constructor(private readonly importSalesService: ImportSalesService) {}

  @Get(':tenantId/partners')
  async getPartners(@Param('tenantId') tenantId: string) {
    return this.importSalesService.getPartners(tenantId);
  }

  @Post(':tenantId/calculate-landed-cost/:shipmentId')
  async calculateLandedCost(
    @Param('tenantId') tenantId: string,
    @Param('shipmentId') shipmentId: string
  ) {
    return this.importSalesService.calculateLandedCost(tenantId, shipmentId);
  }

  @Get(':tenantId/profit-report')
  async generateProfitReport(
    @Param('tenantId') tenantId: string
  ) {
    const start = new Date(); start.setDate(1);
    const end = new Date();
    return this.importSalesService.generatePeriodProfitReport(tenantId, start, end);
  }
}
