import { Fragment, useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { FileTextIcon, SearchIcon } from '@/shared/components/icons/AppIcons';
import { DialogShell } from '@/shared/components/dialog-shell';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { PaginationControls } from '@/shared/components/pagination-controls';
import { formatCurrency } from '@/lib/format';
import type { Product } from '@/types/domain';
import { productsApi } from '@/features/products/api/products.api';
import { guessProductIcon } from '@/features/products/lib/product-smart-matcher';
import { invalidateCatalogDomain } from '@/app/query-invalidation';

import { getProductLocationDisplayName } from '../utils/product-location.utils';
import { ProductsMatrixView } from './ProductsMatrixView';
import { ProductIcon } from '@/shared/components/icons/product-svg-catalog';
import { ProductIconStudioModal } from '@/shared/components/icons/ProductIconStudioModal';
import { useProductIconSettings } from '@/shared/components/icons/product-icon-theme';

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
  onOpenSerialsDialog?: (product: Product) => void;
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
  mobileStoreEnabled?: boolean;
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
  const queryClient = useQueryClient();
  const iconSettings = useProductIconSettings();
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [activeNoteModal, setActiveNoteModal] = useState<{ productName: string; note: string } | null>(null);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [autoAssignMsg, setAutoAssignMsg] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const filteredProducts = useMemo(() => {
    if (!selectedCategoryId) return props.visibleProducts;
    return props.visibleProducts.filter((p) => String(p.categoryId || '') === selectedCategoryId);
  }, [props.visibleProducts, selectedCategoryId]);

  const groupedRows = useMemo(() => groupProducts(filteredProducts), [filteredProducts]);
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

  async function handleAutoAssignIcons() {
    try {
      setIsAutoAssigning(true);
      setAutoAssignMsg(null);

      // Fetch all products across entire catalog
      const { products } = await productsApi.listAll();
      const updates: Array<{ id: number; icon: string }> = [];

      for (const p of products) {
        const catName = p.categoryId ? props.categoryNames[String(p.categoryId)] : undefined;
        const guessed = guessProductIcon(p.name, catName);
        if (guessed && (!p.icon || p.icon !== guessed)) {
          updates.push({ id: Number(p.id), icon: guessed });
        }
      }

      if (updates.length === 0) {
        setAutoAssignMsg({
          type: 'info',
          text: 'تم الفحص الذكي: جميع الأصناف مضبوطة ولديها أيقونات متطابقة بالفعل.'
        });
        return;
      }

      const res = await productsApi.bulkUpdateIcons(updates);
      await invalidateCatalogDomain(queryClient, { includeProducts: true });
      setAutoAssignMsg({
        type: 'success',
        text: `تم بنجاح ضبط وتعيين الأيقونات لعدد (${res.updated || updates.length}) صنف تلقائياً!`
      });
    } catch {
      setAutoAssignMsg({
        type: 'error',
        text: 'حدث خطأ أثناء ضبط الأيقونات، يرجى إعادة المحاولة.'
      });
    } finally {
      setIsAutoAssigning(false);
    }
  }

  async function handleClearAllIcons() {
    try {
      setIsAutoAssigning(true);
      setAutoAssignMsg(null);

      const { products } = await productsApi.listAll();
      const updates = products
        .filter((p) => Boolean(p.icon))
        .map((p) => ({ id: Number(p.id), icon: '' }));

      if (updates.length === 0) {
        setAutoAssignMsg({
          type: 'info',
          text: 'جميع الأصناف في النظام خالية من الأيقونات بالفعل.'
        });
        return;
      }

      await productsApi.bulkUpdateIcons(updates);
      await invalidateCatalogDomain(queryClient, { includeProducts: true });
      setAutoAssignMsg({
        type: 'success',
        text: `تم بنجاح إزالة وتفريغ الأيقونات لعدد (${updates.length}) صنف، والعودة للحالة بدون أيقونات!`
      });
    } catch {
      setAutoAssignMsg({
        type: 'error',
        text: 'حدث خطأ أثناء تفريغ الأيقونات، يرجى إعادة المحاولة.'
      });
    } finally {
      setIsAutoAssigning(false);
    }
  }

  return (
    <FormSection 
      title="قائمة الأصناف الحالية" 
      description="إدارة وتسعير ومتابعة مخزون المنتجات والأصناف." 
      actions={
        <div className="actions compact-actions">
          <span className="nav-pill">قيمة البيع {formatCurrency(props.inventorySaleValue)}</span>
          <Button
            variant="secondary"
            onClick={() => setIsStudioOpen(true)}
            style={{
              background: '#f8fafc',
              color: '#0f172a',
              borderColor: '#cbd5e1',
              fontWeight: 700,
              fontSize: '12px',
            }}
            title="تخصيص ألوان الأيقونات لكل المنظومة أو إلغاء وتفريغ الأيقونات"
          >
            تخصيص الأيقونات
          </Button>
          <Button
            variant="secondary"
            onClick={() => void handleAutoAssignIcons()}
            disabled={isAutoAssigning}
            style={{
              background: '#eff6ff',
              color: '#1d4ed8',
              borderColor: '#bfdbfe',
              fontWeight: 700,
              fontSize: '12px',
            }}
            title="فحص أسماء الأصناف وتعيين الأيقونات المناسبة لها تلقائياً"
          >
            {isAutoAssigning ? 'جارٍ الضبط الذكي...' : 'ضبط الأيقونات ذكياً'}
          </Button>
          <Button variant="secondary" onClick={props.onExportCsv}>تصدير Excel</Button>
          <Button variant="secondary" onClick={props.onPrint} disabled={!props.canPrint}>طباعة</Button>
        </div>
      } 
      className="workspace-panel"
    >
      {autoAssignMsg && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
            fontWeight: 600,
            background: autoAssignMsg.type === 'success' ? '#f0fdf4' : autoAssignMsg.type === 'info' ? '#eff6ff' : '#fef2f2',
            color: autoAssignMsg.type === 'success' ? '#15803d' : autoAssignMsg.type === 'info' ? '#1d4ed8' : '#b91c1c',
            border: `1px solid ${autoAssignMsg.type === 'success' ? '#bbf7d0' : autoAssignMsg.type === 'info' ? '#bfdbfe' : '#fecaca'}`,
          }}
        >
          <span>{autoAssignMsg.text}</span>
          <button
            type="button"
            onClick={() => setAutoAssignMsg(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              color: 'inherit',
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>
      )}
      <div className="products-table-toolbar" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 320px' }}>
            <input
              type="text"
              value={props.search}
              onChange={(e) => props.onSearchChange(e.target.value)}
              placeholder="ابحث بالاسم أو الباركود أو القسم أو المورد أو الخاصية الفرعية..."
              className="purchase-prototype-field-input"
              style={{
                width: '100%',
                height: '38px',
                paddingInlineStart: '36px',
                paddingInlineEnd: props.search ? '32px' : '12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', insetInlineStart: '10px', color: '#94a3b8', display: 'flex', pointerEvents: 'none' }}>
              <SearchIcon size={16} />
            </div>
            {props.search && (
              <button
                type="button"
                onClick={() => props.onSearchChange('')}
                style={{
                  position: 'absolute',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  insetInlineEnd: '10px',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                  padding: 0,
                }}
                title="مسح البحث"
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="purchase-prototype-field-input"
              style={{
                height: '38px',
                minWidth: '180px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                fontWeight: 600,
                fontSize: '12.5px',
                color: '#1e293b',
                boxSizing: 'border-box',
              }}
            >
              <option value="">كل الأقسام ({Object.keys(props.categoryNames).length})</option>
              {Object.entries(props.categoryNames).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
            {selectedCategoryId && (
              <Button
                variant="secondary"
                onClick={() => setSelectedCategoryId('')}
                style={{ height: '38px', padding: '0 10px', fontSize: '12px' }}
                title="إلغاء تصفية القسم"
              >
                ✕ إلغاء
              </Button>
            )}
          </div>
        </div>

        <div className="filter-chip-row toolbar-chip-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <Button variant={props.viewFilter === 'all' ? 'primary' : 'secondary'} onClick={() => props.onViewFilterChange('all')}>الكل</Button>
          <Button variant={props.viewFilter === 'low' ? 'primary' : 'secondary'} onClick={() => props.onViewFilterChange('low')}>منخفضة</Button>
          <Button variant={props.viewFilter === 'out' ? 'primary' : 'secondary'} onClick={() => props.onViewFilterChange('out')}>نافدة</Button>
          <Button variant={props.viewFilter === 'offers' ? 'primary' : 'secondary'} onClick={() => props.onViewFilterChange('offers')}>بعروض</Button>
          <Button variant={props.viewFilter === 'special' ? 'primary' : 'secondary'} onClick={() => props.onViewFilterChange('special')}>أسعار خاصة</Button>
        </div>
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
                <th style={{ width: '80px', textAlign: 'center' }}>ملاحظات</th>
                <th style={{ textAlign: 'center' }}>إجراءات</th>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {iconSettings.showIcons ? (
                            <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              background: '#f8fafc',
                              color: 'var(--product-icon-color, #2563eb)',
                              border: '1px solid #e2e8f0',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <ProductIcon name={product.icon || 'box-package'} size={16} />
                            </div>
                          ) : null}
                          <div>
                            <strong>{product.name}</strong>
                            <div className="muted small">{(product.units || []).map((unit) => `${unit.name} × ${unit.multiplier || 1}`).join(' / ') || 'قطعة'}</div>
                          </div>
                        </div>
                      </td>
                      <td>{product.barcode || '—'}</td>
                      <td>{variantLabel(product)}</td>
                      <td>
                        <div style={{ lineHeight: 1.4 }}>
                          <div>{props.categoryNames[product.categoryId] || 'عام'}</div>
                          {activeLocationNames ? <div className="muted small">{activeLocationNames}</div> : null}
                          {props.supplierNames[product.supplierId] ? <div className="muted small">{props.supplierNames[product.supplierId]}</div> : null}
                        </div>
                      </td>
                      <td>
                        <div style={{ lineHeight: 1.4 }}>
                          <div>بيع: <strong>{formatCurrency(product.retailPrice)}</strong></div>
                          <div className="muted small">شراء: {formatCurrency(product.costPrice)}</div>
                          {product.wholesalePrice > 0 ? <div className="muted small">جملة: {formatCurrency(product.wholesalePrice)}</div> : null}
                        </div>
                      </td>
                      <td>
                        <span className={product.stock <= product.minStock ? 'low-stock-badge' : 'status-badge status-posted'}>
                          {product.stock}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap', width: '80px' }}>
                        {product.notes ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveNoteModal({ productName: product.name, note: product.notes! });
                            }}
                            title={product.notes}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              cursor: 'pointer',
                            }}
                          >
                            <span><FileTextIcon size={12} style={{ marginInlineEnd: '4px' }} />ملاحظة</span>
                          </button>
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>—</span>
                        )}
                      </td>
                      <td>
                        <div className="actions compact-actions" onClick={(event) => event.stopPropagation()} style={{ flexWrap: 'nowrap', justifyContent: 'center' }}>
                          <Button variant="secondary" type="button" onClick={() => props.onSelectProduct(product)}>تعديل</Button>
                          <Button variant="secondary" type="button" onClick={() => props.onOpenBarcodeDialog(product, 'scan')}>باركود</Button>
                          <Button variant="secondary" type="button" onClick={() => props.onOpenOfferDialog(product)}>عروض</Button>
                          {props.mobileStoreEnabled && product.trackSerials && props.onOpenSerialsDialog ? (
                            <Button variant="secondary" type="button" onClick={() => props.onOpenSerialsDialog?.(product)}>سيريالات</Button>
                          ) : null}
                          <Button variant="secondary" type="button" onClick={() => props.onDeleteProduct(product)} disabled={!props.canDelete} style={{ color: '#dc2626' }}>حذف</Button>
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
                        <div
                          onClick={() => toggleExpand(group.key)}
                          style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                          title={isExpanded ? 'طي الأصناف الفرعية' : 'توسيع الأصناف الفرعية'}
                        >
                          {iconSettings.showIcons ? (
                            <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              background: '#f8fafc',
                              color: 'var(--product-icon-color, #2563eb)',
                              border: '1px solid #e2e8f0',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <ProductIcon name={group.representative.icon || 'box-package'} size={16} />
                            </div>
                          ) : null}
                          <div>
                            <strong style={{ color: '#0f172a', fontSize: '0.88rem' }}>{baseName}</strong>
                            <div className="muted small" style={{ fontSize: '0.74rem', marginTop: '2px', color: '#64748b' }}>
                              {group.children.length} فرعيات{group.representative.styleCode ? ` • كود ${group.representative.styleCode}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>—</td>
                      <td style={{ maxWidth: '200px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '52px', overflow: 'hidden' }}>
                          {group.children.slice(0, 2).map((entry) => (
                            <span
                              key={entry.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                background: '#f1f5f9',
                                color: '#334155',
                                border: '1px solid #e2e8f0',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {variantLabel(entry)}
                            </span>
                          ))}
                          {group.children.length > 2 ? (
                            <button
                              type="button"
                              onClick={() => toggleExpand(group.key)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: isExpanded ? '#dbeafe' : '#eff6ff',
                                color: '#1e40af',
                                border: '1px solid #bfdbfe',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                              }}
                              title={isExpanded ? 'إخفاء الفرعيات' : 'عرض باقي الفرعيات'}
                            >
                              +{group.children.length - 2} فرعي {isExpanded ? '▲' : '▼'}
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <div style={{ lineHeight: 1.4 }}>
                          <div>{props.categoryNames[group.representative.categoryId] || 'عام'}</div>
                          {groupActiveLocationNames ? <div className="muted small">{groupActiveLocationNames}</div> : null}
                          {props.supplierNames[group.representative.supplierId] ? <div className="muted small">{props.supplierNames[group.representative.supplierId]}</div> : null}
                        </div>
                      </td>
                      <td>
                        <div style={{ lineHeight: 1.4 }}>
                          <div>بيع: <strong>{formatCurrency(group.representative.retailPrice)}</strong></div>
                          <div className="muted small">شراء: {formatCurrency(group.representative.costPrice)}</div>
                          {group.representative.wholesalePrice > 0 ? <div className="muted small">جملة: {formatCurrency(group.representative.wholesalePrice)}</div> : null}
                        </div>
                      </td>
                      <td>
                        <span className={totalStock <= Number(group.representative.minStock || 0) ? 'low-stock-badge' : 'status-badge status-posted'}>
                          {totalStock}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap', width: '80px' }}>
                        {group.representative.notes ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveNoteModal({ productName: baseName, note: group.representative.notes! });
                            }}
                            title={group.representative.notes}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              cursor: 'pointer',
                            }}
                          >
                            <span><FileTextIcon size={12} style={{ marginInlineEnd: '4px' }} />ملاحظة</span>
                          </button>
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>—</span>
                        )}
                      </td>
                      <td>
                        <div className="actions compact-actions" onClick={(event) => event.stopPropagation()} style={{ flexWrap: 'nowrap', justifyContent: 'center' }}>
                          <Button variant="secondary" type="button" onClick={() => props.onSelectProduct(group.representative)}>تعديل</Button>
                          <Button variant="secondary" type="button" onClick={() => props.onOpenBarcodeDialog(group.representative, 'scan')}>باركود</Button>
                          <Button variant="secondary" type="button" onClick={() => props.onOpenOfferDialog(group.representative)}>عروض</Button>
                          <Button
                            variant="secondary"
                            type="button"
                            onClick={() => {
                              if (window.confirm(`هل أنت متأكد من حذف الموديل "${baseName}" وجميع أصنافه الفرعية بالكامل (${group.children.length} صنف فرعي)؟`)) {
                                for (const child of group.children) {
                                  props.onDeleteProduct(child);
                                }
                              }
                            }}
                            disabled={!props.canDelete}
                            style={{ color: '#dc2626' }}
                          >
                            حذف
                          </Button>
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
                            {getProductLocationDisplayName(product, props.locationNames) ? <div className="muted small">{getProductLocationDisplayName(product, props.locationNames)}</div> : null}
                            {props.supplierNames[product.supplierId] ? <div className="muted small">{props.supplierNames[product.supplierId]}</div> : null}
                          </div>
                        </td>
                        <td>
                          <div style={{ lineHeight: 1.4 }}>
                            <div>بيع: <strong>{formatCurrency(product.retailPrice)}</strong></div>
                            <div className="muted small">شراء: {formatCurrency(product.costPrice)}</div>
                            {product.wholesalePrice > 0 ? <div className="muted small">جملة: {formatCurrency(product.wholesalePrice)}</div> : null}
                          </div>
                        </td>
                        <td>
                          <span className={product.stock <= product.minStock ? 'low-stock-badge' : 'status-badge status-posted'}>
                            {product.stock}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap', width: '80px' }}>
                          {product.notes ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveNoteModal({ productName: `${baseName} (${variantLabel(product)})`, note: product.notes! });
                              }}
                              title={product.notes}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                border: '1px solid #bfdbfe',
                                cursor: 'pointer',
                              }}
                            >
                              <span><FileTextIcon size={12} style={{ marginInlineEnd: '4px' }} />ملاحظة</span>
                            </button>
                          ) : (
                            <span style={{ color: '#cbd5e1' }}>—</span>
                          )}
                        </td>
                        <td>
                          <div className="actions compact-actions" onClick={(event) => event.stopPropagation()} style={{ flexWrap: 'nowrap', justifyContent: 'center' }}>
                            <Button variant="secondary" type="button" onClick={() => props.onSelectProduct(product)}>تعديل</Button>
                            <Button variant="secondary" type="button" onClick={() => props.onOpenBarcodeDialog(product, 'scan')}>باركود</Button>
                            <Button variant="secondary" type="button" onClick={() => props.onDeleteProduct(product)} disabled={!props.canDelete} style={{ color: '#dc2626' }}>حذف</Button>
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

        {/* Product Note Modal */}
        {activeNoteModal && (
          <DialogShell
            open={Boolean(activeNoteModal)}
            onClose={() => setActiveNoteModal(null)}
            width="min(480px, 92vw)"
            ariaLabel="ملاحظات الصنف"
          >
            <div style={{ padding: '20px 24px' }} dir="rtl">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileTextIcon size={18} color="#2563eb" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>ملاحظات الصنف</h3>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>{activeNoteModal.productName}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveNoteModal(null)}
                  style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.9rem', fontWeight: 700 }}
                >
                  ✕
                </button>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 16px', fontSize: '0.9rem', lineHeight: 1.7, color: '#1e293b', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {activeNoteModal.note}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <Button variant="secondary" onClick={() => setActiveNoteModal(null)}>
                  إغلاق
                </Button>
              </div>
            </div>
          </DialogShell>
        )}

        <ProductIconStudioModal
          open={isStudioOpen}
          onClose={() => setIsStudioOpen(false)}
          onBulkAutoAssign={() => void handleAutoAssignIcons()}
          onBulkClearIcons={() => void handleClearAllIcons()}
          isBulkLoading={isAutoAssigning}
        />
      </QueryFeedback>
    </FormSection>
  );
}
