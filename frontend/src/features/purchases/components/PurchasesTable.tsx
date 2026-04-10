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
  const columns = getPurchaseColumns();
  if (onSelect || onEdit || onCancel || onPrint) {
    columns.push({
      key: 'actions',
      header: 'إجراءات',
      cell: (purchase: Purchase) => (
        <div className="actions compact-actions">
          {onSelect ? <Button variant={selectedId === purchase.id ? 'primary' : 'secondary'} onClick={() => onSelect(purchase)}>تفاصيل</Button> : null}
          {onPrint ? <Button variant="secondary" onClick={() => onPrint(purchase)}>طباعة</Button> : null}
          {onEdit && purchase.status !== 'cancelled' ? <Button variant="secondary" onClick={() => onEdit(purchase)}>تعديل</Button> : null}
          {onCancel && purchase.status !== 'cancelled' ? <Button variant="danger" onClick={() => onCancel(purchase)}>إلغاء</Button> : null}
        </div>
      )
    });
  }
  return <DataTable rows={rows} columns={columns} rowKey={(purchase) => String(purchase.id)} rowClassName={(purchase) => selectedId === purchase.id ? 'table-row-selected' : ''} onRowClick={onSelect ? (purchase) => onSelect(purchase) : undefined} rowTitle={() => 'انقر لعرض تفاصيل فاتورة الشراء'} />;
}
