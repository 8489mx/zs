import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  return (
    <div className="field" style={{ minWidth: '130px' }}>
      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('inventory.inventory_status_filter.s0', "الحالة")}</span>
      <CustomSelect
        value={value}
        onChange={(val) => onChange(val as InventoryStatusFilter)}
        options={STATUS_FILTER_OPTIONS}
        placeholder={t('inventory.inventory_status_filter.s1', "اختر الحالة")}
      />
    </div>
  );
}
