import { formatCurrency } from '@/lib/format';
import type { EmployeePayslipItem } from '../../api/employee-portal.api';
import { ReceiptIcon, XIcon } from '@/shared/components/icons/AppIcons';
import { DialogShell } from '@/shared/components/dialog-shell';

export interface PortalPayslipModalProps {
  payslip: EmployeePayslipItem | null;
  onClose: () => void;
}

export function PortalPayslipModal({ payslip, onClose }: PortalPayslipModalProps) {
  if (!payslip) return null;

  const selectedPayslip = payslip;

  return (
    <DialogShell
      open={Boolean(payslip)}
      onClose={onClose}
      width="min(520px, 95vw)"
      ariaLabel={`قسيمة راتب شهر ${selectedPayslip.period}`}
    >
      <div
        dir="rtl"
        style={{
          backgroundColor: '#ffffff',
          padding: '24px',
        }}
      >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ReceiptIcon size={22} color="#170e5e" />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
                  قسيمة راتب شهر {selectedPayslip.period}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <XIcon size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontWeight: 700 }}>الراتب الأساسي:</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>{formatCurrency(selectedPayslip.baseSalary)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#16a34a', fontWeight: 700 }}>إجمالي البدلات والمكافآت (+):</span>
                <span style={{ fontWeight: 800, color: '#16a34a' }}>+{formatCurrency(selectedPayslip.allowances)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#dc2626', fontWeight: 700 }}>الاستقطاعات والخصومات (-):</span>
                <span style={{ fontWeight: 800, color: '#dc2626' }}>-{formatCurrency(selectedPayslip.deductions)}</span>
              </div>

              {selectedPayslip.loanDeductions > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#dc2626', fontWeight: 700 }}>قسط سداد سلفة (-):</span>
                  <span style={{ fontWeight: 800, color: '#dc2626' }}>-{formatCurrency(selectedPayslip.loanDeductions)}</span>
                </div>
              )}

              {/* Adjustments breakdown */}
              {selectedPayslip.adjustments && selectedPayslip.adjustments.length > 0 && (
                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', marginTop: '6px' }}>
                  <div style={{ fontWeight: 800, color: '#334155', marginBottom: '8px', fontSize: '12px' }}>
                    تفاصيل البنود والبدلات الإضافية:
                  </div>
                  {selectedPayslip.adjustments.map((a, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', margin: '4px 0' }}>
                      <span>{a.label}:</span>
                      <span style={{ fontWeight: 700, color: a.type === 'allowance' ? '#16a34a' : '#dc2626' }}>
                        {a.type === 'allowance' ? '+' : '-'}{formatCurrency(a.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Net Pay Highlight Banner */}
              <div
                style={{
                  marginTop: '12px',
                  backgroundColor: '#f0fdf4',
                  border: '1.5px solid #bbf7d0',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534' }}>صافي الراتب المستحق للصرف:</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#15803d', marginTop: '2px' }}>
                    {formatCurrency(selectedPayslip.netPay)}
                  </div>
                </div>
                <span
                  style={{
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '20px',
                    border: '1px solid #86efac',
                  }}
                >
                  معتمد ومصروف
                </span>
              </div>
            </div>
          </div>
    </DialogShell>
  );
}
