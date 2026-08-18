import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RequirePermissions } from '../../core/auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../core/auth/guards/permissions.guard';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { UpsertMaintenanceTicketDto } from './dto/upsert-maintenance-ticket.dto';
import { UpdateTicketStatusDto, AddTicketPartDto } from './dto/update-ticket-status.dto';
import { MaintenanceService } from './maintenance.service';

@Controller('api/maintenance/tickets')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get()
  @RequirePermissions('canViewSales')
  listTickets(
    @Req() req: RequestWithAuth,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.maintenanceService.listTickets(req.authContext!, {
      status,
      q,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 25,
    });
  }

  @Get(':id')
  @RequirePermissions('canViewSales')
  getTicket(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth) {
    return this.maintenanceService.getTicket(id, req.authContext!);
  }

  @Post()
  @RequirePermissions('canCreateSales')
  createTicket(@Body() payload: UpsertMaintenanceTicketDto, @Req() req: RequestWithAuth) {
    return this.maintenanceService.createTicket(payload, req.authContext!);
  }

  @Put(':id')
  @RequirePermissions('canCreateSales')
  updateTicket(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpsertMaintenanceTicketDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.maintenanceService.updateTicket(id, payload, req.authContext!);
  }

  @Patch(':id/status')
  @RequirePermissions('canCreateSales')
  updateTicketStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateTicketStatusDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.maintenanceService.updateTicketStatus(id, payload, req.authContext!);
  }

  @Post(':id/parts')
  @RequirePermissions('canCreateSales')
  addPart(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: AddTicketPartDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.maintenanceService.addPart(id, payload, req.authContext!);
  }

  @Delete(':id/parts/:partId')
  @RequirePermissions('canCreateSales')
  removePart(
    @Param('id', ParseIntPipe) id: number,
    @Param('partId', ParseIntPipe) partId: number,
    @Req() req: RequestWithAuth,
  ) {
    return this.maintenanceService.removePart(id, partId, req.authContext!);
  }

  @Delete(':id')
  @RequirePermissions('canManageProducts')
  deleteTicket(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth) {
    return this.maintenanceService.deleteTicket(id, req.authContext!);
  }
}
