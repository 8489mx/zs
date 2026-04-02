import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable } from '@/components/ui/DataTable';
import { formatDate } from '@/lib/format';
import type { DamagedStockRecord } from '@/types/domain';

interface DamagedStockCardProps {
  damagedRecords: DamagedStockRecord[];
  totalItems: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onPrintDamagedRecords: () => void;
  onExportDamagedCsv: () => void;
}

export function DamagedStockCard({ damagedRecords, totalItems, page, pageSize, onPageChange, onPageSizeChange, onPrintDamagedRecords, onExportDamagedCsv }: DamagedStockCardProps) {
  return (
    <Card title="سجل الأصناف التالفة" description="تبويب مستقل للتالف حتى يستطيع المستخدم مراجعة السجلات والطباعة والتصدير بدون تشتيت بجلسات الجرد." actions={<div className="actions compact-actions"><Button variant="secondary" onClick={onPrintDamagedRecords} disabled={!damagedRecords.length}>طباعة التالف</Button><Button variant="secondary" onClick={onExportDamagedCsv} disabled={!damagedRecords.length}>تصدير التالف</Button><span className="nav-pill">{totalItems} سجل</span></div>}>
      <DataTable
        rows={damagedRecords}
        rowKey={(row) => String(row.id)}
        density="compact"
        pagination={{
          page,
          pageSize,
          onPageChange,
          onPageSizeChange,
          totalItems,
          pageSizeOptions: [10, 20, 50],
          itemLabel: 'سجل',
        }}
        empty={<EmptyState title="لا توجد سجلات تالف في النطاق الحالي" hint="ستظهر هنا السجلات المعتمدة للتالف بعد اعتماد الجلسات أو الحركات ذات الصلة." />}
        columns={[
          {
            key: 'product',
            header: 'الصنف',
            cell: (row) => (
              <div>
                <strong>{row.productName}</strong>
                <div className="muted small">{row.locationName || 'بدون موقع'} · {row.reason || 'damage'}</div>
              </div>
            ),
          },
          {
            key: 'qty',
            header: 'الكمية',
            cell: (row) => <span className="low-stock-badge">{row.qty}</span>,
          },
          {
            key: 'meta',
            header: 'التوثيق',
            cell: (row) => (
              <div>
                <div>{formatDate(row.createdAt || row.date || '')}</div>
                <div className="muted small">{row.createdBy || '—'}</div>
              </div>
            ),
          },
        ]}
      />
    </Card>
  );
}
