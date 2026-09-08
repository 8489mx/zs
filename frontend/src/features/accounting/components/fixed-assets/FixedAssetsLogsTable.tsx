import React from 'react';
import { formatCurrency } from '@/lib/format';

interface FixedAssetsLogsTableProps {
  logs: any[];
}

export const FixedAssetsLogsTable: React.FC<FixedAssetsLogsTableProps> = ({ logs }) => {
  return (
    <section className="document-prototype-section">
      <div className="section-header-compact-row">
        <h3 className="document-prototype-section-title">سجل عمليات الإهلاك والقيود اليومية الآلية</h3>
        <div className="section-header-actions-group">
          <span className="nav-pill">{logs.length} قيد محاسبي</span>
        </div>
      </div>
      <p className="muted small section-header-subtitle">
        سجل القيود المحاسبية المولدة آلياً في شجرة الحسابات مع أرقام القيود ومجمعات الإهلاك.
      </p>
      <div style={{ overflowX: 'auto', marginTop: '14px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13.5px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '10px 12px' }}>تاريخ العملية</th>
              <th style={{ padding: '10px 12px' }}>الأصل</th>
              <th style={{ padding: '10px 12px' }}>قيمة الإهلاك</th>
              <th style={{ padding: '10px 12px' }}>مجمع الإهلاك الجديد</th>
              <th style={{ padding: '10px 12px' }}>القيمة الدفترية المتبقية</th>
              <th style={{ padding: '10px 12px' }}>رقم القيد المحاسبي</th>
              <th style={{ padding: '10px 12px' }}>البيان / الملاحظة</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  لا توجد قيود إهلاك مسجلة حتى الآن.
                </td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', color: '#64748b' }}>{new Date(l.period_date).toLocaleString('ar-EG')}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{l.asset_name || `أصل #${l.asset_id}`} ({l.asset_code || ''})</td>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#dc2626' }}>{formatCurrency(Number(l.depreciation_amount))}</td>
                  <td style={{ padding: '10px 12px', color: '#d97706' }}>{formatCurrency(Number(l.accumulated_amount))}</td>
                  <td style={{ padding: '10px 12px', color: '#16a34a', fontWeight: 700 }}>{formatCurrency(Number(l.book_value))}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '12px' }}>
                      {l.journal_entry_no || `JE-${l.journal_entry_id}`}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '13px' }}>{l.note}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
