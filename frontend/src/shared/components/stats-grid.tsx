import type { ReactNode, CSSProperties } from 'react';

export type StatsGridItem = {
  key: string;
  label: ReactNode;
  value: ReactNode;
};

export function StatsGrid({ items, className = 'stats-grid compact-grid', style }: { items: readonly StatsGridItem[]; className?: string; style?: CSSProperties }) {
  return (
    <div className={className} style={style}>
      {items.map((item) => (
        <div key={item.key} className="stat-card">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}
