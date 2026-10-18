import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';

type Props = {
  totalItems: number;
  salesReturns: number;
  purchaseReturns: number;
  copyFeedback: { kind: 'success' | 'error'; text: string } | null;
  onReset: () => void;
  onCopySummary: () => void | Promise<void>;
  onExportCsv: () => void | Promise<void>;
  onPrint: () => void | Promise<void>;
  onOpenCreate?: () => void;
};

export function ReturnsWorkspaceHeader({
  totalItems,
  salesReturns,
  purchaseReturns,
  copyFeedback,
  onReset,
  onCopySummary,
  onExportCsv,
  onPrint,
  onOpenCreate,
}: Props) {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader
        title={t('returns.header_title', 'المرتجعات')}
        description={t('returns.header_description', 'إدارة ومتابعة مرتجعات المبيعات والمشتريات وتسجيل المرتجعات الجديدة.')}
        badge={
          <span className="nav-pill">
            {t('returns.badge_sales', 'بيع')} {salesReturns} / {t('returns.badge_purchase', 'شراء')} {purchaseReturns}
          </span>
        }
        actions={(
          <div className="actions compact-actions">
            {onOpenCreate && <Button variant="primary" onClick={onOpenCreate}>+ {t('returns.new_return', 'مرتجع جديد')}</Button>}
            <Button variant="secondary" onClick={onReset}>{t('common.reset', 'إعادة ضبط')}</Button>
            <Button variant="secondary" onClick={() => void onCopySummary()} disabled={!totalItems}>{t('common.copy', 'نسخ')}</Button>
            <Button variant="secondary" onClick={() => void onExportCsv()} disabled={!totalItems}>{t('common.export', 'تصدير')}</Button>
            <Button variant="secondary" onClick={() => void onPrint()} disabled={!totalItems}>{t('common.print', 'طباعة')}</Button>
          </div>
        )}
      />
      {copyFeedback ? <div className={copyFeedback.kind === 'error' ? 'warning-box' : 'success-box'}>{copyFeedback.text}</div> : null}
    </>
  );
}
