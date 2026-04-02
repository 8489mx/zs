import { SpotlightCardStrip } from '@/components/shared/SpotlightCardStrip';

export function ReportsGuidanceStrip({ cards }: { cards: Array<{ key: string; label: string; value: string }> }) {
  return <SpotlightCardStrip cards={cards} ariaLabel="إرشاد سريع لشاشة التقارير" />;
}
