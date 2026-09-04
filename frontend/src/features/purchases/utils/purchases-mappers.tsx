import { SINGLE_STORE_MODE } from '@/config/product-scope';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Purchase } from '@/types/domain';
import { matchTransactionSearch, sumTransactionTotals } from '@/lib/domain/transactions';

export function filterPurchaseRows(rows: Purchase[], search: string) {
  return rows.filter((purchase) => matchTransactionSearch(purchase, search));
}

export function getPurchaseTotals(rows: Purchase[]) {
  return sumTransactionTotals(rows);
}

export function getPurchaseColumns() {
  return [
    { key: 'docNo', header: 'الرقم', cell: (purchase: Purchase) => purchase.docNo || '—' },
    {
      key: 'supplierName',
      header: 'المورد',
      cell: (purchase: Purchase) => (
        <div>
          <strong>{purchase.supplierName || '—'}</strong>
          <div className="muted small">{SINGLE_STORE_MODE ? (purchase.locationName || 'المخزن الأساسي') : `${purchase.branchName || 'بدون فرع'} · ${purchase.locationName || 'بدون موقع'}`}</div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'الحالة والمطابقة',
      cell: (purchase: Purchase) => {
        const isOrder = purchase.lifecycleStatus === 'purchase_order';
        const isGrn = purchase.lifecycleStatus === 'grn_received';
        const isCancelled = purchase.status === 'cancelled';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span
              className={`status-badge ${
                isCancelled
                  ? 'status-cancelled'
                  : isOrder
                  ? 'status-draft'
                  : isGrn
                  ? 'status-pending'
                  : 'status-posted'
              }`}
            >
              {isCancelled
                ? 'ملغاة'
                : isOrder
                ? 'أمر شراء (PO)'
                : isGrn
                ? 'استلام مخزني (GRN)'
                : 'مكتملة ومرحلة'}
            </span>
            {purchase.matchedStatus && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color:
                    purchase.matchedStatus === 'matched'
                      ? '#166534'
                      : purchase.matchedStatus === 'partial'
                      ? '#0369a1'
                      : '#b45309',
                }}
              >
                {purchase.matchedStatus === 'matched'
                  ? '✓ مطابقة ثلاثية كاملة'
                  : purchase.matchedStatus === 'partial'
                  ? '◷ مطابقة واستلام جزئي'
                  : '⏳ بانتظار استلام البضاعة'}
              </span>
            )}
          </div>
        );
      },
    },
    { key: 'paymentType', header: 'الدفع', cell: (purchase: Purchase) => purchase.paymentType || 'cash' },
    { key: 'total', header: 'الإجمالي', cell: (purchase: Purchase) => formatCurrency(purchase.total) },
    { key: 'date', header: 'التاريخ', cell: (purchase: Purchase) => formatDate(purchase.date) }
  ];
}
