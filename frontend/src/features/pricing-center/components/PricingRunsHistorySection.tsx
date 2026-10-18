import { useTranslation } from 'react-i18next';
import { FormSection } from '@/shared/components/form-section';
import { DataTable } from '@/shared/ui/data-table';
import { Button } from '@/shared/ui/button';
import { formatDate } from '@/lib/format';
import { summarizeRun } from '@/features/pricing-center/lib/pricing-center.utils';

interface PricingRunsHistorySectionProps {
  runs: any[];
  canManage: boolean;
  onUndo: (id: number) => void;
  undoPending: boolean;
}

export function PricingRunsHistorySection({
  runs,
  canManage,
  onUndo,
  undoPending,
}: PricingRunsHistorySectionProps) {
  const { t } = useTranslation();
  return (
    <FormSection
      title={t('pricing_center.pricing_runs_history_section.s0', "سجل موجات التسعير السابقة وإمكانية التراجع (Audit & Rollback)")}
      description={t('pricing_center.pricing_runs_history_section.s1', "متابعة جميع تعديلات الأسعار المنفذة آلياً، مع إمكانية استرجاع الأسعار القديمة فورياً بضغطة زر واحدة.")}
    >
      <DataTable
        rows={runs}
        rowKey={(row: any) => String(row.id || row.createdAt)}
        empty={t('pricing_center.pricing_runs_history_section.s2', "لا توجد موجات تسعير سابقة مسجلة.")}
        columns={[
          {
            key: 'createdAt',
            header: t('pricing_center.pricing_runs_history_section.s3', "تاريخ الموجة"),
            cell: (row: any) => formatDate(row.createdAt),
          },
          {
            key: 'summary',
            header: t('pricing_center.pricing_runs_history_section.s4', "تفاصيل العملية"),
            cell: (row: any) => summarizeRun(row),
          },
          {
            key: 'count',
            header: t('pricing_center.pricing_runs_history_section.s5', "الأصناف المعدلة"),
            cell: (row: any) => `${row.affectedCount} صنف`,
          },
          {
            key: 'reason',
            header: t('pricing_center.pricing_runs_history_section.s6', "السبب المسجل"),
            cell: (row: any) => row.reason || '—',
          },
          {
            key: 'actions',
            header: t('pricing_center.pricing_runs_history_section.s7', "إجراءات التراجع"),
            cell: (row: any) => (
              row.status === 'undone' ? (
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{t('pricing_center.pricing_runs_history_section.s8', "تم التراجع مسبقاً")}</span>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => onUndo(row.id)}
                  disabled={!canManage || undoPending}
                  style={{ fontSize: '0.75rem', padding: '4px 10px', color: '#dc2626', borderColor: '#fecaca' }}
                >
                  {t('pricing_center.pricing_runs_history_section.s9', "تراجع عن الموجة")}
                </Button>
              )
            ),
          },
        ]}
      />
    </FormSection>
  );
}
