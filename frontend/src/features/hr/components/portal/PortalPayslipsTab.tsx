import { formatCurrency } from '@/lib/format';
import type { EmployeePayslipItem } from '../../api/employee-portal.api';
import { ReceiptIcon } from '@/shared/components/icons/AppIcons';

export interface PortalPayslipsTabProps {
  payslips: EmployeePayslipItem[];
  onSelectPayslip: (slip: EmployeePayslipItem) => void;
}

export function PortalPayslipsTab({ payslips, onSelectPayslip }: PortalPayslipsTabProps) {
  return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>
                  مسيرات وقسائم الرواتب الشهرية
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                  استعراض تفصيلي لصافي الراتب، البدلات، المكافآت، والاستقطاعات لكل شهر معتمد.
                </p>
              </div>
            </div>

            {payslips.length === 0 ? (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '48px 24px',
                  textAlign: 'center',
                  color: '#64748b',
                }}
              >
                <ReceiptIcon size={36} color="#94a3b8" />
                <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '12px', color: '#0f172a' }}>
                  لا توجد مسيرات رواتب معتمدة بعد
                </div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>
                  سيتم إدراج قسيمة الراتب هنا فور اعتماد ومراجعة مسير الرواتب الشهري من قسم الحسابات.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {payslips.map((slip) => (
                  <div
                    key={slip.id}
                    className="portal-payslip-card"
                    onClick={() => onSelectPayslip(slip)}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '18px 24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          backgroundColor: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <ReceiptIcon size={22} color="#16a34a" />
                      </div>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                          راتب شهر: {slip.period}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          الأساسي: {formatCurrency(slip.baseSalary)} • البدلات: +{formatCurrency(slip.allowances)} • الخصومات: -{formatCurrency(slip.deductions + slip.loanDeductions)}
                        </div>
                      </div>
                    </div>

                    <div className="portal-payslip-total" style={{ textAlign: 'left' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>صافي الراتب المستحق</span>
                      <div style={{ fontSize: '20px', fontWeight: 900, color: '#16a34a' }}>
                        {formatCurrency(slip.netPay)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
  );
}
