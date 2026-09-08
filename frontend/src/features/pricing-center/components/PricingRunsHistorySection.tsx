import React from 'react';
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
  return (
    <FormSection
      title="سجل موجات التسعير السابقة وإمكانية التراجع (Audit & Rollback)"
      description="متابعة جميع تعديلات الأسعار المنفذة آلياً، مع إمكانية استرجاع الأسعار القديمة فورياً بضغطة زر واحدة."
    >
      <DataTable
        data={runs}
        emptyMessage="لا توجد موجات تسعير سابقة مسجلة."
        columns={[
          {
            key: 'createdAt',
            header: 'تاريخ الموجة',
            render: (row: any) => formatDate(row.createdAt),
          },
          {
            key: 'summary',
            header: 'تفاصيل العملية',
            render: (row: any) => summarizeRun(row),
          },
          {
            key: 'count',
            header: 'الأصناف المعدلة',
            render: (row: any) => `${row.affectedCount} صنف`,
          },
          {
            key: 'reason',
            header: 'السبب المسجل',
            render: (row: any) => row.reason || '—',
          },
          {
            key: 'actions',
            header: 'إجراءات التراجع',
            render: (row: any) => (
              row.status === 'undone' ? (
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>تم التراجع مسبقاً</span>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => onUndo(row.id)}
                  disabled={!canManage || undoPending}
                  style={{ fontSize: '0.75rem', padding: '4px 10px', color: '#dc2626', borderColor: '#fecaca' }}
                >
                  تراجع عن الموجة
                </Button>
              )
            ),
          },
        ]}
      />
    </FormSection>
  );
}
