import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  return (
    <section className="dashboard-premium-stats-grid" aria-label={t('dashboard.dashboard_metrics_section.s0', "أهم مؤشرات المتجر")}>
      <DashboardMetricCard label={t('dashboard.dashboard_metrics_section.s1', "عدد الأصناف")} value={productsCount} helper={t('dashboard.dashboard_metrics_section.s2', "إجمالي الأصناف المسجلة")} tone="primary" formatter={formatInteger} />
      <DashboardMetricCard label={t('dashboard.dashboard_metrics_section.s3', "مشتريات اليوم")} value={todayPurchasesAmount} helper={t('dashboard.dashboard_metrics_section.s4', "إجمالي الشراء اليوم")} tone="warning" />
      <DashboardMetricCard label={t('dashboard.dashboard_metrics_section.s5', "المخزون بالتكلفة")} value={inventoryCost} helper={t('dashboard.dashboard_metrics_section.s6', "رأس المال داخل المخزون")} tone="primary" />
      <DashboardMetricCard label={t('dashboard.dashboard_metrics_section.s7', "المخزون بالبيع")} value={inventorySaleValue} helper={t('dashboard.dashboard_metrics_section.s8', "القيمة البيعية المتوقعة")} tone="success" />
      <DashboardMetricCard label={t('dashboard.dashboard_metrics_section.s9', "ديون العملاء")} value={customerDebt} helper={t('dashboard.dashboard_metrics_section.s10', "إجمالي البيع الآجل")} tone="danger" />
      <DashboardMetricCard label={t('dashboard.dashboard_metrics_section.s11', "ديون الموردين")} value={supplierDebt} helper={t('dashboard.dashboard_metrics_section.s12', "إجمالي الشراء الآجل")} tone="warning" />
    </section>
  );
}
