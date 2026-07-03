import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../core/auth/decorators/permissions.decorator';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { PermissionsGuard } from '../../core/auth/guards/permissions.guard';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
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

  @Get('location-stocks')
  getAllLocationStocks(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.inventoryService.getAllLocationStocks(req.authContext!);
  }

  @Get('inventory/advanced-overview')
  getAdvancedOverview(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.inventoryService.getAdvancedOverview(req.authContext!);
  }

  @Get('locations/:id/categories')
  getLocationCategories(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.inventoryService.getLocationCategories(id, req.authContext!);
  }

  @Get('locations/:id/categories/:categoryId/products')
  getLocationCategoryProducts(
    @Param('id', ParseIntPipe) id: number,
    @Param('categoryId') categoryId: string,
    @Req() req: RequestWithAuth
  ): Promise<Record<string, unknown>> {
    const parsedCategoryId = categoryId === 'all' ? 'all' : parseInt(categoryId, 10);
    return this.inventoryService.getLocationCategoryProducts(id, parsedCategoryId, req.authContext!);
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

  @Post('transfer-category')
  @RequirePermissions('canAdjustInventory')
  transferCategory(@Body() payload: import('./dto/create-category-transfer.dto').CreateCategoryTransferDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.inventoryService.transferCategory(payload, req.authContext!);
  }

  @Post('internal-transfer')
  @RequirePermissions('canAdjustInventory')
  internalTransfer(@Body() payload: CreateStockTransferDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.inventoryService.internalTransferProducts(payload as any, req.authContext!);
  }

  @Post('internal-transfer-category')
  @RequirePermissions('canAdjustInventory')
  internalTransferCategory(@Body() payload: import('./dto/create-category-transfer.dto').CreateCategoryTransferDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.inventoryService.internalTransferCategory(payload as any, req.authContext!);
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
