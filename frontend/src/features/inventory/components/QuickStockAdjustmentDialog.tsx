import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';
import { toast } from '@/shared/components/system-alert';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import type { Branch, Location, Product } from '@/types/domain';
import { useDamagedStockMutation, useInventoryAdjustmentMutation } from '@/features/inventory/hooks/useInventoryMutations';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import {
  damagedStockSchema,
  inventoryAdjustmentSchema,
  type DamagedStockInput,
  type DamagedStockOutput,
  type InventoryAdjustmentInput,
  type InventoryAdjustmentOutput,
} from '@/features/inventory/schemas/inventory.schema';

const ACTION_TYPE_OPTIONS = [
  { value: 'adjust', label: 'تسوية إلى كمية نهائية' },
  { value: 'add', label: 'إضافة كمية للرصيد' },
  { value: 'deduct', label: 'خصم كمية من الرصيد' },
];

interface QuickStockAdjustmentDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  branches: Branch[];
  locations: Location[];
  locationStocks?: { productId: string; locationId: string; qty: number }[];
  canManageInventory?: boolean;
}

export function QuickStockAdjustmentDialog({
  open,
  onClose,
  product,
  branches = [],
  locations = [],
  locationStocks = [],
  canManageInventory = true,
}: QuickStockAdjustmentDialogProps) {
  const [activeTab, setActiveTab] = useState<'adjust' | 'damage'>('adjust');

  const adjustQtyInputRef = useRef<HTMLInputElement | null>(null);
  const damagedQtyInputRef = useRef<HTMLInputElement | null>(null);

  const unitName = useMemo(() => {
    if (!product?.units?.length) return 'قطعة';
    const baseUnit = product.units.find((u) => u.isBaseUnit) || product.units[0];
    return baseUnit?.name || 'قطعة';
  }, [product?.units]);

  const branchList = useMemo(() => (Array.isArray(branches) ? branches : []), [branches]);
  const locationList = useMemo(() => (Array.isArray(locations) ? locations : []), [locations]);

  const branchOptions = useMemo(
    () => [
      { value: '', label: 'بدون فرع محدد' },
      ...branchList.map((branch) => ({ value: String(branch.id), label: branch.name })),
    ],
    [branchList],
  );

  const locationOptions = useMemo(
    () => [
      { value: '', label: 'بدون مخزن محدد' },
      ...locationList.map((location) => ({ value: String(location.id), label: location.name })),
    ],
    [locationList],
  );

  // Forms
  const adjustmentForm = useForm<InventoryAdjustmentInput, undefined, InventoryAdjustmentOutput>({
    resolver: zodResolver(inventoryAdjustmentSchema),
    defaultValues: {
      productId: '',
      actionType: 'adjust',
      qty: 0,
      reason: 'جرد مخزني',
      note: '',
      branchId: '',
      locationId: SINGLE_STORE_MODE ? (locationList[0]?.id || '') : '',
    },
  });

  const damagedForm = useForm<DamagedStockInput, undefined, DamagedStockOutput>({
    resolver: zodResolver(damagedStockSchema),
    defaultValues: {
      productId: '',
      qty: 1,
      reason: 'كسر أثناء النقل / تلف مخزني',
      note: '',
      branchId: '',
      locationId: SINGLE_STORE_MODE ? (locationList[0]?.id || '') : '',
    },
  });

  // Mutations with toast & auto-close
  const handleAdjustmentSuccess = useCallback(() => {
    toast.success('تم حفظ حركة المخزون وتحديث الرصيد بنجاح.');
    onClose();
  }, [onClose]);

  const handleDamagedSuccess = useCallback(() => {
    toast.success('تم تسجيل التالف وتحديث المخزون بنجاح.');
    onClose();
  }, [onClose]);

  const adjustmentMutation = useInventoryAdjustmentMutation(handleAdjustmentSuccess);
  const damagedMutation = useDamagedStockMutation(handleDamagedSuccess);

  // Initialize form when product changes or dialog opens
  useEffect(() => {
    if (!open || !product) return;

    setActiveTab('adjust');
    const currentStock = Number(product.stock || 0);

    let defaultLocId = '';
    let defaultBranchId = '';

    if (!SINGLE_STORE_MODE) {
      const pStocks = locationStocks.filter((s) => String(s.productId) === String(product.id) && s.qty > 0);
      const stockRec = pStocks.length > 0 ? pStocks[0] : locationStocks.find((s) => String(s.productId) === String(product.id));
      if (stockRec) {
        defaultLocId = stockRec.locationId;
        const loc = locationList.find((l) => String(l.id) === String(defaultLocId));
        if (loc?.branchId) defaultBranchId = String(loc.branchId);
      } else if (product.defaultLocationId) {
        defaultLocId = product.defaultLocationId;
        const loc = locationList.find((l) => String(l.id) === String(defaultLocId));
        if (loc?.branchId) defaultBranchId = String(loc.branchId);
      }
    } else {
      defaultLocId = locationList[0]?.id || '';
    }

    adjustmentForm.reset({
      productId: String(product.id),
      actionType: 'adjust',
      qty: currentStock,
      reason: 'جرد مخزني',
      note: '',
      branchId: defaultBranchId,
      locationId: defaultLocId,
    });

    damagedForm.reset({
      productId: String(product.id),
      qty: 1,
      reason: 'كسر أثناء النقل / تلف مخزني',
      note: '',
      branchId: defaultBranchId,
      locationId: defaultLocId,
    });

    adjustmentMutation.reset();
    damagedMutation.reset();
  }, [open, product, locationStocks, locationList, adjustmentForm, damagedForm]);

  // AutoFocus & Select all text on Quantity input whenever modal opens or tab switches
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      if (activeTab === 'adjust') {
        adjustQtyInputRef.current?.focus();
        adjustQtyInputRef.current?.select();
      } else {
        damagedQtyInputRef.current?.focus();
        damagedQtyInputRef.current?.select();
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [open, activeTab]);

  // Live preview calculations
  const adjustmentActionType = adjustmentForm.watch('actionType');
  const adjustmentQty = Number(adjustmentForm.watch('qty') || 0);
  const currentStock = Number(product?.stock || 0);

  const newStockAfterAdjustment = useMemo(() => {
    if (adjustmentActionType === 'adjust') return adjustmentQty;
    if (adjustmentActionType === 'add') return Number((currentStock + adjustmentQty).toFixed(3));
    if (adjustmentActionType === 'deduct') return Number(Math.max(0, currentStock - adjustmentQty).toFixed(3));
    return currentStock;
  }, [adjustmentActionType, adjustmentQty, currentStock]);

  const damagedQty = Number(damagedForm.watch('qty') || 0);
  const remainingAfterDamage = useMemo(
    () => Number(Math.max(0, currentStock - damagedQty).toFixed(3)),
    [currentStock, damagedQty],
  );

  const isSubmitting = adjustmentMutation.isPending || damagedMutation.isPending;

  const handleSubmit = () => {
    if (!canManageInventory) return;
    if (activeTab === 'adjust') {
      adjustmentForm.handleSubmit((values) => adjustmentMutation.mutate(values))();
    } else {
      damagedForm.handleSubmit((values) => damagedMutation.mutate(values))();
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="تسوية وتعديل رصيد المخزون"
      subtitle={product ? `الصنف: ${product.name} (الرصيد الحالي: ${product.stock})` : 'إجراء حركة تسوية أو تسجيل تالف سريع للمخزون'}
      width="min(760px, 95vw)"
      minHeight="auto"
      footerActions={
        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitText={activeTab === 'adjust' ? 'حفظ حركة المخزون' : 'تسجيل التالف'}
          cancelText="إلغاء"
          disabled={!canManageInventory}
        />
      }
    >
      <style>{`
        .quick-stock-modal .field {
          margin-bottom: 0 !important;
          gap: 3px !important;
        }
        .quick-stock-modal .field span {
          font-size: 0.74rem !important;
          font-weight: 600 !important;
          color: #334155 !important;
          white-space: nowrap !important;
        }
        .quick-stock-modal input,
        .quick-stock-modal textarea {
          height: 33px !important;
          font-size: 0.8125rem !important;
          border-radius: 6px !important;
          padding: 0 10px !important;
          border: 1px solid #cbd5e1 !important;
          background: #ffffff !important;
          box-sizing: border-box !important;
          outline: none !important;
          width: 100% !important;
        }
        .quick-stock-modal textarea {
          height: auto !important;
          min-height: 52px !important;
          padding: 6px 10px !important;
          resize: vertical !important;
        }
        .quick-stock-modal input:focus,
        .quick-stock-modal textarea:focus {
          border-color: #170e5e !important;
          box-shadow: 0 0 0 2px rgba(23, 14, 94, 0.1) !important;
        }
        .quick-stock-tab-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid transparent;
          transition: none;
          box-sizing: border-box;
        }
        .quick-stock-tab-active {
          background: #170e5e !important;
          color: #ffffff !important;
          border-color: #170e5e !important;
        }
        .quick-stock-tab-inactive {
          background: #f8fafc !important;
          color: #475569 !important;
          border-color: #e2e8f0 !important;
        }
        .quick-stock-tab-inactive:hover {
          background: #f1f5f9 !important;
          color: #0f172a !important;
        }
      `}</style>

      <div
        className="quick-stock-modal"
        style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
        dir="rtl"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const target = e.target as HTMLElement;
            if (target && target.tagName.toLowerCase() === 'textarea') return;
            e.preventDefault();
            handleSubmit();
          }
        }}
      >
        {/* 1. بطاقة ملخص الصنف */}
        {product && (
          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#170e5e' }}>{product.name}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                كود / باركود: <strong style={{ color: '#334155' }}>{product.barcode || product.styleCode || '—'}</strong>
                {product.categoryName ? <> • القسم: <strong style={{ color: '#334155' }}>{product.categoryName}</strong></> : null}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ textAlign: 'center', background: '#ffffff', padding: '4px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>الرصيد الحالي</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: Number(product.stock || 0) <= 0 ? '#ef4444' : '#059669' }}>
                  {product.stock} <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>{unitName}</span>
                </div>
              </div>
              <div style={{ textAlign: 'center', background: '#ffffff', padding: '4px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>الحد الأدنى</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#334155' }}>
                  {product.minStock || 0} <span style={{ fontSize: '0.72rem', fontWeight: 500, color: '#64748b' }}>{unitName}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. محدد نوع العملية (تبويبات 0ms بدون اهتزاز) */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`quick-stock-tab-btn ${activeTab === 'adjust' ? 'quick-stock-tab-active' : 'quick-stock-tab-inactive'}`}
            onClick={() => setActiveTab('adjust')}
          >
            <AppIcons.Sliders size={15} />
            تسوية وتعديل رصيد
          </button>
          <button
            type="button"
            className={`quick-stock-tab-btn ${activeTab === 'damage' ? 'quick-stock-tab-active' : 'quick-stock-tab-inactive'}`}
            onClick={() => setActiveTab('damage')}
          >
            <AppIcons.AlertCircle size={15} />
            تسجيل تالف مباشر
          </button>
        </div>

        {/* 3. محتوى التبويب: تسوية وتعديل رصيد */}
        {activeTab === 'adjust' ? (
          <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <Field label="نوع الحركة">
                <Controller
                  control={adjustmentForm.control}
                  name="actionType"
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value}
                      onChange={(val) => {
                        field.onChange(val);
                        if (val === 'adjust') {
                          adjustmentForm.setValue('qty', currentStock);
                        } else {
                          adjustmentForm.setValue('qty', 0);
                        }
                      }}
                      options={ACTION_TYPE_OPTIONS}
                      placeholder="اختر نوع الحركة"
                      disabled={isSubmitting || !canManageInventory}
                    />
                  )}
                />
              </Field>

              <Field label={`الكمية (${unitName})`} error={adjustmentForm.formState.errors.qty?.message}>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  {...adjustmentForm.register('qty')}
                  ref={(el) => {
                    adjustmentForm.register('qty').ref(el);
                    adjustQtyInputRef.current = el;
                  }}
                  disabled={isSubmitting || !canManageInventory}
                />
              </Field>

              <Field label="السبب" error={adjustmentForm.formState.errors.reason?.message}>
                <input
                  {...adjustmentForm.register('reason')}
                  placeholder="مثال: جرد مخزني / تصحيح رصيد"
                  disabled={isSubmitting || !canManageInventory}
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              {!SINGLE_STORE_MODE && (
                <Field label="الفرع">
                  <Controller
                    control={adjustmentForm.control}
                    name="branchId"
                    render={({ field }) => (
                      <CustomSelect
                        value={field.value || ''}
                        onChange={(val) => field.onChange(val)}
                        options={branchOptions}
                        placeholder="بدون فرع محدد"
                        disabled={isSubmitting || !canManageInventory}
                      />
                    )}
                  />
                </Field>
              )}

              {SINGLE_STORE_MODE ? (
                <Field label="المخزن">
                  <input value={locationList[0]?.name || 'المخزن الرئيسي'} disabled readOnly />
                </Field>
              ) : (
                <Field label="المخزن">
                  <Controller
                    control={adjustmentForm.control}
                    name="locationId"
                    render={({ field }) => (
                      <CustomSelect
                        value={field.value || ''}
                        onChange={(val) => field.onChange(val)}
                        options={locationOptions}
                        placeholder="بدون مخزن محدد"
                        disabled={isSubmitting || !canManageInventory}
                      />
                    )}
                  />
                </Field>
              )}
            </div>

            <Field label="ملاحظات (اختياري)">
              <textarea
                rows={2}
                {...adjustmentForm.register('note')}
                placeholder="أي ملاحظات توثيقية إضافية حول سبب التسوية..."
                disabled={isSubmitting || !canManageInventory}
              />
            </Field>

            {/* شريط معاينة الرصيد الجديد */}
            <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>الرصيد المتوقع بعد حفظ الحركة:</span>
              <strong style={{ fontSize: '0.95rem', color: newStockAfterAdjustment <= 0 ? '#ef4444' : '#170e5e' }}>
                {newStockAfterAdjustment} {unitName}
              </strong>
            </div>
          </div>
        ) : (
          /* 4. محتوى التبويب: تسجيل تالف مباشر */
          <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <Field label={`الكمية التالفة (${unitName})`} error={damagedForm.formState.errors.qty?.message}>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  {...damagedForm.register('qty')}
                  ref={(el) => {
                    damagedForm.register('qty').ref(el);
                    damagedQtyInputRef.current = el;
                  }}
                  disabled={isSubmitting || !canManageInventory}
                />
              </Field>

              <Field label="سبب التلف" error={damagedForm.formState.errors.reason?.message}>
                <input
                  {...damagedForm.register('reason')}
                  placeholder="مثال: كسر أثناء النقل / انتهاء صلاحية"
                  disabled={isSubmitting || !canManageInventory}
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              {!SINGLE_STORE_MODE && (
                <Field label="الفرع">
                  <Controller
                    control={damagedForm.control}
                    name="branchId"
                    render={({ field }) => (
                      <CustomSelect
                        value={field.value || ''}
                        onChange={(val) => field.onChange(val)}
                        options={branchOptions}
                        placeholder="بدون فرع محدد"
                        disabled={isSubmitting || !canManageInventory}
                      />
                    )}
                  />
                </Field>
              )}

              {SINGLE_STORE_MODE ? (
                <Field label="المخزن">
                  <input value={locationList[0]?.name || 'المخزن الرئيسي'} disabled readOnly />
                </Field>
              ) : (
                <Field label="المخزن">
                  <Controller
                    control={damagedForm.control}
                    name="locationId"
                    render={({ field }) => (
                      <CustomSelect
                        value={field.value || ''}
                        onChange={(val) => field.onChange(val)}
                        options={locationOptions}
                        placeholder="بدون مخزن محدد"
                        disabled={isSubmitting || !canManageInventory}
                      />
                    )}
                  />
                </Field>
              )}
            </div>

            <Field label="ملاحظات (اختياري)">
              <textarea
                rows={2}
                {...damagedForm.register('note')}
                placeholder="تفاصيل التلف أو محضر الهالك..."
                disabled={isSubmitting || !canManageInventory}
              />
            </Field>

            {/* شبكة إحصائيات التالف الفورية */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '2px' }}>
              <div style={{ background: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>الرصيد الحالي</div>
                <strong style={{ fontSize: '0.88rem', color: '#334155' }}>{currentStock} {unitName}</strong>
              </div>
              <div style={{ background: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #fee2e2', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: '#dc2626' }}>الكمية التالفة</div>
                <strong style={{ fontSize: '0.88rem', color: '#dc2626' }}>{damagedQty || 0} {unitName}</strong>
              </div>
              <div style={{ background: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: '#059669' }}>المتبقي بعد التسجيل</div>
                <strong style={{ fontSize: '0.88rem', color: remainingAfterDamage <= 0 ? '#ef4444' : '#059669' }}>
                  {remainingAfterDamage} {unitName}
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </StandardDialog>
  );
}
