import { useState, useEffect, useRef } from 'react';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { useCreateProductMutation } from '@/features/products/hooks/useCreateProductMutation';

type SimpleOption = { id: string; name: string };

type Props = {
  isOpen: boolean;
  initialName?: string;
  initialBarcode?: string;
  categories: SimpleOption[];
  suppliers: SimpleOption[];
  warehouses: SimpleOption[];
  onClose: () => void;
  onSuccess: (product: any) => void;
};

export function PurchaseProductQuickCreateModal({
  isOpen,
  initialName = '',
  initialBarcode = '',
  categories,
  suppliers,
  warehouses,
  onClose,
  onSuccess
}: Props) {
  const createProductMutation = useCreateProductMutation();

  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [costPrice, setCostPrice] = useState('0');
  const [retailPrice, setRetailPrice] = useState('0');
  const [wholesalePrice, setWholesalePrice] = useState('0');
  const [unit, setUnit] = useState('قطعة');
  const [minStock, setMinStock] = useState('0');
  const [notes, setNotes] = useState('');

  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const initialSnapshotRef = useRef<string>('');

  useEffect(() => {
    if (!isOpen) return;
    setName(initialName);
    setBarcode(initialBarcode || '');
    setCategoryId('');
    setSupplierId('');
    setWarehouseId('');
    setCostPrice('0');
    setRetailPrice('0');
    setWholesalePrice('0');
    setUnit('قطعة');
    setMinStock('0');
    setNotes('');
    setShowUnsavedConfirm(false);
    initialSnapshotRef.current = JSON.stringify({
      name: initialName, barcode: initialBarcode || '',
      categoryId: '', supplierId: '', warehouseId: '',
      costPrice: '0', retailPrice: '0', wholesalePrice: '0',
      unit: 'قطعة', minStock: '0', notes: ''
    });
  }, [isOpen, initialName, initialBarcode]);

  const currentSnapshot = JSON.stringify({
    name, barcode, categoryId, supplierId, warehouseId,
    costPrice, retailPrice, wholesalePrice, unit, minStock, notes
  });
  const isDirty = isOpen && currentSnapshot !== initialSnapshotRef.current;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDirty]);

  if (!isOpen) return null;

  const requestClose = () => {
    if (isDirty) { setShowUnsavedConfirm(true); return; }
    onClose();
  };

  const submit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const payload = {
      name: trimmedName,
      barcode: barcode.trim(),
      itemType: 'product' as const,
      itemKind: 'standard' as const,
      costPrice: Number(costPrice) || 0,
      retailPrice: Number(retailPrice) || 0,
      wholesalePrice: Number(wholesalePrice) || 0,
      stock: 0,
      minStock: Number(minStock) || 0,
      variantStock: 0,
      categoryId: categoryId || undefined,
      supplierId: supplierId || undefined,
      warehouseId: warehouseId || undefined,
      notes: notes.trim(),
      units: [{
        id: Date.now().toString(),
        name: unit.trim() || 'قطعة',
        multiplier: 1,
        barcode: barcode.trim(),
        isBaseUnit: true,
        isSaleUnit: true,
        isPurchaseUnit: true
      }]
    };

    try {
      const result: any = await createProductMutation.mutateAsync(payload);
      const createdObj =
        result?.products?.find((p: any) => p.name === trimmedName) ||
        result?.products?.[result?.products?.length - 1] ||
        result ||
        {};

      onSuccess({
        id: (createdObj.id ?? createdObj.data?.id)?.toString() || Date.now().toString(),
        name: trimmedName,
        barcode: barcode.trim() || createdObj.barcode || '',
        price: payload.costPrice,
        costPrice: payload.costPrice,
        categoryId: payload.categoryId,
        defaultLocationId: payload.warehouseId,
        type: 'stock'
      });
    } catch (err) {
      console.error(err);
    }
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid rgba(203, 213, 225, 0.82)',
    background: '#fff',
    fontSize: '14px',
    color: '#0f172a',
    boxSizing: 'border-box',
    height: '38px'
  };

  return (
    <div className="purchase-prototype-create-backdrop" role="presentation" onMouseDown={requestClose}>
      <div
        className="purchase-prototype-create-card"
        style={{ maxWidth: '620px', width: '100%' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-product-create-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="purchase-prototype-create-header">
          <div>
            <h4 id="purchase-product-create-title">إنشاء صنف جديد</h4>
            <p>للاستخدام المحلي فقط</p>
          </div>
          <button type="button" className="purchase-prototype-create-close" aria-label="إغلاق" onClick={requestClose}>
            ×
          </button>
        </div>

        <div className="purchase-prototype-create-grid compact-grid-2">
          {/* اسم الصنف */}
          <Field label="اسم الصنف">
            <input
              className="purchase-prototype-create-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </Field>

          {/* الباركود */}
          <Field label="الباركود">
            <input
              className="purchase-prototype-create-input"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="اختياري (سيتولد تلقائياً)"
            />
          </Field>

          {/* القسم */}
          <Field label="القسم">
            <select style={selectStyle} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">اختر القسم...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          {/* المورد */}
          <Field label="المورد">
            <select style={selectStyle} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">اختر المورد...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>

          {/* المخزن الافتراضي */}
          <Field label="المخزن الافتراضي المقترح">
            <select style={selectStyle} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              <option value="">اختر المخزن...</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </Field>

          {/* الوحدة */}
          <Field label="الوحدة الأساسية">
            <input
              className="purchase-prototype-create-input"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="مثال: قطعة، كرتونة"
            />
          </Field>

          {/* سعر الشراء */}
          <Field label="سعر الشراء">
            <input className="purchase-prototype-create-input" type="number" min="0" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
          </Field>

          {/* سعر البيع */}
          <Field label="سعر البيع">
            <input className="purchase-prototype-create-input" type="number" min="0" step="0.01" value={retailPrice} onChange={(e) => setRetailPrice(e.target.value)} />
          </Field>

          {/* سعر الجملة */}
          <Field label="سعر الجملة">
            <input className="purchase-prototype-create-input" type="number" min="0" step="0.01" value={wholesalePrice} onChange={(e) => setWholesalePrice(e.target.value)} />
          </Field>

          {/* الحد الأدنى للمخزون */}
          <Field label="الحد الأدنى للمخزون">
            <input className="purchase-prototype-create-input" type="number" min="0" step="1" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
          </Field>

          {/* ملاحظات */}
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="ملاحظات">
              <textarea className="purchase-prototype-create-textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="purchase-prototype-create-actions">
          <Button variant="secondary" type="button" onClick={requestClose} disabled={createProductMutation.isPending}>
            إلغاء
          </Button>
          <Button type="button" onClick={submit} disabled={createProductMutation.isPending}>
            {createProductMutation.isPending ? 'جارٍ الحفظ...' : 'إنشاء واختيار'}
          </Button>
        </div>
      </div>

      {showUnsavedConfirm && (
        <div
          className="purchase-prototype-create-confirm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="purchase-prototype-confirm-title"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <h4 id="purchase-prototype-confirm-title">يوجد تغييرات غير محفوظة</h4>
          <div className="purchase-prototype-create-confirm-actions">
            <Button variant="secondary" type="button" onClick={() => setShowUnsavedConfirm(false)}>إلغاء</Button>
            <Button type="button" onClick={() => { setShowUnsavedConfirm(false); onClose(); }}>موافق</Button>
          </div>
        </div>
      )}
    </div>
  );
}
