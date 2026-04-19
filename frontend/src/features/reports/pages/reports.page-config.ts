export type ReportsSectionKey = 'overview' | 'sales' | 'purchases' | 'inventory' | 'balances' | 'treasury' | 'employees';

export const reportsSections: Array<{ key: ReportsSectionKey; label: string; description?: string }> = [
  { key: 'overview', label: 'نظرة عامة' },
  { key: 'sales', label: 'المبيعات' },
  { key: 'purchases', label: 'المشتريات' },
  { key: 'inventory', label: 'المخزون' },
  { key: 'balances', label: 'الذمم' },
  { key: 'treasury', label: 'الخزينة والربحية' },
  { key: 'employees', label: 'الموظفون' }
];

export function isReportsSection(value: string | undefined): value is ReportsSectionKey {
  return reportsSections.some((section) => section.key === value);
}
