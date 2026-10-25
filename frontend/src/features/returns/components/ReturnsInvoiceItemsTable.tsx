import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/shared/ui/empty-state';
import { formatCurrency } from '@/lib/format';
import { remainingInvoiceLineQuantity } from '@/features/returns/lib/return-remaining-quantity';
import type { PurchaseItem, SaleItem } from '@/types/domain';

export function ReturnsInvoiceItemsTable({
  invoiceItems,
  selectedItems,
  selectedSerials,
  onToggleItem,
  onSetItemQty,
  onSetSerials,
  returnedQtyByLine = {},
  blockedProductIds = [],
  returnHistoryReady = false,
}: {
  invoiceItems: Array<SaleItem | PurchaseItem>;
  selectedItems: Record<string, string>;
  selectedSerials: Record<string, string>;
  onToggleItem: (itemId: string, checked: boolean) => void;
  onSetItemQty: (itemId: string, value: string) => void;
  onSetSerials: (itemId: string, value: string) => void;
  returnedQtyByLine?: Record<string, number>;
  blockedProductIds?: string[];
  returnHistoryReady?: boolean;
}) {
  const { t } = useTranslation();

  if (!invoiceItems.length) {
    return <EmptyState title={t('returns.empty_invoice_title', 'اختر فاتورة أولًا')} hint={t('returns.empty_invoice_hint', 'بعد اختيار الفاتورة ستظهر البنود لتحديد أكثر من بند في نفس المرتجع.')} />;
  }

  return (
    <div className="section-stack">
      <div className="surface-note">{t('returns.items_note', 'اختر بندًا أو أكثر ثم حدد الكمية لكل بند. التحقق النهائي يتم من السيرفر عند الحفظ.')}</div>
      <div className="table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('returns.col_select', 'اختيار')}</th>
              <th>{t('returns.col_product', 'الصنف')}</th>
              <th>{t('returns.col_base_qty', 'الكمية الأصلية')}</th>
              <th>{t('returns.col_return_qty', 'الكمية المرتجعة')}</th>
              <th>{t('returns.col_expected_val', 'القيمة المتوقعة')}</th>
            </tr>
          </thead>
          <tbody>
            {invoiceItems.map((item) => {
              const itemId = String(item.id || item.productId || '');
              const isSelected = Number(selectedItems[itemId] || 0) > 0;
              const qty = Number(selectedItems[itemId] || 0);
              const baseQty = Number(item.qty || 0);
              const alreadyReturnedQty = Number(returnedQtyByLine[itemId] || 0);
              const legacyBlocked = blockedProductIds.includes(String(item.productId));
              const remainingQty = remainingInvoiceLineQuantity(baseQty, alreadyReturnedQty,
                returnHistoryReady, legacyBlocked);
              const isFullyReturned = remainingQty <= 0.000001;
              const lineTotal = qty > 0 ? qty * (baseQty > 0 ? Number(item.total || 0) / baseQty : 0) : 0;
              return (
                <tr key={itemId} className={isFullyReturned ? 'muted' : ''} style={isFullyReturned ? { opacity: 0.58 } : undefined}>
                  <td>
                    <input type="checkbox" checked={isSelected} onChange={(e) => onToggleItem(itemId, e.target.checked)} disabled={isFullyReturned} title={isFullyReturned ? t('returns.fully_returned_hint', 'هذا الصنف تم إرجاعه بالكامل ولا يمكن إرجاعه مرة أخرى.') : undefined} />
                  </td>
                  <td>
                    <div>{item.name || '—'}</div>
                    {legacyBlocked ? <span className="status-pill danger">مرتجع قديم يحتاج تسوية</span> : null}
                    {isFullyReturned && !legacyBlocked ? <span className="status-pill danger">{t('returns.fully_returned_pill', 'تم إرجاعه بالكامل')}</span> : alreadyReturnedQty > 0 ? <span className="status-pill warning">{t('returns.remaining_qty', 'متبقي للإرجاع: {{qty}}', { qty: remainingQty })}</span> : null}
                    {'serials' in item && Array.isArray(item.serials) && item.serials.length > 0 ? (
                      <label style={{ display: 'block', marginTop: 6 }}>
                        {t('returns.serials_label', 'سيريالات المرتجع الجزئي')}
                        <input type="text" value={selectedSerials[itemId] || ''}
                          onChange={(event) => onSetSerials(itemId, event.target.value)}
                          placeholder={item.serials.join(', ')} disabled={!isSelected || isFullyReturned}
                          aria-label={t('returns.serials_aria', 'سيريالات مرتجع {{name}}', { name: item.name })} />
                      </label>
                    ) : null}
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
