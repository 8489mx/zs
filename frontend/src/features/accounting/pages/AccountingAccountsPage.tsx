import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
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
  assets: 'أصول',
  current_assets: 'أصول متداولة',
  fixed_assets: 'أصول ثابتة',
  liabilities: 'خصوم',
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
  legacy: 'حسابات قديمة',
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
  const [showInactive, setShowInactive] = useState(false);
  const query = useQuery({
    queryKey: ['accounting', 'accounts'],
    queryFn: () => accountingApi.accounts(),
  });

  const rows = query.data?.accounts || [];
  const visibleRows = useMemo(() => {
    if (showInactive) return rows;
    return rows.filter((row) => row.isActive);
  }, [rows, showInactive]);

  return (
    <div className="page-stack page-shell">
      <PageHeader title="الحسابات" description="شجرة الحسابات" />
      <Card title="شجرة الحسابات">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(event) => setShowInactive(event.target.checked)}
              style={{ width: 18, minHeight: 18 }}
            />
            <span>عرض الحسابات غير النشطة</span>
          </label>
        </div>
        <QueryFeedback
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          isEmpty={!visibleRows.length}
          loadingText="جاري تحميل شجرة الحسابات..."
          errorTitle="تعذر تحميل شجرة الحسابات"
          emptyTitle="لا توجد حسابات حتى الآن. سيتم إنشاء شجرة الحسابات الافتراضية من إعدادات النظام."
        >
          <DataTable<AccountingAccount>
            rows={visibleRows}
            rowKey={(row) => row.id}
            rowClassName={(row) => (row.isActive ? undefined : 'table-row-inactive')}
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
              { key: 'status', header: 'الحالة', cell: (row) => (row.isActive ? 'نشط' : <span className="muted"><strong>غير نشط</strong></span>) },
            ]}
          />
        </QueryFeedback>
      </Card>
    </div>
  );
}
