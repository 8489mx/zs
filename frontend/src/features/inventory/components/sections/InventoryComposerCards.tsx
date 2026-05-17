import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Field } from '@/shared/ui/field';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { SubmitButton } from '@/shared/components/submit-button';
import { InventoryProductPicker } from '@/features/inventory/components/InventoryProductPicker';
import { StockCountSheetTools } from '@/features/inventory/components/sections/StockCountSheetTools';
import type { Branch, Location, Product, StockCountItem, StockTransferItem } from '@/types/domain';
import { SINGLE_STORE_MODE } from '@/config/product-scope';

interface StockTransferComposerCardProps {
  products: Product[];
  warehouses?: Location[];
  locations?: Location[];
  form: { fromLocationId: string; toLocationId: string; note: string; productId: string; qty: string };
  items: StockTransferItem[];
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  error?: unknown;
  onFormChange: (patch: Partial<{ fromLocationId: string; toLocationId: string; note: string; productId: string; qty: string }>) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onSubmit: () => void;
}

export function StockTransferComposerCard({
  products,
  warehouses,
  locations,
  form,
  items,
  isPending,
  isError,
  isSuccess,
  error,
  onFormChange,
  onAddItem,
  onRemoveItem,
  onSubmit
}: StockTransferComposerCardProps) {
  const warehouseList = warehouses || locations || [];
  return (
    <Card title="تحويل مخزون بين المخازن" description="تجميع العناصر أولًا ثم اعتماد التحويل مع إبقاء المراجعة السريعة للعناصر قبل الإرسال." actions={<span className="nav-pill">التحويلات</span>}>
      <div className="form-grid">
        <Field label="من مخزن">
          <select value={form.fromLocationId} onChange={(e) => onFormChange({ fromLocationId: e.target.value })}>
            <option value="">اختر المصدر</option>
            {warehouseList.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </Field>
        <Field label="إلى مخزن">
          <select value={form.toLocationId} onChange={(e) => onFormChange({ toLocationId: e.target.value })}>
            <option value="">اختر الوجهة</option>
            {warehouseList.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </Field>
        <Field label="الصنف">
          <InventoryProductPicker
            products={products}
            value={form.productId}
            onChange={(productId) => onFormChange({ productId })}
            showStock
            showPrice={false}
          />
        </Field>
        <Field label="الكمية">
          <input type="number" min="0.001" step="0.001" value={form.qty} onChange={(e) => onFormChange({ qty: e.target.value })} />
        </Field>
        <Field label="ملاحظات">
          <textarea rows={3} value={form.note} onChange={(e) => onFormChange({ note: e.target.value })} />
        </Field>
        <div className="field">
          <span>العناصر</span>
          <div className="actions compact-actions">
            <Button type="button" variant="secondary" onClick={onAddItem}>إضافة إلى التحويل</Button>
            <SubmitButton type="button" onClick={onSubmit} disabled={isPending || !items.length} idleText="حفظ التحويل" pendingText="جارٍ الحفظ..." />
          </div>
        </div>
      </div>
      <MutationFeedback isError={isError} isSuccess={isSuccess} error={error} errorFallback="تعذر إنشاء تحويل المخزون" successText="تم إنشاء تحويل المخزون بنجاح." />
      <div className="list-stack" style={{ marginTop: 12 }}>
        {items.length ? items.map((item, index) => (
          <div className="list-row stacked-row" key={item.id}>
            <div>
              <strong>{item.productName}</strong>
              <div className="muted small">الكمية: {item.qty}</div>
            </div>
            <Button type="button" variant="danger" onClick={() => onRemoveItem(index)}>حذف</Button>
          </div>
        )) : <EmptyState title="لا توجد عناصر مضافة للتحويل" hint="أضف صنفًا واحدًا على الأقل ثم احفظ التحويل." />}
      </div>
    </Card>
  );
}

interface StockCountComposerCardProps {
  products: Product[];
  branches: Branch[];
  warehouses?: Location[];
  locations?: Location[];
  form: { branchId: string; locationId: string; note: string; managerPin: string; productId: string; countedQty: string; reason: string; itemNote: string };
  items: StockCountItem[];
  canReviewStock: boolean;
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  error?: unknown;
  onFormChange: (patch: Partial<{ branchId: string; locationId: string; note: string; managerPin: string; productId: string; countedQty: string; reason: string; itemNote: string }>) => void;
  onItemsChange: (updater: (current: StockCountItem[]) => StockCountItem[]) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onSubmit: (options?: { noteOverride?: string }) => void;
}

type StockCountType = 'quick' | 'selected_items' | 'category' | 'full';

export function StockCountComposerCard({
  products,
  branches,
  warehouses,
  locations,
  form,
  items,
  canReviewStock,
  isPending,
  isError,
  isSuccess,
  error,
  onFormChange,
  onItemsChange,
  onAddItem,
  onRemoveItem,
  onSubmit
}: StockCountComposerCardProps) {
  const warehouseList = warehouses || locations || [];
  const selectedLocation = warehouseList.find((location) => String(location.id) === String(form.locationId));
  const categoryOptions = useMemo(() => {
    const unique = new Map<string, { id: string; label: string; count: number }>();
    products.forEach((product) => {
      const id = String(product.categoryId || '').trim();
      if (!id) return;
      const current = unique.get(id);
      unique.set(id, {
        id,
        label: current?.label || `قسم ${id}`,
        count: (current?.count || 0) + 1,
      });
    });
    return Array.from(unique.values()).sort((a, b) => a.label.localeCompare(b.label, 'ar'));
  }, [products]);
  const countTypeOptions: Array<{ key: StockCountType; label: string; description: string }> = useMemo(() => ([
    {
      key: 'quick',
      label: 'جرد سريع',
      description: 'عد صنف أو مجموعة بسيطة بسرعة بدون تجهيز قائمة كاملة.',
    },
    {
      key: 'selected_items',
      label: 'أصناف محددة',
      description: 'اختر الأصناف التي تريد عدها يدويًا قبل إنشاء الجلسة.',
    },
    {
      key: 'category',
      label: 'جرد قسم / تصنيف',
      description: 'اختر القسم مباشرة ثم اطبع شيت عد أو افتح الإدخال الإلكتروني لأصناف هذا القسم.',
    },
    {
      key: 'full',
      label: 'جرد كامل',
      description: 'جهّز شيت عد لكل الأصناف ثم أدخل الفروقات بعد العد الفعلي.',
    },
  ]), []);
  const [countType, setCountType] = useState<StockCountType>('quick');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [isCountStarted, setIsCountStarted] = useState(false);
  const [startCountMessage, setStartCountMessage] = useState('');
  const selectedProduct = products.find((product) => String(product.id) === String(form.productId));
  const expectedQtyValue = Number(selectedProduct?.stock || 0);
  const countedQtyValue = Number(form.countedQty || 0);
  const variancePreview = Number((countedQtyValue - expectedQtyValue).toFixed(3));
  const totalExpected = items.reduce((sum, item) => sum + Number(item.expectedQty || 0), 0);
  const totalCounted = items.reduce((sum, item) => sum + Number(item.countedQty || 0), 0);
  const totalVariance = Number(items.reduce((sum, item) => sum + Number(item.varianceQty || 0), 0).toFixed(3));
  const selectedCountType = countTypeOptions.find((entry) => entry.key === countType) || countTypeOptions[0];
  const needsManualNote = countType === 'category' || countType === 'full';

  useEffect(() => {
    if (!form.locationId) {
      setIsCountStarted(false);
      setStartCountMessage('');
    }
  }, [form.locationId]);

  useEffect(() => {
    if (countType !== 'category') setSelectedCategoryId('');
    onItemsChange(() => []);
  }, [countType, onItemsChange]);

  useEffect(() => {
    if (isSuccess) {
      setIsCountStarted(false);
      setCountType('quick');
      setSelectedCategoryId('');
      setStartCountMessage('');
    }
  }, [isSuccess]);

  function handleStartCount() {
    if (!form.locationId) {
      setStartCountMessage('اختر المخزن أولًا قبل بدء الجرد.');
      return;
    }
    if (countType === 'category' && !selectedCategoryId) {
      setStartCountMessage('اختر القسم المطلوب قبل بدء جرد القسم.');
      return;
    }
    setStartCountMessage('');
    setIsCountStarted(true);
  }

  function buildSessionNoteWithType(baseNote: string) {
    const categoryLabel = categoryOptions.find((category) => category.id === selectedCategoryId)?.label;
    const line = `نوع الجرد: ${selectedCountType.label}${categoryLabel ? ` - ${categoryLabel}` : ''}`;
    const trimmedBase = String(baseNote || '').trim();
    if (!trimmedBase) return line;
    if (trimmedBase.includes(line)) return trimmedBase;
    return `${trimmedBase}\n${line}`;
  }

  function updateCountItem(index: number, patch: Partial<StockCountItem>) {
    onItemsChange((current) => current.map((item, currentIndex) => {
      if (currentIndex !== index) return item;
      const countedQty = patch.countedQty == null ? Number(item.countedQty || 0) : Number(patch.countedQty || 0);
      const expectedQty = Number(item.expectedQty || 0);
      return {
        ...item,
        ...patch,
        countedQty,
        varianceQty: Number((countedQty - expectedQty).toFixed(3)),
      };
    }));
  }

  return (
    <Card title="جلسة جرد مخزون" description="ابدأ الجرد، جهّز شيت العد للطباعة أو CSV، ثم أدخل الكميات الفعلية واعتمد التسوية بعد المراجعة." actions={<span className="nav-pill">جلسات الجرد</span>}>
      <div className="form-grid">
        {!SINGLE_STORE_MODE ? <Field label="الفرع">
          <select value={form.branchId} onChange={(e) => onFormChange({ branchId: e.target.value })}>
            <option value="">بدون فرع</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </Field> : null}
        <Field label={SINGLE_STORE_MODE ? 'المخزن' : 'المخزن'}>
          <select value={form.locationId} onChange={(e) => onFormChange({ locationId: e.target.value })}>
            <option value="">اختر المخزن</option>
            {warehouseList.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </Field>
        <Field label="نوع الجرد">
          <div className="filter-chip-row">
            {countTypeOptions.map((entry) => (
              <Button
                key={entry.key}
                type="button"
                variant={countType === entry.key ? 'primary' : 'secondary'}
                onClick={() => setCountType(entry.key)}
              >
                {entry.label}
              </Button>
            ))}
          </div>
          <div className="muted small" style={{ marginTop: 8 }}>{selectedCountType.description}</div>
        </Field>
        {countType === 'category' ? (
          <Field label="القسم / التصنيف">
            <select value={selectedCategoryId} onChange={(e) => { setSelectedCategoryId(e.target.value); onItemsChange(() => []); }}>
              <option value="">اختر القسم</option>
              {categoryOptions.map((category) => <option key={category.id} value={category.id}>{category.label} ({category.count})</option>)}
            </select>
          </Field>
        ) : null}
        <div className="field">
          <span>بدء الجرد</span>
          <div className="actions compact-actions">
            <Button type="button" variant="secondary" onClick={handleStartCount}>
              بدء الجرد
            </Button>
          </div>
          {startCountMessage ? <div className="muted small" style={{ marginTop: 8 }}>{startCountMessage}</div> : null}
          {needsManualNote && isCountStarted ? (
            <div className="surface-note" style={{ marginTop: 10 }}>
              جهّز شيت العد أولًا، أو استخدم الإدخال الإلكتروني لتجهيز أصناف النطاق داخل الجلسة.
            </div>
          ) : null}
        </div>
        <StockCountSheetTools
          products={products}
          items={items}
          countType={countType}
          selectedProduct={selectedProduct}
          selectedCategoryId={selectedCategoryId}
          locationName={selectedLocation?.name}
          isCountStarted={isCountStarted}
          onItemsChange={onItemsChange}
        />
        <Field label="الصنف">
          <InventoryProductPicker
            products={products}
            value={form.productId}
            onChange={(productId) => onFormChange({ productId })}
            showStock
            showPrice={false}
            disabled={!isCountStarted}
            helperText={isCountStarted ? 'اختر صنفًا لإدخال كمية العد أو لاستخدامه في الجرد السريع.' : 'ابدأ الجرد أولًا ثم اختر الصنف.'}
          />
        </Field>
        <Field label="الكمية المعدودة">
          <input type="number" min="0" step="0.001" value={form.countedQty} onChange={(e) => onFormChange({ countedQty: e.target.value })} disabled={!isCountStarted} />
        </Field>
        <Field label="سبب الفرق">
          <input value={form.reason} onChange={(e) => onFormChange({ reason: e.target.value })} placeholder="مثال: جرد دوري / كسر / فقد" disabled={!isCountStarted} />
        </Field>
        <Field label="ملاحظة العنصر">
          <textarea rows={2} value={form.itemNote} onChange={(e) => onFormChange({ itemNote: e.target.value })} disabled={!isCountStarted} />
        </Field>
        <Field label="ملاحظة الجلسة">
          <textarea rows={2} value={form.note} onChange={(e) => onFormChange({ note: e.target.value })} />
        </Field>
        <div className="field">
          <span>الإجراء</span>
          <div className="actions compact-actions">
            <Button type="button" variant="secondary" onClick={onAddItem} disabled={!isCountStarted}>إضافة عنصر</Button>
            <SubmitButton
              type="button"
              onClick={() => onSubmit({ noteOverride: buildSessionNoteWithType(form.note) })}
              disabled={isPending || !items.length || !form.locationId || !isCountStarted}
              idleText="إنشاء جلسة الجرد"
              pendingText="جارٍ الإنشاء..."
            />
          </div>
        </div>
      </div>
      <div className="surface-note" style={{ marginTop: 12 }}>اعتماد الجرد يتم من خلال مستخدم لديه صلاحية اعتماد/تسوية المخزون.</div>
      {!canReviewStock ? (
        <div className="surface-note" style={{ marginTop: 12 }}>وضع العد المخفي مفعل لهذا المستخدم لضمان عد فعلي بدون التأثر برصيد النظام.</div>
      ) : null}
      <div className="stats-grid compact-grid workspace-stats-grid" style={{ marginTop: 12 }}>
        <div className="stat-card"><span>العناصر المضافة</span><strong>{items.length}</strong></div>
        {canReviewStock ? <div className="stat-card"><span>الفرق الحالي</span><strong>{selectedProduct ? variancePreview : totalVariance}</strong></div> : null}
        {canReviewStock ? <div className="stat-card"><span>المخزون المتوقع</span><strong>{selectedProduct ? expectedQtyValue : totalExpected}</strong></div> : null}
        <div className="stat-card"><span>المعدود</span><strong>{selectedProduct ? countedQtyValue : totalCounted}</strong></div>
      </div>
      <div className="surface-note" style={{ marginTop: 12 }}>يفضل إدخال سبب واضح لكل فرق حتى تكون جلسة الجرد مفهومة عند المراجعة والطباعة لاحقًا.</div>
      <MutationFeedback isError={isError} isSuccess={isSuccess} error={error} errorFallback="تعذر إنشاء جلسة الجرد" successText="تم إنشاء جلسة الجرد بنجاح." />
      <div className="list-stack" style={{ marginTop: 12 }}>
        {items.length ? items.map((item, index) => (
          <div className="list-row stacked-row" key={item.id}>
            <div>
              <strong>{item.productName}</strong>
              <div className="form-grid" style={{ marginTop: 8 }}>
                {canReviewStock ? (
                  <Field label="كمية النظام">
                    <input value={String(item.expectedQty || 0)} disabled />
                  </Field>
                ) : null}
                <Field label="الكمية المعدودة">
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={String(item.countedQty ?? 0)}
                    onChange={(event) => updateCountItem(index, { countedQty: Number(event.target.value || 0) })}
                  />
                </Field>
                {canReviewStock ? (
                  <Field label="الفرق">
                    <input value={String(item.varianceQty || 0)} disabled />
                  </Field>
                ) : null}
                <Field label="سبب الفرق">
                  <input value={item.reason || ''} onChange={(event) => updateCountItem(index, { reason: event.target.value })} />
                </Field>
              </div>
            </div>
            <Button type="button" variant="danger" onClick={() => onRemoveItem(index)}>حذف</Button>
          </div>
        )) : <EmptyState title="لا توجد عناصر في جلسة الجرد" hint="استخدم الإدخال الإلكتروني لتجهيز أصناف النطاق أو أضف الأصناف التي بها فرق بعد العد الفعلي." />}
      </div>
    </Card>
  );
}

