import React from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { text, money, normalize, reviewFlagText } from '@/features/hr/pages/payroll/hr-payroll.helpers';
import type { HrPayrollRunItem } from '@/types/domain';

interface PayrollReviewItemModalProps {
  item: HrPayrollRunItem | null;
  onClose: () => void;
  canViewSalaryAmounts: boolean;
  runIsFinal: boolean;
  onPrintSummary: (item: HrPayrollRunItem) => void;
  onPrintDetailed: (item: HrPayrollRunItem) => void;
}

export function PayrollReviewItemModal({
  item,
  onClose,
  canViewSalaryAmounts,
  runIsFinal,
  onPrintSummary,
  onPrintDetailed,
}: PayrollReviewItemModalProps) {
  if (!item) return null;

  return (
    <DialogShell open={true} onClose={onClose} width="500px">
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>تفاصيل المرتب</h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '15px' }}>{text(item.employeeName)}</p>
            <span className="muted" style={{ fontSize: '13px' }}>كود: {text(item.employeeNo)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: '#f8fafc' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px' }}>الحساب النهائي</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '6px' }}>
                <span className="muted">الراتب الأساسي:</span>
                <span style={{ fontWeight: '500' }}>{canViewSalaryAmounts ? money(item.baseSalary) : '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '6px' }}>
                <span className="muted">البدلات والإضافي:</span>
                <span style={{ fontWeight: '500' }}>{canViewSalaryAmounts ? money(item.allowanceAmount) : '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '6px' }}>
                <span className="muted">الخصومات (تأخير وغياب):</span>
                <span style={{ fontWeight: '500', color: '#dc2626' }}>{canViewSalaryAmounts ? money(item.deductionAmount) : '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '6px' }}>
                <span className="muted">السلف والأقساط:</span>
                <span style={{ fontWeight: '500', color: '#dc2626' }}>{canViewSalaryAmounts ? money(item.loanDeductionAmount) : '—'}</span>
              </div>
            </div>

            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '2px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>صافي الراتب المستحق:</span>
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#16a34a' }}>{canViewSalaryAmounts ? money(item.netPay) : '—'}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <div>
              <div className="muted" style={{ fontSize: '12px', marginBottom: '4px' }}>نوع الأجر</div>
              <div style={{ fontWeight: '500', fontSize: '14px' }}>{normalize(item.compensationType) === 'hourly' ? 'أجر بالساعة/اليوم' : 'راتب شهري'}</div>
            </div>
            {normalize(item.compensationType) === 'hourly' && (
              <>
                <div>
                  <div className="muted" style={{ fontSize: '12px', marginBottom: '4px' }}>أجر الساعة/اليوم</div>
                  <div style={{ fontWeight: '500', fontSize: '14px' }}>{canViewSalaryAmounts ? money(item.hourlyRate || 0) : '—'}</div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: '12px', marginBottom: '4px' }}>ساعات العمل اليومية</div>
                  <div style={{ fontWeight: '500', fontSize: '14px' }}>{item.expectedDailyHours || 0}</div>
                </div>
              </>
            )}
            <div>
              <div className="muted" style={{ fontSize: '12px', marginBottom: '4px' }}>تنبيهات عامة</div>
              <div style={{ fontWeight: '500', fontSize: '14px', color: reviewFlagText(item) ? '#ea580c' : 'inherit' }}>
                {reviewFlagText(item) || 'لا يوجد'}
              </div>
            </div>
          </div>

          {(item.payrollReviewNotes || item.notes) && (
            <div style={{ background: '#fefce8', padding: '16px', borderRadius: '8px', borderRight: '4px solid #facc15' }}>
              {item.payrollReviewNotes && (
                <div style={{ marginBottom: item.notes ? '12px' : '0' }}>
                  <strong style={{ display: 'block', marginBottom: '4px', color: '#854d0e', fontSize: '13px' }}>ملاحظات مراجعة الحضور:</strong>
                  <span style={{ color: '#713f12', fontSize: '14px' }}>{text(item.payrollReviewNotes)}</span>
                </div>
              )}
              {item.notes && (
                <div>
                  <strong style={{ display: 'block', marginBottom: '4px', color: '#854d0e', fontSize: '13px' }}>ملاحظات إضافية:</strong>
                  <span style={{ color: '#713f12', fontSize: '14px' }}>{text(item.notes)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Button variant="primary" onClick={onClose}>إغلاق</Button>
          </div>
          {runIsFinal && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="secondary" onClick={() => onPrintSummary(item)}>ملخص (A4)</Button>
              <Button variant="secondary" onClick={() => onPrintDetailed(item)}>تفصيلي (A4)</Button>
            </div>
          )}
        </div>
      </div>
    </DialogShell>
  );
}
