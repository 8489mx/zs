import { damagedStockSchema, inventoryAdjustmentSchema, type DamagedStockOutput, type InventoryAdjustmentOutput } from '@/features/inventory/schemas/inventory.schema';

export function buildInventoryAdjustmentPayload(values: InventoryAdjustmentOutput) {
  const parsed = inventoryAdjustmentSchema.parse(values);
  return {
    productId: parsed.productId,
    actionType: parsed.actionType,
    qty: parsed.qty,
    reason: parsed.reason,
    note: parsed.note || '',
    managerPin: parsed.managerPin
  };
}

export function buildDamagedStockPayload(values: DamagedStockOutput) {
  const parsed = damagedStockSchema.parse(values);
  return {
    productId: parsed.productId,
    qty: parsed.qty,
    reason: parsed.reason,
    note: parsed.note || '',
    branchId: parsed.branchId || null,
    locationId: parsed.locationId || null,
    managerPin: parsed.managerPin
  };
}
