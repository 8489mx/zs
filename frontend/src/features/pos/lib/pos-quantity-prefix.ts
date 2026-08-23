export interface ParsedQuantityQuery {
  hasPrefix: boolean;
  quantity: number;
  cleanQuery: string;
  isSuffixQuantityChange?: boolean;
}

/**
 * Parses search or barcode input to extract quantity multipliers.
 * Examples:
 * - "10+6221234567890" => { hasPrefix: true, quantity: 10, cleanQuery: "6221234567890" }
 * - "10*6221234567890" => { hasPrefix: true, quantity: 10, cleanQuery: "6221234567890" }
 * - "10x6221234567890" => { hasPrefix: true, quantity: 10, cleanQuery: "6221234567890" }
 * - "5*اندومي"         => { hasPrefix: true, quantity: 5, cleanQuery: "اندومي" }
 * - "2.5+طماطم"        => { hasPrefix: true, quantity: 2.5, cleanQuery: "طماطم" }
 * - "10+" or "10*"     => { hasPrefix: true, quantity: 10, cleanQuery: "" }
 * - "*10" or "+10"     => { hasPrefix: true, quantity: 10, cleanQuery: "", isSuffixQuantityChange: true }
 * - "6221234567890"    => { hasPrefix: false, quantity: 1, cleanQuery: "6221234567890" }
 */
export function parseQuantityPrefixQuery(rawInput?: string | null): ParsedQuantityQuery {
  const trimmed = String(rawInput || '').trim();
  if (!trimmed) {
    return { hasPrefix: false, quantity: 1, cleanQuery: '' };
  }

  // 1. Check if user typed "+10" or "*10" (Suffix command to update quantity of current cart line)
  const suffixMatch = trimmed.match(/^[*+xX]\s*(\d+(?:\.\d+)?)$/);
  if (suffixMatch) {
    const qty = Number(suffixMatch[1]);
    if (qty > 0 && !isNaN(qty)) {
      return { hasPrefix: true, quantity: qty, cleanQuery: '', isSuffixQuantityChange: true };
    }
  }

  // 2. Check prefix multiplier: e.g. "10*", "10+", "10x", "2.5*", "10*اندومي", "10+6221234567890"
  const prefixMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*[*+xX]\s*(.*)$/);
  if (prefixMatch) {
    const qty = Number(prefixMatch[1]);
    const cleanQuery = prefixMatch[2].trim();
    if (qty > 0 && !isNaN(qty)) {
      return { hasPrefix: true, quantity: qty, cleanQuery };
    }
  }

  return { hasPrefix: false, quantity: 1, cleanQuery: trimmed };
}
