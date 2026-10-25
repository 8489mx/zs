import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePosCatalog } from './usePosCatalog';

const { queryMock, current } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  current: { tenantId: 'tenant-a' },
}));
vi.mock('@tanstack/react-query', () => ({ useQuery: queryMock }));
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: { getState: () => ({ user: { tenantId: current.tenantId } }) },
}));
vi.mock('@/shared/hooks/use-debounced-value', () => ({
  useDebouncedValue: (value: string) => value,
}));
vi.mock('@/features/pos/lib/pos-catalog-storage', () => ({
  searchCatalogFromStorage: vi.fn(async () => []),
  getAllCatalogFromStorage: vi.fn(async () => []),
  getStoredTenantIdFromStorage: vi.fn(async () => null),
  clearCatalogStorage: vi.fn(async () => {}),
  isPosCachedTenantCompatible: (active: string, stored: string | null) =>
    Boolean(active && stored && active === stored),
}));

describe('POS catalog tenant-scoped React Query', () => {
  beforeEach(() => {
    current.tenantId = 'tenant-a';
    queryMock.mockReset().mockReturnValue({ data: [], isFetching: false });
  });

  it('creates separate query keys and does not show previous tenant as placeholder', () => {
    const { rerender } = renderHook(() => usePosCatalog('', 'branch-1', 'location-1'));
    const first = queryMock.mock.calls[queryMock.mock.calls.length - 1][0];
    expect(first.queryKey[2]).toBe('tenant-a');
    expect(first.enabled).toBe(true);

    current.tenantId = 'tenant-b';
    rerender();
    const second = queryMock.mock.calls[queryMock.mock.calls.length - 1][0];
    expect(second.queryKey[2]).toBe('tenant-b');
    expect(second.placeholderData([{ id: 'old' }], { queryKey: first.queryKey })).toBeUndefined();
    expect(second.placeholderData([{ id: 'current' }], { queryKey: second.queryKey })).toEqual([{ id: 'current' }]);
  });

  it('does not query without active tenant', () => {
    current.tenantId = '';
    renderHook(() => usePosCatalog('', '', ''));
    expect(queryMock.mock.calls[queryMock.mock.calls.length - 1][0].enabled).toBe(false);
  });
});
