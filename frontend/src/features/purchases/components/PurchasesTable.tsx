import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import type { Purchase } from '@/types/domain';
import { getPurchaseColumns } from '@/features/purchases/utils/purchases-mappers';

interface PurchasesTableProps {
  rows: Purchase[];
  selectedId?: string;
  onSelect?: (purchase: Purchase) => void;
  onEdit?: (purchase: Purchase) => void;
  onCancel?: (purchase: Purchase) => void;
  onPrint?: (purchase: Purchase) => void;
}

export function PurchasesTable({ rows, selectedId, onSelect, onEdit, onCancel, onPrint }: PurchasesTableProps) {
  const { t } = useTranslation();
  const columns = getPurchaseColumns();
  if (onSelect || onEdit || onCancel || onPrint) {
    columns.push({
      key: 'actions',
      header: 'إجراءات',
      cell: (purchase: Purchase) => (
        <div className="actions compact-actions purchases-table-actions" style={{ flexWrap: 'nowrap' }}>
          {onSelect ? <Button variant={selectedId === purchase.id ? 'primary' : 'secondary'} onClick={() => onSelect(purchase)}>{t('purchases.purchases_table.s0', "تفاصيل")}</Button> : null}
          {onEdit && purchase.status !== 'cancelled' ? <Button variant="secondary" onClick={() => onEdit(purchase)}>{t('purchases.purchases_table.s1', "تعديل")}</Button> : null}
          {onCancel && purchase.status !== 'cancelled' ? <Button variant="danger" onClick={() => onCancel(purchase)}>{t('purchases.purchases_table.s2', "إلغاء")}</Button> : null}
          {onPrint ? <Button variant="secondary" onClick={() => onPrint(purchase)}>{t('purchases.purchases_table.s3', "طباعة")}</Button> : null}
        </div>
      )
    });
  }

  return (
    <DataTable
      rows={rows}
      columns={columns}
      density="compact"
      maxHeight={560}
      rowKey={(purchase) => String(purchase.id)}
      rowClassName={(purchase) => selectedId === purchase.id ? 'table-row-selected' : ''}
      onRowClick={onSelect ? (purchase) => onSelect(purchase) : undefined}
      rowTitle={() => t('purchases.purchases_table.s4', "انقر لعرض تفاصيل فاتورة الشراء")}
    />
  );
}
