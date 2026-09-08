import type { AttendancePunch } from '../../api/mobile-punch.api';

interface MobilePunchTimelineProps {
  punches: AttendancePunch[];
}

export function MobilePunchTimeline({ punches }: MobilePunchTimelineProps) {
  if (!punches || punches.length === 0) {
    return (
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12.5px' }}>
        لا توجد بصمات مسجلة لليوم حتى الآن.
      </div>
    );
  }

  return (
    <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
        سجل بصمات اليوم
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {punches.map((p, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #f1f5f9',
              fontSize: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: p.type === 'check_in' ? '#10b981' : '#ef4444',
                }}
              />
              <strong style={{ color: '#0f172a' }}>
                {p.type === 'check_in' ? 'تسجيل حضور' : 'تسجيل انصراف'}
              </strong>
            </div>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#475569' }}>
              {p.timeFormatted || new Date(p.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
