import type { InventoryStatusFilter } from '@/features/inventory/utils/inventory-mappers';
import { CustomSelect } from '@/shared/ui/custom-select';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'الكل' },
  { value: 'out', label: 'نافد' },
  { value: 'low', label: 'منخفض' },
  { value: 'healthy', label: 'سليم' },
];

export function InventoryStatusFilterField({
  value,
  onChange
}: {
  value: InventoryStatusFilter;
  onChange: (value: InventoryStatusFilter) => void;
}) {
  return (
    <div className="field" style={{ minWidth: '130px' }}>
      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>الحالة</span>
      <CustomSelect
        value={value}
        onChange={(val) => onChange(val as InventoryStatusFilter)}
        options={STATUS_FILTER_OPTIONS}
        placeholder="اختر الحالة"
      />
    </div>
  );
}
