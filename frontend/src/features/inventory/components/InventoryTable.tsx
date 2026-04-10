import { DataTable } from '@/shared/ui/data-table';
import type { Product } from '@/types/domain';
import { getInventoryColumns } from '@/features/inventory/utils/inventory-mappers';

export function InventoryTable({ rows, includeSensitivePricing = true }: { rows: Product[]; includeSensitivePricing?: boolean }) {
  return <DataTable rows={rows} columns={getInventoryColumns(includeSensitivePricing)} />;
}
