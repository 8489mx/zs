import { useMemo } from 'react';
import type { ReportSummary } from '@/types/domain';
import { formatCurrency } from '@/lib/format';
import { reportsSections, type ReportsSectionKey } from '@/features/reports/pages/reports.page-config';
import { formatPercent, relativePercent } from '@/features/reports/lib/reports-format';

type InventorySummary = { lowStock?: number };
type BalancesSummary = { totalItems?: number; overLimit?: number };

export function useReportsWorkspaceMetrics({ currentSection, submittedRange, report, inventoryQuery, balancesQuery }: { currentSection: ReportsSectionKey; submittedRange: { from: string; to: string }; report: ReportSummary | null; inventoryQuery: { data?: { summary?: InventorySummary } }; balancesQuery: { data?: { summary?: BalancesSummary } }; }) {
  const executiveRows = useMemo<[string, number][]>(() => ([
    ['إجمالي البيع', report?.sales.total || 0],
    ['صافي البيع', report?.sales.netSales || 0],
    ['إجمالي الشراء', report?.purchases.total || 0],
    ['صافي الشراء', report?.purchases.netPurchases || 0],
    ['إجمالي المصروفات', report?.expenses.total || 0],
    ['إجمالي المرتجعات', report?.returns.total || 0],
    ['داخل الخزينة', report?.treasury.cashIn || 0],
    ['خارج الخزينة', report?.treasury.cashOut || 0],
    ['صافي الخزينة', report?.treasury.net || 0],
    ['الربح الإجمالي', report?.commercial.grossProfit || 0],
    ['هامش الربح %', report?.commercial.grossMarginPercent || 0],
    ['الربح التشغيلي', report?.commercial.netOperatingProfit || 0],
  ]), [report]);

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
    { label: 'صافي الخزينة', value: formatCurrency(report?.treasury.net || 0) },
  ]), [balancesQuery.data?.summary?.totalItems, inventoryQuery.data?.summary?.lowStock, rangeDays, report?.treasury.net]);

  const operatingSignalRows = useMemo(() => ([
    { label: 'الفجوة بيع/شراء', value: formatCurrency((report?.sales.netSales || 0) - (report?.purchases.netPurchases || 0)) },
    { label: 'الربح التشغيلي', value: formatCurrency(report?.commercial.netOperatingProfit || 0) },
    { label: 'هامش الربح', value: formatPercent(report?.commercial.grossMarginPercent || 0) },
    { label: 'إجمالي المرتجعات', value: formatCurrency(report?.returns.total || 0) },
  ]), [report]);

  const topProducts = useMemo(() => (Array.isArray(report?.topProducts) ? report.topProducts : []), [report]);
  const salesDailyAverage = rangeDays > 0 ? Number((Number(report?.sales.netSales || 0) / rangeDays).toFixed(2)) : 0;
  const purchaseDailyAverage = rangeDays > 0 ? Number((Number(report?.purchases.netPurchases || 0) / rangeDays).toFixed(2)) : 0;
  const returnRatePercent = Number(report?.sales.netSales || 0) > 0 ? Number(((Number(report?.returns.total || 0) / Math.max(1, Number(report?.sales.total || 0))) * 100).toFixed(2)) : 0;

  const spotlightValues = useMemo(() => ([
    report?.sales.netSales || 0,
    report?.commercial.grossProfit || 0,
    report?.treasury.net || 0,
    report?.commercial.grossMarginPercent || 0,
  ]), [report]);

  const spotlightCards = useMemo(() => ([
    {
      label: 'صافي البيع',
      helper: 'بعد الخصومات والضرائب',
      value: report?.sales.netSales || 0,
      tone: 'primary' as const,
      formatter: formatCurrency,
      progress: relativePercent(report?.sales.netSales || 0, spotlightValues),
    },
    {
      label: 'الربح الإجمالي',
      helper: 'قبل المصروفات التشغيلية',
      value: report?.commercial.grossProfit || 0,
      tone: 'success' as const,
      formatter: formatCurrency,
      progress: relativePercent(report?.commercial.grossProfit || 0, spotlightValues),
    },
    {
      label: 'صافي الخزينة',
      helper: 'داخل مطروحًا منه خارج',
      value: report?.treasury.net || 0,
      tone: (report?.treasury.net || 0) >= 0 ? 'success' as const : 'danger' as const,
      formatter: formatCurrency,
      progress: relativePercent(report?.treasury.net || 0, spotlightValues),
    },
    {
      label: 'هامش الربح',
      helper: 'نسبة مباشرة للنطاق الحالي',
      value: report?.commercial.grossMarginPercent || 0,
      tone: 'warning' as const,
      formatter: (value: number) => formatPercent(value),
      decimals: 2,
      progress: Math.max(10, Math.min(100, Math.round(report?.commercial.grossMarginPercent || 0))),
    },
  ]), [report, spotlightValues]);

  const movementBars = useMemo(() => ([
    { label: 'البيع', value: report?.sales.netSales || 0, tone: 'primary' as const },
    { label: 'الشراء', value: report?.purchases.netPurchases || 0, tone: 'warning' as const },
    { label: 'المصروفات', value: report?.expenses.total || 0, tone: 'danger' as const },
    { label: 'المرتجعات', value: report?.returns.total || 0, tone: 'danger' as const },
  ]), [report]);

  const sectionMeta = reportsSections.find((entry) => entry.key === currentSection) || reportsSections[0];
  const sectionGuidanceCards = useMemo(() => {
    const nextStepBySection: Record<ReportsSectionKey, string> = {
      overview: 'ابدأ بالملخص التنفيذي ثم انزل للتبويب الذي يحتاج قرارًا مباشرًا.',
      sales: 'راجع صافي البيع ومتوسط اليوم ثم انزل إلى أعلى الأصناف لاتخاذ قرار سريع.',
      purchases: 'قارن صافي الشراء بالبيع ثم راجع التبويب لمعرفة أين يزيد الصرف.',
      inventory: 'ابدأ بالأصناف الحرجة ثم صدّر القائمة إذا احتجت متابعة تشغيلية.',
      balances: 'راجع العملاء الأعلى رصيدًا ثم اطبع أو صدّر الذمم للمراجعة.',
      treasury: 'ركّز على صافي الخزينة والربح التشغيلي قبل اتخاذ أي قرار صرف.',
      employees: 'ابدأ بفلترة الموظف ثم راجع تفاصيل نشاطه وملخصاته قبل اتخاذ أي إجراء إداري.',
    };
    const attentionBySection: Record<ReportsSectionKey, string> = {
      overview: report ? formatCurrency(report.commercial.netOperatingProfit || 0) : formatCurrency(0),
      sales: formatCurrency(salesDailyAverage),
      purchases: formatCurrency(purchaseDailyAverage),
      inventory: `${inventoryQuery.data?.summary?.lowStock || 0} صنف منخفض`,
      balances: `${balancesQuery.data?.summary?.overLimit || 0} فوق الحد`,
      treasury: formatCurrency(report?.treasury.net || 0),
      employees: 'راجع سجل الموظفين بالتفصيل',
    };
    return [
      { key: 'section', label: 'القسم الحالي', value: sectionMeta.label },
      { key: 'next', label: 'الخطوة الأنسب الآن', value: nextStepBySection[currentSection] },
      { key: 'range', label: 'الفترة المراجعة', value: `${rangeDays} يوم` },
      { key: 'attention', label: 'أهم رقم الآن', value: attentionBySection[currentSection] },
    ];
  }, [balancesQuery.data?.summary?.overLimit, currentSection, inventoryQuery.data?.summary?.lowStock, purchaseDailyAverage, rangeDays, report, salesDailyAverage, sectionMeta.label]);

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
