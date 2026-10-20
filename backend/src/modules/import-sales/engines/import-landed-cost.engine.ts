/**
 * Import Landed Cost Engine (محرك احتساب التكلفة الفعلية الشاملة وتوزيع الأعباء)
 * Pure functional calculation engine imported identically by production and test suites.
 */

export interface LandedCostItemInput {
  id: string;
  productId: number | string;
  quantity: number;
  receivedQuantity?: number | null;
  factoryUnitPriceUsd: number;
  unitWeightKg?: number | null;
  unitCbm?: number | null;
  shortageHandlingMethod?: 'capitalize' | 'expense';
}

export interface LandedCostCalculationInput {
  items: LandedCostItemInput[];
  exchangeRate: number;
  shippingCostUsd: number;
  customsCostEgp: number;
  internalTransportCostEgp: number;
  demurrageFeesEgp?: number;
  portClearanceCostEgp?: number;
  allocationMethod?: 'value' | 'weight' | 'cbm';
}

export interface LandedCostItemResult {
  id: string;
  productId: number | string;
  effectiveQuantity: number;
  factoryPriceUsd: number;
  baseCostEgp: number;
  allocatedOverheadEgp: number;
  unitOverheadEgp: number;
  landedCostEgp: number;
  totalItemLandedCostEgp: number;
  shortageLossEgp: number;
}

export interface LandedCostCalculationResult {
  totalUsdValue: number;
  totalWeightKg: number;
  totalCbm: number;
  totalOverheadEgp: number;
  allocationMethod: 'value' | 'weight' | 'cbm';
  items: LandedCostItemResult[];
}

export function calculateLandedCostBreakdown(input: LandedCostCalculationInput): LandedCostCalculationResult {
  const rate = Math.max(0.0001, Number(input.exchangeRate) || 1);
  const method = input.allocationMethod || 'value';

  const shippingEgp = (Number(input.shippingCostUsd) || 0) * rate;
  const customsEgp = Number(input.customsCostEgp) || 0;
  const transportEgp = Number(input.internalTransportCostEgp) || 0;
  const demurrageEgp = Number(input.demurrageFeesEgp) || 0;
  const clearanceEgp = Number(input.portClearanceCostEgp) || 0;

  const totalOverheadEgp = shippingEgp + customsEgp + transportEgp + demurrageEgp + clearanceEgp;

  // Aggregate bases
  let totalUsdValue = 0;
  let totalWeightKg = 0;
  let totalCbm = 0;

  for (const item of input.items) {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const unitPrice = Math.max(0, Number(item.factoryUnitPriceUsd) || 0);
    const weight = Math.max(0, Number(item.unitWeightKg) || 0);
    const cbm = Math.max(0, Number(item.unitCbm) || 0);

    totalUsdValue += qty * unitPrice;
    totalWeightKg += qty * weight;
    totalCbm += qty * cbm;
  }

  const itemsResult: LandedCostItemResult[] = input.items.map((item) => {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const receivedQty = item.receivedQuantity !== null && item.receivedQuantity !== undefined
      ? Number(item.receivedQuantity)
      : qty;
    const handlingMethod = item.shortageHandlingMethod || 'capitalize';
    const effectiveQty = handlingMethod === 'capitalize' && receivedQty > 0 ? receivedQty : qty;

    const unitPriceUsd = Math.max(0, Number(item.factoryUnitPriceUsd) || 0);
    const itemTotalUsd = qty * unitPriceUsd;
    const itemWeight = qty * (Number(item.unitWeightKg) || 0);
    const itemCbm = qty * (Number(item.unitCbm) || 0);

    let ratio = 0;
    if (method === 'weight' && totalWeightKg > 0) {
      ratio = itemWeight / totalWeightKg;
    } else if (method === 'cbm' && totalCbm > 0) {
      ratio = itemCbm / totalCbm;
    } else {
      // Default to value allocation
      ratio = totalUsdValue > 0 ? itemTotalUsd / totalUsdValue : (input.items.length > 0 ? 1 / input.items.length : 0);
    }

    const itemAllocatedOverheadEgp = totalOverheadEgp * ratio;
    const baseCostEgp = unitPriceUsd * rate;
    const totalItemLandedCostEgp = (qty * baseCostEgp) + itemAllocatedOverheadEgp;

    const unitLandedEgp = effectiveQty > 0 ? totalItemLandedCostEgp / effectiveQty : 0;
    const unitOverheadEgp = effectiveQty > 0 ? itemAllocatedOverheadEgp / effectiveQty : 0;

    let shortageLossEgp = 0;
    if (handlingMethod === 'expense' && receivedQty < qty) {
      const missingQty = qty - receivedQty;
      shortageLossEgp = missingQty * unitLandedEgp;
    }

    return {
      id: item.id,
      productId: item.productId,
      effectiveQuantity: effectiveQty,
      factoryPriceUsd: unitPriceUsd,
      baseCostEgp: Number(baseCostEgp.toFixed(4)),
      allocatedOverheadEgp: Number(itemAllocatedOverheadEgp.toFixed(4)),
      unitOverheadEgp: Number(unitOverheadEgp.toFixed(4)),
      landedCostEgp: Number(unitLandedEgp.toFixed(4)),
      totalItemLandedCostEgp: Number(totalItemLandedCostEgp.toFixed(4)),
      shortageLossEgp: Number(shortageLossEgp.toFixed(4)),
    };
  });

  return {
    totalUsdValue: Number(totalUsdValue.toFixed(2)),
    totalWeightKg: Number(totalWeightKg.toFixed(3)),
    totalCbm: Number(totalCbm.toFixed(3)),
    totalOverheadEgp: Number(totalOverheadEgp.toFixed(2)),
    allocationMethod: method,
    items: itemsResult,
  };
}

export function calculateDemurrageRisk(input: {
  arrivalDate?: string | Date | null;
  demurrageStartDate?: string | Date | null;
  freeDays: number;
  ratePerDayUsd: number;
  exchangeRate: number;
  status: string;
}) {
  if (input.status === 'Arrived') {
    return { isOverdue: false, overdueDays: 0, estimatedFeesEgp: 0, daysRemaining: null };
  }

  const baseDate = input.demurrageStartDate ? new Date(input.demurrageStartDate) : (input.arrivalDate ? new Date(input.arrivalDate) : null);
  if (!baseDate || isNaN(baseDate.getTime())) {
    return { isOverdue: false, overdueDays: 0, estimatedFeesEgp: 0, daysRemaining: null };
  }

  const freeDeadline = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  freeDeadline.setDate(freeDeadline.getDate() + Math.max(0, input.freeDays));

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((todayMidnight.getTime() - freeDeadline.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    const estimatedFeesUsd = diffDays * input.ratePerDayUsd;
    const estimatedFeesEgp = estimatedFeesUsd * input.exchangeRate;
    return {
      isOverdue: true,
      overdueDays: diffDays,
      estimatedFeesEgp: Number(estimatedFeesEgp.toFixed(2)),
      daysRemaining: 0,
    };
  } else {
    return {
      isOverdue: false,
      overdueDays: 0,
      estimatedFeesEgp: 0,
      daysRemaining: Math.abs(diffDays),
    };
  }
}
