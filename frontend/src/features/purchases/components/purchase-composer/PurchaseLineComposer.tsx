import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import type { Product } from '@/types/domain';

export function PurchaseLineComposer({ products, lineProductId, lineQty, lineCost, lineError, isPending, onProductChange, onQtyChange, onCostChange, onAddItem }: {
  products: Product[];
  lineProductId: string;
  lineQty: number;
  lineCost: number;
  lineError: string;
  isPending: boolean;
  onProductChange: (productId: string) => void;
  onQtyChange: (qty: number) => void;
  onCostChange: (cost: number) => void;
  onAddItem: () => void;
}) {
  return (
    <div className="list-stack" style={{ gridColumn: '1 / -1' }}>
      <strong>إضافة صنف للفاتورة</strong>
      <div className="toolbar-grid">
        <Field label="الصنف">
          <select value={lineProductId} onChange={(event) => onProductChange(event.target.value)} disabled={isPending}>
            <option value="">اختر الصنف</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
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
