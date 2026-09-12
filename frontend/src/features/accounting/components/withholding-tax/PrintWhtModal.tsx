import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { XIcon, PrinterIcon } from '@/shared/components/icons/AppIcons';
import { formatCurrency, formatCurrencyWithSymbol } from '@/lib/format';
import type { WithholdingTaxRecord, Form41SummaryResponse } from '@/features/accounting/api/accounting.api';
import { WHT_TYPE_LABELS, QUARTERS } from './types';

interface PrintWhtModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedQuarter: string;
  selectedYear: number;
  reportData?: Form41SummaryResponse;
  filteredTransactions: WithholdingTaxRecord[];
}

export function PrintWhtModal({
  isOpen,
  onClose,
  selectedQuarter,
  selectedYear,
  reportData,
  filteredTransactions,
}: PrintWhtModalProps) {
  if (!isOpen) return null;

  const qObj = QUARTERS.find((q) => q.id === selectedQuarter);

  return (
    <DialogShell
      open={true}
      onClose={onClose}
      width="min(960px, 96vw)"
      ariaLabel="إقرار نموذج 41 ضرائب"
    >
      <div dir="rtl" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="standard-dialog-header">
          <div className="standard-dialog-header-info">
            <h3 className="standard-dialog-title">إقرار نموذج 41 ضرائب (الخصم والتحصيل تحت حساب الضريبة)</h3>
            <p className="standard-dialog-subtitle">عن {qObj?.label} سنة {selectedYear}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              onClick={() => window.print()}
              variant="secondary"
              style={{ fontSize: '12px', height: '32px' }}
            >
              <PrinterIcon size={14} className="ml-1" />
              طباعة A4
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

        {/* Printable Form 41 Official Paper */}
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '12px', padding: '24px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '18px', fontSize: '12px', color: '#0f172a' }}>
          {/* Official Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0 }}>جمهورية مصر العربية - وزارة المالية</h3>
              <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#334155', margin: '4px 0' }}>مصلحة الضرائب المصرية</h4>
              <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>إدارة تجميع نماذج الخصم والتحصيل</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ border: '2px solid #0f172a', padding: '6px 16px', borderRadius: '8px', fontWeight: 800, fontSize: '15px', backgroundColor: '#f8fafc' }}>
                نموذج 41 ضرائب
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginTop: '4px' }}>
                عن {qObj?.label} سنة {selectedYear}
              </span>
            </div>
          </div>

          {/* Summary Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>إجمالي عدد المعاملات:</span>
              <span style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>{reportData?.total_count || 0}</span>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>إجمالي وعاء التعامل:</span>
              <span style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>{formatCurrencyWithSymbol(reportData?.total_base_amount || 0)}</span>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>إجمالي الضريبة واجبة التوريد:</span>
              <span style={{ fontWeight: 800, fontSize: '14px', color: '#059669' }}>{formatCurrencyWithSymbol(reportData?.total_tax_amount || 0)}</span>
            </div>
          </div>

          {/* Printable Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '11px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>م</th>
                  <th style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>اسم الممول</th>
                  <th style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>الرقم الضريبي</th>
                  <th style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>رقم الفاتورة</th>
                  <th style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>تاريخها</th>
                  <th style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>طبيعة التعامل</th>
                  <th style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>النسبة</th>
                  <th style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>قيمة التعامل</th>
                  <th style={{ padding: '8px' }}>الضريبة المحصلة</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t, i) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>{i + 1}</td>
                    <td style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', fontWeight: 600 }}>{t.partner_name}</td>
                    <td style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', fontFamily: 'monospace' }}>{t.tax_id_number || '-'}</td>
                    <td style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', fontFamily: 'monospace' }}>{t.invoice_number}</td>
                    <td style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1' }}>{t.invoice_date}</td>
                    <td style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1' }}>{WHT_TYPE_LABELS[t.wht_type]?.label || t.wht_type}</td>
                    <td style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>{t.wht_rate}%</td>
                    <td style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', fontWeight: 700 }}>{formatCurrency(t.base_amount)}</td>
                    <td style={{ padding: '6px 8px', fontWeight: 700, color: '#065f46' }}>{formatCurrency(t.tax_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Official Declarations & Signatures */}
          <div style={{ paddingTop: '20px', borderTop: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '11px', color: '#475569', lineHeight: 1.6, textAlign: 'justify', margin: 0 }}>
              أقر أنا الموقع أدناه بصفتي المسئول عن المنشأة بأن كافة البيانات والمعاملات والمبالغ الموضحة بهذا الإقرار صحيحة وحقيقية ومطابقة للدفاتر والسجلات والمستندات المؤيدة، وأنه تم خصم المبالغ الموضحة وتوريدها لمصلحة الضرائب المصرية طبقاً لأحكام القانون 91 لسنة 2005 وتعديلاته.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', paddingTop: '16px', textAlign: 'center' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '36px' }}>المحاسب القانوني المعتمد</span>
                <div style={{ borderBottom: '1px solid #94a3b8', width: '180px', margin: '0 auto' }} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '36px' }}>توقيع وخاتم المنشأة / الممول</span>
                <div style={{ borderBottom: '1px solid #94a3b8', width: '180px', margin: '0 auto' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
