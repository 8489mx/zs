import { DataTable } from '@/shared/ui/data-table';
import type { Product } from '@/types/domain';
import { getProductColumns } from '@/features/products/utils/product-mappers';

interface ProductsTableProps {
  rows: Product[];
  categoryNames: Record<string, string>;
  supplierNames: Record<string, string>;
  locationNames?: Record<string, string>;
}

export function ProductsTable({ rows, categoryNames, supplierNames, locationNames = {} }: ProductsTableProps) {
  return <DataTable rows={rows} empty={null} columns={getProductColumns(categoryNames, supplierNames, locationNames)} />;
}
