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
  return (
    <DataTable
      rows={rows}
      rowKey={(row) => String(row.employeeId)}
      density="compact"
      columns={[
        { key: 'employeeNo', header: 'كود الموظف', className: 'col-fit', cell: (row) => row.employeeNo || '—' },
        { key: 'employeeName', header: 'اسم الموظف', className: 'col-main', cell: (row) => row.employeeName || '—' },
        { key: 'departmentName', header: 'القسم', className: 'col-fit', cell: (row) => row.departmentName || '—' },
        {
          key: 'checkInAt',
          header: 'وقت الحضور',
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
          header: 'وقت الانصراف',
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
          key: 'status',
          header: 'الحالة',
          className: 'col-fit',
          cell: (row) => (
            <div style={{ width: '130px' }}>
              <CustomSelect
                value={draftByEmployeeId[String(row.employeeId)]?.status || ''}
                onChange={(val) => onUpdateDraft(String(row.employeeId), { status: val })}
                options={[
                  { value: '', label: 'غير مسجل' },
                  { value: 'present', label: 'حاضر' },
                  { value: 'absent', label: 'غائب' },
                  { value: 'late', label: 'متأخر' },
                  { value: 'early_leave', label: 'انصراف مبكر' },
                  { value: 'leave', label: 'إجازة' },
                  { value: 'half_day', label: 'نصف يوم' },
                  { value: 'excused', label: 'بعذر' },
                ]}
              />
            </div>
          ),
        },
        {
          key: 'notes',
          header: 'ملاحظات',
          className: 'col-main',
          cell: (row) => (
            <input
              value={draftByEmployeeId[String(row.employeeId)]?.notes || ''}
              onChange={(e) => onUpdateDraft(String(row.employeeId), { notes: e.target.value })}
              placeholder="ملاحظات..."
              style={{ padding: '2px 6px', fontSize: '0.85rem', width: '100%' }}
            />
          ),
        },
        {
          key: 'actions',
          header: 'إجراء',
          className: 'col-fit',
          cell: (row) => (
            <Button type="button" onClick={() => onSaveRow(String(row.employeeId))} style={{ padding: '2px 10px', fontSize: '0.8rem' }}>حفظ</Button>
          ),
        },
      ]}
    />
  );
};
