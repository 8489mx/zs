import i18n from '@/lib/i18n';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Sale } from '@/types/domain';
import { matchTransactionSearch } from '@/lib/domain/transactions';
import { getSalePaymentLabel } from '@/features/sales/lib/sales-workspace.helpers';

export function filterSalesRows(rows: Sale[], search: string) {
  return rows.filter((sale) => matchTransactionSearch(sale, search));
}

export function getSalesTableColumns() {
  return [
    { key: 'docNo', header: i18n.t('sales.47a191', 'الرقم'), cell: (sale: Sale) => sale.docNo || '—' },
    { key: 'customer', header: i18n.t('pos.customer', 'العميل'), cell: (sale: Sale) => sale.customerName || i18n.t('sales.cash_customer', 'عميل نقدي') },
    {
      key: 'status',
      header: i18n.t('sales.status', 'الحالة'),
      cell: (sale: Sale) => {
        if (sale.status === 'posted') return <span className="status-badge status-posted" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>{i18n.t('sales.status_posted', 'معتمدة')}</span>;
        if (sale.status === 'cancelled') return <span className="status-badge status-draft" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>{i18n.t('sales.status_cancelled', 'ملغاة')}</span>;
        if (sale.status === 'draft') return <span className="status-badge status-draft" style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}>{i18n.t('sales.status_draft', 'مسودة')}</span>;
        return <span className="status-badge status-posted">{sale.status || i18n.t('sales.status_posted', 'معتمدة')}</span>;
      },
    },
    { 
      key: 'etaStatus', 
      header: i18n.t('sales.tax', 'الضرائب'), 
      cell: (sale: any) => {
        if (!sale.etaStatus || sale.etaStatus === 'none') return <span className="muted small">—</span>;
        if (sale.etaStatus === 'pending') return <span className="badge badge-warning">{i18n.t('sales.status_pending', 'معلقة')}</span>;
        if (sale.etaStatus === 'submitted') return <span className="badge badge-success">{i18n.t('sales.status_submitted', 'تم الإرسال')}</span>;
        if (sale.etaStatus === 'failed') return <span className="badge badge-danger">{i18n.t('sales.status_failed', 'فشل')}</span>;
        return <span className="muted small">{sale.etaStatus}</span>;
      }
    },
    { key: 'payment', header: i18n.t('sales.4ee631', 'الدفع'), cell: (sale: Sale) => getSalePaymentLabel(sale) },
    { key: 'total', header: i18n.t('pos.total', 'الإجمالي'), cell: (sale: Sale) => formatCurrency(sale.total) },
    { key: 'date', header: i18n.t('sales.date', 'التاريخ'), cell: (sale: Sale) => formatDate(sale.date) }
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
