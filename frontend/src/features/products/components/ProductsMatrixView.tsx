import { useMemo } from 'react';
import type { Product } from '@/types/domain';

export interface ProductsMatrixViewProps {
  products: Product[];
}

const SIZES_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'];

function getSizeRank(size: string) {
  const s = String(size || '').trim().toUpperCase();
  const index = SIZES_ORDER.indexOf(s);
  return index === -1 ? 999 : index;
}

export function ProductsMatrixView({ products }: ProductsMatrixViewProps) {
  const { colors, sizes, matrix } = useMemo(() => {
    const colorSet = new Set<string>();
    const sizeSet = new Set<string>();
    
    products.forEach((p) => {
      const c = String(p.color || '').trim();
      const s = String(p.size || '').trim();
      if (c) colorSet.add(c);
      if (s) sizeSet.add(s);
    });

    const colors = Array.from(colorSet).sort((a, b) => a.localeCompare(b, 'ar'));
    const sizes = Array.from(sizeSet).sort((a, b) => {
      const rankA = getSizeRank(a);
      const rankB = getSizeRank(b);
      if (rankA !== rankB) return rankA - rankB;
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b, 'en');
    });

    // If there are no colors/sizes, handle gracefully (shouldn't happen for valid fashion variants, but just in case)
    if (!colors.length && !sizes.length) {
      return { colors: [], sizes: [], matrix: {} };
    }

    const effectiveColors = colors.length ? colors : ['بدون لون'];
    const effectiveSizes = sizes.length ? sizes : ['بدون مقاس'];

    const matrix: Record<string, Record<string, Product | undefined>> = {};
    effectiveColors.forEach((c) => {
      matrix[c] = {};
      effectiveSizes.forEach((s) => {
        matrix[c][s] = undefined;
      });
    });

    products.forEach((p) => {
      const c = String(p.color || '').trim() || 'بدون لون';
      const s = String(p.size || '').trim() || 'بدون مقاس';
      // If there are duplicates, we just keep the first one
      if (!matrix[c]) matrix[c] = {};
      if (!matrix[c][s]) matrix[c][s] = p;
    });

    return { colors: effectiveColors, sizes: effectiveSizes, matrix };
  }, [products]);

  if (!colors.length && !sizes.length) {
    return null;
  }

  return (
    <div className="table-wrap table-wrap-compact" style={{ margin: '8px 16px', border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'auto' }}>
      <table aria-label="Matrix View" style={{ minWidth: 'auto', background: 'var(--bg-card)' }}>
        <thead>
          <tr>
            <th style={{ backgroundColor: 'var(--bg-body)', position: 'sticky', right: 0, zIndex: 1, borderInlineEnd: '1px solid var(--border-color)' }}>
              اللون / المقاس
            </th>
            {sizes.map((s) => (
              <th key={s} style={{ textAlign: 'center', backgroundColor: 'var(--bg-body)' }}>{s}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {colors.map((c) => (
            <tr key={c}>
              <td style={{ fontWeight: 'bold', backgroundColor: 'var(--bg-body)', position: 'sticky', right: 0, zIndex: 1, borderInlineEnd: '1px solid var(--border-color)' }}>
                {c}
              </td>
              {sizes.map((s) => {
                const variant = matrix[c][s];
                if (!variant) {
                  return <td key={s} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>—</td>;
                }
                const stock = Number(variant.stock || 0);
                const isEmpty = stock <= 0;
                
                const title = [
                  `الباركود: ${variant.barcode || 'غير محدد'}`,
                  `سعر البيع: ${variant.retailPrice}`,
                  variant.notes ? `ملاحظات: ${variant.notes}` : null
                ].filter(Boolean).join('\n');

                return (
                  <td key={s} title={title} style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: isEmpty ? 'var(--bg-body)' : 'var(--primary-color-10)',
                      color: isEmpty ? 'var(--text-muted)' : 'var(--primary-color)',
                      fontWeight: isEmpty ? 'normal' : 'bold',
                      minWidth: '24px'
                    }}>
                      {stock}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
