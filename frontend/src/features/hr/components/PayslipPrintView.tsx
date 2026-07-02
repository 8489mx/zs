import { forwardRef } from 'react';
import type { HrPayrollRunItem } from '@/types/domain';
import { money } from '@/features/hr/pages/payroll/hr-payroll.helpers';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface PayslipPrintViewProps {
  item: HrPayrollRunItem;
  employeeName: string;
  departmentName: string;
  jobTitleName: string;
  periodMonth: string;
}

export const PayslipPrintView = forwardRef<HTMLDivElement, PayslipPrintViewProps>(
  ({ item, employeeName, departmentName, jobTitleName, periodMonth }, ref) => {
    
    // Some logic to calculate or extract details from `item`
    // In a real app we might have detailed adjustments to loop through.
    
    return (
      <div ref={ref} style={{ padding: '20px', fontFamily: 'Arial, sans-serif', direction: 'rtl' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #ccc', paddingBottom: '10px' }}>
          <h2>قسيمة راتب (Payslip)</h2>
          <p>عن شهر: {periodMonth}</p>
        </div>

        <table style={{ width: '100%', marginBottom: '20px', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '8px', border: '1px solid #eee' }}><strong>اسم الموظف:</strong> {employeeName}</td>
              <td style={{ padding: '8px', border: '1px solid #eee' }}><strong>الإدارة:</strong> {departmentName || '-'}</td>
            </tr>
            <tr>
              <td style={{ padding: '8px', border: '1px solid #eee' }}><strong>المسمى الوظيفي:</strong> {jobTitleName || '-'}</td>
              <td style={{ padding: '8px', border: '1px solid #eee' }}><strong>الراتب الأساسي:</strong> {money(item.baseSalary)}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '5px' }}>الاستحقاقات (Earnings)</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '4px 0' }}>الراتب الأساسي</td>
                  <td style={{ padding: '4px 0', textAlign: 'left' }}>{money(item.baseSalary)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0' }}>مكافآت وإضافات</td>
                  <td style={{ padding: '4px 0', textAlign: 'left' }}>{money(item.allowanceAmount)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <th style={{ paddingTop: '10px', textAlign: 'right' }}>إجمالي الاستحقاقات</th>
                  <th style={{ paddingTop: '10px', textAlign: 'left' }}>{money(Number(item.baseSalary || 0) + Number(item.allowanceAmount || 0))}</th>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '5px' }}>الاستقطاعات (Deductions)</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '4px 0' }}>خصومات متنوعة</td>
                  <td style={{ padding: '4px 0', textAlign: 'left' }}>{money(item.deductionAmount)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0' }}>سلف وأقساط</td>
                  <td style={{ padding: '4px 0', textAlign: 'left' }}>{money(item.loanDeductionAmount)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <th style={{ paddingTop: '10px', textAlign: 'right' }}>إجمالي الاستقطاعات</th>
                  <th style={{ paddingTop: '10px', textAlign: 'left' }}>{money(Number(item.deductionAmount || 0) + Number(item.loanDeductionAmount || 0))}</th>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div style={{ marginTop: '30px', backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>صافي الراتب المستحق (Net Pay)</h2>
          <h2 style={{ margin: 0, color: 'var(--brand-primary)' }}>{money(item.netPay)}</h2>
        </div>

        <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
          <p>تاريخ الإصدار: {format(new Date(), 'PP', { locale: ar })}</p>
          <p>توقيع الموظف: ____________________</p>
        </div>
      </div>
    );
  }
);
PayslipPrintView.displayName = 'PayslipPrintView';
