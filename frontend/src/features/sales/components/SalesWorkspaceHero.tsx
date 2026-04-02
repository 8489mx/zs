import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency } from '@/lib/format';
import { QuickCustomerCard } from '@/features/sales/components/QuickCustomerCard';
import type { Sale } from '@/types/domain';

type MetricRow = { label: string; value: string | number };
type GuidanceCard = { key: string; label: string; value: string };

type Props = {
  scopeRows: MetricRow[];
  salesGuidanceCards: GuidanceCard[];
  activeFilterLabel: string;
  selectedSale: Sale | null | undefined;
  selectedSalePaymentLabel: string;
  salesNextStep: string;
  canManageCustomers: boolean;
};

export function SalesWorkspaceHero({
  scopeRows,
  salesGuidanceCards,
  activeFilterLabel,
  selectedSale,
  selectedSalePaymentLabel,
  salesNextStep,
  canManageCustomers,
}: Props) {
  return (
    <>
      <div className="dashboard-grid sales-guidance-grid">
        {salesGuidanceCards.map((card) => (
          <div key={card.key} className="dashboard-card dashboard-card-interactive">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </div>
        ))}
      </div>

      <div className="sales-hero-grid">
        <Card title="نطاق العرض الحالي" description="اعرف بسرعة ماذا ترى الآن قبل التعديل أو الطباعة." actions={<span className="nav-pill">{activeFilterLabel}</span>} className="workspace-panel sales-scope-card">
          <div className="metric-list">
            {scopeRows.map((row) => (
              <div className="metric-row" key={row.label}>
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>
        </Card>

        <Card title="الفاتورة المحددة" description="راجع الفاتورة الحالية قبل أي تعديل أو إلغاء." actions={<span className="nav-pill">{selectedSale ? 'محددة' : 'اختر من الجدول'}</span>} className="workspace-panel sales-selected-card">
          {selectedSale ? (
            <>
              <div className="metric-list">
                <div className="metric-row"><span>رقم الفاتورة</span><strong>{selectedSale.docNo || selectedSale.id}</strong></div>
                <div className="metric-row"><span>العميل</span><strong>{selectedSale.customerName || 'عميل نقدي'}</strong></div>
                <div className="metric-row"><span>الإجمالي</span><strong>{formatCurrency(selectedSale.total)}</strong></div>
                <div className="metric-row"><span>الدفع</span><strong>{selectedSalePaymentLabel}</strong></div>
                <div className="metric-row"><span>الحالة</span><strong>{selectedSale.status || 'posted'}</strong></div>
              </div>
              <div className="surface-note" style={{ marginTop: 12 }}>{salesNextStep}</div>
            </>
          ) : <EmptyState title="اختر فاتورة من الجدول" hint="بعد الاختيار ستظهر هنا أهم البيانات السريعة." />}
        </Card>

        <QuickCustomerCard canManageCustomers={canManageCustomers} />
      </div>
    </>
  );
}
