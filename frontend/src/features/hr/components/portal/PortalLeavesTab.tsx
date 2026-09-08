import type { EmployeeLeavesData } from '../../api/employee-portal.api';
import { PlusIcon } from '@/shared/components/icons/AppIcons';

export interface PortalLeavesTabProps {
  leavesData: EmployeeLeavesData | null;
  onRequestLeave: () => void;
}

export function PortalLeavesTab({ leavesData, onRequestLeave }: PortalLeavesTabProps) {
  return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="portal-section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>
                  أرصدة وطلبات الإجازات
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                  استعراض رصيدك من الإجازات ومتابعة حالة الطلبات المقدمة للإدارة.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onRequestLeave()}
                style={{
                  backgroundColor: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(23, 14, 94, 0.2)',
                }}
              >
                <PlusIcon size={16} color="#ffffff" />
                <span>تقديم طلب إجازة</span>
              </button>
            </div>

            {/* Leave Balances Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              {leavesData?.balances?.map((b) => (
                <div
                  key={b.leaveTypeId}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '18px',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>{b.name}</div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: '#170e5e', margin: '4px 0' }}>
                    {b.remainingDays} <span style={{ fontSize: '14px', fontWeight: 700 }}>يوم متبقي</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    إجمالي الرصيد: {b.totalDays} • المستنفذ: {b.usedDays}
                  </div>
                </div>
              ))}
            </div>

            {/* Leave Requests Table */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
              }}
            >
              <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                سجل طلبات الإجازة السابقة
              </h3>

              {!leavesData?.requests || leavesData.requests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '14px' }}>
                  لم تقم بتقديم أي طلبات إجازة حتى الآن.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                        <th style={{ padding: '10px 12px' }}>نوع الإجازة</th>
                        <th style={{ padding: '10px 12px' }}>الفترة</th>
                        <th style={{ padding: '10px 12px' }}>عدد الأيام</th>
                        <th style={{ padding: '10px 12px' }}>السبب</th>
                        <th style={{ padding: '10px 12px' }}>الحالة</th>
                        <th style={{ padding: '10px 12px' }}>ملاحظات الإدارة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leavesData.requests.map((r) => {
                        const isApproved = r.status === 'approved';
                        const isRejected = r.status === 'rejected';
                        return (
                          <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px', fontWeight: 800, color: '#0f172a' }}>
                              {r.leaveTypeName}
                            </td>
                            <td style={{ padding: '12px', color: '#334155' }}>
                              {r.startDate} إلى {r.endDate}
                            </td>
                            <td style={{ padding: '12px', fontWeight: 800, color: '#170e5e' }}>
                              {r.daysCount} يوم
                            </td>
                            <td style={{ padding: '12px', color: '#64748b' }}>{r.reason || '-'}</td>
                            <td style={{ padding: '12px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  backgroundColor: isApproved ? '#f0fdf4' : isRejected ? '#fef2f2' : '#fffbeb',
                                  color: isApproved ? '#166534' : isRejected ? '#991b1b' : '#92400e',
                                  border: `1px solid ${isApproved ? '#bbf7d0' : isRejected ? '#fecaca' : '#fde68a'}`,
                                }}
                              >
                                {isApproved ? 'معتمدة' : isRejected ? 'مرفوضة' : 'قيد المراجعة'}
                              </span>
                            </td>
                            <td style={{ padding: '12px', color: '#64748b' }}>{r.decisionNotes || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
  );
}
