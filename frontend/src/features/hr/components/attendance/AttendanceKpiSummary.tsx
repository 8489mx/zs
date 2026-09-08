import React from 'react';
import type { ExceptionFilter } from './attendance-types';

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  unmarked: number;
  needsAction: number;
  overtime: number;
  deduction: number;
}

interface AttendanceKpiSummaryProps {
  summary: AttendanceSummary;
  activeTab: 'attendance' | 'exceptions';
  attendanceFilter: 'all' | 'unmarked' | 'recorded';
  exceptionFilter: ExceptionFilter;
  onSelectAttendanceFilter: (filter: 'all' | 'unmarked' | 'recorded') => void;
  onSelectExceptionFilter: (filter: ExceptionFilter) => void;
}

export const AttendanceKpiSummary: React.FC<AttendanceKpiSummaryProps> = ({
  summary,
  activeTab,
  attendanceFilter,
  exceptionFilter,
  onSelectAttendanceFilter,
  onSelectExceptionFilter,
}) => {
  const stats = [
    {
      label: 'إجمالي اليوم',
      value: summary.total,
      onClick: () => onSelectAttendanceFilter('all'),
      isAlert: false,
      active: activeTab === 'attendance' && attendanceFilter === 'all',
    },
    {
      label: 'حاضر',
      value: summary.present,
      onClick: () => onSelectAttendanceFilter('recorded'),
      isAlert: false,
      active: activeTab === 'attendance' && attendanceFilter === 'recorded',
    },
    {
      label: 'غائب',
      value: summary.absent,
      onClick: () => onSelectExceptionFilter('needs_action'),
      isAlert: summary.absent > 0,
    },
    {
      label: 'متأخر',
      value: summary.late,
      onClick: () => onSelectExceptionFilter('deduction'),
      isAlert: summary.late > 0,
    },
    {
      label: 'غير مسجل',
      value: summary.unmarked,
      onClick: () => onSelectAttendanceFilter('unmarked'),
      isAlert: summary.unmarked > 0,
      active: activeTab === 'attendance' && attendanceFilter === 'unmarked',
    },
    {
      label: 'تحتاج إجراء',
      value: summary.needsAction,
      onClick: () => onSelectExceptionFilter('needs_action'),
      isAlert: summary.needsAction > 0,
      active: activeTab === 'exceptions' && exceptionFilter === 'needs_action',
    },
    {
      label: 'إضافي محتمل',
      value: summary.overtime,
      onClick: () => onSelectExceptionFilter('overtime'),
      isAlert: false,
      active: activeTab === 'exceptions' && exceptionFilter === 'overtime',
    },
    {
      label: 'خصم محتمل',
      value: summary.deduction,
      onClick: () => onSelectExceptionFilter('deduction'),
      isAlert: summary.deduction > 0,
      active: activeTab === 'exceptions' && exceptionFilter === 'deduction',
    },
  ];

  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#0f172a' }}>ملخص حضور اليوم والاستثناءات</span>
        <span style={{ fontSize: '0.725rem', color: '#64748b' }}>اضغط على أي مؤشر للتبديل والتصفية الفورية</span>
      </div>

      <div className="hr-operational-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: '8px' }}>
        {stats.map((stat, idx) => (
          <div
            key={idx}
            onClick={stat.onClick}
            style={{
              background: stat.active ? '#eff6ff' : '#ffffff',
              border: `1px solid ${stat.active ? '#3b82f6' : stat.isAlert ? '#fca5a5' : '#e2e8f0'}`,
              borderRadius: '6px',
              padding: '8px 10px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              minWidth: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#94a3b8')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = stat.active ? '#3b82f6' : stat.isAlert ? '#fca5a5' : '#e2e8f0')}
          >
            <span style={{ fontSize: '0.725rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={stat.label}>
              {stat.label}
            </span>
            <strong style={{ fontSize: '1.05rem', fontWeight: 800, color: stat.isAlert ? '#dc2626' : stat.active ? '#1d4ed8' : '#0f172a', lineHeight: 1.2 }}>
              {stat.value}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
};
