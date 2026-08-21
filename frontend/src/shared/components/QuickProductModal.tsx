import { useEffect, useMemo, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { useCategoriesQuery, useLocationsQuery, useProductsQuery } from '@/shared/hooks/use-catalog-queries';
import { sharedProductsApi } from '@/shared/api/products';
import { invalidateCatalogDomain } from '@/app/query-invalidation';
import type { Product } from '@/types/domain';
import { systemAlert } from '@/shared/components/system-alert';

const quickProductSchema = z.object({
  name: z.string().min(1, 'اسم الصنف أو الخدمة مطلوب'),
  categoryId: z.string().optional(),
  warehouseId: z.string().optional().or(z.literal('')),
  unitType: z.enum(['piece', 'kg', 'liter', 'gram', 'meter']),
  costPrice: z.number().min(0, 'التكلفة يجب أن تكون 0 أو أكثر'),
  stock: z.number().optional(),
  retailPrice: z.number().min(0, 'سعر البيع يجب أن يكون 0 أو أكثر'),
  wholesalePrice: z.number().min(0, 'سعر الجملة يجب أن يكون 0 أو أكثر'),
  minStock: z.number().min(0, 'الحد الأدنى يجب أن يكون 0 أو أكثر'),
});

type QuickProductInput = z.infer<typeof quickProductSchema>;

export interface QuickProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName?: string;
  itemType: 'product' | 'raw_material' | 'service';
  onSuccess: (product: Product) => void;
}

export function QuickProductModal({ isOpen, onClose, initialName = '', itemType, onSuccess }: QuickProductModalProps) {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useCategoriesQuery();
  const { data: locations = [] } = useLocationsQuery();
  const { data: allProducts = [] } = useProductsQuery();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const { register, handleSubmit, formState: { errors }, reset, setValue, getValues, watch } = useForm<QuickProductInput>({
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

  const nameValue = watch('name') || '';

  // Extract all existing service products from catalog
  const existingServices = useMemo(() => {
    const map = new Map<string, { id?: string; name: string; price: number; fullProduct?: Product }>();
    for (const p of allProducts) {
      if (p.itemType === 'service' || (p as any).item_type === 'service') {
        const name = String(p.name || '').trim();
        if (name && !map.has(name.toLowerCase())) {
          map.set(name.toLowerCase(), {
            id: String(p.id),
            name,
            price: Number(p.retailPrice || (p as any).retail_price || 0),
            fullProduct: p,
          });
        }
      }
    }
    return Array.from(map.values());
  }, [allProducts]);

  // Filtered suggestions based on typed name
  const filteredServices = useMemo(() => {
    const query = nameValue.trim().toLowerCase();
    if (!query) return existingServices.slice(0, 10);
    return existingServices.filter((s) => s.name.toLowerCase().includes(query)).slice(0, 10);
  }, [existingServices, nameValue]);

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
      setIsDropdownOpen(false);
    }
  }, [isOpen, initialName, reset, locations, itemType]);

  useEffect(() => {
    if (locations.length === 1 && !getValues('warehouseId')) {
      setValue('warehouseId', String(locations[0].id), { shouldValidate: true });
    }
  }, [locations, setValue, getValues]);

  // Click outside listener to close autocomplete dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectService = (service: { id?: string; name: string; price: number }) => {
    setValue('name', service.name, { shouldValidate: true });
    setValue('retailPrice', service.price, { shouldValidate: true });
    setIsDropdownOpen(false);
  };

  const mutation = useMutation({
    mutationFn: async (data: QuickProductInput) => {
      let units = [];
      if (itemType === 'service') {
        units = [{ name: 'خدمة', multiplier: 1, isBaseUnit: true, isSaleUnit: true, isPurchaseUnit: false, barcode: '' }];
      } else if (data.unitType === 'kg') {
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
        costPrice: itemType === 'service' ? 0 : data.costPrice,
        stock: itemType === 'service' ? 0 : data.stock,
        minStock: itemType === 'service' ? 0 : data.minStock,
        categoryId: itemType === 'service' ? undefined : (data.categoryId ? Number(data.categoryId) : undefined),
        warehouseId: itemType === 'service' ? undefined : (data.warehouseId ? String(data.warehouseId) : undefined),
        wholesalePrice: itemType === 'service' ? data.retailPrice : data.wholesalePrice,
        itemType,
        units
      };
      return sharedProductsApi.create(payload) as Promise<{ id: number; products?: Product[] }>;
    },
    onSuccess: (res, variables) => {
      invalidateCatalogDomain(queryClient);
      const newProduct = {
        id: String(res.id),
        name: variables.name,
        itemType,
        barcode: '',
        styleCode: '',
        retailPrice: variables.retailPrice,
        wholesalePrice: variables.wholesalePrice || variables.retailPrice,
        costPrice: 0,
        stock: 999999,
        minStock: 0,
        categoryId: variables.categoryId ? String(variables.categoryId) : '',
        units: [{ id: `base-${res.id}`, name: itemType === 'service' ? 'خدمة' : 'قطعة', multiplier: 1, isBaseUnit: true, isSaleUnit: true, isPurchaseUnit: false, barcode: '' }],
      } as unknown as Product;
      onSuccess(newProduct);
      reset();
      onClose();
    },
    onError: () => {
      systemAlert('حدث خطأ أثناء حفظ الصنف. تأكد من صحة البيانات.');
    }
  });

  const handleFormSubmit = (data: QuickProductInput) => {
    // If it's a service and matches an existing service with identical price, reuse it directly
    if (itemType === 'service') {
      const match = existingServices.find(
        (s) => s.name.toLowerCase() === data.name.trim().toLowerCase() && Number(s.price) === Number(data.retailPrice)
      );
      if (match && match.fullProduct) {
        onSuccess(match.fullProduct);
        reset();
        onClose();
        return;
      }
    }
    mutation.mutate(data);
  };

  if (!isOpen) return null;

  return (
    <DialogShell 
      open={isOpen} 
      onClose={onClose}
      width="min(560px, 95vw)"
      ariaLabel={itemType === 'service' ? 'إضافة خدمة سريعة' : itemType === 'product' ? 'إضافة منتج سريع' : 'إضافة مادة خام سريعة'}
    >
      <div style={{ padding: '20px 24px' }}>
        <form onSubmit={handleSubmit(handleFormSubmit)} dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Header Bar - Clean & Icon-free */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                {itemType === 'service' ? 'إضافة خدمة سريعة' : itemType === 'product' ? 'إضافة منتج سريع' : 'إضافة مادة خام سريعة'}
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.825rem', color: '#64748b' }}>
                {itemType === 'service' ? 'أدخل اسم الخدمة والمبلغ لتضاف مباشرة إلى السلة والريسيت' : 'إدخال بيانات الصنف الأساسية وموقعه في المخزن للتسجيل الفوري'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', width: '34px', height: '34px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '1rem', fontWeight: 700, transition: 'all 0.15s ease' }}
              title="إغلاق"
            >
              ✕
            </button>
          </div>

          {itemType === 'service' ? (
            <>
              {/* Section 1: بيانات الخدمة مع الاقتراحات الذكية */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }} ref={dropdownRef}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                  بيانات الخدمة
                </div>

                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    اسم الخدمة / المصنعية <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="purchase-prototype-field-input"
                    placeholder="اكتب اسم الخدمة (مثال: تنزيل ويندوز، تغيير شاشة، تصليح، نولون...)"
                    {...register('name')}
                    autoFocus
                    autoComplete="off"
                    onFocus={() => setIsDropdownOpen(true)}
                    style={{ width: '100%', background: '#fff', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '0.9rem' }}
                  />
                  {errors.name?.message && (
                    <div style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>{errors.name.message}</div>
                  )}

                  {/* Dynamic Dropdown from Previous Services */}
                  {isDropdownOpen && filteredServices.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        marginTop: '4px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        zIndex: 50,
                        maxHeight: '180px',
                        overflowY: 'auto',
                      }}
                    >
                      <div style={{ padding: '6px 10px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                        خدمات مسجلة ومستخدمة مسبقاً (اضغط للاختيار والتعبئة التلقائية):
                      </div>
                      {filteredServices.map((srv) => (
                        <button
                          key={srv.name}
                          type="button"
                          onClick={() => handleSelectService(srv)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            border: 'none',
                            borderBottom: '1px solid #f1f5f9',
                            background: 'transparent',
                            textAlign: 'right',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#eff6ff')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>{srv.name}</span>
                          <span style={{ fontWeight: 700, color: '#2563eb', fontSize: '0.825rem' }}>{srv.price} ج.م</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Chips of previously used services if available */}
                {existingServices.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>من خدماتك السابقة:</span>
                    {existingServices.slice(0, 6).map((srv) => (
                      <button
                        key={srv.name}
                        type="button"
                        onClick={() => handleSelectService(srv)}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '0.75rem',
                          color: '#1e293b',
                          cursor: 'pointer',
                          fontWeight: 500,
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#2563eb')}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
                      >
                        {srv.name} ({srv.price} ج.م)
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2: الحساب المالي والتسعير - حقل سعر واحد فقط */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                  الحساب المالي
                </div>

                <div style={{ background: '#fff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    سعر الخدمة <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="purchase-prototype-field-input"
                      {...register('retailPrice', { valueAsNumber: true })}
                      style={{ width: '100%', padding: '7px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>ج.م</span>
                  </div>
                  {errors.retailPrice?.message && (
                    <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '4px' }}>{errors.retailPrice.message}</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Standard Product & Raw Material Cards */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginBottom: '10px' }}>
                  بيانات الصنف والتخزين
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    اسم الصنف <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="purchase-prototype-field-input"
                    placeholder="اكتب اسم الصنف..."
                    {...register('name')}
                    autoFocus
                    style={{ width: '100%', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '0.9rem' }}
                  />
                  {errors.name?.message && (
                    <div style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>{errors.name.message}</div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      المخزن (موقع التخزين)
                    </label>
                    <select
                      className="purchase-prototype-field-input"
                      {...register('warehouseId')}
                      disabled={locations.length === 1}
                      style={{ width: '100%', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '0.9rem' }}
                    >
                      {locations.length !== 1 && <option value="">اختر المخزن...</option>}
                      {locations.map((loc) => (
                        <option key={loc.id} value={String(loc.id)}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      القسم (اختياري)
                    </label>
                    <select
                      className="purchase-prototype-field-input"
                      {...register('categoryId')}
                      style={{ width: '100%', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '0.9rem' }}
                    >
                      <option value="">بدون قسم</option>
                      {categories.map((c) => (
                        <option key={c.id} value={String(c.id)}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginBottom: '10px' }}>
                  التكاليف والمخزون والتسعير
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>وحدة القياس</label>
                    <select
                      className="purchase-prototype-field-input"
                      {...register('unitType')}
                      style={{ width: '100%', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '0.9rem' }}
                    >
                      <option value="piece">قطعة</option>
                      <option value="kg">كيلوجرام (جرام)</option>
                      <option value="liter">لتر (ملي)</option>
                      <option value="gram">جرام فقط</option>
                      <option value="meter">متر</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>سعر التكلفة</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="purchase-prototype-field-input"
                      {...register('costPrice', { valueAsNumber: true })}
                      style={{ width: '100%', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>المخزون الافتتاحي</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      className="purchase-prototype-field-input"
                      {...register('stock', { valueAsNumber: true })}
                      style={{ width: '100%', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>

                {itemType === 'product' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>سعر البيع (قطاعي)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="purchase-prototype-field-input"
                        {...register('retailPrice', { valueAsNumber: true })}
                        style={{ width: '100%', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>سعر الجملة</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="purchase-prototype-field-input"
                        {...register('wholesalePrice', { valueAsNumber: true })}
                        style={{ width: '100%', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={mutation.isPending}
              style={{ padding: '8px 24px', fontSize: '0.9rem' }}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={mutation.isPending}
              style={{ padding: '8px 28px', fontWeight: 700, fontSize: '0.9rem', background: '#0f172a' }}
            >
              {mutation.isPending ? 'جارٍ الحفظ...' : itemType === 'service' ? 'حفظ وإضافة للسلة' : 'حفظ الصنف'}
            </Button>
          </div>
        </form>
      </div>
    </DialogShell>
  );
}
