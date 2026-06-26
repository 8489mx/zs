import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import type { Sale } from '@/types/domain';
import { getSalesTableColumns } from '@/features/sales/utils/sales-mappers';
import { useTranslation } from "react-i18next";

interface SalesTableProps {
  rows: Sale[];
  selectedId?: string;
  onSelect?: (sale: Sale) => void;
  onEdit?: (sale: Sale) => void;
  onCancel?: (sale: Sale) => void;
  onPrint?: (sale: Sale) => void;
}

export function SalesTable({ rows, selectedId, onSelect, onEdit, onCancel, onPrint }: SalesTableProps) {
    const { t } = useTranslation();
  const columns = getSalesTableColumns();
  if (onSelect || onEdit || onCancel || onPrint) {
    columns.push({
      key: 'actions',
      header: t('sales.901efe'),
      cell: (sale: Sale) => (
        <div className="actions compact-actions">
          {onSelect ? <Button variant={selectedId === sale.id ? 'primary' : 'secondary'} onClick={() => onSelect(sale)}>{t('sales.cc0478')}</Button> : null}
          {onPrint ? <Button variant="secondary" onClick={() => onPrint(sale)}>{t('sales.88c5d1')}</Button> : null}
          {onEdit ? (
            <Button
              variant="secondary"
              onClick={() => onEdit(sale)}
              disabled={sale.status === 'cancelled'}
              title={sale.status === 'cancelled' ? t('sales.f1ffb1') : undefined}
            >
              {t('sales.759fdc')}</Button>
          ) : null}
          {onCancel && sale.status !== 'cancelled' ? <Button variant="danger" onClick={() => onCancel(sale)}>{t('sales.b9568e')}</Button> : null}
        </div>
      )
    });
  }

  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(sale) => String(sale.id)}
      rowClassName={(sale) => selectedId === sale.id ? 'table-row-selected' : ''}
      onRowClick={onSelect ? (sale) => onSelect(sale) : undefined}
      rowTitle={() => t('sales.b5b504')}
    />
  );
}
