export const WHT_TYPE_LABELS: Record<string, { label: string; rate: number; badgeStyle: React.CSSProperties }> = {
  goods: { label: 'توريدات وسلع', rate: 1, badgeStyle: { backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' } },
  services: { label: 'خدمات ومصنعيات', rate: 3, badgeStyle: { backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' } },
  professional: { label: 'مهن حرة وعمولات', rate: 5, badgeStyle: { backgroundColor: '#faf5ff', color: '#7e22ce', border: '1px solid #e9d5ff' } },
  custom: { label: 'نسبة أخرى', rate: 0, badgeStyle: { backgroundColor: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1' } },
};

export const QUARTERS = [
  { id: 'Q1', label: 'الربع الأول Q1 (يناير - مارس)', period: 'يقدم خلال شهر أبريل' },
  { id: 'Q2', label: 'الربع الثاني Q2 (أبريل - يونيو)', period: 'يقدم خلال شهر يوليو' },
  { id: 'Q3', label: 'الربع الثالث Q3 (يوليو - سبتمبر)', period: 'يقدم خلال شهر أكتوبر' },
  { id: 'Q4', label: 'الربع الرابع Q4 (أكتوبر - ديسمبر)', period: 'يقدم خلال شهر يناير' },
];
