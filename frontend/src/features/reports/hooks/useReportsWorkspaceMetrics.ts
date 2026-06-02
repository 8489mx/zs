import { useMemo } from 'react';
import type { ReportSummary } from '@/types/domain';
import type { CashMovementResponse, FinancialSummaryResponse, InventoryValueResponse, ReceivablesPayablesResponse } from '@/shared/api/accounting-reports';
import { formatCurrency } from '@/lib/format';
import { reportsSections, type ReportsSectionKey } from '@/features/reports/pages/reports.page-config';
import { formatPercent, relativePercent } from '@/features/reports/lib/reports-format';

type InventorySummary = { lowStock?: number };
type BalancesSummary = { totalItems?: number; overLimit?: number };

type MetricsInput = {
  currentSection: ReportsSectionKey;
  submittedRange: { from: string; to: string };
  report: ReportSummary | null;
  accountingFinancialSummary?: FinancialSummaryResponse | null;
  accountingCashMovement?: CashMovementResponse | null;
  accountingReceivablesPayables?: ReceivablesPayablesResponse | null;
  accountingInventoryValue?: InventoryValueResponse | null;
  inventoryQuery: { data?: { summary?: InventorySummary } };
  balancesQuery: { data?: { summary?: BalancesSummary } };
};

export function useReportsWorkspaceMetrics({
  currentSection,
  submittedRange,
  report,
  accountingFinancialSummary,
  accountingCashMovement,
  accountingReceivablesPayables,
  accountingInventoryValue,
  inventoryQuery,
  balancesQuery,
}: MetricsInput) {
  const financialCards = accountingFinancialSummary?.cards;
  const cashTotals = accountingCashMovement?.totals;
  const receivablesTotals = accountingReceivablesPayables?.totals;
  const inventoryTotals = accountingInventoryValue?.totals;
  const accountingGrossMarginPercent = financialCards?.netSales
    ? Number(((financialCards.grossProfit / Math.max(1, financialCards.netSales)) * 100).toFixed(2))
    : null;

  const executiveRows = useMemo<[string, number][]>(() => ([
    ['إجمالي البيع', financialCards?.grossSales ?? report?.sales.total ?? 0],
    ['صافي البيع', financialCards?.netSales ?? report?.sales.netSales ?? 0],
    ['إيراد الخدمات', report?.services?.total || 0],
    ['إجمالي الشراء', report?.purchases.total || 0],
    ['صافي الشراء', report?.purchases.netPurchases || 0],
    ['إجمالي المصروفات', financialCards?.operatingExpenses ?? report?.expenses.total ?? 0],
    ['مردودات وخصومات', financialCards ? financialCards.salesReturns + financialCards.salesDiscounts : report?.returns.total || 0],
    ['داخل النقدية والبنك', cashTotals?.totalIn ?? report?.treasury.cashIn ?? 0],
    ['خارج النقدية والبنك', cashTotals?.totalOut ?? report?.treasury.cashOut ?? 0],
    ['صافي حركة النقدية', cashTotals?.netMovement ?? financialCards?.netCashMovement ?? report?.treasury.net ?? 0],
    ['مجمل الربح', financialCards?.grossProfit ?? report?.commercial.grossProfit ?? 0],
    ['هامش الربح %', accountingGrossMarginPercent ?? report?.commercial.grossMarginPercent ?? 0],
    ['صافي الربح', financialCards?.netProfit ?? report?.commercial.netOperatingProfit ?? 0],
  ]), [accountingGrossMarginPercent, cashTotals, financialCards, report]);

  const rangeDays = useMemo(() => {
    const start = new Date(submittedRange.from);
    const end = new Date(submittedRange.to);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  }, [submittedRange]);

  const reportHealthRows = useMemo(() => ([
    { label: 'الأيام المغطاة', value: `${rangeDays} يوم` },
    { label: 'أصناف حرجة', value: `${inventoryQuery.data?.summary?.lowStock || 0} صنف` },
    { label: 'عملاء بمديونية', value: `${balancesQuery.data?.summary?.totalItems || 0} عميل` },
    { label: 'صافي حركة النقدية', value: formatCurrency(cashTotals?.netMovement ?? financialCards?.netCashMovement ?? report?.treasury.net ?? 0) },
  ]), [balancesQuery.data?.summary?.totalItems, cashTotals?.netMovement, financialCards?.netCashMovement, inventoryQuery.data?.summary?.lowStock, rangeDays, report?.treasury.net]);

  const operatingSignalRows = useMemo(() => ([
    { label: 'الفجوة بيع/شراء', value: formatCurrency((financialCards?.netSales ?? report?.sales.netSales ?? 0) - (report?.purchases.netPurchases || 0)) },
    { label: 'صافي الربح', value: formatCurrency(financialCards?.netProfit ?? report?.commercial.netOperatingProfit ?? 0) },
    { label: 'هامش الربح', value: formatPercent(accountingGrossMarginPercent ?? report?.commercial.grossMarginPercent ?? 0) },
    { label: 'مردودات وخصومات', value: formatCurrency(financialCards ? financialCards.salesReturns + financialCards.salesDiscounts : report?.returns.total || 0) },
  ]), [accountingGrossMarginPercent, financialCards, report]);

  const topProducts = useMemo(() => (Array.isArray(report?.topProducts) ? report.topProducts : []), [report]);
  const salesDailyAverage = rangeDays > 0 ? Number((Number(report?.sales.netSales || 0) / rangeDays).toFixed(2)) : 0;
  const purchaseDailyAverage = rangeDays > 0 ? Number((Number(report?.purchases.netPurchases || 0) / rangeDays).toFixed(2)) : 0;
  const returnRatePercent = Number(report?.sales.netSales || 0) > 0 ? Number(((Number(report?.returns.total || 0) / Math.max(1, Number(report?.sales.total || 0))) * 100).toFixed(2)) : 0;

  const spotlightValues = useMemo(() => ([
    financialCards?.netSales ?? report?.sales.netSales ?? 0,
    financialCards?.grossProfit ?? report?.commercial.grossProfit ?? 0,
    cashTotals?.netMovement ?? financialCards?.netCashMovement ?? report?.treasury.net ?? 0,
    accountingGrossMarginPercent ?? report?.commercial.grossMarginPercent ?? 0,
  ]), [accountingGrossMarginPercent, cashTotals?.netMovement, financialCards, report]);

  const spotlightCards = useMemo(() => ([
    {
      label: 'صافي البيع',
      helper: 'بعد المرتجعات والخصومات',
      value: financialCards?.netSales ?? report?.sales.netSales ?? 0,
      tone: 'primary' as const,
      formatter: formatCurrency,
      progress: relativePercent(financialCards?.netSales ?? report?.sales.netSales ?? 0, spotlightValues),
    },
    {
      label: 'مجمل الربح',
      helper: 'بعد تكلفة البضاعة',
      value: financialCards?.grossProfit ?? report?.commercial.grossProfit ?? 0,
      tone: 'success' as const,
      formatter: formatCurrency,
      progress: relativePercent(financialCards?.grossProfit ?? report?.commercial.grossProfit ?? 0, spotlightValues),
    },
    {
      label: 'صافي حركة النقدية',
      helper: 'داخل مطروحًا منه خارج خلال الفترة',
      value: cashTotals?.netMovement ?? financialCards?.netCashMovement ?? report?.treasury.net ?? 0,
      tone: (cashTotals?.netMovement ?? financialCards?.netCashMovement ?? report?.treasury.net ?? 0) >= 0 ? 'success' as const : 'danger' as const,
      formatter: formatCurrency,
      progress: relativePercent(cashTotals?.netMovement ?? financialCards?.netCashMovement ?? report?.treasury.net ?? 0, spotlightValues),
    },
    {
      label: 'هامش الربح',
      helper: 'نسبة مباشرة للنطاق الحالي',
      value: accountingGrossMarginPercent ?? report?.commercial.grossMarginPercent ?? 0,
      tone: 'warning' as const,
      formatter: (value: number) => formatPercent(value),
      decimals: 2,
      progress: Math.max(10, Math.min(100, Math.round(accountingGrossMarginPercent ?? report?.commercial.grossMarginPercent ?? 0))),
    },
  ]), [accountingGrossMarginPercent, cashTotals?.netMovement, financialCards, report, spotlightValues]);

  const movementBars = useMemo(() => ([
    { label: 'البيع', value: financialCards?.netSales ?? report?.sales.netSales ?? 0, tone: 'primary' as const },
    { label: 'الخدمات', value: report?.services?.total || 0, tone: 'success' as const },
    { label: 'الشراء', value: report?.purchases.netPurchases || 0, tone: 'warning' as const },
    { label: 'المصروفات', value: financialCards?.operatingExpenses ?? report?.expenses.total ?? 0, tone: 'danger' as const },
    { label: 'المرتجعات والخصومات', value: financialCards ? financialCards.salesReturns + financialCards.salesDiscounts : report?.returns.total || 0, tone: 'danger' as const },
  ]), [financialCards, report]);

  const sectionMeta = reportsSections.find((entry) => entry.key === currentSection) || reportsSections[0];
  const sectionGuidanceCards = useMemo(() => {
    const nextStepBySection: Record<ReportsSectionKey, string> = {
      overview: 'ابدأ بالملخص التنفيذي ثم انتقل للتبويب الذي يحتاج قرارًا مباشرًا.',
      sales: 'راجع صافي البيع ومتوسط اليوم ثم انتقل إلى أعلى الأصناف لاتخاذ قرار سريع.',
      purchases: 'قارن صافي الشراء بالبيع ثم راجع التبويب لمعرفة أين يزيد الصرف.',
      inventory: 'ابدأ بالأصناف الحرجة ثم صدّر القائمة إذا احتجت متابعة تشغيلية.',
      balances: 'راجع العملاء والموردين الأعلى رصيدًا ثم اطبع أو صدّر الذمم للمراجعة.',
      treasury: 'ركز على صافي حركة النقدية وصافي الربح قبل اتخاذ أي قرار صرف.',
      employees: 'ابدأ بفلترة الموظف ثم راجع تفاصيل نشاطه وملخصاته قبل أي إجراء إداري.',
    };
    const attentionBySection: Record<ReportsSectionKey, string> = {
      overview: formatCurrency(financialCards?.netProfit ?? report?.commercial.netOperatingProfit ?? 0),
      sales: formatCurrency(salesDailyAverage),
      purchases: formatCurrency(purchaseDailyAverage),
      inventory: inventoryTotals ? formatCurrency(inventoryTotals.totalInventoryValue) : `${inventoryQuery.data?.summary?.lowStock || 0} صنف منخفض`,
      balances: receivablesTotals ? formatCurrency(receivablesTotals.customerReceivables - receivablesTotals.supplierPayables) : `${balancesQuery.data?.summary?.overLimit || 0} فوق الحد`,
      treasury: formatCurrency(cashTotals?.netMovement ?? financialCards?.netCashMovement ?? report?.treasury.net ?? 0),
      employees: 'راجع سجل الموظفين بالتفصيل',
    };
    return [
      { key: 'section', label: 'القسم الحالي', value: sectionMeta.label },
      { key: 'next', label: 'الخطوة الأنسب الآن', value: nextStepBySection[currentSection] },
      { key: 'range', label: 'الفترة المراجعة', value: `${rangeDays} يوم` },
      { key: 'attention', label: 'أهم رقم الآن', value: attentionBySection[currentSection] },
    ];
  }, [balancesQuery.data?.summary?.overLimit, cashTotals?.netMovement, currentSection, financialCards, inventoryQuery.data?.summary?.lowStock, inventoryTotals, purchaseDailyAverage, rangeDays, receivablesTotals, report, salesDailyAverage, sectionMeta.label]);

  return {
    executiveRows,
    rangeDays,
    reportHealthRows,
    operatingSignalRows,
    topProducts,
    salesDailyAverage,
    purchaseDailyAverage,
    returnRatePercent,
    spotlightCards,
    movementBars,
    sectionMeta,
    sectionGuidanceCards,
  };
}
