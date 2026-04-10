import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { formatCurrency } from '@/lib/format';
import type { Product } from '@/types/domain';
import type { DashboardPartnerItem } from '@/features/dashboard/api/dashboard.types';

interface DashboardRelationshipGridProps {
  lowStock: Product[];
  topCustomers: DashboardPartnerItem[];
  topSuppliers: DashboardPartnerItem[];
}

export function DashboardRelationshipGrid({ lowStock, topCustomers, topSuppliers }: DashboardRelationshipGridProps) {
  return (
    <section className="dashboard-content-grid dashboard-content-grid-wide">
      <Card title="أصناف تحتاج متابعة" className="dashboard-premium-card dashboard-card-compact">
        {lowStock.length ? (
          <div className="list-stack">
            {lowStock.map((product) => (
              <div key={product.id} className="list-row">
                <div>
                  <strong>{product.name}</strong>
                  <div className="muted small">باركود: {product.barcode || '—'}</div>
                </div>
                <div className="low-stock-badge">{product.stock}</div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="لا توجد أصناف منخفضة حاليًا" className="dashboard-empty-state" />
        )}
      </Card>

      <Card title="أفضل العملاء والموردين" className="dashboard-premium-card dashboard-card-compact">
        <div className="page-stack">
          <div>
            <strong style={{ display: 'block', marginBottom: 10 }}>أفضل العملاء</strong>
            <div className="list-stack">
              {topCustomers.length ? topCustomers.map((row) => (
                <div key={row.key} className="list-row">
                  <div>
                    <strong>{row.name}</strong>
                    <div className="muted small">عدد الفواتير: {row.count}</div>
                  </div>
                  <strong>{formatCurrency(row.total)}</strong>
                </div>
              )) : <div className="muted dashboard-inline-empty">لا توجد بيانات عملاء بعد.</div>}
            </div>
          </div>
          <div>
            <strong style={{ display: 'block', marginBottom: 10 }}>أفضل الموردين</strong>
            <div className="list-stack">
              {topSuppliers.length ? topSuppliers.map((row) => (
                <div key={row.key} className="list-row">
                  <div>
                    <strong>{row.name}</strong>
                    <div className="muted small">عدد الفواتير: {row.count}</div>
                  </div>
                  <strong>{formatCurrency(row.total)}</strong>
                </div>
              )) : <div className="muted dashboard-inline-empty">لا توجد بيانات موردين بعد.</div>}
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}
