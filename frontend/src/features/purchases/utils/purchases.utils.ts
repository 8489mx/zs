export function resolveSuggestedReceivingLocation(
  product: { id: string | number; defaultLocationId?: string | number | null; type?: 'stock' | 'service' },
  locationStocks: { locationId: string | number; productId: string | number; qty: number }[],
  locations: { id: string | number; name: string }[]
) {
  if (product.type === 'service') {
    return { warehouseId: undefined, warehouse: 'لا يؤثر على المخزون' };
  }

  // Find all stock entries for this product that have > 0 qty
  const productStocks = locationStocks.filter((ls) => String(ls.productId) === String(product.id) && ls.qty > 0);

  // If there's only one location with stock, use it
  if (productStocks.length === 1) {
    const locId = String(productStocks[0].locationId);
    const loc = locations.find((l) => String(l.id) === locId);
    if (loc) return { warehouseId: locId, warehouse: loc.name };
  }

  // If multiple locations have stock
  if (productStocks.length > 1) {
    const defaultLocId = product.defaultLocationId ? String(product.defaultLocationId) : null;
    if (defaultLocId) {
      // Check if default location is among the stocked ones
      const hasStockInDefault = productStocks.some((ls) => String(ls.locationId) === defaultLocId);
      if (hasStockInDefault) {
        const loc = locations.find((l) => String(l.id) === defaultLocId);
        if (loc) return { warehouseId: defaultLocId, warehouse: loc.name };
      }
    }

    // Otherwise, pick the one with the highest stock
    const highestStock = [...productStocks].sort((a, b) => b.qty - a.qty)[0];
    const locId = String(highestStock.locationId);
    const loc = locations.find((l) => String(l.id) === locId);
    if (loc) return { warehouseId: locId, warehouse: loc.name };
  }

  // If no actual stock exists, use defaultLocationId if provided
  if (product.defaultLocationId) {
    const defaultLocId = String(product.defaultLocationId);
    const loc = locations.find((l) => String(l.id) === defaultLocId);
    if (loc) return { warehouseId: defaultLocId, warehouse: loc.name };
  }

  // If no stock and no default location, leave it empty for manual selection
  return { warehouseId: undefined, warehouse: '' };
}