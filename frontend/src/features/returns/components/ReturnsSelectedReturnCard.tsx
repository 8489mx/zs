import { FormSection } from '@/shared/components/form-section';
import { EmptyState } from '@/shared/ui/empty-state';
import { Button } from '@/shared/ui/button';
import { formatCurrency, formatDate } from '@/lib/format';
import { getReturnDateValue, returnTypeLabel } from '@/features/returns/lib/returns-workspace.helpers';
import type { ReturnRecord } from '@/types/domain';

export function ReturnsSelectedReturnCard({
  selectedReturn,
  onPrint,
  onCopy,
}: {
  selectedReturn: ReturnRecord | null;
  onPrint: () => void;
  onCopy: () => void;
}) {
  return (
    <FormSection title="تفاصيل المرتجع المحدد" actions={<div className="actions compact-actions" style={{ flexWrap: 'nowrap' }}><Button variant="secondary" onClick={onPrint} disabled={!selectedReturn}>طباعة</Button><Button variant="secondary" onClick={onCopy} disabled={!selectedReturn}>نسخ التفاصيل</Button></div>} className="workspace-panel returns-detail-card">
      {selectedReturn ? (
        <div className="section-stack">
            <div className="metric-row"><span>رقم المستند</span><strong>{selectedReturn.docNo || selectedReturn.id}</strong></div>
            <div className="metric-row"><span>النوع</span><strong>{returnTypeLabel(selectedReturn)}</strong></div>
            {selectedReturn.invoiceDocNo || selectedReturn.invoiceId ? (
              <div className="metric-row"><span>مرجع الفاتورة</span><strong>{selectedReturn.invoiceDocNo || (selectedReturn.returnType === 'purchase' ? `PO-${selectedReturn.invoiceId}` : `Z-${selectedReturn.invoiceId}`)}</strong></div>
            ) : null}
            {selectedReturn.partyName ? (
              <div className="metric-row"><span>الجهة / العميل</span><strong>{selectedReturn.partyName}</strong></div>
            ) : null}
            {selectedReturn.createdByName ? (
              <div className="metric-row"><span>بواسطة</span><strong>{selectedReturn.createdByName}</strong></div>
            ) : null}
            <div className="metric-row"><span>الصنف</span><strong>{selectedReturn.productName || '—'}</strong></div>
            <div className="metric-row"><span>الكمية</span><strong>{selectedReturn.qty || 0}</strong></div>
            <div className="metric-row"><span>الإجمالي المسترد</span><strong>{formatCurrency(Number(selectedReturn.total || 0))}</strong></div>
            <div className="metric-row"><span>طريقة الرد</span><strong>{selectedReturn.refundMethod === 'card' ? 'بطاقة / فيزا' : selectedReturn.settlementMode === 'store_credit' ? 'رصيد عميل' : 'نقدي'}</strong></div>
            <div className="metric-row"><span>التاريخ</span><strong>{formatDate(getReturnDateValue(selectedReturn))}</strong></div>
            <div className="surface-note">{selectedReturn.note || 'لا توجد ملاحظات.'}</div>
        </div>
      ) : <EmptyState title="اختر مرتجعًا من الجدول" hint="ستظهر التفاصيل هنا بعد الاختيار." />}
    </FormSection>
  );
}
