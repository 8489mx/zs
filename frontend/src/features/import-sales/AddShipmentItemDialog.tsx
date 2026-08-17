import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
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
    <DialogShell open={open} onClose={onClose} width="700px">
      <div style={{ padding: '32px' }}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ background: 'var(--primary-100)', color: 'var(--primary-700)', padding: '6px 10px', borderRadius: '8px' }}>+</span>
          إضافة صنف للحاوية
        </h2>
        <form onSubmit={form.handleSubmit(onSubmit)} dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <Field label="الكمية الواردة" error={form.formState.errors.quantity?.message}>
            <input type="number" {...form.register('quantity')} disabled={mutation.isPending} style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbe2ea', borderRadius: '8px', fontSize: '15px', outline: 'none', transition: 'border 0.2s', background: 'var(--surface-color)' }} />
          </Field>

          <Field label="سعر الشراء الفعلي (بالدولار $)" error={form.formState.errors.factoryUnitPriceUsd?.message}>
            <input type="number" step="0.01" {...form.register('factoryUnitPriceUsd')} disabled={mutation.isPending} style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbe2ea', borderRadius: '8px', fontSize: '15px', outline: 'none', transition: 'border 0.2s', background: 'var(--surface-color)' }} />
          </Field>
        </div>

        <MutationFeedback isError={mutation.isError} isSuccess={mutation.isSuccess} error={mutation.error} />
        
        <div className="actions" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={mutation.isPending}>إلغاء</Button>
          <Button type="submit" variant="primary" disabled={mutation.isPending}>إضافة</Button>
        </div>
      </form>
      </div>
    </DialogShell>

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
