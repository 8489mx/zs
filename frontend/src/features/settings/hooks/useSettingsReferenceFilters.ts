import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import type { Branch, Location } from '@/types/domain';
import { useAuthStore } from '@/stores/auth-store';
import { resolveCurrentVertical } from '@/shared/verticals/vertical-scope';

export function useSettingsReferenceFilters(branches: Branch[], locations: Location[]) {
  const tenant = useAuthStore((s) => s.tenant);
  const vertical = resolveCurrentVertical(tenant);

  const [branchSearch, setBranchSearch] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState<'all' | 'with-code' | 'without-code'>('all');
  const [locationFilter, setLocationFilter] = useState<'all' | 'with-branch' | 'without-branch'>('all');
  const deferredBranchSearch = useDeferredValue(branchSearch);
  const deferredLocationSearch = useDeferredValue(locationSearch);

  // Filter out retail van locations for maritime and contracting
  const scopedLocations = useMemo(() => {
    if (vertical === 'maritime' || vertical === 'contracting') {
      return locations.filter((loc) => {
        const code = String(loc.code || '').toUpperCase();
        const type = String((loc as any).type || '').toLowerCase();
        const name = String(loc.name || '');
        if (type === 'van' || code.startsWith('VAN_') || code.startsWith('VAN-') || code === 'VAN' || name.includes('سيارة مندوب')) {
          return false;
        }
        return true;
      });
    }
    return locations;
  }, [locations, vertical]);

  const branchSearchIndex = useMemo(
    () => branches.map((branch) => [branch, [branch.name, branch.code].filter(Boolean).join(' ').toLowerCase()] as const),
    [branches],
  );
  const locationSearchIndex = useMemo(
    () => scopedLocations.map((location) => [location, [location.name, location.code, location.branchName].filter(Boolean).join(' ').toLowerCase()] as const),
    [scopedLocations],
  );

  const filteredBranches = useMemo(() => {
    const search = deferredBranchSearch.trim().toLowerCase();
    return branchSearchIndex.filter(([branch, searchableText]) => {
      if (branchFilter === 'with-code' && !branch.code) return false;
      if (branchFilter === 'without-code' && branch.code) return false;
      if (!search) return true;
      return searchableText.includes(search);
    }).map(([branch]) => branch);
  }, [branchFilter, branchSearchIndex, deferredBranchSearch]);

  const filteredLocations = useMemo(() => {
    const search = deferredLocationSearch.trim().toLowerCase();
    return locationSearchIndex.filter(([location, searchableText]) => {
      if (locationFilter === 'with-branch' && !location.branchName) return false;
      if (locationFilter === 'without-branch' && location.branchName) return false;
      if (!search) return true;
      return searchableText.includes(search);
    }).map(([location]) => location);
  }, [deferredLocationSearch, locationFilter, locationSearchIndex]);

  const resetBranchFilters = useCallback(() => {
    setBranchSearch('');
    setBranchFilter('all');
  }, []);

  const resetLocationFilters = useCallback(() => {
    setLocationSearch('');
    setLocationFilter('all');
  }, []);

  return {
    branchSearch,
    locationSearch,
    branchFilter,
    locationFilter,
    filteredBranches,
    filteredLocations,
    setBranchSearch,
    setLocationSearch,
    setBranchFilter,
    setLocationFilter,
    resetBranchFilters,
    resetLocationFilters,
  };
}
