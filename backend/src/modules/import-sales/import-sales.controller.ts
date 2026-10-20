import { Controller, Post, Body, Param, Get, Patch, Req, UseGuards, Query, Delete } from '@nestjs/common';
import { ImportSalesService } from './import-sales.service';
import {
  CreateShipmentDto,
  UpdateShipmentCostsDto,
  AddShipmentItemDto,
  RecordForeignTransferDto,
  UpdateShipmentItemDto,
  CreateImportProjectDto,
  UpdateImportProjectDto,
  CalculateFeasibilityDto,
  UpsertSupplierMetaDto,
  CreateQcInspectionDto,
  UpsertAciComplianceDto,
  CreateSourcingTripDto,
  ProcessLateExpenseDto,
  CalculateCustomsTaxDto,
  VerifyBankDetailsDto,
} from './dto/import-sales.dto';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { PermissionsGuard } from '../../core/auth/guards/permissions.guard';
import { RequireAnyPermission } from '../../core/auth/decorators/permissions.decorator';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';

@Controller('api/import-sales')
@UseGuards(SessionAuthGuard, PermissionsGuard)
@RequireAnyPermission('purchases', 'inventory', 'accounting')
export class ImportSalesController {
  constructor(private readonly importSalesService: ImportSalesService) {}

  // ==========================================
  // COMMAND CENTER DASHBOARD
  // ==========================================

  @RequireAnyPermission('purchases', 'inventory', 'accounting', 'reports')
  @Get('command-center')
  async getCommandCenterMetrics(@Req() req: RequestWithAuth) {
    return this.importSalesService.getImportCommandCenterMetrics(req.authContext!.tenantId!);
  }

  // ==========================================
  // IMPORT PROJECTS & FEASIBILITY
  // ==========================================

  @Get('projects')
  async listProjects(@Req() req: RequestWithAuth, @Query('status') status?: string) {
    return this.importSalesService.listProjects(req.authContext!.tenantId!, status);
  }

  @Get('projects/:id')
  async getProjectById(@Req() req: RequestWithAuth, @Param('id') id: string) {
    return this.importSalesService.getProjectById(req.authContext!.tenantId!, id);
  }

  @RequireAnyPermission('purchases', 'accounting')
  @Post('projects')
  async createProject(@Req() req: RequestWithAuth, @Body() dto: CreateImportProjectDto) {
    return this.importSalesService.createProject(req.authContext!.tenantId!, dto);
  }

  @RequireAnyPermission('purchases', 'accounting')
  @Patch('projects/:id')
  async updateProject(
    @Req() req: RequestWithAuth,
    @Param('id') id: string,
    @Body() dto: UpdateImportProjectDto
  ) {
    return this.importSalesService.updateProject(req.authContext!.tenantId!, id, dto);
  }

  @Post('calculate-feasibility')
  async calculateFeasibility(@Body() dto: CalculateFeasibilityDto) {
    return this.importSalesService.calculateFeasibility(dto);
  }

  @RequireAnyPermission('accounting')
  @Get('projects/:id/partners')
  async getProjectPartners(@Req() req: RequestWithAuth, @Param('id') projectId: string) {
    return this.importSalesService.getProjectPartners(req.authContext!.tenantId!, projectId);
  }

  @RequireAnyPermission('accounting')
  @Post('projects/:id/partners')
  async setProjectPartners(
    @Req() req: RequestWithAuth,
    @Param('id') projectId: string,
    @Body() body: { partners: Array<{ partnerId: string; capitalShare: number; profitPercentage: number }> }
  ) {
    return this.importSalesService.setProjectPartners(req.authContext!.tenantId!, projectId, body.partners);
  }

  @RequireAnyPermission('accounting')
  @Post('projects/:id/close')
  async closeProject(@Req() req: RequestWithAuth, @Param('id') projectId: string) {
    return this.importSalesService.closeProject(req.authContext!.tenantId!, req.authContext!.userId!, projectId);
  }

  // ==========================================
  // CHINA SOURCING & QC
  // ==========================================

  @Get('china-suppliers')
  async listChinaSuppliers(@Req() req: RequestWithAuth) {
    return this.importSalesService.listChinaSuppliers(req.authContext!.tenantId!);
  }

  @RequireAnyPermission('purchases', 'accounting')
  @Post('suppliers/:supplierId/meta')
  async upsertSupplierImportMeta(
    @Req() req: RequestWithAuth,
    @Param('supplierId') supplierId: string,
    @Body() dto: UpsertSupplierMetaDto
  ) {
    return this.importSalesService.upsertSupplierImportMeta(req.authContext!.tenantId!, supplierId, dto);
  }

  @RequireAnyPermission('accounting')
  @Post('suppliers/:supplierId/verify-bank')
  async verifySupplierBankDetails(
    @Req() req: RequestWithAuth,
    @Param('supplierId') supplierId: string,
    @Body() dto: VerifyBankDetailsDto
  ) {
    return this.importSalesService.verifySupplierBankDetails(
      req.authContext!.tenantId!,
      Number(req.authContext!.userId!),
      supplierId,
      dto.verificationNotes
    );
  }

  @Get('sourcing-trips')
  async listSourcingTrips(@Req() req: RequestWithAuth, @Query('projectId') projectId?: string) {
    return this.importSalesService.listSourcingTrips(req.authContext!.tenantId!, projectId);
  }

  @RequireAnyPermission('purchases', 'accounting')
  @Post('sourcing-trips')
  async createSourcingTrip(@Req() req: RequestWithAuth, @Body() dto: CreateSourcingTripDto) {
    return this.importSalesService.createSourcingTrip(req.authContext!.tenantId!, dto);
  }

  @Get('qc-inspections')
  async listQcInspections(
    @Req() req: RequestWithAuth,
    @Query('projectId') projectId?: string,
    @Query('shipmentId') shipmentId?: string
  ) {
    return this.importSalesService.listQcInspections(req.authContext!.tenantId!, projectId, shipmentId);
  }

  @RequireAnyPermission('purchases', 'inventory', 'accounting')
  @Post('qc-inspections')
  async createQcInspection(@Req() req: RequestWithAuth, @Body() dto: CreateQcInspectionDto) {
    return this.importSalesService.createQcInspection(req.authContext!.tenantId!, dto);
  }

  @RequireAnyPermission('purchases', 'inventory', 'accounting')
  @Patch('qc-inspections/:id')
  async updateQcInspection(
    @Req() req: RequestWithAuth,
    @Param('id') id: string,
    @Body() dto: Partial<CreateQcInspectionDto>
  ) {
    return this.importSalesService.updateQcInspection(req.authContext!.tenantId!, id, dto);
  }

  // ==========================================
  // EGYPT ACI & CUSTOMS COMPLIANCE
  // ==========================================

  @Get('aci-compliance/:id')
  async getAciCompliance(@Req() req: RequestWithAuth, @Param('id') id: string) {
    return this.importSalesService.getAciCompliance(req.authContext!.tenantId!, id);
  }

  @RequireAnyPermission('purchases', 'accounting')
  @Post('aci-compliance')
  async upsertAciCompliance(@Req() req: RequestWithAuth, @Body() dto: UpsertAciComplianceDto) {
    return this.importSalesService.upsertAciCompliance(req.authContext!.tenantId!, dto);
  }

  @Get('customs-tariffs')
  async listCustomsTariffs(@Req() req: RequestWithAuth, @Query('search') search?: string) {
    return this.importSalesService.listCustomsTariffs(req.authContext!.tenantId!, search);
  }

  @Post('calculate-customs')
  async calculateCustomsTax(
    @Req() req: RequestWithAuth,
    @Body() body: CalculateCustomsTaxDto
  ) {
    return this.importSalesService.calculateCustomsTax(
      req.authContext!.tenantId!,
      body.hsCode,
      body.cifValueEgp,
      {
        overrideDutyRatePercent: body.overrideDutyRatePercent,
        overrideVatRatePercent: body.overrideVatRatePercent,
      }
    );
  }

  // ==========================================
  // PARTNERS & CAPITAL
  // ==========================================

  @RequireAnyPermission('accounting')
  @Get('partners')
  async getPartners(@Req() req: RequestWithAuth) {
    return this.importSalesService.getPartners(req.authContext!.tenantId!);
  }

  @RequireAnyPermission('accounting')
  @Post('partners')
  async createPartner(
    @Req() req: RequestWithAuth,
    @Body() dto: { name: string; percentage: number; capitalAmount?: number; accountId?: string }
  ) {
    return this.importSalesService.createPartner(
      req.authContext!.tenantId!,
      req.authContext!.userId!,
      dto.name,
      dto.percentage,
      dto.capitalAmount,
      dto.accountId
    );
  }

  @RequireAnyPermission('accounting')
  @Patch('partners/:id')
  async updatePartner(
    @Req() req: RequestWithAuth,
    @Param('id') id: string,
    @Body() dto: { name?: string; percentage?: number; capitalAmount?: number }
  ) {
    return this.importSalesService.updatePartner(
      req.authContext!.tenantId!,
      id,
      dto.name,
      dto.percentage,
      dto.capitalAmount
    );
  }

  @RequireAnyPermission('accounting')
  @Delete('partners/:id')
  async deletePartner(@Req() req: RequestWithAuth, @Param('id') id: string) {
    return this.importSalesService.deletePartner(req.authContext!.tenantId!, id);
  }

  @RequireAnyPermission('accounting')
  @Get('partners/:id/ledger')
  async getPartnerLedger(@Req() req: RequestWithAuth, @Param('id') id: string) {
    return this.importSalesService.getPartnerLedger(req.authContext!.tenantId!, id);
  }

  @RequireAnyPermission('accounting')
  @Post('partners/:id/capital-transaction')
  async recordCapitalTransaction(
    @Req() req: RequestWithAuth,
    @Param('id') id: string,
    @Body() dto: { type: 'DEPOSIT' | 'WITHDRAWAL'; amount: number; date: string; note?: string; accountId?: string }
  ) {
    return this.importSalesService.recordCapitalTransaction(
      req.authContext!.tenantId!,
      req.authContext!.userId!,
      id,
      dto
    );
  }

  @RequireAnyPermission('accounting')
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

  // ==========================================
  // SHIPMENTS & ITEMS
  // ==========================================

  @Get('shipments')
  async listShipments(@Req() req: RequestWithAuth) {
    return this.importSalesService.listShipments(req.authContext!.tenantId!);
  }

  @RequireAnyPermission('purchases', 'accounting')
  @Post('shipments')
  async createShipment(@Req() req: RequestWithAuth, @Body() dto: CreateShipmentDto) {
    return this.importSalesService.createShipment(req.authContext!.tenantId!, dto);
  }

  @Get('shipments/:id')
  async getShipmentById(@Req() req: RequestWithAuth, @Param('id') shipmentId: string) {
    return this.importSalesService.getShipmentById(req.authContext!.tenantId!, shipmentId);
  }

  @RequireAnyPermission('purchases', 'accounting', 'inventory')
  @Patch('shipments/:id/costs')
  async updateShipmentCosts(
    @Req() req: RequestWithAuth,
    @Param('id') shipmentId: string,
    @Body() dto: UpdateShipmentCostsDto
  ) {
    return this.importSalesService.updateShipmentCosts(
      req.authContext!.tenantId!,
      req.authContext!.userId!,
      shipmentId,
      dto
    );
  }

  @RequireAnyPermission('purchases', 'accounting', 'inventory')
  @Post('shipments/:id/items')
  async addShipmentItem(
    @Req() req: RequestWithAuth,
    @Param('id') shipmentId: string,
    @Body() dto: AddShipmentItemDto
  ) {
    return this.importSalesService.addShipmentItem(req.authContext!.tenantId!, shipmentId, dto);
  }

  @RequireAnyPermission('purchases', 'accounting')
  @Post('calculate-landed-cost/:shipmentId')
  async calculateLandedCost(@Req() req: RequestWithAuth, @Param('shipmentId') shipmentId: string) {
    return this.importSalesService.calculateLandedCost(req.authContext!.tenantId!, shipmentId);
  }

  @RequireAnyPermission('purchases', 'accounting')
  @Post('shipments/:shipmentId/late-expense')
  async processLateShipmentExpense(
    @Req() req: RequestWithAuth,
    @Param('shipmentId') shipmentId: string,
    @Body() dto: ProcessLateExpenseDto
  ) {
    return this.importSalesService.processLateShipmentExpense(
      req.authContext!.tenantId!,
      Number(req.authContext!.userId!),
      shipmentId,
      dto
    );
  }

  @RequireAnyPermission('canViewProfit', 'reports', 'accounting')
  @Get('profit-report')
  async generateProfitReport(
    @Req() req: RequestWithAuth,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('projectId') projectId?: string
  ) {
    if (!startDate || !endDate) {
      const end = new Date();
      const start = new Date();
      start.setDate(1);
      return this.importSalesService.generatePeriodProfitReport(req.authContext!.tenantId!, start, end, projectId);
    }
    return this.importSalesService.generatePeriodProfitReport(req.authContext!.tenantId!, startDate, endDate, projectId);
  }

  @RequireAnyPermission('purchases', 'accounting')
  @Get('foreign-transfers')
  async listForeignTransfers(@Req() req: RequestWithAuth) {
    return this.importSalesService.listForeignTransfers(req.authContext!.tenantId!);
  }

  @RequireAnyPermission('purchases', 'accounting')
  @Post('foreign-transfer')
  async recordForeignTransfer(@Req() req: RequestWithAuth, @Body() dto: RecordForeignTransferDto) {
    return this.importSalesService.recordForeignTransfer(
      req.authContext!.tenantId!,
      req.authContext!.userId!,
      dto
    );
  }

  @RequireAnyPermission('purchases', 'accounting', 'inventory')
  @Patch('shipment-items/:itemId')
  async updateShipmentItem(
    @Req() req: RequestWithAuth,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateShipmentItemDto
  ) {
    return this.importSalesService.updateShipmentItem(req.authContext!.tenantId!, itemId, dto);
  }

  @RequireAnyPermission('purchases', 'pricing', 'canManageSettings')
  @Post('shipments/:id/apply-prices')
  async applySuggestedPrices(@Req() req: RequestWithAuth, @Param('id') shipmentId: string) {
    return this.importSalesService.applySuggestedPrices(req.authContext!.tenantId!, shipmentId);
  }
}
