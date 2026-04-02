import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateSettingsReferenceDomain } from '@/app/query-invalidation';
import { queryKeys } from '@/app/query-keys';
import { settingsApi } from '@/features/settings/api/settings.api';
import { buildBranchPayload, buildLocationPayload, buildSettingsUpdatePayload } from '@/features/settings/contracts';
import type { AppSettings } from '@/types/domain';
import type { BranchFormOutput, LocationFormOutput, SettingsFormOutput } from '@/features/settings/schemas/settings.schema';

export type SettingsFormValues = SettingsFormOutput;
export type BranchFormValues = BranchFormOutput;
export type LocationFormValues = LocationFormOutput;

export function useSettingsUpdateMutation(currentSettings?: AppSettings, onSuccessCallback?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: SettingsFormValues) => settingsApi.update(buildSettingsUpdatePayload(currentSettings, values)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings });
      onSuccessCallback?.();
    }
  });
}

export function useCreateBranchMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: BranchFormValues) => settingsApi.createBranch(buildBranchPayload(values)),
    onSuccess: async () => {
      await invalidateSettingsReferenceDomain(queryClient, { includeSettings: false, includeBranches: true, includeLocations: false });
      onSuccess?.();
    }
  });
}



export function useUpdateBranchMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ branchId, values }: { branchId: string; values: BranchFormValues }) => settingsApi.updateBranch(branchId, buildBranchPayload(values)),
    onSuccess: async () => {
      await invalidateSettingsReferenceDomain(queryClient, { includeSettings: true, includeBranches: true, includeLocations: false });
      onSuccess?.();
    }
  });
}

export function useDeleteBranchMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (branchId: string) => settingsApi.deleteBranch(branchId),
    onSuccess: async () => {
      await invalidateSettingsReferenceDomain(queryClient, { includeSettings: true, includeBranches: true, includeLocations: true });
      onSuccess?.();
    }
  });
}

export function useCreateLocationMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: LocationFormValues) => settingsApi.createLocation(buildLocationPayload(values)),
    onSuccess: async () => {
      await invalidateSettingsReferenceDomain(queryClient, { includeSettings: false, includeBranches: true, includeLocations: true });
      onSuccess?.();
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
