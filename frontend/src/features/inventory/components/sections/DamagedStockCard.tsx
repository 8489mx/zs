import { useTranslation } from 'react-i18next';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { DataTable } from '@/shared/ui/data-table';
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
  const { t } = useTranslation();
  return (
    <FormSection title={t('inventory.sections.damaged_stock_card.s0', "سجل الأصناف التالفة")} description={t('inventory.sections.damaged_stock_card.s1', "تبويب مستقل للتالف حتى يستطيع المستخدم مراجعة السجلات والطباعة والتصدير بدون تشتيت بجلسات الجرد.")} actions={<div className="actions compact-actions"><Button variant="secondary" onClick={onPrintDamagedRecords} disabled={!damagedRecords.length}>{t('inventory.sections.damaged_stock_card.s2', "طباعة التالف")}</Button><Button variant="secondary" onClick={onExportDamagedCsv} disabled={!damagedRecords.length}>{t('inventory.sections.damaged_stock_card.s3', "تصدير التالف")}</Button><span className="nav-pill">{totalItems} {t('inventory.sections.damaged_stock_card.s4', "سجل")}</span></div>}>
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
          itemLabel: t('inventory.sections.damaged_stock_card.s5', "سجل"),
        }}
        empty={<EmptyState title={t('inventory.sections.damaged_stock_card.s6', "لا توجد سجلات تالف في النطاق الحالي")} hint={t('inventory.sections.damaged_stock_card.s7', "ستظهر هنا السجلات المعتمدة للتالف بعد اعتماد الجلسات أو الحركات ذات الصلة.")} />}
        columns={[
          {
            key: 'product',
            header: t('inventory.sections.damaged_stock_card.s8', "الصنف"),
            cell: (row) => (
              <div>
                <strong>{row.productName}</strong>
                <div className="muted small">{row.locationName || t('inventory.sections.damaged_stock_card.s9', "بدون موقع")} · {row.reason || 'damage'}</div>
              </div>
            ),
          },
          {
            key: 'qty',
            header: t('inventory.sections.damaged_stock_card.s10', "الكمية"),
            cell: (row) => <span className="low-stock-badge">{row.qty}</span>,
          },
          {
            key: 'meta',
            header: t('inventory.sections.damaged_stock_card.s11', "التوثيق"),
            cell: (row) => (
              <div>
                <div>{formatDate(row.createdAt || row.date || '')}</div>
                <div className="muted small">{row.createdBy || '—'}</div>
              </div>
            ),
          },
        ]}
      />
    </FormSection>
  );
}
