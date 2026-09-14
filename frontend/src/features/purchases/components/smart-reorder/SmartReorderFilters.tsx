import { CustomSelect } from '@/shared/ui/custom-select';

interface SmartReorderFiltersProps {
  daysAnalysis: number;
  setDaysAnalysis: (v: number) => void;
  targetCoverageDays: number;
  setTargetCoverageDays: (v: number) => void;
  defaultLeadTimeDays: number;
  setDefaultLeadTimeDays: (v: number) => void;
  urgencyFilter: 'all' | 'needs_reorder' | 'out_of_stock' | 'critical' | 'warning';
  setUrgencyFilter: (v: 'all' | 'needs_reorder' | 'out_of_stock' | 'critical' | 'warning') => void;
  search: string;
  setSearch: (v: string) => void;
}

const DAYS_ANALYSIS_OPTIONS = [
  { value: 14, label: 'آخر 14 يوماً' },
  { value: 30, label: 'آخر 30 يوماً (موصى به)' },
  { value: 60, label: 'آخر 60 يوماً' },
  { value: 90, label: 'آخر 90 يوماً' },
];

const TARGET_COVERAGE_OPTIONS = [
  { value: 14, label: '14 يوماً' },
  { value: 30, label: '30 يوماً (شهر كامل)' },
  { value: 45, label: '45 يوماً' },
  { value: 60, label: '60 يوماً' },
];

const LEAD_TIME_OPTIONS = [
  { value: 2, label: '2 أيام' },
  { value: 3, label: '3 أيام (افتراضي)' },
  { value: 5, label: '5 أيام' },
  { value: 7, label: '7 أيام' },
  { value: 14, label: '14 يوماً' },
];

const URGENCY_OPTIONS = [
  { value: 'needs_reorder', label: 'يحتاج إعادة طلب فقط' },
  { value: 'out_of_stock', label: 'نافد المخزون فقط' },
  { value: 'critical', label: 'حرج ووشيك النفاد' },
  { value: 'warning', label: 'تحذيري فقط' },
  { value: 'all', label: 'جميع الأصناف' },
];

export function SmartReorderFilters({
  daysAnalysis,
  setDaysAnalysis,
  targetCoverageDays,
  setTargetCoverageDays,
  defaultLeadTimeDays,
  setDefaultLeadTimeDays,
  urgencyFilter,
  setUrgencyFilter,
  search,
  setSearch,
}: SmartReorderFiltersProps) {
  return (
    <section
      className="workspace-panel"
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '20px',
        marginTop: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '160px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>فترة تحليل المبيعات:</label>
            <CustomSelect
              value={daysAnalysis}
              onChange={(val) => setDaysAnalysis(Number(val))}
              options={DAYS_ANALYSIS_OPTIONS}
              searchable={false}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '160px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>أيام التغطية المستهدفة:</label>
            <CustomSelect
              value={targetCoverageDays}
              onChange={(val) => setTargetCoverageDays(Number(val))}
              options={TARGET_COVERAGE_OPTIONS}
              searchable={false}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '150px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>فترة التوريد الافتراضية:</label>
            <CustomSelect
              value={defaultLeadTimeDays}
              onChange={(val) => setDefaultLeadTimeDays(Number(val))}
              options={LEAD_TIME_OPTIONS}
              searchable={false}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '180px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>مستوى الإلحاح:</label>
            <CustomSelect
              value={urgencyFilter}
              onChange={(val) => setUrgencyFilter(val as any)}
              options={URGENCY_OPTIONS}
              searchable={false}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '260px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>بحث سريع بالصنف أو الباركود:</label>
          <input
            type="text"
            placeholder="ابحث بالاسم أو الباركود..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none',
              backgroundColor: '#ffffff',
            }}
          />
        </div>
      </div>
    </section>
  );
}
