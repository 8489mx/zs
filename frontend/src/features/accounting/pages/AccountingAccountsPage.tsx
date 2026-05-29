import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Card } from '@/shared/ui/card';
import { DataTable } from '@/shared/ui/data-table';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { accountingApi, type AccountingAccount } from '@/features/accounting/api/accounting.api';

const typeLabel: Record<string, string> = {
  asset: 'أصل',
  contra_asset: 'أصل عكسي',
  liability: 'خصم',
  equity: 'حقوق ملكية',
  revenue: 'إيراد',
  contra_revenue: 'إيراد عكسي',
  expense: 'مصروف',
};

const balanceLabel: Record<string, string> = {
  debit: 'مدين',
  credit: 'دائن',
};

const groupLabel: Record<string, string> = {
  current_assets: 'أصول متداولة',
  fixed_assets: 'أصول ثابتة',
  current_liabilities: 'خصوم متداولة',
  equity: 'حقوق ملكية',
  income: 'إيرادات',
  cogs: 'تكلفة البضاعة',
  operating_expenses: 'مصروفات تشغيلية',
  tax: 'ضريبة',
  cash_bank: 'نقدية وبنك',
  receivable: 'عملاء',
  payable: 'موردون',
  inventory: 'مخزون',
};

function renderFlags(account: AccountingAccount): string[] {
  const labels: string[] = [];
  if (account.flags.isCashBank) labels.push('نقدية/بنك');
  if (account.flags.isReceivable) labels.push('عملاء');
  if (account.flags.isPayable) labels.push('موردون');
  if (account.flags.isInventory) labels.push('مخزون');
  if (account.flags.isTax) labels.push('ضريبة');
  if (account.isControlAccount) labels.push('حساب رقابي');
  if (account.isSystem) labels.push('نظامي');
  return labels;
}

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
          emptyTitle="لا توجد حسابات حتى الآن. سيتم إنشاء شجرة الحسابات الافتراضية من إعدادات النظام."
        >
          <DataTable<AccountingAccount>
            rows={rows}
            rowKey={(row) => row.id}
            columns={[
              { key: 'code', header: 'كود الحساب', cell: (row) => row.code },
              {
                key: 'nameAr',
                header: 'اسم الحساب',
                cell: (row) => <span style={{ paddingInlineStart: `${Math.max(0, Number(row.depth || 0)) * 16}px` }}>{row.nameAr}</span>,
              },
              { key: 'group', header: 'المجموعة', cell: (row) => groupLabel[row.accountGroup] || row.accountGroup || '-' },
              { key: 'type', header: 'النوع', cell: (row) => typeLabel[row.accountType] || row.accountType },
              { key: 'normalBalance', header: 'الرصيد الطبيعي', cell: (row) => balanceLabel[row.normalBalance] || row.normalBalance },
              { key: 'flags', header: 'خصائص', cell: (row) => renderFlags(row).join(' • ') || '-' },
              { key: 'status', header: 'الحالة', cell: (row) => (row.isActive ? 'نشط' : 'غير نشط') },
            ]}
          />
        </QueryFeedback>
      </Card>
    </div>
  );
}
