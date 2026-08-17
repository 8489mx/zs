import { useMemo } from 'react';
import type { Branch, Location, AppSettings } from '@/types/domain';

export function usePosOperationalContext({
  settings,
  branches,
  locations,
}: {
  settings: AppSettings | null;
  branches: Branch[];
  locations: Location[];
}) {
  return useMemo(() => {
    const branchId = settings?.currentBranchId ? String(settings.currentBranchId) : (branches[0] ? String(branches[0].id) : '');
    const currentBranch = branches.find((b) => String(b.id) === branchId) || branches[0] || null;
    const isAllLocationsMode = currentBranch?.salesStockMode === 'all_operational_locations';
    
    let locationId = '';
    let currentLocation: Location | null = null;
    
    if (currentBranch && !isAllLocationsMode) {
      if (currentBranch.defaultStockLocationId && locations.some((l) => String(l.id) === String(currentBranch.defaultStockLocationId))) {
        locationId = String(currentBranch.defaultStockLocationId);
        currentLocation = locations.find((l) => String(l.id) === locationId) || null;
      } else {
        const branchLocations = locations.filter((l) => String(l.branchId) === String(currentBranch.id));
        if (branchLocations.length > 0) {
          locationId = String(branchLocations[0].id);
          currentLocation = branchLocations[0];
        } else if (locations.length > 0) {
          locationId = String(locations[0].id);
          currentLocation = locations[0];
        }
      }
    } else if (currentBranch && isAllLocationsMode) {
      if (currentBranch.defaultStockLocationId && locations.some((l) => String(l.id) === String(currentBranch.defaultStockLocationId))) {
        currentLocation = locations.find((l) => String(l.id) === String(currentBranch.defaultStockLocationId)) || null;
      }
    }

    return {
      branchId: currentBranch ? String(currentBranch.id) : branchId,
      branchName: currentBranch?.name || '',
      locationId: isAllLocationsMode ? '' : locationId,
      locationName: isAllLocationsMode ? 'كل المخازن' : (currentLocation?.name || ''),
      salesStockMode: currentBranch?.salesStockMode || 'single_location',
      allowExternalSalesStock: currentBranch?.allowExternalSalesStock || false,
      currentBranch,
      currentLocation
    };
  }, [settings?.currentBranchId, branches, locations]);
}
