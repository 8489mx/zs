import { AnimatedValue } from '@/shared/components/animated-value';
import { BarChartIcon, CheckCircleIcon, AlertTriangleIcon, AlertCircleIcon } from '@/shared/components/icons/AppIcons';
import React from 'react';

interface ReportMetricCardProps {
  label: string;
  value: number;
  helper?: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger';
  formatter?: (value: number) => string;
  decimals?: number;
  progress?: number;
}

const TONE_ICONS: Record<string, React.ReactNode> = {
  primary: <BarChartIcon size={16} />,
  success: <CheckCircleIcon size={16} color="var(--color-success, #16a34a)" />,
  warning: <AlertTriangleIcon size={16} color="var(--color-warning, #d97706)" />,
  danger: <AlertCircleIcon size={16} color="var(--color-danger, #dc2626)" />,
};

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
      <div className="rmc-accent-bar" aria-hidden="true" />
      <div className="rmc-body">
        <div className="rmc-header">
          <span className="rmc-icon" aria-hidden="true">{TONE_ICONS[tone] || <BarChartIcon size={16} />}</span>
          <span className="report-metric-label">{label}</span>
        </div>
        <strong className="report-metric-value">
          <AnimatedValue value={value} formatter={formatter} decimals={decimals} />
        </strong>
        {helper ? <small className="report-metric-helper">{helper}</small> : null}
        <div className="report-progress-track" aria-hidden="true">
          <span className="report-progress-fill" style={{ width: `${normalizedProgress}%` }} />
        </div>
      </div>
    </article>
  );
}
