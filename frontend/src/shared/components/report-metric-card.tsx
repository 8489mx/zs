import { AnimatedValue } from '@/shared/components/animated-value';

interface ReportMetricCardProps {
  label: string;
  value: number;
  helper?: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger';
  formatter?: (value: number) => string;
  decimals?: number;
  progress?: number;
}

export function ReportMetricCard({
  label,
  value,
  helper,
  tone = 'primary',
  formatter,
  decimals = 0,
  progress,
}: ReportMetricCardProps) {
  const normalizedProgress = Math.max(0, Math.min(100, Number(progress || 0)));

  return (
    <article className={`report-metric-card tone-${tone}`}>
      <div className="report-metric-topline">
        <span className="report-metric-label">{label}</span>
        {helper ? <small className="report-metric-helper">{helper}</small> : null}
      </div>
      <strong className="report-metric-value">
        <AnimatedValue value={value} formatter={formatter} decimals={decimals} />
      </strong>
      <div className="report-progress-track" aria-hidden="true">
        <span className="report-progress-fill" style={{ width: `${normalizedProgress}%` }} />
      </div>
    </article>
  );
}
