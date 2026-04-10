import { formatCurrency, formatDate } from '@/lib/format';
import type { Sale } from '@/types/domain';
import { matchTransactionSearch } from '@/lib/domain/transactions';

export function filterSalesRows(rows: Sale[], search: string) {
  return rows.filter((sale) => matchTransactionSearch(sale, search));
}

export function getSalesTableColumns() {
  return [
    { key: 'docNo', header: 'الرقم', cell: (sale: Sale) => sale.docNo || '—' },
    { key: 'customer', header: 'العميل', cell: (sale: Sale) => sale.customerName || 'عميل نقدي' },
    { key: 'status', header: 'الحالة', cell: (sale: Sale) => <span className={`status-badge ${sale.status === 'posted' ? 'status-posted' : 'status-draft'}`}>{sale.status || 'draft'}</span> },
    { key: 'payment', header: 'الدفع', cell: (sale: Sale) => sale.paymentType || 'cash' },
    { key: 'total', header: 'الإجمالي', cell: (sale: Sale) => formatCurrency(sale.total) },
    { key: 'date', header: 'التاريخ', cell: (sale: Sale) => formatDate(sale.date) }
  ];
}

export function getSalesTotals(rows: Sale[], todayIso: string) {
  const todaySales = rows.filter((sale) => String(sale.date || '').slice(0, 10) === todayIso);
  return {
    todaySales,
    totalSales: rows.reduce((sum, sale) => sum + Number(sale.total || 0), 0),
    todaySalesTotal: todaySales.reduce((sum, sale) => sum + Number(sale.total || 0), 0)
  };
}
