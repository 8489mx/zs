import { useTranslation } from 'react-i18next';
import { SpotlightCardStrip } from '@/shared/components/spotlight-card-strip';
import { Button } from '@/shared/ui/button';

export function AccountsOverviewPanel({
  stats,
  guidanceCards,
  onTopCustomer,
  onTopSupplier,
  onClearSelection,
  disableTopCustomer,
  disableTopSupplier
}: {
  stats: Array<{ label: string; value: string | number }>;
  guidanceCards: Array<{ key: string; label: string; value: string }>;
  onTopCustomer: () => void;
  onTopSupplier: () => void;
  onClearSelection: () => void;
  disableTopCustomer: boolean;
  disableTopSupplier: boolean;
}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="stats-grid compact-grid">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>

      <SpotlightCardStrip cards={guidanceCards} ariaLabel={t('accounts.accounts_overview_panel.s0', "إرشاد سريع لشاشة الحسابات")} />

      <div className="filter-chip-row accounts-shortcuts-row">
        <Button variant="secondary" onClick={onTopCustomer} disabled={disableTopCustomer}>{t('accounts.accounts_overview_panel.s1', "أعلى عميل رصيدًا")}</Button>
        <Button variant="secondary" onClick={onTopSupplier} disabled={disableTopSupplier}>{t('accounts.accounts_overview_panel.s2', "أعلى مورد رصيدًا")}</Button>
        <Button variant="secondary" onClick={onClearSelection}>{t('accounts.accounts_overview_panel.s3', "إلغاء الاختيار")}</Button>
      </div>
    </>
  );
}
