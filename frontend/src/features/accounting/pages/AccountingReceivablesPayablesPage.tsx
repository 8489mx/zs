import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/shared/components/data-table';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { FormSection } from '@/shared/components/form-section';
import { ReportMetricCard } from '@/features/reports/components/ReportMetricCard';
import { formatCurrency } from '@/lib/format';

import { accountingApi, type PayableRow, type ReceivableRow } from '@/features/accounting/api/accounting.api';

function formatDate(value: string) {
  if (!value) return '—';
  const iso = String(value).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  const year = String(parsed.getFullYear());
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function AccountingReceivablesPayablesPage() {
  const [dateTo, setDateTo] = useState('');
  const [appliedDateTo, setAppliedDateTo] = useState('');

  const query = useQuery({
    queryKey: ['accounting', 'receivables-payables', appliedDateTo],
    queryFn: () => accountingApi.receivablesPayables({ date_to: appliedDateTo || undefined }),
  });

  const totals = query.data?.totals;
  const customers = query.data?.customers || [];
  const suppliers = query.data?.suppliers || [];

  const summaryItems = useMemo(() => {
    if (!totals) return [];
    const netPosition = Number(totals.netPosition || 0);
    const netPositionLabel = netPosition >= 0 ? 'صافي لصالحك' : 'صافي التزامات عليك';
    const netPositionDisplay = Math.abs(netPosition);
    return [
      { key: 'customerReceivables', label: 'مستحق من العملاء', value: formatCurrency(totals.customerReceivables) },
      { key: 'supplierPayables', label: 'مستحق للموردين', value: formatCurrency(totals.supplierPayables) },
      { key: 'netPosition', label: netPositionLabel, value: formatCurrency(netPositionDisplay) },
      { key: 'customersCount', label: 'عدد العملاء عليهم مبالغ', value: customers.filter((row) => Number(row.balance || 0) > 0).length },
      { key: 'suppliersCount', label: 'عدد الموردين لهم مستحقات', value: suppliers.filter((row) => Number(row.balance || 0) > 0).length },
    ];
  }, [customers, suppliers, totals]);

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px' }}>
        <PageHeader
          title="الذمم والمستحقات"
          description="نظرة مبسطة على المبالغ المستحقة من العملاء والمبالغ المستحقة للموردين."
        />

        <FormSection title="فلاتر التقرير">
        <div className="grid-2" style={{ alignItems: 'end' }}>
          <label className="field stack gap-8">
            <span>حتى تاريخ</span>
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </label>
          <div className="actions" style={{ marginTop: 8 }}>
            <button type="button" className="button" onClick={() => setAppliedDateTo(dateTo.trim())}>تطبيق</button>
            <button type="button" className="button button-secondary" onClick={() => { setDateTo(''); setAppliedDateTo(''); }}>إعادة ضبط</button>
          </div>
        </div>
        </FormSection>

        <FormSection title="ملخص الذمم والمستحقات">
        <QueryFeedback
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          isEmpty={!totals}
          loadingText="جاري تحميل تقرير الذمم والمستحقات..."
          errorTitle="تعذر تحميل تقرير الذمم والمستحقات"
          emptyTitle="لا توجد بيانات"
        >
          {summaryItems.length ? (
            <div className="reports-workspace">
              <div className="reports-spotlight-grid compact-spotlight-grid">
                {summaryItems.map((stat) => (
                  <ReportMetricCard 
                    key={stat.key} 
                    label={stat.label as string} 
                    value={Number(stat.value) || 0} 
                    tone={stat.key === 'netPosition' ? (Number(totals?.netPosition || 0) >= 0 ? 'success' : 'danger') : stat.key === 'customerReceivables' ? 'warning' : stat.key === 'supplierPayables' ? 'danger' : 'primary'} 
                  />
                ))}
              </div>
            </div>
          ) : null}
        </QueryFeedback>
        </FormSection>

        <FormSection title="العملاء عليهم مبالغ">
        <DataTable<ReceivableRow>
          data={customers}
          getRowKey={(row) => row.customerId}
          emptyMessage="لا يوجد عملاء عليهم مبالغ في النطاق الحالي"
          defaultSort={{ columnId: 'balance', direction: 'desc' }}
          columns={[
            {
              id: 'customer',
              header: 'العميل',
              sortable: true,
              sortValue: (row) => row.customerName || '',
              render: (row) => row.customerName || '-',
            },
            {
              id: 'phone',
              header: 'الهاتف',
              render: (row) => row.phone || '-',
            },
            {
              id: 'balance',
              header: 'المبلغ المستحق',
              align: 'end',
              sortable: true,
              sortValue: (row) => Number(row.balance || 0),
              render: (row) => formatCurrency(Number(row.balance || 0)),
            },
            {
              id: 'lastMovement',
              header: 'آخر حركة',
              sortable: true,
              sortValue: (row) => row.lastMovementDate || '',
              render: (row) => formatDate(row.lastMovementDate),
            },
            {
              id: 'action',
              header: 'إجراء',
              render: (row) => (
                <Link className="button button-secondary" to={`/accounts?customerId=${encodeURIComponent(row.customerId)}`}>
                  عرض كشف الحساب
                </Link>
              ),
            },
          ]}
        />
        </FormSection>

        <FormSection title="الموردون لهم مستحقات">
        <DataTable<PayableRow>
          data={suppliers}
          getRowKey={(row) => row.supplierId}
          emptyMessage="لا يوجد موردون لهم مستحقات في النطاق الحالي"
          defaultSort={{ columnId: 'balance', direction: 'desc' }}
          columns={[
            {
              id: 'supplier',
              header: 'المورد',
              sortable: true,
              sortValue: (row) => row.supplierName || '',
              render: (row) => row.supplierName || '-',
            },
            {
              id: 'phone',
              header: 'الهاتف',
              render: (row) => row.phone || '-',
            },
            {
              id: 'balance',
              header: 'المبلغ المستحق',
              align: 'end',
              sortable: true,
              sortValue: (row) => Number(row.balance || 0),
              render: (row) => formatCurrency(Number(row.balance || 0)),
            },
            {
              id: 'lastMovement',
              header: 'آخر حركة',
              sortable: true,
              sortValue: (row) => row.lastMovementDate || '',
              render: (row) => formatDate(row.lastMovementDate),
            },
            {
              id: 'action',
              header: 'إجراء',
              render: (row) => (
                <Link className="button button-secondary" to={`/accounts?supplierId=${encodeURIComponent(row.supplierId)}`}>
                  عرض كشف الحساب
                </Link>
              ),
            },
          ]}
        />
        </FormSection>
      </main>
    </div>
  );
}
