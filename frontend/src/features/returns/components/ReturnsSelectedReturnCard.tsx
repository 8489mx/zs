import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/format';
import { getReturnDateValue, returnTypeLabel } from '@/features/returns/lib/returns-workspace.helpers';
import type { ReturnRecord } from '@/types/domain';

export function ReturnsSelectedReturnCard({
  selectedReturn,
  onPrint,
  onCopy,
}: {
  selectedReturn: ReturnRecord | null;
  onPrint: () => void;
  onCopy: () => void;
}) {
  return (
    <Card title="تفاصيل المرتجع المحدد" description="بطاقة مراجعة ثابتة تساعد على التدقيق قبل الطباعة أو مشاركة تفاصيل المستند." actions={<div className="actions compact-actions"><Button variant="secondary" onClick={onPrint} disabled={!selectedReturn}>طباعة</Button><Button variant="secondary" onClick={onCopy} disabled={!selectedReturn}>نسخ التفاصيل</Button></div>} className="workspace-panel returns-detail-card">
      {selectedReturn ? (
        <div className="section-stack">
          <div className="metric-list">
            <div className="metric-row"><span>رقم المستند</span><strong>{selectedReturn.docNo || selectedReturn.id}</strong></div>
            <div className="metric-row"><span>النوع</span><strong>{returnTypeLabel(selectedReturn)}</strong></div>
            <div className="metric-row"><span>الصنف</span><strong>{selectedReturn.productName || '—'}</strong></div>
            <div className="metric-row"><span>الكمية</span><strong>{selectedReturn.qty || 0}</strong></div>
            <div className="metric-row"><span>الإجمالي</span><strong>{formatCurrency(Number(selectedReturn.total || 0))}</strong></div>
            <div className="metric-row"><span>التاريخ</span><strong>{formatDate(getReturnDateValue(selectedReturn))}</strong></div>
          </div>
          <div className="surface-note">{selectedReturn.note || 'لا توجد ملاحظات على المرتجع المحدد.'}</div>
        </div>
      ) : <EmptyState title="اختر مرتجعًا من الجدول" hint="ستظهر هنا التفاصيل الجاهزة للمراجعة والطباعة والنسخ." />}
    </Card>
  );
}
