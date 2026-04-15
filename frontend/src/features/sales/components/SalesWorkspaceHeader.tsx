import { Link } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';

type Props = {
  totalItems: number;
  description: string;
  onCopySummary: () => void | Promise<void>;
};

export function SalesWorkspaceHeader({ totalItems, description, onCopySummary }: Props) {
  return (
    <PageHeader
      title="سجل المبيعات"
      description={description}
      actions={(
        <div className="actions compact-actions">
          <Button variant="secondary" onClick={() => void onCopySummary()} disabled={!totalItems}>نسخ الملخص</Button>
          <Link to="/pos"><Button>فتح الكاشير</Button></Link>
        </div>
      )}
    />
  );
}
