import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { formatCurrency, formatCurrencyWithSymbol, formatDateOnly } from '@/lib/format';
import { XIcon, PrinterIcon } from '@/shared/components/icons/AppIcons';

interface CostCenterReportModalProps {
  centerId: number | null;
  onClose: () => void;
  reportData: any;
  isLoading: boolean;
  fromDate: string;
  toDate: string;
  onFromDateChange: (val: string) => void;
  onToDateChange: (val: string) => void;
}

export function CostCenterReportModal({
  centerId,
  onClose,
  reportData,
  isLoading,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
}: CostCenterReportModalProps) {
  if (!centerId) return null;

  return (
    <DialogShell
      open={true}
      onClose={onClose}
      width="min(860px, 96vw)"
      ariaLabel="كشف حساب مركز التكلفة"
    >
      <div dir="rtl" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="standard-dialog-header">
          <div className="standard-dialog-header-info">
            <h3 className="standard-dialog-title">
              كشف حركات وتقرير مركز التكلفة: {reportData?.center?.name || '...'} ({reportData?.center?.code || ''})
            </h3>
            <p className="standard-dialog-subtitle">
              بيان كافة القيود والمصروفات والإيرادات المحملة على هذا المركز
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              variant="secondary"
              onClick={() => window.print()}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', height: '32px' }}
            >
              <PrinterIcon size={14} />
              <span>طباعة A4</span>
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="standard-dialog-close-btn"
              aria-label="إغلاق"
            >
              <XIcon size={18} />
            </button>
          </div>
        </div>

        {/* Filter dates */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>من تاريخ:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => onFromDateChange(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>إلى تاريخ:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => onToDateChange(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            />
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            جاري استخراج بيانات التقرير...
          </div>
        ) : (
          <div>
            {/* Totals Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
                <div style={{ fontSize: '11.5px', color: '#64748b' }}>إجمالي المدين (المصروفات)</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#dc2626' }}>
                  {formatCurrencyWithSymbol(reportData?.summary?.totalDebit || 0)}
                </div>
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
                <div style={{ fontSize: '11.5px', color: '#64748b' }}>إجمالي الدائن (الإيرادات)</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#059669' }}>
                  {formatCurrencyWithSymbol(reportData?.summary?.totalCredit || 0)}
                </div>
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
                <div style={{ fontSize: '11.5px', color: '#64748b' }}>صافي الرصيد</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#170e5e' }}>
                  {formatCurrencyWithSymbol(reportData?.summary?.netBalance || 0)}
                </div>
              </div>
            </div>

            {/* Entries Table */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '8px 12px' }}>التاريخ</th>
                    <th style={{ padding: '8px 12px' }}>رقم القيد</th>
                    <th style={{ padding: '8px 12px' }}>الحساب</th>
                    <th style={{ padding: '8px 12px' }}>البيان</th>
                    <th style={{ padding: '8px 12px' }}>مدين</th>
                    <th style={{ padding: '8px 12px' }}>دائن</th>
                  </tr>
                </thead>
                <tbody>
                  {(!reportData?.entries || reportData.entries.length === 0) ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                        لا توجد قيود مسجلة على هذا المركز في الفترة المحددة.
                      </td>
                    </tr>
                  ) : (
                    reportData.entries.map((ent: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px' }}>{formatDateOnly(ent.entryDate)}</td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700 }}>#{ent.entryNumber}</td>
                        <td style={{ padding: '8px 12px' }}>{ent.accountName}</td>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>{ent.description || '—'}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#dc2626' }}>{ent.debit ? formatCurrency(ent.debit) : '—'}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#059669' }}>{ent.credit ? formatCurrency(ent.credit) : '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DialogShell>
  );
}
