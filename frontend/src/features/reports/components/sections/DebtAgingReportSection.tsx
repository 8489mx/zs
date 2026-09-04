import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi, DebtAgingPartyRow } from '@/features/reports/api/reports.api';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/shared/ui/button';

export function DebtAgingReportSection() {
  const [activeTab, setActiveTab] = useState<'receivables' | 'payables'>('receivables');
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['reports', 'debt-aging'],
    queryFn: () => reportsApi.debtAging(),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
        جاري حساب وتحميل تقرير أعمار الديون...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#dc2626' }}>
        تعذر تحميل تقرير أعمار الديون. <Button variant="secondary" onClick={() => refetch()}>إعادة المحاولة</Button>
      </div>
    );
  }

  const summary = activeTab === 'receivables' ? data.receivablesSummary : data.payablesSummary;
  const rows: DebtAgingPartyRow[] = activeTab === 'receivables' ? data.receivables : data.payables;

  const filteredRows = rows.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) || r.phone.includes(search)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
      {/* 1. Top Controls Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        background: '#ffffff',
        padding: '14px 18px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('receivables')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '13px',
              background: activeTab === 'receivables' ? '#170e5e' : '#f1f5f9',
              color: activeTab === 'receivables' ? '#ffffff' : '#334155',
              transition: 'all 0.15s ease',
            }}
          >
            مديونيات العملاء (Receivables)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payables')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '13px',
              background: activeTab === 'payables' ? '#170e5e' : '#f1f5f9',
              color: activeTab === 'payables' ? '#ffffff' : '#334155',
              transition: 'all 0.15s ease',
            }}
          >
            مستحقات الموردين (Payables)
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="text"
            placeholder="بحث بالاسم أو الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              width: '220px',
            }}
          />
        </div>
      </div>

      {/* 2. Summary Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
      }}>
        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>إجمالي المستحقات</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
            {formatCurrency(summary.total)}
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>جارية (0 - 30 يوم)</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#166534', marginTop: '4px' }}>
            {formatCurrency(summary.current)}
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#0369a1', fontWeight: 600 }}>متأخرة (31 - 60 يوم)</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0369a1', marginTop: '4px' }}>
            {formatCurrency(summary.days31To60)}
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#b45309', fontWeight: 600 }}>متأخرة (61 - 90 يوم)</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#b45309', marginTop: '4px' }}>
            {formatCurrency(summary.days61To90)}
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>حرجة (+90 يوم)</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#dc2626', marginTop: '4px' }}>
            {formatCurrency(summary.over90)}
          </div>
        </div>
      </div>

      {/* 3. Detailed Data Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>
            {activeTab === 'receivables' ? 'تفاصيل أعمار ديون العملاء' : 'تفاصيل أعمار مستحقات الموردين'} ({filteredRows.length})
          </h4>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '12px 16px' }}>الاسم</th>
                <th style={{ padding: '12px 16px' }}>الهاتف</th>
                <th style={{ padding: '12px 16px' }}>إجمالي الرصيد</th>
                <th style={{ padding: '12px 16px', color: '#166534' }}>0 - 30 يوم</th>
                <th style={{ padding: '12px 16px', color: '#0369a1' }}>31 - 60 يوم</th>
                <th style={{ padding: '12px 16px', color: '#b45309' }}>61 - 90 يوم</th>
                <th style={{ padding: '12px 16px', color: '#dc2626' }}>+90 يوم</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                    لا توجد سجلات مطابقة.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                      {row.name}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {row.phone || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0f172a' }}>
                      {formatCurrency(row.totalBalance)}
                    </td>
                    <td style={{ padding: '12px 16px', color: row.current > 0 ? '#166534' : '#94a3b8', fontWeight: row.current > 0 ? 700 : 400 }}>
                      {row.current > 0 ? formatCurrency(row.current) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: row.days31To60 > 0 ? '#0369a1' : '#94a3b8', fontWeight: row.days31To60 > 0 ? 700 : 400 }}>
                      {row.days31To60 > 0 ? formatCurrency(row.days31To60) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: row.days61To90 > 0 ? '#b45309' : '#94a3b8', fontWeight: row.days61To90 > 0 ? 700 : 400 }}>
                      {row.days61To90 > 0 ? formatCurrency(row.days61To90) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: row.over90 > 0 ? '#dc2626' : '#94a3b8', fontWeight: row.over90 > 0 ? 800 : 400 }}>
                      {row.over90 > 0 ? formatCurrency(row.over90) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
