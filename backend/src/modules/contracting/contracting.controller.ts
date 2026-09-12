import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ContractingService } from './contracting.service';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import {
  CreateProjectDto,
  UpdateProjectDto,
  CreateBoqItemDto,
  UpdateBoqItemDto,
  CreateChangeOrderDto,
  UpdateChangeOrderStatusDto,
  CreateIpcInvoiceDto,
  CreateSubcontractDto,
  CreateDailyLogDto,
  CreateRfiDto,
  AnswerRfiDto,
  CreateScheduleTaskDto,
  UpdateScheduleTaskDto,
  CreateMaterialRequisitionDto,
  CreateMasterPriceItemDto,
  UpdateMasterPriceItemDto,
  CreateEngineeringConstantDto,
  AutoPriceBoqItemDto,
  CreateCostSnapshotDto,
  CreateRetentionRecordDto,
  ReleaseRetentionDto,
  CreatePaymentHoldDto,
  ReleasePaymentHoldDto,
  CreateSupplierReturnDto,
  CreateLaborAttendanceDto,
  CreatePettyCashDto,
  SettlePettyCashDto,
  CreateGovernmentLicenseDto,
  CreateMasterBoqLibraryItemDto,
  UpdateMasterBoqLibraryItemDto,
  ImportMasterBoqToProjectDto,
  SaveBoqTakeoffsDto,
  CreateSiteMobilizationExpenseDto,
  RecordLaborAttendanceRecordDto,
  CreateClientPaymentMilestoneDto,
  RecordInKindBarterDeductionDto,
  CreateEquipmentAssetDto,
  TransferEquipmentAssetDto,
  RecordSupplierPriceMemoryDto,
} from './dto/contracting.dto';


@Controller(['contracting', 'api/contracting'])
@UseGuards(SessionAuthGuard)
export class ContractingController {
  constructor(private readonly contractingService: ContractingService) {}

  // --------------------------------------------------------------------------
  // 1. Projects
  // --------------------------------------------------------------------------

  @Get('projects')
  async getProjects(
    @Query('status') status: string,
    @Query('search') search: string,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.getProjects(req.authContext!, { status, search });
  }

  @Get('projects/:id')
  async getProjectById(@Param('id') id: string, @Req() req: RequestWithAuth) {
    return this.contractingService.getProjectById(req.authContext!, id);
  }

  @Post('projects')
  async createProject(@Body() dto: CreateProjectDto, @Req() req: RequestWithAuth) {
    return this.contractingService.createProject(req.authContext!, dto);
  }

  @Put('projects/:id')
  async updateProject(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.updateProject(req.authContext!, id, dto);
  }

  @Delete('projects/:id')
  async deleteProject(@Param('id') id: string, @Req() req: RequestWithAuth) {
    return this.contractingService.deleteProject(req.authContext!, id);
  }

  // --------------------------------------------------------------------------
  // 2. BOQ (Bill of Quantities / Schedule of Values)
  // --------------------------------------------------------------------------

  @Get('projects/:projectId/boq')
  async getBoqItems(@Param('projectId') projectId: string, @Req() req: RequestWithAuth) {
    return this.contractingService.getBoqItems(req.authContext!, projectId);
  }

  @Post('projects/:projectId/boq')
  async createBoqItem(
    @Param('projectId') projectId: string,
    @Body() dto: CreateBoqItemDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.createBoqItem(req.authContext!, projectId, dto);
  }

  @Post('projects/:projectId/boq/batch')
  async batchCreateBoqItems(
    @Param('projectId') projectId: string,
    @Body() body: { items: CreateBoqItemDto[] },
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.batchCreateBoqItems(req.authContext!, projectId, body.items || []);
  }

  @Put('boq/:id')
  async updateBoqItem(
    @Param('id') id: string,
    @Body() dto: UpdateBoqItemDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.updateBoqItem(req.authContext!, id, dto);
  }

  @Delete('boq/:id')
  async deleteBoqItem(@Param('id') id: string, @Req() req: RequestWithAuth) {
    return this.contractingService.deleteBoqItem(req.authContext!, id);
  }

  // --------------------------------------------------------------------------
  // 3. Change Orders (أوامر التغيير والملحقات)
  // --------------------------------------------------------------------------

  @Get('projects/:projectId/change-orders')
  async getChangeOrders(@Param('projectId') projectId: string, @Req() req: RequestWithAuth) {
    return this.contractingService.getChangeOrders(req.authContext!, projectId);
  }

  @Post('projects/:projectId/change-orders')
  async createChangeOrder(
    @Param('projectId') projectId: string,
    @Body() dto: CreateChangeOrderDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.createChangeOrder(req.authContext!, projectId, dto);
  }

  @Put('change-orders/:id/status')
  async updateChangeOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateChangeOrderStatusDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.updateChangeOrderStatus(req.authContext!, id, dto);
  }

  // --------------------------------------------------------------------------
  // 4. Invoices / IPCs (المستخلصات التراكمية)
  // --------------------------------------------------------------------------

  @Get('projects/:projectId/invoices')
  async getInvoices(
    @Param('projectId') projectId: string,
    @Query('type') type: 'client' | 'subcontractor',
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.getInvoices(req.authContext!, projectId, type);
  }

  @Get('invoices/:id')
  async getInvoiceById(@Param('id') id: string, @Req() req: RequestWithAuth) {
    return this.contractingService.getInvoiceById(req.authContext!, id);
  }

  @Post('projects/:projectId/invoices')
  async createInvoice(
    @Param('projectId') projectId: string,
    @Body() dto: CreateIpcInvoiceDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.createInvoice(req.authContext!, projectId, dto);
  }

  @Post('invoices/:id/approve')
  async approveInvoice(@Param('id') id: string, @Req() req: RequestWithAuth) {
    return this.contractingService.approveInvoice(req.authContext!, id);
  }

  @Post('invoices/:id/post-journal')
  async postInvoiceJournal(@Param('id') id: string, @Req() req: RequestWithAuth) {
    return this.contractingService.postInvoiceJournalEntry(req.authContext!, id);
  }

  // --------------------------------------------------------------------------
  // 5. Subcontracts (Commitments)
  // --------------------------------------------------------------------------

  @Get('projects/:projectId/subcontracts')
  async getSubcontracts(@Param('projectId') projectId: string, @Req() req: RequestWithAuth) {
    return this.contractingService.getSubcontracts(req.authContext!, projectId);
  }

  @Post('projects/:projectId/subcontracts')
  async createSubcontract(
    @Param('projectId') projectId: string,
    @Body() dto: CreateSubcontractDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.createSubcontract(req.authContext!, projectId, dto);
  }

  // --------------------------------------------------------------------------
  // 6. Site Daily Logs
  // --------------------------------------------------------------------------

  @Get('projects/:projectId/daily-logs')
  async getDailyLogs(@Param('projectId') projectId: string, @Req() req: RequestWithAuth) {
    return this.contractingService.getDailyLogs(req.authContext!, projectId);
  }

  @Post('projects/:projectId/daily-logs')
  async createDailyLog(
    @Param('projectId') projectId: string,
    @Body() dto: CreateDailyLogDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.createDailyLog(req.authContext!, projectId, dto);
  }

  // --------------------------------------------------------------------------
  // 7. RFIs (Technical Office)
  // --------------------------------------------------------------------------

  @Get('projects/:projectId/rfis')
  async getRfiList(@Param('projectId') projectId: string, @Req() req: RequestWithAuth) {
    return this.contractingService.getRfiList(req.authContext!, projectId);
  }

  @Post('projects/:projectId/rfis')
  async createRfi(
    @Param('projectId') projectId: string,
    @Body() dto: CreateRfiDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.createRfi(req.authContext!, projectId, dto);
  }

  @Put('rfis/:id/answer')
  async answerRfi(
    @Param('id') id: string,
    @Body() dto: AnswerRfiDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.answerRfi(req.authContext!, id, dto);
  }

  // --------------------------------------------------------------------------
  // 9. Schedule Tasks (Gantt & WBS)
  // --------------------------------------------------------------------------

  @Get('projects/:projectId/tasks')
  async getScheduleTasks(@Param('projectId') projectId: string, @Req() req: RequestWithAuth) {
    return this.contractingService.getScheduleTasks(req.authContext!, projectId);
  }

  @Post('projects/:projectId/tasks')
  async createScheduleTask(
    @Param('projectId') projectId: string,
    @Body() dto: CreateScheduleTaskDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.createScheduleTask(req.authContext!, projectId, dto);
  }

  @Put('tasks/:id')
  async updateScheduleTask(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleTaskDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.updateScheduleTask(req.authContext!, id, dto);
  }

  @Delete('tasks/:id')
  async deleteScheduleTask(@Param('id') id: string, @Req() req: RequestWithAuth) {
    return this.contractingService.deleteScheduleTask(req.authContext!, id);
  }

  // --------------------------------------------------------------------------
  // 10. Material Requisitions
  // --------------------------------------------------------------------------

  @Get('projects/:projectId/material-requisitions')
  async getMaterialRequisitions(@Param('projectId') projectId: string, @Req() req: RequestWithAuth) {
    return this.contractingService.getMaterialRequisitions(req.authContext!, projectId);
  }

  @Post('projects/:projectId/material-requisitions')
  async createMaterialRequisition(
    @Param('projectId') projectId: string,
    @Body() dto: CreateMaterialRequisitionDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.createMaterialRequisition(req.authContext!, projectId, dto);
  }

  @Delete('material-requisitions/:id')
  async deleteMaterialRequisition(@Param('id') id: string, @Req() req: RequestWithAuth) {
    return this.contractingService.deleteMaterialRequisition(req.authContext!, id);
  }

  // --------------------------------------------------------------------------
  // 11. Master Price List
  // --------------------------------------------------------------------------

  @Get('price-list')
  async getMasterPriceList(
    @Query('itemType') itemType: string,
    @Query('category') category: string,
    @Query('search') search: string,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.getMasterPriceList(req.authContext!, { itemType, category, search });
  }

  @Post('price-list')
  async createMasterPriceItem(@Body() dto: CreateMasterPriceItemDto, @Req() req: RequestWithAuth) {
    return this.contractingService.createMasterPriceItem(req.authContext!, dto);
  }

  @Put('price-list/:id')
  async updateMasterPriceItem(
    @Param('id') id: string,
    @Body() dto: UpdateMasterPriceItemDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.updateMasterPriceItem(req.authContext!, id, dto);
  }

  @Delete('price-list/:id')
  async deleteMasterPriceItem(@Param('id') id: string, @Req() req: RequestWithAuth) {
    return this.contractingService.deleteMasterPriceItem(req.authContext!, id);
  }

  // --------------------------------------------------------------------------
  // 12. Engineering Constants & Auto-Pricing
  // --------------------------------------------------------------------------

  @Get('engineering-constants')
  async getEngineeringConstants(@Req() req: RequestWithAuth) {
    return this.contractingService.getEngineeringConstants(req.authContext!);
  }

  @Post('engineering-constants')
  async createEngineeringConstant(@Body() dto: CreateEngineeringConstantDto, @Req() req: RequestWithAuth) {
    return this.contractingService.createEngineeringConstant(req.authContext!, dto);
  }

  @Post('auto-price-boq')
  async autoPriceBoqItem(@Body() dto: AutoPriceBoqItemDto, @Req() req: RequestWithAuth) {
    return this.contractingService.autoPriceBoqItem(req.authContext!, dto);
  }

  // --------------------------------------------------------------------------
  // 13. Cost Baseline Snapshots
  // --------------------------------------------------------------------------

  @Get('projects/:projectId/snapshots')
  async getCostSnapshots(@Param('projectId') projectId: string, @Req() req: RequestWithAuth) {
    return this.contractingService.getCostSnapshots(req.authContext!, projectId);
  }

  @Post('projects/:projectId/snapshots')
  async createCostSnapshot(
    @Param('projectId') projectId: string,
    @Body() dto: CreateCostSnapshotDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.createCostSnapshot(req.authContext!, projectId, dto);
  }

  // --------------------------------------------------------------------------
  // 14. Retention & Guarantees
  // --------------------------------------------------------------------------

  @Get('retentions')
  async getRetentionRecords(
    @Query('projectId') projectId: string,
    @Query('status') status: string,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.getRetentionRecords(req.authContext!, { projectId, status });
  }

  @Post('projects/:projectId/retentions')
  async createRetentionRecord(
    @Param('projectId') projectId: string,
    @Body() dto: CreateRetentionRecordDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.createRetentionRecord(req.authContext!, projectId, dto);
  }

  @Post('retentions/:id/release')
  async releaseRetentionRecord(
    @Param('id') id: string,
    @Body() dto: ReleaseRetentionDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.releaseRetentionRecord(req.authContext!, id, dto);
  }

  // --------------------------------------------------------------------------
  // 15. Payment Holds
  // --------------------------------------------------------------------------

  @Get('payment-holds')
  async getPaymentHolds(
    @Query('projectId') projectId: string,
    @Query('isReleased') isReleased: string,
    @Req() req: RequestWithAuth,
  ) {
    const isRel = isReleased !== undefined ? isReleased === 'true' : undefined;
    return this.contractingService.getPaymentHolds(req.authContext!, { projectId, isReleased: isRel });
  }

  @Post('projects/:projectId/payment-holds')
  async createPaymentHold(
    @Param('projectId') projectId: string,
    @Body() dto: CreatePaymentHoldDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.createPaymentHold(req.authContext!, projectId, dto);
  }

  @Post('payment-holds/:id/release')
  async releasePaymentHold(
    @Param('id') id: string,
    @Body() dto: ReleasePaymentHoldDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.releasePaymentHold(req.authContext!, id, dto);
  }

  // --------------------------------------------------------------------------
  // 16. Supplier Returns & Credit Notes
  // --------------------------------------------------------------------------

  @Get('supplier-returns')
  async getSupplierReturns(@Query('projectId') projectId: string, @Req() req: RequestWithAuth) {
    return this.contractingService.getSupplierReturns(req.authContext!, { projectId });
  }

  @Post('projects/:projectId/supplier-returns')
  async createSupplierReturn(
    @Param('projectId') projectId: string,
    @Body() dto: CreateSupplierReturnDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.createSupplierReturn(req.authContext!, projectId, dto);
  }

  // --------------------------------------------------------------------------
  // 17. Labor Attendance & Split Hours
  // --------------------------------------------------------------------------

  @Get('labor-attendance')
  async getLaborAttendance(
    @Query('projectId') projectId: string,
    @Query('workDate') workDate: string,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.getLaborAttendance(req.authContext!, { projectId, workDate });
  }

  @Post('projects/:projectId/labor-attendance')
  async createLaborAttendance(
    @Param('projectId') projectId: string,
    @Body() dto: CreateLaborAttendanceDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.createLaborAttendance(req.authContext!, projectId, dto);
  }

  // --------------------------------------------------------------------------
  // 18. Petty Cash Custody
  // --------------------------------------------------------------------------

  @Get('petty-cash')
  async getPettyCashRecords(
    @Query('projectId') projectId: string,
    @Query('status') status: string,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.getPettyCashRecords(req.authContext!, { projectId, status });
  }

  @Post('projects/:projectId/petty-cash')
  async createPettyCash(
    @Param('projectId') projectId: string,
    @Body() dto: CreatePettyCashDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.createPettyCash(req.authContext!, projectId, dto);
  }

  @Post('petty-cash/:id/settle')
  async settlePettyCash(
    @Param('id') id: string,
    @Body() dto: SettlePettyCashDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.settlePettyCash(req.authContext!, id, dto);
  }

  // --------------------------------------------------------------------------
  // 19. Government Licenses & Expiry Alerts
  // --------------------------------------------------------------------------

  @Get('government-licenses')
  async getGovernmentLicenses(
    @Query('projectId') projectId: string,
    @Query('status') status: string,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.getGovernmentLicenses(req.authContext!, { projectId, status });
  }

  @Post('projects/:projectId/government-licenses')
  async createGovernmentLicense(
    @Param('projectId') projectId: string,
    @Body() dto: CreateGovernmentLicenseDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.createGovernmentLicense(req.authContext!, projectId, dto);
  }

  // --------------------------------------------------------------------------
  // 20. Executive Intelligence: Health Score, Cash Forecast, MRP, P&L
  // --------------------------------------------------------------------------

  @Get('projects/:projectId/health-score')
  async getProjectHealthScore(@Param('projectId') projectId: string, @Req() req: RequestWithAuth) {
    return this.contractingService.getProjectHealthScore(req.authContext!, projectId);
  }

  @Get('cash-forecast')
  async getCashForecast(@Query('projectId') projectId: string, @Req() req: RequestWithAuth) {
    return this.contractingService.getCashForecast(req.authContext!, { projectId });
  }

  @Get('projects/:projectId/material-requirements')
  async getProjectMaterialRequirements(@Param('projectId') projectId: string, @Req() req: RequestWithAuth) {
    return this.contractingService.getProjectMaterialRequirements(req.authContext!, projectId);
  }

  @Get('projects/:projectId/profitability')
  async getBoqProfitabilityAnalysis(@Param('projectId') projectId: string, @Req() req: RequestWithAuth) {
    return this.contractingService.getBoqProfitabilityAnalysis(req.authContext!, projectId);
  }

  // --------------------------------------------------------------------------
  // 21. Multi-Trade Master BOQ Library & Project Import
  // --------------------------------------------------------------------------

  @Get('master-boq/trades')
  async getMasterBoqTrades(@Req() req: RequestWithAuth) {
    return this.contractingService.getMasterBoqTrades(req.authContext!);
  }

  @Get('master-boq/items')
  async getMasterBoqLibrary(
    @Query('tradeCategory') tradeCategory: string,
    @Query('search') search: string,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.getMasterBoqLibrary(req.authContext!, { tradeCategory, search });
  }

  @Post('master-boq/items')
  async createMasterBoqItem(@Body() dto: CreateMasterBoqLibraryItemDto, @Req() req: RequestWithAuth) {
    return this.contractingService.createMasterBoqItem(req.authContext!, dto);
  }

  @Put('master-boq/items/:id')
  async updateMasterBoqItem(
    @Param('id') id: string,
    @Body() dto: UpdateMasterBoqLibraryItemDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.updateMasterBoqItem(req.authContext!, id, dto);
  }

  @Delete('master-boq/items/:id')
  async deleteMasterBoqItem(@Param('id') id: string, @Req() req: RequestWithAuth) {
    return this.contractingService.deleteMasterBoqItem(req.authContext!, id);
  }

  @Post('projects/:projectId/boq/import-master')
  async importMasterBoqItemsToProject(
    @Param('projectId') projectId: string,
    @Body() dto: ImportMasterBoqToProjectDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.importMasterBoqItemsToProject(req.authContext!, projectId, dto);
  }

  // --------------------------------------------------------------------------
  // 22. BOQ CAD Quantity Takeoff Sheet
  // --------------------------------------------------------------------------

  @Get('boq/:boqItemId/takeoffs')
  async getTakeoffsByBoqItem(@Param('boqItemId') boqItemId: string, @Req() req: RequestWithAuth) {
    return this.contractingService.getTakeoffsByBoqItem(req.authContext!, boqItemId);
  }

  @Post('boq/:boqItemId/takeoffs')
  async saveTakeoffs(
    @Param('boqItemId') boqItemId: string,
    @Body() dto: SaveBoqTakeoffsDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.saveTakeoffs(req.authContext!, boqItemId, dto);
  }

  // --------------------------------------------------------------------------
  // 23. Site Mobilization & Setup Expenses
  // --------------------------------------------------------------------------

  @Get('projects/:projectId/mobilization')
  async getMobilizationExpenses(@Param('projectId') projectId: string, @Req() req: RequestWithAuth) {
    return this.contractingService.getMobilizationExpenses(req.authContext!, projectId);
  }

  @Post('projects/:projectId/mobilization')
  async createMobilizationExpense(
    @Param('projectId') projectId: string,
    @Body() dto: CreateSiteMobilizationExpenseDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.createMobilizationExpense(req.authContext!, projectId, dto);
  }

  @Delete('mobilization/:id')
  async deleteMobilizationExpense(@Param('id') id: string, @Req() req: RequestWithAuth) {
    return this.contractingService.deleteMobilizationExpense(req.authContext!, id);
  }

  // --------------------------------------------------------------------------
  // 24. Labor Attendance & Overtime Records (Linked to BOQ Item)
  // --------------------------------------------------------------------------

  @Get('projects/:projectId/labor-records')
  async getLaborAttendanceRecords(
    @Param('projectId') projectId: string,
    @Query('date') date: string,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.getLaborAttendanceRecords(req.authContext!, projectId, date);
  }

  @Post('projects/:projectId/labor-records')
  async recordLaborAttendance(
    @Param('projectId') projectId: string,
    @Body() dto: RecordLaborAttendanceRecordDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.recordLaborAttendance(req.authContext!, projectId, dto);
  }

  @Delete('labor-records/:id')
  async deleteLaborAttendanceRecord(@Param('id') id: string, @Req() req: RequestWithAuth) {
    return this.contractingService.deleteLaborAttendanceRecord(req.authContext!, id);
  }

  // --------------------------------------------------------------------------
  // 25. Client Payment Milestones & In-Kind Barter Settlements
  // --------------------------------------------------------------------------

  @Get('projects/:projectId/milestones')
  async getClientPaymentMilestones(@Param('projectId') projectId: string, @Req() req: RequestWithAuth) {
    return this.contractingService.getClientPaymentMilestones(req.authContext!, projectId);
  }

  @Post('projects/:projectId/milestones')
  async createClientPaymentMilestone(
    @Param('projectId') projectId: string,
    @Body() dto: CreateClientPaymentMilestoneDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.createClientPaymentMilestone(req.authContext!, projectId, dto);
  }

  @Post('milestones/:id/barter-settlement')
  async recordInKindBarterDeduction(
    @Param('id') id: string,
    @Body() dto: RecordInKindBarterDeductionDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.recordInKindBarterDeduction(req.authContext!, id, dto);
  }

  @Delete('milestones/:id')
  async deleteClientPaymentMilestone(@Param('id') id: string, @Req() req: RequestWithAuth) {
    return this.contractingService.deleteClientPaymentMilestone(req.authContext!, id);
  }

  // --------------------------------------------------------------------------
  // 26. Equipment & Tools Asset Tracking
  // --------------------------------------------------------------------------

  @Get('equipment')
  async getEquipmentAssets(
    @Query('projectId') projectId: string,
    @Query('operationalStatus') operationalStatus: string,
    @Query('search') search: string,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.getEquipmentAssets(req.authContext!, { projectId, operationalStatus, search });
  }

  @Post('equipment')
  async createEquipmentAsset(@Body() dto: CreateEquipmentAssetDto, @Req() req: RequestWithAuth) {
    return this.contractingService.createEquipmentAsset(req.authContext!, dto);
  }

  @Post('equipment/:id/transfer')
  async transferEquipmentAsset(
    @Param('id') id: string,
    @Body() dto: TransferEquipmentAssetDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.transferEquipmentAsset(req.authContext!, id, dto);
  }

  @Get('equipment-transfers')
  async getEquipmentTransfers(@Query('equipmentId') equipmentId: string, @Req() req: RequestWithAuth) {
    return this.contractingService.getEquipmentTransfers(req.authContext!, equipmentId);
  }

  // --------------------------------------------------------------------------
  // 27. Supplier Price Memory & Rating Directory
  // --------------------------------------------------------------------------

  @Get('supplier-price-memory')
  async getSupplierPriceMemory(
    @Query('supplierId') supplierId: string,
    @Query('materialName') materialName: string,
    @Query('governorate') governorate: string,
    @Query('paymentTerms') paymentTerms: string,
    @Req() req: RequestWithAuth,
  ) {
    return this.contractingService.getSupplierPriceMemory(req.authContext!, {
      supplierId: supplierId ? Number(supplierId) : undefined,
      materialName,
      governorate,
      paymentTerms,
    });
  }

  @Post('supplier-price-memory')
  async recordSupplierPriceMemory(@Body() dto: RecordSupplierPriceMemoryDto, @Req() req: RequestWithAuth) {
    return this.contractingService.recordSupplierPriceMemory(req.authContext!, dto);
  }

  // --------------------------------------------------------------------------
  // 28. Item-Level Direct Profitability Ledger
  // --------------------------------------------------------------------------

  @Get('projects/:projectId/item-profitability')
  async getItemProfitabilityLedger(@Param('projectId') projectId: string, @Req() req: RequestWithAuth) {
    return this.contractingService.getItemProfitabilityLedger(req.authContext!, projectId);
  }
}


