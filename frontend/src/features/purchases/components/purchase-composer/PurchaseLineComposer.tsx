import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import type { Product } from '@/types/domain';

function renderProductMeta(product: Product) {
  const meta = [product.barcode, product.styleCode].filter(Boolean).join(' · ');
  return meta ? <div className="muted small">{meta}</div> : null;
}

export function PurchaseLineComposer({
  products,
  lineProductId,
  lineQty,
  lineCost,
  lineError,
  productSearch,
  selectedProductName,
  isPending,
  onProductSearchChange,
  onProductSelect,
  onQtyChange,
  onCostChange,
  onAddItem,
  onOpenQuickCreate,
}: {
  products: Product[];
  lineProductId: string;
  lineQty: number;
  lineCost: number;
  lineError: string;
  productSearch: string;
  selectedProductName: string;
  isPending: boolean;
  onProductSearchChange: (value: string) => void;
  onProductSelect: (productId: string) => void;
  onQtyChange: (qty: number) => void;
  onCostChange: (cost: number) => void;
  onAddItem: () => void;
  onOpenQuickCreate: () => void;
}) {
  const hasSearch = Boolean(productSearch.trim());
  const hasSelection = Boolean(lineProductId);

  return (
    <div className="list-stack purchase-line-composer" style={{ gridColumn: '1 / -1' }}>
      <div className="section-title" style={{ marginBottom: 0 }}>
        <div className="section-heading-copy">
          <h3>إضافة صنف للفاتورة</h3>
          <p className="section-description">ابحث بالاسم أو الباركود من نفس الحقل، أو أنشئ صنفًا جديدًا بدون مغادرة فاتورة الشراء.</p>
        </div>
        <div className="actions compact-actions">
          <Button type="button" variant="secondary" onClick={onOpenQuickCreate} disabled={isPending}>إضافة صنف جديد</Button>
        </div>
      </div>
      <div className="toolbar-grid">
        <Field label="بحث واختيار الصنف">
          <div className="list-stack" style={{ gap: 8 }}>
            <input
              value={productSearch}
              onChange={(event) => onProductSearchChange(event.target.value)}
              placeholder="اكتب اسم الصنف أو اضرب الباركود"
              disabled={isPending}
              data-autofocus
            />
            {hasSelection ? <div className="muted small">تم اختيار: <strong>{selectedProductName}</strong></div> : null}
            {hasSearch ? (
              products.length ? (
                <div className="stack-card" style={{ maxHeight: 220, overflowY: 'auto', padding: 8 }}>
                  <div className="list-stack" style={{ gap: 6 }}>
                    {products.map((product) => {
                      const isSelected = String(product.id) === String(lineProductId);
                      return (
                        <button
                          key={product.id}
                          type="button"
                          className="button secondary"
                          style={{ justifyContent: 'space-between', textAlign: 'right', borderColor: isSelected ? 'var(--accent)' : undefined }}
                          onClick={() => onProductSelect(String(product.id))}
                          disabled={isPending}
                        >
                          <span style={{ display: 'grid', gap: 4 }}>
                            <strong>{product.name}</strong>
                            {renderProductMeta(product)}
                          </span>
                          {isSelected ? <span className="nav-pill">محدد</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="muted small">لا يوجد صنف مطابق. أضف صنفًا جديدًا من الزرار بالأعلى.</div>
              )
            ) : (
              <div className="muted small">ابدأ بكتابة اسم الصنف أو اضرب الباركود ليظهر لك الاختيار مباشرة.</div>
            )}
          </div>
        </Field>
        <Field label="الكمية"><input type="number" min="0.001" step="0.001" value={lineQty} onChange={(event) => onQtyChange(Number(event.target.value || 0))} disabled={isPending} /></Field>
        <Field label="التكلفة"><input type="number" min="0" step="0.01" value={lineCost} onChange={(event) => onCostChange(Number(event.target.value || 0))} disabled={isPending} /></Field>
      </div>
      {lineError ? <div className="error-box">{lineError}</div> : null}
      <div className="actions form-subactions">
        <Button type="button" variant="secondary" onClick={onAddItem} disabled={isPending}>إضافة الصنف</Button>
      </div>
    </div>
  );
}
