import React, { useState, useMemo } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import {
  PlusIcon,
  Trash2Icon,
  XIcon,
  LockIcon,
  PackageIcon,
} from '@/shared/components/icons/AppIcons';
import { OrderItemProductPicker } from './OrderItemProductPicker';
import { useFormDraft } from '@/shared/hooks/use-form-draft';
import { DraftRestoredBanner } from '@/shared/components/DraftRestoredBanner';
import type { Product } from '@/types/domain';
import type { CreateSalesOrderPayload, SalesOrderItem } from '../api/sales-orders.api';

interface SalesOrderItemFormRow extends SalesOrderItem {
  productId: number;
  productName: string;
  stockOnHand?: number;
  barcode?: string;
}

interface CreateSalesOrderModalProps {
  open: boolean;
  onClose: () => void;
  catalogProducts: Product[];
  onSubmit: (payload: CreateSalesOrderPayload) => void;
  isPending: boolean;
}

export const CreateSalesOrderModal: React.FC<CreateSalesOrderModalProps> = ({
  open,
  onClose,
  catalogProducts,
  onSubmit,
  isPending,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [reservationExpiresAt, setReservationExpiresAt] = useState('');
  const [autoReserve, setAutoReserve] = useState(true);
  const [notes, setNotes] = useState('');
  const termsConditions = 'يتم حجز الأصناف المحددة بالمخزون لحين استلام العميل وسداد قيمة الفاتورة.';
  const [items, setItems] = useState<SalesOrderItemFormRow[]>([
    { productId: 0, productName: '', unitName: 'قطعة', quantity: 1, unitPrice: 0, discount: 0, total: 0, stockOnHand: 0 },
  ]);

  const draftData = useMemo(() => ({
    customerName,
    customerPhone,
    customerAddress,
    deliveryDate,
    reservationExpiresAt,
    autoReserve,
    notes,
    items,
  }), [customerName, customerPhone, customerAddress, deliveryDate, reservationExpiresAt, autoReserve, notes, items]);

  const resetForm = () => {
    clearDraft();
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setDeliveryDate('');
    setReservationExpiresAt('');
    setAutoReserve(true);
    setNotes('');
    setItems([
      { productId: 0, productName: '', unitName: 'قطعة', quantity: 1, unitPrice: 0, discount: 0, total: 0, stockOnHand: 0 },
    ]);
  };

  const { clearDraft, isDraftRestored, dismissRestoredNotice } = useFormDraft({
    key: 'z_draft_sales_order',
    data: draftData,
    isEmpty: (d) => {
      const hasHeader = Boolean(d.customerName?.trim() || d.customerPhone?.trim() || d.notes?.trim());
      const hasItems = Array.isArray(d.items) && d.items.some(it => Boolean(it.productId > 0 || it.productName?.trim()));
      return !hasHeader && !hasItems;
    },
    onRestore: (saved) => {
      if (saved.customerName) setCustomerName(saved.customerName);
      if (saved.customerPhone) setCustomerPhone(saved.customerPhone);
      if (saved.customerAddress) setCustomerAddress(saved.customerAddress);
      if (saved.deliveryDate) setDeliveryDate(saved.deliveryDate);
      if (saved.reservationExpiresAt) setReservationExpiresAt(saved.reservationExpiresAt);
      if (typeof saved.autoReserve === 'boolean') setAutoReserve(saved.autoReserve);
      if (saved.notes) setNotes(saved.notes);
      if (Array.isArray(saved.items) && saved.items.length > 0) {
        setItems(saved.items);
      }
    },
  });

  const handleItemChange = (index: number, field: keyof SalesOrderItemFormRow, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };
    const qty = Number(field === 'quantity' ? value : item.quantity) || 0;
    const price = Number(field === 'unitPrice' ? value : item.unitPrice) || 0;
    const discount = Number(field === 'discount' ? value : item.discount) || 0;
    item.total = Math.max(0, qty * price - discount);
    updated[index] = item;
    setItems(updated);
  };

  const handleSelectProduct = (index: number, prod: Product) => {
    const updated = [...items];
    const qty = Number(updated[index]?.quantity) || 1;
    const price = Number(prod.retailPrice || prod.wholesalePrice || 0);
    const discount = Number(updated[index]?.discount) || 0;
    const unit = prod.units?.[0]?.name || 'قطعة';
    const stock = Number(prod.stock ?? 0);

    updated[index] = {
      ...updated[index],
      productId: Number(prod.id),
      productName: prod.name,
      unitName: unit,
      unitPrice: price,
      stockOnHand: stock,
      barcode: prod.barcode || '',
      total: Math.max(0, qty * price - discount),
    };
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        productId: 0,
        productName: '',
        unitName: 'قطعة',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        total: 0,
        stockOnHand: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce(
    (sum, it) => sum + Number(it.quantity || 0) * Number(it.unitPrice || 0),
    0
  );
  const totalDiscount = items.reduce((sum, it) => sum + Number(it.discount || 0), 0);
  const totalAmount = Math.max(0, subtotal - totalDiscount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('يرجى كتابة اسم العميل');
      return;
    }

    const validItems = items.filter((it) => it.productName.trim() && Number(it.quantity) > 0);
    if (validItems.length === 0) {
      alert('يرجى إضافة صنف واحد على الأقل باسم وكمية صحيحة');
      return;
    }

    onSubmit({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      customerAddress: customerAddress.trim() || undefined,
      deliveryDate: deliveryDate || undefined,
      reservationExpiresAt: reservationExpiresAt || undefined,
      autoReserve,
      subtotal,
      discountAmount: totalDiscount,
      taxAmount: 0,
      totalAmount,
      notes: notes.trim() || undefined,
      termsConditions: termsConditions.trim() || undefined,
      items: validItems.map((it) => ({
        productId: it.productId,
        productName: it.productName.trim(),
        unitName: it.unitName?.trim(),
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        discount: Number(it.discount || 0),
        total: Number(it.total),
        notes: it.notes?.trim(),
      })),
    });
  };

  if (!open) return null;

  return (
    <DialogShell
      open={true}
      onClose={onClose}
      width="min(920px, 96vw)"
      ariaLabel="إنشاء أمر بيع جديد"
    >
      <div dir="rtl" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="standard-dialog-header">
          <div className="standard-dialog-header-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eef2ff', border: '1px solid #c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PackageIcon size={18} color="#170e5e" />
              </div>
              <div>
                <h3 className="standard-dialog-title">إنشاء أمر بيع جديد (Sales Order)</h3>
                <p className="standard-dialog-subtitle">حجز المخزون وتثبيت الأسعار والكميات للعميل</p>
              </div>
            </div>
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
              <label className="field-label" style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                اسم العميل <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="اسم العميل أو المنشأة..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
              />
            </div>

            <div className="field">
              <label className="field-label" style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                هاتف العميل
              </label>
              <input
                type="text"
                placeholder="رقم الهاتف للتواصل..."
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
              />
            </div>

            <div className="field">
              <label className="field-label" style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                تاريخ التسليم المتوقع
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            <div className="field">
              <label className="field-label" style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                صلاحية حجز المخزون حتى
              </label>
              <input
                type="date"
                value={reservationExpiresAt}
                onChange={(e) => setReservationExpiresAt(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
              />
            </div>

            <div className="field">
              <label className="field-label" style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                عنوان العميل / موقع التسليم
              </label>
              <input
                type="text"
                placeholder="العنوان التفصيلي..."
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Stock Reservation Toggle Option */}
          <div style={{ padding: '12px 16px', backgroundColor: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LockIcon size={16} color="#1d4ed8" />
              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e3a8a', display: 'block' }}>
                  تفعيل حجز المخزون المؤقت فور الحفظ (Stock Reservation)
                </span>
                <span style={{ fontSize: '11px', color: '#1d4ed8' }}>
                  يتم زيادة الكمية المحجوزة للمنتجات ومنع بيعها في الكاشير أو المتجر الإلكتروني
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={autoReserve}
              onChange={(e) => setAutoReserve(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
          </div>

          {/* Items Table */}
          <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', backgroundColor: '#ffffff' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', fontWeight: 700, fontSize: '12px', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', borderRadius: '10px 10px 0 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PackageIcon size={15} color="#170e5e" />
                <span>أصناف وكميات أمر البيع</span>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>({items.length} صنف)</span>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                style={{ fontSize: '12px', color: '#170e5e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <PlusIcon size={14} />
                <span>إضافة صنف آخر</span>
              </button>
            </div>

            {/* Table Column Headers */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(240px, 1fr) 75px 65px 100px 75px 105px 36px',
                gap: '10px',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
                padding: '9px 12px',
                borderBottom: '1px solid #e2e8f0',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#475569',
              }}
            >
              <div>الصنف / المنتج (بحث فوري)</div>
              <div style={{ textAlign: 'center' }}>الكمية</div>
              <div style={{ textAlign: 'center' }}>الوحدة</div>
              <div style={{ textAlign: 'center' }}>سعر الوحدة</div>
              <div style={{ textAlign: 'center' }}>الخصم</div>
              <div style={{ textAlign: 'center' }}>الإجمالي</div>
              <div style={{ textAlign: 'center' }} />
            </div>

            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {items.map((it, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(240px, 1fr) 75px 65px 100px 75px 105px 36px',
                    gap: '10px',
                    alignItems: 'flex-start',
                    backgroundColor: '#ffffff',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <OrderItemProductPicker
                      value={it.productName}
                      selectedProductId={it.productId}
                      stockOnHand={it.stockOnHand}
                      unitName={it.unitName}
                      quantity={it.quantity}
                      products={catalogProducts}
                      onChangeText={(text) => handleItemChange(idx, 'productName', text)}
                      onSelectProduct={(p) => handleSelectProduct(idx, p)}
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={it.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      style={{ width: '100%', padding: '7px 6px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', textAlign: 'center', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="الوحدة"
                      value={it.unitName || 'قطعة'}
                      onChange={(e) => handleItemChange(idx, 'unitName', e.target.value)}
                      style={{ width: '100%', padding: '7px 6px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '11px', textAlign: 'center', boxSizing: 'border-box', color: '#475569' }}
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="السعر"
                      value={it.unitPrice}
                      onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                      style={{ width: '100%', padding: '7px 6px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', textAlign: 'center', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={it.discount}
                      onChange={(e) => handleItemChange(idx, 'discount', e.target.value)}
                      style={{ width: '100%', padding: '7px 6px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', textAlign: 'center', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ textAlign: 'center', paddingTop: '8px', fontWeight: 800, fontSize: '12.5px', color: '#170e5e', whiteSpace: 'nowrap' }}>
                    {formatCurrency(Number(it.total))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4px' }}>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length <= 1}
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '6px',
                        border: '1px solid #f1f5f9',
                        backgroundColor: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: items.length <= 1 ? '#cbd5e1' : '#94a3b8',
                        cursor: items.length <= 1 ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      title="حذف هذا الصنف"
                    >
                      <Trash2Icon size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Summary */}
          <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
            <div>
              <span style={{ color: '#64748b' }}>المجموع قبل الخصم: </span>
              <strong style={{ color: '#1e293b' }}>{formatCurrency(subtotal)}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>إجمالي الخصم: </span>
              <strong style={{ color: '#dc2626' }}>{formatCurrency(totalDiscount)}</strong>
            </div>
            <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#170e5e' }}>
              <span>الصافي المطلوب: </span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="standard-dialog-footer">
            <Button variant="secondary" onClick={onClose}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isPending}
              style={{ backgroundColor: '#170e5e', color: '#ffffff' }}
            >
              {isPending ? 'جاري الحفظ...' : 'حفظ أمر البيع وحجز المخزون'}
            </Button>
          </div>
        </form>
      </div>
    </DialogShell>
  );
};
