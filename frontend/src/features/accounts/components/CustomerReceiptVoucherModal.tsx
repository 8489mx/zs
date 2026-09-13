import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { PrinterIcon, XIcon } from '@/shared/components/icons/AppIcons';
import { formatCurrency } from '@/lib/format';
import { useAuthStore } from '@/stores/auth-store';

export interface CustomerReceiptData {
  id?: number | string;
  docNo?: string;
  customerId: string | number;
  customerName: string;
  amount: number;
  balanceBefore?: number;
  balanceAfter?: number;
  note?: string;
  createdAt?: string;
}

export interface CustomerReceiptVoucherModalProps {
  open: boolean;
  receipt: CustomerReceiptData | null;
  onClose: () => void;
}

export function CustomerReceiptVoucherModal({
  open,
  receipt,
  onClose,
}: CustomerReceiptVoucherModalProps) {
  const storeName = useAuthStore((s) => s.storeName) || 'المنشأة';
  if (!open || !receipt) return null;

  const now = receipt.createdAt ? new Date(receipt.createdAt) : new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const fallbackSeq = (receipt.id || 1).toString().replace(/\D/g, '').padStart(4, '0').slice(-4);
  const fallbackDocNo = `REC-${yy}${mm}${dd}-${fallbackSeq}`;
  const docNumber = (receipt.docNo && receipt.docNo.split('-').length === 3)
    ? receipt.docNo
    : fallbackDocNo;
  const isAdvance = (receipt.balanceBefore ?? 0) <= 0;
  const paymentTypeLabel = isAdvance ? 'دفعة مقدمة / عربون على الحساب' : 'سداد مديونية / تحصيل على الحساب';
  const displayDate = receipt.createdAt
    ? new Date(receipt.createdAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      width='min(680px, 95vw)'
      ariaLabel='سند قبض مالي'
    >
      <div className='standard-dialog-header'>
        <div>
          <h2 className='standard-dialog-title' style={{ fontSize: '1.1rem', fontWeight: 800, color: '#170c5c' }}>
            سند قبض مالي معتمد
          </h2>
          <p className='standard-dialog-subtitle'>
            معاينة وطباعة السند المالي الرسمي لحساب العميل
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            type='button'
            onClick={() => window.print()}
            variant='secondary'
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              padding: '6px 14px',
              borderRadius: '8px',
              fontWeight: 700,
            }}
          >
            <PrinterIcon size={14} />
            <span>طباعة السند</span>
          </Button>
          <button
            type='button'
            onClick={onClose}
            className='standard-dialog-close-btn'
            aria-label='إغلاق'
          >
            <XIcon size={18} />
          </button>
        </div>
      </div>

      <div className='standard-dialog-body' style={{ padding: '20px' }}>
        <div style={{
          border: '2px dashed #cbd5e1',
          borderRadius: '12px',
          padding: '24px',
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          fontSize: '13px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid #0f172a',
            paddingBottom: '12px',
          }}>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0' }}>
                {storeName}
              </h3>
              <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                إدارة الشؤون المالية والحسابات
              </p>
            </div>
            <div style={{ textAlign: 'left', fontFamily: 'monospace', fontSize: '12px', color: '#1e293b' }}>
              <div style={{ fontWeight: 800, color: '#170e5e', fontSize: '13px' }}>رقم السند: {docNumber}</div>
              <div style={{ color: '#64748b', fontSize: '11px' }}>التاريخ: {displayDate}</div>
            </div>
          </div>

          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontWeight: 600, color: '#475569' }}>نوع القيد المالي:</span>
            <span style={{
              backgroundColor: isAdvance ? '#e0f2fe' : '#dcfce7',
              color: isAdvance ? '#0369a1' : '#166534',
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: '6px',
              fontSize: '12px',
            }}>
              {paymentTypeLabel}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '8px 0' }}>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '11px', marginBottom: '4px' }}>استلمنا من السيد / السادة:</span>
              <span style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>{receipt.customerName}</span>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '11px', marginBottom: '4px' }}>المبلغ المحصل وقدره:</span>
              <span style={{ fontWeight: 900, fontSize: '18px', color: '#166534' }}>
                {formatCurrency(receipt.amount)}
              </span>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '11px', marginBottom: '4px' }}>الرصيد السابق قبل السند:</span>
              <span style={{ fontWeight: 700, fontSize: '13px', color: (receipt.balanceBefore ?? 0) > 0 ? '#b91c1c' : '#475569' }}>
                {formatCurrency(receipt.balanceBefore ?? 0)}
              </span>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '11px', marginBottom: '4px' }}>الرصيد بعد قيد السند:</span>
              <span style={{ fontWeight: 800, fontSize: '13px', color: (receipt.balanceAfter ?? 0) < 0 ? '#0284c7' : '#0f172a' }}>
                {formatCurrency(receipt.balanceAfter ?? 0)}
                {(receipt.balanceAfter ?? 0) < 0 && ' (رصيد دائن / لصالح العميل)'}
              </span>
            </div>
          </div>

          {receipt.note && (
            <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '11px', marginBottom: '2px' }}>البيان / تفاصيل الشحنة والملاحظات:</span>
              <span style={{ color: '#1e293b', fontWeight: 600 }}>{receipt.note}</span>
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '32px',
            paddingTop: '28px',
            borderTop: '1px solid #e2e8f0',
            textAlign: 'center',
          }}>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '32px' }}>توقيع المستلم / أمين الخزينة</span>
              <div style={{ borderBottom: '1px solid #cbd5e1', width: '140px', margin: '0 auto' }} />
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '32px' }}>توقيع المحاسب / الإدارة المالية</span>
              <div style={{ borderBottom: '1px solid #cbd5e1', width: '140px', margin: '0 auto' }} />
            </div>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
