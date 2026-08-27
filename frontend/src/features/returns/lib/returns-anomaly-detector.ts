import type { ReturnRecord, Sale } from '@/types/domain';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface SuspectFlag {
  id: string;
  label: string;
  severity: 'warning' | 'danger';
}

export interface AnalyzedReturnRecord {
  record: ReturnRecord;
  originalSale?: Sale;
  timeGapMinutes: number | null;
  flags: SuspectFlag[];
  riskLevel: RiskLevel;
  riskScore: number;
  cashierName: string;
  invoiceDocNo: string;
  returnDocNo: string;
  returnDate: string;
  saleDate: string;
}

export interface CashierRiskMetric {
  cashierKey: string;
  cashierName: string;
  salesCount: number;
  salesTotal: number;
  returnsCount: number;
  returnsTotal: number;
  returnRatePercent: number;
  rapidReturnsCount: number;
  suspectReturnsCount: number;
  riskLevel: RiskLevel;
  score: number;
}

export interface AnomalyReportSummary {
  totalSalesCount: number;
  totalSalesAmount: number;
  totalReturnsCount: number;
  totalReturnsAmount: number;
  overallReturnRatePercent: number;
  totalRapidReturnsCount: number;
  totalSuspectReturnsCount: number;
  highRiskCashiersCount: number;
  analyzedRecords: AnalyzedReturnRecord[];
  cashierMetrics: CashierRiskMetric[];
}

export interface AnomalyDetectorOptions {
  rapidReturnMinutes?: number;
  highRiskReturnRatePercent?: number;
  mediumRiskReturnRatePercent?: number;
  highValueThreshold?: number;
}

export function detectReturnsAnomalies(
  returns: ReturnRecord[],
  sales: Sale[],
  options: AnomalyDetectorOptions = {}
): AnomalyReportSummary {
  const rapidLimit = options.rapidReturnMinutes ?? 15;
  const highRateLimit = options.highRiskReturnRatePercent ?? 5;
  const medRateLimit = options.mediumRiskReturnRatePercent ?? 2.5;
  const highValLimit = options.highValueThreshold ?? 1000;

  // Build lookup map for sales
  const salesMap = new Map<string, Sale>();
  sales.forEach((sale) => {
    if (sale.id) salesMap.set(String(sale.id), sale);
    if (sale.docNo) salesMap.set(String(sale.docNo).toLowerCase(), sale);
  });

  // Calculate sales per cashier
  const cashierSalesMap = new Map<string, { name: string; count: number; total: number }>();
  sales.forEach((sale) => {
    const cashierName = String(sale.createdBy || 'كاشير عام').trim() || 'كاشير عام';
    const key = cashierName.toLowerCase();
    const current = cashierSalesMap.get(key) || { name: cashierName, count: 0, total: 0 };
    current.count += 1;
    current.total += Number(sale.total || 0);
    cashierSalesMap.set(key, current);
  });

  // Analyze each return record
  const analyzedRecords: AnalyzedReturnRecord[] = [];
  const cashierReturnsMap = new Map<string, {
    name: string;
    count: number;
    total: number;
    rapidCount: number;
    suspectCount: number;
  }>();

  returns.forEach((ret) => {
    // Only analyze sale returns for POS cashier fraud detection
    const isSaleReturn = (ret.returnType || ret.type || 'sale') === 'sale';
    if (!isSaleReturn) return;

    const cashierName = String(ret.createdByName || ret.createdBy || 'كاشير عام').trim() || 'كاشير عام';
    const cashierKey = cashierName.toLowerCase();

    // Match original sale
    let originalSale: Sale | undefined;
    if (ret.invoiceId && salesMap.has(String(ret.invoiceId))) {
      originalSale = salesMap.get(String(ret.invoiceId));
    } else if (ret.invoiceDocNo && salesMap.has(String(ret.invoiceDocNo).toLowerCase())) {
      originalSale = salesMap.get(String(ret.invoiceDocNo).toLowerCase());
    }

    // Calculate time gap in minutes
    let timeGapMinutes: number | null = null;
    const returnDateStr = ret.createdAt || ret.date || '';
    const saleDateStr = originalSale?.date || '';

    if (returnDateStr && saleDateStr) {
      const returnTime = new Date(returnDateStr).getTime();
      const saleTime = new Date(saleDateStr).getTime();
      if (!Number.isNaN(returnTime) && !Number.isNaN(saleTime) && returnTime >= saleTime) {
        timeGapMinutes = Math.round((returnTime - saleTime) / (1000 * 60));
      }
    }

    const flags: SuspectFlag[] = [];
    let riskScore = 0;

    // Trigger 1: Rapid return within threshold
    if (timeGapMinutes !== null && timeGapMinutes <= rapidLimit) {
      flags.push({
        id: 'rapid_return',
        label: `مرتجع فوري سريع (بعد ${timeGapMinutes} دقيقة فقط من البيع)`,
        severity: timeGapMinutes <= 5 ? 'danger' : 'warning',
      });
      riskScore += timeGapMinutes <= 5 ? 45 : 30;
    }

    // Trigger 2: High value refund
    const returnAmount = Number(ret.total || 0);
    if (returnAmount >= highValLimit) {
      flags.push({
        id: 'high_value',
        label: `قيمة مرتجع عالية (${returnAmount.toLocaleString('ar-EG')} ج.م)`,
        severity: 'warning',
      });
      riskScore += 20;
    }

    // Trigger 3: Anonymous Cash return (no customer linked)
    const isAnonymous = !ret.partyName && !ret.customerName && (!originalSale || !originalSale.customerId || originalSale.customerId === 'walk-in');
    const isCashRefund = (ret.refundMethod || ret.settlementMode) === 'cash' || (ret.settlementMode === 'refund' && ret.refundMethod !== 'card');
    if (isAnonymous && isCashRefund && returnAmount > 100) {
      flags.push({
        id: 'anonymous_cash',
        label: 'مرتجع نقدي لعميل غير مسجل',
        severity: 'warning',
      });
      riskScore += 15;
    }

    // Trigger 4: No matching original sale found
    if (!originalSale && ret.invoiceId) {
      flags.push({
        id: 'unmatched_sale',
        label: 'فاتورة غير مسجلة مباشرة',
        severity: 'warning',
      });
      riskScore += 15;
    }

    let riskLevel: RiskLevel = 'low';
    if (riskScore >= 40) {
      riskLevel = 'high';
    } else if (riskScore >= 20 || flags.length > 0) {
      riskLevel = 'medium';
    }

    const analyzed: AnalyzedReturnRecord = {
      record: ret,
      originalSale,
      timeGapMinutes,
      flags,
      riskLevel,
      riskScore,
      cashierName,
      invoiceDocNo: ret.invoiceDocNo || (ret.invoiceId ? `INV-${ret.invoiceId}` : '—'),
      returnDocNo: ret.docNo || ret.id,
      returnDate: returnDateStr,
      saleDate: saleDateStr,
    };

    analyzedRecords.push(analyzed);

    // Aggregate cashier stats
    const currentCashier = cashierReturnsMap.get(cashierKey) || {
      name: cashierName,
      count: 0,
      total: 0,
      rapidCount: 0,
      suspectCount: 0,
    };
    currentCashier.count += 1;
    currentCashier.total += returnAmount;
    if (timeGapMinutes !== null && timeGapMinutes <= rapidLimit) {
      currentCashier.rapidCount += 1;
    }
    if (riskLevel !== 'low') {
      currentCashier.suspectCount += 1;
    }
    cashierReturnsMap.set(cashierKey, currentCashier);
  });

  // Calculate cashier metrics
  const allCashierKeys = new Set([...cashierSalesMap.keys(), ...cashierReturnsMap.keys()]);
  const cashierMetrics: CashierRiskMetric[] = [];

  allCashierKeys.forEach((key) => {
    const salesData = cashierSalesMap.get(key) || { name: key, count: 0, total: 0 };
    const returnsData = cashierReturnsMap.get(key) || { name: salesData.name, count: 0, total: 0, rapidCount: 0, suspectCount: 0 };

    const name = returnsData.name || salesData.name || 'كاشير عام';
    const salesTotal = salesData.total;
    const returnsTotal = returnsData.total;
    const returnRatePercent = salesTotal > 0 ? Number(((returnsTotal / salesTotal) * 100).toFixed(2)) : (returnsTotal > 0 ? 100 : 0);

    let score = 0;
    if (returnRatePercent >= highRateLimit && returnsData.count >= 2) score += 40;
    else if (returnRatePercent >= medRateLimit) score += 20;

    if (returnsData.rapidCount >= 2) score += 35;
    else if (returnsData.rapidCount >= 1) score += 20;

    if (returnsData.suspectCount >= 3) score += 25;

    let riskLevel: RiskLevel = 'low';
    if (score >= 50 || (returnRatePercent >= highRateLimit && returnsData.rapidCount >= 1)) {
      riskLevel = 'high';
    } else if (score >= 25 || returnsData.rapidCount > 0 || returnsData.suspectCount > 0) {
      riskLevel = 'medium';
    }

    cashierMetrics.push({
      cashierKey: key,
      cashierName: name,
      salesCount: salesData.count,
      salesTotal,
      returnsCount: returnsData.count,
      returnsTotal,
      returnRatePercent,
      rapidReturnsCount: returnsData.rapidCount,
      suspectReturnsCount: returnsData.suspectCount,
      riskLevel,
      score,
    });
  });

  // Sort cashiers: highest risk first
  cashierMetrics.sort((a, b) => b.score - a.score || b.returnRatePercent - a.returnRatePercent);

  // Sort analyzed returns: highest risk & most recent first
  analyzedRecords.sort((a, b) => b.riskScore - a.riskScore || new Date(b.returnDate).getTime() - new Date(a.returnDate).getTime());

  const totalSalesAmount = sales.reduce((sum, s) => sum + Number(s.total || 0), 0);
  const totalReturnsAmount = returns.filter((r) => (r.returnType || r.type || 'sale') === 'sale').reduce((sum, r) => sum + Number(r.total || 0), 0);
  const overallReturnRatePercent = totalSalesAmount > 0 ? Number(((totalReturnsAmount / totalSalesAmount) * 100).toFixed(2)) : 0;
  const totalRapidReturnsCount = analyzedRecords.filter((r) => r.timeGapMinutes !== null && r.timeGapMinutes <= rapidLimit).length;
  const totalSuspectReturnsCount = analyzedRecords.filter((r) => r.riskLevel !== 'low').length;
  const highRiskCashiersCount = cashierMetrics.filter((c) => c.riskLevel === 'high').length;

  return {
    totalSalesCount: sales.length,
    totalSalesAmount,
    totalReturnsCount: returns.length,
    totalReturnsAmount,
    overallReturnRatePercent,
    totalRapidReturnsCount,
    totalSuspectReturnsCount,
    highRiskCashiersCount,
    analyzedRecords,
    cashierMetrics,
  };
}
