import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DataTable } from '@/shared/components/data-table';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { FormSection } from '@/shared/components/form-section';
import { accountingApi, type AccountingAccount } from '@/features/accounting/api/accounting.api';
import { AccountingAccountForm } from '../components/AccountingAccountForm';

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
  const queryClient = useQueryClient();
  const [showInactive, setShowInactive] = useState(false);
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formParentAccount, setFormParentAccount] = useState<AccountingAccount | undefined>();
  const [formEditAccount, setFormEditAccount] = useState<AccountingAccount | undefined>();

  const query = useQuery({
    queryKey: ['accounting', 'accounts'],
    queryFn: () => accountingApi.accounts(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountingApi.deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting', 'accounts'] });
    },
    onError: (err: Error) => {
      alert(`تعذر الحذف: ${err.message}`);
    },
  });

  const rows = query.data?.accounts || [];
  const visibleRows = useMemo(() => {
    if (showInactive) return rows;
    return rows.filter((row) => row.isActive);
  }, [rows, showInactive]);

  const handleAddChild = (parent: AccountingAccount) => {
    setFormMode('create');
    setFormParentAccount(parent);
    setFormEditAccount(undefined);
    setFormOpen(true);
  };

  const handleEdit = (account: AccountingAccount) => {
    setFormMode('edit');
    setFormParentAccount(undefined);
    setFormEditAccount(account);
    setFormOpen(true);
  };

  const handleDelete = (account: AccountingAccount) => {
    if (confirm(`هل أنت متأكد من حذف الحساب "${account.nameAr}"؟`)) {
      deleteMutation.mutate(account.id);
    }
  };

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '80px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        <PageHeader title="شجرة الحسابات" badge={<span className="nav-pill">الأرصدة والبنود المالية</span>} />

        {/* Quick Shortcuts to Big Financial Statements */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => navigate('/accounting/balance-sheet')}
            style={{ fontWeight: 700, fontSize: '0.78rem', padding: '5px 12px', borderRadius: '8px' }}
          >
            الميزانية العمومية
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => navigate('/accounting/cash-flow')}
            style={{ fontWeight: 700, fontSize: '0.78rem', padding: '5px 12px', borderRadius: '8px' }}
          >
            قائمة التدفقات النقدية
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => navigate('/accounting/aged-debts')}
            style={{ fontWeight: 700, fontSize: '0.78rem', padding: '5px 12px', borderRadius: '8px' }}
          >
            أعمار الديون
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => navigate('/accounting/cheques')}
            style={{ fontWeight: 700, fontSize: '0.78rem', padding: '5px 12px', borderRadius: '8px' }}
          >
            حافظة الشيكات (PDC)
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => navigate('/accounting/withholding-tax')}
            style={{ fontWeight: 700, fontSize: '0.78rem', padding: '5px 12px', borderRadius: '8px' }}
          >
            الخصم والإضافة (ن41)
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => navigate('/accounting/cost-centers')}
            style={{ fontWeight: 700, fontSize: '0.78rem', padding: '5px 12px', borderRadius: '8px' }}
          >
            مراكز التكلفة
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => navigate('/accounting/journal-entries')}
            style={{ fontWeight: 700, fontSize: '0.78rem', padding: '5px 12px', borderRadius: '8px' }}
          >
            القيود اليومية
          </button>
        </div>
        
        <FormSection 
          title="شجرة الحسابات" 
          actions={
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(event) => setShowInactive(event.target.checked)}
                  style={{ width: 15, height: 15, accentColor: '#170e5e', cursor: 'pointer' }}
                />
                <span>عرض الحسابات غير النشطة</span>
              </label>
              <button 
                type="button" 
                className="btn btn-sm btn-primary"
                onClick={() => {
                  setFormMode('create');
                  setFormParentAccount(undefined);
                  setFormEditAccount(undefined);
                  setFormOpen(true);
                }}
                style={{ background: '#170e5e', border: 'none', fontWeight: 700, padding: '6px 14px', borderRadius: '8px', fontSize: '0.82rem' }}
              >
                + إضافة حساب رئيسي
              </button>
            </div>
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
            compact={true}
            density="compact"
            rowClassName={(row) => [!row.isActive ? 'table-row-inactive' : '', Number(row.depth || 0) === 0 ? 'table-row-root-account' : ''].filter(Boolean).join(' ')}
            defaultSort={{ columnId: 'code', direction: 'asc' }}
            columns={[
              {
                id: 'code',
                header: 'كود الحساب',
                render: (row) => (
                  <span style={{ fontWeight: 800, color: '#170e5e', fontFamily: 'monospace', fontSize: '0.84rem' }}>
                    {row.code}
                  </span>
                ),
                sortable: true,
                sortValue: (row) => Number(row.code || 0),
                width: 95,
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
                        gap: 6,
                        paddingInlineStart: `${depth * 16}px`,
                        fontWeight: depth === 0 ? 800 : depth === 1 ? 700 : 500,
                        color: depth === 0 ? '#0f172a' : '#1e293b',
                        fontSize: '0.82rem',
                      }}
                    >
                      {depth > 0 ? (
                        <span
                          aria-hidden
                          style={{
                            width: 10,
                            height: 1.5,
                            background: '#94a3b8',
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
                render: (row) => (
                  <span style={{ fontSize: '0.76rem', color: '#475569', fontWeight: 600 }}>
                    {groupLabel[row.accountGroup] || row.accountGroup || '-'}
                  </span>
                ),
                sortable: true,
                sortValue: (row) => groupLabel[row.accountGroup] || row.accountGroup || '',
                width: 120,
              },
              {
                id: 'type',
                header: 'النوع',
                render: (row) => (
                  <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#334155', padding: '2px 7px', borderRadius: '4px', fontWeight: 600 }}>
                    {typeLabel[row.accountType] || row.accountType}
                  </span>
                ),
                sortable: true,
                sortValue: (row) => typeLabel[row.accountType] || row.accountType || '',
                width: 85,
              },
              {
                id: 'normalBalance',
                header: 'الرصيد الطبيعي',
                render: (row) => (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      background: row.normalBalance === 'debit' ? '#eff6ff' : '#f0fdf4',
                      color: row.normalBalance === 'debit' ? '#1d4ed8' : '#15803d',
                      border: `1px solid ${row.normalBalance === 'debit' ? '#bfdbfe' : '#bbf7d0'}`,
                      padding: '1px 7px',
                      borderRadius: '4px',
                      fontWeight: 700,
                    }}
                  >
                    {balanceLabel[row.normalBalance] || row.normalBalance}
                  </span>
                ),
                sortable: true,
                sortValue: (row) => balanceLabel[row.normalBalance] || row.normalBalance || '',
                width: 90,
              },
              {
                id: 'flags',
                header: 'الخصائص',
                render: (row) => {
                  const flags = renderFlags(row);
                  return flags.length ? (
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                      {flags.join(' • ')}
                    </span>
                  ) : (
                    <span style={{ color: '#cbd5e1' }}>-</span>
                  );
                },
              },
              {
                id: 'status',
                header: 'الحالة',
                render: (row) =>
                  row.isActive ? (
                    <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                      نشط
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#94a3b8', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                      معطل
                    </span>
                  ),
                sortable: true,
                sortValue: (row) => (row.isActive ? 1 : 0),
                width: 75,
              },
              {
                id: 'actions',
                header: '',
                render: (row) => (
                  <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end', whiteSpace: 'nowrap' }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => handleAddChild(row)}
                      style={{ padding: '3px 8px', fontSize: '0.72rem', fontWeight: 700, borderRadius: '6px', height: '26px' }}
                    >
                      تفريع
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => handleEdit(row)}
                      style={{ padding: '3px 8px', fontSize: '0.72rem', fontWeight: 700, borderRadius: '6px', height: '26px' }}
                    >
                      تعديل
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-danger" 
                      onClick={() => handleDelete(row)}
                      disabled={row.isSystem}
                      style={{ padding: '3px 8px', fontSize: '0.72rem', fontWeight: 700, borderRadius: '6px', height: '26px' }}
                    >
                      حذف
                    </button>
                  </div>
                ),
                sortable: false,
                width: 150,
              },
            ]}
          />
        </QueryFeedback>
        </FormSection>
      </main>
      
      {formOpen && (
        <AccountingAccountForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          mode={formMode}
          parentAccount={formParentAccount}
          editAccount={formEditAccount}
        />
      )}
    </div>
  );
}
