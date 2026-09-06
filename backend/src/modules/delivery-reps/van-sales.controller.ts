import { Body, Controller, Get, Headers, Post, Query, Req, UseGuards } from '@nestjs/common';
import { VanSalesService } from './van-sales.service';
import { DeliveryRepsService } from './delivery-reps.service';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { PermissionsGuard } from '../../core/auth/guards/permissions.guard';
import { requireTenantScope } from '../../core/auth/utils/tenant-boundary';

@Controller('api/driver-portal/van-sales')
export class VanSalesController {
  constructor(
    private readonly vanSalesService: VanSalesService,
    private readonly deliveryRepsService: DeliveryRepsService,
  ) {}

  @Get('active-trip')
  async getActiveTrip(@Headers('authorization') authHeader: string) {
    const driver = this.deliveryRepsService.verifyDriverToken(authHeader);
    return this.vanSalesService.getActiveTrip(driver.repId, driver.tenantId, driver.accountId);
  }

  @Post('trips/open')
  async openTrip(
    @Headers('authorization') authHeader: string,
    @Body() body: { sourceWarehouseId: number; items: { productId: number; qty: number }[]; notes?: string },
  ) {
    const driver = this.deliveryRepsService.verifyDriverToken(authHeader);
    return this.vanSalesService.openTripAndLoad(driver.repId, driver.tenantId, driver.accountId, body);
  }

  @Post('sales')
  async executeSale(
    @Headers('authorization') authHeader: string,
    @Body()
    body: {
      tripId: number;
      customerId?: number;
      customerName?: string;
      customerPhone?: string;
      paymentMethod: 'cash' | 'credit';
      items: { productId: number; qty: number; unitPrice?: number }[];
      notes?: string;
    },
  ) {
    const driver = this.deliveryRepsService.verifyDriverToken(authHeader);
    return this.vanSalesService.executeFieldSale(driver.repId, driver.tenantId, driver.accountId, body);
  }

  @Post('collections')
  async recordCollection(
    @Headers('authorization') authHeader: string,
    @Body() body: { tripId: number; customerId: number; amount: number; notes?: string },
  ) {
    const driver = this.deliveryRepsService.verifyDriverToken(authHeader);
    return this.vanSalesService.recordFieldCollection(driver.repId, driver.tenantId, driver.accountId, body);
  }

  @Post('returns')
  async recordReturn(
    @Headers('authorization') authHeader: string,
    @Body()
    body: {
      tripId: number;
      customerId: number;
      items: { productId: number; qty: number; unitPrice: number }[];
      notes?: string;
    },
  ) {
    const driver = this.deliveryRepsService.verifyDriverToken(authHeader);
    return this.vanSalesService.recordFieldReturn(driver.repId, driver.tenantId, driver.accountId, body);
  }

  @Post('trips/settle')
  async settleTrip(
    @Headers('authorization') authHeader: string,
    @Body() body: { tripId: number; countedCash: number; unloadRemainingToWarehouse: boolean; notes?: string },
  ) {
    const driver = this.deliveryRepsService.verifyDriverToken(authHeader);
    return this.vanSalesService.settleTrip(driver.repId, driver.tenantId, driver.accountId, body);
  }
}

@Controller('api/van-sales/admin')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class VanSalesAdminController {
  constructor(private readonly vanSalesService: VanSalesService) {}

  @Get('trips')
  async listTrips(
    @Req() req: RequestWithAuth,
    @Query('repId') repId?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const { tenantId } = requireTenantScope(req.authContext!);
    const trips = await this.vanSalesService.listTripsForAdmin(tenantId, {
      repId: repId ? Number(repId) : undefined,
      status,
      dateFrom,
      dateTo,
    });
    return { ok: true, trips };
  }
}
