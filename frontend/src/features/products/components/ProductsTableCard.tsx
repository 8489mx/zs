import { Fragment, useState, useMemo } from 'react';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { PaginationControls } from '@/shared/components/pagination-controls';
import { formatCurrency } from '@/lib/format';
import type { Product } from '@/types/domain';

import { getProductLocationDisplayName } from '../utils/product-location.utils';
import { ProductsMatrixView } from './ProductsMatrixView';

export interface ProductsTableCardProps {
  search: string;
  onSearchChange: (value: string) => void;
  viewFilter: 'all' | 'low' | 'out' | 'offers' | 'special';
  onViewFilterChange: (value: 'all' | 'low' | 'out' | 'offers' | 'special') => void;
  selectedIds: string[];
  onSelectedIdsChange: (value: string[]) => void;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  visibleProducts: Product[];
  selectedProduct: Product | null;
  onSelectProduct: (product: Product | null) => void;
  onDeleteProduct: (product: Product) => void;
  onOpenOfferDialog: (product: Product) => void;
  onOpenBarcodeDialog: (product: Product, mode?: 'scan' | 'generate') => void;
  onOpenPrintDialog: (product: Product) => void;
  canDelete: boolean;
  canPrint: boolean;
  onExportCsv: () => void;
  onPrint: () => void;
  categoryNames: Record<string, string>;
  supplierNames: Record<string, string>;
  locationNames: Record<string, string>;
  inventorySaleValue: number;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (value: number) => void;
  onPageSizeChange: (value: number) => void;
  clothingEnabled: boolean;
}

type ProductGroup = {
  key: string;
  representative: Product;
  children: Product[];
  grouped: boolean;
};

function variantLabel(product: Product) {
  const primary = String(product.color || '').trim();
  const secondary = String(product.size || '').trim();
  if (primary && secondary) return `${primary} / ${secondary}`;
  return primary || secondary || '—';
}

function deriveBaseName(product: Product) {
  const raw = String(product.name || '').trim();
  const label = variantLabel(product);
  if (!label || label === '—') return raw;
  const suffix = ` - ${label}`;
  return raw.endsWith(suffix) ? raw.slice(0, -suffix.length).trim() : raw;
}

function groupProducts(products: Product[]): ProductGroup[] {
  const byKey = new Map<string, Product[]>();
  for (const product of products) {
    const styleCode = String(product.styleCode || '').trim();
    const key = styleCode ? `group:${styleCode}` : `single:${product.id}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(product);
  }
  return Array.from(byKey.entries()).map(([key, rows]) => {
    const sorted = [...rows].sort((a, b) => variantLabel(a).localeCompare(variantLabel(b), 'ar'));
    const representative = sorted[0];
    return { key, representative, children: sorted, grouped: key.startsWith('group:') && sorted.length > 1 };
  });
}

export function ProductsTableCard(props: ProductsTableCardProps) {
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const groupedRows = useMemo(() => groupProducts(props.visibleProducts), [props.visibleProducts]);
  const visibleLeafIds = groupedRows.flatMap((group) => group.children.map((product) => String(product.id)));
  const allVisibleSelected = Boolean(visibleLeafIds.length && visibleLeafIds.every((id) => props.selectedIds.includes(id)));
  const someVisibleSelected = Boolean(!allVisibleSelected && visibleLeafIds.some((id) => props.selectedIds.includes(id)));
  const totalPages = Math.max(1, Math.ceil((props.totalItems || 0) / props.pageSize));
  const rangeStart = props.totalItems ? ((props.page - 1) * props.pageSize) + 1 : 0;
  const rangeEnd = Math.min(props.page * props.pageSize, props.totalItems || 0);



  function toggleExpand(key: string) {
    setExpandedKeys((current) => current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key]);
  }

  function toggleGroupSelection(group: ProductGroup, checked: boolean) {
    const next = new Set(props.selectedIds);
    for (const child of group.children) {
      if (checked) next.add(String(child.id));
      else next.delete(String(child.id));
    }
    props.onSelectedIdsChange(Array.from(next));
  }

  return (
    <FormSection title="قائمة الأصناف الحالية" description="يعرض السجل الآن الصنف الرئيسي مرة واحدة، ويمكن فتح الأصناف الفرعية تحته بدل تكرار كل لون أو رائحة أو مقاس كسطر أولي مستقل." actions={<div className="actions compact-actions"><span className="nav-pill">قيمة البيع {formatCurrency(props.inventorySaleValue)}</span><Button variant="secondary" onClick={props.onExportCsv}>تصدير Excel</Button><Button variant="secondary" onClick={props.onPrint} disabled={!props.canPrint}>طباعة</Button></div>} className="workspace-panel">
      <SearchToolbar search={props.search} onSearchChange={props.onSearchChange} searchPlaceholder="ابحث بالاسم أو الباركود أو القسم أو المورد أو الخاصية الفرعية" />
      <div className="filter-chip-row">
        <Button variant={props.viewFilter === 'all' ? 'primary' : 'secondary'} onClick={() => props.onViewFilterChange('all')}>الكل</Button>
        <Button variant={props.viewFilter === 'low' ? 'primary' : 'secondary'} onClick={() => props.onViewFilterChange('low')}>منخفضة</Button>
        <Button variant={props.viewFilter === 'out' ? 'primary' : 'secondary'} onClick={() => props.onViewFilterChange('out')}>نافدة</Button>
        <Button variant={props.viewFilter === 'offers' ? 'primary' : 'secondary'} onClick={() => props.onViewFilterChange('offers')}>بعروض</Button>
        <Button variant={props.viewFilter === 'special' ? 'primary' : 'secondary'} onClick={() => props.onViewFilterChange('special')}>أسعار خاصة</Button>
      </div>
      {props.selectedIds.length ? (
        <div className="bulk-toolbar">
          <div className="bulk-toolbar-meta">
            <strong>تحديد نشط: {props.selectedIds.length}</strong>
            <span className="muted small">يمكنك حذف الأصناف المحددة دفعة واحدة أو مسح التحديد الحالي.</span>
          </div>
          <div className="actions compact-actions">
            <Button variant="secondary" onClick={props.onClearSelection}>مسح التحديد</Button>
            <Button variant="danger" onClick={props.onBulkDelete} disabled={!props.canDelete}>حذف المحدد</Button>
          </div>
        </div>
      ) : null}

      <QueryFeedback
        isLoading={props.isLoading}
        isError={props.isError}
        error={props.error}
        isEmpty={!props.visibleProducts.length}
        loadingText="جاري تحميل الأصناف..."
        emptyTitle="لا توجد أصناف مطابقة"
        emptyHint="غيّر كلمة البحث أو أضف صنفًا جديدًا من النموذج."
      >
        <div className="table-wrap table-wrap-sticky table-wrap-compact">
          <table aria-label="قائمة الأصناف">
            <thead>
              <tr>
                <th className="table-selection-cell">
                  <input
                    type="checkbox"
                    aria-label="تحديد كل الصفوف الظاهرة"
                    checked={allVisibleSelected}
                    ref={(node) => { if (node) node.indeterminate = someVisibleSelected; }}
                    onChange={(event) => {
                      const next = new Set(props.selectedIds);
                      if (event.target.checked) visibleLeafIds.forEach((id) => next.add(id));
                      else visibleLeafIds.forEach((id) => next.delete(id));
                      props.onSelectedIdsChange(Array.from(next));
                    }}
                  />
                </th>
                <th>الصنف</th>
                <th>الباركود</th>
                <th>{props.clothingEnabled ? 'اللون / المقاس' : 'الفرعي'}</th>
                <th>القسم / المورد / المخزن</th>
                <th>الأسعار</th>
                <th>المخزون</th>
                <th>ملاحظات</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {groupedRows.map((group) => {
                const isExpanded = expandedKeys.includes(group.key);
                const groupIds = group.children.map((product) => String(product.id));
                const allSelected = groupIds.every((id) => props.selectedIds.includes(id));
                const someSelected = !allSelected && groupIds.some((id) => props.selectedIds.includes(id));
                const baseName = deriveBaseName(group.representative);
                const totalStock = group.children.reduce((sum, entry) => sum + Number(entry.stock || 0), 0);

                if (!group.grouped) {
                  const product = group.representative;
                  const activeLocationNames = getProductLocationDisplayName(product, props.locationNames);

                  return (
                    <tr key={group.key} className={props.selectedProduct?.id === product.id ? 'table-row-selected' : undefined} onClick={() => props.onSelectProduct(product)}>
                      <td className="table-selection-cell" onClick={(event) => event.stopPropagation()}>
                        <input type="checkbox" aria-label={`تحديد الصنف ${product.name}`} checked={props.selectedIds.includes(String(product.id))} onChange={(event) => toggleGroupSelection(group, event.target.checked)} />
                      </td>
                      <td>
                        <div>
                          <strong>{product.name}</strong>
                          <div className="muted small">وحدات: {(product.units || []).map((unit) => `${unit.name} × ${unit.multiplier || 1}`).join(' / ') || 'قطعة'}</div>
                        </div>
                      </td>
                      <td>{product.barcode || '—'}</td>
                      <td>{variantLabel(product)}</td>
                      <td>
                        <div style={{ lineHeight: 1.4 }}>
                          <div>{props.categoryNames[product.categoryId] || 'عام'}</div>
                          <div className="muted small" title="المورد">{props.supplierNames[product.supplierId] || 'بدون مورد'}</div>
                          <div className="muted small text-primary" title="أماكن التواجد">{activeLocationNames}</div>
                        </div>
                      </td>
                      <td>
                        <div style={{ lineHeight: 1.4, fontSize: '12px' }}>
                          <div className="muted">شراء: {formatCurrency(product.costPrice)}</div>
                          <div>بيع: <strong>{formatCurrency(product.retailPrice)}</strong></div>
                          {product.wholesalePrice > 0 ? <div className="muted">جملة: {formatCurrency(product.wholesalePrice)}</div> : null}
                        </div>
                      </td>
                      <td><span className={product.stock <= product.minStock ? 'low-stock-badge' : 'status-badge status-posted'}>{product.stock}</span></td>
                      <td>{product.notes || '—'}</td>
                      <td>
                        <div className="actions products-row-actions" onClick={(event) => event.stopPropagation()} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                          <Button variant="secondary" type="button" onClick={() => props.onSelectProduct(product)}>تعديل</Button>
                          <Button variant="secondary" type="button" onClick={() => props.onOpenOfferDialog(product)}>عروض</Button>
                          <Button variant="secondary" type="button" onClick={() => props.onOpenBarcodeDialog(product, 'scan')}>+باركود</Button>
                          <Button variant="secondary" type="button" onClick={() => props.onOpenBarcodeDialog(product, 'generate')}>توليد</Button>
                          <Button variant="secondary" type="button" onClick={() => props.onOpenPrintDialog(product)} disabled={!props.canPrint}>ملصقات</Button>
                          <Button variant="danger" type="button" onClick={() => props.onDeleteProduct(product)} disabled={!props.canDelete}>حذف</Button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                const groupActiveLocationIds = Array.from(new Set(group.children.flatMap(p => p.activeLocationIds || [])));
                const groupActiveLocationNames = getProductLocationDisplayName(
                  { ...group.representative, activeLocationIds: groupActiveLocationIds },
                  props.locationNames
                );

                return (
                  <Fragment key={group.key}>
                    <tr key={group.key} className="products-group-row">
                      <td className="table-selection-cell">
                        <input
                          type="checkbox"
                          aria-label={`تحديد المجموعة ${baseName}`}
                          checked={allSelected}
                          ref={(node) => { if (node) node.indeterminate = someSelected; }}
                          onChange={(event) => toggleGroupSelection(group, event.target.checked)}
                        />
                      </td>
                      <td>
                        <div className="page-stack" style={{ gap: 6 }}>
                          <div className="actions compact-actions" style={{ justifyContent: 'space-between' }}>
                            <strong>{baseName}</strong>
                            <Button type="button" variant="secondary" onClick={() => toggleExpand(group.key)}>{isExpanded ? 'إخفاء الفرعيات' : 'عرض الفرعيات'}</Button>
                          </div>
                          <div className="muted small">{group.children.length} أصناف فرعية{group.representative.styleCode ? ` • كود ${group.representative.styleCode}` : ''}</div>
                        </div>
                      </td>
                      <td>—</td>
                      <td>{group.children.map((entry) => variantLabel(entry)).join(' ، ')}</td>
                      <td>
                        <div style={{ lineHeight: 1.4 }}>
                          <div>{props.categoryNames[group.representative.categoryId] || 'عام'}</div>
                          <div className="muted small" title="المورد">{props.supplierNames[group.representative.supplierId] || 'بدون مورد'}</div>
                          <div className="muted small text-primary" title="أماكن التواجد">{groupActiveLocationNames}</div>
                        </div>
                      </td>
                      <td>
                        <div style={{ lineHeight: 1.4, fontSize: '12px' }}>
                          <div className="muted">شراء: {formatCurrency(group.representative.costPrice)}</div>
                          <div>بيع: <strong>{formatCurrency(group.representative.retailPrice)}</strong></div>
                          {group.representative.wholesalePrice > 0 ? <div className="muted">جملة: {formatCurrency(group.representative.wholesalePrice)}</div> : null}
                        </div>
                      </td>
                      <td><span className={totalStock <= Number(group.representative.minStock || 0) ? 'low-stock-badge' : 'status-badge status-posted'}>{totalStock}</span></td>
                      <td>{group.representative.notes || '—'}</td>
                      <td>
                        <div className="actions products-row-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                          <Button variant="secondary" type="button" onClick={() => props.onSelectProduct(group.representative)}>تعديل</Button>
                          <Button variant="secondary" type="button" onClick={() => props.onOpenOfferDialog(group.representative)}>عروض</Button>
                          <Button variant="secondary" type="button" onClick={() => props.onOpenBarcodeDialog(group.representative, 'scan')}>+باركود</Button>
                          <Button variant="secondary" type="button" onClick={() => props.onOpenBarcodeDialog(group.representative, 'generate')}>توليد</Button>
                          <Button variant="secondary" type="button" onClick={() => props.onOpenPrintDialog(group.representative)} disabled={!props.canPrint}>ملصقات</Button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && group.grouped && group.representative.styleCode && group.representative.itemKind === 'fashion' ? (
                      <tr className="products-matrix-row">
                        <td colSpan={9} style={{ padding: 0 }}>
                          <ProductsMatrixView products={group.children} />
                        </td>
                      </tr>
                    ) : null}
                    {isExpanded ? group.children.map((product) => (
                      <tr key={`child-${product.id}`} className={`products-group-child-row ${props.selectedProduct?.id === product.id ? 'table-row-selected' : ''}`} onClick={() => props.onSelectProduct(product)}>
                        <td className="table-selection-cell" onClick={(event) => event.stopPropagation()}>
                          <input type="checkbox" aria-label={`تحديد الصنف ${product.name}`} checked={props.selectedIds.includes(String(product.id))} onChange={(event) => {
                            const next = new Set(props.selectedIds);
                            if (event.target.checked) next.add(String(product.id));
                            else next.delete(String(product.id));
                            props.onSelectedIdsChange(Array.from(next));
                          }} />
                        </td>
                        <td>
                          <div style={{ paddingInlineStart: 18 }}>
                            <strong>{variantLabel(product)}</strong>
                            <div className="muted small">{product.name}</div>
                          </div>
                        </td>
                        <td>{product.barcode || '—'}</td>
                        <td>{variantLabel(product)}</td>
                        <td>
                          <div style={{ lineHeight: 1.4 }}>
                            <div>{props.categoryNames[product.categoryId] || 'عام'}</div>
                            <div className="muted small" title="المورد">{props.supplierNames[product.supplierId] || 'بدون مورد'}</div>
                            <div className="muted small text-primary" title="أماكن التواجد">{getProductLocationDisplayName(product, props.locationNames)}</div>
                          </div>
                        </td>
                        <td>
                          <div style={{ lineHeight: 1.4, fontSize: '12px' }}>
                            <div className="muted">شراء: {formatCurrency(product.costPrice)}</div>
                            <div>بيع: <strong>{formatCurrency(product.retailPrice)}</strong></div>
                            {product.wholesalePrice > 0 ? <div className="muted">جملة: {formatCurrency(product.wholesalePrice)}</div> : null}
                          </div>
                        </td>
                        <td><span className={product.stock <= product.minStock ? 'low-stock-badge' : 'status-badge status-posted'}>{product.stock}</span></td>
                        <td>{product.notes || '—'}</td>
                        <td>
                          <div className="actions products-row-actions" onClick={(event) => event.stopPropagation()} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                            <Button variant="secondary" type="button" onClick={() => props.onSelectProduct(product)}>تعديل</Button>
                            <Button variant="secondary" type="button" onClick={() => props.onOpenBarcodeDialog(product, 'scan')}>+باركود</Button>
                            <Button variant="danger" type="button" onClick={() => props.onDeleteProduct(product)} disabled={!props.canDelete}>حذف</Button>
                          </div>
                        </td>
                      </tr>
                    )) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <PaginationControls
          page={props.page}
          totalPages={totalPages}
          pageSize={props.pageSize}
          totalItems={props.totalItems}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onPageChange={props.onPageChange}
          onPageSizeChange={props.onPageSizeChange}
          itemLabel="صنف"
        />
      </QueryFeedback>
    </FormSection>
  );
}
