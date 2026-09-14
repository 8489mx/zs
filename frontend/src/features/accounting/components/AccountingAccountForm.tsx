import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { FileTextIcon, LayersIcon } from '@/shared/components/icons/AppIcons';
import { accountingApi, type AccountingAccount } from '../api/accounting.api';

interface AccountingAccountFormProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  parentAccount?: AccountingAccount;
  editAccount?: AccountingAccount;
}

type FormValues = {
  code: string;
  nameAr: string;
  nameEn: string;
  accountType: string;
  normalBalance: string;
  isActive: boolean;
};

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'asset', label: 'أصل (Assets)' },
  { value: 'liability', label: 'خصم / التزام (Liabilities)' },
  { value: 'equity', label: 'حقوق ملكية (Equity)' },
  { value: 'revenue', label: 'إيراد (Revenue)' },
  { value: 'expense', label: 'مصروف (Expenses)' },
  { value: 'contra_asset', label: 'أصل عكسي (Contra Asset)' },
  { value: 'contra_revenue', label: 'إيراد عكسي (Contra Revenue)' },
];

const NORMAL_BALANCE_OPTIONS = [
  { value: 'debit', label: 'مدين (Debit)' },
  { value: 'credit', label: 'دائن (Credit)' },
];

export function AccountingAccountForm({
  open,
  onClose,
  mode,
  parentAccount,
  editAccount,
}: AccountingAccountFormProps) {
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      code: '',
      nameAr: '',
      nameEn: '',
      accountType: 'asset',
      normalBalance: 'debit',
      isActive: true,
    },
  });

  const generateCodeQuery = useQuery({
    queryKey: ['accounting', 'generate-code', parentAccount?.id],
    queryFn: () => parentAccount ? accountingApi.generateNextAccountCode(Number(parentAccount.id)) : Promise.resolve({ code: '' }),
    enabled: open && mode === 'create' && !!parentAccount,
  });

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && editAccount) {
        reset({
          code: editAccount.code,
          nameAr: editAccount.nameAr,
          nameEn: editAccount.nameEn || '',
          accountType: editAccount.accountType,
          normalBalance: editAccount.normalBalance,
          isActive: editAccount.isActive,
        });
      } else if (mode === 'create') {
        reset({
          code: '',
          nameAr: '',
          nameEn: '',
          accountType: parentAccount?.accountType || 'asset',
          normalBalance: parentAccount?.normalBalance || 'debit',
          isActive: true,
        });
      }
    }
  }, [open, mode, editAccount, parentAccount, reset]);

  useEffect(() => {
    if (open && mode === 'create' && parentAccount && generateCodeQuery.data?.code) {
      setValue('code', generateCodeQuery.data.code);
    }
  }, [open, mode, parentAccount, generateCodeQuery.data, setValue]);

  const createMutation = useMutation({
    mutationFn: (data: FormValues) =>
      accountingApi.createAccount({
        ...data,
        parentId: parentAccount ? (Number(parentAccount.id) as any) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting', 'accounts'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormValues) => {
      if (!editAccount) throw new Error('No account to edit');
      return accountingApi.updateAccount(editAccount.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting', 'accounts'] });
      onClose();
    },
  });

  const onSubmit = (data: FormValues) => {
    if (mode === 'create') {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  const dialogTitle = mode === 'create'
    ? (parentAccount ? `إضافة حساب فرعي تحت (${parentAccount.nameAr})` : 'إضافة حساب رئيسي جديد')
    : `تعديل الحساب: ${editAccount?.nameAr || ''}`;

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={dialogTitle}
      subtitle="تحديد الكود المحاسبي والاسم والتصنيف في الدليل المحاسبي"
      size="md"
    >
      <form id="accounting-account-form" onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {error && (
          <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '12.5px' }}>
            {error instanceof Error ? error.message : 'حدث خطأ غير متوقع.'}
          </div>
        )}

        {/* Card 1: Account Identification */}
        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '10px',
          padding: '14px 16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
            <FileTextIcon size={15} style={{ color: '#170e5e' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>بيانات الحساب والرمز</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                كود الحساب <span style={{ color: '#e11d48' }}>*</span>
              </label>
              <input
                type="text"
                {...register('code', { required: 'مطلوب' })}
                dir="ltr"
                disabled={mode === 'edit' && editAccount?.isControlAccount}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', fontFamily: 'monospace', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
              />
              {errors.code && <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '2px' }}>{errors.code.message}</div>}
              {generateCodeQuery.isFetching && <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>جاري توليد الكود...</div>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                اسم الحساب (عربي) <span style={{ color: '#e11d48' }}>*</span>
              </label>
              <input
                type="text"
                {...register('nameAr', { required: 'مطلوب' })}
                placeholder="مثال: البنك الأهلي المصري، مصروفات الصيانة..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
              />
              {errors.nameAr && <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '2px' }}>{errors.nameAr.message}</div>}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              الاسم (إنجليزي) - اختياري
            </label>
            <input
              type="text"
              {...register('nameEn')}
              dir="ltr"
              placeholder="e.g. Cash in Bank"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Card 2: Accounting Type & Classification */}
        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '10px',
          padding: '14px 16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
            <LayersIcon size={15} style={{ color: '#170e5e' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>التصنيف المحاسبي والرصيد</span>
          </div>

          {mode === 'create' && !parentAccount && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  نوع الحساب
                </label>
                <Controller
                  name="accountType"
                  control={control}
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value}
                      onChange={field.onChange}
                      options={ACCOUNT_TYPE_OPTIONS}
                    />
                  )}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  الرصيد الطبيعي
                </label>
                <Controller
                  name="normalBalance"
                  control={control}
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value}
                      onChange={field.onChange}
                      options={NORMAL_BALANCE_OPTIONS}
                    />
                  )}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <input
              type="checkbox"
              id="accountIsActive"
              {...register('isActive')}
              style={{ width: '16px', height: '16px', accentColor: '#170e5e' }}
            />
            <label htmlFor="accountIsActive" style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
              حساب نشط ومتاح لإدراج القيود
            </label>
          </div>
        </div>
      </form>

      <StandardDialogFooter>
        <Button type="button" variant="secondary" onClick={onClose} disabled={isPending} style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '8px' }}>
          إلغاء
        </Button>
        <Button
          type="submit"
          form="accounting-account-form"
          disabled={isPending}
          style={{
            backgroundColor: '#170e5e',
            color: '#ffffff',
            padding: '8px 22px',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? 'جاري الحفظ...' : 'حفظ الحساب'}
        </Button>
      </StandardDialogFooter>
    </StandardDialog>
  );
}
