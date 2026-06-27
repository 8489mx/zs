import { FormSection } from '@/shared/components/form-section';
import { EmptyState } from '@/shared/ui/empty-state';
import { formatCurrency } from '@/lib/format';
import { QuickCustomerCard } from '@/features/sales/components/QuickCustomerCard';
import type { Sale } from '@/types/domain';
import { useTranslation } from "react-i18next";

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
    const { t } = useTranslation();
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
        <FormSection title={t('sales.d7fa02')} description={t('sales.5fd0f7')} actions={<span className="nav-pill">{activeFilterLabel}</span>} className="workspace-panel sales-scope-card">
          <div className="metric-list">
            {scopeRows.map((row) => (
              <div className="metric-row" key={row.label}>
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>
        </FormSection>

        <FormSection title={t('sales.89282d')} description={t('sales.2a3f4e')} actions={<span className="nav-pill">{selectedSale ? t('sales.1773f6') : t('sales.a341f0')}</span>} className="workspace-panel sales-selected-card">
          {selectedSale ? (
            <>
              <div className="metric-list">
                <div className="metric-row"><span>{t('sales.aad538')}</span><strong>{selectedSale.docNo || selectedSale.id}</strong></div>
                <div className="metric-row"><span>{t('sales.bc9b43')}</span><strong>{selectedSale.customerName || t('sales.339465')}</strong></div>
                <div className="metric-row"><span>{t('sales.88fc73')}</span><strong>{formatCurrency(selectedSale.total)}</strong></div>
                <div className="metric-row"><span>{t('sales.4ee631')}</span><strong>{selectedSalePaymentLabel}</strong></div>
                <div className="metric-row"><span>{t('sales.1253eb')}</span><strong>{selectedSale.status || 'posted'}</strong></div>
              </div>
              <div className="surface-note" style={{ marginTop: 12 }}>{salesNextStep}</div>
            </>
          ) : <EmptyState title={t('sales.e66aa1')} hint={t('sales.9b1794')} />}
        </FormSection>

        <QuickCustomerCard canManageCustomers={canManageCustomers} />
      </div>
    </>
  );
}
