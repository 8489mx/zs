import { damagedStockSchema, inventoryAdjustmentSchema, type DamagedStockOutput, type InventoryAdjustmentOutput } from '@/features/inventory/schemas/inventory.schema';

export function buildInventoryAdjustmentPayload(values: InventoryAdjustmentOutput) {
  const parsed = inventoryAdjustmentSchema.parse(values);
  const payload: Record<string, unknown> = {
    productId: parsed.productId,
    actionType: parsed.actionType,
    qty: parsed.qty,
    reason: parsed.reason,
    note: parsed.note || '',
    branchId: parsed.branchId || null,
    locationId: parsed.locationId || null,
  };
  if (parsed.managerPin && parsed.managerPin.trim()) {
    payload.managerPin = parsed.managerPin.trim();
  }
  return payload;
}

export function buildDamagedStockPayload(values: DamagedStockOutput) {
  const parsed = damagedStockSchema.parse(values);
  const payload: Record<string, unknown> = {
    productId: parsed.productId,
    qty: parsed.qty,
    reason: parsed.reason,
    note: parsed.note || '',
    branchId: parsed.branchId || null,
    locationId: parsed.locationId || null,
  };
  if (parsed.managerPin && parsed.managerPin.trim()) {
    payload.managerPin = parsed.managerPin.trim();
  }
  return payload;
}
