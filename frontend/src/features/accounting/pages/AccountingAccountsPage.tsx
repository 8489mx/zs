import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DataTable } from '@/shared/components/data-table';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { FormSection } from '@/shared/components/form-section';
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
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px' }}>
        <PageHeader title="الحسابات" description="شجرة الحسابات (شاملة الأرصدة والبنود المالية الأساسية للشركة)" />
        
        <FormSection 
          title="شجرة الحسابات" 
          actions={
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem', color: '#64748b' }}>
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(event) => setShowInactive(event.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              <span>عرض الحسابات غير النشطة</span>
            </label>
          }
        >
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
            data={visibleRows}
            getRowKey={(row) => row.id}
            rowClassName={(row) => [!row.isActive ? 'table-row-inactive' : '', Number(row.depth || 0) === 0 ? 'table-row-root-account' : ''].filter(Boolean).join(' ')}
            defaultSort={{ columnId: 'code', direction: 'asc' }}
            columns={[
              {
                id: 'code',
                header: 'كود الحساب',
                render: (row) => row.code,
                sortable: true,
                sortValue: (row) => Number(row.code || 0),
              },
              {
                id: 'nameAr',
                header: 'اسم الحساب',
                render: (row) => {
                  const depth = Math.max(0, Number(row.depth || 0));
                  return (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        paddingInlineStart: `${depth * 18}px`,
                        fontWeight: depth === 0 ? 700 : 500,
                      }}
                    >
                      {depth > 0 ? (
                        <span
                          aria-hidden
                          style={{
                            width: 12,
                            height: 1,
                            background: 'currentColor',
                            opacity: 0.35,
                            display: 'inline-block',
                          }}
                        />
                      ) : null}
                      <span>{row.nameAr}</span>
                    </span>
                  );
                },
                sortable: true,
                sortValue: (row) => row.nameAr || '',
              },
              {
                id: 'group',
                header: 'المجموعة',
                render: (row) => groupLabel[row.accountGroup] || row.accountGroup || '-',
                sortable: true,
                sortValue: (row) => groupLabel[row.accountGroup] || row.accountGroup || '',
              },
              {
                id: 'type',
                header: 'النوع',
                render: (row) => typeLabel[row.accountType] || row.accountType,
                sortable: true,
                sortValue: (row) => typeLabel[row.accountType] || row.accountType || '',
              },
              {
                id: 'normalBalance',
                header: 'الرصيد الطبيعي',
                render: (row) => balanceLabel[row.normalBalance] || row.normalBalance,
                sortable: true,
                sortValue: (row) => balanceLabel[row.normalBalance] || row.normalBalance || '',
              },
              { id: 'flags', header: 'خصائص', render: (row) => renderFlags(row).join(' • ') || '-' },
              {
                id: 'status',
                header: 'الحالة',
                render: (row) => (row.isActive ? 'نشط' : <span className="muted"><strong>غير نشط</strong></span>),
                sortable: true,
                sortValue: (row) => (row.isActive ? 1 : 0),
              },
            ]}
          />
        </QueryFeedback>
        </FormSection>
      </main>
    </div>
  );
}
