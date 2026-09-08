import React from 'react';
import { CustomSelect } from '@/shared/ui/custom-select';
import { reportTypeOptions, type ReportType } from './hr-reports.helpers';

interface HrReportsFiltersToolbarProps {
  search: string;
  setSearch: (s: string) => void;
  from: string;
  setFrom: (f: string) => void;
  to: string;
  setTo: (t: string) => void;
  month: string;
  setMonth: (m: string) => void;
  departmentFilter: string;
  setDepartmentFilter: (d: string) => void;
  departmentOptions: Array<{ value: string; label: string }>;
  reportType: ReportType;
  setReportType: (t: ReportType) => void;
}

export const HrReportsFiltersToolbar: React.FC<HrReportsFiltersToolbarProps> = ({
  search,
  setSearch,
  from,
  setFrom,
  to,
  setTo,
  month,
  setMonth,
  departmentFilter,
  setDepartmentFilter,
  departmentOptions,
  reportType,
  setReportType,
}) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="بحث بالاسم أو الكود..."
        style={{ width: '190px', minWidth: '150px', height: '34px', padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', background: '#fff', boxSizing: 'border-box' }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>من:</span>
        <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} style={{ height: '34px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#fff', boxSizing: 'border-box' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>إلى:</span>
        <input type="date" value={to} onChange={(event) => setTo(event.target.value)} style={{ height: '34px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#fff', boxSizing: 'border-box' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>الشهر:</span>
        <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} style={{ height: '34px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#fff', boxSizing: 'border-box' }} />
      </div>

      <div style={{ width: '150px' }}>
        <CustomSelect
          value={departmentFilter}
          onChange={(val) => setDepartmentFilter(val)}
          options={[
            { value: 'all', label: 'كل الأقسام' },
            ...departmentOptions.map((option) => ({ value: option.value, label: option.label })),
          ]}
        />
      </div>

      <div style={{ width: '160px' }}>
        <CustomSelect
          value={reportType}
          onChange={(val) => setReportType(val as ReportType)}
          options={reportTypeOptions}
        />
      </div>
    </div>
  );
};
