import { Injectable } from '@nestjs/common';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { CreateDamagedStockDto } from './dto/create-damaged-stock.dto';
import { CreateStockCountSessionDto } from './dto/create-stock-count-session.dto';
import { CreateStockTransferDto } from './dto/create-stock-transfer.dto';
import { InventoryAdjustmentDto } from './dto/inventory-adjustment.dto';
import { InventoryAdjustmentService } from './services/inventory-adjustment.service';
import { InventoryCountService } from './services/inventory-count.service';
import { InventoryScopeService } from './services/inventory-scope.service';
import { InventoryTransferService } from './services/inventory-transfer.service';

@Injectable()
export class InventoryService {
  constructor(
    private readonly scopeService: InventoryScopeService,
    private readonly transferService: InventoryTransferService,
    private readonly countService: InventoryCountService,
    private readonly adjustmentService: InventoryAdjustmentService,
  ) {}

  listLocations(auth: AuthContext): Promise<Record<string, unknown>> {
    return this.scopeService.listLocations(auth);
  }

  listStockTransfers(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    return this.transferService.listStockTransfers(query, auth);
  }

  listStockMovements(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    return this.countService.listStockMovements(query, auth);
  }

  createStockTransfer(payload: CreateStockTransferDto, auth: AuthContext): Promise<Record<string, unknown>> {
    return this.transferService.createStockTransfer(payload, auth);
  }

  receiveStockTransfer(transferId: number, auth: AuthContext): Promise<Record<string, unknown>> {
    return this.transferService.receiveStockTransfer(transferId, auth);
  }

  cancelStockTransfer(transferId: number, auth: AuthContext): Promise<Record<string, unknown>> {
    return this.transferService.cancelStockTransfer(transferId, auth);
  }

  listStockCountSessions(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    return this.countService.listStockCountSessions(query, auth);
  }

  createStockCountSession(payload: CreateStockCountSessionDto, auth: AuthContext): Promise<Record<string, unknown>> {
    return this.countService.createStockCountSession(payload, auth);
  }

  postStockCountSession(sessionId: number, _managerPin: string | undefined, auth: AuthContext): Promise<Record<string, unknown>> {
    return this.countService.postStockCountSession(sessionId, auth);
  }

  listDamagedStock(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    return this.countService.listDamagedStock(query, auth);
  }

  createDamagedStock(payload: CreateDamagedStockDto, auth: AuthContext): Promise<Record<string, unknown>> {
    return this.countService.createDamagedStock(payload, auth);
  }

  createInventoryAdjustment(payload: InventoryAdjustmentDto, auth: AuthContext): Promise<Record<string, unknown>> {
    return this.adjustmentService.createInventoryAdjustment(payload, auth);
  }
}
