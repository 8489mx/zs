export interface ReturnCostLine {
  product_id: number | null;
  sale_item_id: number | null;
  qty: number | string;
  cost_price?: number | string | null;
}

export interface OriginalSaleCostLine {
  id: number;
  product_id: number | null;
  cost_price: number | string | null;
}

/** Match each return to its original sale line; never guess when legacy lines are ambiguous. */
export function calculateSalesReturnCost(returns: ReturnCostLine[], saleItems: OriginalSaleCostLine[]): number {
  const byId = new Map(saleItems.map((item) => [Number(item.id), item]));
  const byProduct = new Map<number, OriginalSaleCostLine[]>();
  for (const item of saleItems) {
    const productId = Number(item.product_id);
    if (!byProduct.has(productId)) byProduct.set(productId, []);
    byProduct.get(productId)!.push(item);
  }

  let total = 0;
  for (const line of returns) {
    const productId = Number(line.product_id);
    const qty = Number(line.qty);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(productId) || productId <= 0) {
      throw new Error('Invalid sales return cost line');
    }
    if (line.cost_price != null) {
      const savedCost = Number(line.cost_price);
      if (!Number.isFinite(savedCost) || savedCost < 0) throw new Error(`Invalid saved return cost for product ${productId}`);
      total += qty * savedCost;
      continue;
    }
    const original = line.sale_item_id ? byId.get(Number(line.sale_item_id)) : undefined;
    if (line.sale_item_id && !original) throw new Error(`Original sale line missing for returned product ${productId}`);
    const candidates = original ? [original] : (byProduct.get(productId) || []);
    if (!candidates.length || (original && Number(original.product_id) !== productId)) {
      throw new Error(`Original sale line missing for returned product ${productId}`);
    }
    const costs = candidates.map((candidate) => Number(candidate.cost_price));
    if (candidates.some((candidate) => candidate.cost_price === null) ||
      costs.some((cost) => !Number.isFinite(cost) || cost < 0) || new Set(costs).size !== 1) {
      throw new Error(`Ambiguous original cost for returned product ${productId}; sale item id is required`);
    }
    total += qty * costs[0];
  }
  return total;
}
