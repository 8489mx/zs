import { Body, Controller, Delete, Get, Headers, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
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
    @Body() body: { sourceWarehouseId?: number; items?: { productId: number; qty: number }[]; notes?: string },
  ) {
    const driver = await this.deliveryRepsService.verifyDriverToken(authHeader);
    return this.vanSalesService.openTripAndLoad(driver.repId, driver.tenantId, driver.accountId, body);
  }

  @Post('trips/settle')
  async settleTrip(
    @Headers('authorization') authHeader: string,
    @Body()
    body: {
      tripId: number;
      countedCash: number;
      endOdometer?: number;
      unloadRemainingToWarehouse: boolean;
      notes?: string;
    },
  ) {
    const driver = await this.deliveryRepsService.verifyDriverToken(authHeader);
    return this.vanSalesService.submitTripSettlement(driver.repId, driver.tenantId, driver.accountId, body);
  }

  @Post('trips/submit-settlement')
  async submitTripSettlement(
    @Headers('authorization') authHeader: string,
    @Body()
    body: {
      tripId: number;
      countedCash: number;
      endOdometer?: number;
      unloadRemainingToWarehouse: boolean;
      notes?: string;
    },
  ) {
    const driver = await this.deliveryRepsService.verifyDriverToken(authHeader);
    return this.vanSalesService.submitTripSettlement(driver.repId, driver.tenantId, driver.accountId, body);
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
      paymentMethod: 'cash' | 'credit' | 'card' | 'split';
      paidAmount?: number;
      items: { productId: number; qty: number; unitPrice?: number }[];
      notes?: string;
      deliveryGpsLat?: number;
      deliveryGpsLng?: number;
      deliveryProofPhoto?: string;
      packagingBreakdown?: { cartonsCount?: number; piecesCount?: number; itemsCount?: number };
      clientTxId?: string;
    },
  ) {
    const driver = await this.deliveryRepsService.verifyDriverToken(authHeader);
    return this.vanSalesService.executeFieldSale(driver.repId, driver.tenantId, driver.accountId, body);
  }

  @Get('sales')
  async listDriverSales(
    @Headers('authorization') authHeader: string,
    @Query('dateScope') dateScope?: 'today' | 'yesterday' | 'week' | 'all',
    @Query('customerId') customerId?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('search') search?: string,
    @Query('tripId') tripId?: string,
  ) {
    const driver = await this.deliveryRepsService.verifyDriverToken(authHeader);
    const sales = await this.vanSalesService.listDriverSales(driver.tenantId, driver.repId, {
      dateScope: dateScope || 'all',
      customerId: customerId ? Number(customerId) : undefined,
      paymentMethod,
      search,
      tripId: tripId ? Number(tripId) : undefined,
    });
    return { ok: true, sales };
  }

  @Post('collections')
  async recordCollection(
    @Headers('authorization') authHeader: string,
    @Body() body: { tripId: number; customerId: number; amount: number; notes?: string; gpsLat?: number; gpsLng?: number; clientTxId?: string },
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
      refundMethod?: 'credit' | 'cash';
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
    @Body() body: {
      sourceWarehouseId?: number;
      items: { productId: number; qty: number; sourceWarehouseId?: number; sourceWarehouseName?: string }[];
      notes?: string;
    },
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

  @Get('warehouses')
  async getDriverWarehouses(@Headers('authorization') authHeader: string) {
    const driver = await this.deliveryRepsService.verifyDriverToken(authHeader);
    const warehouses = await this.vanSalesService.getDriverWarehouses(driver.tenantId);
    return { ok: true, warehouses };
  }

  @Get('available-products')
  async getDriverAvailableProducts(
    @Headers('authorization') authHeader: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    const driver = await this.deliveryRepsService.verifyDriverToken(authHeader);
    const parsedWhId = warehouseId && warehouseId !== 'all' ? Number(warehouseId) : undefined;
    const products = await this.vanSalesService.getDriverAvailableProducts(driver.tenantId, parsedWhId);
    return { ok: true, products };
  }

  @Get('my-target')
  async getMyTarget(
    @Headers('authorization') authHeader: string,
    @Query('month') month?: string,
  ) {
    const driver = await this.deliveryRepsService.verifyDriverToken(authHeader);
    return this.vanSalesService.getRepTarget(driver.tenantId, driver.repId, month);
  }

  @Get('itinerary')
  async getMyItinerary(@Headers('authorization') authHeader: string) {
    const driver = await this.deliveryRepsService.verifyDriverToken(authHeader);
    const itinerary = await this.vanSalesService.getDriverTodayItinerary(driver.tenantId, driver.repId);
    return { ok: true, itinerary };
  }

  @Post('field-visits')
  async recordFieldVisit(
    @Headers('authorization') authHeader: string,
    @Body()
    body: {
      tripId: number;
      customerId: number;
      visitType: 'positive' | 'negative';
      saleId?: number;
      negativeReason?: 'no_cash' | 'shop_closed' | 'sufficient_stock' | 'item_unavailable' | 'postponed' | 'other';
      postponedToDate?: string;
      gpsLat?: number;
      gpsLng?: number;
      notes?: string;
    },
  ) {
    const driver = await this.deliveryRepsService.verifyDriverToken(authHeader);
    return this.vanSalesService.recordFieldVisit(driver.tenantId, driver.accountId, driver.repId, body);
  }

  @Post('fuel-logs')
  async recordFuelLog(
    @Headers('authorization') authHeader: string,
    @Body()
    body: {
      vehicleId: number;
      tripId?: number;
      odometer: number;
      liters: number;
      pricePerLiter: number;
      stationName?: string;
      notes?: string;
    },
  ) {
    const driver = await this.deliveryRepsService.verifyDriverToken(authHeader);
    return this.vanSalesService.recordFuelLog(driver.tenantId, driver.accountId, driver.repId, body);
  }

  @Get('fuel-logs')
  async listMyFuelLogs(@Headers('authorization') authHeader: string) {
    const driver = await this.deliveryRepsService.verifyDriverToken(authHeader);
    const logs = await this.vanSalesService.listFuelLogs(driver.tenantId, { repId: driver.repId });
    return { ok: true, logs };
  }

  @Post('oil-changes')
  async recordOilChange(
    @Headers('authorization') authHeader: string,
    @Body()
    body: {
      vehicleId: number;
      odometerAtChange: number;
      oilType: string;
      ratedKm: number;
      withFilter: boolean;
      alertKmBefore?: number;
      cost?: number;
      performedBy?: string;
      notes?: string;
    },
  ) {
    const driver = await this.deliveryRepsService.verifyDriverToken(authHeader);
    return this.vanSalesService.recordOilChange(driver.tenantId, driver.accountId, driver.repId, body);
  }

  @Get('maintenance-alerts')
  async getMyMaintenanceAlerts(@Headers('authorization') authHeader: string) {
    const driver = await this.deliveryRepsService.verifyDriverToken(authHeader);
    return this.vanSalesService.getFleetMaintenanceAlerts(driver.tenantId);
  }

  @Post('transfers')
  async createTransfer(
    @Headers('authorization') authHeader: string,
    @Body()
    body: {
      toRepId: number;
      fromTripId?: number;
      toTripId?: number;
      items: { productId: number; qty: number }[];
      notes?: string;
    },
  ) {
    const driver = await this.deliveryRepsService.verifyDriverToken(authHeader);
    return this.vanSalesService.createInterVanTransfer(driver.tenantId, driver.accountId, driver.repId, body);
  }

  @Get('transfers')
  async listMyTransfers(@Headers('authorization') authHeader: string) {
    const driver = await this.deliveryRepsService.verifyDriverToken(authHeader);
    const transfers = await this.vanSalesService.listInterVanTransfers(driver.tenantId, { repId: driver.repId });
    return { ok: true, transfers };
  }

  @Post('transfers/:id/accept')
  async acceptTransfer(
    @Headers('authorization') authHeader: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const driver = await this.deliveryRepsService.verifyDriverToken(authHeader);
    return this.vanSalesService.acceptInterVanTransfer(driver.tenantId, driver.accountId, driver.repId, id);
  }

  @Post('transfers/:id/reject')
  async rejectTransfer(
    @Headers('authorization') authHeader: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string },
  ) {
    const driver = await this.deliveryRepsService.verifyDriverToken(authHeader);
    return this.vanSalesService.rejectInterVanTransfer(driver.tenantId, driver.repId, id, body?.reason);
  }

  @Get('peer-reps')
  async getPeerReps(@Headers('authorization') authHeader: string) {
    const driver = await this.deliveryRepsService.verifyDriverToken(authHeader);
    const reps = await this.vanSalesService.getPeerReps(driver.tenantId, driver.repId);
    return { ok: true, reps };
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
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
  ) {
    const { tenantId } = requireTenantScope(req.authContext!);
    const details = await this.vanSalesService.getTripDetailsForAdmin(tenantId, id, { page: Number(page), pageSize: Number(pageSize) });
    return { ok: true, ...details };
  }

  @Post('trips/:id/settle')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory', 'accounting')
  async settleTripAdmin(
    @Req() req: RequestWithAuth,
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      repId: number;
      countedCash: number;
      unloadRemainingToWarehouse: boolean;
      countedStock?: { productId: number; countedQty: number }[];
      nightStockApproved?: boolean;
      nightStockNotes?: string;
      endOdometer?: number;
      chargeStockVarianceToRep?: boolean;
      notes?: string;
    },
  ) {
    const { tenantId, accountId } = requireTenantScope(req.authContext!);
    return this.vanSalesService.settleTrip(
      body.repId,
      tenantId,
      accountId,
      {
        tripId: id,
        countedCash: body.countedCash,
        unloadRemainingToWarehouse: body.unloadRemainingToWarehouse,
        countedStock: body.countedStock,
        nightStockApproved: body.nightStockApproved,
        nightStockNotes: body.nightStockNotes,
        endOdometer: body.endOdometer,
        chargeStockVarianceToRep: body.chargeStockVarianceToRep,
        notes: body.notes,
      },
      req.authContext,
    );
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

  @Get('available-products')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async getAdminAvailableProducts(
    @Req() req: RequestWithAuth,
    @Query('warehouseId') warehouseId?: string,
  ) {
    const { tenantId } = requireTenantScope(req.authContext!);
    const parsedWhId = warehouseId && warehouseId !== 'all' ? Number(warehouseId) : undefined;
    const products = await this.vanSalesService.getDriverAvailableProducts(tenantId, parsedWhId);
    return { ok: true, products };
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

  @Get('warehouses')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async listAdminWarehouses(@Req() req: RequestWithAuth) {
    const { tenantId } = requireTenantScope(req.authContext!);
    const warehouses = await this.vanSalesService.getDriverWarehouses(tenantId);
    return { ok: true, warehouses };
  }

  @Post('requisitions')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async createAdminRequisition(
    @Req() req: RequestWithAuth,
    @Body()
    body: {
      repId: number;
      sourceWarehouseId?: number;
      items: { productId: number; qty: number; sourceWarehouseId?: number; sourceWarehouseName?: string }[];
      notes?: string;
      dispatchImmediately?: boolean;
    },
  ) {
    const { tenantId, accountId } = requireTenantScope(req.authContext!);
    const userId = req.authContext!.userId;
    const res = await this.vanSalesService.createLoadRequisitionByAdmin(tenantId, accountId, userId, body);
    return res;
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

  @Delete('requisitions/:id')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async deleteRequisition(
    @Req() req: RequestWithAuth,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const { tenantId } = requireTenantScope(req.authContext!);
    const res = await this.vanSalesService.deleteLoadRequisition(tenantId, id);
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
    @Body() body: { repId: number; month: string; targetAmount: number; collectionTarget?: number | null; visitsTarget?: number | null },
  ) {
    const { tenantId, accountId } = requireTenantScope(req.authContext!);
    const res = await this.vanSalesService.setRepTarget(
      tenantId,
      accountId,
      Number(body.repId),
      body.month,
      Number(body.targetAmount),
      body.collectionTarget !== undefined && body.collectionTarget !== null ? Number(body.collectionTarget) : undefined,
      body.visitsTarget !== undefined && body.visitsTarget !== null ? Number(body.visitsTarget) : undefined,
    );
    return res;
  }

  // Route KPIs & Field Visits Endpoints
  @Get('kpis')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async getRouteKpis(
    @Req() req: RequestWithAuth,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const { tenantId } = requireTenantScope(req.authContext!);
    const kpis = await this.vanSalesService.getSupervisorRouteKpis(tenantId, dateFrom, dateTo);
    return { ok: true, ...kpis };
  }

  @Get('field-visits')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async listFieldVisits(
    @Req() req: RequestWithAuth,
    @Query('repId') repId?: string,
    @Query('customerId') customerId?: string,
    @Query('visitType') visitType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const { tenantId } = requireTenantScope(req.authContext!);
    const visits = await this.vanSalesService.listFieldVisits(tenantId, {
      repId: repId ? Number(repId) : undefined,
      customerId: customerId ? Number(customerId) : undefined,
      visitType,
      dateFrom,
      dateTo,
    });
    return { ok: true, visits };
  }

  @Post('customers/:id/route-schedule')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async setCustomerRouteSchedule(
    @Req() req: RequestWithAuth,
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      route?: string;
      routeSequence?: number;
      visitDays?: string[];
      customerCode?: string;
      locationUrl?: string;
      assignedRepId?: number | null;
      assignedRepName?: string;
    },
  ) {
    const { tenantId } = requireTenantScope(req.authContext!);
    const res = await this.vanSalesService.setCustomerRouteSchedule(tenantId, id, body);
    return res;
  }

  @Get('supervisor/customer-routes')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async getSupervisorCustomerRoutes(
    @Req() req: RequestWithAuth,
    @Query('search') search?: string,
    @Query('repId') repId?: string,
    @Query('route') route?: string,
    @Query('unassignedOnly') unassignedOnly?: string,
  ) {
    const { tenantId } = requireTenantScope(req.authContext!);
    const customers = await this.vanSalesService.getSupervisorCustomerRoutes(tenantId, {
      search,
      repId,
      route,
      unassignedOnly: unassignedOnly === 'true',
    });
    return { ok: true, customers };
  }

  @Post('supervisor/customer-routes/bulk-assign')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async bulkAssignCustomerRoutes(
    @Req() req: RequestWithAuth,
    @Body()
    body: {
      customerIds: number[];
      assignedRepId?: number | null;
      assignedRepName?: string;
      route?: string;
      visitDays?: string[];
    },
  ) {
    const { tenantId } = requireTenantScope(req.authContext!);
    const res = await this.vanSalesService.bulkAssignCustomerRoutes(tenantId, body);
    return res;
  }


  // Fleet Fuel Logs Endpoints
  @Get('fuel-logs')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async listFuelLogs(
    @Req() req: RequestWithAuth,
    @Query('vehicleId') vehicleId?: string,
    @Query('repId') repId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const { tenantId } = requireTenantScope(req.authContext!);
    const logs = await this.vanSalesService.listFuelLogs(tenantId, {
      vehicleId: vehicleId ? Number(vehicleId) : undefined,
      repId: repId ? Number(repId) : undefined,
      dateFrom,
      dateTo,
    });
    return { ok: true, logs };
  }

  @Post('fuel-logs')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async recordFuelLog(
    @Req() req: RequestWithAuth,
    @Body()
    body: {
      vehicleId: number;
      tripId?: number;
      repId?: number;
      odometer: number;
      liters: number;
      pricePerLiter: number;
      stationName?: string;
      notes?: string;
    },
  ) {
    const { tenantId, accountId } = requireTenantScope(req.authContext!);
    const res = await this.vanSalesService.recordFuelLog(tenantId, accountId, body.repId || null, body);
    return res;
  }

  // Fleet Oil Changes Endpoints
  @Get('oil-changes')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async listOilChanges(
    @Req() req: RequestWithAuth,
    @Query('vehicleId') vehicleId?: string,
  ) {
    const { tenantId } = requireTenantScope(req.authContext!);
    const changes = await this.vanSalesService.listOilChanges(tenantId, vehicleId ? Number(vehicleId) : undefined);
    return { ok: true, changes };
  }

  @Post('oil-changes')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async recordOilChange(
    @Req() req: RequestWithAuth,
    @Body()
    body: {
      vehicleId: number;
      odometerAtChange: number;
      oilType: string;
      ratedKm: number;
      withFilter: boolean;
      alertKmBefore?: number;
      cost?: number;
      performedBy?: string;
      notes?: string;
      repId?: number;
    },
  ) {
    const { tenantId, accountId } = requireTenantScope(req.authContext!);
    const res = await this.vanSalesService.recordOilChange(tenantId, accountId, body.repId || null, body);
    return res;
  }

  @Get('maintenance-alerts')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async getMaintenanceAlerts(@Req() req: RequestWithAuth) {
    const { tenantId } = requireTenantScope(req.authContext!);
    return this.vanSalesService.getFleetMaintenanceAlerts(tenantId);
  }

  // Multi-Driver Vehicle Shifts Endpoints
  @Get('vehicles/:id/drivers')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async listVehicleDrivers(
    @Req() req: RequestWithAuth,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const { tenantId } = requireTenantScope(req.authContext!);
    const drivers = await this.vanSalesService.listVehicleDrivers(tenantId, id);
    return { ok: true, drivers };
  }

  @Post('vehicles/:id/drivers')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async assignVehicleDriver(
    @Req() req: RequestWithAuth,
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      repId: number;
      shiftName: string;
      shiftStartTime?: string;
      shiftEndTime?: string;
      notes?: string;
    },
  ) {
    const { tenantId, accountId } = requireTenantScope(req.authContext!);
    const res = await this.vanSalesService.assignVehicleDriver(tenantId, accountId, { vehicleId: id, ...body });
    return res;
  }

  @Delete('vehicles/:id/drivers/:driverId')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async removeVehicleDriver(
    @Req() req: RequestWithAuth,
    @Param('driverId', ParseIntPipe) driverId: number,
  ) {
    const { tenantId } = requireTenantScope(req.authContext!);
    const res = await this.vanSalesService.removeVehicleDriver(tenantId, driverId);
    return res;
  }

  // Inter-Van Transfers Audit Endpoints
  @Get('transfers')
  @RequireAnyPermission('deliveryReps', 'sales', 'inventory')
  async listAdminTransfers(
    @Req() req: RequestWithAuth,
    @Query('repId') repId?: string,
    @Query('status') status?: string,
  ) {
    const { tenantId } = requireTenantScope(req.authContext!);
    const transfers = await this.vanSalesService.listInterVanTransfers(tenantId, {
      repId: repId ? Number(repId) : undefined,
      status,
    });
    return { ok: true, transfers };
  }
}
