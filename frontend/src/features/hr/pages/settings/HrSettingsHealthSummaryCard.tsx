type Props = {
  healthSummary: {
    departments: number;
    jobTitles: number;
    leaveTypes: number;
    documentTypes: string;
    inactiveTotal: number;
    reviewItems: number;
  };
};

export function HrSettingsHealthSummaryCard({ healthSummary }: Props) {
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#0f172a' }}>ملخص صحة الإعدادات والهيكل</span>
        <span style={{ fontSize: '0.725rem', color: '#64748b' }}>إجمالي العناصر المعرفة في النظام</span>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
        {[
          { label: 'إجمالي الأقسام', value: healthSummary.departments },
          { label: 'المسميات الوظيفية', value: healthSummary.jobTitles },
          { label: 'أنواع الإجازات', value: healthSummary.leaveTypes },
        ].map((stat, idx) => (
          <div
            key={idx}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '8px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              minWidth: 0,
            }}
          >
            <span style={{ fontSize: '0.725rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={stat.label}>
              {stat.label}
            </span>
            <strong style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {stat.value}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}
