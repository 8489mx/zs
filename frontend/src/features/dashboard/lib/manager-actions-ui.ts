import type { ManagerActionInsight } from '@/features/dashboard/api/dashboard.types';

export const managerActionSeverityLabels: Record<ManagerActionInsight['severity'], string> = {
  danger: 'عاجل',
  warning: 'تنبيه',
  info: 'متابعة',
};

export const managerActionSeverityClasses: Record<ManagerActionInsight['severity'], string> = {
  danger: 'manager-action-item-danger',
  warning: 'manager-action-item-warning',
  info: 'manager-action-item-info',
};

const importantSeverityOrder: Record<ManagerActionInsight['severity'], number> = {
  danger: 3,
  warning: 2,
  info: 1,
};

export function sortManagerActionsByImportance(actions: ManagerActionInsight[]) {
  return [...actions].sort((a, b) => (
    importantSeverityOrder[b.severity] - importantSeverityOrder[a.severity]
    || a.title.localeCompare(b.title, 'ar')
  ));
}

export function importantManagerActions(actions: ManagerActionInsight[]) {
  return sortManagerActionsByImportance(actions).filter((action) => action.severity === 'danger' || action.severity === 'warning');
}

function formatMetricNumber(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 1 }).format(numeric);
}

export function buildManagerActionMetricLabels(metrics?: Record<string, unknown>): string[] {
  if (!metrics) return [];

  const labels: string[] = [];
  const stockQty = formatMetricNumber(metrics.stockQty);
  const minStockQty = formatMetricNumber(metrics.minStockQty);
  const marginRate = formatMetricNumber(metrics.marginRate);
  const discountRate = formatMetricNumber(metrics.discountRate);
  const balance = formatMetricNumber(metrics.balance);
  const creditLimit = formatMetricNumber(metrics.creditLimit);
  const daysWithoutSales = formatMetricNumber(metrics.daysWithoutSales);
  const inventoryValue = formatMetricNumber(metrics.inventoryValue);

  if (stockQty && minStockQty) labels.push(`المخزون ${stockQty} / الحد ${minStockQty}`);
  if (marginRate) labels.push(`الهامش ${marginRate}%`);
  if (discountRate) labels.push(`الخصم ${discountRate}%`);
  if (balance && creditLimit) labels.push(`الرصيد ${balance} / الحد ${creditLimit}`);
  if (daysWithoutSales) labels.push(`${daysWithoutSales} يوم بدون بيع`);
  if (inventoryValue) labels.push(`قيمة المخزون ${inventoryValue}`);

  return labels.slice(0, 2);
}
