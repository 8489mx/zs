import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Field } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';
import { useCategoriesQuery, useLocationsQuery } from '@/shared/hooks/use-catalog-queries';
import { productsApi } from '@/features/products/api/products.api';
import { invalidateCatalogDomain } from '@/app/query-invalidation';
import type { Product } from '@/types/domain';

import { systemAlert } from '@/shared/components/system-alert';

const quickProductSchema = z.object({
  name: z.string().min(1, 'اسم الصنف مطلوب'),
  categoryId: z.string().optional(),
  warehouseId: z.string().optional().or(z.literal('')),
  unitType: z.enum(['piece', 'kg', 'liter', 'gram', 'meter']),
  costPrice: z.number().min(0, 'التكلفة يجب أن تكون 0 أو أكثر'),
  stock: z.number().min(0, 'المخزون يجب أن يكون 0 أو أكثر').optional(),
  retailPrice: z.number().min(0, 'سعر البيع يجب أن تكون 0 أو أكثر'),
  wholesalePrice: z.number().min(0, 'سعر الجملة يجب أن يكون 0 أو أكثر'),
  minStock: z.number().min(0, 'الحد الأدنى يجب أن يكون 0 أو أكثر'),
});

type QuickProductInput = z.infer<typeof quickProductSchema>;

interface QuickProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName?: string;
  itemType: 'product' | 'raw_material';
  onSuccess: (product: Product) => void;
}

export function QuickProductModal({ isOpen, onClose, initialName = '', itemType, onSuccess }: QuickProductModalProps) {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useCategoriesQuery();
  const { data: locations = [] } = useLocationsQuery();

  const { register, handleSubmit, formState: { errors }, reset, setValue, getValues } = useForm<QuickProductInput>({
    resolver: zodResolver(quickProductSchema),
    defaultValues: {
      name: initialName,
      categoryId: '',
      warehouseId: '',
      unitType: itemType === 'product' ? 'piece' : 'kg',
      costPrice: 0,
      stock: 0,
      retailPrice: 0,
      wholesalePrice: 0,
      minStock: 0,
    }
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        name: initialName,
        categoryId: '',
        warehouseId: locations.length === 1 ? String(locations[0].id) : '',
        unitType: itemType === 'product' ? 'piece' : 'kg',
        costPrice: 0,
        stock: 0,
        retailPrice: 0,
        wholesalePrice: 0,
        minStock: 0,
      });
    }
  }, [isOpen, initialName, reset, locations]);

  useEffect(() => {
    if (locations.length === 1 && !getValues('warehouseId')) {
      setValue('warehouseId', String(locations[0].id), { shouldValidate: true });
    }
  }, [locations, setValue, getValues]);

  const mutation = useMutation({
    mutationFn: async (data: QuickProductInput) => {
      let units = [];
      if (data.unitType === 'kg') {
        units = [
          { name: 'كيلوجرام', multiplier: 1, isBaseUnit: true, isSaleUnit: itemType === 'product', isPurchaseUnit: true },
          { name: 'جرام', multiplier: 0.001, isBaseUnit: false, isSaleUnit: itemType === 'product', isPurchaseUnit: false }
        ];
      } else if (data.unitType === 'liter') {
        units = [
          { name: 'لتر', multiplier: 1, isBaseUnit: true, isSaleUnit: itemType === 'product', isPurchaseUnit: true },
          { name: 'ملي', multiplier: 0.001, isBaseUnit: false, isSaleUnit: itemType === 'product', isPurchaseUnit: false }
        ];
      } else if (data.unitType === 'gram') {
        units = [{ name: 'جرام', multiplier: 1, isBaseUnit: true, isSaleUnit: itemType === 'product', isPurchaseUnit: true }];
      } else if (data.unitType === 'meter') {
        units = [{ name: 'متر', multiplier: 1, isBaseUnit: true, isSaleUnit: itemType === 'product', isPurchaseUnit: true }];
      } else {
        units = [{ name: 'قطعة', multiplier: 1, isBaseUnit: true, isSaleUnit: itemType === 'product', isPurchaseUnit: true }];
      }

      const { unitType, ...restData } = data;

      const payload = {
        ...restData,
        categoryId: data.categoryId ? Number(data.categoryId) : undefined,
        warehouseId: data.warehouseId ? String(data.warehouseId) : undefined,
        itemType,
        units
      };
      return productsApi.create(payload) as Promise<{ id: number; products?: Product[] }>;
    },
    onSuccess: (res, variables) => {
      invalidateCatalogDomain(queryClient);
      const newProduct = {
        id: String(res.id),
        name: variables.name,
        itemType,
        barcode: '',
        styleCode: '',
        categoryId: variables.categoryId ? String(variables.categoryId) : '',
      } as unknown as Product;
      onSuccess(newProduct);
      reset();
      onClose();
    },
    onError: () => {
      systemAlert('حدث خطأ أثناء حفظ الصنف. تأكد من صحة البيانات.');
    }
  });

  if (!isOpen) return null;

  return (
    <DialogShell 
      open={isOpen} 
      onClose={onClose}
    >
      <div style={{ padding: '16px 16px 0', borderBottom: '1px solid #e5e7eb', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, paddingBottom: '16px' }}>
          {itemType === 'product' ? 'إضافة منتج سريع' : 'إضافة مادة خام سريعة'}
        </h2>
      </div>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d as QuickProductInput))} style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '400px', padding: '0 16px 16px' }}>
        <Field label="اسم الصنف" error={errors.name?.message}>
          <input 
            type="text" 
            className="purchase-prototype-input" 
            {...register('name')} 
            autoFocus
          />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Field label="المخزن (موقع التخزين)" error={errors.warehouseId?.message}>
            <select className="purchase-prototype-input" {...register('warehouseId')} disabled={locations.length === 1}>
              {locations.length !== 1 && <option value="">اختر المخزن...</option>}
              {locations.map(loc => (
                <option key={loc.id} value={String(loc.id)}>{loc.name}</option>
              ))}
            </select>
          </Field>
          <Field label="القسم (اختياري)">
            <select className="purchase-prototype-input" {...register('categoryId')}>
              <option value="">بدون قسم</option>
              {categories.map(c => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Field label="وحدة القياس">
            <select className="purchase-prototype-input" {...register('unitType')}>
              <option value="piece">قطعة</option>
              <option value="kg">كيلوجرام (ويشمل جرام)</option>
              <option value="liter">لتر (ويشمل ملي)</option>
              <option value="gram">جرام فقط</option>
              <option value="meter">متر</option>
            </select>
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Field label="سعر الشراء / التكلفة" error={errors.costPrice?.message}>
            <input 
              type="number" 
              step="0.01" 
              className="purchase-prototype-input" 
              {...register('costPrice', { valueAsNumber: true })} 
            />
          </Field>
          <Field label="المخزون الافتتاحي" error={errors.stock?.message}>
            <input 
              type="number" 
              step="0.001" 
              className="purchase-prototype-input" 
              {...register('stock', { valueAsNumber: true })} 
            />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Field label="الحد الأدنى للمخزون" error={errors.minStock?.message}>
            <input 
              type="number" 
              className="purchase-prototype-input" 
              {...register('minStock', { valueAsNumber: true })} 
            />
          </Field>
        </div>

        {itemType === 'product' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="سعر البيع (قطاعي)" error={errors.retailPrice?.message}>
              <input 
                type="number" 
                step="0.01" 
                className="purchase-prototype-input" 
                {...register('retailPrice', { valueAsNumber: true })} 
              />
            </Field>
            <Field label="سعر الجملة" error={errors.wholesalePrice?.message}>
              <input 
                type="number" 
                step="0.01" 
                className="purchase-prototype-input" 
                {...register('wholesalePrice', { valueAsNumber: true })} 
              />
            </Field>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={mutation.isPending}>إلغاء</Button>
          <Button type="submit" variant="primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </div>
      </form>
    </DialogShell>
  );
}
