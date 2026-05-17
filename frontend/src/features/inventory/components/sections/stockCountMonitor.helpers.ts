import type { StockCountSession } from '@/types/domain';

export type SessionVarianceSummary = {
  itemsCount: number;
  varianceItemsCount: number;
  totalVariance: number;
  totalAbsoluteVariance: number;
  hasVariance: boolean;
};

export function getSessionStatusLabel(status?: string | null) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'draft') return 'مسودة / بانتظار المراجعة';
  if (normalized === 'posted') return 'معتمد';
  if (normalized === 'cancelled' || normalized === 'canceled') return 'ملغي';
  return status || '—';
}

export function summarizeSessionVariance(session: StockCountSession): SessionVarianceSummary {
  const items = Array.isArray(session.items) ? session.items : [];
  const itemsCount = items.length;
  let varianceItemsCount = 0;
  let totalVariance = 0;
  let totalAbsoluteVariance = 0;

  for (const item of items) {
    const variance = Number(item.varianceQty || 0);
    totalVariance += variance;
    totalAbsoluteVariance += Math.abs(variance);
    if (Math.abs(variance) > 0) varianceItemsCount += 1;
  }

  return {
    itemsCount,
    varianceItemsCount,
    totalVariance: Number(totalVariance.toFixed(3)),
    totalAbsoluteVariance: Number(totalAbsoluteVariance.toFixed(3)),
    hasVariance: varianceItemsCount > 0,
  };
}
