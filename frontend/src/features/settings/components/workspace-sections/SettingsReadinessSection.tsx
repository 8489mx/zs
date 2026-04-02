import { QueryCard } from '@/components/shared/QueryCard';
import { Button } from '@/components/ui/Button';
import { SummaryList, downloadSummaryCsv, printSummaryList } from '@/features/settings/components/SettingsWorkspacePrimitives';

interface SettingsReadinessSectionProps {
  uatQuery: { isLoading: boolean; isError: boolean; error?: unknown };
  supportQuery: { isLoading: boolean; isError: boolean; error?: unknown; data?: unknown };
  supportCopyStatus: string;
  uatSummary?: Record<string, unknown>;
  supportData?: Record<string, unknown>;
  onCopySupportSnapshot: () => void;
}

export function SettingsReadinessSection({
  uatQuery,
  supportQuery,
  supportCopyStatus,
  uatSummary,
  supportData,
  onCopySupportSnapshot,
}: SettingsReadinessSectionProps) {
  return (
    <div className="two-column-grid settings-diagnostics-grid">
      <QueryCard className="settings-admin-card" title="جاهزية الاختبار" actions={<div className="actions compact-actions"><Button variant="secondary" onClick={() => downloadSummaryCsv('uat-readiness.csv', uatSummary)}>تصدير CSV</Button><Button variant="secondary" onClick={() => printSummaryList('جاهزية الاختبار', uatSummary)}>طباعة</Button></div>} isLoading={uatQuery.isLoading} isError={uatQuery.isError} error={uatQuery.error}>
        <SummaryList data={uatSummary} />
      </QueryCard>
      <QueryCard className="settings-admin-card" title="ملخص الدعم" actions={<div className="actions compact-actions"><Button variant="secondary" onClick={() => downloadSummaryCsv('support-snapshot.csv', supportData)}>تصدير CSV</Button><Button variant="secondary" onClick={onCopySupportSnapshot}>نسخ</Button><Button variant="secondary" onClick={() => printSummaryList('ملخص الدعم', supportData)}>طباعة</Button></div>} isLoading={supportQuery.isLoading} isError={supportQuery.isError} error={supportQuery.error}>
        {supportCopyStatus ? <div className="success-box" style={{ marginBottom: 12 }}>{supportCopyStatus}</div> : null}
        <SummaryList data={supportData} />
      </QueryCard>
    </div>
  );
}
