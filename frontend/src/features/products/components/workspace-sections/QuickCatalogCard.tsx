import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { invalidateCatalogDomain } from '@/app/query-invalidation';
import { productsApi } from '@/features/products/api/products.api';

export function QuickCatalogCard({ canManageSuppliers }: { canManageSuppliers: boolean }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [categoryName, setCategoryName] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');

  const categoryMutation = useMutation({
    mutationFn: async () => {
      const name = categoryName.trim();
      if (!name) throw new Error('اكتب اسم القسم');
      return productsApi.createCategory({ name });
    },
    onSuccess: async () => {
      setCategoryName('');
      await invalidateCatalogDomain(queryClient, { includeCategories: true });
    }
  });

  const supplierMutation = useMutation({
    mutationFn: async () => {
      const name = supplierName.trim();
      if (!name) throw new Error('اكتب اسم المورد');
      return productsApi.createSupplier({ name, phone: supplierPhone.trim(), address: '', balance: 0, notes: '' });
    },
    onSuccess: async () => {
      setSupplierName('');
      setSupplierPhone('');
      await invalidateCatalogDomain(queryClient, { includeSuppliers: true });
    }
  });

  return (
    <FormSection title={t('products.workspace_sections.quick_catalog_card.s0', "إضافة قسم / مورد من نفس تبويب الأصناف")} actions={<span className="nav-pill">{t('products.workspace_sections.quick_catalog_card.s1', "مباشر من شاشة الأصناف")}</span>} className="workspace-panel">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
        {/* Category Form */}
        <div className="page-stack" style={{ gap: '12px' }}>
          <strong style={{ fontSize: '14px' }}>{t('products.workspace_sections.quick_catalog_card.s2', "إضافة قسم جديد")}</strong>
          <Field label={t('products.workspace_sections.quick_catalog_card.s3', "اسم القسم")}>
            <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder={t('products.workspace_sections.quick_catalog_card.s4', "اكتب اسم القسم هنا...")} disabled={categoryMutation.isPending} />
          </Field>
          <div className="actions" style={{ justifyContent: 'flex-start', marginTop: '4px' }}>
            <Button type="button" onClick={() => categoryMutation.mutate()} disabled={categoryMutation.isPending}>{t('products.workspace_sections.quick_catalog_card.s5', "إضافة قسم")}</Button>
          </div>
          <MutationFeedback isError={categoryMutation.isError} error={categoryMutation.error} errorFallback={t('products.workspace_sections.quick_catalog_card.s6', "تعذر إضافة القسم")} />
          <MutationFeedback isSuccess={categoryMutation.isSuccess} successText={t('products.workspace_sections.quick_catalog_card.s7', "تمت إضافة القسم بنجاح.")} />
        </div>

        {/* Supplier Form */}
        <div className="page-stack" style={{ gap: '12px' }}>
          <strong style={{ fontSize: '14px' }}>{t('products.workspace_sections.quick_catalog_card.s8', "إضافة مورد جديد")}</strong>
          <div className="form-grid">
            <Field label={t('products.workspace_sections.quick_catalog_card.s9', "اسم المورد")}>
              <input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} placeholder={t('products.workspace_sections.quick_catalog_card.s10', "اسم المورد")} disabled={supplierMutation.isPending || !canManageSuppliers} />
            </Field>
            <Field label={t('products.workspace_sections.quick_catalog_card.s11', "هاتف المورد (اختياري)")}>
              <input value={supplierPhone} onChange={(event) => setSupplierPhone(event.target.value)} placeholder={t('products.workspace_sections.quick_catalog_card.s12', "رقم التليفون")} disabled={supplierMutation.isPending || !canManageSuppliers} />
            </Field>
          </div>
          <div className="actions" style={{ justifyContent: 'flex-start', marginTop: '4px' }}>
            <Button type="button" onClick={() => supplierMutation.mutate()} disabled={supplierMutation.isPending || !canManageSuppliers}>{t('products.workspace_sections.quick_catalog_card.s13', "إضافة مورد")}</Button>
          </div>
          {!canManageSuppliers ? <div className="muted small">{t('products.workspace_sections.quick_catalog_card.s14', "صلاحية إضافة مورد جديد غير متاحة لهذا الحساب.")}</div> : null}
          <MutationFeedback isError={supplierMutation.isError} error={supplierMutation.error} errorFallback={t('products.workspace_sections.quick_catalog_card.s15', "تعذر إضافة المورد")} />
          <MutationFeedback isSuccess={supplierMutation.isSuccess} successText={t('products.workspace_sections.quick_catalog_card.s16', "تمت إضافة المورد بنجاح.")} />
        </div>
      </div>
    </FormSection>
  );
}
