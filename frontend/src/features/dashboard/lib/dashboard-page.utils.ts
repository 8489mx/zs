import { downloadCsvFile, escapeHtml, printHtmlDocument } from '@/lib/browser';
import { formatCurrency } from '@/lib/format';
import type { DashboardOverviewPayload, DashboardTopItem } from '@/features/dashboard/api/dashboard.types';

export const dashboardQuickLinks = [
  { to: '/pos', label: 'بيع جديد', hint: 'افتح الكاشير وابدأ فاتورة فورًا' },
  { to: '/sales', label: 'سجل الفواتير', hint: 'راجع فواتير البيع والطباعة والتعديل' },
  { to: '/cash-drawer', label: 'وردية الكاشير', hint: 'تابع الصندوق وحالة الوردية' },
  { to: '/products', label: 'الأصناف', hint: 'أضف صنفًا أو راجع الأسعار' },
  { to: '/purchases', label: 'شراء جديد', hint: 'سجل فاتورة شراء جديدة' },
  { to: '/reports', label: 'التقارير', hint: 'راجع ملخص البيع والربح والخزينة' }
] as const;

export interface DashboardAlert {
  cls: string;
  title: string;
  text: string;
}

export function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
}

export function formatInteger(value: number) {
  return new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 }).format(value);
}

export function buildDashboardAlerts(payload: DashboardOverviewPayload): DashboardAlert[] {
  const { lowStock, stats } = payload;
  return [
    lowStock.length ? { cls: 'alert-warning', title: 'مخزون منخفض', text: `يوجد ${lowStock.length} صنف يحتاج متابعة` } : null,
    Number(stats.aboveCreditLimit || 0) ? { cls: 'alert-critical', title: 'تجاوز حد الائتمان', text: `${stats.aboveCreditLimit} عميل تجاوز الحد المسموح` } : null,
    Number(stats.nearCreditLimit || 0) ? { cls: 'alert-warning', title: 'قرب الوصول للحد', text: `${stats.nearCreditLimit} عميل قريب من حد الائتمان` } : null,
    Number(stats.highSupplierBalances || 0) ? { cls: 'alert-warning', title: 'رصيد موردين مرتفع', text: `${stats.highSupplierBalances} مورد لديهم رصيد مرتفع` } : null,
    Number(stats.activeOffers || 0) ? { cls: 'alert-info', title: 'عروض نشطة', text: `يوجد ${stats.activeOffers} عرض فعال حاليًا` } : null
  ].filter(Boolean) as DashboardAlert[];
}

export function exportDashboardSnapshot(payload: DashboardOverviewPayload) {
  const { summary, stats } = payload;
  const rows = [
    ['عدد الأصناف', stats.productsCount],
    ['مبيعات اليوم', Number(stats.todaySalesAmount || 0)],
    ['مشتريات اليوم', Number(stats.todayPurchasesAmount || 0)],
    ['رصيد الخزينة', Number(summary.treasury.net || 0)],
    ['قيمة المخزون بالتكلفة', Number(stats.inventoryCost || 0)],
    ['قيمة المخزون بالبيع', Number(stats.inventorySaleValue || 0)],
    ['ديون العملاء', Number(stats.customerDebt || 0)],
    ['ديون الموردين', Number(stats.supplierDebt || 0)],
    ['العروض النشطة', Number(stats.activeOffers || 0)],
    ['العملاء قرب الحد', Number(stats.nearCreditLimit || 0)],
    ['العملاء فوق الحد', Number(stats.aboveCreditLimit || 0)],
    ['الموردون برصيد مرتفع', Number(stats.highSupplierBalances || 0)],
    ['مصروفات الفترة', Number(summary.expenses.total || 0)],
    ['المرتجعات', Number(summary.returns.total || 0)],
    ['الربح الإجمالي', Number(summary.commercial.grossProfit || 0)],
    ['الربح التشغيلي', Number(summary.commercial.netOperatingProfit || 0)]
  ];

  downloadCsvFile('dashboard-snapshot.csv', ['المؤشر', 'القيمة'], rows);
}

function buildTopTodayRows(topToday: DashboardTopItem[]) {
  return topToday.map((row) => `<tr><td>${escapeHtml(row.name)}</td><td>${row.qty}</td><td>${escapeHtml(formatCurrency(row.total))}</td></tr>`).join('') || '<tr><td colspan="3">لا توجد حركة بيع اليوم</td></tr>';
}

function buildAlertRows(alerts: DashboardAlert[]) {
  return alerts.map((alert) => `<tr><td>${escapeHtml(alert.title)}</td><td>${escapeHtml(alert.text)}</td></tr>`).join('') || '<tr><td colspan="2">لا توجد تنبيهات حالية</td></tr>';
}

export function printDashboardSnapshot(payload: DashboardOverviewPayload, alerts: DashboardAlert[]) {
  const { summary, stats, topToday } = payload;
  const sections = [
    ['عدد الأصناف', stats.productsCount],
    ['مبيعات اليوم', formatCurrency(Number(stats.todaySalesAmount || 0))],
    ['مشتريات اليوم', formatCurrency(Number(stats.todayPurchasesAmount || 0))],
    ['رصيد الخزينة', formatCurrency(Number(summary.treasury.net || 0))],
    ['قيمة المخزون بالتكلفة', formatCurrency(Number(stats.inventoryCost || 0))],
    ['قيمة المخزون بالبيع', formatCurrency(Number(stats.inventorySaleValue || 0))],
    ['ديون العملاء', formatCurrency(Number(stats.customerDebt || 0))],
    ['ديون الموردين', formatCurrency(Number(stats.supplierDebt || 0))],
    ['العروض النشطة', String(Number(stats.activeOffers || 0))],
    ['قرب الحد', String(Number(stats.nearCreditLimit || 0))],
    ['تجاوز الحد', String(Number(stats.aboveCreditLimit || 0))],
    ['موردون برصيد مرتفع', String(Number(stats.highSupplierBalances || 0))],
    ['الربح الإجمالي', formatCurrency(Number(summary.commercial.grossProfit || 0))],
    ['الربح التشغيلي', formatCurrency(Number(summary.commercial.netOperatingProfit || 0))]
  ];

  printHtmlDocument('ملخص الرئيسية', `
    <h1>الرئيسية</h1>
    <div class="meta">ملخص تشغيلي سريع من الشاشة الرئيسية.</div>
    <div class="section">
      <h2>المؤشرات الرئيسية</h2>
      <table>
        <tbody>${sections.map(([label, value]) => `<tr><th>${escapeHtml(String(label))}</th><td>${escapeHtml(String(value))}</td></tr>`).join('')}</tbody>
      </table>
    </div>
    <div class="section">
      <h2>أعلى أصناف اليوم</h2>
      <table>
        <thead><tr><th>الصنف</th><th>الكمية</th><th>الإجمالي</th></tr></thead>
        <tbody>${buildTopTodayRows(topToday)}</tbody>
      </table>
    </div>
    <div class="section">
      <h2>التنبيهات</h2>
      <table>
        <thead><tr><th>العنوان</th><th>التفصيل</th></tr></thead>
        <tbody>${buildAlertRows(alerts)}</tbody>
      </table>
    </div>
  `);
}
