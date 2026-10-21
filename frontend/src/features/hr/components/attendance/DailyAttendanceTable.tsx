import { useTranslation } from 'react-i18next';
import React from 'react';
import { DataTable } from '@/shared/ui/data-table';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import type { HrAttendanceRecord } from '@/types/domain';
import { DraftRow, normalizeTime } from './attendance-types';

interface DailyAttendanceTableProps {
  rows: HrAttendanceRecord[];
  draftByEmployeeId: Record<string, DraftRow>;
  onUpdateDraft: (employeeId: string, patch: Partial<DraftRow>) => void;
  onSaveRow: (employeeId: string) => void;
}

export const DailyAttendanceTable: React.FC<DailyAttendanceTableProps> = ({
  rows,
  draftByEmployeeId,
  onUpdateDraft,
  onSaveRow,
}) => {
  const { t } = useTranslation();
  const workedHours = (row: HrAttendanceRecord) => {
    const draft = draftByEmployeeId[String(row.employeeId)];
    const checkIn = draft?.checkInAt || row.checkInAt?.slice(11, 16) || '';
    const checkOut = draft?.checkOutAt || row.checkOutAt?.slice(11, 16) || '';
    if (!checkIn || !checkOut) return '—';
    const [ih, im] = checkIn.split(':').map(Number);
    const [oh, om] = checkOut.split(':').map(Number);
    if (![ih, im, oh, om].every(Number.isFinite)) return '—';
    const start = ih * 60 + im, end = oh * 60 + om;
    const minutes = end <= start ? end + 1440 - start : end - start;
    return `${Math.floor(minutes / 60)} س ${minutes % 60} د`;
  };
  return (
    <DataTable
      rows={rows}
      rowKey={(row) => String(row.employeeId)}
      density="compact"
      columns={[
        { key: 'employeeNo', header: t('hr.attendance.daily_attendance_table.s0', "كود الموظف"), className: 'col-fit', cell: (row) => row.employeeNo || '—' },
        { key: 'employeeName', header: t('hr.attendance.daily_attendance_table.s1', "اسم الموظف"), className: 'col-main', cell: (row) => row.employeeName || '—' },
        { key: 'departmentName', header: t('hr.attendance.daily_attendance_table.s2', "القسم"), className: 'col-fit', cell: (row) => row.departmentName || '—' },
        {
          key: 'checkInAt',
          header: t('hr.attendance.daily_attendance_table.s3', "وقت الحضور"),
          className: 'col-fit',
          cell: (row) => (
            <input
              type="time"
              value={draftByEmployeeId[String(row.employeeId)]?.checkInAt || ''}
              onChange={(e) => onUpdateDraft(String(row.employeeId), { checkInAt: normalizeTime(e.target.value) })}
              style={{ padding: '2px 6px', fontSize: '0.85rem' }}
            />
          ),
        },
        {
          key: 'checkOutAt',
          header: t('hr.attendance.daily_attendance_table.s4', "وقت الانصراف"),
          className: 'col-fit',
          cell: (row) => (
            <input
              type="time"
              value={draftByEmployeeId[String(row.employeeId)]?.checkOutAt || ''}
              onChange={(e) => onUpdateDraft(String(row.employeeId), { checkOutAt: normalizeTime(e.target.value) })}
              style={{ padding: '2px 6px', fontSize: '0.85rem' }}
            />
          ),
        },
        {
          key: 'duration',
          header: 'ساعات التشغيل',
          className: 'col-fit',
          cell: workedHours,
        },
        {
          key: 'paidHours',
          header: 'ساعات الأجر',
          className: 'col-fit',
          cell: row => row.compensationType === 'hourly' ? workedHours(row) : 'راتب شهري',
        },
        {
          key: 'status',
          header: t('hr.attendance.daily_attendance_table.s5', "الحالة"),
          className: 'col-fit',
          cell: (row) => (
            <div style={{ width: '130px' }}>
              <CustomSelect
                value={draftByEmployeeId[String(row.employeeId)]?.status || ''}
                onChange={(val) => onUpdateDraft(String(row.employeeId), { status: val })}
                options={[
                  { value: '', label: t('hr.attendance.daily_attendance_table.s6', "غير مسجل") },
                  { value: 'present', label: t('hr.attendance.daily_attendance_table.s7', "حاضر") },
                  { value: 'absent', label: t('hr.attendance.daily_attendance_table.s8', "غائب") },
                  { value: 'late', label: t('hr.attendance.daily_attendance_table.s9', "متأخر") },
                  { value: 'early_leave', label: t('hr.attendance.daily_attendance_table.s10', "انصراف مبكر") },
                  { value: 'leave', label: t('hr.attendance.daily_attendance_table.s11', "إجازة") },
                  { value: 'half_day', label: t('hr.attendance.daily_attendance_table.s12', "نصف يوم") },
                  { value: 'excused', label: t('hr.attendance.daily_attendance_table.s13', "بعذر") },
                ]}
              />
            </div>
          ),
        },
        {
          key: 'notes',
          header: t('hr.attendance.daily_attendance_table.s14', "ملاحظات"),
          className: 'col-main',
          cell: (row) => (
            <input
              value={draftByEmployeeId[String(row.employeeId)]?.notes || ''}
              onChange={(e) => onUpdateDraft(String(row.employeeId), { notes: e.target.value })}
              placeholder={t('hr.attendance.daily_attendance_table.s15', "ملاحظات...")}
              style={{ padding: '2px 6px', fontSize: '0.85rem', width: '100%' }}
            />
          ),
        },
        {
          key: 'actions',
          header: t('hr.attendance.daily_attendance_table.s16', "إجراء"),
          className: 'col-fit',
          cell: (row) => (
            <Button type="button" onClick={() => onSaveRow(String(row.employeeId))} style={{ padding: '2px 10px', fontSize: '0.8rem' }}>{t('hr.attendance.daily_attendance_table.s17', "حفظ")}</Button>
          ),
        },
      ]}
    />
  );
};
