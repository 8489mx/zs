import { useEffect, useMemo, useState } from 'react';
import { FormSection } from '@/shared/components/form-section';
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
  form: { fromLocationId: string; toLocationId: string; note: string; recipientName: string; productId: string; qty: string };
  items: StockTransferItem[];
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  error?: unknown;
  onFormChange: (patch: Partial<{ fromLocationId: string; toLocationId: string; note: string; recipientName: string; productId: string; qty: string }>) => void;
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
    <FormSection title="إذن صرف / نقل مخزون" description="تجميع الأصناف أولًا ثم اعتماد إذن الصرف مع إبقاء المراجعة السريعة للعناصر قبل الإرسال." actions={<span className="nav-pill">أذونات الصرف</span>}>
      <div className="form-grid">
        <Field label="من مخزن">
          <select value={form.fromLocationId} onChange={(e) => onFormChange({ fromLocationId: e.target.value })}>
            <option value="">اختر المصدر</option>
            {warehouseList.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </Field>
        <Field label="إلى مخزن / فرع">
          <select value={form.toLocationId} onChange={(e) => onFormChange({ toLocationId: e.target.value })}>
            <option value="">اختر الوجهة</option>
            {warehouseList.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </Field>
        <Field label="مستلم البضاعة / السائق">
          <input type="text" placeholder="اسم المستلم (اختياري)" value={form.recipientName || ''} onChange={(e) => onFormChange({ recipientName: e.target.value })} />
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
            <Button type="button" variant="secondary" onClick={onAddItem}>إضافة إلى إذن الصرف</Button>
            <SubmitButton type="button" onClick={onSubmit} isPending={isPending} disabled={!items.length} idleText="حفظ إذن الصرف" pendingText="جارٍ الحفظ..." />
          </div>
        </div>
      </div>
      <MutationFeedback isError={isError} isSuccess={isSuccess} error={error} errorFallback="تعذر إنشاء إذن الصرف" successText="تم إنشاء إذن الصرف بنجاح." />
      <div className="list-stack" style={{ marginTop: 12 }}>
        {items.length ? items.map((item, index) => (
          <div className="list-row stacked-row" key={item.id}>
            <div>
              <strong>{item.productName}</strong>
              <div className="muted small">الكمية: {item.qty}</div>
            </div>
            <Button type="button" variant="danger" onClick={() => onRemoveItem(index)}>حذف</Button>
          </div>
        )) : <EmptyState title="لا توجد عناصر مضافة لإذن الصرف" hint="أضف صنفًا واحدًا على الأقل ثم احفظ." />}
      </div>
    </FormSection>
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
    { key: 'quick', label: 'جرد سريع', description: 'عد صنف أو مجموعة بسيطة بسرعة بدون تجهيز قائمة كاملة.' },
    { key: 'selected_items', label: 'أصناف محددة', description: 'اختر الأصناف التي تريد عدها يدويًا قبل إنشاء الجلسة.' },
    { key: 'category', label: 'جرد قسم / تصنيف', description: 'اختر القسم مباشرة ثم اطبع شيت عد أو افتح الإدخال الإلكتروني لأصناف هذا القسم.' },
    { key: 'full', label: 'جرد كامل', description: 'جهّز شيت عد لكل الأصناف ثم أدخل الفروقات بعد العد الفعلي.' },
  ]), []);
  const [countType, setCountType] = useState<StockCountType>('quick');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [isCountStarted, setIsCountStarted] = useState(false);
  const [startCountMessage, setStartCountMessage] = useState('');
  const [showExpectedInElectronicCount, setShowExpectedInElectronicCount] = useState(false);
  const selectedProduct = products.find((product) => String(product.id) === String(form.productId));
  const expectedQtyValue = Number(selectedProduct?.stock || 0);
  const countedQtyValue = Number(form.countedQty || 0);
  const variancePreview = Number((countedQtyValue - expectedQtyValue).toFixed(3));
  const totalExpected = items.reduce((sum, item) => sum + Number(item.expectedQty || 0), 0);
  const totalCounted = items.reduce((sum, item) => sum + Number(item.countedQty || 0), 0);
  const totalVariance = Number(items.reduce((sum, item) => sum + Number(item.varianceQty || 0), 0).toFixed(3));
  const countedItems = items.filter((item) => Number(item.countedQty || 0) > 0 || Number(item.varianceQty || 0) !== 0 || String(item.reason || '').trim()).length;
  const varianceItems = items.filter((item) => Number(item.varianceQty || 0) !== 0).length;
  const selectedCountType = countTypeOptions.find((entry) => entry.key === countType) || countTypeOptions[0];
  const canShowExpectedCount = canReviewStock && showExpectedInElectronicCount;
  const progressPercent = items.length ? Math.min(100, Math.round((countedItems / items.length) * 100)) : 0;

  useEffect(() => {
    if (!form.locationId) {
      setIsCountStarted(false);
      setStartCountMessage('');
    }
  }, [form.locationId]);

  useEffect(() => {
    if (countType !== 'category') setSelectedCategoryId('');
    onItemsChange(() => []);
    setIsCountStarted(false);
    setStartCountMessage('');
  }, [countType, onItemsChange]);

  useEffect(() => {
    if (isSuccess) {
      setIsCountStarted(false);
      setCountType('quick');
      setSelectedCategoryId('');
      setShowExpectedInElectronicCount(false);
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

  function handleBackToSetup() {
    setIsCountStarted(false);
    setStartCountMessage('');
  }

  function buildSessionNoteWithType(baseNote: string) {
    const categoryLabel = categoryOptions.find((category) => category.id === selectedCategoryId)?.label;
    const line = `نوع الجرد: ${selectedCountType.label}${categoryLabel ? ` - ${categoryLabel}` : ''}`;
    const visibilityLine = `عرض كمية النظام أثناء العد الإلكتروني: ${showExpectedInElectronicCount ? 'نعم' : 'لا'}`;
    const trimmedBase = String(baseNote || '').trim();
    const metadata = `${line}\n${visibilityLine}`;
    if (!trimmedBase) return metadata;
    if (trimmedBase.includes(line)) return trimmedBase;
    return `${trimmedBase}\n${metadata}`;
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
    <FormSection
      title="جلسة جرد مخزون"
      description={isCountStarted ? 'راجع الأصناف، أدخل الكميات الفعلية، ثم أنشئ جلسة الجرد بعد المراجعة.' : 'ابدأ بخطوات قليلة: اختر طريقة الجرد، النطاق، وطريقة العد.'}
      actions={<span className="nav-pill">{isCountStarted ? 'مرحلة العد والمراجعة' : 'إنشاء الجلسة'}</span>}
    >
      {!isCountStarted ? (
        <div className="stock-count-setup-stack">
          <div className="stock-count-step-card">
            <div className="stock-count-step-heading">
              <span>1</span>
              <div>
                <strong>اختر طريقة الجرد</strong>
                <small>اختار طريقة واحدة فقط عشان الصفحة تعرض المطلوب بدون زحمة.</small>
              </div>
            </div>
            <div className="stock-count-method-grid">
              {countTypeOptions.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  className={`stock-count-method-card ${countType === entry.key ? 'stock-count-method-card--active' : ''}`}
                  onClick={() => setCountType(entry.key)}
                >
                  <strong>{entry.label}</strong>
                  <span>{entry.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="stock-count-step-card">
            <div className="stock-count-step-heading">
              <span>2</span>
              <div>
                <strong>حدد نطاق الجرد</strong>
                <small>المخزن إجباري، والقسم يظهر فقط مع جرد قسم / تصنيف.</small>
              </div>
            </div>
            <div className="form-grid stock-count-compact-form">
              {!SINGLE_STORE_MODE ? <Field label="الفرع">
                <select value={form.branchId} onChange={(e) => onFormChange({ branchId: e.target.value })}>
                  <option value="">بدون فرع</option>
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              </Field> : null}
              <Field label="المخزن">
                <select value={form.locationId} onChange={(e) => onFormChange({ locationId: e.target.value })}>
                  <option value="">اختر المخزن</option>
                  {warehouseList.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                </select>
              </Field>
              {countType === 'category' ? (
                <Field label="القسم / التصنيف">
                  <select value={selectedCategoryId} onChange={(e) => { setSelectedCategoryId(e.target.value); onItemsChange(() => []); }}>
                    <option value="">اختر القسم</option>
                    {categoryOptions.map((category) => <option key={category.id} value={category.id}>{category.label} ({category.count})</option>)}
                  </select>
                </Field>
              ) : null}
              <Field label="ملاحظة الجلسة">
                <textarea rows={2} value={form.note} onChange={(e) => onFormChange({ note: e.target.value })} placeholder="مثال: جرد أسبوعي / جرد قبل طلبية المورد" />
              </Field>
            </div>
          </div>

          <div className="stock-count-step-card">
            <div className="stock-count-step-heading">
              <span>3</span>
              <div>
                <strong>طريقة العد</strong>
                <small>اختار إظهار كمية النظام في العد الإلكتروني حسب صلاحية المستخدم وطريقة العمل.</small>
              </div>
            </div>
            <div className="stock-count-mode-grid">
              <div className="stock-count-mode-card">
                <strong>جرد ورقي</strong>
                <span>اطبع شيت العد وروح عدّ فعليا داخل النشاط.</span>
              </div>
              <div className="stock-count-mode-card">
                <strong>جرد إلكتروني</strong>
                <span>افتح الأصناف داخل الجلسة وأدخل الكميات على النظام.</span>
              </div>
              <div className="stock-count-mode-card">
                <strong>CSV</strong>
                <span>صدّر الملف، املأ الكميات، ثم ارجع أدخلها أو ارفعها لاحقًا.</span>
              </div>
            </div>
            <label className="stock-count-expected-toggle">
              <input type="checkbox" checked={showExpectedInElectronicCount} onChange={(event) => setShowExpectedInElectronicCount(event.target.checked)} disabled={!canReviewStock} />
              <span>إظهار كمية النظام أثناء الإدخال الإلكتروني</span>
            </label>
            {!canReviewStock ? <div className="surface-note">وضع العد المخفي مفعل لهذا المستخدم لضمان عد فعلي بدون التأثر برصيد النظام.</div> : null}
          </div>

          {startCountMessage ? <div className="warning-box">{startCountMessage}</div> : null}
          <div className="stock-count-start-actions">
            <Button type="button" onClick={handleStartCount}>ابدأ جلسة الجرد</Button>
          </div>
        </div>
      ) : (
        <div className="stock-count-review-stack">
          <div className="stock-count-session-bar">
            <div>
              <span>جلسة جرد</span>
              <strong>{selectedCountType.label}</strong>
              <small>{selectedLocation?.name ? `المخزن: ${selectedLocation.name}` : 'اختر المخزن من الإعدادات'}{selectedCategoryId ? ` · القسم: ${categoryOptions.find((category) => category.id === selectedCategoryId)?.label || selectedCategoryId}` : ''}</small>
            </div>
            <div className="actions compact-actions">
              <Button type="button" variant="secondary" onClick={handleBackToSetup} disabled={isPending}>تعديل الإعدادات</Button>
              <SubmitButton type="button" onClick={() => onSubmit({ noteOverride: buildSessionNoteWithType(form.note) })} disabled={isPending || !items.length || !form.locationId} idleText="إنشاء جلسة الجرد" pendingText="جارٍ الإنشاء..." />
            </div>
          </div>

          <div className="stock-count-progress-card">
            <div className="stock-count-progress-copy">
              <span>تقدم العد</span>
              <strong>{countedItems} من {items.length}</strong>
              <small>{varianceItems ? `${varianceItems} أصناف بها فروقات` : 'لا توجد فروقات مسجلة حتى الآن'}</small>
            </div>
            <div className="stock-count-progress-track" aria-label="تقدم العد">
              <span style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div className="stats-grid compact-grid workspace-stats-grid">
            <div className="stat-card"><span>العناصر المضافة</span><strong>{items.length}</strong></div>
            {canShowExpectedCount ? <div className="stat-card"><span>الفرق الحالي</span><strong>{selectedProduct ? variancePreview : totalVariance}</strong></div> : null}
            {canShowExpectedCount ? <div className="stat-card"><span>المخزون المتوقع</span><strong>{selectedProduct ? expectedQtyValue : totalExpected}</strong></div> : null}
            <div className="stat-card"><span>المعدود</span><strong>{selectedProduct ? countedQtyValue : totalCounted}</strong></div>
          </div>

          <StockCountSheetTools products={products} items={items} countType={countType} selectedProduct={selectedProduct} selectedCategoryId={selectedCategoryId} locationName={selectedLocation?.name} isCountStarted={isCountStarted} onItemsChange={onItemsChange} />

          <div className="stock-count-entry-panel">
            <div className="stock-count-entry-heading">
              <strong>إدخال صنف يدوي</strong>
              <span>استخدمه للجرد السريع أو لإضافة صنف ناقص من الشيت.</span>
            </div>
            <div className="form-grid stock-count-compact-form">
              <Field label="الصنف">
                <InventoryProductPicker products={products} value={form.productId} onChange={(productId) => onFormChange({ productId })} showStock showPrice={false} helperText="اختر صنفًا لإدخال كمية العد أو لإضافته للجلسة." />
              </Field>
              <Field label="الكمية المعدودة">
                <input type="number" min="0" step="0.001" value={form.countedQty} onChange={(e) => onFormChange({ countedQty: e.target.value })} />
              </Field>
              <Field label="سبب الفرق">
                <input value={form.reason} onChange={(e) => onFormChange({ reason: e.target.value })} placeholder="مثال: جرد دوري / كسر / فقد" />
              </Field>
              <Field label="ملاحظة العنصر">
                <textarea rows={2} value={form.itemNote} onChange={(e) => onFormChange({ itemNote: e.target.value })} />
              </Field>
              <div className="field">
                <span>الإجراء</span>
                <Button type="button" variant="secondary" onClick={onAddItem}>إضافة عنصر</Button>
              </div>
            </div>
          </div>

          <MutationFeedback isError={isError} isSuccess={isSuccess} error={error} errorFallback="تعذر إنشاء جلسة الجرد" successText="تم إنشاء جلسة الجرد بنجاح." />

          <div className="table-wrap stock-count-items-table-wrap">
            {items.length ? (
              <table className="stock-count-items-table">
                <thead>
                  <tr>
                    <th>الصنف</th>
                    {canShowExpectedCount ? <th>كمية النظام</th> : null}
                    <th>الكمية المعدودة</th>
                    {canShowExpectedCount ? <th>الفرق</th> : null}
                    <th>سبب الفرق</th>
                    <th>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id}>
                      <td><strong>{item.productName}</strong></td>
                      {canShowExpectedCount ? <td className="muted">{item.expectedQty || 0}</td> : null}
                      <td>
                        <input type="number" min="0" step="0.001" value={String(item.countedQty ?? 0)} onChange={(event) => updateCountItem(index, { countedQty: Number(event.target.value || 0) })} />
                      </td>
                      {canShowExpectedCount ? <td><span className={Number(item.varianceQty || 0) === 0 ? 'stock-count-variance stock-count-variance--zero' : 'stock-count-variance'}>{item.varianceQty || 0}</span></td> : null}
                      <td>
                        <input value={item.reason || ''} onChange={(event) => updateCountItem(index, { reason: event.target.value })} placeholder="سبب الفرق" />
                      </td>
                      <td>
                        <Button type="button" variant="secondary" onClick={() => onRemoveItem(index)}>إزالة</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <EmptyState title="لا توجد عناصر في جلسة الجرد" hint="استخدم أزرار العد الورقي/الإلكتروني أو أضف صنفًا يدويًا بعد بدء الجلسة." />}
          </div>
        </div>
      )}
    </FormSection>
  );
}
