import { Body, Controller, Get, Headers, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { DeliveryRepsService } from './delivery-reps.service';

@Controller('api/driver-portal')
export class DriverPortalController {
  constructor(private readonly service: DeliveryRepsService) {}

  @Post('login')
  login(@Body() body: { phone: string; pinCode: string; companyCode?: string; tenantId?: string }) {
    return this.service.driverLogin(body);
  }

  @Get('profile')
  async getProfile(@Headers('authorization') authHeader: string) {
    const driver = await this.service.verifyDriverToken(authHeader);
    return { ok: true, driver };
  }

  @Get('orders')
  async getOrders(
    @Headers('authorization') authHeader: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const driver = await this.service.verifyDriverToken(authHeader);
    return this.service.driverListOrders(driver.repId, driver.tenantId, { status, dateFrom, dateTo });
  }

  @Post('orders/:saleId/settle')
  async settleOrder(
    @Param('saleId', ParseIntPipe) saleId: number,
    @Headers('authorization') authHeader: string,
    @Body() body: { signatureDataUrl?: string; proofPhotoUrl?: string; gpsLat?: number; gpsLng?: number; notes?: string },
  ) {
    const driver = await this.service.verifyDriverToken(authHeader);
    return this.service.driverSettleOrder(saleId, driver.repId, driver.tenantId, body);
  }
}
