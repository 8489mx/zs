import { describe, expect, it } from 'vitest';
import type { Product } from '@/types/domain';
import { groupClothingMatrixVariants } from './products-matrix.helpers';
const item = (id: string, color: string, size: string, stock: number) => ({ id, color, size, stock } as Product);
describe('fashion matrix duplicates', () => {
  it('includes both SKUs in the same color-size cell', () => {
    const rows = groupClothingMatrixVariants([item('a','أبيض','XL',4),item('b','أبيض','XL',6)]);
    expect(rows['أبيض'].XL).toHaveLength(2);
    expect(rows['أبيض'].XL.reduce((sum,row)=>sum+row.stock,0)).toBe(10);
  });
  it('creates cells for unassigned color and size', () => {
    expect(groupClothingMatrixVariants([item('a','','',0)])['بدون لون']['بدون مقاس']).toHaveLength(1);
  });
});
