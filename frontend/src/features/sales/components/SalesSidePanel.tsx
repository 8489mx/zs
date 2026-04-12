import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import { SaleDetailCard } from '@/features/sales/components/SaleDetailCard';
import type { Sale } from '@/types/domain';

type TopCustomer = { name: string; count: number; total: number };

type Props = {
  topCustomers: TopCustomer[];
  canPrint: boolean;
  canEditInvoices: boolean;
  selectedSale: Sale | null | undefined;
  isLoading: boolean;
  onExportTopCustomers: () => void | Promise<void>;
  onPrintTopCustomers: () => void | Promise<void>;
  onPrintSale: () => void;
  onEditSale: () => void;
  onCancelSale: () => void;
};

export function SalesSidePanel({
  topCustomers,
  canPrint,
  canEditInvoices,
  selectedSale,
  isLoading,
  onExportTopCustomers,
  onPrintTopCustomers,
  onPrintSale,
  onEditSale,
  onCancelSale,
}: Props) {
  return (
    <div className="sales-side-stack">
      <Card title="3. أهم العملاء في النطاق الحالي" description="مؤشر سريع على أكثر العملاء نشاطًا داخل النتائج الحالية." actions={<div className="actions compact-actions"><Button variant="secondary" onClick={() => void onExportTopCustomers()} disabled={!topCustomers.length}>تصدير CSV</Button><Button variant="secondary" onClick={() => void onPrintTopCustomers()} disabled={!topCustomers.length || !canPrint}>طباعة</Button></div>} className="workspace-panel sales-insight-card">
        <div className="list-stack">
          {topCustomers.length ? topCustomers.map((customer) => (
            <div className="list-row" key={customer.name}>
              <div>
                <strong>{customer.name}</strong>
                <div className="muted small">{customer.count} فاتورة</div>
              </div>
              <strong>{formatCurrency(customer.total)}</strong>
            </div>
          )) : <div className="muted">لا توجد بيانات كافية الآن.</div>}
        </div>
      </Card>

      <SaleDetailCard
        sale={selectedSale || undefined}
        isLoading={isLoading}
        onPrint={canPrint && selectedSale ? onPrintSale : undefined}
        onEdit={canEditInvoices && selectedSale && selectedSale.status !== 'cancelled' ? onEditSale : undefined}
        onCancel={canEditInvoices && selectedSale && selectedSale.status !== 'cancelled' ? onCancelSale : undefined}
      />
    </div>
  );
}
