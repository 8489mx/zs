import { useTranslation } from 'react-i18next';
import { FormSection } from '@/shared/components/form-section';
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
  const { t } = useTranslation();
  return (
    <section className="dashboard-content-grid dashboard-content-grid-wide">
      <FormSection title={t('dashboard.dashboard_relationship_grid.s0', "أصناف تحتاج متابعة")} className="dashboard-premium-card dashboard-card-compact">
        {lowStock.length ? (
          <div className="list-stack">
            {lowStock.map((product) => (
              <div key={product.id} className="list-row">
                <div>
                  <strong>{product.name}</strong>
                  <div className="muted small">{t('dashboard.dashboard_relationship_grid.s1', "باركود:")} {product.barcode || '—'}</div>
                </div>
                <div className="low-stock-badge">{product.stock}</div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title={t('dashboard.dashboard_relationship_grid.s2', "لا توجد أصناف منخفضة حاليًا")} className="dashboard-empty-state" />
        )}
      </FormSection>

      <FormSection title={t('dashboard.dashboard_relationship_grid.s3', "أفضل العملاء والموردين")} className="dashboard-premium-card dashboard-card-compact">
        <div className="page-stack">
          <div>
            <strong style={{ display: 'block', marginBottom: 10 }}>{t('dashboard.dashboard_relationship_grid.s4', "أفضل العملاء")}</strong>
            <div className="list-stack">
              {topCustomers.length ? topCustomers.map((row) => (
                <div key={row.key} className="list-row">
                  <div>
                    <strong>{row.name}</strong>
                    <div className="muted small">{t('dashboard.dashboard_relationship_grid.s5', "عدد الفواتير:")} {row.count}</div>
                  </div>
                  <strong>{formatCurrency(row.total)}</strong>
                </div>
              )) : <div className="muted dashboard-inline-empty">{t('dashboard.dashboard_relationship_grid.s6', "لا توجد بيانات عملاء بعد.")}</div>}
            </div>
          </div>
          <div>
            <strong style={{ display: 'block', marginBottom: 10 }}>{t('dashboard.dashboard_relationship_grid.s7', "أفضل الموردين")}</strong>
            <div className="list-stack">
              {topSuppliers.length ? topSuppliers.map((row) => (
                <div key={row.key} className="list-row">
                  <div>
                    <strong>{row.name}</strong>
                    <div className="muted small">{t('dashboard.dashboard_relationship_grid.s8', "عدد الفواتير:")} {row.count}</div>
                  </div>
                  <strong>{formatCurrency(row.total)}</strong>
                </div>
              )) : <div className="muted dashboard-inline-empty">{t('dashboard.dashboard_relationship_grid.s9', "لا توجد بيانات موردين بعد.")}</div>}
            </div>
          </div>
        </div>
      </FormSection>
    </section>
  );
}
