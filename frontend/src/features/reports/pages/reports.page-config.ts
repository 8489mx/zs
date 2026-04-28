export type ReportsSectionKey = 'overview' | 'sales' | 'purchases' | 'inventory' | 'balances' | 'treasury' | 'employees';

export const reportsSections: Array<{ key: ReportsSectionKey; label: string; description?: string }> = [
  { key: 'overview', label: 'نظرة عامة' },
  { key: 'sales', label: 'المبيعات' },
  { key: 'treasury', label: 'الخزينة والربحية' },
  { key: 'inventory', label: 'المخزون' },
  { key: 'balances', label: 'الذمم' },
  { key: 'purchases', label: 'المشتريات' },
  { key: 'employees', label: 'الموظفون' },
];

export function isReportsSection(value: string | undefined): value is ReportsSectionKey {
  return reportsSections.some((section) => section.key === value);
}
