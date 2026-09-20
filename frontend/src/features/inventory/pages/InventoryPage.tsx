import { Navigate, useParams, useLocation } from 'react-router-dom';
import { InventoryWorkspace } from '@/features/inventory/components/InventoryWorkspace';
import { isInventorySection } from '@/features/inventory/pages/inventory.page-config';

export function InventoryPage() {
  const { section: paramSection } = useParams<{ section?: string }>();
  const location = useLocation();

  // Extract section from URL pathname if not present in route params
  const pathSegment = location.pathname.split('/').filter(Boolean)[1];
  const normalizedSection: string | undefined =
    pathSegment === 'issue-orders' ? 'transfers' : (paramSection || pathSegment);

  if (!isInventorySection(normalizedSection)) {
    return <Navigate to="/inventory/overview" replace />;
  }
  return <InventoryWorkspace currentSection={normalizedSection} />;
}
