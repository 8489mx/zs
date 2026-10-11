import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards, ParseIntPipe } from '@nestjs/common';
import { SessionAuthGuard } from '../../../core/auth/guards/session-auth.guard';
import { PermissionsGuard } from '../../../core/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../core/auth/decorators/permissions.decorator';
import { RequestWithAuth } from '../../../core/auth/interfaces/request-with-auth.interface';
import { KitchenPrintersService } from '../services/kitchen-printers.service';
import { CreateKitchenPrinterDto, UpdateKitchenPrinterDto } from '../dto/kitchen-printer.dto';

@Controller('api/sales/kitchen-printers')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class KitchenPrintersController {
  constructor(private readonly service: KitchenPrintersService) {}

  @Get()
  @RequirePermissions('sales')
  async listPrinters(
    @Req() req: RequestWithAuth,
    @Query('branchId') branchId?: string,
  ) {
    const tenantId = req.authContext?.tenantId || 'default';
    return this.service.listPrinters(tenantId, branchId ? Number(branchId) : undefined);
  }

  @Post()
  @RequirePermissions('sales')
  async createPrinter(
    @Req() req: RequestWithAuth,
    @Body() dto: CreateKitchenPrinterDto,
  ) {
    const tenantId = req.authContext?.tenantId || 'default';
    return this.service.createPrinter(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermissions('sales')
  async updatePrinter(
    @Req() req: RequestWithAuth,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateKitchenPrinterDto,
  ) {
    const tenantId = req.authContext?.tenantId || 'default';
    return this.service.updatePrinter(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('sales')
  async deletePrinter(
    @Req() req: RequestWithAuth,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const tenantId = req.authContext?.tenantId || 'default';
    return this.service.deletePrinter(tenantId, id);
  }
}
