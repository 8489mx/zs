import { formatCurrency } from '@/lib/format';
import type { PurchasesListSummary } from '@/features/purchases/api/purchases.api';

interface Props {
  purchaseGuidanceCards: Array<{ key: string; label: string; value: string }>;
  totalItems: number;
  summary: PurchasesListSummary | null | undefined;
  activeFilterLabel: string;
  scopeRows: Array<{ label: string; value: string | number }>;
  topSuppliers: Array<{ name: string; count: number; total: number }>;
  exportTopSuppliersCsv: () => void;
  printTopSuppliers: () => void;
}

export function PurchasesOverviewSection(props: Props) {
  return (
    <div className="stats-grid compact-grid workspace-stats-grid purchases-kpi-grid purchases-kpi-grid-five">
      <div className="stat-card purchases-kpi-card">
        <span>إجمالي الفواتير</span>
        <strong>{props.totalItems}</strong>
      </div>

      <div className="stat-card purchases-kpi-card">
        <span>معتمدة</span>
        <strong>{props.summary?.posted || 0}</strong>
      </div>

      <div className="stat-card purchases-kpi-card">
        <span>إجمالي القيمة</span>
        <strong>{formatCurrency(props.summary?.totalAmount || 0)}</strong>
      </div>

      <div className="stat-card purchases-kpi-card">
        <span>مشتريات آجلة</span>
        <strong>{formatCurrency(props.summary?.creditTotal || 0)}</strong>
      </div>

      <div className="stat-card purchases-kpi-card">
        <span>ملغاة</span>
        <strong>{props.summary?.cancelledCount || 0}</strong>
      </div>
    </div>
  );
}
