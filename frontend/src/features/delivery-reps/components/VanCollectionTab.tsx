import React, { useState } from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { getGlobalCurrencySymbol } from '@/lib/currencies';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { useQuery } from '@tanstack/react-query';
import { vanSalesApi, CustomerEligibleSale, CustomerEligibleSaleItem } from '../api/van-sales.api';
import { CheckCircleIcon } from '@/shared/components/icons/AppIcons';

interface CustomerOption {
  id: number;
  name: string;
  phone?: string;
  balance: number;
}

interface VanCollectionTabProps {
  tripId: number;
  customers: CustomerOption[];
  colCustomerId: number | '';
  onColCustomerChange: (val: number | '') => void;
  colAmount: string;
  onColAmountChange: (val: string) => void;
  onSubmitCollection: () => void;
  isSubmitting: boolean;
  onReturnSuccess?: (docNo: string, amount: number) => void;
}

const RETURN_REASONS = [
  { value: 'damaged', label: 'بضاعة تالفة / كسر أثناء التخزين والنقل' },
  { value: 'expired', label: 'اقتراب أو انتهاء تاريخ الصلاحية' },
  { value: 'manufacturing_defect', label: 'عيب صناعة / عيب تعبئة وتغليف' },
  { value: 'stagnant', label: 'بضاعة راكدة / بطيئة الحركة لدى العميل' },
  { value: 'order_mismatch', label: 'خطأ في التوريد أو مقاسات الطلب' },
  { value: 'customer_request', label: 'رغبة العميل / رفض استلام' },
];

export const VanCollectionTab: React.FC<VanCollectionTabProps> = ({
  tripId,
  customers,
  colCustomerId,
  onColCustomerChange,
  colAmount,
  onColAmountChange,
  onSubmitCollection,
  isSubmitting,
  onReturnSuccess,
}) => {
  const [subMode, setSubMode] = useState<'collection' | 'return'>('collection');

  // Return form state
  const [returnCustomerId, setReturnCustomerId] = useState<number | ''>('');
  const [selectedSaleId, setSelectedSaleId] = useState<number | ''>('');
  const [returnReason, setReturnReason] = useState<string>('damaged');
  const [returnNotes, setReturnNotes] = useState<string>('');
  const [returnCart, setReturnCart] = useState<Array<{
    productId: number;
    productName: string;
    qty: number;
    unitPrice: number;
    maxQty: number;
    saleItemId?: number;
  }>>([]);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [returnResult, setReturnResult] = useState<{ docNo: string; total: number } | null>(null);

  // Fetch eligible past sales for the selected return customer
  const { data: eligibleSales = [], isLoading: isLoadingSales } = useQuery<CustomerEligibleSale[]>({
    queryKey: ['van-return-eligible-sales', returnCustomerId],
    queryFn: () => vanSalesApi.getCustomerEligibleSales(Number(returnCustomerId)),
    enabled: Boolean(returnCustomerId && subMode === 'return'),
  });

  const selectedSale = eligibleSales.find((s) => s.id === Number(selectedSaleId));

  const handleAddSaleItemToReturn = (item: CustomerEligibleSaleItem) => {
    if (item.remainingReturnableQty <= 0) return;
    const existingIndex = returnCart.findIndex((c) => c.saleItemId === item.saleItemId);
    if (existingIndex >= 0) {
      if (returnCart[existingIndex].qty < item.remainingReturnableQty) {
        const updated = [...returnCart];
        updated[existingIndex].qty += 1;
        setReturnCart(updated);
      }
    } else {
      setReturnCart([
        ...returnCart,
        {
          productId: item.productId,
          productName: item.productName,
          qty: 1,
          unitPrice: item.netUnitPrice, // Net price after discount
          maxQty: item.remainingReturnableQty,
          saleItemId: item.saleItemId,
        },
      ]);
    }
  };

  const handleUpdateReturnQty = (index: number, delta: number) => {
    const updated = [...returnCart];
    const next = updated[index].qty + delta;
    if (next <= 0) {
      updated.splice(index, 1);
    } else if (next <= updated[index].maxQty) {
      updated[index].qty = next;
    }
    setReturnCart(updated);
  };

  const totalReturnAmount = returnCart.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);

  const handleSubmitReturn = async () => {
    if (!returnCustomerId) {
      alert('يرجى اختيار العميل');
      return;
    }
    if (!returnCart.length) {
      alert('يرجى إضافة صنف واحد على الأقل للمرتجع');
      return;
    }
    try {
      setIsSubmittingReturn(true);
      const res = await vanSalesApi.submitFieldReturn({
        tripId,
        customerId: Number(returnCustomerId),
        saleId: selectedSaleId ? Number(selectedSaleId) : null,
        returnReason: returnReason as any,
        items: returnCart.map((c) => ({
          productId: c.productId,
          qty: c.qty,
          unitPrice: c.unitPrice,
          saleItemId: c.saleItemId,
        })),
        notes: returnNotes || undefined,
      });

      setReturnResult({ docNo: res.returnDocNo, total: res.totalAmount });
      setReturnCart([]);
      setReturnNotes('');
      onReturnSuccess?.(res.returnDocNo, res.totalAmount);
    } catch (err: any) {
      alert(err?.message || 'فشل إرسال إذن المرتجع');
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
      dir="rtl"
    >
      {/* Sub-Tabs: Collection vs Return */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
        <button
          type="button"
          onClick={() => { setSubMode('collection'); setReturnResult(null); }}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: subMode === 'collection' ? '#ffffff' : 'transparent',
            color: subMode === 'collection' ? '#170e5e' : '#64748b',
            fontWeight: 700,
            fontSize: '12.5px',
            boxShadow: subMode === 'collection' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
          }}
        >
          سند تحصيل نقدية
        </button>
        <button
          type="button"
          onClick={() => { setSubMode('return'); setReturnResult(null); }}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: subMode === 'return' ? '#ffffff' : 'transparent',
            color: subMode === 'return' ? '#170e5e' : '#64748b',
            fontWeight: 700,
            fontSize: '12.5px',
            boxShadow: subMode === 'return' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
          }}
        >
          إذن مرتجع بضاعة ميداني
        </button>
      </div>

      {subMode === 'collection' ? (
        <>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
            تحصيل مديونية سابقة من عميل في الشارع
          </h3>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              العميل المطلوب تحصيل حسابه:
            </label>
            <CustomSelect
              value={colCustomerId ? String(colCustomerId) : ''}
              onChange={(val) => onColCustomerChange(val ? Number(val) : '')}
              options={[
                { value: '', label: '-- اختر العميل --' },
                ...customers.map((c) => ({
                  value: String(c.id),
                  label: `${c.name} ${c.phone ? `(${c.phone})` : ''}`,
                  hint: `مديونية: ${c.balance.toFixed(2)} ${getGlobalCurrencySymbol()}`,
                })),
              ]}
              placeholder="اختر العميل المطلوب تحصيل حسابه"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              المبلغ المحصل نقداً ({getGlobalCurrencySymbol()}):
            </label>
            <input
              type="number"
              step="0.01"
              value={colAmount}
              onChange={(e) => onColAmountChange(e.target.value)}
              placeholder="0.00"
              style={{
                width: '100%',
                height: '40px',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0 10px',
                fontSize: '13px',
                fontWeight: 700,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <Button
            variant="primary"
            onClick={onSubmitCollection}
            disabled={isSubmitting}
            style={{ backgroundColor: '#059669', color: '#ffffff', height: '44px', fontSize: '13px', fontWeight: 800 }}
          >
            {isSubmitting ? 'جاري قيد السند...' : 'إثبات تحصيل النقدية وتحديث كشف الحساب'}
          </Button>
        </>
      ) : (
        <>
          {returnResult ? (
            <div style={{ textAlign: 'center', padding: '24px 16px', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
              <div style={{ width: '48px', height: '48px', backgroundColor: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <CheckCircleIcon size={28} color="#16a34a" />
              </div>
              <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#15803d', margin: '0 0 6px' }}>
                تم إرسال إذن المرتجع للإدارة بنجاح!
              </h4>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#166534', margin: '0 0 12px' }}>
                رقم الإذن: #{returnResult.docNo} | إجمالي القيمة: {returnResult.total.toFixed(2)} <CurrencySymbol />
              </p>
              <div style={{ fontSize: '11.5px', color: '#65a30d', backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #d9f99d', maxWidth: '420px', margin: '0 auto 16px', lineHeight: 1.5 }}>
                ملاحظة رقابية: تم تسجيل إذن المرتجع بحالة (قيد مراجعة الإدارة). لن يتم خصم القيمة من حساب العميل أو زيادة رصيد السيارة إلا بعد اعتماد مشرف المستودع.
              </div>
              <Button
                variant="primary"
                onClick={() => setReturnResult(null)}
                style={{ backgroundColor: '#170e5e', color: '#ffffff' }}
              >
                تسجيل إذن مرتجع جديد
              </Button>
            </div>
          ) : (
            <>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                تسجيل مرتجع بضاعة ومطابقة سعر الفاتورة الأصلية
              </h3>

              {/* 1. Customer Select */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  اختيار العميل المسترجع منه:
                </label>
                <CustomSelect
                  value={returnCustomerId ? String(returnCustomerId) : ''}
                  onChange={(val) => {
                    setReturnCustomerId(val ? Number(val) : '');
                    setSelectedSaleId('');
                    setReturnCart([]);
                  }}
                  options={[
                    { value: '', label: '-- اختر العميل --' },
                    ...customers.map((c) => ({
                      value: String(c.id),
                      label: `${c.name} ${c.phone ? `(${c.phone})` : ''}`,
                      hint: `مديونية: ${c.balance.toFixed(2)} ${getGlobalCurrencySymbol()}`,
                    })),
                  ]}
                  placeholder="اختر العميل"
                />
              </div>

              {/* 2. Original Invoice Linking */}
              {returnCustomerId && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    ربط بالفاتورة الأصلية (لفحص صافي الخصم وسعر البند الفعلي):
                  </label>
                  {isLoadingSales ? (
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>جاري جلب فواتير العميل السابقة...</div>
                  ) : eligibleSales.length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#64748b', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '8px' }}>
                      لا توجد فواتير مرحلة سابقة لهذا العميل.
                    </div>
                  ) : (
                    <CustomSelect
                      value={selectedSaleId ? String(selectedSaleId) : ''}
                      onChange={(val) => {
                        setSelectedSaleId(val ? Number(val) : '');
                        setReturnCart([]);
                      }}
                      options={[
                        { value: '', label: '-- اختر فاتورة سابقة (موصى به) --' },
                        ...eligibleSales.map((s) => ({
                          value: String(s.id),
                          label: `فاتورة #${s.docNo} - تاريخ: ${s.createdAt.slice(0, 10)} - إجمالي: ${s.total.toFixed(2)} ${getGlobalCurrencySymbol()}`,
                          hint: s.discount > 0 ? `خصم: ${s.discount}` : undefined,
                        })),
                      ]}
                      placeholder="اختر الفاتورة الأصلية"
                    />
                  )}
                </div>
              )}

              {/* 3. Items from Selected Sale */}
              {selectedSale && selectedSale.items.length > 0 && (
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '10px', padding: '12px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: '8px' }}>
                    بنود الفاتورة الأصلية #{selectedSale.docNo} (الأسعار الصافية بعد الخصم):
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedSale.items.map((it: CustomerEligibleSaleItem) => (
                      <div
                        key={it.saleItemId}
                        style={{
                          backgroundColor: '#ffffff',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                        }}
                      >
                        <div>
                          <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a', display: 'block' }}>{it.productName}</span>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            المباع: {it.soldQty} | المرتجع سابقاً: {it.alreadyReturnedQty} | المتاح للإرجاع: {it.remainingReturnableQty}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#059669' }}>
                            {it.netUnitPrice.toFixed(2)} <CurrencySymbol /> / ق
                          </span>
                          <button
                            type="button"
                            disabled={it.remainingReturnableQty <= 0}
                            onClick={() => handleAddSaleItemToReturn(it)}
                            style={{
                              backgroundColor: it.remainingReturnableQty > 0 ? '#170e5e' : '#cbd5e1',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: it.remainingReturnableQty > 0 ? 'pointer' : 'not-allowed',
                            }}
                          >
                            + إضافة
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Return Cart */}
              {returnCart.length > 0 && (
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#170e5e', display: 'block', marginBottom: '6px' }}>
                    أصناف إذن المرتجع المطلوب اعتمادها ({returnCart.length}):
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {returnCart.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: '#fef2f2',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          border: '1px solid #fecaca',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#991b1b', display: 'block' }}>{item.productName}</span>
                          <span style={{ fontSize: '11px', color: '#b91c1c' }}>
                            سعر الإرجاع: {item.unitPrice.toFixed(2)} {getGlobalCurrencySymbol()} (صافي الفاتورة)
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleUpdateReturnQty(idx, -1)}
                            style={{ width: '26px', height: '26px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer', fontWeight: 700 }}
                          >
                            -
                          </button>
                          <span style={{ fontWeight: 800, fontSize: '13px', minWidth: '24px', textAlign: 'center' }}>{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateReturnQty(idx, 1)}
                            disabled={item.qty >= item.maxQty}
                            style={{ width: '26px', height: '26px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: item.qty < item.maxQty ? 'pointer' : 'not-allowed', fontWeight: 700 }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', padding: '8px 12px', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155' }}>إجمالي قيمة المرتجع المطلوب:</span>
                    <span style={{ fontSize: '15px', fontWeight: 900, color: '#b91c1c' }}>{totalReturnAmount.toFixed(2)} <CurrencySymbol /></span>
                  </div>
                </div>
              )}

              {/* 5. Return Reason Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  سبب المرتجع (إلزامي):
                </label>
                <CustomSelect
                  value={returnReason}
                  onChange={(val) => setReturnReason(val)}
                  options={RETURN_REASONS}
                  placeholder="اختر سبب المرتجع"
                />
              </div>

              {/* 6. Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  ملاحظات وتفاصيل إضافية:
                </label>
                <input
                  type="text"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="مثال: كسر في الكرتونة أثناء النقل / رفض الاستلام لانتهاء الصلاحية..."
                  style={{ width: '100%', height: '38px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 10px', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                تنبيه رقابي: بمجرد الحفظ، يُقيد المرتجع بحالة (قيد مراجعة المشرف) ولن يتم تسوية الحساب أو إضافة البضاعة للسيارة إلا بعد اعتماد الإدارة.
              </div>

              <Button
                variant="primary"
                onClick={handleSubmitReturn}
                disabled={isSubmittingReturn || returnCart.length === 0}
                style={{ backgroundColor: '#dc2626', color: '#ffffff', height: '44px', fontSize: '13px', fontWeight: 800 }}
              >
                {isSubmittingReturn ? 'جاري رفع إذن المرتجع للإدارة...' : `إرسال إذن المرتجع للإدارة (${totalReturnAmount.toFixed(2)} ${getGlobalCurrencySymbol()})`}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
};
