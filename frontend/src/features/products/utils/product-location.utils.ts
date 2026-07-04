export function getProductLocationDisplayName(
  product: {
    stock?: number;
    defaultLocationId?: string | number | null;
    activeLocationIds?: string[] | number[];
  },
  locationNames: Record<string, string>
): string {
  const stock = Number(product.stock || 0);

  // Rule 1: If product has stock > 0, it should show the stock locations.
  // We assume activeLocationIds represents the stock locations when stock > 0.
  if (stock > 0 && product.activeLocationIds && product.activeLocationIds.length > 0) {
    if (product.activeLocationIds.length === 1) {
      return locationNames[String(product.activeLocationIds[0])] || 'غير محدد';
    }
    return 'متعدد المخازن';
  }

  // Rule 2: If stock = 0, show defaultLocationId if exists
  if (product.defaultLocationId) {
    return locationNames[String(product.defaultLocationId)] || 'غير محدد';
  }

  // Rule 3 & 4: If no defaultLocationId, fallback to activeLocationIds
  if (product.activeLocationIds && product.activeLocationIds.length > 0) {
    if (product.activeLocationIds.length === 1) {
      return locationNames[String(product.activeLocationIds[0])] || 'غير محدد';
    }
    return 'متعدد المخازن';
  }

  // Rule 5: Show 'غير محدد' only if no default and no active locations
  return 'غير محدد';
}
