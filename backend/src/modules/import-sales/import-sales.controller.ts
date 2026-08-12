import { Controller, Post, Body, Param, Get, Patch, Req, UseGuards, Query, Delete } from '@nestjs/common';
import { ImportSalesService } from './import-sales.service';
import { CreateShipmentDto, UpdateShipmentCostsDto, AddShipmentItemDto, RecordForeignTransferDto } from './dto/import-sales.dto';
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

  @Post('partners')
  async createPartner(
    @Req() req: RequestWithAuth,
    @Body() dto: { name: string; percentage: number; capitalAmount?: number }
  ) {
    return this.importSalesService.createPartner(req.authContext!.tenantId!, dto.name, dto.percentage, dto.capitalAmount);
  }

  @Patch('partners/:id')
  async updatePartner(
    @Req() req: RequestWithAuth,
    @Param('id') id: string,
    @Body() dto: { name?: string; percentage?: number; capitalAmount?: number }
  ) {
    return this.importSalesService.updatePartner(req.authContext!.tenantId!, id, dto.name, dto.percentage, dto.capitalAmount);
  }

  @Delete('partners/:id')
  async deletePartner(
    @Req() req: RequestWithAuth,
    @Param('id') id: string
  ) {
    return this.importSalesService.deletePartner(req.authContext!.tenantId!, id);
  }

  @Post('partners/:id/payout')
  async recordPartnerPayout(
    @Req() req: RequestWithAuth,
    @Param('id') id: string,
    @Body() dto: { amount: number }
  ) {
    return this.importSalesService.recordPartnerPayout(
      req.authContext!.tenantId!,
      req.authContext!.userId!,
      id,
      dto.amount
    );
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
    @Req() req: RequestWithAuth,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    if (!startDate || !endDate) {
      const end = new Date();
      const start = new Date(); start.setDate(1);
      return this.importSalesService.generatePeriodProfitReport(req.authContext!.tenantId!, start, end);
    }
    return this.importSalesService.generatePeriodProfitReport(req.authContext!.tenantId!, startDate, endDate);
  }

  @Get('foreign-transfers')
  async listForeignTransfers(@Req() req: RequestWithAuth) {
    return this.importSalesService.listForeignTransfers(req.authContext!.tenantId!);
  }

  @Post('foreign-transfer')
  async recordForeignTransfer(
    @Req() req: RequestWithAuth,
    @Body() dto: RecordForeignTransferDto
  ) {
    return this.importSalesService.recordForeignTransfer(
      req.authContext!.tenantId!,
      req.authContext!.userId,
      dto
    );
  }
}
