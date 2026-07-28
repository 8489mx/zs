import { Fragment, useMemo } from 'react';
import { Button } from '@/shared/ui/button';
import type { Product } from '@/types/domain';
import { formatCurrency } from '@/lib/format';
import { resolveProductStatus } from '@/lib/domain/inventory';

function formatUnitName(units?: { name: string; isBaseUnit: boolean }[]) {
  if (!units?.length) return '';
  const baseUnit = units.find(u => u.isBaseUnit) || units[0];
  if (!baseUnit?.name) return '';
  
  const map: Record<string, string> = {
    'كيلوجرام': 'كجم',
    'جرام': 'جم',
    'قطعة': 'ق',
    'لتر': 'لتر',
    'ملي': 'مل',
    'متر': 'م'
  };
  return map[baseUnit.name] || baseUnit.name;
}

interface InventoryTableProps {
  rows: Product[];
  includeSensitivePricing?: boolean;
  selectedProductId?: string;
  onProductSelect?: (product: Product) => void;
}

type ProductGroup = {
  key: string;
  label: string;
  styleCode: string;
  rows: Product[];
};

function buildVariantLabel(product: Product) {
  const parts = [String(product.color || '').trim(), String(product.size || '').trim()].filter(Boolean);
  return parts.join(' / ');
}

function deriveGroupLabel(product: Product) {
  const variantLabel = buildVariantLabel(product);
  const rawName = String(product.name || '').trim();
  if (!variantLabel) return rawName;
  const suffix = ` - ${variantLabel}`;
  return rawName.endsWith(suffix) ? rawName.slice(0, -suffix.length).trim() : rawName;
}

function buildGroupedRows(rows: Product[]): ProductGroup[] {
  const styleCounts = new Map<string, number>();
  for (const row of rows) {
    const styleCode = String(row.styleCode || '').trim();
    if (!styleCode) continue;
    styleCounts.set(styleCode, Number(styleCounts.get(styleCode) || 0) + 1);
  }

  const orderedKeys: string[] = [];
  const grouped = new Map<string, ProductGroup>();

  for (const row of rows) {
    const styleCode = String(row.styleCode || '').trim();
    const shouldGroup = Boolean(styleCode) && Number(styleCounts.get(styleCode) || 0) > 1;
    const groupKey = shouldGroup ? `style:${styleCode}` : `product:${row.id}`;
    if (!grouped.has(groupKey)) {
      orderedKeys.push(groupKey);
      grouped.set(groupKey, {
        key: groupKey,
        label: shouldGroup ? deriveGroupLabel(row) : String(row.name || '').trim(),
        styleCode: shouldGroup ? styleCode : '',
        rows: [],
      });
    }
    grouped.get(groupKey)?.rows.push(row);
  }

  return orderedKeys.map((key) => grouped.get(key)!).filter(Boolean);
}

function renderStatusBadge(status: 'healthy' | 'low' | 'out') {
  return <span className={`status-badge ${status === 'out' ? 'status-draft' : status === 'low' ? 'status-warning' : 'status-posted'}`}>{status === 'out' ? 'نافد' : status === 'low' ? 'منخفض' : 'سليم'}</span>;
}

export function InventoryTable({ rows, includeSensitivePricing = true, selectedProductId = '', onProductSelect }: InventoryTableProps) {
  const groupedRows = useMemo(() => buildGroupedRows(rows), [rows]);

  if (!groupedRows.length) return null;

  return (
    <div className="table-wrap table-wrap-sticky table-wrap-compact">
      <table aria-label="جدول متابعة المخزون">
        <thead>
          <tr>
            <th>الصنف</th>
            <th>الباركود / الكود</th>
            <th>الرصيد</th>
            <th>الحد الأدنى</th>
            {includeSensitivePricing ? <th>التكلفة</th> : null}
            <th>الحالة</th>
            <th>إجراء سريع</th>
          </tr>
        </thead>
        <tbody>
          {groupedRows.map((group) => {
            const isGrouped = group.rows.length > 1;
            if (!isGrouped) {
              const product = group.rows[0];
              const status = resolveProductStatus(product);
              return (
                <tr
                  key={group.key}
                  className={[selectedProductId === String(product.id) ? 'table-row-selected' : '', onProductSelect ? 'table-row-clickable' : ''].filter(Boolean).join(' ') || undefined}
                  onClick={onProductSelect ? () => onProductSelect(product) : undefined}
                  title={onProductSelect ? 'اضغط لفتح تسوية سريعة لهذا الصنف' : undefined}
                  tabIndex={onProductSelect ? 0 : undefined}
                >
                  <td><strong>{product.name}</strong></td>
                  <td>{product.barcode || product.styleCode || '—'}</td>
                  <td>{product.stock} <span style={{ color: '#9ca3af', fontSize: '0.85em', marginRight: '2px' }}>{formatUnitName(product.units)}</span></td>
                  <td>{product.minStock} <span style={{ color: '#9ca3af', fontSize: '0.85em', marginRight: '2px' }}>{formatUnitName(product.units)}</span></td>
                  {includeSensitivePricing ? <td>{formatCurrency(product.costPrice)}</td> : null}
                  <td>{renderStatusBadge(status)}</td>
                  <td>
                    {onProductSelect ? <Button type="button" variant="secondary" onClick={(event) => { event.stopPropagation(); onProductSelect(product); }}>تعديل سريع</Button> : '—'}
                  </td>
                </tr>
              );
            }

            const totalStock = Number(group.rows.reduce((sum, product) => sum + Number(product.stock || 0), 0).toFixed(3));
            const totalMinStock = Number(group.rows.reduce((sum, product) => sum + Number(product.minStock || 0), 0).toFixed(3));
            const statuses = group.rows.map((product) => resolveProductStatus(product));
            const groupStatus = statuses.includes('out') ? 'out' : statuses.includes('low') ? 'low' : 'healthy';

            return (
              <Fragment key={group.key}>
                <tr className="inventory-group-row">
                  <td>
                    <div>
                      <strong>{group.label}</strong>
                      <div className="muted small">{group.rows.length} أصناف فرعية تحت نفس الصنف الرئيسي</div>
                    </div>
                  </td>
                  <td>{group.styleCode || '—'}</td>
                  <td>{totalStock} <span style={{ color: '#9ca3af', fontSize: '0.85em', marginRight: '2px' }}>{formatUnitName(group.rows[0]?.units)}</span></td>
                  <td>{totalMinStock} <span style={{ color: '#9ca3af', fontSize: '0.85em', marginRight: '2px' }}>{formatUnitName(group.rows[0]?.units)}</span></td>
                  {includeSensitivePricing ? <td>—</td> : null}
                  <td>{renderStatusBadge(groupStatus)}</td>
                  <td><span className="muted small">اختر الصنف الفرعي من الأسفل</span></td>
                </tr>
                {group.rows.map((product) => {
                  const status = resolveProductStatus(product);
                  const variantLabel = buildVariantLabel(product);
                  return (
                    <tr
                      key={`child:${product.id}`}
                      className={[
                        'table-row-clickable',
                        selectedProductId === String(product.id) ? 'table-row-selected' : '',
                      ].filter(Boolean).join(' ') || undefined}
                      onClick={onProductSelect ? () => onProductSelect(product) : undefined}
                      title={onProductSelect ? 'اضغط لفتح تسوية سريعة لهذا الصنف الفرعي' : undefined}
                      tabIndex={onProductSelect ? 0 : undefined}
                    >
                      <td>
                        <div>
                          <strong>↳ {variantLabel || product.name}</strong>
                          <div className="muted small">{product.name}</div>
                        </div>
                      </td>
                      <td>{product.barcode || '—'}</td>
                      <td>{product.stock} <span style={{ color: '#9ca3af', fontSize: '0.85em', marginRight: '2px' }}>{formatUnitName(product.units)}</span></td>
                      <td>{product.minStock} <span style={{ color: '#9ca3af', fontSize: '0.85em', marginRight: '2px' }}>{formatUnitName(product.units)}</span></td>
                      {includeSensitivePricing ? <td>{formatCurrency(product.costPrice)}</td> : null}
                      <td>{renderStatusBadge(status)}</td>
                      <td>
                        {onProductSelect ? <Button type="button" variant="secondary" onClick={(event) => { event.stopPropagation(); onProductSelect(product); }}>تعديل سريع</Button> : '—'}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
