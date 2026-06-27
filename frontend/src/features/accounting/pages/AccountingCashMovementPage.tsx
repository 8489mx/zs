import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/shared/components/data-table';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { FormSection } from '@/shared/components/form-section';
import { ReportMetricCard } from '@/features/reports/components/ReportMetricCard';
import { formatCurrency } from '@/lib/format';

import { accountingApi } from '@/features/accounting/api/accounting.api';

function sourceLabel(sourceType: string) {
  if (sourceType === 'sale') return 'بيع';
  if (sourceType === 'purchase') return 'شراء';
  if (sourceType === 'customer_payment') return 'تحصيل عميل';
  if (sourceType === 'supplier_payment') return 'سداد مورد';
  if (sourceType === 'supplier_payment_schedule_settlement') return 'سداد مورد';
  if (sourceType === 'expense' || sourceType === 'treasury_expense') return 'مصروف';
  if (sourceType === 'sales_return' || sourceType === 'return') return 'مرتجع بيع';
  if (sourceType === 'sale_edit') return 'تعديل بيع';
  if (sourceType === 'sale_edit_reversal') return 'عكس تعديل بيع';
  if (sourceType === 'sale_reversal' || sourceType === 'sale_cancel') return 'إلغاء بيع';
  if (sourceType === 'purchase_reversal' || sourceType === 'purchase_cancel') return 'إلغاء شراء';
  if (sourceType === 'opening_balance') return 'أرصدة افتتاحية';
  return sourceType || '-';
}

export function AccountingCashMovementPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [appliedDateFrom, setAppliedDateFrom] = useState('');
  const [appliedDateTo, setAppliedDateTo] = useState('');

  const query = useQuery({
    queryKey: ['accounting', 'cash-movement', appliedDateFrom, appliedDateTo],
    queryFn: () => accountingApi.cashMovement({ date_from: appliedDateFrom || undefined, date_to: appliedDateTo || undefined }),
  });

  const totals = query.data?.totals;
  const accounts = query.data?.accounts || [];
  const sources = query.data?.sources || [];

  const stats = useMemo(() => {
    if (!totals) return [];
    return [
      { key: 'in', label: 'إجمالي الداخل', value: formatCurrency(totals.totalIn) },
      { key: 'out', label: 'إجمالي الخارج', value: formatCurrency(totals.totalOut) },
      { key: 'net', label: 'صافي الحركة', value: formatCurrency(totals.netMovement) },
    ];
  }, [totals]);

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px' }}>
        <PageHeader title="حركة الخزنة والبنك" description="تقرير مبسط يوضح الداخل والخارج وصافي حركة النقدية خلال الفترة." />

        <FormSection title="فلاتر التقرير">
        <div className="grid-2" style={{ alignItems: 'end' }}>
          <label className="field stack gap-8">
            <span>من تاريخ</span>
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </label>
          <label className="field stack gap-8">
            <span>إلى تاريخ</span>
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </label>
        </div>
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="button" className="button" onClick={() => { setAppliedDateFrom(dateFrom.trim()); setAppliedDateTo(dateTo.trim()); }}>تطبيق</button>
          <button type="button" className="button button-secondary" onClick={() => { setDateFrom(''); setDateTo(''); setAppliedDateFrom(''); setAppliedDateTo(''); }}>إعادة ضبط</button>
        </div>
        </FormSection>

        <FormSection title="ملخص حركة النقدية والبنك">
        <QueryFeedback
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          isEmpty={!totals}
          loadingText="جاري تحميل تقرير الحركة..."
          errorTitle="تعذر تحميل تقرير الحركة"
          emptyTitle="لا توجد بيانات"
        >
          {stats.length ? (
            <div className="reports-workspace">
              <div className="reports-spotlight-grid compact-spotlight-grid">
                {stats.map((stat) => (
                  <ReportMetricCard key={stat.key} label={stat.label as string} value={Number(stat.value) || 0} tone={stat.key === 'net' ? 'success' : 'primary'} />
                ))}
              </div>
            </div>
          ) : null}
        </QueryFeedback>
        </FormSection>

        <FormSection title="حسب الحساب">
        <DataTable
          data={accounts}
          getRowKey={(row) => row.accountCode}
          emptyMessage="لا توجد حركة نقدية في الفترة المحددة"
          columns={[
            { id: 'code', header: 'كود الحساب', sortable: true, sortValue: (row) => Number(row.accountCode || 0), render: (row) => row.accountCode },
            { id: 'name', header: 'اسم الحساب', sortable: true, sortValue: (row) => row.accountNameAr || '', render: (row) => row.accountNameAr || '-' },
            { id: 'debit', header: 'إجمالي الداخل', align: 'end', sortable: true, sortValue: (row) => row.debit, render: (row) => formatCurrency(Number(row.debit || 0)) },
            { id: 'credit', header: 'إجمالي الخارج', align: 'end', sortable: true, sortValue: (row) => row.credit, render: (row) => formatCurrency(Number(row.credit || 0)) },
            { id: 'net', header: 'الصافي', align: 'end', sortable: true, sortValue: (row) => row.net, render: (row) => formatCurrency(Number(row.net || 0)) },
          ]}
          defaultSort={{ columnId: 'code', direction: 'asc' }}
        />
        </FormSection>

        <FormSection title="حسب نوع الحركة">
        <DataTable
          data={sources}
          getRowKey={(row) => row.sourceType}
          emptyMessage="لا توجد حركات حسب النوع"
          columns={[
            { id: 'source', header: 'نوع الحركة', sortable: true, sortValue: (row) => sourceLabel(row.sourceType), render: (row) => sourceLabel(row.sourceType) },
            { id: 'debit', header: 'داخل', align: 'end', sortable: true, sortValue: (row) => row.debit, render: (row) => formatCurrency(Number(row.debit || 0)) },
            { id: 'credit', header: 'خارج', align: 'end', sortable: true, sortValue: (row) => row.credit, render: (row) => formatCurrency(Number(row.credit || 0)) },
            { id: 'net', header: 'الصافي', align: 'end', sortable: true, sortValue: (row) => row.net, render: (row) => formatCurrency(Number(row.net || 0)) },
          ]}
          defaultSort={{ columnId: 'net', direction: 'desc' }}
        />
        </FormSection>
        <div className="muted" style={{ paddingInline: '24px' }}>صافي حركة النقدية خلال الفترة وليس رصيدًا نهائيًا.</div>
      </main>
    </div>
  );
}
