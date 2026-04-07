import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { SpotlightCardStrip } from '@/shared/components/spotlight-card-strip';
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
    <>
      <div className="stats-grid compact-grid workspace-stats-grid purchases-kpi-grid">
        <div className="stat-card"><span>إجمالي الفواتير</span><strong>{props.totalItems}</strong></div>
        <div className="stat-card"><span>معتمدة</span><strong>{props.summary?.posted || 0}</strong></div>
        <div className="stat-card"><span>مسودات/أخرى</span><strong>{props.summary?.draft || 0}</strong></div>
        <div className="stat-card"><span>ملغاة</span><strong>{props.summary?.cancelledCount || 0}</strong></div>
        <div className="stat-card"><span>إجمالي القيمة</span><strong>{formatCurrency(props.summary?.totalAmount || 0)}</strong></div>
        <div className="stat-card"><span>مشتريات آجلة</span><strong>{formatCurrency(props.summary?.creditTotal || 0)}</strong></div>
      </div>

      <SpotlightCardStrip cards={props.purchaseGuidanceCards} ariaLabel="إرشاد سريع لشاشة المشتريات" />

      <div className="two-column-grid workspace-grid-balanced purchases-summary-grid">
        <Card title="نطاق العرض الحالي" description="يوضح لك هذا الصندوق ما الذي تراجعه الآن بالضبط، وما هي الفاتورة المحددة قبل فتح تفاصيلها أو تنفيذ إلغاء/تعديل." actions={<span className="nav-pill">{props.activeFilterLabel}</span>} className="workspace-panel purchases-scope-card">
          <div className="metric-list">
            {props.scopeRows.map((row) => <div className="metric-row" key={row.label}><span>{row.label}</span><strong>{row.value}</strong></div>)}
          </div>
        </Card>

        <Card title="أعلى الموردين في النتائج الحالية" description="هذا الملخص مرتبط بالنطاق الحالي، لذلك يعطي قراءة أسرع لسلوك الموردين داخل نفس الفلاتر والبحث." actions={<div className="actions compact-actions"><Button variant="secondary" onClick={props.exportTopSuppliersCsv} disabled={!props.topSuppliers.length}>تصدير CSV</Button><Button variant="secondary" onClick={props.printTopSuppliers} disabled={!props.topSuppliers.length}>طباعة</Button><span className="nav-pill">ملخص سريع</span></div>} className="workspace-panel purchases-insight-card">
          <div className="list-stack">
            {props.topSuppliers.length ? props.topSuppliers.map((supplier) => (
              <div className="list-row" key={supplier.name}><div><strong>{supplier.name}</strong><div className="muted small">{supplier.count} فاتورة</div></div><strong>{formatCurrency(supplier.total)}</strong></div>
            )) : <div className="muted">لا توجد نتائج كافية لحساب الموردين الأعلى.</div>}
          </div>
        </Card>
      </div>
    </>
  );
}
