import { Body, Controller, Get, Headers, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { VanSalesService } from './van-sales.service';
import { DeliveryRepsService } from './delivery-reps.service';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { PermissionsGuard } from '../../core/auth/guards/permissions.guard';
import { RequireAnyPermission } from '../../core/auth/decorators/permissions.decorator';
import { requireTenantScope } from '../../core/auth/utils/tenant-boundary';

@Controller('api/driver-portal/van-sales')
export class VanSalesController {
  constructor(
    private readonly vanSalesService: VanSalesService,
    private readonly deliveryRepsService: DeliveryRepsService,
  ) {}

  @Get('active-trip')
  async getActiveTrip(@Headers('authorization') authHeader: string) {
    const driver = await this.deliveryRepsService.verifyDriverToken(authHeader);
    return this.vanSalesService.getActiveTrip(driver.repId, driver.tenantId, driver.accountId);
  }

  @Post('trips/open')
  async openTrip(
    @Headers('authorization') authHeader: string,
    @Body() body: { sourceWarehouseId: number; items: { productId: number; qty: number }[]; notes?: string },
  ) {
    const driver = await this.deliveryRepsService.verifyDriverToken(authHeader);
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
      deliveryGpsLat?: number;
      deliveryGpsLng?: number;
    },
  ) {
    const driver = await this.deliveryRepsService.verifyDriverToken(authHeader);
    return this.vanSalesService.executeFieldSale(driver.repId, driver.tenantId, driver.accountId, body);
  }

  @Post('collections')
  async recordCollection(
    @Headers('authorization') authHeader: string,
    @Body() body: { tripId: number; customerId: number; amount: number; notes?: string; gpsLat?: number; gpsLng?: number },
  ) {
    const driver = await this.deliveryRepsService.verifyDriverToken(authHeader);
    return this.vanSalesService.recordFieldCollection(driver.repId, driver.tenantId, driver.accountId, body);
  }

  @Get('customers/:customerId/eligible-sales')
  async getCustomerEligibleSales(
    @Headers('authorization') authHeader: string,
    @Param('customerId', ParseIntPipe) customerId: number,
  ) {
    const driver = await this.deliveryRepsService.verifyDriverToken(authHeader);
    const sales = await this.vanSalesService.getCustomerEligibleSales(driver.tenantId, customerId);
    return { ok: true, sales };
  }

  @Post('field-returns')
  async submitFieldReturn(
    @Headers('authorization') authHeader: string,
    @Body()
    body: {
      tripId: number;
      customerId: number;
      saleId?: number | null;
      returnReason: 'damaged' | 'expired' | 'manufacturing_defect' | 'stagnant' | 'order_mismatch' | 'customer_request';
      items: { productId: number; qty: number; unitPrice: number; saleItemId?: number }[];
      notes?: string;
    },
  ) {
    const driver = await this.deliveryRepsService.verifyDriverToken(authHeader);
    return this.vanSalesService.submitFieldReturn(driver.repId, driver.tenantId, driver.accountId, body);
  }

  @Post('requisitions')
  async submitLoadRequisition(
    @Headers('authorization') authHeader: string,
    @Body() body: { sourceWarehouseId: number; items: { productId: number; qty: number }[]; notes?: string },
  ) {
    const driver = await this.deliveryRepsService.verifyDriverToken(authHeader);
    return this.vanSalesService.submitLoadRequisition(driver.repId, driver.tenantId, driver.accountId, body);
  }

  @Get('requisitions')
  async listMyRequisitions(@Headers('authorization') authHeader: string) {
    const driver = await this.deliveryRepsService.verifyDriverToken(authHeader);
    const requisitions = await this.vanSalesService.listLoadRequisitions(driver.tenantId, { repId: driver.repId });
    return { ok: true, requisitions };
  }

  @Get('my-target')
  async getMyTarget(
    @Headers('authorization') authHeader: string,
    @Query('month') month?: string,
  ) {
    const driver = await this.deliveryRepsService.verifyDriverToken(authHeader);
    return this.vanSalesService.getRepTarget(driver.tenantId, driver.repId, month);
  }

  @Post('trips/settle')
  async settleTrip(
    @Headers('authorization') authHeader: string,
    @Body() body: { tripId: number; countedCash: number; unloadRemainingToWarehouse: boolean; notes?: string },
  ) {
    const driver = await this.deliveryRepsService.verifyDriverToken(authHeader);
    return this.vanSalesService.settleTrip(driver.repId, driver.tenantId, driver.accountId, body);
  }
}

@Controller('api/van-sales/admin')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class VanSalesAdminController {
  constructor(private readonly vanSalesService: VanSalesService) {}

  @Get('trips')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
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

  @Get('trips/:id')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async getTripDetails(
    @Req() req: RequestWithAuth,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const { tenantId } = requireTenantScope(req.authContext!);
    const details = await this.vanSalesService.getTripDetailsForAdmin(tenantId, id);
    return { ok: true, ...details };
  }

  @Get('vehicles')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async listVehicles(@Req() req: RequestWithAuth) {
    const { tenantId } = requireTenantScope(req.authContext!);
    const vehicles = await this.vanSalesService.listFleetVehicles(tenantId);
    return { ok: true, vehicles };
  }

  @Post('vehicles')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async createVehicle(
    @Req() req: RequestWithAuth,
    @Body()
    body: {
      plateNumber: string;
      modelName?: string;
      vehicleType?: string;
      vinChassis?: string;
      branchId?: number;
      currentOdometer?: number;
      fuelType?: string;
      licenseExpiresAt?: string;
      assignedRepId?: number;
      notes?: string;
    },
  ) {
    const { tenantId, accountId } = requireTenantScope(req.authContext!);
    const vehicles = await this.vanSalesService.createFleetVehicle(tenantId, accountId, body);
    return { ok: true, vehicles };
  }

  @Put('vehicles/:id')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async updateVehicle(
    @Req() req: RequestWithAuth,
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      plateNumber?: string;
      modelName?: string;
      vehicleType?: string;
      vinChassis?: string;
      branchId?: number;
      currentOdometer?: number;
      fuelType?: string;
      licenseExpiresAt?: string;
      status?: string;
      assignedRepId?: number | null;
      notes?: string;
    },
  ) {
    const { tenantId, accountId } = requireTenantScope(req.authContext!);
    const vehicles = await this.vanSalesService.updateFleetVehicle(tenantId, accountId, id, body);
    return { ok: true, vehicles };
  }

  @Post('vehicles/:id/assign')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async assignRep(
    @Req() req: RequestWithAuth,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { repId: number | null; shiftName?: string },
  ) {
    const { tenantId } = requireTenantScope(req.authContext!);
    const vehicles = await this.vanSalesService.assignVehicleRep(tenantId, id, body.repId, body.shiftName);
    return { ok: true, vehicles };
  }

  // Returns Management Endpoints
  @Get('returns')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async listReturns(
    @Req() req: RequestWithAuth,
    @Query('status') status?: string,
    @Query('repId') repId?: string,
    @Query('tripId') tripId?: string,
    @Query('customerId') customerId?: string,
  ) {
    const { tenantId } = requireTenantScope(req.authContext!);
    const returns = await this.vanSalesService.listFieldReturns(tenantId, {
      status,
      repId: repId ? Number(repId) : undefined,
      tripId: tripId ? Number(tripId) : undefined,
      customerId: customerId ? Number(customerId) : undefined,
    });
    return { ok: true, returns };
  }

  @Post('returns/:id/approve')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async approveReturn(
    @Req() req: RequestWithAuth,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const { tenantId, accountId } = requireTenantScope(req.authContext!);
    const userId = req.authContext!.userId;
    const res = await this.vanSalesService.approveFieldReturn(tenantId, accountId, id, userId);
    return res;
  }

  @Post('returns/:id/reject')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async rejectReturn(
    @Req() req: RequestWithAuth,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string },
  ) {
    const { tenantId } = requireTenantScope(req.authContext!);
    const userId = req.authContext!.userId;
    const res = await this.vanSalesService.rejectFieldReturn(tenantId, id, body.reason || '', userId);
    return res;
  }

  // Requisitions Management Endpoints
  @Get('requisitions')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async listAdminRequisitions(
    @Req() req: RequestWithAuth,
    @Query('status') status?: string,
    @Query('repId') repId?: string,
  ) {
    const { tenantId } = requireTenantScope(req.authContext!);
    const requisitions = await this.vanSalesService.listLoadRequisitions(tenantId, {
      status,
      repId: repId ? Number(repId) : undefined,
    });
    return { ok: true, requisitions };
  }

  @Put('requisitions/:id/review')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async reviewRequisition(
    @Req() req: RequestWithAuth,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { approvedItems: { productId: number; qty: number }[]; notes?: string },
  ) {
    const { tenantId } = requireTenantScope(req.authContext!);
    const res = await this.vanSalesService.reviewLoadRequisition(tenantId, id, body.approvedItems, body.notes);
    return res;
  }

  @Post('requisitions/:id/dispatch')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async dispatchRequisition(
    @Req() req: RequestWithAuth,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const { tenantId, accountId } = requireTenantScope(req.authContext!);
    const userId = req.authContext!.userId;
    const res = await this.vanSalesService.approveAndDispatchRequisition(tenantId, accountId, id, userId);
    return res;
  }

  @Post('requisitions/:id/reject')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async rejectRequisition(
    @Req() req: RequestWithAuth,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string },
  ) {
    const { tenantId } = requireTenantScope(req.authContext!);
    const userId = req.authContext!.userId;
    const res = await this.vanSalesService.rejectLoadRequisition(tenantId, id, body.reason || '', userId);
    return res;
  }

  // Targets Management Endpoints
  @Get('targets')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async listRepTargets(
    @Req() req: RequestWithAuth,
    @Query('month') month?: string,
  ) {
    const { tenantId } = requireTenantScope(req.authContext!);
    const targets = await this.vanSalesService.listAllRepTargets(tenantId, month);
    return { ok: true, targets };
  }

  @Post('targets')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async setRepTarget(
    @Req() req: RequestWithAuth,
    @Body() body: { repId: number; month: string; targetAmount: number },
  ) {
    const { tenantId, accountId } = requireTenantScope(req.authContext!);
    const res = await this.vanSalesService.setRepTarget(tenantId, accountId, Number(body.repId), body.month, Number(body.targetAmount));
    return { ok: true, ...res };
  }
}
