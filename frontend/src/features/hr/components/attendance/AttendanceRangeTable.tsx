import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/shared/ui/data-table';
import { Button } from '@/shared/ui/button';
import type { HrAttendanceRecord } from '@/types/domain';

export function AttendanceRangeTable({ rows }: { rows: HrAttendanceRecord[] }) {
  const navigate = useNavigate();
  const duration = (row: HrAttendanceRecord) => {
    if (!row.checkInAt || !row.checkOutAt) return '—';
    const minutes = Math.floor((new Date(row.checkOutAt).getTime() - new Date(row.checkInAt).getTime()) / 60000);
    return !Number.isFinite(minutes) || minutes <= 0 || minutes > 1440 ? 'يحتاج مراجعة' : `${Math.floor(minutes / 60)} س ${minutes % 60} د`;
  };
  return (
    <DataTable<HrAttendanceRecord> rows={rows} rowKey={row => `${row.employeeId}-${row.workDate}-${row.id || ''}`}
      density="compact" columns={[
        { key: 'employee', header: 'الموظف', cell: row =>
          <Button type="button" variant="secondary" onClick={() => navigate(`/hr/employees/${row.employeeId}`)}>{row.employeeName || row.employeeNo || 'موظف'}</Button> },
        { key: 'department', header: 'القسم', cell: row => row.departmentName || '—' },
        { key: 'date', header: 'التاريخ', cell: row => row.workDate },
        { key: 'day', header: 'اليوم', cell: row => new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(new Date(row.workDate + 'T12:00:00')) },
        { key: 'in', header: 'الحضور', cell: row => row.checkInAt?.slice(11, 16) || '—' },
        { key: 'out', header: 'الانصراف', cell: row => row.checkOutAt?.slice(11, 16) || '—' },
        { key: 'hours', header: 'ساعات التشغيل', cell: duration },
        { key: 'payableHours', header: 'ساعات الأجر المبدئية', cell: row => row.compensationType === 'hourly' ? duration(row) : 'مرتب ثابت' },
        { key: 'status', header: 'الحالة', cell: row => row.status || '—' },
      ]}
    />
  );
}
