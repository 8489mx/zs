import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/shared/components/data-table';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { FormSection } from '@/shared/components/form-section';
import { ReportMetricCard } from '@/shared/components/report-metric-card';
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
  const { t } = useTranslation();
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
          title={t('accounting.accounting_receivables_payables_page.s0', "الذمم والمستحقات")}
          description={t('accounting.accounting_receivables_payables_page.s1', "نظرة مبسطة على المبالغ المستحقة من العملاء والمبالغ المستحقة للموردين.")}
        />

        <FormSection title={t('accounting.accounting_receivables_payables_page.s2', "فلاتر التقرير")}>
        <div className="grid-2" style={{ alignItems: 'end' }}>
          <label className="field stack gap-8">
            <span>{t('accounting.accounting_receivables_payables_page.s3', "حتى تاريخ")}</span>
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </label>
          <div className="actions" style={{ marginTop: 8 }}>
            <button type="button" className="button" onClick={() => setAppliedDateTo(dateTo.trim())}>{t('accounting.accounting_receivables_payables_page.s4', "تطبيق")}</button>
            <button type="button" className="button button-secondary" onClick={() => { setDateTo(''); setAppliedDateTo(''); }}>{t('accounting.accounting_receivables_payables_page.s5', "إعادة ضبط")}</button>
          </div>
        </div>
        </FormSection>

        <FormSection title={t('accounting.accounting_receivables_payables_page.s6', "ملخص الذمم والمستحقات")}>
        <QueryFeedback
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          isEmpty={!totals}
          loadingText={t('accounting.accounting_receivables_payables_page.s7', "جاري تحميل تقرير الذمم والمستحقات...")}
          errorTitle={t('accounting.accounting_receivables_payables_page.s8', "تعذر تحميل تقرير الذمم والمستحقات")}
          emptyTitle={t('accounting.accounting_receivables_payables_page.s9', "لا توجد بيانات")}
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

        <FormSection title={t('accounting.accounting_receivables_payables_page.s10', "العملاء عليهم مبالغ")}>
        <DataTable<ReceivableRow>
          data={customers}
          getRowKey={(row) => row.customerId}
          emptyMessage={t('accounting.accounting_receivables_payables_page.s11', "لا يوجد عملاء عليهم مبالغ في النطاق الحالي")}
          defaultSort={{ columnId: 'balance', direction: 'desc' }}
          columns={[
            {
              id: 'customer',
              header: t('accounting.accounting_receivables_payables_page.s12', "العميل"),
              sortable: true,
              sortValue: (row) => row.customerName || '',
              render: (row) => row.customerName || '-',
            },
            {
              id: 'phone',
              header: t('accounting.accounting_receivables_payables_page.s13', "الهاتف"),
              render: (row) => row.phone || '-',
            },
            {
              id: 'balance',
              header: t('accounting.accounting_receivables_payables_page.s14', "المبلغ المستحق"),
              align: 'end',
              sortable: true,
              sortValue: (row) => Number(row.balance || 0),
              render: (row) => formatCurrency(Number(row.balance || 0)),
            },
            {
              id: 'lastMovement',
              header: t('accounting.accounting_receivables_payables_page.s15', "آخر حركة"),
              sortable: true,
              sortValue: (row) => row.lastMovementDate || '',
              render: (row) => formatDate(row.lastMovementDate),
            },
            {
              id: 'action',
              header: t('accounting.accounting_receivables_payables_page.s16', "إجراء"),
              render: (row) => (
                <Link className="button button-secondary" to={`/accounts?customerId=${encodeURIComponent(row.customerId)}`}>
                  {t('accounting.accounting_receivables_payables_page.s17', "عرض كشف الحساب")}
                </Link>
              ),
            },
          ]}
        />
        </FormSection>

        <FormSection title={t('accounting.accounting_receivables_payables_page.s18', "الموردون لهم مستحقات")}>
        <DataTable<PayableRow>
          data={suppliers}
          getRowKey={(row) => row.supplierId}
          emptyMessage={t('accounting.accounting_receivables_payables_page.s19', "لا يوجد موردون لهم مستحقات في النطاق الحالي")}
          defaultSort={{ columnId: 'balance', direction: 'desc' }}
          columns={[
            {
              id: 'supplier',
              header: t('accounting.accounting_receivables_payables_page.s20', "المورد"),
              sortable: true,
              sortValue: (row) => row.supplierName || '',
              render: (row) => row.supplierName || '-',
            },
            {
              id: 'phone',
              header: t('accounting.accounting_receivables_payables_page.s21', "الهاتف"),
              render: (row) => row.phone || '-',
            },
            {
              id: 'balance',
              header: t('accounting.accounting_receivables_payables_page.s22', "المبلغ المستحق"),
              align: 'end',
              sortable: true,
              sortValue: (row) => Number(row.balance || 0),
              render: (row) => formatCurrency(Number(row.balance || 0)),
            },
            {
              id: 'lastMovement',
              header: t('accounting.accounting_receivables_payables_page.s23', "آخر حركة"),
              sortable: true,
              sortValue: (row) => row.lastMovementDate || '',
              render: (row) => formatDate(row.lastMovementDate),
            },
            {
              id: 'action',
              header: t('accounting.accounting_receivables_payables_page.s24', "إجراء"),
              render: (row) => (
                <Link className="button button-secondary" to={`/accounts?supplierId=${encodeURIComponent(row.supplierId)}`}>
                  {t('accounting.accounting_receivables_payables_page.s25', "عرض كشف الحساب")}
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
