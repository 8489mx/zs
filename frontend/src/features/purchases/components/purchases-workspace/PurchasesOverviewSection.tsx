import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import type { PurchasesListSummary } from '@/features/purchases/api/purchases.api';

interface BaseProps {
  totalItems: number;
  summary: PurchasesListSummary | null | undefined;
  activeFilterLabel: string;
  scopeRows: Array<{ label: string; value: string | number }>;
  topSuppliers: Array<{ name: string; count: number; total: number }>;
  exportTopSuppliersCsv: () => void;
  printTopSuppliers: () => void;
}

export function PurchasesKpiSection(props: Pick<BaseProps, 'totalItems' | 'summary'>) {
  return (
    <div className="stats-grid compact-grid workspace-stats-grid purchases-kpi-grid">
      <div className="stat-card"><span>إجمالي الفواتير</span><strong>{props.totalItems}</strong></div>
      <div className="stat-card"><span>معتمدة</span><strong>{props.summary?.posted || 0}</strong></div>
      <div className="stat-card"><span>مسودات/أخرى</span><strong>{props.summary?.draft || 0}</strong></div>
      <div className="stat-card"><span>ملغاة</span><strong>{props.summary?.cancelledCount || 0}</strong></div>
      <div className="stat-card"><span>إجمالي القيمة</span><strong>{formatCurrency(props.summary?.totalAmount || 0)}</strong></div>
      <div className="stat-card"><span>مشتريات آجلة</span><strong>{formatCurrency(props.summary?.creditTotal || 0)}</strong></div>
    </div>
  );
}

export function TopSuppliersCard(props: Pick<BaseProps, 'topSuppliers' | 'exportTopSuppliersCsv' | 'printTopSuppliers'>) {
  return (
    <Card
      title="أعلى الموردين"
      actions={<div className="actions compact-actions"><Button variant="secondary" onClick={props.exportTopSuppliersCsv} disabled={!props.topSuppliers.length}>CSV</Button><Button variant="secondary" onClick={props.printTopSuppliers} disabled={!props.topSuppliers.length}>طباعة</Button></div>}
      className="workspace-panel purchases-insight-card"
    >
      <div className="list-stack compact-list-stack">
        {props.topSuppliers.length ? props.topSuppliers.map((supplier) => (
          <div className="list-row" key={supplier.name}><div><strong>{supplier.name}</strong><div className="muted small">{supplier.count} فاتورة</div></div><strong>{formatCurrency(supplier.total)}</strong></div>
        )) : <div className="muted">لا توجد نتائج كافية.</div>}
      </div>
    </Card>
  );
}
