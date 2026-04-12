import { Link } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { paymentLabel } from '@/features/pos/lib/pos-workspace.helpers';
import type { PosWorkspaceState } from '@/features/pos/components/pos-workspace/posWorkspace.helpers';

function buildDescription(pos: PosWorkspaceState) {
  if (!pos.hasOperationalSetup) return 'أكمل تعريف المتجر ونقطة التشغيل أولًا، ثم ارجع للكاشير لإتمام البيع من نفس الشاشة.';
  if (!pos.hasCatalogReady) return 'أضف صنفًا واحدًا على الأقل حتى تظهر تجربة البيع اليومية بشكل كامل.';
  if (pos.requiresCashierShift && !pos.ownOpenShift) return 'افتح وردية لهذا المستخدم أولًا حتى يبدأ البيع النقدي أو الشبكة بدون تعطيل.';
  if (!pos.cart.length) return 'ابدأ بالباركود أو البحث السريع، ثم راجع السلة والدفع من العمود المقابل.';
  if (pos.canSubmitSale) return 'السلة جاهزة الآن. راجع الإجمالي والدفع ثم أكد البيع مباشرة.';
  return `راجع السلة الحالية. ${pos.canSubmitHint || 'أكمل المطلوب أولًا قبل تأكيد الفاتورة.'}`;
}

export function PosWorkspaceHeader({ pos }: { pos: PosWorkspaceState }) {
  const paymentMode = paymentLabel(pos.paymentType, pos.paymentChannel);

  return (
    <PageHeader
      title="الكاشير"
      description={buildDescription(pos)}
      badge={<span className="nav-pill">نقطة البيع</span>}
      className="page-header--dense pos-page-header"
      actions={(
        <div className="actions compact-actions pos-header-actions-row">
          <span className="toolbar-meta-pill">{pos.ownOpenShift ? `الوردية ${pos.ownOpenShift.docNo || 'مفتوحة'}` : 'لا توجد وردية'}</span>
          <span className="toolbar-meta-pill">الدفع {paymentMode}</span>
          {!pos.ownOpenShift ? (
            <Link to="/cash-drawer"><Button>فتح وردية</Button></Link>
          ) : null}
          <Button variant="secondary" onClick={() => { pos.setSearch(''); pos.setProductFilter('all'); }}>تصفير البحث</Button>
          <Button variant="secondary" onClick={pos.resetPosDraft}>تفريغ السلة</Button>
        </div>
      )}
    />
  );
}
