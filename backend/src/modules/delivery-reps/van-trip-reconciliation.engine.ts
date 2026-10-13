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
  tripExpenses?: number;
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
  totalTripExpenses: number;
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
  customerType?: string | null;
  isFieldCreatedCustomer?: boolean;
  requestedCreditAmount: number;
  hasOverdueInvoices?: boolean;
  oldestOverdueDays?: number;
  overdueAmount?: number;
  supervisorOverride?: {
    approved: boolean;
    supervisorId?: number;
    supervisorName?: string;
    reason?: string;
  };
}

export interface CreditLimitEvaluationResult {
  allowed: boolean;
  isOverridden?: boolean;
  overrideReason?: string;
  reasonCode?: 'CUSTOMER_BLOCKED' | 'CASH_ONLY_CUSTOMER' | 'LIMIT_EXCEEDED' | 'ZERO_OR_NEGATIVE_REQUEST' | 'SUPERVISOR_OVERRIDE' | 'CUSTOMER_HAS_OVERDUE_INVOICES';
  errorMessageAr?: string;
  currentBalance: number;
  creditLimit: number;
  requestedCreditAmount: number;
  projectedBalance: number;
  exceededAmount: number;
}

export interface FieldCardPaymentEvaluationParams {
  totalSaleAmount: number;
  referenceReason?: string | null;
  supervisorOverride?: {
    approved: boolean;
    supervisorId?: number;
    supervisorName?: string;
    reason?: string;
  };
}

export interface FieldCardPaymentEvaluationResult {
  allowed: boolean;
  reasonCode?: 'CARD_PAYMENT_REQUIRES_SUPERVISOR_PIN' | 'CARD_PAYMENT_REFERENCE_REQUIRED' | 'SUPERVISOR_APPROVED';
  errorMessageAr?: string;
  approvedReference?: string;
}

export interface TripExpenseGovernanceParams {
  expenseType: string;
  amount: number;
  notes?: string | null;
  existingTripExpenses: number;
  maxSinglePettyExpense?: number;
  maxCumulativePettyExpenses?: number;
  supervisorOverride?: {
    approved: boolean;
    supervisorId?: number;
    supervisorName?: string;
  };
}

export interface TripExpenseGovernanceResult {
  allowed: boolean;
  requiresSupervisorPin: boolean;
  reasonCode?: 'INVALID_AMOUNT' | 'EXPENSE_NOTES_REQUIRED' | 'EXPENSE_REQUIRES_SUPERVISOR_PIN' | 'SUPERVISOR_APPROVED' | 'ROUTINE_PETTY_ALLOWED';
  errorMessageAr?: string;
  projectedTripExpenses: number;
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
  const totalTripExpenses = toMoney(input.tripExpenses || 0);
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

  // Expected Cash = Cash Sales + Collections - Cash Refunds for Returns - Approved Trip Expenses
  const expectedCash = toMoney(cashSales + fieldCollections - cashRefunds - totalTripExpenses);
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
    totalTripExpenses,
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
    if (params.supervisorOverride?.approved) {
      return {
        allowed: true,
        isOverridden: true,
        overrideReason: params.supervisorOverride.reason || 'اعتماد استثنائي من المشرف لتجاوز حظر العميل',
        reasonCode: 'SUPERVISOR_OVERRIDE',
        currentBalance,
        creditLimit,
        requestedCreditAmount,
        projectedBalance,
        exceededAmount: 0,
      };
    }
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

  if (params.hasOverdueInvoices && (Number(params.overdueAmount || 0) > 0 || Number(params.oldestOverdueDays || 0) > 0)) {
    if (params.supervisorOverride?.approved) {
      return {
        allowed: true,
        isOverridden: true,
        overrideReason: params.supervisorOverride.reason || 'اعتماد استثنائي من المشرف لتجاوز حظر الفواتير المتأخرة',
        reasonCode: 'SUPERVISOR_OVERRIDE',
        currentBalance,
        creditLimit,
        requestedCreditAmount,
        projectedBalance,
        exceededAmount: 0,
      };
    }
    const overdueDays = params.oldestOverdueDays || 0;
    const overdueAmt = Number(params.overdueAmount || 0).toFixed(2);
    return {
      allowed: false,
      reasonCode: 'CUSTOMER_HAS_OVERDUE_INVOICES',
      errorMessageAr: `يوجد على العميل "${params.customerName}" فواتير متأخرة مستحقة السداد منذ (${overdueDays}) يوماً بإجمالي (${overdueAmt} ج.م). يجب سداد الفواتير المتأخرة أو إدخال رمز اعتماد المشرف (Supervisor PIN)`,
      currentBalance,
      creditLimit,
      requestedCreditAmount,
      projectedBalance,
      exceededAmount: 0,
    };
  }

  const isCashOnlyOrFieldCustomer =
    (String(params.customerType || '').toLowerCase() === 'cash' || Boolean(params.isFieldCreatedCustomer)) &&
    creditLimit <= 0;

  if (isCashOnlyOrFieldCustomer) {
    if (params.supervisorOverride?.approved) {
      return {
        allowed: true,
        isOverridden: true,
        overrideReason:
          params.supervisorOverride.reason || 'اعتماد استثنائي من المشرف للبيع الآجل لعميل نقدي بدون سقف ائتماني',
        reasonCode: 'SUPERVISOR_OVERRIDE',
        currentBalance,
        creditLimit,
        requestedCreditAmount,
        projectedBalance,
        exceededAmount: requestedCreditAmount,
      };
    }
    return {
      allowed: false,
      reasonCode: 'CASH_ONLY_CUSTOMER',
      errorMessageAr: `العميل "${params.customerName}" مصنف كعميل نقدي (سقف الائتمان = 0.00)؛ لا يُسمح بالبيع الآجل أو الجزئي له إلا بعد تخصيص سقف ائتمان من الإدارة أو إدخال رمز اعتماد المشرف (Supervisor PIN)`,
      currentBalance,
      creditLimit,
      requestedCreditAmount,
      projectedBalance,
      exceededAmount: requestedCreditAmount,
    };
  }

  if (creditLimit > 0 && projectedBalance > creditLimit) {
    const exceededAmount = Number((projectedBalance - creditLimit).toFixed(2));
    if (params.supervisorOverride?.approved) {
      return {
        allowed: true,
        isOverridden: true,
        overrideReason: params.supervisorOverride.reason || `اعتماد استثنائي لتجاوز سقف الائتمان بمقدار ${exceededAmount.toFixed(2)}`,
        reasonCode: 'SUPERVISOR_OVERRIDE',
        currentBalance,
        creditLimit,
        requestedCreditAmount,
        projectedBalance,
        exceededAmount,
      };
    }
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

/**
 * Evaluates field card/bank transfer payment governance.
 * Prevents a field rep from collecting cash from a customer while marking the invoice as "card"
 * without a verified POS receipt/bank transfer reference and Supervisor PIN authorization.
 */
export function evaluateFieldCardPayment(params: FieldCardPaymentEvaluationParams): FieldCardPaymentEvaluationResult {
  const reference = String(params.referenceReason || params.supervisorOverride?.reason || '').trim();

  if (!params.supervisorOverride?.approved) {
    return {
      allowed: false,
      reasonCode: 'CARD_PAYMENT_REQUIRES_SUPERVISOR_PIN',
      errorMessageAr: 'الدفع بالشبكة أو التحويل البنكي في الميدان يتطلب إدخال رمز اعتماد المشرف (Supervisor PIN) للتحقق من وصول الإشعار البنكي ومنع التلاعب بالنقدية المحصلة',
    };
  }

  if (reference.length < 3) {
    return {
      allowed: false,
      reasonCode: 'CARD_PAYMENT_REFERENCE_REQUIRED',
      errorMessageAr: 'يرجى تدوين رقم مرجع إيصال الشبكة أو الحوالة البنكية (3 أحرف/أرقام على الأقل) لاعتماد عملية الدفع بالبطاقة',
    };
  }

  return {
    allowed: true,
    reasonCode: 'SUPERVISOR_APPROVED',
    approvedReference: reference,
  };
}

/**
 * Evaluates field trip operational expense governance.
 * Enforces mandatory justification notes, routine petty ceilings (fuel & toll up to 250 single / 400 cumulative),
 * and requires Supervisor PIN for non-routine categories (maintenance, tips, meals, other) or amounts exceeding ceilings.
 */
export function evaluateTripExpenseGovernance(params: TripExpenseGovernanceParams): TripExpenseGovernanceResult {
  const amount = Number((Number(params.amount) || 0).toFixed(2));
  const existing = Number((Number(params.existingTripExpenses) || 0).toFixed(2));
  const projectedTripExpenses = Number((existing + amount).toFixed(2));
  const maxSingle = params.maxSinglePettyExpense ?? 250;
  const maxCumulative = params.maxCumulativePettyExpenses ?? 400;
  const trimmedNotes = String(params.notes || '').trim();
  const normalizedType = String(params.expenseType || '').trim().toLowerCase();

  if (amount <= 0) {
    return {
      allowed: false,
      requiresSupervisorPin: false,
      reasonCode: 'INVALID_AMOUNT',
      errorMessageAr: 'مبلغ المصروف يجب أن يكون أكبر من الصفر',
      projectedTripExpenses,
    };
  }

  if (trimmedNotes.length < 3) {
    return {
      allowed: false,
      requiresSupervisorPin: false,
      reasonCode: 'EXPENSE_NOTES_REQUIRED',
      errorMessageAr: 'يجب تدوين البيان التفصيلي أو رقم الفاتورة/الإيصال لكل مصروف ميداني (3 أحرف على الأقل) لضبط الرقابة المالية',
      projectedTripExpenses,
    };
  }

  const isRoutinePettyCategory = normalizedType === 'fuel' || normalizedType === 'toll';
  const exceedsSingleCeiling = amount > maxSingle;
  const exceedsCumulativeCeiling = projectedTripExpenses > maxCumulative;
  const requiresSupervisorPin = !isRoutinePettyCategory || exceedsSingleCeiling || exceedsCumulativeCeiling;

  if (requiresSupervisorPin && !params.supervisorOverride?.approved) {
    let reasonDetail = '';
    if (!isRoutinePettyCategory) {
      reasonDetail = `تصنيف المصروف (${normalizedType}) غير روتيني`;
    } else if (exceedsSingleCeiling) {
      reasonDetail = `المبلغ (${amount.toFixed(2)}) يتجاوز السقف المسموح للمصروف النثري المفرد (${maxSingle.toFixed(2)})`;
    } else {
      reasonDetail = `إجمالي مصروفات الرحلة (${projectedTripExpenses.toFixed(2)}) يتجاوز السقف التراكمي النثري للرحلة (${maxCumulative.toFixed(2)})`;
    }
    return {
      allowed: false,
      requiresSupervisorPin: true,
      reasonCode: 'EXPENSE_REQUIRES_SUPERVISOR_PIN',
      errorMessageAr: `تسجيل هذا المصروف يتطلب رمز اعتماد المشرف (Supervisor PIN) لأن ${reasonDetail}، وذلك لمنع اقتطاع مبالغ غير معتمدة من عهدة النقدية`,
      projectedTripExpenses,
    };
  }

  return {
    allowed: true,
    requiresSupervisorPin,
    reasonCode: params.supervisorOverride?.approved ? 'SUPERVISOR_APPROVED' : 'ROUTINE_PETTY_ALLOWED',
    projectedTripExpenses,
  };
}

