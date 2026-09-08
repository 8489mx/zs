import React, { useState, useMemo } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import { PlusIcon, XIcon } from '@/shared/components/icons/AppIcons';
import { useFormDraft } from '@/shared/hooks/use-form-draft';
import { DraftRestoredBanner } from '@/shared/components/DraftRestoredBanner';
import { CreatePurchaseOrderPayload, PurchaseOrderItem } from '../api/purchase-orders.api';

interface CreatePurchaseOrderModalProps {
  open: boolean;
  onClose: () => void;
  suppliers: any[];
  products: any[];
  onSubmit: (payload: CreatePurchaseOrderPayload) => void;
  isPending: boolean;
}

export const CreatePurchaseOrderModal: React.FC<CreatePurchaseOrderModalProps> = ({
  open,
  onClose,
  suppliers,
  products,
  onSubmit,
  isPending,
}) => {
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [warehouseName, setWarehouseName] = useState('المخزن الرئيسي');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const termsConditions = 'يتم فحص ومطابقة البضاعة الموردة مع أمر الشراء قبل الاستلام النهائي.';
  const [items, setItems] = useState<Array<PurchaseOrderItem & { productId: number; productName: string }>>([
    { productId: 1, productName: '', unitName: 'قطعة', quantity: 1, unitCost: 0, taxRate: 0, discount: 0, total: 0 },
  ]);

  const draftData = useMemo(() => ({
    selectedSupplierId,
    supplierName,
    supplierPhone,
    warehouseName,
    expectedDeliveryDate,
    notes,
    items,
  }), [selectedSupplierId, supplierName, supplierPhone, warehouseName, expectedDeliveryDate, notes, items]);

  const resetForm = () => {
    clearDraft();
    setSelectedSupplierId(null);
    setSupplierName('');
    setSupplierPhone('');
    setWarehouseName('المخزن الرئيسي');
    setExpectedDeliveryDate('');
    setNotes('');
    setItems([
      { productId: 1, productName: '', unitName: 'قطعة', quantity: 1, unitCost: 0, taxRate: 0, discount: 0, total: 0 },
    ]);
  };

  const { clearDraft, isDraftRestored, dismissRestoredNotice } = useFormDraft({
    key: 'z_draft_purchase_order_po',
    data: draftData,
    isEmpty: (d) => {
      const hasHeader = Boolean(d.selectedSupplierId || d.supplierName?.trim() || d.notes?.trim());
      const hasItems = Array.isArray(d.items) && d.items.some(it => Boolean(it.productName?.trim() || it.unitCost > 0));
      return !hasHeader && !hasItems;
    },
    onRestore: (saved) => {
      if (saved.selectedSupplierId) setSelectedSupplierId(saved.selectedSupplierId);
      if (saved.supplierName) setSupplierName(saved.supplierName);
      if (saved.supplierPhone) setSupplierPhone(saved.supplierPhone);
      if (saved.warehouseName) setWarehouseName(saved.warehouseName);
      if (saved.expectedDeliveryDate) setExpectedDeliveryDate(saved.expectedDeliveryDate);
      if (saved.notes) setNotes(saved.notes);
      if (Array.isArray(saved.items) && saved.items.length > 0) {
        setItems(saved.items);
      }
    },
  });

  const handleAddItem = () => {
    setItems([
      ...items,
      { productId: 1, productName: '', unitName: 'قطعة', quantity: 1, unitCost: 0, taxRate: 0, discount: 0, total: 0 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    const current = { ...updated[index] };

    if (field === 'productId') {
      const pId = Number(value);
      current.productId = pId;
      const found = products.find((p: any) => p.id === pId);
      if (found) {
        current.productName = found.name;
        current.unitCost = Number(found.costPrice || found.cost_price || 0);
        current.unitName = found.unit || 'قطعة';
      }
    } else {
      (current as any)[field] = value;
    }

    const qty = Number(current.quantity) || 0;
    const cost = Number(current.unitCost) || 0;
    const disc = Number(current.discount) || 0;
    current.total = Math.max(0, qty * cost - disc);

    updated[index] = current;
    setItems(updated);
  };

  const subtotal = items.reduce((sum, it) => sum + Number(it.quantity || 0) * Number(it.unitCost || 0), 0);
  const discountTotal = items.reduce((sum, it) => sum + Number(it.discount || 0), 0);
  const totalAmount = Math.max(0, subtotal - discountTotal);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      alert('يرجى تحديد المورد');
      return;
    }

    const validItems = items.filter((it) => it.productName.trim() && Number(it.quantity) > 0);
    if (!validItems.length) {
      alert('يرجى إضافة صنف واحد على الأقل مع تحديد الكمية');
      return;
    }

    onSubmit({
      supplierId: selectedSupplierId || undefined,
      supplierName: supplierName.trim(),
      supplierPhone: supplierPhone.trim() || undefined,
      warehouseName: warehouseName.trim() || undefined,
      expectedDeliveryDate: expectedDeliveryDate || undefined,
      subtotal,
      discountAmount: discountTotal,
      taxAmount: 0,
      totalAmount,
      notes: notes.trim() || undefined,
      termsConditions: termsConditions.trim() || undefined,
      items: validItems.map((it) => ({
        productId: it.productId,
        productName: it.productName.trim(),
        unitName: it.unitName?.trim(),
        quantity: Number(it.quantity),
        unitCost: Number(it.unitCost),
        taxRate: 0,
        discount: Number(it.discount || 0),
        total: Number(it.total),
      })),
    });
  };

  return (
    <DialogShell
      open={true}
      onClose={onClose}
      ariaLabel="إنشاء أمر شراء جديد للمورد"
      width="min(880px, 96vw)"
    >
      <div dir="rtl" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="standard-dialog-header">
          <div className="standard-dialog-header-info">
            <h3 className="standard-dialog-title">إنشاء أمر شراء جديد (Purchase Order)</h3>
            <p className="standard-dialog-subtitle">إصدار أمر الشراء للمورد وحجز الكميات بانتظار استلام البضاعة</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="standard-dialog-close-btn"
            aria-label="إغلاق"
          >
            <XIcon size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <DraftRestoredBanner
            show={isDraftRestored}
            onClear={resetForm}
            onDismiss={dismissRestoredNotice}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div className="field">
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>المورد *</label>
              <select
                value={selectedSupplierId || ''}
                onChange={(e) => {
                  const sId = Number(e.target.value);
                  setSelectedSupplierId(sId || null);
                  const found = suppliers.find((s: any) => s.id === sId);
                  if (found) {
                    setSupplierName(found.name);
                    setSupplierPhone(found.phone || '');
                  }
                }}
                style={{ width: '100%', padding: '8px 12px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
              >
                <option value="">اختر المورد من القائمة أو أدخل يدوياً</option>
                {suppliers.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.phone ? `(${s.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>اسم المورد (تأكيد) *</label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="أدخل اسم المورد"
                style={{ width: '100%', padding: '8px 12px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
                required
              />
            </div>

            <div className="field">
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>هاتف المورد</label>
              <input
                type="text"
                value={supplierPhone}
                onChange={(e) => setSupplierPhone(e.target.value)}
                placeholder="رقم التواصل"
                style={{ width: '100%', padding: '8px 12px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
              />
            </div>

            <div className="field">
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>مستودع الاستلام</label>
              <input
                type="text"
                value={warehouseName}
                onChange={(e) => setWarehouseName(e.target.value)}
                placeholder="اسم المستودع أو الفرع"
                style={{ width: '100%', padding: '8px 12px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
              />
            </div>

            <div className="field">
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>تاريخ التوريد المتوقع</label>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
              />
            </div>

            <div className="field">
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>ملاحظات داخلية</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي شروط أو متطلبات خاصة للتوريد"
                style={{ width: '100%', padding: '8px 12px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Items Table */}
          <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', fontWeight: 700, fontSize: '12px', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #cbd5e1' }}>
              <span>بنود وأصناف أمر الشراء</span>
              <Button type="button" variant="secondary" onClick={handleAddItem} style={{ fontSize: '12px', height: '28px', padding: '0 10px' }}>
                <PlusIcon className="w-3.5 h-3.5 ml-1" />
                إضافة صنف
              </Button>
            </div>

            <div style={{ padding: '12px', overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead style={{ color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ paddingBottom: '8px' }}>الصنف</th>
                    <th style={{ paddingBottom: '8px', width: '90px' }}>الكمية</th>
                    <th style={{ paddingBottom: '8px', width: '110px' }}>سعر التكلفة</th>
                    <th style={{ paddingBottom: '8px', width: '90px' }}>الخصم</th>
                    <th style={{ paddingBottom: '8px', width: '110px' }}>الإجمالي</th>
                    <th style={{ paddingBottom: '8px', width: '36px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 4px' }}>
                        <select
                          value={it.productId || ''}
                          onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                          style={{ width: '100%', fontSize: '12px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#ffffff' }}
                        >
                          <option value="">اختر صنفاً</option>
                          {products.map((p: any) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (التكلفة الحالية: {formatCurrency(p.costPrice || p.cost_price || 0)})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '6px 4px' }}>
                        <input
                          type="number"
                          min="1"
                          value={it.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          style={{ width: '100%', fontSize: '12px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', textAlign: 'center' }}
                        />
                      </td>
                      <td style={{ padding: '6px 4px' }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={it.unitCost}
                          onChange={(e) => handleItemChange(idx, 'unitCost', e.target.value)}
                          style={{ width: '100%', fontSize: '12px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', textAlign: 'center' }}
                        />
                      </td>
                      <td style={{ padding: '6px 4px' }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={it.discount}
                          onChange={(e) => handleItemChange(idx, 'discount', e.target.value)}
                          style={{ width: '100%', fontSize: '12px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', textAlign: 'center' }}
                        />
                      </td>
                      <td style={{ padding: '6px 4px', fontWeight: 700, color: '#1e293b' }}>
                        {formatCurrency(Number(it.total || 0))}
                      </td>
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                        >
                          <XIcon size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 16px', borderTop: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
              <div style={{ textAlign: 'left', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '200px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>المجموع:</span>
                  <strong>{formatCurrency(subtotal)}</strong>
                </div>
                {discountTotal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                    <span>إجمالي الخصم:</span>
                    <strong>{formatCurrency(discountTotal)}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '13.5px', color: '#170e5e', paddingTop: '4px', borderTop: '1px solid #cbd5e1' }}>
                  <span>الصافي المطلوب:</span>
                  <strong>{formatCurrency(totalAmount)}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="standard-dialog-footer">
            <Button type="button" variant="secondary" onClick={onClose}>
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              style={{ backgroundColor: '#170e5e', color: '#ffffff' }}
            >
              {isPending ? 'جاري الحفظ...' : 'حفظ أمر الشراء كمسودة'}
            </Button>
          </div>
        </form>
      </div>
    </DialogShell>
  );
};
