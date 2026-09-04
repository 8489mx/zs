export type ReportsSectionKey = 'overview' | 'sales' | 'purchases' | 'inventory' | 'balances' | 'treasury' | 'employees' | 'aging' | 'forecasting';

export const reportsSections: Array<{ key: ReportsSectionKey; label: string; description?: string }> = [
  { key: 'overview', label: 'نظرة عامة' },
  { key: 'sales', label: 'المبيعات' },
  { key: 'treasury', label: 'الخزنة والربحية' },
  { key: 'inventory', label: 'المخزون' },
  { key: 'balances', label: 'الذمم' },
  { key: 'aging', label: 'أعمار الديون' },
  { key: 'forecasting', label: 'التنبؤ بالطلب' },
  { key: 'purchases', label: 'المشتريات' },
  { key: 'employees', label: 'الموظفون' },
];

export function isReportsSection(value: string | undefined): value is ReportsSectionKey {
  return reportsSections.some((section) => section.key === value);
}
