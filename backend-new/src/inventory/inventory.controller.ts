import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { RequestWithAuth } from '../auth/interfaces/request-with-auth.interface';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CreateDamagedStockDto } from './dto/create-damaged-stock.dto';
import { CreateStockCountSessionDto, PostStockCountSessionDto } from './dto/create-stock-count-session.dto';
import { CreateStockTransferDto } from './dto/create-stock-transfer.dto';
import { InventoryAdjustmentDto } from './dto/inventory-adjustment.dto';
import { InventoryService } from './inventory.service';

@Controller('api')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('locations')
  listLocations(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.inventoryService.listLocations(req.authContext!);
  }

  @Get('stock-transfers')
  listTransfers(@Query() query: Record<string, unknown>, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.inventoryService.listStockTransfers(query, req.authContext!);
  }

  @Get('stock-movements')
  listMovements(@Query() query: Record<string, unknown>, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.inventoryService.listStockMovements(query, req.authContext!);
  }

  @Post('stock-transfers')
  @RequirePermissions('canAdjustInventory')
  createTransfer(@Body() payload: CreateStockTransferDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.inventoryService.createStockTransfer(payload, req.authContext!);
  }

  @Post('stock-transfers/:id/receive')
  @RequirePermissions('canAdjustInventory')
  receiveTransfer(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.inventoryService.receiveStockTransfer(id, req.authContext!);
  }

  @Post('stock-transfers/:id/cancel')
  @RequirePermissions('canAdjustInventory')
  cancelTransfer(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.inventoryService.cancelStockTransfer(id, req.authContext!);
  }

  @Get('stock-count-sessions')
  @RequirePermissions('inventory')
  listStockCountSessions(@Query() query: Record<string, unknown>, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.inventoryService.listStockCountSessions(query, req.authContext!);
  }

  @Post('stock-count-sessions')
  @RequirePermissions('canAdjustInventory')
  createStockCountSession(@Body() payload: CreateStockCountSessionDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.inventoryService.createStockCountSession(payload, req.authContext!);
  }

  @Post('stock-count-sessions/:id/post')
  @RequirePermissions('canAdjustInventory')
  postStockCountSession(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: PostStockCountSessionDto,
    @Req() req: RequestWithAuth,
  ): Promise<Record<string, unknown>> {
    return this.inventoryService.postStockCountSession(id, payload.managerPin, req.authContext!);
  }

  @Get('damaged-stock')
  @RequirePermissions('inventory')
  listDamaged(@Query() query: Record<string, unknown>, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.inventoryService.listDamagedStock(query, req.authContext!);
  }

  @Post('damaged-stock')
  @RequirePermissions('canAdjustInventory')
  createDamaged(@Body() payload: CreateDamagedStockDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.inventoryService.createDamagedStock(payload, req.authContext!);
  }

  @Post('inventory-adjustments')
  @RequirePermissions('canAdjustInventory')
  createAdjustment(@Body() payload: InventoryAdjustmentDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.inventoryService.createInventoryAdjustment(payload, req.authContext!);
  }
}
