import { formatCurrency, formatDate } from '@/lib/format';
import type { Sale } from '@/types/domain';
import { matchTransactionSearch } from '@/lib/domain/transactions';
import { getSalePaymentLabel } from '@/features/sales/lib/sales-workspace.helpers';

export function filterSalesRows(rows: Sale[], search: string) {
  return rows.filter((sale) => matchTransactionSearch(sale, search));
}

export function getSalesTableColumns() {
  return [
    { key: 'docNo', header: 'الرقم', cell: (sale: Sale) => sale.docNo || '—' },
    { key: 'customer', header: 'العميل', cell: (sale: Sale) => sale.customerName || 'عميل نقدي' },
    {
      key: 'status',
      header: 'الحالة',
      cell: (sale: Sale) => {
        if (sale.status === 'posted') return <span className="status-badge status-posted" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>معتمدة</span>;
        if (sale.status === 'cancelled') return <span className="status-badge status-draft" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>ملغاة</span>;
        if (sale.status === 'draft') return <span className="status-badge status-draft" style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}>مسودة</span>;
        return <span className="status-badge status-posted">{sale.status || 'معتمدة'}</span>;
      },
    },
    { 
      key: 'etaStatus', 
      header: 'الضرائب', 
      cell: (sale: any) => {
        if (!sale.etaStatus || sale.etaStatus === 'none') return <span className="muted small">—</span>;
        if (sale.etaStatus === 'pending') return <span className="badge badge-warning">معلقة</span>;
        if (sale.etaStatus === 'submitted') return <span className="badge badge-success">تم الإرسال</span>;
        if (sale.etaStatus === 'failed') return <span className="badge badge-danger">فشل</span>;
        return <span className="muted small">{sale.etaStatus}</span>;
      }
    },
    { key: 'payment', header: 'الدفع', cell: (sale: Sale) => getSalePaymentLabel(sale) },
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
