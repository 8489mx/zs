import { Card } from '@/shared/ui/card';
import { DataTable } from '@/shared/ui/data-table';
import { Button } from '@/shared/ui/button';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { formatCurrency } from '@/lib/format';
import type { Product } from '@/types/domain';

interface ProductsTableCardProps {
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
  inventorySaleValue: number;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (value: number) => void;
  onPageSizeChange: (value: number) => void;
}

export function ProductsTableCard(props: ProductsTableCardProps) {
  return (
    <Card title="قائمة الأصناف الحالية" description="العروض والباركود والملصقات أصبحت متاحة مباشرة من كل سطر داخل السجل." actions={<div className="actions compact-actions"><span className="nav-pill">قيمة البيع {formatCurrency(props.inventorySaleValue)}</span><Button variant="secondary" onClick={props.onExportCsv}>تصدير CSV</Button><Button variant="secondary" onClick={props.onPrint} disabled={!props.canPrint}>طباعة</Button></div>} className="workspace-panel">
      <SearchToolbar search={props.search} onSearchChange={props.onSearchChange} searchPlaceholder="ابحث بالاسم أو الباركود أو القسم أو المورد أو اللون أو المقاس أو اسم/باركود الوحدة" />
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
        <DataTable
          rows={props.visibleProducts}
          rowKey={(product) => String(product.id)}
          rowClassName={(product) => props.selectedProduct?.id === product.id ? 'table-row-selected' : ''}
          onRowClick={(product) => props.onSelectProduct(product)}
          rowTitle={() => 'انقر لفتح الصنف في بطاقة التعديل'}
          selection={{
            selectedKeys: props.selectedIds,
            onChange: props.onSelectedIdsChange,
            checkboxLabel: (product) => `تحديد الصنف ${product.name}`
          }}
          pagination={{
            page: props.page,
            pageSize: props.pageSize,
            totalItems: props.totalItems,
            onPageChange: props.onPageChange,
            onPageSizeChange: props.onPageSizeChange,
            itemLabel: 'صنف'
          }}
          columns={[
            {
              key: 'name',
              header: 'الصنف',
              cell: (product: Product) => (
                <div>
                  <strong>{product.name}</strong>
                  <div className="muted small">وحدات: {(product.units || []).map((unit) => `${unit.name} × ${unit.multiplier || 1}`).join(' / ') || 'قطعة'}</div>
                  {product.itemKind === 'fashion' ? <div className="muted small">ملابس{product.styleCode ? ` • موديل ${product.styleCode}` : ''}{product.color ? ` • ${product.color}` : ''}{product.size ? ` • ${product.size}` : ''}</div> : null}
                  {(product.offers || []).length ? <div className="muted small">عروض: {(product.offers || []).length}</div> : null}
                  {(product.customerPrices || []).length ? <div className="muted small">أسعار خاصة: {(product.customerPrices || []).length}</div> : null}
                </div>
              )
            },
            { key: 'barcode', header: 'الباركود', cell: (product: Product) => product.barcode || '—' },
            { key: 'variant', header: 'اللون / المقاس', cell: (product: Product) => product.itemKind === 'fashion' ? `${product.color || '—'} / ${product.size || '—'}` : '—' },
            { key: 'category', header: 'القسم', cell: (product: Product) => props.categoryNames[product.categoryId] || '—' },
            { key: 'supplier', header: 'المورد', cell: (product: Product) => props.supplierNames[product.supplierId] || '—' },
            { key: 'cost', header: 'الشراء', cell: (product: Product) => formatCurrency(product.costPrice) },
            { key: 'retail', header: 'القطاعي', cell: (product: Product) => formatCurrency(product.retailPrice) },
            { key: 'wholesale', header: 'الجملة', cell: (product: Product) => formatCurrency(product.wholesalePrice) },
            { key: 'stock', header: 'المخزون', cell: (product: Product) => <span className={product.stock <= product.minStock ? 'low-stock-badge' : 'status-badge status-posted'}>{product.stock}</span> },
            { key: 'notes', header: 'ملاحظات', cell: (product: Product) => product.notes || '—' },
            {
              key: 'actions',
              header: 'إجراءات',
              cell: (product: Product) => (
                <div className="actions products-row-actions" onClick={(event) => event.stopPropagation()}>
                  <Button variant="secondary" type="button" onClick={() => props.onSelectProduct(product)}>تعديل</Button>
                  <Button variant="secondary" type="button" onClick={() => props.onOpenOfferDialog(product)}>عرض</Button>
                  <Button variant="secondary" type="button" onClick={() => props.onOpenBarcodeDialog(product, 'scan')}>إضافة باركود</Button>
                  <Button variant="secondary" type="button" onClick={() => props.onOpenBarcodeDialog(product, 'generate')}>توليد باركود</Button>
                  <Button variant="secondary" type="button" onClick={() => props.onOpenPrintDialog(product)} disabled={!props.canPrint}>ملصقات</Button>
                  <Button variant="danger" type="button" onClick={() => props.onDeleteProduct(product)} disabled={!props.canDelete}>حذف</Button>
                </div>
              )
            }
          ]}
        />
      </QueryFeedback>
    </Card>
  );
}
