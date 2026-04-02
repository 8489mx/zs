import { SpotlightCardStrip } from '@/components/shared/SpotlightCardStrip';
import { Button } from '@/components/ui/Button';

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

      <SpotlightCardStrip cards={guidanceCards} ariaLabel="إرشاد سريع لشاشة الحسابات" />

      <div className="filter-chip-row accounts-shortcuts-row">
        <Button variant="secondary" onClick={onTopCustomer} disabled={disableTopCustomer}>أعلى عميل رصيدًا</Button>
        <Button variant="secondary" onClick={onTopSupplier} disabled={disableTopSupplier}>أعلى مورد رصيدًا</Button>
        <Button variant="secondary" onClick={onClearSelection}>إلغاء الاختيار</Button>
      </div>
    </>
  );
}
