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
    { key: 'status', header: 'الحالة', cell: (purchase: Purchase) => <span className={`status-badge ${purchase.status === 'posted' ? 'status-posted' : 'status-draft'}`}>{purchase.status || 'draft'}</span> },
    { key: 'paymentType', header: 'الدفع', cell: (purchase: Purchase) => purchase.paymentType || 'cash' },
    { key: 'total', header: 'الإجمالي', cell: (purchase: Purchase) => formatCurrency(purchase.total) },
    { key: 'date', header: 'التاريخ', cell: (purchase: Purchase) => formatDate(purchase.date) }
  ];
}
