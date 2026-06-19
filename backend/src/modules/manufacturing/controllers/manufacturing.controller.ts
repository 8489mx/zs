import { Controller, Post, Body, Get, Param, ParseIntPipe, Patch, UseGuards, Req } from '@nestjs/common';
import { ManufacturingService } from '../services/manufacturing.service';
import { CreateBomDto, CreateWorkOrderDto, CompleteWorkOrderDto } from '../dto/manufacturing.dto';
import { RequestWithAuth } from '../../../core/auth/interfaces/request-with-auth.interface';
import { RequirePermissions } from '../../../core/auth/decorators/permissions.decorator';
import { SessionAuthGuard } from '../../../core/auth/guards/session-auth.guard';
import { PermissionsGuard } from '../../../core/auth/guards/permissions.guard';

@Controller('api/manufacturing')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class ManufacturingController {
  constructor(private readonly manufacturingService: ManufacturingService) {}

  @Post('boms')
  @RequirePermissions('inventory:write')
  createBom(@Body() dto: CreateBomDto, @Req() req: RequestWithAuth) {
    return this.manufacturingService.createBom(dto, req.authContext!);
  }

  @Get('boms')
  @RequirePermissions('inventory:read')
  getBoms(@Req() req: RequestWithAuth) {
    return this.manufacturingService.getBoms(req.authContext!);
  }

  @Post('work-orders')
  @RequirePermissions('inventory:write')
  createWorkOrder(@Body() dto: CreateWorkOrderDto, @Req() req: RequestWithAuth) {
    return this.manufacturingService.createWorkOrder(dto, req.authContext!);
  }

  @Get('work-orders')
  @RequirePermissions('inventory:read')
  getWorkOrders(@Req() req: RequestWithAuth) {
    return this.manufacturingService.getWorkOrders(req.authContext!);
  }

  @Patch('work-orders/:id/complete')
  @RequirePermissions('inventory:write')
  completeWorkOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CompleteWorkOrderDto,
    @Req() req: RequestWithAuth,
  ) {
    return this.manufacturingService.completeWorkOrder(id, dto, req.authContext!);
  }
}
