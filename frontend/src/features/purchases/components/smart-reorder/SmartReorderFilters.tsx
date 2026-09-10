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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>فترة تحليل المبيعات:</label>
            <select
              value={daysAnalysis}
              onChange={(e) => setDaysAnalysis(Number(e.target.value))}
              style={{
                padding: '8px 28px 8px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#ffffff',
                minWidth: '130px',
              }}
            >
              <option value={14}>آخر 14 يوماً</option>
              <option value={30}>آخر 30 يوماً ★</option>
              <option value={60}>آخر 60 يوماً</option>
              <option value={90}>آخر 90 يوماً</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>أيام التغطية المستهدفة:</label>
            <select
              value={targetCoverageDays}
              onChange={(e) => setTargetCoverageDays(Number(e.target.value))}
              style={{
                padding: '8px 28px 8px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#ffffff',
                minWidth: '130px',
              }}
            >
              <option value={14}>14 يوماً</option>
              <option value={30}>30 يوماً (شهر كامل)</option>
              <option value={45}>45 يوماً</option>
              <option value={60}>60 يوماً</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>فترة التوريد الافتراضية:</label>
            <select
              value={defaultLeadTimeDays}
              onChange={(e) => setDefaultLeadTimeDays(Number(e.target.value))}
              style={{
                padding: '8px 28px 8px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#ffffff',
                minWidth: '120px',
              }}
            >
              <option value={2}>2 أيام</option>
              <option value={3}>3 أيام (افتراضي)</option>
              <option value={5}>5 أيام</option>
              <option value={7}>7 أيام</option>
              <option value={14}>14 يوماً</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>مستوى الإلحاح:</label>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value as any)}
              style={{
                padding: '8px 28px 8px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#ffffff',
                minWidth: '160px',
              }}
            >
              <option value="needs_reorder">يحتاج إعادة طلب فقط ★</option>
              <option value="out_of_stock">نافد المخزون فقط</option>
              <option value="critical">حرج ووشيك النفاد</option>
              <option value="warning">تحذيري فقط</option>
              <option value="all">جميع الأصناف</option>
            </select>
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
