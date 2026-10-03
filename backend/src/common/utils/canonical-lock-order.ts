/** Stable row-lock order shared by stock and treasury writes. */
export function canonicalLockIds(ids: readonly number[]): number[] {
  return [...new Set(ids)].filter((id) => Number.isSafeInteger(id) && id > 0).sort((a, b) => a - b);
}
