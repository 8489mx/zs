export interface SpotlightCardItem {
  key: string;
  label: string;
  value: string | number;
}

interface SpotlightCardStripProps {
  cards: SpotlightCardItem[];
  ariaLabel: string;
  className?: string;
}

export function SpotlightCardStrip({ cards, ariaLabel, className = '' }: SpotlightCardStripProps) {
  return (
    <section className={`sales-guidance-grid compact-spotlight-grid ${className}`.trim()} aria-label={ariaLabel}>
      {cards.map((card) => (
        <div key={card.key} className="sales-guidance-card">
          <span>{card.label}</span>
          <strong>{card.value}</strong>
        </div>
      ))}
    </section>
  );
}
