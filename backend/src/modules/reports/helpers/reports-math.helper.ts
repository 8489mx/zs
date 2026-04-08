export function toMoney(value: number | string | null | undefined): number {
  return Number(Number(value || 0).toFixed(2));
}

export function sumMoney<T>(rows: T[], selector: (row: T) => number | string | null | undefined): number {
  return toMoney(rows.reduce((sum, row) => sum + Number(selector(row) || 0), 0));
}

export function buildTrendMap<T>(
  rows: T[],
  keys: string[],
  keySelector: (row: T) => string,
  valueSelector: (row: T) => number | string | null | undefined,
): Array<{ key: string; value: number }> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const key = keySelector(row);
    if (!key) continue;
    totals.set(key, Number((Number(totals.get(key) || 0) + Number(valueSelector(row) || 0)).toFixed(2)));
  }

  return keys.map((key) => ({ key, value: toMoney(totals.get(key) || 0) }));
}

export function buildAggregatedBalances<T extends { id?: unknown; balance?: unknown }>(
  rows: T[],
  totals: Map<string, number>,
): Map<string, number> {
  const balances = new Map<string, number>();
  for (const row of rows) {
    const key = String(row.id || '');
    if (!key) continue;
    balances.set(key, totals.has(key) ? toMoney(totals.get(key) || 0) : toMoney(row.balance as number | string | null | undefined));
  }
  return balances;
}
