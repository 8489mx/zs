type ReversalLine = {
  accountId: number;
  debit: number;
  credit: number;
  partnerType?: string | null;
  partnerId?: number | null;
  branchId?: number | null;
  locationId?: number | null;
  costCenterId?: number | null;
};

/** A reversal link means every financial dimension is exactly offset. */
export function areOppositeJournalLines(original: ReversalLine[], opposite: ReversalLine[]): boolean {
  const net = new Map<string, number>();
  for (const line of [...original, ...opposite]) {
    if (![line.debit, line.credit].every(Number.isFinite)) return false;
    const key = JSON.stringify([Number(line.accountId), line.partnerType || 'none', line.partnerId == null ? null : Number(line.partnerId),
      line.branchId == null ? null : Number(line.branchId), line.locationId == null ? null : Number(line.locationId),
      line.costCenterId == null ? null : Number(line.costCenterId)]);
    net.set(key, (net.get(key) || 0) + Math.round(line.debit * 100) - Math.round(line.credit * 100));
  }
  return original.length > 0 && opposite.length > 0 && [...net.values()].every(amount => amount === 0);
}
