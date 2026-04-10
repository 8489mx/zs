import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from '@/shared/ui/card';
import { Field } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { SubmitButton } from '@/shared/components/submit-button';
import type { Branch, Location, Product } from '@/types/domain';
import { useDamagedStockMutation, useInventoryAdjustmentMutation } from '@/features/inventory/hooks/useInventoryMutations';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import {
  damagedStockSchema,
  inventoryAdjustmentSchema,
  type DamagedStockInput,
  type DamagedStockOutput,
  type InventoryAdjustmentInput,
  type InventoryAdjustmentOutput
} from '@/features/inventory/schemas/inventory.schema';

interface InventoryActionsPanelProps {
  products: Product[];
  branches: Branch[];
  locations: Location[];
  isCatalogLoading: boolean;
  isCatalogError: boolean;
  catalogError?: unknown;
  canManageInventory?: boolean;
}

export function InventoryActionsPanel({ products, branches, locations, isCatalogLoading, isCatalogError, catalogError, canManageInventory = true }: InventoryActionsPanelProps) {
  const adjustmentForm = useForm<InventoryAdjustmentInput, undefined, InventoryAdjustmentOutput>({
    resolver: zodResolver(inventoryAdjustmentSchema),
    defaultValues: { productId: '', actionType: 'adjust', qty: 0, reason: 'inventory_count', note: '', managerPin: '' }
  });
  const damagedForm = useForm<DamagedStockInput, undefined, DamagedStockOutput>({
    resolver: zodResolver(damagedStockSchema),
    defaultValues: { productId: '', qty: 1, reason: 'damage', note: '', branchId: '', locationId: '', managerPin: '' }
  });

  const adjustmentMutation = useInventoryAdjustmentMutation(() => adjustmentForm.reset({ productId: '', actionType: 'adjust', qty: 0, reason: 'inventory_count', note: '', managerPin: '' }));
  const damagedMutation = useDamagedStockMutation(() => damagedForm.reset({ productId: '', qty: 1, reason: 'damage', note: '', branchId: '', locationId: SINGLE_STORE_MODE ? (locations[0]?.id || '') : '', managerPin: '' }));

  useEffect(() => {
    if (!SINGLE_STORE_MODE) return;
    if (!damagedForm.getValues('locationId') && locations[0]?.id) {
      damagedForm.setValue('locationId', locations[0].id);
    }
  }, [damagedForm, locations]);

  const damagedProductId = damagedForm.watch('productId');
  const damagedQty = Number(damagedForm.watch('qty') || 0);
  const selectedDamagedProduct = useMemo(() => products.find((product) => String(product.id) === String(damagedProductId)), [products, damagedProductId]);
  const selectedLocationName = SINGLE_STORE_MODE
    ? (locations[0]?.name || '—')
    : (locations.find((location) => String(location.id) === String(damagedForm.getValues('locationId')))?.name || '—');
  const remainingAfterDamage = Math.max(0, Number(selectedDamagedProduct?.stock || 0) - damagedQty);

  return (
    <QueryFeedback
      isLoading={isCatalogLoading}
      isError={isCatalogError}
      error={catalogError}
      loadingText="جاري تجهيز أدوات المخزون..."
      errorTitle="تعذر تحميل بيانات تشغيل المخزون"
      isEmpty={!products.length}
      emptyTitle="لا توجد أصناف لإجراء حركة مخزون"
      emptyHint="أضف صنفًا واحدًا على الأقل قبل استخدام أدوات الجرد أو التالف."
    >
      <div className="two-column-grid">
        <Card title="تسوية / تعديل مخزون" actions={<span className="nav-pill">تسوية آمنة</span>}>
          <form className="form-grid" onSubmit={adjustmentForm.handleSubmit((values) => adjustmentMutation.mutate(values))}>
            <Field label="الصنف" error={adjustmentForm.formState.errors.productId?.message}>
              <select {...adjustmentForm.register('productId')} disabled={adjustmentMutation.isPending || !canManageInventory}>
                <option value="">اختر الصنف</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
            </Field>
            <Field label="نوع الحركة">
              <select {...adjustmentForm.register('actionType')} disabled={adjustmentMutation.isPending || !canManageInventory}>
                <option value="adjust">تسوية إلى كمية نهائية</option>
                <option value="add">إضافة كمية</option>
                <option value="deduct">خصم كمية</option>
              </select>
            </Field>
            <Field label="الكمية" error={adjustmentForm.formState.errors.qty?.message}><input type="number" min="0" step="0.001" {...adjustmentForm.register('qty')} disabled={adjustmentMutation.isPending || !canManageInventory} /></Field>
            <Field label="السبب" error={adjustmentForm.formState.errors.reason?.message}><input {...adjustmentForm.register('reason')} disabled={adjustmentMutation.isPending || !canManageInventory} /></Field>
            <Field label="ملاحظات"><textarea rows={3} {...adjustmentForm.register('note')} disabled={adjustmentMutation.isPending || !canManageInventory} /></Field>
            <Field label="رمز اعتماد المدير" error={adjustmentForm.formState.errors.managerPin?.message}><input type="password" {...adjustmentForm.register('managerPin')} disabled={adjustmentMutation.isPending || !canManageInventory} /></Field>
            {!canManageInventory ? <div className="muted small">هذا الحساب يملك صلاحية متابعة المخزون فقط. تنفيذ التسويات والتالف يتطلب canAdjustInventory.</div> : null}
            <MutationFeedback isError={adjustmentMutation.isError} isSuccess={adjustmentMutation.isSuccess} error={adjustmentMutation.error} errorFallback="تعذر تنفيذ حركة المخزون" successText="تم حفظ حركة المخزون وتحديث الرصيد بنجاح." />
            <div className="actions">
              <SubmitButton type="submit" disabled={adjustmentMutation.isPending || !canManageInventory} idleText="حفظ حركة المخزون" pendingText="جارٍ الحفظ..." />
              <Button type="button" variant="secondary" disabled={adjustmentMutation.isPending || !canManageInventory} onClick={() => { adjustmentForm.reset(); adjustmentMutation.reset(); }}>تفريغ</Button>
            </div>
          </form>
        </Card>

        <Card title="تسجيل تالف مباشر" actions={<span className="nav-pill">تسجيل التالف</span>}>
          <form className="form-grid" onSubmit={damagedForm.handleSubmit((values) => damagedMutation.mutate(values))}>
            <Field label="الصنف" error={damagedForm.formState.errors.productId?.message}>
              <select {...damagedForm.register('productId')} disabled={damagedMutation.isPending || !canManageInventory}>
                <option value="">اختر الصنف</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
            </Field>
            <Field label="الكمية" error={damagedForm.formState.errors.qty?.message}><input type="number" min="0.001" step="0.001" {...damagedForm.register('qty')} disabled={damagedMutation.isPending || !canManageInventory} /></Field>
            <Field label="السبب" error={damagedForm.formState.errors.reason?.message}><input {...damagedForm.register('reason')} disabled={damagedMutation.isPending || !canManageInventory} placeholder="مثال: كسر أثناء النقل / تلف صلاحية" /></Field>
            {!SINGLE_STORE_MODE ? <Field label="الفرع">
              <select {...damagedForm.register('branchId')} disabled={damagedMutation.isPending || !canManageInventory}>
                <option value="">بدون فرع محدد</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </Field> : null}
            {SINGLE_STORE_MODE ? (
              <Field label="المخزن الأساسي"><input value={locations[0]?.name || 'سيتم الربط تلقائيًا بالمخزن الأساسي'} disabled readOnly /></Field>
            ) : (
              <Field label="الموقع">
                <select {...damagedForm.register('locationId')} disabled={damagedMutation.isPending || !canManageInventory}>
                  <option value="">بدون موقع محدد</option>
                  {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                </select>
              </Field>
            )}
            <Field label="ملاحظات"><textarea rows={3} {...damagedForm.register('note')} disabled={damagedMutation.isPending || !canManageInventory} /></Field>
            <Field label="رمز اعتماد المدير" error={damagedForm.formState.errors.managerPin?.message}><input type="password" {...damagedForm.register('managerPin')} disabled={damagedMutation.isPending || !canManageInventory} /></Field>
            <div className="stats-grid compact-grid workspace-stats-grid" style={{ marginTop: 12 }}>
              <div className="stat-card"><span>المخزون الحالي</span><strong>{selectedDamagedProduct ? selectedDamagedProduct.stock : 0}</strong></div>
              <div className="stat-card"><span>الكمية التالفة</span><strong>{damagedQty || 0}</strong></div>
              <div className="stat-card"><span>المتبقي بعد التسجيل</span><strong>{selectedDamagedProduct ? remainingAfterDamage : 0}</strong></div>
              <div className="stat-card"><span>المخزن</span><strong>{selectedLocationName}</strong></div>
            </div>
            <div className="surface-note" style={{ marginTop: 12 }}>سجّل التالف بسبب واضح ومحدد حتى يكون السجل مفيدًا عند المراجعة أو الطباعة.</div>
            <MutationFeedback isError={damagedMutation.isError} isSuccess={damagedMutation.isSuccess} error={damagedMutation.error} errorFallback="تعذر تسجيل التالف" successText="تم تسجيل التالف وتحديث المخزون بنجاح." />
            <div className="actions">
              <SubmitButton type="submit" variant="danger" disabled={damagedMutation.isPending || !canManageInventory} idleText="تسجيل التالف" pendingText="جارٍ التسجيل..." />
              <Button type="button" variant="secondary" disabled={damagedMutation.isPending || !canManageInventory} onClick={() => { damagedForm.reset(); damagedMutation.reset(); }}>تفريغ</Button>
            </div>
          </form>
        </Card>
      </div>
    </QueryFeedback>
  );
}
