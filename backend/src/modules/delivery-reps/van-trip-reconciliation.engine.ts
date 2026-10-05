/**
 * Van Trip Reconciliation Engine (Pure Calculation & Governance Engine)
 *
 * Implements mathematical trip balance equations, cash variance calculation,
 * physical stock audit reconciliation, customer credit limit evaluation,
 * odometer distance tracking, and Maker-Checker segregation of duties.
 *
 * Strict Constitutional Invariant:
 * This module is pure (0 database access, 0 I/O side effects, 0 external imports).
 * It is identically imported by the production service and unit test suites.
 */

export interface TripFinancialSummaryInput {
  loadedAmount: number;
  salesAmount: number;
  cashSales: number;
  creditSales: number;
  fieldCollections: number;
  returnsAmount: number;
  cashRefunds: number;
  countedCash: number;
  remainingVanStockValue: number;
}

export interface TripFinancialReconciliationResult {
  totalLoaded: number;
  totalSales: number;
  expectedRemainingValue: number;
  actualRemainingValue: number;
  isGoodsEquationBalanced: boolean;
  goodsEquationDiscrepancy: number;
  expectedCash: number;
  countedCash: number;
  cashVariance: number;
  cashVarianceStatus: 'balanced' | 'shortage' | 'overage';
  cashShortageAmount: number;
  cashOverageAmount: number;
}

export interface VanStockAuditItem {
  productId: number;
  productName: string;
  systemQty: number;
  countedQty?: number;
  costPrice: number;
  retailPrice: number;
}

export interface VanStockItemVariance {
  productId: number;
  productName: string;
  systemQty: number;
  countedQty: number;
  varianceQty: number;
  costPrice: number;
  retailPrice: number;
  shortageCost: number;
  overageCost: number;
  status: 'balanced' | 'shortage' | 'overage';
}

export interface VanStockAuditResult {
  totalSystemItems: number;
  auditedItemsCount: number;
  varianceItemsCount: number;
  hasStockDiscrepancy: boolean;
  totalStockShortageCost: number;
  totalStockOverageCost: number;
  netStockVarianceCost: number;
  itemVariances: VanStockItemVariance[];
}

export interface CreditLimitEvaluationParams {
  customerId: number;
  customerName: string;
  currentBalance: number;
  creditLimit: number;
  isCreditBlocked: boolean;
  creditBlockReason?: string | null;
  requestedCreditAmount: number;
}

export interface CreditLimitEvaluationResult {
  allowed: boolean;
  reasonCode?: 'CUSTOMER_BLOCKED' | 'LIMIT_EXCEEDED' | 'ZERO_OR_NEGATIVE_REQUEST';
  errorMessageAr?: string;
  currentBalance: number;
  creditLimit: number;
  requestedCreditAmount: number;
  projectedBalance: number;
  exceededAmount: number;
}

export interface OdometerEvaluationParams {
  startOdometer?: number | null;
  endOdometer?: number | null;
}

export interface OdometerEvaluationResult {
  valid: boolean;
  errorMessageAr?: string;
  startOdometer: number;
  endOdometer: number;
  distanceKm: number;
}

export interface MakerCheckerParams {
  repUserId?: number | null;
  actorUserId: number;
  actorRole: string;
  isSupervisorOrAdmin: boolean;
}

export interface MakerCheckerResult {
  allowed: boolean;
  reasonCode?: 'MAKER_CHECKER_SELF_APPROVAL' | 'UNAUTHORIZED_ROLE';
  errorMessageAr?: string;
}

export interface NightStockEvaluationParams {
  unloadRemainingToWarehouse: boolean;
  remainingItemsCount: number;
  nightStockApproved: boolean;
  nightStockNotes?: string | null;
}

export interface NightStockEvaluationResult {
  allowed: boolean;
  status: 'unloaded_to_warehouse' | 'night_stock_approved' | 'rejected_missing_approval';
  errorMessageAr?: string;
}

/**
 * Reconciles the daily van trip closing financial figures.
 * Equation: [قيمة البضاعة المحملة] = [المبيعات النقدية] + [المبيعات الآجلة] + [البضاعة المتبقية في السيارة] - [المرتجعات]
 */
export function reconcileTripFinancials(input: TripFinancialSummaryInput): TripFinancialReconciliationResult {
  const toMoney = (val: number) => Number((Number(val) || 0).toFixed(2));

  const totalLoaded = toMoney(input.loadedAmount);
  const totalSales = toMoney(input.salesAmount);
  const cashSales = toMoney(input.cashSales);
  const creditSales = toMoney(input.creditSales);
  const fieldCollections = toMoney(input.fieldCollections);
  const returnsAmount = toMoney(input.returnsAmount);
  const cashRefunds = toMoney(input.cashRefunds);
  const countedCash = toMoney(input.countedCash);
  const actualRemainingValue = toMoney(input.remainingVanStockValue);

  // Expected remaining van stock value based on loading, sales, and returns
  // Remaining = Loaded - Sales + Returns
  const expectedRemainingValue = toMoney(totalLoaded - totalSales + returnsAmount);

  // Verification of the canonical equation:
  // Accounted Goods Value = (Cash Sales + Credit Sales) + Remaining Van Stock - Customer Returns
  const accountedGoodsValue = toMoney(totalSales + actualRemainingValue - returnsAmount);
  const goodsEquationDiscrepancy = toMoney(totalLoaded - accountedGoodsValue);
  const isGoodsEquationBalanced = Math.abs(goodsEquationDiscrepancy) <= 0.05;

  // Expected Cash = Cash Sales + Collections - Cash Refunds for Returns
  const expectedCash = toMoney(cashSales + fieldCollections - cashRefunds);
  const cashVariance = toMoney(countedCash - expectedCash);

  let cashVarianceStatus: 'balanced' | 'shortage' | 'overage' = 'balanced';
  let cashShortageAmount = 0;
  let cashOverageAmount = 0;

  if (cashVariance < -0.01) {
    cashVarianceStatus = 'shortage';
    cashShortageAmount = toMoney(Math.abs(cashVariance));
  } else if (cashVariance > 0.01) {
    cashVarianceStatus = 'overage';
    cashOverageAmount = toMoney(cashVariance);
  }

  return {
    totalLoaded,
    totalSales,
    expectedRemainingValue,
    actualRemainingValue,
    isGoodsEquationBalanced,
    goodsEquationDiscrepancy,
    expectedCash,
    countedCash,
    cashVariance,
    cashVarianceStatus,
    cashShortageAmount,
    cashOverageAmount,
  };
}

/**
 * Reconciles physical stock audit of items in the van against system stock balances.
 */
export function reconcileVanStockAudit(items: VanStockAuditItem[]): VanStockAuditResult {
  const toQty = (val: number) => Number((Number(val) || 0).toFixed(4));
  const toMoney = (val: number) => Number((Number(val) || 0).toFixed(2));

  let totalStockShortageCost = 0;
  let totalStockOverageCost = 0;
  const itemVariances: VanStockItemVariance[] = [];

  for (const item of items) {
    const systemQty = toQty(item.systemQty);
    const countedQty = item.countedQty !== undefined ? toQty(item.countedQty) : systemQty;
    const varianceQty = toQty(countedQty - systemQty);
    const costPrice = Number(item.costPrice || 0);
    const retailPrice = Number(item.retailPrice || 0);

    let status: 'balanced' | 'shortage' | 'overage' = 'balanced';
    let shortageCost = 0;
    let overageCost = 0;

    if (varianceQty < -0.0001) {
      status = 'shortage';
      shortageCost = toMoney(Math.abs(varianceQty) * costPrice);
      totalStockShortageCost += shortageCost;
    } else if (varianceQty > 0.0001) {
      status = 'overage';
      overageCost = toMoney(varianceQty * costPrice);
      totalStockOverageCost += overageCost;
    }

    itemVariances.push({
      productId: item.productId,
      productName: item.productName,
      systemQty,
      countedQty,
      varianceQty,
      costPrice,
      retailPrice,
      shortageCost,
      overageCost,
      status,
    });
  }

  totalStockShortageCost = toMoney(totalStockShortageCost);
  totalStockOverageCost = toMoney(totalStockOverageCost);
  const netStockVarianceCost = toMoney(totalStockOverageCost - totalStockShortageCost);
  const varianceItemsCount = itemVariances.filter((iv) => iv.status !== 'balanced').length;

  return {
    totalSystemItems: items.length,
    auditedItemsCount: items.filter((i) => i.countedQty !== undefined).length,
    varianceItemsCount,
    hasStockDiscrepancy: varianceItemsCount > 0,
    totalStockShortageCost,
    totalStockOverageCost,
    netStockVarianceCost,
    itemVariances,
  };
}

/**
 * Evaluates whether a field credit or split sale is allowed for a customer.
 */
export function evaluateCreditLimitCheck(params: CreditLimitEvaluationParams): CreditLimitEvaluationResult {
  const currentBalance = Number((Number(params.currentBalance) || 0).toFixed(2));
  const creditLimit = Number((Number(params.creditLimit) || 0).toFixed(2));
  const requestedCreditAmount = Number((Number(params.requestedCreditAmount) || 0).toFixed(2));
  const projectedBalance = Number((currentBalance + requestedCreditAmount).toFixed(2));

  if (requestedCreditAmount <= 0) {
    return {
      allowed: false,
      reasonCode: 'ZERO_OR_NEGATIVE_REQUEST',
      errorMessageAr: 'مبلغ الائتمان المطلوب يجب أن يكون أكبر من الصفر',
      currentBalance,
      creditLimit,
      requestedCreditAmount,
      projectedBalance,
      exceededAmount: 0,
    };
  }

  if (params.isCreditBlocked) {
    const reasonDetail = params.creditBlockReason ? `: ${params.creditBlockReason}` : '';
    return {
      allowed: false,
      reasonCode: 'CUSTOMER_BLOCKED',
      errorMessageAr: `تم حظر البيع الآجل للعميل "${params.customerName}" بناءً على سياسة التحصيل والرقابة الائتمانية${reasonDetail}`,
      currentBalance,
      creditLimit,
      requestedCreditAmount,
      projectedBalance,
      exceededAmount: 0,
    };
  }

  if (creditLimit > 0 && projectedBalance > creditLimit) {
    const exceededAmount = Number((projectedBalance - creditLimit).toFixed(2));
    return {
      allowed: false,
      reasonCode: 'LIMIT_EXCEEDED',
      errorMessageAr: `تجاوز العميل "${params.customerName}" سقف الائتمان المسموح به (${creditLimit.toFixed(2)}). الرصيد الحالي: ${currentBalance.toFixed(2)}، والمطلوب: ${requestedCreditAmount.toFixed(2)}، الفائض عن السقف: ${exceededAmount.toFixed(2)}`,
      currentBalance,
      creditLimit,
      requestedCreditAmount,
      projectedBalance,
      exceededAmount,
    };
  }

  return {
    allowed: true,
    currentBalance,
    creditLimit,
    requestedCreditAmount,
    projectedBalance,
    exceededAmount: 0,
  };
}

/**
 * Validates start and end vehicle odometer readings.
 */
export function evaluateOdometerReadings(params: OdometerEvaluationParams): OdometerEvaluationResult {
  const start = params.startOdometer !== null && params.startOdometer !== undefined ? Number(params.startOdometer) : 0;
  const end = params.endOdometer !== null && params.endOdometer !== undefined ? Number(params.endOdometer) : 0;

  if (params.endOdometer !== null && params.endOdometer !== undefined && params.startOdometer !== null && params.startOdometer !== undefined) {
    if (end < start) {
      return {
        valid: false,
        errorMessageAr: `قراءة عداد نهاية الرحلة (${end}) لا يمكن أن تكون أقل من قراءة بداية الرحلة (${start})`,
        startOdometer: start,
        endOdometer: end,
        distanceKm: 0,
      };
    }
  }

  const distanceKm = Number((Math.max(0, end - start)).toFixed(2));

  return {
    valid: true,
    startOdometer: start,
    endOdometer: end,
    distanceKm,
  };
}

/**
 * Evaluates Maker-Checker segregation of duties.
 * The delivery representative who executed the trip CANNOT be the supervisor approving the settlement.
 */
export function evaluateMakerCheckerSettlement(params: MakerCheckerParams): MakerCheckerResult {
  if (params.repUserId && params.repUserId === params.actorUserId) {
    return {
      allowed: false,
      reasonCode: 'MAKER_CHECKER_SELF_APPROVAL',
      errorMessageAr: 'لا يجوز لمندوب المبيعات اعتماد وإبراء تصفية رحلته بنفسه طبقاً لمبدأ فصل المهام الرقابي (Maker-Checker)',
    };
  }

  if (!params.isSupervisorOrAdmin) {
    return {
      allowed: false,
      reasonCode: 'UNAUTHORIZED_ROLE',
      errorMessageAr: 'اعتماد وتصفية رحلة التوزيع يتطلب صلاحية مشرف أو أمين خزينة معتمد',
    };
  }

  return {
    allowed: true,
  };
}

/**
 * Evaluates whether overnight van inventory retention (Night Stock) is permitted.
 */
export function evaluateNightStockRetention(params: NightStockEvaluationParams): NightStockEvaluationResult {
  if (params.unloadRemainingToWarehouse) {
    return {
      allowed: true,
      status: 'unloaded_to_warehouse',
    };
  }

  // Stock is requested to remain in van overnight
  if (params.remainingItemsCount > 0) {
    if (!params.nightStockApproved) {
      return {
        allowed: false,
        status: 'rejected_missing_approval',
        errorMessageAr: 'إبقاء بضاعة متبقية في سيارة التوزيع لليوم التالي (Night Stock) يتطلب اعتماداً رسمياً صريحاً من المشرف مع تدوين المبررات',
      };
    }

    return {
      allowed: true,
      status: 'night_stock_approved',
    };
  }

  return {
    allowed: true,
    status: 'unloaded_to_warehouse',
  };
}
