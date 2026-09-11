import { useState, useEffect } from 'react';
import { contractingApi } from '../api/contracting.api';
import { ProjectHealthScore } from '../contracting.types';

interface ProjectHealthWidgetProps {
  projectId: string;
}

export function ProjectHealthWidget({ projectId }: ProjectHealthWidgetProps) {
  const [health, setHealth] = useState<ProjectHealthScore | null>(null);

  useEffect(() => {
    if (!projectId) return;
    contractingApi.getProjectHealthScore(projectId)
      .then((d) => setHealth(d as ProjectHealthScore))
      .catch(() => {/* ignore */});
  }, [projectId]);

  if (!health) return null;

  const colorMap: Record<string, { bg: string; color: string; border: string }> = {
    green:  { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
    yellow: { bg: '#fef9c3', color: '#a16207', border: '#fde68a' },
    red:    { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' },
  };
  const c = colorMap[health.status] || colorMap['green'];

  return (
    <span
      title={`صحة المشروع: ${health.score}/100 — جدول ${health.breakdown.schedulePerformanceIndex.toFixed(2)} | تكلفة ${health.breakdown.costPerformanceIndex.toFixed(2)}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 8px',
        borderRadius: '20px',
        fontSize: 'var(--font-badge)',
        fontWeight: 700,
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        cursor: 'default',
        whiteSpace: 'nowrap',
      }}
    >
      {health.score}
      <span style={{ fontWeight: 400 }}>/100</span>
    </span>
  );
}