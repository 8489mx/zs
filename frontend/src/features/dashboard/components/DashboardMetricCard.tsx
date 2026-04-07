import { AnimatedValue } from '@/shared/components/animated-value';
import { formatCurrency } from '@/lib/format';

interface DashboardMetricCardProps {
  label: string;
  value: number;
  helper: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger';
  formatter?: (value: number) => string;
}

export function DashboardMetricCard({
  label,
  value,
  helper,
  tone = 'primary',
  formatter = formatCurrency,
}: DashboardMetricCardProps) {
  return (
    <article className={`dashboard-metric-card tone-${tone}`}>
      <div className="dashboard-metric-copy">
        <span>{label}</span>
        <strong><AnimatedValue value={value} formatter={formatter} /></strong>
      </div>
      <small>{helper}</small>
      <div className="dashboard-metric-glow" aria-hidden="true" />
    </article>
  );
}
