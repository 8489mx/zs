import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { useAddShipmentItemMutation } from './api/shipments.api';
import { useProductsQuery } from '@/shared/hooks/use-catalog-queries';
import { SearchableCombobox } from '@/shared/ui/searchable-combobox';
import { MutationFeedback } from '@/shared/components/mutation-feedback';

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
    onClose();
  };

  return (
    <DialogShell open={open} onClose={onClose} width="400px">
      <div style={{ padding: '24px' }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 'bold' }}>إضافة صنف للحاوية</h2>
        <form onSubmit={form.handleSubmit(onSubmit)} className="form-grid" dir="rtl">
        <Field label="الصنف" error={form.formState.errors.productId?.message}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <SearchableCombobox
                value={form.watch('productId')}
                onChange={(val) => form.setValue('productId', val, { shouldValidate: true })}
                options={(products || []).map(p => ({ id: p.id, label: p.name }))}
                search={(option, query) => (option.label || '').toLowerCase().includes(query.toLowerCase())}
                getLabel={(option) => option.label || ''}
                onSelect={() => {}}
                placeholder="ابحث عن صنف..."
                emptyLabel="بدون صنف"
                disabled={mutation.isPending}
              />
            </div>
            <Button type="button" variant="secondary" onClick={() => window.open('#/products/new', '_blank')} disabled={mutation.isPending}>
              إضافة +
            </Button>
          </div>
        </Field>
        
        <Field label="الكمية" error={form.formState.errors.quantity?.message}>
          <input type="number" {...form.register('quantity')} disabled={mutation.isPending} />
        </Field>

        <Field label="سعر الشراء للمنتج (بالدولار)" error={form.formState.errors.factoryUnitPriceUsd?.message}>
          <input type="number" step="0.01" {...form.register('factoryUnitPriceUsd')} disabled={mutation.isPending} />
        </Field>

        <MutationFeedback isError={mutation.isError} isSuccess={mutation.isSuccess} error={mutation.error} />
        
        <div className="actions" style={{ gridColumn: 'span 2' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={mutation.isPending}>إلغاء</Button>
          <Button type="submit" variant="primary" disabled={mutation.isPending}>إضافة</Button>
        </div>
      </form>
      </div>
    </DialogShell>
  );
}
