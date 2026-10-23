export function calculateForexDifference(localBalance: number, foreignBalance: number, closingRate: number) {
  if (![localBalance, foreignBalance, closingRate].every(Number.isFinite) || closingRate <= 0) {
    throw new Error('Invalid foreign exchange valuation inputs');
  }
  const revaluedLocal = Math.round(foreignBalance * closingRate * 100) / 100;
  const difference = Math.round((revaluedLocal - localBalance) * 100) / 100;
  return { revaluedLocal, difference };
}

export function forexOffsetCode(netDifference: number): '7180' | '7280' {
  if (!Number.isFinite(netDifference)) throw new Error('Invalid foreign exchange difference');
  return netDifference >= 0 ? '7180' : '7280';
}
