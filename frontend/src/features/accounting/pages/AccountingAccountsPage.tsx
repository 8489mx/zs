import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Card } from '@/shared/ui/card';
import { DataTable } from '@/shared/ui/data-table';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { accountingApi, type AccountingAccount } from '@/features/accounting/api/accounting.api';

const typeLabel: Record<string, string> = {
  asset: 'أصل',
  liability: 'التزام',
  equity: 'حقوق ملكية',
  revenue: 'إيراد',
  expense: 'مصروف',
  contra_asset: 'مقابل أصل',
  contra_revenue: 'مقابل إيراد',
};

const balanceLabel: Record<string, string> = {
  debit: 'مدين',
  credit: 'دائن',
};

export function AccountingAccountsPage() {
  const query = useQuery({
    queryKey: ['accounting', 'accounts'],
    queryFn: () => accountingApi.accounts(),
  });

  const rows = query.data?.accounts || [];

  return (
    <div className="page-stack page-shell">
      <PageHeader title="الحسابات" description="شجرة الحسابات" />
      <Card title="شجرة الحسابات">
        <QueryFeedback
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          isEmpty={!rows.length}
          loadingText="جاري تحميل شجرة الحسابات..."
          errorTitle="تعذر تحميل شجرة الحسابات"
          emptyTitle="لا توجد حسابات"
        >
          <DataTable<AccountingAccount>
            rows={rows}
            rowKey={(row) => row.id}
            columns={[
              { key: 'code', header: 'كود الحساب', cell: (row) => row.code },
              { key: 'nameAr', header: 'اسم الحساب', cell: (row) => row.nameAr },
              { key: 'type', header: 'النوع', cell: (row) => typeLabel[row.accountType] || row.accountType },
              { key: 'normalBalance', header: 'الرصيد الطبيعي', cell: (row) => balanceLabel[row.normalBalance] || row.normalBalance },
              { key: 'status', header: 'الحالة', cell: (row) => (row.isActive ? 'نشط' : 'غير نشط') },
            ]}
          />
        </QueryFeedback>
      </Card>
    </div>
  );
}

