import { DataTable } from '@/components/ui/DataTable';
import type { Product } from '@/types/domain';
import { getInventoryColumns } from '@/features/inventory/utils/inventory-mappers';

export function InventoryTable({ rows, includeSensitivePricing = true }: { rows: Product[]; includeSensitivePricing?: boolean }) {
  return <DataTable rows={rows} columns={getInventoryColumns(includeSensitivePricing)} />;
}
