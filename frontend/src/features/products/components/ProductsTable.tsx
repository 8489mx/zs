import { memo, useMemo } from 'react';
import { DataTable } from '@/shared/ui/data-table';
import type { Product } from '@/types/domain';
import { getProductColumns } from '@/features/products/utils/product-mappers';

interface ProductsTableProps {
  rows: Product[];
  categoryNames: Record<string, string>;
  supplierNames: Record<string, string>;
  locationNames?: Record<string, string>;
}

export const ProductsTable = memo(function ProductsTable({ rows, categoryNames, supplierNames, locationNames }: ProductsTableProps) {
  const columns = useMemo(
    () => getProductColumns(categoryNames, supplierNames, locationNames || {}),
    [categoryNames, supplierNames, locationNames],
  );
  return <DataTable rows={rows} empty={null} columns={columns} />;
});
