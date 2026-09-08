import { CalendarIcon } from '@/shared/components/icons/AppIcons';
import { DataTable } from '@/shared/ui/data-table';
import { Button } from '@/shared/ui/button';
import type { WorkOrderRecord } from '@/features/manufacturing/api/work-orders.api';
import { statusLabels, statusColors, type Column } from './types';

interface WorkOrdersGroupedListProps {
  groupedOrders: Record<string, WorkOrderRecord[]>;
  dateFilter: string;
  currentUser: any;
  currentUserName: string;
  onCompleteOrder: (order: WorkOrderRecord) => void;
}

export function WorkOrdersGroupedList({
  groupedOrders,
  dateFilter,
  currentUser,
  currentUserName,
  onCompleteOrder,
}: WorkOrdersGroupedListProps) {
  const columns: Column<WorkOrderRecord>[] = [
    {
      key: 'doc_no',
      header: 'رقم الأمر',
      cell: (row) => <span style={{ fontWeight: '500', color: '#111827' }}>{row.doc_no || `#${row.id}`}</span>,
    },
    {
      key: 'product_name',
      header: 'المنتج التام',
      cell: (row) => {
        const isAuto = String(row.notes || '').includes('إنتاج تلقائي');
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{row.product_name}</span>
            {isAuto && <span style={{ fontSize: '11px', background: '#f3f4f6', color: '#4b5563', padding: '2px 6px', borderRadius: '4px' }}>آلي</span>}
          </div>
        );
      },
    },
    {
      key: 'created_by',
      header: 'بواسطة',
      cell: (row) => <span style={{ color: '#6b7280' }}>{row.created_by_id && row.created_by_id === currentUser?.id ? currentUserName : row.created_by}</span>,
    },
    {
      key: 'quantity_to_produce',
      header: 'الكمية المطلوبة',
      cell: (row) => Number(row.quantity_to_produce).toLocaleString('ar-EG', { maximumFractionDigits: 2 }),
    },
    {
      key: 'produced_quantity',
      header: 'الكمية المنتجة',
      cell: (row) => Number(row.produced_quantity).toLocaleString('ar-EG', { maximumFractionDigits: 2 }),
    },
    {
      key: 'total_cost',
      header: 'التكلفة الإجمالية',
      cell: (row) => Number(row.total_cost).toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' }),
    },
    {
      key: 'start_date',
      header: 'التاريخ',
      cell: (row) => (row.start_date || (row as any).createdAt) ? new Date((row.start_date || (row as any).createdAt) as string).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-',
    },
    {
      key: 'status',
      header: 'الحالة',
      cell: (row) => {
        const val = row.status;
        return (
          <span
            style={{
              padding: '4px 8px',
              borderRadius: '999px',
              backgroundColor: `${statusColors[val]}15`,
              color: statusColors[val],
              fontSize: '13px',
              fontWeight: '500',
            }}
          >
            {statusLabels[val] || val}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => {
        if (row.status !== 'draft' && row.status !== 'in_progress') return null;
        return (
          <Button
            variant="secondary"
            onClick={() => onCompleteOrder(row)}
          >
            إنهاء وتأكيد
          </Button>
        );
      },
    },
  ];

  const todayStr = new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {Object.entries(groupedOrders).map(([dateLabel, orders]) => {
        const autoCount = orders.filter((o) => String((o as any).note || o.notes || '').includes('إنتاج تلقائي')).length;
        const manualCount = orders.length - autoCount;
        return (
          <details
            key={dateLabel}
            style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}
            open={dateFilter === 'today' || dateLabel === todayStr}
          >
            <summary style={{ padding: '16px', background: '#f9fafb', cursor: 'pointer', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarIcon size={18} color="#475569" />
                <span>{dateLabel}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', fontSize: '13px', fontWeight: 'normal', color: '#6b7280' }}>
                {autoCount > 0 && <span>{autoCount} آلي</span>}
                {manualCount > 0 && <span>{manualCount} يدوي</span>}
                <span>({orders.length} إجمالي)</span>
              </div>
            </summary>
            <div style={{ padding: '8px' }}>
              <DataTable
                columns={columns}
                rows={orders}
                rowKey={(r) => String(r.id)}
              />
            </div>
          </details>
        );
      })}
    </div>
  );
}
