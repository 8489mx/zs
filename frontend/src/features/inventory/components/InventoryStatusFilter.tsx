import type { InventoryStatusFilter } from '@/features/inventory/utils/inventory-mappers';

export function InventoryStatusFilterField({
  value,
  onChange
}: {
  value: InventoryStatusFilter;
  onChange: (value: InventoryStatusFilter) => void;
}) {
  return (
    <div className="field">
      <span>الحالة</span>
      <select value={value} onChange={(event) => onChange(event.target.value as InventoryStatusFilter)}>
        <option value="all">الكل</option>
        <option value="out">نافد</option>
        <option value="low">منخفض</option>
        <option value="healthy">سليم</option>
      </select>
    </div>
  );
}
