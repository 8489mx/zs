import { useCallback, useEffect, useMemo, useRef, type SyntheticEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from '@/shared/ui/card';
import { Field } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { SubmitButton } from '@/shared/components/submit-button';
import { DraftStateNotice } from '@/shared/components/draft-state-notice';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';
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
  selectedProduct?: Product | null;
  selectedProductToken?: number;
  branches: Branch[];
  locations: Location[];
  isCatalogLoading: boolean;
  isCatalogError: boolean;
  catalogError?: unknown;
  canManageInventory?: boolean;
}

const ADJUSTMENT_DEFAULTS: InventoryAdjustmentInput = {
  productId: '',
  actionType: 'adjust',
  qty: 0,
  reason: 'inventory_count',
  note: '',
  managerPin: ''
};

function buildDamagedDefaults(locations: Location[]): DamagedStockInput {
  return {
    productId: '',
    qty: 1,
    reason: 'damage',
    note: '',
    branchId: '',
    locationId: SINGLE_STORE_MODE ? (locations[0]?.id || '') : '',
    managerPin: ''
  };
}

function hasDamagedDraft(values: DamagedStockInput, locations: Location[]): boolean {
  const defaults = buildDamagedDefaults(locations);
  return Boolean(values.productId)
    || Number(values.qty || 0) !== Number(defaults.qty)
    || String(values.reason || '') !== defaults.reason
    || Boolean(String(values.note || '').trim())
    || String(values.branchId || '') !== String(defaults.branchId || '')
    || String(values.locationId || '') !== String(defaults.locationId || '')
    || Boolean(String(values.managerPin || '').trim());
}

export function InventoryActionsPanel({ products, selectedProduct = null, selectedProductToken = 0, branches, locations, isCatalogLoading, isCatalogError, catalogError, canManageInventory = true }: InventoryActionsPanelProps) {
  const adjustmentDisclosureRef = useRef<HTMLDetailsElement | null>(null);
  const damagedDisclosureRef = useRef<HTMLDetailsElement | null>(null);
  const lastPreparedAdjustmentTokenRef = useRef(0);
  const productList = useMemo(() => (Array.isArray(products) ? products : []), [products]);
  const branchList = useMemo(() => (Array.isArray(branches) ? branches : []), [branches]);
  const locationList = useMemo(() => (Array.isArray(locations) ? locations : []), [locations]);
  const productById = useMemo(() => new Map(productList.map((product) => [String(product.id), product])), [productList]);
  const locationById = useMemo(() => new Map(locationList.map((location) => [String(location.id), location.name])), [locationList]);
  const productOptions = useMemo(() => productList.map((product) => ({ id: product.id, name: product.name })), [productList]);

  const adjustmentForm = useForm<InventoryAdjustmentInput, undefined, InventoryAdjustmentOutput>({
    resolver: zodResolver(inventoryAdjustmentSchema),
    defaultValues: ADJUSTMENT_DEFAULTS
  });
  const damagedForm = useForm<DamagedStockInput, undefined, DamagedStockOutput>({
    resolver: zodResolver(damagedStockSchema),
    defaultValues: buildDamagedDefaults(locationList)
  });

  const resetAdjustmentDefaults = useCallback(() => adjustmentForm.reset(ADJUSTMENT_DEFAULTS), [adjustmentForm]);
  const resetDamagedDefaults = useCallback(() => damagedForm.reset(buildDamagedDefaults(locationList)), [damagedForm, locationList]);

  const adjustmentMutation = useInventoryAdjustmentMutation(resetAdjustmentDefaults);
  const damagedMutation = useDamagedStockMutation(resetDamagedDefaults);

  useEffect(() => {
    if (!SINGLE_STORE_MODE) return;
    if (!damagedForm.getValues('locationId') && locationList[0]?.id) {
      damagedForm.setValue('locationId', locationList[0].id);
    }
  }, [damagedForm, locationList]);


  const scrollDisclosureToView = useCallback((details: HTMLDetailsElement | null) => {
    if (!details) return;
    window.requestAnimationFrame(() => {
      details.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    });
  }, []);

  useEffect(() => {
    if (!selectedProduct || !selectedProductToken) return;
    if (lastPreparedAdjustmentTokenRef.current === selectedProductToken) return;
    lastPreparedAdjustmentTokenRef.current = selectedProductToken;
    const recommendedActionType = Number(selectedProduct.stock || 0) <= Number(selectedProduct.minStock || 0) ? 'add' : 'adjust';
    adjustmentForm.reset({
      ...ADJUSTMENT_DEFAULTS,
      productId: String(selectedProduct.id || ''),
      actionType: recommendedActionType,
      qty: recommendedActionType === 'adjust' ? Number(selectedProduct.stock || 0) : 1,
      reason: recommendedActionType === 'add' ? 'restock' : 'inventory_count',
    });
    adjustmentMutation.reset();
    if (adjustmentDisclosureRef.current && !adjustmentDisclosureRef.current.open) adjustmentDisclosureRef.current.open = true;
    scrollDisclosureToView(adjustmentDisclosureRef.current);
  }, [selectedProduct, selectedProductToken, adjustmentForm, adjustmentMutation, scrollDisclosureToView]);
  const damagedValues = damagedForm.watch();
  const adjustmentDraft = adjustmentForm.formState.isDirty;
  const damagedDraft = hasDamagedDraft(damagedValues, locationList);
  const hasAnyDraft = (adjustmentDraft || damagedDraft) && !adjustmentMutation.isPending && !damagedMutation.isPending;
  const canDiscardDrafts = useUnsavedChangesGuard(hasAnyDraft, 'لديك تغييرات غير محفوظة داخل إجراءات المخزون. هل تريد المتابعة وفقدان هذه التغييرات؟');

  const damagedProductId = damagedForm.watch('productId');
  const damagedQty = Number(damagedForm.watch('qty') || 0);
  const selectedDamagedProduct = useMemo(() => productById.get(String(damagedProductId)), [damagedProductId, productById]);
  const selectedLocationId = damagedForm.watch('locationId');
  const selectedLocationName = useMemo(() => {
    if (SINGLE_STORE_MODE) return locationList[0]?.name || '—';
    return locationById.get(String(selectedLocationId)) || '—';
  }, [locationById, locationList, selectedLocationId]);
  const remainingAfterDamage = useMemo(
    () => Math.max(0, Number(selectedDamagedProduct?.stock || 0) - damagedQty),
    [damagedQty, selectedDamagedProduct?.stock],
  );
  const resetAdjustmentForm = useCallback(() => {
    if (adjustmentDraft && !canDiscardDrafts()) return;
    resetAdjustmentDefaults();
    adjustmentMutation.reset();
  }, [adjustmentDraft, adjustmentMutation, canDiscardDrafts, resetAdjustmentDefaults]);

  const closeAdjustmentForm = useCallback(() => {
    resetAdjustmentDefaults();
    adjustmentMutation.reset();
    if (adjustmentDisclosureRef.current) adjustmentDisclosureRef.current.open = false;
  }, [adjustmentMutation, resetAdjustmentDefaults]);

  const handleAdjustmentToggle = useCallback((event: SyntheticEvent<HTMLDetailsElement>) => {
    if (event.currentTarget.open) {
      scrollDisclosureToView(adjustmentDisclosureRef.current);
      return;
    }
    resetAdjustmentDefaults();
    adjustmentMutation.reset();
  }, [adjustmentMutation, resetAdjustmentDefaults, scrollDisclosureToView]);

  const resetDamagedForm = useCallback(() => {
    if (damagedDraft && !canDiscardDrafts()) return;
    resetDamagedDefaults();
    damagedMutation.reset();
  }, [canDiscardDrafts, damagedDraft, damagedMutation, resetDamagedDefaults]);

  return (
    <QueryFeedback
      isLoading={isCatalogLoading}
      isError={isCatalogError}
      error={catalogError}
      loadingText="جاري تجهيز أدوات المخزون..."
      errorTitle="تعذر تحميل بيانات تشغيل المخزون"
      isEmpty={!productList.length}
      emptyTitle="لا توجد أصناف لإجراء حركة مخزون"
      emptyHint="أضف صنفًا واحدًا على الأقل قبل استخدام أدوات الجرد أو التالف."
    >
      <Card
        title="إجراءات تشغيلية متقدمة"
        description="استخدمها فقط عند الحاجة: تسوية رصيد، أو تسجيل تالف مباشر، بدل وضعها في مقدمة الصفحة."
        actions={<span className="nav-pill">إجراءات المخزون</span>}
      >
        <DraftStateNotice
          visible={hasAnyDraft}
          title="يوجد إدخال غير محفوظ داخل إجراءات المخزون"
          hint="احفظ الحركة أو أعد ضبطها قبل مغادرة الصفحة أو التنقل إلى جزء آخر حتى لا تضيع البيانات المدخلة."
        />
        <div className="inventory-actions-disclosure-stack">
          <details
            ref={adjustmentDisclosureRef}
            className="inventory-action-disclosure"
            onToggle={handleAdjustmentToggle}
          >
            <summary>
              <div className="inventory-action-summary-copy">
                <strong>تسوية / تعديل مخزون</strong>
                <span>تصحيح الكمية أو إضافة/خصم سريع للصنف المحدد.</span>
              </div>
            </summary>
            <form className="form-grid inventory-action-form" onSubmit={adjustmentForm.handleSubmit((values) => adjustmentMutation.mutate(values))}>
              <Field label="الصنف" error={adjustmentForm.formState.errors.productId?.message}>
                <select {...adjustmentForm.register('productId')} disabled={adjustmentMutation.isPending || !canManageInventory}>
                  <option value="">اختر الصنف</option>
                  {productOptions.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                </select>
                {selectedProduct ? <div className="muted small">تم تجهيز الصنف المحدد من جدول المتابعة لعمل تسوية أو إضافة/خصم سريع مباشرة.</div> : null}
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
                <Button type="button" variant="secondary" disabled={adjustmentMutation.isPending || !canManageInventory} onClick={resetAdjustmentForm}>تفريغ</Button>
                <Button type="button" variant="secondary" disabled={adjustmentMutation.isPending} onClick={closeAdjustmentForm}>إلغاء وإغلاق</Button>
              </div>
            </form>
          </details>

          <details
            ref={damagedDisclosureRef}
            className="inventory-action-disclosure"
            onToggle={(event) => {
              if ((event.currentTarget as HTMLDetailsElement).open) scrollDisclosureToView(damagedDisclosureRef.current);
            }}
          >
            <summary>
              <div className="inventory-action-summary-copy">
                <strong>تسجيل تالف مباشر</strong>
                <span>سجّل التالف عند الحاجة مع بقاء الصفحة الأساسية مخصصة للمتابعة والبحث.</span>
              </div>
            </summary>
            <form className="form-grid inventory-action-form" onSubmit={damagedForm.handleSubmit((values) => damagedMutation.mutate(values))}>
              <Field label="الصنف" error={damagedForm.formState.errors.productId?.message}>
                <select {...damagedForm.register('productId')} disabled={damagedMutation.isPending || !canManageInventory}>
                  <option value="">اختر الصنف</option>
                  {productOptions.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                </select>
              </Field>
              <Field label="الكمية" error={damagedForm.formState.errors.qty?.message}><input type="number" min="0.001" step="0.001" {...damagedForm.register('qty')} disabled={damagedMutation.isPending || !canManageInventory} /></Field>
              <Field label="السبب" error={damagedForm.formState.errors.reason?.message}><input {...damagedForm.register('reason')} disabled={damagedMutation.isPending || !canManageInventory} placeholder="مثال: كسر أثناء النقل / تلف صلاحية" /></Field>
              {!SINGLE_STORE_MODE ? <Field label="الفرع">
                <select {...damagedForm.register('branchId')} disabled={damagedMutation.isPending || !canManageInventory}>
                  <option value="">بدون فرع محدد</option>
                  {branchList.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              </Field> : null}
              {SINGLE_STORE_MODE ? (
                <Field label="المخزن الأساسي"><input value={locationList[0]?.name || 'سيتم الربط تلقائيًا بالمخزن الأساسي'} disabled readOnly /></Field>
              ) : (
                <Field label="المخزن">
                  <select {...damagedForm.register('locationId')} disabled={damagedMutation.isPending || !canManageInventory}>
                    <option value="">بدون مخزن محدد</option>
                    {locationList.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                  </select>
                </Field>
              )}
              <Field label="ملاحظات"><textarea rows={3} {...damagedForm.register('note')} disabled={damagedMutation.isPending || !canManageInventory} /></Field>
              <Field label="رمز اعتماد المدير" error={damagedForm.formState.errors.managerPin?.message}><input type="password" {...damagedForm.register('managerPin')} disabled={damagedMutation.isPending || !canManageInventory} /></Field>
              <div className="stats-grid compact-grid workspace-stats-grid inventory-damage-mini-grid" style={{ marginTop: 12 }}>
                <div className="stat-card"><span>المخزون الحالي</span><strong>{selectedDamagedProduct ? selectedDamagedProduct.stock : 0}</strong></div>
                <div className="stat-card"><span>الكمية التالفة</span><strong>{damagedQty || 0}</strong></div>
                <div className="stat-card"><span>المتبقي بعد التسجيل</span><strong>{selectedDamagedProduct ? remainingAfterDamage : 0}</strong></div>
                <div className="stat-card"><span>المخزن</span><strong>{selectedLocationName}</strong></div>
              </div>
              <MutationFeedback isError={damagedMutation.isError} isSuccess={damagedMutation.isSuccess} error={damagedMutation.error} errorFallback="تعذر تسجيل التالف" successText="تم تسجيل التالف وتحديث المخزون بنجاح." />
              <div className="actions">
                <SubmitButton type="submit" variant="danger" disabled={damagedMutation.isPending || !canManageInventory} idleText="تسجيل التالف" pendingText="جارٍ التسجيل..." />
                <Button type="button" variant="secondary" disabled={damagedMutation.isPending || !canManageInventory} onClick={resetDamagedForm}>تفريغ</Button>
              </div>
            </form>
          </details>
        </div>
      </Card>
    </QueryFeedback>
  );
}
