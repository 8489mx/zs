import { Link } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { useTranslation } from "react-i18next";

type Props = {
  totalItems: number;
  description: string;
  onCopySummary: () => void | Promise<void>;
};

export function SalesWorkspaceHeader({ totalItems, description, onCopySummary }: Props) {
    const { t } = useTranslation();
  return (
    <PageHeader
      title={t('sales.ad7466')}
      description={description}
      actions={(
        <div className="actions compact-actions">
          <Button variant="secondary" onClick={() => void onCopySummary()} disabled={!totalItems}>{t('sales.dd3bfd')}</Button>
          <Link to="/pos"><Button>{t('sales.8f29d0')}</Button></Link>
        </div>
      )}
    />
  );
}
