import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import type { PosWorkspaceState } from '@/features/pos/components/pos-workspace/posWorkspace.helpers';

export function PosWorkspaceHeader({ pos }: { pos: PosWorkspaceState }) {
  return (
    <PageHeader
      title="الكاشير"
      badge={<span className="nav-pill">نقطة البيع</span>}
      className="page-header--dense page-header--single-line pos-page-header"
      actions={(
        <div className="actions compact-actions pos-header-actions-row">
          <Button variant="secondary" onClick={() => { pos.setSearch(''); pos.setProductFilter('all'); }}>تصفير البحث</Button>
          <Button variant="secondary" onClick={pos.resetPosDraft}>تفريغ السلة</Button>
        </div>
      )}
    />
  );
}
