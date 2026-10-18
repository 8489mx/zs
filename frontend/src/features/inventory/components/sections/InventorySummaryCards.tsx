import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { Button } from '@/shared/ui/button';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { CustomSelect } from '@/shared/ui/custom-select';
import { formatCurrency } from '@/lib/format';
import { InventoryStatusFilterField } from '@/features/inventory/components/InventoryStatusFilter';
import { InventoryTable } from '@/features/inventory/components/InventoryTable';
import type { InventoryStatusFilter } from '@/features/inventory/utils/inventory-mappers';
import type { Product } from '@/types/domain';
import { StockMovementRegister } from '@/features/inventory/components/StockMovementRegister';

export function InventoryOverviewStats({
  total,
  outOfStock,
  lowStock,
  inventoryValue
}: {
  total: number;
  outOfStock: number;
  lowStock: number;
  inventoryValue: number | null;
}) {
  const { t } = useTranslation();
  return (
    <div className="stats-grid compact-grid workspace-stats-grid inventory-overview-grid inventory-overview-grid--compact">
      <div className="stat-card inventory-overview-card"><span>{t('inventory.sections.inventory_summary_cards.s0', "إجمالي الأصناف")}</span><strong>{total}</strong></div>
      <div className="stat-card inventory-overview-card is-danger"><span>{t('inventory.sections.inventory_summary_cards.s1', "نافد المخزون")}</span><strong>{outOfStock}</strong></div>
      <div className="stat-card inventory-overview-card is-warning"><span>{t('inventory.sections.inventory_summary_cards.s2', "منخفض المخزون")}</span><strong>{lowStock}</strong></div>
      <div className="stat-card inventory-overview-card"><span>{t('inventory.sections.inventory_summary_cards.s3', "قيمة المخزون")}</span><strong>{inventoryValue === null ? t('inventory.sections.inventory_summary_cards.s4', "بحسب الصلاحية") : formatCurrency(inventoryValue)}</strong></div>
    </div>
  );
}

export function InventoryMovementCard() {
  const { t } = useTranslation();
  return (
    <section className="document-prototype-section">
      <div className="section-header-compact-row">
        <h3 className="document-prototype-section-title">{t('inventory.sections.inventory_summary_cards.s5', "سجل حركات المخزون")}</h3>
      </div>
      <p className="muted small section-header-subtitle">
        {t('inventory.sections.inventory_summary_cards.s6', "كل زيادة أو خصم أو تالف أو نتيجة جرد في مسار واحد قابل للتصفية والمراجعة.")}
      </p>
      <StockMovementRegister />
    </section>
  );
}

export function InventoryStatusCard({
  statusFilter,
  onStatusFilterChange,
  locationFilter = '',
  onLocationFilterChange,
  categoryFilter = '',
  onCategoryFilterChange,
  supplierFilter = '',
  onSupplierFilterChange,
  locations = [],
  categories = [],
  suppliers = [],
  search,
  onSearchChange,
  onReset,
  rows,
  isLoading,
  isError,
  error,
  includeSensitivePricing = true,
  selectedProductId = '',
  onProductSelect,
}: {
  statusFilter: InventoryStatusFilter;
  onStatusFilterChange: (value: InventoryStatusFilter) => void;
  locationFilter?: string;
  onLocationFilterChange?: (value: string) => void;
  categoryFilter?: string;
  onCategoryFilterChange?: (value: string) => void;
  supplierFilter?: string;
  onSupplierFilterChange?: (value: string) => void;
  locations?: Array<{ id: number | string; name: string }>;
  categories?: Array<{ id: number | string; name: string }>;
  suppliers?: Array<{ id: number | string; name: string }>;
  search: string;
  onSearchChange: (value: string) => void;
  onReset: () => void;
  rows: Product[];
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  includeSensitivePricing?: boolean;
  selectedProductId?: string;
  onProductSelect?: (product: Product) => void;
}) {
  const { t } = useTranslation();
  const locationOptions = useMemo(() => [
    { value: '', label: 'كل المخازن' },
    ...locations.map((loc) => ({ value: String(loc.id), label: loc.name })),
  ], [locations]);

  const categoryOptions = useMemo(() => [
    { value: '', label: 'كل الأقسام' },
    ...categories.map((cat) => ({ value: String(cat.id), label: cat.name })),
  ], [categories]);

  const supplierOptions = useMemo(() => [
    { value: '', label: 'كل الموردين' },
    ...suppliers.map((sup) => ({ value: String(sup.id), label: sup.name })),
  ], [suppliers]);

  return (
    <section className="document-prototype-section">
      <div className="section-header-compact-row">
        <h3 className="document-prototype-section-title">{t('inventory.sections.inventory_summary_cards.s7', "متابعة حالة الأصناف")}</h3>
      </div>
      <p className="muted small section-header-subtitle">
        {t('inventory.sections.inventory_summary_cards.s8', "ابدأ هنا: فلتر سريع ثم راجع الجدول واضغط على الصنف المطلوب لفتح تسوية سريعة مباشرة.")}
      </p>
      <div className="filter-chip-row">
        <Button type="button" variant={statusFilter === 'all' ? 'primary' : 'secondary'} onClick={() => onStatusFilterChange('all')}>{t('inventory.sections.inventory_summary_cards.s9', "الكل")}</Button>
        <Button type="button" variant={statusFilter === 'healthy' ? 'primary' : 'secondary'} onClick={() => onStatusFilterChange('healthy')}>{t('inventory.sections.inventory_summary_cards.s10', "سليم")}</Button>
        <Button type="button" variant={statusFilter === 'low' ? 'primary' : 'secondary'} onClick={() => onStatusFilterChange('low')}>{t('inventory.sections.inventory_summary_cards.s11', "منخفض")}</Button>
        <Button type="button" variant={statusFilter === 'out' ? 'primary' : 'secondary'} onClick={() => onStatusFilterChange('out')}>{t('inventory.sections.inventory_summary_cards.s12', "نافد")}</Button>
      </div>
      <SearchToolbar
        search={search}
        onSearchChange={onSearchChange}
        searchPlaceholder={t('inventory.sections.inventory_summary_cards.s13', "ابحث باسم الصنف أو الباركود أو كود المجموعة...")}
        title={t('inventory.sections.inventory_summary_cards.s14', "بحث وتصفية")}
        actions={<span className="nav-pill">{statusFilter === 'all' ? t('inventory.sections.inventory_summary_cards.s15', "كل الحالات") : statusFilter === 'healthy' ? t('inventory.sections.inventory_summary_cards.s16', "سليم") : statusFilter === 'low' ? t('inventory.sections.inventory_summary_cards.s17', "منخفض") : t('inventory.sections.inventory_summary_cards.s18', "نافد")}</span>}
        onReset={onReset}
        resetLabel={t('inventory.sections.inventory_summary_cards.s19', "تفريغ")}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end', width: '100%' }}>
          {onLocationFilterChange && (
            <div style={{ minWidth: '130px', flex: 1 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('inventory.sections.inventory_summary_cards.s20', "المخزن")}</span>
              <CustomSelect
                value={locationFilter}
                onChange={onLocationFilterChange}
                options={locationOptions}
                placeholder={t('inventory.sections.inventory_summary_cards.s21', "كل المخازن")}
              />
            </div>
          )}
          {onCategoryFilterChange && (
            <div style={{ minWidth: '130px', flex: 1 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('inventory.sections.inventory_summary_cards.s22', "القسم")}</span>
              <CustomSelect
                value={categoryFilter}
                onChange={onCategoryFilterChange}
                options={categoryOptions}
                placeholder={t('inventory.sections.inventory_summary_cards.s23', "كل الأقسام")}
              />
            </div>
          )}
          {onSupplierFilterChange && (
            <div style={{ minWidth: '130px', flex: 1 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('inventory.sections.inventory_summary_cards.s24', "المورد")}</span>
              <CustomSelect
                value={supplierFilter}
                onChange={onSupplierFilterChange}
                options={supplierOptions}
                placeholder={t('inventory.sections.inventory_summary_cards.s25', "كل الموردين")}
              />
            </div>
          )}
          <div style={{ minWidth: '110px', flex: 1 }}>
            <InventoryStatusFilterField value={statusFilter} onChange={onStatusFilterChange} />
          </div>
        </div>
      </SearchToolbar>
      <QueryFeedback
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!rows.length}
        loadingText={t('inventory.sections.inventory_summary_cards.s26', "جاري تحميل بيانات المخزون...")}
        emptyTitle={t('inventory.sections.inventory_summary_cards.s27', "لا توجد أصناف مطابقة")}
        emptyHint={t('inventory.sections.inventory_summary_cards.s28', "جرّب تغيير البحث أو الفلتر الحالي، أو أضف أصنافًا جديدة من صفحة المنتجات.")}
      >
        <InventoryTable rows={rows.slice(0, 60)} includeSensitivePricing={includeSensitivePricing} selectedProductId={selectedProductId} onProductSelect={onProductSelect} />
      </QueryFeedback>
    </section>
  );
}
