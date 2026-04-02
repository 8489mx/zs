import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency } from '@/lib/format';
import type { Purchase, Sale } from '@/types/domain';

export function ReturnsSelectedInvoiceCard({
  selectedInvoice,
  selectedItemsCount,
  selectedQtyTotal,
  expectedReturnValue,
}: {
  selectedInvoice?: Sale | Purchase;
  selectedItemsCount: number;
  selectedQtyTotal: number;
  expectedReturnValue: number;
}) {
  return (
    <Card title="ملخص الفاتورة والبنود المختارة" description="راجع الفاتورة وعدد البنود المختارة وقيمة المرتجع المتوقعة قبل الحفظ." actions={<span className="nav-pill">مرجع سريع</span>} className="workspace-panel returns-summary-card">
      {selectedInvoice ? (
        <div className="metric-list">
          <div className="metric-row"><span>رقم الفاتورة</span><strong>{selectedInvoice.docNo || selectedInvoice.id}</strong></div>
          <div className="metric-row"><span>الطرف</span><strong>{('customerName' in selectedInvoice ? selectedInvoice.customerName : selectedInvoice.supplierName) || '—'}</strong></div>
          <div className="metric-row"><span>الإجمالي</span><strong>{formatCurrency(Number(selectedInvoice.total || 0))}</strong></div>
          <div className="metric-row"><span>عدد البنود</span><strong>{(selectedInvoice.items || []).length}</strong></div>
          <div className="metric-row"><span>البنود المختارة</span><strong>{selectedItemsCount}</strong></div>
          <div className="metric-row"><span>الكمية الإجمالية</span><strong>{selectedQtyTotal}</strong></div>
          <div className="metric-row"><span>قيمة المرتجع المتوقعة</span><strong>{selectedItemsCount ? formatCurrency(expectedReturnValue) : '—'}</strong></div>
        </div>
      ) : <EmptyState title="اختر فاتورة لعرض بنودها" hint="عند اختيار الفاتورة ستتمكن من تحديد أكثر من بند وكميته في نفس المرتجع." />}
    </Card>
  );
}
