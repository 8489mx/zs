import React from 'react';
import { DataTable } from '@/shared/ui/data-table';
import { Button } from '@/shared/ui/button';
import type { HrAttendanceException } from '@/types/domain';
import {
  exceptionTypeLabel,
  exceptionStatusLabel,
  isOvertimeException,
  ManualAttendancePrompt,
} from './attendance-types';

interface AttendanceExceptionsTableProps {
  rows: HrAttendanceException[];
  onApprove: (id: string) => Promise<void>;
  onSkip: (id: string) => Promise<void>;
  onOpenManualPrompt: (prompt: ManualAttendancePrompt) => void;
  isApprovePending: boolean;
  isSkipPending: boolean;
}

export const AttendanceExceptionsTable: React.FC<AttendanceExceptionsTableProps> = ({
  rows,
  onApprove,
  onSkip,
  onOpenManualPrompt,
  isApprovePending,
  isSkipPending,
}) => {
  return (
    <DataTable
      rows={rows}
      rowKey={(row) => row.id}
      density="compact"
      columns={[
        { key: 'workDate', header: 'التاريخ', className: 'col-fit', cell: (row) => row.workDate || '—' },
        { key: 'employeeNo', header: 'كود الموظف', className: 'col-fit', cell: (row) => row.employeeNo || '—' },
        { key: 'employeeName', header: 'اسم الموظف', className: 'col-main', cell: (row) => row.employeeName || '—' },
        {
          key: 'exceptionType',
          header: 'نوع الاستثناء',
          className: 'col-fit',
          cell: (row) => {
            const label = exceptionTypeLabel(row.exceptionType);
            const isRed = row.status === 'needs_review' || row.status === 'pending' || isOvertimeException(row.exceptionType);
            return isRed ? <span style={{ color: '#dc2626', fontWeight: 600 }}>{label}</span> : <span>{label}</span>;
          },
        },
        { key: 'scheduledTime', header: 'المجدول', className: 'col-fit', cell: (row) => row.scheduledTime || '?' },
        { key: 'actualTime', header: 'الفعلي', className: 'col-fit', cell: (row) => row.actualTime || '?' },
        { key: 'durationMinutes', header: 'المدة', className: 'col-fit', cell: (row) => `${row.durationMinutes || 0} د` },
        {
          key: 'status',
          header: 'الحالة',
          className: 'col-fit',
          cell: (row) => {
            const label = exceptionStatusLabel(row.status);
            const isRed = row.status === 'needs_review' || row.status === 'pending';
            return isRed ? <span style={{ color: '#dc2626', fontWeight: 600 }}>{label}</span> : <span>{label}</span>;
          },
        },
        {
          key: 'actions',
          header: 'الإجراء',
          className: 'col-fit',
          cell: (row) => {
            if (row.status !== 'pending') return <span className="muted">{exceptionStatusLabel(row.status)}</span>;

            const isMissingCheckIn = row.exceptionType === 'missing_check_in';
            const isMissingCheckOut = row.exceptionType === 'missing_check_out';
            const isLateIn = row.exceptionType === 'late_check_in';
            const isEarlyOut = row.exceptionType === 'early_check_out';
            const isAbsent = row.exceptionType === 'absent';

            if (isOvertimeException(row.exceptionType)) {
              return (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isApprovePending || isSkipPending}
                    onClick={() => { void onApprove(row.id); }}
                    style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                  >
                    اعتماد كإضافي
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isApprovePending || isSkipPending}
                    onClick={() => { void onSkip(row.id); }}
                    style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                  >
                    تخطي
                  </Button>
                </div>
              );
            }

            if (isMissingCheckIn || isMissingCheckOut) {
              return (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      onOpenManualPrompt({
                        rowId: String(row.id),
                        employeeId: Number(row.employeeId || row.employeeNo),
                        workDate: String(row.workDate),
                        type: isMissingCheckIn ? 'check_in' : 'check_out',
                        defaultTime: isMissingCheckIn ? '09:00' : '17:00',
                      });
                    }}
                    style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                  >
                    تسجيل {isMissingCheckIn ? 'حضور' : 'انصراف'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isSkipPending}
                    onClick={() => { void onSkip(row.id); }}
                    style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                  >
                    تخطي
                  </Button>
                </div>
              );
            }

            if (isLateIn || isEarlyOut) {
              return (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isApprovePending}
                    onClick={() => { void onApprove(row.id); }}
                    style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                  >
                    تأكيد الخصم
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isSkipPending}
                    onClick={() => { void onSkip(row.id); }}
                    style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                  >
                    تجاهل (عذر)
                  </Button>
                </div>
              );
            }

            if (isAbsent) {
              return (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isApprovePending}
                    onClick={() => { void onApprove(row.id); }}
                    style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                  >
                    تأكيد الغياب
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isSkipPending}
                    onClick={() => { void onSkip(row.id); }}
                    style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                  >
                    تخطي
                  </Button>
                </div>
              );
            }

            return <span className="muted">{exceptionStatusLabel(row.status)}</span>;
          },
        },
      ]}
    />
  );
};
