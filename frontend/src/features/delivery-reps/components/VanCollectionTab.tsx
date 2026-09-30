import React, { useState, useMemo, useRef } from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { getGlobalCurrencySymbol } from '@/lib/currencies';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { useQuery } from '@tanstack/react-query';
import { vanSalesApi, CustomerEligibleSale, CustomerEligibleSaleItem } from '../api/van-sales.api';
import {
  CheckCircleIcon,
  SearchIcon,
  PhoneIcon,
  MapPinIcon,
  CreditCardIcon,
  XIcon,
} from '@/shared/components/icons/AppIcons';
import { toast } from '@/shared/components/system-alert';
import { vanOfflineDb } from '../offline/van-sales-offline.db';

interface CustomerOption {
  id: number;
  name: string;
  phone?: string;
  balance: number;
  creditLimit?: number;
  customerCode?: string;
  route?: string;
  district?: string;
  locationUrl?: string;
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
  initialSubMode?: 'collection' | 'return';
  initialReturnCustomerId?: number | '';
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
  initialSubMode,
  initialReturnCustomerId,
}) => {
  const [subMode, setSubMode] = useState<'collection' | 'return'>(initialSubMode || 'collection');

  // Return form state
  const [returnCustomerId, setReturnCustomerId] = useState<number | ''>(initialReturnCustomerId || '');

  React.useEffect(() => {
    if (initialSubMode) {
      setSubMode(initialSubMode);
    }
  }, [initialSubMode]);

  React.useEffect(() => {
    if (initialReturnCustomerId) {
      setReturnCustomerId(initialReturnCustomerId);
    }
  }, [initialReturnCustomerId]);
  const [selectedSaleId, setSelectedSaleId] = useState<number | ''>('');
  const [returnReason, setReturnReason] = useState<string>('damaged');
  const [returnNotes, setReturnNotes] = useState<string>('');
  const [refundMethod, setRefundMethod] = useState<'credit' | 'cash'>('credit');
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

  // Collections state & filters
  const [collectionSearch, setCollectionSearch] = useState('');
  const [showManualCustomerSelect, setShowManualCustomerSelect] = useState(false);
  const collectionFormRef = useRef<HTMLDivElement>(null);

  // Filter customers with positive debt and sort descending (highest to lowest)
  const indebtedCustomers = useMemo(() => {
    return customers
      .filter((c) => Number(c.balance || 0) > 0)
      .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0));
  }, [customers]);

  const totalIndebtedAmount = useMemo(() => {
    return indebtedCustomers.reduce((sum, c) => sum + Number(c.balance || 0), 0);
  }, [indebtedCustomers]);

  const filteredIndebtedCustomers = useMemo(() => {
    if (!collectionSearch.trim()) return indebtedCustomers;
    const q = collectionSearch.trim().toLowerCase();
    return indebtedCustomers.filter((c) => {
      const name = (c.name || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const code = (c.customerCode || '').toLowerCase();
      const route = (c.route || '').toLowerCase();
      const district = (c.district || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || code.includes(q) || route.includes(q) || district.includes(q);
    });
  }, [indebtedCustomers, collectionSearch]);

  const selectedCustomer = useMemo(() => {
    if (!colCustomerId) return null;
    return customers.find((c) => c.id === Number(colCustomerId)) || null;
  }, [customers, colCustomerId]);

  const handleSelectCustomerForCollection = (c: CustomerOption) => {
    onColCustomerChange(c.id);
    onColAmountChange(String(c.balance > 0 ? c.balance : ''));
    if (collectionFormRef.current) {
      collectionFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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
      toast.warning('يرجى اختيار العميل');
      return;
    }
    if (!returnCart.length) {
      toast.warning('يرجى إضافة صنف واحد على الأقل للمرتجع');
      return;
    }

    const payload = {
      tripId,
      customerId: Number(returnCustomerId),
      saleId: selectedSaleId ? Number(selectedSaleId) : null,
      returnReason: returnReason as any,
      refundMethod,
      items: returnCart.map((c) => ({
        productId: c.productId,
        qty: c.qty,
        unitPrice: c.unitPrice,
        saleItemId: c.saleItemId,
      })),
      notes: returnNotes || undefined,
    };

    setIsSubmittingReturn(true);

    // Fast check if offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        const offRes = await vanOfflineDb.recordOfflineReturn(payload);
        setReturnResult({ docNo: offRes.docNo, total: offRes.totalAmount });
        setReturnCart([]);
        setReturnNotes('');
        toast.success(`تم حفظ إذن المرتجع أوفلاين #${offRes.docNo} وسيتم ترحيله للسيرفر تلقائياً.`);
        onReturnSuccess?.(offRes.docNo, offRes.totalAmount);
      } catch (err: any) {
        toast.error(err?.message || 'فشل حفظ إذن المرتجع محلياً');
      } finally {
        setIsSubmittingReturn(false);
      }
      return;
    }

    try {
      const res = await vanSalesApi.submitFieldReturn(payload);
      setReturnResult({ docNo: res.returnDocNo, total: res.totalAmount });
      setReturnCart([]);
      setReturnNotes('');
      toast.success(`تم إرسال إذن المرتجع #${res.returnDocNo} للإدارة بنجاح!`);
      onReturnSuccess?.(res.returnDocNo, res.totalAmount);
    } catch (err: any) {
      const isNetworkErr =
        !err?.status ||
        err?.status === 0 ||
        err?.message?.toLowerCase().includes('failed to fetch');

      if (isNetworkErr) {
        try {
          const offRes = await vanOfflineDb.recordOfflineReturn(payload);
          setReturnResult({ docNo: offRes.docNo, total: offRes.totalAmount });
          setReturnCart([]);
          setReturnNotes('');
          toast.success(`تم حفظ إذن المرتجع أوفلاين #${offRes.docNo} وسيتم ترحيله للسيرفر تلقائياً.`);
          onReturnSuccess?.(offRes.docNo, offRes.totalAmount);
          return;
        } catch (innerErr: any) {
          toast.error(innerErr?.message || 'فشل حفظ إذن المرتجع محلياً');
          return;
        }
      }
      toast.error(err?.message || 'فشل إرسال إذن المرتجع');
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
        padding: '14px 14px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
      dir="rtl"
    >
      {/* Sub-Tabs: Collection vs Return (1 Horizontal Row) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#f1f5f9',
          padding: '4px',
          borderRadius: '10px',
          gap: '6px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <button
          type="button"
          onClick={() => { setSubMode('collection'); setReturnResult(null); }}
          style={{
            flex: '1 1 0',
            minWidth: 0,
            padding: '8px 8px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: subMode === 'collection' ? '#ffffff' : 'transparent',
            color: subMode === 'collection' ? '#170e5e' : '#64748b',
            fontWeight: 800,
            fontSize: '12.5px',
            boxShadow: subMode === 'collection' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            whiteSpace: 'nowrap',
            textAlign: 'center',
          }}
        >
          سند تحصيل نقدية
        </button>
        <button
          type="button"
          onClick={() => { setSubMode('return'); setReturnResult(null); }}
          style={{
            flex: '1 1 0',
            minWidth: 0,
            padding: '8px 8px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: subMode === 'return' ? '#ffffff' : 'transparent',
            color: subMode === 'return' ? '#170e5e' : '#64748b',
            fontWeight: 800,
            fontSize: '12.5px',
            boxShadow: subMode === 'return' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            whiteSpace: 'nowrap',
            textAlign: 'center',
          }}
        >
          إذن مرتجع ميداني
        </button>
      </div>

      {subMode === 'collection' ? (
        <>
          {/* 1. Header with Stats KPI Cards */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  تحصيل مديونيات العملاء في خط السير
                </h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  مرتبة تلقائياً من الأعلى مديونية إلى الأقل لتسريع التحصيل الميداني
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowManualCustomerSelect(!showManualCustomerSelect)}
                style={{
                  background: 'none',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                {showManualCustomerSelect ? 'إخفاء الاختيار اليدوي' : 'تحصيل من عميل آخر / دفعة مقدمة'}
              </button>
            </div>

            {/* KPI Badges */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <div
                style={{
                  flex: '1 1 140px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <span style={{ fontSize: '10.5px', color: '#991b1b', fontWeight: 700 }}>إجمالي المديونيات المطلوبة:</span>
                <strong style={{ fontSize: '15px', color: '#b91c1c', fontWeight: 900 }}>
                  {totalIndebtedAmount.toFixed(2)} <CurrencySymbol />
                </strong>
              </div>
              <div
                style={{
                  flex: '1 1 120px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <span style={{ fontSize: '10.5px', color: '#475569', fontWeight: 700 }}>عدد العملاء المدينين:</span>
                <strong style={{ fontSize: '15px', color: '#170e5e', fontWeight: 900 }}>
                  {indebtedCustomers.length} <span style={{ fontSize: '11px', fontWeight: 600 }}>عميل</span>
                </strong>
              </div>
            </div>

            {/* Instant Search Bar */}
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                value={collectionSearch}
                onChange={(e) => setCollectionSearch(e.target.value)}
                placeholder="بحث باسم العميل، الكود، الحي، أو رقم الهاتف..."
                style={{
                  width: '100%',
                  height: '38px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0 32px 0 10px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  boxSizing: 'border-box',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: '10px',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <SearchIcon size={15} />
              </div>
              {collectionSearch && (
                <button
                  type="button"
                  onClick={() => setCollectionSearch('')}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '8px',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '2px',
                  }}
                >
                  <XIcon size={14} />
                </button>
              )}
            </div>
          </div>

          {/* 2. Manual Customer Select Fallback */}
          {showManualCustomerSelect && (
            <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                اختيار أي عميل من القائمة الشاملة:
              </label>
              <CustomSelect
                value={colCustomerId ? String(colCustomerId) : ''}
                onChange={(val) => {
                  onColCustomerChange(val ? Number(val) : '');
                  const found = customers.find((c) => c.id === Number(val));
                  if (found) onColAmountChange(String(found.balance > 0 ? found.balance : ''));
                }}
                options={[
                  { value: '', label: '-- اختر العميل --' },
                  ...customers.map((c) => ({
                    value: String(c.id),
                    label: `${c.customerCode ? `[#${c.customerCode}] ` : ''}${c.name}${c.district ? ` - ${c.district}` : c.route ? ` (${c.route})` : ''}`,
                    hint: `مديونية: ${c.balance.toFixed(2)} ${getGlobalCurrencySymbol()}${c.creditLimit ? ` | سقف: ${c.creditLimit.toFixed(2)}` : ''}`,
                  })),
                ]}
                placeholder="اختر العميل المطلوب تحصيل حسابه"
              />
            </div>
          )}

          {/* 3. Focused Active Collection Box (When a customer is selected) */}
          {selectedCustomer && (
            <div
              ref={collectionFormRef}
              style={{
                backgroundColor: '#f0fdf4',
                border: '1.5px solid #86efac',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '10.5px', background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                      العميل المحدد للتحصيل
                    </span>
                    <span style={{ fontSize: '10.5px', color: '#64748b', fontFamily: 'monospace' }}>
                      {selectedCustomer.customerCode}
                    </span>
                  </div>
                  <h4 style={{ margin: '4px 0 2px', fontSize: '14px', fontWeight: 900, color: '#14532d' }}>
                    {selectedCustomer.name}
                  </h4>
                  <div style={{ fontSize: '11px', color: '#4b5563' }}>
                    {selectedCustomer.district || selectedCustomer.route || 'الخط العام'}
                    {selectedCustomer.phone ? ` • ${selectedCustomer.phone}` : ''}
                  </div>
                </div>

                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '10.5px', color: '#64748b' }}>المديونية الحالية:</div>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: selectedCustomer.balance > 0 ? '#b91c1c' : '#16a34a' }}>
                    {selectedCustomer.balance.toFixed(2)} <CurrencySymbol />
                  </div>
                </div>
              </div>

              {/* Fast amount presets */}
              {selectedCustomer.balance > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => onColAmountChange(String(selectedCustomer.balance))}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #86efac',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: '#15803d',
                      cursor: 'pointer',
                    }}
                  >
                    سداد كامل المبلغ ({selectedCustomer.balance.toFixed(2)})
                  </button>
                  <button
                    type="button"
                    onClick={() => onColAmountChange(String((selectedCustomer.balance / 2).toFixed(2)))}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #86efac',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: '#15803d',
                      cursor: 'pointer',
                    }}
                  >
                    نصف المبلغ ({(selectedCustomer.balance / 2).toFixed(2)})
                  </button>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#14532d', marginBottom: '4px' }}>
                  المبلغ المحصل نقداً الآن ({getGlobalCurrencySymbol()}):
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={colAmount}
                  onChange={(e) => onColAmountChange(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    height: '42px',
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #16a34a',
                    borderRadius: '8px',
                    padding: '0 12px',
                    fontSize: '14px',
                    fontWeight: 900,
                    color: '#0f172a',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="primary"
                  onClick={onSubmitCollection}
                  disabled={isSubmitting || !Number(colAmount)}
                  style={{
                    flex: 1,
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    height: '42px',
                    fontSize: '13px',
                    fontWeight: 800,
                  }}
                >
                  {isSubmitting ? 'جاري قيد السند...' : 'إثبات تحصيل النقدية وتحديث كشف الحساب'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    onColCustomerChange('');
                    onColAmountChange('');
                  }}
                  style={{ height: '42px', padding: '0 14px', fontSize: '12px' }}
                >
                  إلغاء التحديد
                </Button>
              </div>
            </div>
          )}

          {/* 4. The Indebted Customers Grid */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155' }}>
                قائمة العملاء المطلوب تحصيل مديونياتهم ({filteredIndebtedCustomers.length}):
              </span>
            </div>

            {filteredIndebtedCustomers.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '24px 16px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px dashed #cbd5e1',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                  <CheckCircleIcon size={32} color="#16a34a" />
                </div>
                <h4 style={{ margin: '0 0 4px', fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                  {collectionSearch ? 'لا توجد نتائج مطابقة لبحثك' : 'لا توجد أي مديونيات مستحقة على عملاء خط السير اليوم'}
                </h4>
                <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>
                  {collectionSearch
                    ? 'جرب البحث بكلمة أخرى أو اضغط على إلغاء البحث'
                    : 'كافة حسابات العملاء مسددة بالكامل. يمكنك استخدام زر "تحصيل من عميل آخر" لتسجيل دفعات مقدمة.'}
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
                  gap: '10px',
                }}
              >
                {filteredIndebtedCustomers.map((c, idx) => {
                  const isSelected = selectedCustomer?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      style={{
                        backgroundColor: isSelected ? '#f0fdf4' : '#ffffff',
                        border: isSelected ? '2px solid #16a34a' : '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '8px',
                        boxShadow: isSelected ? '0 2px 6px rgba(22, 163, 74, 0.15)' : '0 1px 3px rgba(0,0,0,0.03)',
                        transition: 'border-color 0.15s ease',
                      }}
                    >
                      {/* Top Row: Rank & Name */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span
                            style={{
                              background: idx < 3 ? '#fef3c7' : '#f1f5f9',
                              color: idx < 3 ? '#92400e' : '#475569',
                              fontSize: '10.5px',
                              fontWeight: 800,
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            #{idx + 1}
                          </span>
                          <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
                            {c.customerCode || `#CUST-${c.id}`}
                          </span>
                        </div>
                        <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
                          {c.name}
                        </h4>
                      </div>

                      {/* Meta Tags: District / Route / Phone */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', fontSize: '11px' }}>
                        <span
                          style={{
                            background: '#e0f2fe',
                            color: '#0369a1',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          {c.district || c.route || 'الخط العام'}
                        </span>
                        {c.phone && (
                          <a
                            href={`tel:${c.phone}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              color: '#475569',
                              textDecoration: 'none',
                              fontSize: '10.5px',
                              direction: 'ltr',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            <PhoneIcon size={10} />
                            {c.phone}
                          </a>
                        )}
                        {c.locationUrl && (
                          <a
                            href={c.locationUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              color: '#0284c7',
                              fontSize: '10.5px',
                              textDecoration: 'none',
                              fontWeight: 700,
                            }}
                          >
                            <MapPinIcon size={11} />
                            خريطة
                          </a>
                        )}
                      </div>

                      {/* Financial Debt Box */}
                      <div
                        style={{
                          background: '#fef2f2',
                          border: '1px solid #fee2e2',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontSize: '11px', color: '#991b1b', fontWeight: 700 }}>
                          المديونية المستحقة:
                        </span>
                        <strong style={{ fontSize: '14.5px', color: '#b91c1c', fontWeight: 900 }}>
                          {c.balance.toFixed(2)} <CurrencySymbol />
                        </strong>
                      </div>

                      {/* Action Button */}
                      <button
                        type="button"
                        onClick={() => handleSelectCustomerForCollection(c)}
                        style={{
                          width: '100%',
                          height: '34px',
                          border: 'none',
                          borderRadius: '6px',
                          backgroundColor: isSelected ? '#16a34a' : '#170e5e',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <CreditCardIcon size={13} color="#ffffff" />
                        {isSelected ? 'محدد للتحصيل حالياً' : 'تحصيل الآن'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
                            onClick={() => handleUpdateReturnQty(idx, 1)}
                            disabled={item.qty >= item.maxQty}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: item.qty < item.maxQty ? '#ffffff' : '#f1f5f9',
                              cursor: item.qty < item.maxQty ? 'pointer' : 'not-allowed',
                              fontWeight: 800,
                              fontSize: '15px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#1e293b',
                            }}
                          >
                            +
                          </button>
                          <span style={{ fontWeight: 800, fontSize: '13px', minWidth: '24px', textAlign: 'center', color: '#0f172a' }}>{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateReturnQty(idx, -1)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              cursor: 'pointer',
                              fontWeight: 800,
                              fontSize: '15px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#1e293b',
                            }}
                          >
                            −
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

              {/* 5. Method of Refund (Credit vs Cash) */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  طريقة رد وتسوية قيمة المرتجع للعميل (إلزامي):
                </label>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', marginBottom: '10px', width: '100%', boxSizing: 'border-box' }}>
                  <button
                    type="button"
                    onClick={() => setRefundMethod('credit')}
                    style={{
                      flex: '1 1 0',
                      minWidth: 0,
                      padding: '8px 8px',
                      borderRadius: '8px',
                      border: refundMethod === 'credit' ? '2px solid #170e5e' : '1px solid #cbd5e1',
                      backgroundColor: refundMethod === 'credit' ? '#eff6ff' : '#ffffff',
                      color: refundMethod === 'credit' ? '#170e5e' : '#475569',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '11.5px', whiteSpace: 'nowrap' }}>خصم من الحساب (آجل)</div>
                    <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap' }}>
                      لا يخصم من كاش السيارة
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefundMethod('cash')}
                    style={{
                      flex: '1 1 0',
                      minWidth: 0,
                      padding: '8px 8px',
                      borderRadius: '8px',
                      border: refundMethod === 'cash' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                      backgroundColor: refundMethod === 'cash' ? '#fef2f2' : '#ffffff',
                      color: refundMethod === 'cash' ? '#b91c1c' : '#475569',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '11.5px', whiteSpace: 'nowrap' }}>دفع كاش من السيارة</div>
                    <div style={{ fontSize: '9.5px', color: '#dc2626', marginTop: '2px', whiteSpace: 'nowrap' }}>
                      يخصم من توريد الكاش
                    </div>
                  </button>
                </div>
              </div>

              {/* 6. Return Reason Selection */}
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
                  placeholder="ملاحظات إضافية عن سبب المرتجع..."
                  style={{ width: '100%', height: '36px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 10px', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ fontSize: '10.5px', color: '#64748b', lineHeight: 1.4, backgroundColor: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                تنبيه رقابي: بمجرد الحفظ، يُقيد المرتجع بحالة (قيد مراجعة المشرف) ولن يتم تسوية الحساب أو إضافة البضاعة للسيارة إلا بعد اعتماد الإدارة.
              </div>

              <Button
                variant="primary"
                onClick={handleSubmitReturn}
                disabled={isSubmittingReturn || returnCart.length === 0}
                style={{ backgroundColor: '#dc2626', color: '#ffffff', height: '42px', fontSize: '12.5px', fontWeight: 800 }}
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
