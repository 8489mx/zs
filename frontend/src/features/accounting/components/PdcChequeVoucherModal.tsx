import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { PrinterIcon, XIcon } from '@/shared/components/icons/AppIcons';
import { formatCurrency } from '@/lib/format';
import type { PdcCheque, ChequeStatus } from '../api/accounting.api';

export interface PdcChequeVoucherModalProps {
  open: boolean;
  cheque: PdcCheque | null;
  onClose: () => void;
  statusLabels?: Record<ChequeStatus, { text: string; bg: string; color: string; border: string }>;
}

const DEFAULT_STATUS_LABELS: Record<string, { text: string }> = {
  in_safe: { text: 'في الخزينة' },
  under_collection: { text: 'برسم التحصيل' },
  collected: { text: 'محصل بالبنك' },
  bounced: { text: 'مرتد / مرفوض' },
  endorsed: { text: 'مظهر لمورد' },
  returned: { text: 'مردود للعميل' },
  cancelled: { text: 'ملغى' },
};

export function PdcChequeVoucherModal({
  open,
  cheque,
  onClose,
  statusLabels,
}: PdcChequeVoucherModalProps) {
  if (!open || !cheque) return null;

  const statusText = statusLabels?.[cheque.status]?.text || DEFAULT_STATUS_LABELS[cheque.status]?.text || cheque.status;

  return (
    <DialogShell
      isOpen={open}
      onClose={onClose}
      size="lg"
    >
      <div className="standard-dialog-header">
        <div>
          <h2 className="standard-dialog-title">
            سند استلام / تسليم شيك بنكي
          </h2>
          <p className="standard-dialog-subtitle">
            معاينة وطباعة السند المالي المعتمد للشيك
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            type="button"
            onClick={() => window.print()}
            variant="secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              padding: '6px 12px',
              borderRadius: '8px',
            }}
          >
            <PrinterIcon size={14} />
            <span>طباعة السند</span>
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

      <div className="standard-dialog-body">
        {/* Printable Voucher Paper */}
        <div style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '24px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                {cheque.type === 'receivable' ? 'سند استلام شيك (ورقة قبض)' : 'سند تسليم شيك (ورقة دفع)'}
              </h3>
              <p style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace', margin: 0 }}>
                رقم الإيصال: REC-CHK-{cheque.id}
              </p>
            </div>
            <div style={{ textAlign: 'left', fontFamily: 'monospace', fontSize: '11px', color: '#475569' }}>
              <div>التاريخ: {cheque.issue_date}</div>
              <div>الحالة: {statusText}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', padding: '8px 0' }}>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>وصلنا من / سلم إلى:</span>
              <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{cheque.partner_name}</span>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>المبلغ وقدره:</span>
              <span style={{ fontWeight: 800, fontSize: '14px', color: '#047857' }}>
                {formatCurrency(cheque.amount)} {cheque.currency}
              </span>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>رقم الشيك:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{cheque.cheque_number}</span>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>مسحوب على بنك:</span>
              <span style={{ fontWeight: 600, fontSize: '13px', color: '#334155' }}>{cheque.bank_name}</span>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>تاريخ الاستحقاق:</span>
              <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{cheque.due_date}</span>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>الفرع:</span>
              <span style={{ fontSize: '13px', color: '#334155' }}>{cheque.branch_name || 'الرئيسي'}</span>
            </div>
          </div>

          {cheque.notes && (
            <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>ملاحظات:</span>
              <span style={{ color: '#334155', fontSize: '12px' }}>{cheque.notes}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', paddingTop: '24px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '32px' }}>توقيع المستلم / أمين الخزينة</span>
              <div style={{ borderBottom: '1px solid #cbd5e1', width: '130px', margin: '0 auto' }} />
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '32px' }}>توقيع المعتمد / الإدارة المالية</span>
              <div style={{ borderBottom: '1px solid #cbd5e1', width: '130px', margin: '0 auto' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="standard-dialog-footer">
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '8px' }}
        >
          إغلاق
        </Button>
      </div>
    </DialogShell>
  );
}
