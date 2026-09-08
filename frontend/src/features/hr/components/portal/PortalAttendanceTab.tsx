import type { AttendanceRecordItem } from '../../api/employee-portal.api';

export interface PortalAttendanceTabProps {
  attendance: AttendanceRecordItem[];
}

export function PortalAttendanceTab({ attendance }: PortalAttendanceTabProps) {
  return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>
                سجل الحضور والانصراف الشهري
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                كشف تفصيلي بأوقات تسجيل الحضور والانصراف وساعات العمل الفردية.
              </p>
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
              }}
            >
              {attendance.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '14px' }}>
                  لا توجد سجلات حضور مسجلة لهذا الشهر.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                        <th style={{ padding: '10px 12px' }}>التاريخ</th>
                        <th style={{ padding: '10px 12px' }}>وقت الحضور</th>
                        <th style={{ padding: '10px 12px' }}>وقت الانصراف</th>
                        <th style={{ padding: '10px 12px' }}>ساعات العمل</th>
                        <th style={{ padding: '10px 12px' }}>التأخير (دقيقة)</th>
                        <th style={{ padding: '10px 12px' }}>الحالة</th>
                        <th style={{ padding: '10px 12px' }}>طريقة البصمة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map((rec) => (
                        <tr key={rec.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px', fontWeight: 800, color: '#0f172a' }}>{rec.date}</td>
                          <td style={{ padding: '12px', color: '#166534', fontWeight: 700 }}>{rec.checkInTime}</td>
                          <td style={{ padding: '12px', color: '#170e5e', fontWeight: 700 }}>{rec.checkOutTime}</td>
                          <td style={{ padding: '12px', fontWeight: 800 }}>{rec.workHours} س</td>
                          <td style={{ padding: '12px', color: rec.lateMinutes > 0 ? '#dc2626' : '#64748b' }}>
                            {rec.lateMinutes > 0 ? `${rec.lateMinutes} دقيقة` : '-'}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                backgroundColor: rec.status === 'present' ? '#f0fdf4' : '#f8fafc',
                                color: rec.status === 'present' ? '#166534' : '#64748b',
                                border: '1px solid #e2e8f0',
                              }}
                            >
                              {rec.status === 'present' ? 'حاضر' : rec.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px', color: '#64748b' }}>
                            {rec.source === 'mobile_gps' ? 'موبايل GPS' : 'جهاز بصمة الفرع'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
  );
}
