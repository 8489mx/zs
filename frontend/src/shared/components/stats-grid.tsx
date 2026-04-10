import type { ReactNode } from 'react';

export type StatsGridItem = {
  key: string;
  label: ReactNode;
  value: ReactNode;
};

export function StatsGrid({ items, className = 'stats-grid compact-grid' }: { items: readonly StatsGridItem[]; className?: string }) {
  return (
    <div className={className}>
      {items.map((item) => (
        <div key={item.key} className="stat-card">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}
