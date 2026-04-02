import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { http } from '@/lib/http';

type HealthPayload = {
  ok?: boolean;
  status?: string;
  uptimeSeconds?: number;
};

async function fetchHealth(): Promise<HealthPayload> {
  return http<HealthPayload>('/api/health');
}

function resolveLabel(data?: HealthPayload, isError?: boolean) {
  if (isError) return 'Backend Unreachable';
  if (!data) return 'Checking Backend';
  if (data.ok === false || (data.status && data.status !== 'ok')) return 'Backend Degraded';
  return 'Backend Healthy';
}

function resolveClassName(data?: HealthPayload, isError?: boolean) {
  if (isError) return 'status-badge status-declined';
  if (!data) return 'status-badge status-pending';
  if (data.ok === false || (data.status && data.status !== 'ok')) return 'status-badge status-pending';
  return 'status-badge status-posted';
}

export function BackendHealthBadge() {
  const healthQuery = useQuery({
    queryKey: queryKeys.systemHealth,
    queryFn: fetchHealth,
    retry: 1,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
  });

  const label = resolveLabel(healthQuery.data, healthQuery.isError);
  const className = resolveClassName(healthQuery.data, healthQuery.isError);

  return <span className={className} title="Runtime backend health check">{label}</span>;
}
