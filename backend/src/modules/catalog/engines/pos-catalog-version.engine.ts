// PERF-9 (PERFORMANCE_CONSTITUTION.md). The POS offline-catalog version string. Any change to it makes
// every terminal re-download the whole catalog, so it is built only from catalog facts (counts + the
// latest catalog-relevant edit) — never from stock. Pure so the guard spec imports it from production.
export interface PosCatalogVersionInput {
  productCount: number;
  unitCount: number;
  offerCount: number;
  lastUpdatedAt: string;
}

export function buildPosCatalogVersion(input: PosCatalogVersionInput): string {
  const stamp = new Date(input.lastUpdatedAt).getTime();
  // The SQL epoch fallback can land before 1970 in a non-UTC session; any "no edits yet" value is 0.
  const safeStamp = Number.isFinite(stamp) && stamp > 0 ? stamp : 0;
  return `v2-${input.productCount}-${input.unitCount}-${input.offerCount}-${safeStamp}`;
}
