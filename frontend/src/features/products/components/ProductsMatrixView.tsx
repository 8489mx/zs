import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import type { Product } from '@/types/domain';
import { groupClothingMatrixVariants } from './products-matrix.helpers';

export interface ProductsMatrixViewProps {
  products: Product[];
}

const SIZES_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', 'XXL', '3XL', 'XXXL', '4XL', '5XL', '6XL', 'ONE SIZE', 'FREE SIZE'];

function getSizeRank(size: string) {
  const s = String(size || '').trim().toUpperCase();
  const index = SIZES_ORDER.indexOf(s);
  return index === -1 ? 999 : index;
}

export function ProductsMatrixView({ products }: ProductsMatrixViewProps) {
  const { t } = useTranslation();
  const { colors, sizes, matrix } = useMemo(() => {
    let hasAnyColor = false;
    let hasAnySize = false;

    products.forEach((p) => {
      if (String(p.color || '').trim()) hasAnyColor = true;
      if (String(p.size || '').trim()) hasAnySize = true;
    });

    if (!hasAnyColor && !hasAnySize) {
      return { colors: [], sizes: [], matrix: {} };
    }

    const colorSet = new Set<string>();
    const sizeSet = new Set<string>();
    
    products.forEach((p) => {
      const c = String(p.color || '').trim() || 'بدون لون';
      const s = String(p.size || '').trim() || 'بدون مقاس';
      colorSet.add(c);
      sizeSet.add(s);
    });

    const colors = Array.from(colorSet).sort((a, b) => {
      if (a === 'بدون لون') return 1;
      if (b === 'بدون لون') return -1;
      return a.localeCompare(b, 'ar');
    });

    const sizes = Array.from(sizeSet).sort((a, b) => {
      if (a === 'بدون مقاس') return 1;
      if (b === 'بدون مقاس') return -1;
      const rankA = getSizeRank(a);
      const rankB = getSizeRank(b);
      if (rankA !== rankB) return rankA - rankB;
      const numA = /^\d+(\.\d+)?$/.test(a.trim()) ? Number(a) : NaN;
      const numB = /^\d+(\.\d+)?$/.test(b.trim()) ? Number(b) : NaN;
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b, 'en');
    });

    const matrix = groupClothingMatrixVariants(products);

    return { colors, sizes, matrix };
  }, [products]);

  if (!colors.length && !sizes.length) {
    return null;
  }

  return (
    <div className="table-wrap table-wrap-compact" style={{ margin: '8px 16px', border: '1px solid var(--border-color)', borderRadius: '4px', overflowX: 'auto', maxWidth: '100%', boxSizing: 'border-box' }}>
      <table aria-label="Matrix View" style={{ minWidth: 'auto', background: 'var(--bg-card)' }}>
        <thead>
          <tr>
            <th style={{ backgroundColor: 'var(--bg-body)', position: 'sticky', right: 0, zIndex: 1, borderInlineEnd: '1px solid var(--border-color)' }}>
              {t('products.products_matrix_view.s0', "المتغيرات")}
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
                const variants = matrix[c]?.[s] || [];
                if (!variants.length) {
                  return <td key={s} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>—</td>;
                }
                const stock = variants.reduce((total, variant) => total + Number(variant.stock || 0), 0);
                const isEmpty = stock <= 0;
                const title = variants.map((variant) => [
                  `الصنف: ${variant.id}`,
                  `الباركود: ${variant.barcode || t('products.products_matrix_view.s1', "غير محدد")}`,
                  `المخزون: ${variant.stock}`,
                  `سعر البيع: ${variant.retailPrice}`,
                ].join(' — ')).join('\n');

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
                    {variants.length > 1 ? (
                      <span role="alert" title="أكثر من صنف بنفس اللون والمقاس" style={{
                        display: 'block', fontSize: 11, color: '#b91c1c', fontWeight: 700, marginTop: 3,
                      }}>تكرار {variants.length} أصناف</span>
                    ) : null}
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
