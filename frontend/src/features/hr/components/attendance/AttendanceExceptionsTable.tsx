import { useTranslation } from 'react-i18next';
import React from 'react';
import { DataTable } from '@/shared/ui/data-table';
import { Button } from '@/shared/ui/button';
import type { HrAttendanceException } from '@/types/domain';
import {
  exceptionTypeLabel,
  exceptionStatusLabel,
  isOvertimeException,
  isDeductionException,
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
  const { t } = useTranslation();
  return (
    <div className="attendance-table-container">
      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        density="compact"
        columns={[
          { key: 'workDate', header: t('hr.attendance.attendance_exceptions_table.s0', "التاريخ"), className: 'col-fit', cell: (row) => row.workDate || '—' },
          { key: 'employeeNo', header: t('hr.attendance.attendance_exceptions_table.s1', "الكود"), className: 'col-fit', cell: (row) => row.employeeNo || '—' },
          { key: 'employeeName', header: t('hr.attendance.attendance_exceptions_table.s2', "اسم الموظف"), className: 'col-main', cell: (row) => row.employeeName || '—' },
        {
          key: 'exceptionType',
          header: t('hr.attendance.attendance_exceptions_table.s3', "نوع الاستثناء"),
          className: 'col-fit',
          cell: (row) => {
            const label = exceptionTypeLabel(row.exceptionType);
            const isRed = row.status === 'needs_review' || row.status === 'pending' || isOvertimeException(row.exceptionType);
            return isRed ? <span style={{ color: '#dc2626', fontWeight: 600 }}>{label}</span> : <span>{label}</span>;
          },
        },
        { key: 'scheduledTime', header: t('hr.attendance.attendance_exceptions_table.s4', "المجدول"), className: 'col-fit', cell: (row) => row.scheduledTime || '—' },
        {
          key: 'actualTime',
          header: t('hr.attendance.attendance_exceptions_table.s5', "الفعلي"),
          className: 'col-fit',
          cell: (row) => {
            const isMissingOut = row.exceptionType === 'missing_check_out';
            const isMissingIn = row.exceptionType === 'missing_check_in';
            if (isMissingOut) {
              return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.8rem' }}>لم ينصرف</span>
                  {(row.note || row.actualTime) && (
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                      {row.note ? row.note : `حضر: ${row.actualTime}`}
                    </span>
                  )}
                </div>
              );
            }
            if (isMissingIn) {
              return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.8rem' }}>لم يحضر</span>
                  {(row.note || row.actualTime) && (
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                      {row.note ? row.note : `انصرف: ${row.actualTime}`}
                    </span>
                  )}
                </div>
              );
            }
            return <span>{row.actualTime || '—'}</span>;
          },
        },
        {
          key: 'durationMinutes',
          header: t('hr.attendance.attendance_exceptions_table.s6', "المدة"),
          className: 'col-fit',
          cell: (row) => {
            if (row.exceptionType === 'missing_check_out' || row.exceptionType === 'missing_check_in') {
              return <span style={{ color: '#d97706', fontWeight: 700, fontSize: '0.78rem' }}>بصمة معلقة</span>;
            }
            return <span>{`${row.durationMinutes || 0} د`}</span>;
          },
        },
        {
          key: 'estimatedAmount',
          header: t('hr.attendance.attendance_exceptions_table.s_financial', "الأثر المالي"),
          className: 'col-fit',
          cell: (row) => {
            const amount = Number(row.estimatedAmount || 0);
            const isOvertime = isOvertimeException(row.exceptionType);
            const isDeduction = isDeductionException(row.exceptionType);
            const isSkipped = row.status === 'skipped';
            const policyDesc = row.policyDescription;

            if (isSkipped) {
              return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.25 }}>
                  <span style={{ color: '#94a3b8', textDecoration: 'line-through', fontSize: '0.75rem' }}>
                    {amount > 0 ? `${amount.toFixed(2)} ج.م` : '—'}
                  </span>
                  <span style={{ color: '#16a34a', fontSize: '0.68rem', fontWeight: 700 }}>معفي بعذر</span>
                </div>
              );
            }

            if (row.delayPolicy === 'disabled' && isDeduction) {
              return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.25 }}>
                  <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>0.00 ج.م</span>
                  <span style={{ color: '#94a3b8', fontSize: '0.68rem' }}>معفى (سياسة معطلة)</span>
                </div>
              );
            }

            if (amount <= 0 && (!row.hourlyRate && !row.dailyRate)) {
              return (
                <span
                  style={{ color: '#94a3b8', fontSize: '0.8rem' }}
                  title="لم يتم تسجيل راتب شهري أو أجر ساعة للموظف بعد"
                >
                  —
                </span>
              );
            }

            if (isOvertime) {
              return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.25 }}>
                  <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.82rem' }}>
                    {`+ ${amount.toFixed(2)} ج.م`}
                  </span>
                  {policyDesc && (
                    <span style={{ color: '#15803d', fontSize: '0.68rem', fontWeight: 500 }}>
                      {policyDesc}
                    </span>
                  )}
                </div>
              );
            }

            if (isDeduction) {
              return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.25 }}>
                  <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.82rem' }}>
                    {`- ${amount.toFixed(2)} ج.م`}
                  </span>
                  {policyDesc && (
                    <span style={{ color: '#991b1b', fontSize: '0.68rem', fontWeight: 500 }}>
                      {policyDesc}
                    </span>
                  )}
                </div>
              );
            }

            return <span>—</span>;
          },
        },
        {
          key: 'status',
          header: t('hr.attendance.attendance_exceptions_table.s7', "الحالة"),
          className: 'col-fit',
          cell: (row) => {
            const label = exceptionStatusLabel(row.status);
            if (row.status === 'skipped') {
              return <span style={{ color: '#16a34a', fontWeight: 700, background: '#f0fdf4', padding: '2px 6px', borderRadius: '4px', border: '1px solid #bbf7d0', fontSize: '0.75rem' }}>معفي بعذر</span>;
            }
            if (row.status === 'approved') {
              return <span style={{ color: '#170e5e', fontWeight: 700, background: '#eef2ff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #c7d2fe', fontSize: '0.75rem' }}>معتمد للخصم</span>;
            }
            const isRed = row.status === 'needs_review' || row.status === 'pending';
            return isRed ? <span style={{ color: '#dc2626', fontWeight: 600 }}>{label}</span> : <span>{label}</span>;
          },
        },
        {
          key: 'actions',
          header: t('hr.attendance.attendance_exceptions_table.s8', "الإجراء"),
          className: 'col-fit',
          cell: (row) => {
            const isMissingCheckIn = row.exceptionType === 'missing_check_in';
            const isMissingCheckOut = row.exceptionType === 'missing_check_out';
            const isLateIn = row.exceptionType === 'late_check_in';
            const isEarlyOut = row.exceptionType === 'early_check_out';
            const isAbsent = row.exceptionType === 'absent';

            if (isOvertimeException(row.exceptionType)) {
              if (row.status === 'approved') {
                return (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isSkipPending}
                    onClick={() => { void onSkip(row.id); }}
                    style={{ padding: '2px 8px', fontSize: '0.72rem', color: '#64748b' }}
                  >
                    إلغاء الاعتماد
                  </Button>
                );
              }
              return (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isApprovePending || isSkipPending}
                    onClick={() => { void onApprove(row.id); }}
                    style={{ padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600, color: '#16a34a', borderColor: '#86efac' }}
                  >
                    {t('hr.attendance.attendance_exceptions_table.s9', "اعتماد كإضافي")}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isApprovePending || isSkipPending}
                    onClick={() => { void onSkip(row.id); }}
                    style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                  >
                    {t('hr.attendance.attendance_exceptions_table.s10', "تخطي")}
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
                        defaultTime: row.scheduledTime || (isMissingCheckIn ? '09:00' : '17:00'),
                        employeeName: row.employeeName,
                        employeeNo: row.employeeNo,
                        scheduledTime: row.scheduledTime,
                      });
                    }}
                    style={{ padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600, color: '#170e5e', borderColor: '#c7d2fe' }}
                  >
                    {t('hr.attendance.attendance_exceptions_table.s11', "تسجيل")} {isMissingCheckIn ? t('hr.attendance.attendance_exceptions_table.s12', "حضور") : t('hr.attendance.attendance_exceptions_table.s13', "انصراف")}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isSkipPending}
                    onClick={() => { void onSkip(row.id); }}
                    style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                  >
                    {t('hr.attendance.attendance_exceptions_table.s14', "تخطي")}
                  </Button>
                </div>
              );
            }

            if (isLateIn || isEarlyOut) {
              if (row.status === 'approved') {
                return (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isSkipPending}
                    onClick={() => { void onSkip(row.id); }}
                    style={{ padding: '2px 8px', fontSize: '0.72rem', color: '#16a34a', borderColor: '#86efac' }}
                    title="قبول عذر الموظف وإسقاط الخصم"
                  >
                    قبول العذر
                  </Button>
                );
              }
              if (row.status === 'skipped') {
                return (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isApprovePending}
                    onClick={() => { void onApprove(row.id); }}
                    style={{ padding: '2px 8px', fontSize: '0.72rem', color: '#dc2626', borderColor: '#fca5a5' }}
                    title="إلغاء العذر وتأكيد الخصم"
                  >
                    تأكيد الخصم
                  </Button>
                );
              }
              return (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isApprovePending}
                    onClick={() => { void onApprove(row.id); }}
                    style={{ padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    {t('hr.attendance.attendance_exceptions_table.s15', "تأكيد الخصم")}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isSkipPending}
                    onClick={() => { void onSkip(row.id); }}
                    style={{ padding: '2px 8px', fontSize: '0.75rem', color: '#16a34a', borderColor: '#86efac' }}
                  >
                    {t('hr.attendance.attendance_exceptions_table.s16', "تجاهل (عذر)")}
                  </Button>
                </div>
              );
            }

            if (isAbsent) {
              if (row.status === 'approved') {
                return (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isSkipPending}
                    onClick={() => { void onSkip(row.id); }}
                    style={{ padding: '2px 8px', fontSize: '0.72rem', color: '#16a34a', borderColor: '#86efac' }}
                  >
                    إسقاط الغياب (عذر)
                  </Button>
                );
              }
              return (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isApprovePending}
                    onClick={() => { void onApprove(row.id); }}
                    style={{ padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    {t('hr.attendance.attendance_exceptions_table.s17', "تأكيد الغياب")}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isSkipPending}
                    onClick={() => { void onSkip(row.id); }}
                    style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                  >
                    {t('hr.attendance.attendance_exceptions_table.s18', "تخطي")}
                  </Button>
                </div>
              );
            }

            return <span className="muted">{exceptionStatusLabel(row.status)}</span>;
          },
        },
      ]}
      />
    </div>
  );
};
