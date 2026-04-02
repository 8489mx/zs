import { Navigate, useParams } from 'react-router-dom';
import { InventoryWorkspace } from '@/features/inventory/components/InventoryWorkspace';
import { isInventorySection } from '@/features/inventory/pages/inventory.page-config';

export function InventoryPage() {
  const { section } = useParams<{ section?: string }>();
  if (!isInventorySection(section)) {
    return <Navigate to="/inventory/overview" replace />;
  }
  return <InventoryWorkspace currentSection={section} />;
}
