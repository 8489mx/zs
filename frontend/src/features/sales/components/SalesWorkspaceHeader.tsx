import { Link } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';

type Props = {
  totalItems: number;
  onCopySummary: () => void | Promise<void>;
};

export function SalesWorkspaceHeader({ totalItems, onCopySummary }: Props) {
  return (
    <PageHeader
      title="سجل المبيعات"
      description="راجع الفواتير، اختَر الفاتورة الصحيحة، ثم عدّل أو اطبع أو ألغِ من نفس الشاشة."
      actions={(
        <div className="actions compact-actions">
          <Button variant="secondary" onClick={() => void onCopySummary()} disabled={!totalItems}>نسخ الملخص</Button>
          <Link to="/pos"><Button>فتح الكاشير</Button></Link>
        </div>
      )}
    />
  );
}
