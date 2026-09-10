import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { useAddShipmentItemMutation } from './api/shipments.api';
import { useProductsQuery } from '@/shared/hooks/use-catalog-queries';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { SearchableCombobox } from '@/shared/ui/searchable-combobox';
import { useState } from 'react';
import { QuickProductModal } from '@/shared/components/QuickProductModal';

const schema = z.object({
  productId: z.string().min(1, 'يجب اختيار صنف'),
  quantity: z.preprocess((val) => Number(val), z.number().min(1, 'الكمية يجب أن تكون أكبر من 0')),
  factoryUnitPriceUsd: z.preprocess((val) => Number(val), z.number().min(0, 'السعر يجب أن يكون 0 أو أكثر')),
});

type FormData = z.infer<typeof schema>;

export function AddShipmentItemDialog({ open, onClose, shipmentId }: { open: boolean, onClose: () => void, shipmentId: string }) {
  const { data: products } = useProductsQuery();
  
  const mutation = useAddShipmentItemMutation(shipmentId);
  
  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      productId: '',
      quantity: 1,
      factoryUnitPriceUsd: 0,
    }
  });

  const onSubmit = async (data: FormData) => {
    await mutation.mutateAsync(data);
    form.reset();
    setSearchTerm('');
    onClose();
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [isQuickProductOpen, setIsQuickProductOpen] = useState(false);
  const [quickProductName, setQuickProductName] = useState('');

  return (
    <>
    <StandardDialog
      open={open}
      onClose={onClose}
      title="إضافة صنف وبضاعة للحاوية"
      subtitle="اختيار الصنف وتحديد الكمية المستوردة وسعر الشراء بالدولار من المصنع."
      width="min(640px, 95vw)"
      footerActions={
        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={form.handleSubmit(onSubmit)}
          submitText={mutation.isPending ? 'جاري الإضافة...' : 'إضافة الصنف'}
          cancelText="إلغاء"
          isSubmitting={mutation.isPending}
        />
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} dir="rtl">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ width: '100%' }}>
            <Field label="الصنف (بحث بالاسم أو الكود / OEM)" error={form.formState.errors.productId?.message}>
              <SearchableCombobox
                placeholder="ابحث عن صنف..."
                value={searchTerm}
                onChange={setSearchTerm}
                options={products || []}
                search={(p, q) => 
                  (p.name || '').toLowerCase().includes(q.toLowerCase()) || 
                  (p.barcode || '').toLowerCase().includes(q.toLowerCase()) ||
                  (p.styleCode || '').toLowerCase().includes(q.toLowerCase())
                }
                getLabel={(p) => p.name}
                getMeta={(p) => p.barcode ? `OEM/كود: ${p.barcode}` : p.styleCode ? `Code: ${p.styleCode}` : ''}
                onSelect={(p) => {
                  form.setValue('productId', p.id, { shouldValidate: true });
                  setSearchTerm(p.name);
                }}
                onCreate={(query) => {
                  setQuickProductName(query);
                  setIsQuickProductOpen(true);
                }}
                createLabel={(query) => `+ تسجيل صنف جديد "${query}"`}
                disabled={mutation.isPending}
              />
            </Field>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <Field label="الكمية الواردة" error={form.formState.errors.quantity?.message}>
              <input 
                type="number" 
                {...form.register('quantity')} 
                disabled={mutation.isPending} 
                style={{ 
                  width: '100%', 
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '0 12px',
                  fontSize: '0.84rem',
                  background: '#ffffff',
                  color: '#0f172a',
                  boxSizing: 'border-box',
                  outline: 'none',
                }} 
              />
            </Field>

            <Field label="سعر الشراء الفعلي (بالدولار $)" error={form.formState.errors.factoryUnitPriceUsd?.message}>
              <input 
                type="number" 
                step="0.01" 
                {...form.register('factoryUnitPriceUsd')} 
                disabled={mutation.isPending} 
                style={{ 
                  width: '100%', 
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '0 12px',
                  fontSize: '0.84rem',
                  background: '#ffffff',
                  color: '#0f172a',
                  boxSizing: 'border-box',
                  outline: 'none',
                }} 
              />
            </Field>
          </div>

          <MutationFeedback isError={mutation.isError} isSuccess={mutation.isSuccess} error={mutation.error} />
        </div>
      </form>
    </StandardDialog>

    {isQuickProductOpen && (
      <QuickProductModal
        isOpen={isQuickProductOpen}
        onClose={() => setIsQuickProductOpen(false)}
        initialName={quickProductName}
        itemType="product"
        onSuccess={(product) => {
          form.setValue('productId', String(product.id), { shouldValidate: true });
          setSearchTerm(product.name);
          setIsQuickProductOpen(false);
        }}
      />
    )}
    </>
  );
}
