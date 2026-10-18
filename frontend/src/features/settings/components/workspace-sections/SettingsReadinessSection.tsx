import { useTranslation } from 'react-i18next';
import { QueryCard } from '@/shared/components/query-card';
import { Button } from '@/shared/ui/button';
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
  const { t } = useTranslation();
  return (
    <div className="two-column-grid settings-diagnostics-grid">
      <QueryCard className="settings-admin-card" title={t('settings.workspace_sections.settings_readiness_section.s0', "جاهزية الاختبار")} actions={<div className="actions compact-actions"><Button variant="secondary" onClick={() => downloadSummaryCsv('uat-readiness.csv', uatSummary)}>{t('settings.workspace_sections.settings_readiness_section.s1', "تصدير Excel")}</Button><Button variant="secondary" onClick={() => printSummaryList(t('settings.workspace_sections.settings_readiness_section.s2', "جاهزية الاختبار"), uatSummary)}>{t('settings.workspace_sections.settings_readiness_section.s3', "طباعة")}</Button></div>} isLoading={uatQuery.isLoading} isError={uatQuery.isError} error={uatQuery.error}>
        <SummaryList data={uatSummary} />
      </QueryCard>
      <QueryCard className="settings-admin-card" title={t('settings.workspace_sections.settings_readiness_section.s4', "ملخص الدعم")} actions={<div className="actions compact-actions"><Button variant="secondary" onClick={() => downloadSummaryCsv('support-snapshot.csv', supportData)}>{t('settings.workspace_sections.settings_readiness_section.s5', "تصدير Excel")}</Button><Button variant="secondary" onClick={onCopySupportSnapshot}>{t('settings.workspace_sections.settings_readiness_section.s6', "نسخ")}</Button><Button variant="secondary" onClick={() => printSummaryList(t('settings.workspace_sections.settings_readiness_section.s7', "ملخص الدعم"), supportData)}>{t('settings.workspace_sections.settings_readiness_section.s8', "طباعة")}</Button></div>} isLoading={supportQuery.isLoading} isError={supportQuery.isError} error={supportQuery.error}>
        {supportCopyStatus ? <div className="success-box" style={{ marginBottom: 12 }}>{supportCopyStatus}</div> : null}
        <SummaryList data={supportData} />
      </QueryCard>
    </div>
  );
}
