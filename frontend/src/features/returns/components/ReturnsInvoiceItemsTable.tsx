import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency } from '@/lib/format';
import type { PurchaseItem, SaleItem } from '@/types/domain';

export function ReturnsInvoiceItemsTable({
  invoiceItems,
  selectedItems,
  onToggleItem,
  onSetItemQty,
}: {
  invoiceItems: Array<SaleItem | PurchaseItem>;
  selectedItems: Record<string, string>;
  onToggleItem: (productId: string, checked: boolean) => void;
  onSetItemQty: (productId: string, value: string) => void;
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
              const productId = String(item.productId || '');
              const isSelected = Number(selectedItems[productId] || 0) > 0;
              const qty = Number(selectedItems[productId] || 0);
              const baseQty = Number(item.qty || 0);
              const lineTotal = qty > 0 ? qty * (baseQty > 0 ? Number(item.total || 0) / baseQty : 0) : 0;
              return (
                <tr key={productId || item.id}>
                  <td>
                    <input type="checkbox" checked={isSelected} onChange={(e) => onToggleItem(productId, e.target.checked)} />
                  </td>
                  <td>{item.name || '—'}</td>
                  <td>{baseQty}</td>
                  <td>
                    <input type="number" min="0" step="0.001" value={selectedItems[productId] || ''} onChange={(e) => onSetItemQty(productId, e.target.value)} disabled={!isSelected} />
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
