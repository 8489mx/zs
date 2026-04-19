import { Card } from '@/shared/ui/card';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { SharedSaleDetailCard, SharedPurchaseDetailCard } from '@/shared/components/invoice-detail-cards';
import type { Purchase, Sale } from '@/types/domain';

interface AccountsInvoiceDetailCardProps {
  selectedLabel: string;
  documentType: 'sale' | 'purchase' | null;
  isLoading: boolean;
  error?: unknown;
  sale?: Sale | null;
  purchase?: Purchase | null;
}

export function AccountsInvoiceDetailCard({
  selectedLabel,
  documentType,
  isLoading,
  error,
  sale,
  purchase,
}: AccountsInvoiceDetailCardProps) {
  return (
    <QueryFeedback
      isLoading={isLoading}
      isError={Boolean(error)}
      error={error}
      loadingText="جارٍ تحميل تفاصيل الفاتورة..."
      errorTitle="تعذر تحميل تفاصيل الفاتورة"
      isEmpty={!documentType || (!sale && !purchase)}
      emptyTitle="اختر فاتورة من القيود لعرض تفاصيلها"
      emptyHint="سيظهر هنا محتوى الفاتورة بالأصناف والكميات والأسعار من نفس شاشة الحسابات."
    >
      {documentType === 'sale' ? (
        <SharedSaleDetailCard sale={sale || undefined} />
      ) : documentType === 'purchase' ? (
        <SharedPurchaseDetailCard purchase={purchase || undefined} />
      ) : (
        <Card title="تفاصيل الفاتورة"><div className="muted">اختر فاتورة من القيود لعرض تفاصيلها.</div></Card>
      )}
      {selectedLabel ? <div className="muted small">المرجع المحدد: {selectedLabel}</div> : null}
    </QueryFeedback>
  );
}
