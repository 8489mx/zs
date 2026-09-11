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
}
