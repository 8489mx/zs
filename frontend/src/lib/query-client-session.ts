import type { QueryClient } from '@tanstack/react-query';

export async function clearQueryClientData(queryClient: QueryClient) {
  try {
    await queryClient.cancelQueries();
  } catch {
    // Ignore cancellation errors during auth/session transitions.
  }
  queryClient.clear();
}

export async function resetAuthenticatedClient(queryClient: QueryClient, clearSession: () => void) {
  await clearQueryClientData(queryClient);
  clearSession();
}
