import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field } from '@/components/ui/Field';
import { MutationFeedback } from '@/components/shared/MutationFeedback';
import { SubmitButton } from '@/components/shared/SubmitButton';
import type { Branch, Location, Product, StockCountItem, StockTransferItem } from '@/types/domain';
import { SINGLE_STORE_MODE } from '@/config/product-scope';

interface StockTransferComposerCardProps {
  products: Product[];
  locations: Location[];
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
  return (
    <Card title="تحويل مخزون بين المواقع" description="تجميع العناصر أولًا ثم اعتماد التحويل مع إبقاء المراجعة السريعة للعناصر قبل الإرسال." actions={<span className="nav-pill">التحويلات</span>}>
      <div className="form-grid">
        <Field label="من موقع">
          <select value={form.fromLocationId} onChange={(e) => onFormChange({ fromLocationId: e.target.value })}>
            <option value="">اختر المصدر</option>
            {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </Field>
        <Field label="إلى موقع">
          <select value={form.toLocationId} onChange={(e) => onFormChange({ toLocationId: e.target.value })}>
            <option value="">اختر الوجهة</option>
            {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </Field>
        <Field label="الصنف">
          <select value={form.productId} onChange={(e) => onFormChange({ productId: e.target.value })}>
            <option value="">اختر الصنف</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
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
  locations: Location[];
  form: { branchId: string; locationId: string; note: string; managerPin: string; productId: string; countedQty: string; reason: string; itemNote: string };
  items: StockCountItem[];
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  error?: unknown;
  onFormChange: (patch: Partial<{ branchId: string; locationId: string; note: string; managerPin: string; productId: string; countedQty: string; reason: string; itemNote: string }>) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onSubmit: () => void;
}

export function StockCountComposerCard({
  products,
  branches,
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
}: StockCountComposerCardProps) {
  const selectedProduct = products.find((product) => String(product.id) === String(form.productId));
  const expectedQtyValue = Number(selectedProduct?.stock || 0);
  const countedQtyValue = Number(form.countedQty || 0);
  const variancePreview = Number((countedQtyValue - expectedQtyValue).toFixed(3));
  const totalExpected = items.reduce((sum, item) => sum + Number(item.expectedQty || 0), 0);
  const totalCounted = items.reduce((sum, item) => sum + Number(item.countedQty || 0), 0);
  const totalVariance = Number(items.reduce((sum, item) => sum + Number(item.varianceQty || 0), 0).toFixed(3));

  return (
    <Card title="جلسة جرد مخزون" description="إظهار المتوقع والمعدود والفرق قبل الإنشاء حتى لا يفقد المستخدم الصورة الكاملة أثناء التجميع." actions={<span className="nav-pill">جلسات الجرد</span>}>
      <div className="form-grid">
        {!SINGLE_STORE_MODE ? <Field label="الفرع">
          <select value={form.branchId} onChange={(e) => onFormChange({ branchId: e.target.value })}>
            <option value="">بدون فرع</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </Field> : null}
        <Field label={SINGLE_STORE_MODE ? 'المخزن' : 'الموقع'}>
          <select value={form.locationId} onChange={(e) => onFormChange({ locationId: e.target.value })}>
            <option value="">اختر الموقع</option>
            {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </Field>
        <Field label="الصنف">
          <select value={form.productId} onChange={(e) => onFormChange({ productId: e.target.value })}>
            <option value="">اختر الصنف</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
        </Field>
        <Field label="الكمية المعدودة">
          <input type="number" min="0" step="0.001" value={form.countedQty} onChange={(e) => onFormChange({ countedQty: e.target.value })} />
        </Field>
        <Field label="سبب الفرق">
          <input value={form.reason} onChange={(e) => onFormChange({ reason: e.target.value })} placeholder="مثال: جرد دوري / كسر / فقد" />
        </Field>
        <Field label="رمز اعتماد المدير">
          <input type="password" value={form.managerPin} onChange={(e) => onFormChange({ managerPin: e.target.value })} />
        </Field>
        <Field label="ملاحظة العنصر">
          <textarea rows={2} value={form.itemNote} onChange={(e) => onFormChange({ itemNote: e.target.value })} />
        </Field>
        <Field label="ملاحظة الجلسة">
          <textarea rows={2} value={form.note} onChange={(e) => onFormChange({ note: e.target.value })} />
        </Field>
        <div className="field">
          <span>الإجراء</span>
          <div className="actions compact-actions">
            <Button type="button" variant="secondary" onClick={onAddItem}>إضافة عنصر</Button>
            <SubmitButton type="button" onClick={onSubmit} disabled={isPending || !items.length || !form.locationId} idleText="إنشاء جلسة الجرد" pendingText="جارٍ الإنشاء..." />
          </div>
        </div>
      </div>
      <div className="stats-grid compact-grid workspace-stats-grid" style={{ marginTop: 12 }}>
        <div className="stat-card"><span>العناصر المضافة</span><strong>{items.length}</strong></div>
        <div className="stat-card"><span>الفرق الحالي</span><strong>{selectedProduct ? variancePreview : totalVariance}</strong></div>
        <div className="stat-card"><span>المخزون المتوقع</span><strong>{selectedProduct ? expectedQtyValue : totalExpected}</strong></div>
        <div className="stat-card"><span>المعدود</span><strong>{selectedProduct ? countedQtyValue : totalCounted}</strong></div>
      </div>
      <div className="surface-note" style={{ marginTop: 12 }}>يفضل إدخال سبب واضح لكل فرق حتى تكون جلسة الجرد مفهومة عند المراجعة والطباعة لاحقًا.</div>
      <MutationFeedback isError={isError} isSuccess={isSuccess} error={error} errorFallback="تعذر إنشاء جلسة الجرد" successText="تم إنشاء جلسة الجرد بنجاح." />
      <div className="list-stack" style={{ marginTop: 12 }}>
        {items.length ? items.map((item, index) => (
          <div className="list-row stacked-row" key={item.id}>
            <div>
              <strong>{item.productName}</strong>
              <div className="muted small">متوقع: {item.expectedQty} · معدود: {item.countedQty} · فرق: {item.varianceQty}</div>
              <div className="muted small">السبب: {item.reason || '—'}</div>
            </div>
            <Button type="button" variant="danger" onClick={() => onRemoveItem(index)}>حذف</Button>
          </div>
        )) : <EmptyState title="لا توجد عناصر في جلسة الجرد" hint="أضف الأصناف المعدودة قبل إنشاء الجلسة." />}
      </div>
    </Card>
  );
}
