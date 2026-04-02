import { DashboardMetricCard } from '@/features/dashboard/components/DashboardMetricCard';
import { formatInteger } from '@/features/dashboard/lib/dashboard-page.utils';

interface DashboardMetricsSectionProps {
  productsCount: number;
  todayPurchasesAmount: number;
  inventoryCost: number;
  inventorySaleValue: number;
  customerDebt: number;
  supplierDebt: number;
}

export function DashboardMetricsSection({
  productsCount,
  todayPurchasesAmount,
  inventoryCost,
  inventorySaleValue,
  customerDebt,
  supplierDebt,
}: DashboardMetricsSectionProps) {
  return (
    <section className="dashboard-premium-stats-grid" aria-label="أهم مؤشرات المتجر">
      <DashboardMetricCard label="عدد الأصناف" value={productsCount} helper="إجمالي الأصناف المسجلة" tone="primary" formatter={formatInteger} />
      <DashboardMetricCard label="مشتريات اليوم" value={todayPurchasesAmount} helper="إجمالي الشراء اليوم" tone="warning" />
      <DashboardMetricCard label="المخزون بالتكلفة" value={inventoryCost} helper="رأس المال داخل المخزون" tone="primary" />
      <DashboardMetricCard label="المخزون بالبيع" value={inventorySaleValue} helper="القيمة البيعية المتوقعة" tone="success" />
      <DashboardMetricCard label="ديون العملاء" value={customerDebt} helper="إجمالي البيع الآجل" tone="danger" />
      <DashboardMetricCard label="ديون الموردين" value={supplierDebt} helper="إجمالي الشراء الآجل" tone="warning" />
    </section>
  );
}
