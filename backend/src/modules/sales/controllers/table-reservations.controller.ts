import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../../../core/auth/guards/session-auth.guard';
import { PermissionsGuard } from '../../../core/auth/guards/permissions.guard';
import { AllowAuthenticated } from '../../../core/auth/decorators/permissions.decorator';
import { RequestWithAuth } from '../../../core/auth/interfaces/request-with-auth.interface';
import { TableReservationsService } from '../services/table-reservations.service';
import { CreateTableReservationDto, UpdateTableReservationStatusDto } from '../dto/table-reservation.dto';

@Controller('api/sales/table-reservations')
@UseGuards(SessionAuthGuard, PermissionsGuard)
@AllowAuthenticated()
export class TableReservationsController {
  constructor(private readonly service: TableReservationsService) {}

  @Get()
  async listReservations(
    @Req() req: RequestWithAuth,
    @Query('branchId') branchId?: string,
    @Query('date') date?: string,
  ) {
    const tenantId = req.authContext!.tenantId;
    const branch = branchId ? parseInt(branchId, 10) : undefined;
    return this.service.listReservations(tenantId, branch, date);
  }

  @Post()
  async createReservation(
    @Req() req: RequestWithAuth,
    @Body() dto: CreateTableReservationDto,
  ) {
    const tenantId = req.authContext!.tenantId;
    const userId = req.authContext!.userId;
    return this.service.createReservation(tenantId, userId, dto);
  }

  @Patch(':id/status')
  async updateStatus(
    @Req() req: RequestWithAuth,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTableReservationStatusDto,
  ) {
    const tenantId = req.authContext!.tenantId;
    return this.service.updateStatus(tenantId, id, dto);
  }

  @Delete(':id')
  async deleteReservation(
    @Req() req: RequestWithAuth,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const tenantId = req.authContext!.tenantId;
    return this.service.deleteReservation(tenantId, id);
  }
}
