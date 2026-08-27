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
    <FormSection
      title="تفاصيل المرتجع المحدد"
      actions={
        <div className="actions compact-actions" style={{ flexWrap: 'nowrap' }}>
          <Button variant="secondary" onClick={onPrint} disabled={!selectedReturn}>طباعة</Button>
          <Button variant="secondary" onClick={onCopy} disabled={!selectedReturn}>نسخ التفاصيل</Button>
        </div>
      }
      className="workspace-panel returns-detail-card"
    >
      {selectedReturn ? (
        <div className="returns-detail-grid-wrap">
          {/* 2-Column Balanced Grid */}
          <div className="returns-detail-two-cols">
            {/* Column 1: Document & Product Info */}
            <div className="detail-col">
              <div className="detail-item">
                <span className="item-label">رقم المستند</span>
                <strong className="item-value doc-tag">{selectedReturn.docNo || selectedReturn.id}</strong>
              </div>

              <div className="detail-item">
                <span className="item-label">النوع</span>
                <strong className="item-value">{returnTypeLabel(selectedReturn)}</strong>
              </div>

              {selectedReturn.invoiceDocNo || selectedReturn.invoiceId ? (
                <div className="detail-item">
                  <span className="item-label">مرجع الفاتورة</span>
                  <strong className="item-value ref-tag">
                    {selectedReturn.invoiceDocNo || (selectedReturn.returnType === 'purchase' ? `PO-${selectedReturn.invoiceId}` : `Z-${selectedReturn.invoiceId}`)}
                  </strong>
                </div>
              ) : null}

              <div className="detail-item">
                <span className="item-label">الصنف</span>
                <strong className="item-value product-tag">{selectedReturn.productName || '—'}</strong>
              </div>

              <div className="detail-item">
                <span className="item-label">الكمية</span>
                <strong className="item-value qty-tag">{selectedReturn.qty || 0}</strong>
              </div>
            </div>

            {/* Column 2: Customer, Cashier & Financials */}
            <div className="detail-col">
              <div className="detail-item">
                <span className="item-label">الجهة / العميل</span>
                <strong className="item-value">{selectedReturn.partyName || selectedReturn.customerName || 'عميل نقدي'}</strong>
              </div>

              <div className="detail-item">
                <span className="item-label">بواسطة</span>
                <strong className="item-value cashier-tag">{selectedReturn.createdByName || selectedReturn.createdBy || 'كاشير عام'}</strong>
              </div>

              <div className="detail-item">
                <span className="item-label">طريقة الرد</span>
                <strong className="item-value">
                  {selectedReturn.refundMethod === 'card' ? 'بطاقة / فيزا' : selectedReturn.settlementMode === 'store_credit' ? 'رصيد عميل' : 'نقدي (من الدرج)'}
                </strong>
              </div>

              <div className="detail-item">
                <span className="item-label">التاريخ</span>
                <strong className="item-value">{formatDate(getReturnDateValue(selectedReturn))}</strong>
              </div>

              <div className="detail-item total-highlight-item">
                <span className="item-label">الإجمالي المسترد</span>
                <strong className="item-value total-hero">{formatCurrency(Number(selectedReturn.total || 0))}</strong>
              </div>
            </div>
          </div>

          {/* Notes Full-Width Box */}
          {selectedReturn.note ? (
            <div className="detail-note-panel">
              <span className="note-title">ملاحظات:</span>
              <span className="note-text">{selectedReturn.note}</span>
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyState title="اختر مرتجعًا من الجدول" hint="ستظهر التفاصيل هنا بعد الاختيار." />
      )}
    </FormSection>
  );
}
