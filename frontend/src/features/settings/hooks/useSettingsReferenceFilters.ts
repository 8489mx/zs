import { useMemo, useState } from 'react';
import type { Branch, Location } from '@/types/domain';

export function useSettingsReferenceFilters(branches: Branch[], locations: Location[]) {
  const [branchSearch, setBranchSearch] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState<'all' | 'with-code' | 'without-code'>('all');
  const [locationFilter, setLocationFilter] = useState<'all' | 'with-branch' | 'without-branch'>('all');

  const filteredBranches = useMemo(() => {
    const search = branchSearch.trim().toLowerCase();
    return branches.filter((branch) => {
      if (branchFilter === 'with-code' && !branch.code) return false;
      if (branchFilter === 'without-code' && branch.code) return false;
      if (!search) return true;
      return [branch.name, branch.code].filter(Boolean).join(' ').toLowerCase().includes(search);
    });
  }, [branches, branchFilter, branchSearch]);

  const filteredLocations = useMemo(() => {
    const search = locationSearch.trim().toLowerCase();
    return locations.filter((location) => {
      if (locationFilter === 'with-branch' && !location.branchName) return false;
      if (locationFilter === 'without-branch' && location.branchName) return false;
      if (!search) return true;
      return [location.name, location.code, location.branchName].filter(Boolean).join(' ').toLowerCase().includes(search);
    });
  }, [locationFilter, locationSearch, locations]);

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
    resetBranchFilters: () => {
      setBranchSearch('');
      setBranchFilter('all');
    },
    resetLocationFilters: () => {
      setLocationSearch('');
      setLocationFilter('all');
    },
  };
}
