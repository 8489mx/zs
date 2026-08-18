import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { SubmitButton } from '@/shared/components/submit-button';
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

export function AccountingAccountForm({
  open,
  onClose,
  mode,
  parentAccount,
  editAccount,
}: AccountingAccountFormProps) {
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
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

  return (
    <DialogShell open={open} onClose={onClose} width="min(600px, 100%)" ariaLabel="نموذج الحساب">
      <div className="dialog-card" style={{ background: '#ffffff', borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="section-title" style={{ margin: 0, paddingBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
          <div className="section-heading-copy">
            <h3 style={{ margin: 0 }}>
              {mode === 'create' ? (parentAccount ? `إضافة حساب فرعي تحت (${parentAccount.nameAr})` : 'إضافة حساب جديد') : 'تعديل الحساب'}
            </h3>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {error && (
            <div className="alert alert-danger" style={{ padding: '12px 16px', background: '#fee2e2', color: '#991b1b', borderRadius: 8, fontSize: '0.9rem' }}>
              {error instanceof Error ? error.message : 'حدث خطأ غير متوقع.'}
            </div>
          )}

          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="field">
              <label>
                <span>كود الحساب</span>
                <input
                  type="text"
                  {...register('code', { required: 'مطلوب' })}
                  dir="ltr"
                  data-autofocus
                  disabled={mode === 'edit' && editAccount?.isControlAccount}
                />
              </label>
              {errors.code && <div className="muted small" style={{ color: '#dc2626' }}>{errors.code.message}</div>}
              {generateCodeQuery.isFetching && <div className="muted small">جاري توليد الكود...</div>}
            </div>

            <div className="field">
              <label>
                <span>الاسم (عربي)</span>
                <input
                  type="text"
                  {...register('nameAr', { required: 'مطلوب' })}
                />
              </label>
              {errors.nameAr && <div className="muted small" style={{ color: '#dc2626' }}>{errors.nameAr.message}</div>}
            </div>
          </div>

          <div className="field">
            <label>
              <span>الاسم (إنجليزي) - اختياري</span>
              <input
                type="text"
                {...register('nameEn')}
                dir="ltr"
              />
            </label>
          </div>

          {mode === 'create' && !parentAccount && (
            <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr 1fr' }}>
              <div className="field">
                <label>
                  <span>النوع</span>
                  <select {...register('accountType', { required: 'مطلوب' })}>
                    <option value="asset">أصل</option>
                    <option value="liability">خصم</option>
                    <option value="equity">حقوق ملكية</option>
                    <option value="revenue">إيراد</option>
                    <option value="expense">مصروف</option>
                    <option value="contra_asset">أصل عكسي</option>
                    <option value="contra_revenue">إيراد عكسي</option>
                  </select>
                </label>
              </div>

              <div className="field">
                <label>
                  <span>الرصيد الطبيعي</span>
                  <select {...register('normalBalance', { required: 'مطلوب' })}>
                    <option value="debit">مدين</option>
                    <option value="credit">دائن</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          <div className="field" style={{ marginTop: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" {...register('isActive')} style={{ width: 18, height: 18, margin: 0 }} />
              <span style={{ margin: 0, fontWeight: 500 }}>حساب نشط</span>
            </label>
            <div className="muted small" style={{ marginInlineStart: 30 }}>قم بإلغاء تنشيط الحساب بدلاً من حذفه إذا كان يحتوي على حركات سابقة.</div>
          </div>

          <div className="actions" style={{ marginTop: 12, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isPending}>
              إلغاء
            </button>
            <SubmitButton idleText="حفظ الحساب" pendingText="جاري الحفظ..." isPending={isPending} />
          </div>
        </form>
      </div>
    </DialogShell>
  );
}
