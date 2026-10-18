import { useTranslation } from 'react-i18next';
import { SpotlightCardStrip } from '@/shared/components/spotlight-card-strip';

export function ReportsGuidanceStrip({ cards }: { cards: Array<{ key: string; label: string; value: string }> }) {
  const { t } = useTranslation();
  return <SpotlightCardStrip cards={cards} ariaLabel={t('reports.reports_guidance_strip.s0', "إرشاد سريع لشاشة التقارير")} />;
}
