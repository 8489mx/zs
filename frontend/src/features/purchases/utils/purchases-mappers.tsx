import i18n from '@/lib/i18n';
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
  const isEn = i18n.language === 'en';
  return [
    { key: 'docNo', header: isEn ? 'Doc No.' : 'الرقم', cell: (purchase: Purchase) => purchase.docNo || '—' },
    {
      key: 'supplierName',
      header: isEn ? 'Supplier' : 'المورد',
      cell: (purchase: Purchase) => (
        <div>
          <strong>{purchase.supplierName || '—'}</strong>
          <div className="muted small">
            {SINGLE_STORE_MODE
              ? (purchase.locationName || (isEn ? 'Main Warehouse' : 'المخزن الأساسي'))
              : `${purchase.branchName || (isEn ? 'No Branch' : 'بدون فرع')} · ${purchase.locationName || (isEn ? 'No Location' : 'بدون موقع')}`}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      header: isEn ? 'Status & Matching' : 'الحالة والمطابقة',
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
                ? (isEn ? 'Cancelled' : 'ملغاة')
                : isOrder
                ? (isEn ? 'Purchase Order (PO)' : 'أمر شراء (PO)')
                : isGrn
                ? (isEn ? 'Goods Receipt (GRN)' : 'استلام مخزني (GRN)')
                : (isEn ? 'Posted & Complete' : 'مكتملة ومرحلة')}
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
                  ? (isEn ? '3-Way Matched' : 'مطابقة ثلاثية كاملة')
                  : purchase.matchedStatus === 'partial'
                  ? (isEn ? 'Partially Received' : 'مطابقة واستلام جزئي')
                  : (isEn ? 'Awaiting Receipt' : 'بانتظار استلام البضاعة')}
              </span>
            )}
          </div>
        );
      },
    },
    { key: 'paymentType', header: isEn ? 'Payment' : 'الدفع', cell: (purchase: Purchase) => purchase.paymentType || 'cash' },
    { key: 'total', header: isEn ? 'Total' : 'الإجمالي', cell: (purchase: Purchase) => formatCurrency(purchase.total) },
    { key: 'date', header: isEn ? 'Date' : 'التاريخ', cell: (purchase: Purchase) => formatDate(purchase.date) }
  ];
}
