import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useHrAttendance } from '@/features/hr/hooks/useHr';
import { useHasAnyPermission } from '@/shared/hooks/use-permission';
import { hrApi } from '@/features/hr/api/hr.api';
import { DataTable } from '@/shared/ui/data-table';
import type { HrEmployee, HrWithdrawalRow } from '@/types/domain';
import { todayDate } from '@/features/hr/components/attendance/attendance-types';

type Props = { employeeId: string; employee: HrEmployee; canViewLoans: boolean; canViewSalary: boolean };
const egyptMoney = (amount: number) => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(amount);

export function EmployeePeriodStatement({ employeeId, employee, canViewLoans, canViewSalary }: Props) {
  const [from, setFrom] = useState(todayDate().slice(0, 7) + '-01');
  const [to, setTo] = useState(todayDate());
  const [attendancePage, setAttendancePage] = useState(1);
  const [withdrawalPage, setWithdrawalPage] = useState(1);
  const days = Math.floor((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000);
  const validRange = Boolean(from && to && days >= 0 && days <= 92);
  const canViewAttendance = useHasAnyPermission('hrAttendance');
  const attendance = useHrAttendance({ employeeId, from, to, page: attendancePage, pageSize: 100 }, { enabled: validRange && canViewAttendance });
  const withdrawals = useQuery({
    queryKey: ['hr', 'period-statement-withdrawals', employeeId, from, to, withdrawalPage],
    queryFn: () => hrApi.withdrawals({ employeeId, period: 'custom', from, to, page: withdrawalPage, pageSize: 100 }),
    enabled: canViewLoans && validRange,
  });
  const minutes = Number(attendance.data?.summary?.workedMinutes || 0);
  const completedHours = (minutes / 60).toFixed(2);
  const payableHours = (Number(attendance.data?.summary?.payableMinutes || 0) / 60).toFixed(2);
  const hourly = employee.compensationType === 'hourly';
  const rate = Number(employee.hourlyRate || 0);
  const indicativePay = Number(((minutes / 60) * rate).toFixed(2));
  const rows = withdrawals.data?.rows || [];

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
      <strong style={{ fontSize: 15 }}>كشف تشغيل ومستحقات الموظف حسب الفترة</strong>
      <div className="actions compact-actions" style={{ margin: '10px 0', flexWrap: 'wrap' }}>
        <label>من <input type="date" value={from} onChange={e => { setFrom(e.target.value); setAttendancePage(1); setWithdrawalPage(1); }} /></label>
        <label>إلى <input type="date" value={to} onChange={e => { setTo(e.target.value); setAttendancePage(1); setWithdrawalPage(1); }} /></label>
      </div>
      {!validRange ? <p className="error-box">الفترة يجب أن تكون صحيحة ولا تزيد عن 93 يومًا.</p> : null}
      {attendance.isError && canViewAttendance ? <p className="error-box">تعذر تحميل سجلات الحضور.</p> : null}
      {!canViewAttendance ? <p className="muted">ليس لديك صلاحية عرض الحضور والانصراف.</p> : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginBottom: 12 }}>
        <span>إجمالي ساعات العمل المكتملة: <strong>{attendance.isLoading ? '—' : completedHours} ساعة</strong></span>
        {hourly ? <span>ساعات الأجر: <strong>{attendance.isLoading ? '—' : payableHours} ساعة</strong></span> : null}
        {hourly && canViewSalary ? (
          <span>الأجر قبل الخصومات والتسويات: <strong>{attendance.isLoading ? '—' : egyptMoney(indicativePay)} جنيه</strong></span>
        ) : null}
        {canViewLoans ? (
          <>
            <span>المسحوبات خلال الفترة: <strong>{withdrawals.isLoading ? '—' : egyptMoney(Number(withdrawals.data?.summary?.totalWithdrawals || 0))} جنيه</strong></span>
            <span>مديونية السلف الحالية: <strong>{withdrawals.isLoading ? '—' : egyptMoney(Number(withdrawals.data?.summary?.totalRemaining || 0))} جنيه</strong></span>
          </>
        ) : null}
      </div>
      <small className="muted">الأجر المعروض استرشادي للموظف بالساعة، وليس صافي مستحقات معتمدًا. صافي المرتب يُراجع من كشف المرتبات بعد الخصومات والتسويات.</small>
      <strong style={{ display: 'block', margin: '12px 0 6px' }}>سجل الحضور والانصراف</strong>
      <DataTable rows={attendance.data?.rows || []} rowKey={row => String(row.id || row.workDate)}
        density="compact" columns={[
          { key: 'date', header: 'التاريخ', cell: row => row.workDate },
          { key: 'in', header: 'الحضور', cell: row => row.checkInAt?.slice(11, 16) || '—' },
          { key: 'out', header: 'الانصراف', cell: row => row.checkOutAt?.slice(11, 16) || '—' },
          { key: 'state', header: 'الحالة', cell: row => row.status || '—' },
        ]} />
      {canViewAttendance && Number(attendance.data?.pagination?.totalPages || 1) > 1 ? (
        <div className="actions compact-actions" style={{ marginTop: 8 }}>
          <button type="button" disabled={attendancePage <= 1} onClick={() => setAttendancePage(n => Math.max(1, n - 1))}>السابق</button>
          <span>صفحة {attendancePage} من {attendance.data?.pagination?.totalPages}</span>
          <button type="button" disabled={attendancePage >= Number(attendance.data?.pagination?.totalPages || 1)} onClick={() => setAttendancePage(n => n + 1)}>التالي</button>
        </div>
      ) : null}
      {canViewLoans ? (
        <>
          <strong style={{ display: 'block', margin: '12px 0 6px' }}>المسحوبات وحركات السداد</strong>
          {withdrawals.isError ? <p className="error-box">تعذر تحميل المسحوبات.</p> : null}
          <DataTable<HrWithdrawalRow> rows={rows} rowKey={row => row.id} density="compact" columns={[
            { key: 'date', header: 'التاريخ والوقت', cell: row => row.movementAt || '—' },
            { key: 'type', header: 'الحركة', cell: row => row.type === 'repayment' ? 'سداد سلفة' : row.type === 'loan' ? 'قرض' : 'مسحوب / سلفة' },
            { key: 'amount', header: 'القيمة', cell: row => egyptMoney(Number(row.amount || 0)) },
            { key: 'note', header: 'تفاصيل الحركة', cell: row => row.note || '—' },
            { key: 'actor', header: 'سجّل الحركة', cell: row => row.recordedByName || '—' },
          ]} />
          {Number(withdrawals.data?.pagination?.totalPages || 1) > 1 ? (
            <div className="actions compact-actions" style={{ marginTop: 8 }}>
              <button type="button" disabled={withdrawalPage <= 1} onClick={() => setWithdrawalPage(n => Math.max(1, n - 1))}>السابق</button>
              <span>صفحة {withdrawalPage} من {withdrawals.data?.pagination?.totalPages}</span>
              <button type="button" disabled={withdrawalPage >= Number(withdrawals.data?.pagination?.totalPages || 1)} onClick={() => setWithdrawalPage(n => n + 1)}>التالي</button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
