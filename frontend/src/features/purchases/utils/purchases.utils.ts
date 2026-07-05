export function resolveSuggestedReceivingLocation(
  product: { id: string | number; defaultLocationId?: string | number | null; type?: 'stock' | 'service'; activeLocationIds?: string[] | number[] },
  locationStocks: { locationId: string | number; productId: string | number; qty: number }[],
  locations: { id: string | number; name: string }[]
) {
  if (product.type === 'service') {
    return { warehouseId: undefined, warehouse: '' };
  }

  // Rule 1: Find all stock entries for this product that have > 0 qty
  const productStocks = locationStocks.filter((ls) => String(ls.productId) === String(product.id) && ls.qty > 0);

  // If there's only one location with stock, use it
  if (productStocks.length === 1) {
    const locId = String(productStocks[0].locationId);
    const loc = locations.find((l) => String(l.id) === locId);
    if (loc) return { warehouseId: locId, warehouse: loc.name };
  }

  // If multiple locations have stock > 0, it should request manual selection (return undefined)
  if (productStocks.length > 1) {
    return { warehouseId: undefined, warehouse: '' };
  }

  // Rule 2: If stock is 0, use defaultLocationId if provided
  if (product.defaultLocationId) {
    const defaultLocId = String(product.defaultLocationId);
    const loc = locations.find((l) => String(l.id) === defaultLocId);
    if (loc) {
      return { warehouseId: defaultLocId, warehouse: loc.name };
    } else {
      console.warn(`[Inventory] Product ${product.id} has defaultLocationId=${defaultLocId} but it is not available in current locations scope. Falling back...`);
    }
  }

  // Rule 3: If no default location, check activeLocationIds for a single location
  if (product.activeLocationIds && product.activeLocationIds.length === 1) {
    const locId = String(product.activeLocationIds[0]);
    const loc = locations.find((l) => String(l.id) === locId);
    if (loc) return { warehouseId: locId, warehouse: loc.name };
  }

  // Rule 4: If activeLocationIds has multiple, request manual selection
  if (product.activeLocationIds && product.activeLocationIds.length > 1) {
    return { warehouseId: undefined, warehouse: '' };
  }

  // Rule 5: If no default location and no active locations, it's undefined
  return { warehouseId: undefined, warehouse: '' };
}