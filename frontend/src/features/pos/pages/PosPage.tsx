import { Navigate } from 'react-router-dom';
import { PosWorkspace } from '@/features/pos/components/PosWorkspace';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import { useAuthStore } from '@/stores/auth-store';
import { isPlatformAdmin } from '@/app/router/access';

export function PosPage() {
  const { data: settings } = useSettingsQuery();
  const user = useAuthStore((s) => s.user);

  if (settings?.posModuleEnabled === false && !isPlatformAdmin(user)) {
    return <Navigate to="/sales" replace />;
  }

  return <PosWorkspace />;
}
