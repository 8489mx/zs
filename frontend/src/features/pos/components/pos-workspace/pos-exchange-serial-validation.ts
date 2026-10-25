/**
 * Preflight only. The server verifies actual sale-item ownership and available
 * serials under invoice locks. Do not reserve an operation key for invalid input.
 */
export function normalizeExchangeReturnSerials(original: string[], raw: string, qty: number, itemName: string): string[] {
  if (!Number.isFinite(qty) || qty <= 0) throw new Error('كمية المرتجع غير صالحة');
  const values = raw.split(/[\n,،;]+/).map(value => value.trim()).filter(Boolean);
  if (values.length && original.length === 0) throw new Error(`لا يوجد سيريالات أصلية مسجلة للصنف ${itemName}`);
  if (!original.length) return [];
  const folded = values.map(value => value.toLowerCase());
  const originalSet = new Set(original.map(value => value.trim().toLowerCase()));
  if (!Number.isInteger(qty) || values.length !== qty || new Set(folded).size !== values.length ||
    folded.some(value => !originalSet.has(value))) {
    throw new Error(`حدد ${qty} سيريالًا صحيحًا وغير مكرر للصنف ${itemName} من الفاتورة الأصلية`);
  }
  return values;
}
