import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
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
          <Button variant="secondary" onClick={() => void pos.copyLastSaleSummary()} disabled={!pos.lastSale}>نسخ آخر فاتورة</Button>
          <Button variant="secondary" onClick={pos.reprintLastSale} disabled={!pos.lastSale}>إعادة طباعة آخر فاتورة</Button>
        </div>
      )}
    />
  );
}
