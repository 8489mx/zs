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
    const branchId = settings?.currentBranchId ? String(settings.currentBranchId) : '';
    const currentBranch = branches.find((b) => String(b.id) === branchId) || null;
    
    let locationId = '';
    
    if (currentBranch) {
      if (currentBranch.defaultStockLocationId) {
        locationId = String(currentBranch.defaultStockLocationId);
      } else {
        const branchLocations = locations.filter((l) => String(l.branchId) === String(currentBranch.id));
        if (branchLocations.length > 0) {
          locationId = String(branchLocations[0].id);
        } else if (locations.length > 0) {
          locationId = String(locations[0].id);
        }
      }
    }

    const currentLocation = locations.find((l) => String(l.id) === locationId) || null;

    return {
      branchId,
      branchName: currentBranch?.name || '',
      locationId,
      locationName: currentLocation?.name || '',
      salesStockMode: currentBranch?.salesStockMode || 'single_location',
      allowExternalSalesStock: currentBranch?.allowExternalSalesStock || false,
      currentBranch,
      currentLocation
    };
  }, [settings?.currentBranchId, branches, locations]);
}
