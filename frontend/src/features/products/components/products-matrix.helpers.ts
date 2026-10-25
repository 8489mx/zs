import type { Product } from '@/types/domain';
/** Preserve every clothing SKU in the matrix even if legacy data has duplicate variants. */
export function groupClothingMatrixVariants(products: Product[]): Record<string, Record<string, Product[]>> {
  const matrix: Record<string, Record<string, Product[]>> = Object.create(null);
  for (const product of products) {
    const color = String(product.color || '').trim() || 'بدون لون';
    const size = String(product.size || '').trim() || 'بدون مقاس';
    const colorRow = matrix[color] || (matrix[color] = Object.create(null));
    (colorRow[size] || (colorRow[size] = [])).push(product);
  }
  return matrix;
}
