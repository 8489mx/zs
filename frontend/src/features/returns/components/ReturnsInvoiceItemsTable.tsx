import { EmptyState } from '@/shared/ui/empty-state';
import { formatCurrency } from '@/lib/format';
import type { PurchaseItem, SaleItem } from '@/types/domain';

export function ReturnsInvoiceItemsTable({
  invoiceItems,
  selectedItems,
  onToggleItem,
  onSetItemQty,
  returnedQtyByProduct = {},
}: {
  invoiceItems: Array<SaleItem | PurchaseItem>;
  selectedItems: Record<string, string>;
  onToggleItem: (itemId: string, checked: boolean) => void;
  onSetItemQty: (itemId: string, value: string) => void;
  returnedQtyByProduct?: Record<string, number>;
}) {
  if (!invoiceItems.length) {
    return <EmptyState title="اختر فاتورة أولًا" hint="بعد اختيار الفاتورة ستظهر البنود لتحديد أكثر من بند في نفس المرتجع." />;
  }

  return (
    <div className="section-stack">
      <div className="surface-note">اختر بندًا أو أكثر ثم حدد الكمية لكل بند. التحقق النهائي يتم من السيرفر عند الحفظ.</div>
      <div className="table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th>اختيار</th>
              <th>الصنف</th>
              <th>الكمية الأصلية</th>
              <th>الكمية المرتجعة</th>
              <th>القيمة المتوقعة</th>
            </tr>
          </thead>
          <tbody>
            {invoiceItems.map((item) => {
              const itemId = String(item.id || item.productId || '');
              const isSelected = Number(selectedItems[itemId] || 0) > 0;
              const qty = Number(selectedItems[itemId] || 0);
              const baseQty = Number(item.qty || 0);
              const alreadyReturnedQty = Number(returnedQtyByProduct[String(item.productId)] || 0);
              const remainingQty = Math.max(0, baseQty - alreadyReturnedQty);
              const isFullyReturned = remainingQty <= 0.000001;
              const lineTotal = qty > 0 ? qty * (baseQty > 0 ? Number(item.total || 0) / baseQty : 0) : 0;
              return (
                <tr key={itemId} className={isFullyReturned ? 'muted' : ''} style={isFullyReturned ? { opacity: 0.58 } : undefined}>
                  <td>
                    <input type="checkbox" checked={isSelected} onChange={(e) => onToggleItem(itemId, e.target.checked)} disabled={isFullyReturned} title={isFullyReturned ? 'هذا الصنف تم إرجاعه بالكامل ولا يمكن إرجاعه مرة أخرى.' : undefined} />
                  </td>
                  <td>
                    <div>{item.name || '—'}</div>
                    {isFullyReturned ? <span className="status-pill danger">تم إرجاعه بالكامل</span> : alreadyReturnedQty > 0 ? <span className="status-pill warning">متبقي للإرجاع: {remainingQty}</span> : null}
                  </td>
                  <td>{baseQty}</td>
                  <td>
                    <input type="number" min="0" max={remainingQty || undefined} step="0.001" value={selectedItems[itemId] || ''} onChange={(e) => onSetItemQty(itemId, e.target.value)} disabled={!isSelected || isFullyReturned} />
                  </td>
                  <td>{isSelected ? formatCurrency(lineTotal) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
