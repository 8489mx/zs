import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SearchToolbar } from '@/components/shared/SearchToolbar';
import { QueryFeedback } from '@/components/shared/QueryFeedback';
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
  return (
    <div className="stats-grid compact-grid workspace-stats-grid inventory-overview-grid">
      <div className="stat-card inventory-overview-card"><span>إجمالي الأصناف</span><strong>{total}</strong></div>
      <div className="stat-card inventory-overview-card is-danger"><span>نافد المخزون</span><strong>{outOfStock}</strong></div>
      <div className="stat-card inventory-overview-card is-warning"><span>منخفض المخزون</span><strong>{lowStock}</strong></div>
      <div className="stat-card inventory-overview-card"><span>قيمة المخزون</span><strong>{inventoryValue === null ? 'بحسب الصلاحية' : formatCurrency(inventoryValue)}</strong></div>
    </div>
  );
}

export function InventoryMovementCard() {
  return (
    <Card title="سجل حركات المخزون" description="كل زيادة أو خصم أو تالف أو نتيجة جرد في مسار واحد قابل للتصفية والمراجعة." actions={<span className="nav-pill">سجل الحركات</span>}>
      <StockMovementRegister />
    </Card>
  );
}

export function InventoryStatusCard({
  statusFilter,
  onStatusFilterChange,
  search,
  onSearchChange,
  onReset,
  rows,
  isLoading,
  isError,
  error,
  includeSensitivePricing = true
}: {
  statusFilter: InventoryStatusFilter;
  onStatusFilterChange: (value: InventoryStatusFilter) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onReset: () => void;
  rows: Product[];
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  includeSensitivePricing?: boolean;
}) {
  return (
    <Card title="متابعة حالة الأصناف" description="فلترة سريعة ومراجعة مريحة للأصناف مع الحفاظ على واجهة موحدة بصريًا بين البحث والجداول والعمليات التشغيلية." actions={<span className="nav-pill">حالة الأصناف</span>}>
      <div className="filter-chip-row">
        <Button type="button" variant={statusFilter === 'all' ? 'primary' : 'secondary'} onClick={() => onStatusFilterChange('all')}>الكل</Button>
        <Button type="button" variant={statusFilter === 'healthy' ? 'primary' : 'secondary'} onClick={() => onStatusFilterChange('healthy')}>سليم</Button>
        <Button type="button" variant={statusFilter === 'low' ? 'primary' : 'secondary'} onClick={() => onStatusFilterChange('low')}>منخفض</Button>
        <Button type="button" variant={statusFilter === 'out' ? 'primary' : 'secondary'} onClick={() => onStatusFilterChange('out')}>نافد</Button>
      </div>
      <SearchToolbar search={search} onSearchChange={onSearchChange} searchPlaceholder="ابحث باسم الصنف أو الباركود">
        <InventoryStatusFilterField value={statusFilter} onChange={onStatusFilterChange} />
        <div className="actions compact-actions align-end-inline">
          <Button type="button" variant="secondary" onClick={onReset}>إلغاء الفلاتر</Button>
        </div>
      </SearchToolbar>
      <QueryFeedback
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!rows.length}
        loadingText="جاري تحميل بيانات المخزون..."
        emptyTitle="لا توجد أصناف مطابقة"
        emptyHint="جرّب تغيير البحث أو الفلتر الحالي، أو أضف أصنافًا جديدة من صفحة المنتجات."
      >
        <InventoryTable rows={rows.slice(0, 60)} includeSensitivePricing={includeSensitivePricing} />
      </QueryFeedback>
    </Card>
  );
}
