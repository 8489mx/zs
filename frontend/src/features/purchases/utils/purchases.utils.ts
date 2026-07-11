export function resolveSuggestedReceivingLocation(
  product: { id: string | number; defaultLocationId?: string | number | null; type?: 'stock' | 'service'; activeLocationIds?: string[] | number[] },
  locations: { id: string | number; name: string; isInactive?: boolean }[],
  defaultReceivingLocationId?: string | number | null
) {
  if (product.type === 'service') {
    return { warehouseId: undefined, warehouse: '' };
  }

  // Priority 1: product.default_location_id
  if (product.defaultLocationId) {
    const defaultLocId = String(product.defaultLocationId);
    const loc = locations.find((l) => String(l.id) === defaultLocId);
    if (loc && !loc.isInactive) {
      return { warehouseId: defaultLocId, warehouse: loc.name };
    }
  }

  // Priority 2: Product has stock in exactly ONE active location
  if (product.activeLocationIds && product.activeLocationIds.length === 1) {
    const locId = String(product.activeLocationIds[0]);
    const loc = locations.find((l) => String(l.id) === locId);
    if (loc && !loc.isInactive) {
      return { warehouseId: locId, warehouse: loc.name };
    }
  }

  // Priority 3: settings.currentLocationId (defaultReceivingLocationId)
  if (defaultReceivingLocationId) {
    const locId = String(defaultReceivingLocationId);
    const loc = locations.find((l) => String(l.id) === locId);
    if (loc && !loc.isInactive) {
      return { warehouseId: locId, warehouse: loc.name };
    }
  }

  // Priority 4: Product has stock in multiple locations, pick the first active one
  if (product.activeLocationIds && product.activeLocationIds.length > 1) {
    for (const locId of product.activeLocationIds) {
      const loc = locations.find((l) => String(l.id) === String(locId));
      if (loc && !loc.isInactive) {
        return { warehouseId: String(loc.id), warehouse: loc.name };
      }
    }
  }

  // Priority 5: The only active stock location if exactly one exists
  const activeLocations = locations.filter(l => !l.isInactive);
  if (activeLocations.length === 1) {
    return { warehouseId: String(activeLocations[0].id), warehouse: activeLocations[0].name };
  }

  // Priority 6: Block with clear error (handled by caller when returning undefined)
  return { warehouseId: undefined, warehouse: '' };
}