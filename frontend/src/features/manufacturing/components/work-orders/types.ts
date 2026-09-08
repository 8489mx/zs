import type { ReactNode } from 'react';

export type Column<T> = { key: string; header: ReactNode; cell: (row: T) => ReactNode; className?: string };

export const statusLabels: Record<string, string> = {
  draft: 'مسودة',
  in_progress: 'قيد التنفيذ',
  done: 'مكتمل',
  cancelled: 'ملغى',
};

export const statusColors: Record<string, string> = {
  draft: '#6b7280',
  in_progress: '#3b82f6',
  done: '#10b981',
  cancelled: '#ef4444',
};
