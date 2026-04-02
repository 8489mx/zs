import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import type { Sale } from '@/types/domain';
import { getSalesTableColumns } from '@/features/sales/utils/sales-mappers';

interface SalesTableProps {
  rows: Sale[];
  selectedId?: string;
  onSelect?: (sale: Sale) => void;
  onEdit?: (sale: Sale) => void;
  onCancel?: (sale: Sale) => void;
  onPrint?: (sale: Sale) => void;
}

export function SalesTable({ rows, selectedId, onSelect, onEdit, onCancel, onPrint }: SalesTableProps) {
  const columns = getSalesTableColumns();
  if (onSelect || onEdit || onCancel || onPrint) {
    columns.push({
      key: 'actions',
      header: 'إجراءات',
      cell: (sale: Sale) => (
        <div className="actions compact-actions">
          {onSelect ? <Button variant={selectedId === sale.id ? 'primary' : 'secondary'} onClick={() => onSelect(sale)}>تفاصيل</Button> : null}
          {onPrint ? <Button variant="secondary" onClick={() => onPrint(sale)}>طباعة</Button> : null}
          {onEdit && sale.status !== 'cancelled' ? <Button variant="secondary" onClick={() => onEdit(sale)}>تعديل</Button> : null}
          {onCancel && sale.status !== 'cancelled' ? <Button variant="danger" onClick={() => onCancel(sale)}>إلغاء</Button> : null}
        </div>
      )
    });
  }
  return <DataTable rows={rows} columns={columns} rowKey={(sale) => String(sale.id)} rowClassName={(sale) => selectedId === sale.id ? 'table-row-selected' : ''} onRowClick={onSelect ? (sale) => onSelect(sale) : undefined} rowTitle={() => 'انقر لعرض تفاصيل الفاتورة'} />;
}
