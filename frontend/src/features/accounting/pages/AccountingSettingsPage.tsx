import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Card } from '@/shared/ui/card';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { accountingApi } from '@/features/accounting/api/accounting.api';

type AccountRef = { id?: string; code?: string; nameAr?: string; nameEn?: string } | null;

function renderAccountRef(value: AccountRef) {
  if (!value) return '—';
  const code = String(value.code || '').trim();
  const nameAr = String(value.nameAr || '').trim();
  if (code && nameAr) return `${code} - ${nameAr}`;
  return code || nameAr || String(value.id || '—');
}

export function AccountingSettingsPage() {
  const query = useQuery({
    queryKey: ['accounting', 'settings'],
    queryFn: () => accountingApi.settings(),
  });

  const settings = (query.data?.settings || {}) as Record<string, AccountRef>;
  const rows = [
    { key: 'cashAccount', label: 'حساب الخزينة' },
    { key: 'bankAccount', label: 'حساب البنك' },
    { key: 'customerReceivableAccount', label: 'حساب العملاء' },
    { key: 'supplierPayableAccount', label: 'حساب الموردين' },
    { key: 'inventoryAccount', label: 'حساب المخزون' },
    { key: 'salesRevenueAccount', label: 'حساب إيرادات المبيعات' },
    { key: 'salesDiscountAccount', label: 'حساب خصومات المبيعات' },
    { key: 'cogsAccount', label: 'حساب تكلفة البضاعة المباعة' },
    { key: 'purchaseAccount', label: 'حساب المشتريات' },
    { key: 'expensesAccount', label: 'حساب المصروفات' },
    { key: 'salesTaxAccount', label: 'حساب ضريبة المبيعات' },
    { key: 'purchaseTaxAccount', label: 'حساب ضريبة المشتريات' },
  ];

  return (
    <div className="page-stack page-shell">
      <PageHeader title="الحسابات" description="إعدادات الحسابات" />
      <Card title="إعدادات الحسابات">
        <QueryFeedback
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          isEmpty={!query.data?.settings}
          loadingText="جاري تحميل إعدادات الحسابات..."
          errorTitle="تعذر تحميل إعدادات الحسابات"
          emptyTitle="لا توجد إعدادات حسابات"
        >
          <table className="table-shell">
            <thead>
              <tr>
                <th>الإعداد</th>
                <th>الحساب</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  <td>{renderAccountRef(settings[row.key])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </QueryFeedback>
      </Card>
    </div>
  );
}

