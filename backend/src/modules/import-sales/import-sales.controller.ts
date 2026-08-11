import { Controller, Post, Body, Param, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ImportSalesService } from './import-sales.service';
import { CreateShipmentDto, UpdateShipmentCostsDto, AddShipmentItemDto } from './dto/import-sales.dto';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';

@Controller('api/import-sales')
@UseGuards(SessionAuthGuard)
export class ImportSalesController {
  constructor(private readonly importSalesService: ImportSalesService) {}

  @Get('partners')
  async getPartners(@Req() req: RequestWithAuth) {
    return this.importSalesService.getPartners(req.authContext!.tenantId!);
  }

  // --- Shipments Endpoints ---

  @Get('shipments')
  async listShipments(@Req() req: RequestWithAuth) {
    return this.importSalesService.listShipments(req.authContext!.tenantId!);
  }

  @Post('shipments')
  async createShipment(
    @Req() req: RequestWithAuth,
    @Body() dto: CreateShipmentDto
  ) {
    return this.importSalesService.createShipment(req.authContext!.tenantId!, dto);
  }

  @Get('shipments/:id')
  async getShipmentById(
    @Req() req: RequestWithAuth,
    @Param('id') shipmentId: string
  ) {
    return this.importSalesService.getShipmentById(req.authContext!.tenantId!, shipmentId);
  }

  @Patch('shipments/:id/costs')
  async updateShipmentCosts(
    @Req() req: RequestWithAuth,
    @Param('id') shipmentId: string,
    @Body() dto: UpdateShipmentCostsDto
  ) {
    return this.importSalesService.updateShipmentCosts(req.authContext!.tenantId!, shipmentId, dto);
  }

  @Post('shipments/:id/items')
  async addShipmentItem(
    @Req() req: RequestWithAuth,
    @Param('id') shipmentId: string,
    @Body() dto: AddShipmentItemDto
  ) {
    return this.importSalesService.addShipmentItem(req.authContext!.tenantId!, shipmentId, dto);
  }

  @Post('calculate-landed-cost/:shipmentId')
  async calculateLandedCost(
    @Req() req: RequestWithAuth,
    @Param('shipmentId') shipmentId: string
  ) {
    return this.importSalesService.calculateLandedCost(req.authContext!.tenantId!, shipmentId);
  }

  @Get('profit-report')
  async generateProfitReport(
    @Req() req: RequestWithAuth
  ) {
    const start = new Date(); start.setDate(1);
    const end = new Date();
    return this.importSalesService.generatePeriodProfitReport(req.authContext!.tenantId!, start, end);
  }
}
