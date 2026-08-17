import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateSettingsReferenceDomain } from '@/app/query-invalidation';
import { settingsApi } from '@/features/settings/api/settings.api';
import { buildLocationPayload } from '@/features/settings/contracts';
import type { LocationFormOutput } from '@/features/settings/schemas/settings.schema';

export type LocationFormValues = LocationFormOutput;

export function useCreateLocationMutation(onSuccess?: (result: { locationId?: string | null }) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: LocationFormValues) => settingsApi.createLocation(buildLocationPayload(values)),
    onSuccess: async (result, values) => {
      const createdLocationId = String(result?.location?.id || result?.locationId || '').trim();
      await invalidateSettingsReferenceDomain(queryClient, { includeSettings: false, includeBranches: true, includeLocations: true });
      const responseLocationId = String(result?.locationId || '').trim();
      const normalizedName = String(values?.name || '').trim().toLowerCase();
      const normalizedCode = String(values?.code || '').trim().toLowerCase();
      const normalizedBranchId = String(values?.branchId || '').trim();
      const matchedLocation = Array.isArray(result?.locations)
        ? result.locations.find((location) => {
            const sameName = String(location?.name || '').trim().toLowerCase() === normalizedName;
            const sameBranch = normalizedBranchId ? String(location?.branchId || '') === normalizedBranchId : true;
            if (normalizedCode) {
              return sameName && sameBranch && String(location?.code || '').trim().toLowerCase() === normalizedCode;
            }
            return sameName && sameBranch;
          })
        : null;
      const fallbackLocationId = String(matchedLocation?.id || '').trim()
        || (Array.isArray(result?.locations) && result.locations.length ? String(result.locations[result.locations.length - 1]?.id || '').trim() : '');
      onSuccess?.({ locationId: createdLocationId || responseLocationId || fallbackLocationId || null });
    }
  });
}

export function useUpdateLocationMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ locationId, values }: { locationId: string; values: LocationFormValues }) => settingsApi.updateLocation(locationId, buildLocationPayload(values)),
    onSuccess: async () => {
      await invalidateSettingsReferenceDomain(queryClient, { includeSettings: true, includeBranches: false, includeLocations: true });
      onSuccess?.();
    }
  });
}

export function useDeleteLocationMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (locationId: string) => settingsApi.deleteLocation(locationId),
    onSuccess: async () => {
      await invalidateSettingsReferenceDomain(queryClient, { includeSettings: true, includeBranches: false, includeLocations: true });
      onSuccess?.();
    }
  });
}
