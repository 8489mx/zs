import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateSalesOrderForm, type SalesOrderItem } from '../hooks/useCreateSalesOrderForm';
import { useProductsQuery } from '@/shared/hooks/use-catalog-queries';
import { useAppToolbar } from '@/stores/toolbar-store';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';
import { SearchableCombobox } from '@/shared/ui/searchable-combobox';
import { toast } from '@/shared/components/system-alert';
import { useFormDraft } from '@/shared/hooks/use-form-draft';
import { DraftRestoredBanner } from '@/shared/components/DraftRestoredBanner';
import { matchesArabic } from '@/lib/arabic-normalization';
import { formatCurrency, formatCurrencyWithSymbol } from '@/lib/format';
import { LockIcon, PackageIcon } from '@/shared/components/icons/AppIcons';
import type { Product } from '@/types/domain';

interface SalesOrderFormItem extends SalesOrderItem {
  id: number;
  stockOnHand?: number;
  barcode?: string;
  warehouse?: string;
}

export function CreateSalesOrderPage() {
  useAppToolbar([
    { label: 'المبيعات', to: '/sales' },
    { label: 'أوامر البيع وحجز المخزون', to: '/sales/orders' },
    { label: 'أمر بيع جديد' },
  ]);

  const navigate = useNavigate();

  // Header State
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentType, setPaymentType] = useState<'cash' | 'credit'>('credit');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [reservationExpiresAt, setReservationExpiresAt] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [autoReserve, setAutoReserve] = useState(true);
  const [currency, setCurrency] = useState('EGP');

  // Quick Action State
  const [activeQuickAction, setActiveQuickAction] = useState<'tax' | 'discount' | null>(null);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [discountMode, setDiscountMode] = useState<'percent' | 'value'>('value');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Notes & Terms
  const [notes, setNotes] = useState('');
  const [termsConditions, setTermsConditions] = useState(
    '1. يتم حجز الأصناف المحددة بالمخزون لحين استلام العميل وسداد قيمة الفاتورة.\n2. يلغى حجز المخزون تلقائياً بعد انتهاء مهلة صلاحية الحجز المحددة.'
  );

  // Attachments State
  const [attachments, setAttachments] = useState<File[]>([]);
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setAttachments((prev) => [...prev, ...newFiles]);
      toast.success(`تم إرفاق ${newFiles.length} ملف بنجاح`);
    }
  };

  // Items State
  const [items, setItems] = useState<SalesOrderFormItem[]>([
    {
      id: Date.now(),
      productId: 0,
      productName: '',
      unitName: 'قطعة',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      total: 0,
      stockOnHand: 0,
      warehouse: 'المستودع الرئيسي',
    },
  ]);

  // Feature Hook for Data Access
  const { data: catalogProducts = [] } = useProductsQuery();
  const {
    customers,
    createSalesOrder,
    isSubmitting,
  } = useCreateSalesOrderForm({
    onSuccess: () => {
      clearDraft();
      navigate('/sales/orders');
    },
  });

  const customerOptions = useMemo(() => {
    return (customers || []).map((c: any) => ({
      id: String(c.id),
      rawId: Number(c.id),
      name: c.name || '',
      phone: c.phone || '',
      address: c.address || '',
      code: c.code || '',
    }));
  }, [customers]);

  const productOptions = useMemo(() => {
    return (catalogProducts || []).map((p: Product) => ({
      id: String(p.id),
      rawId: Number(p.id),
      name: p.name || '',
      barcode: p.barcode || '',
      sku: p.sku || '',
      price: Number(p.retailPrice ?? p.wholesalePrice ?? 0),
      costPrice: Number(p.costPrice ?? 0),
      unit: p.units?.[0]?.name || (p as any).unit || 'قطعة',
      stock: Number(p.stock ?? 0),
      raw: p,
    }));
  }, [catalogProducts]);

  // Draft Data
  const draftData = useMemo(
    () => ({
      selectedCustomerId,
      customerName,
      customerPhone,
      customerAddress,
      paymentType,
      orderDate,
      deliveryDate,
      reservationExpiresAt,
      autoReserve,
      currency,
      taxRate,
      discountMode,
      discountValue,
      notes,
      termsConditions,
      items,
    }),
    [
      selectedCustomerId,
      customerName,
      customerPhone,
      customerAddress,
      paymentType,
      orderDate,
      deliveryDate,
      reservationExpiresAt,
      autoReserve,
      currency,
      taxRate,
      discountMode,
      discountValue,
      notes,
      termsConditions,
      items,
    ]
  );

  const resetForm = () => {
    clearDraft();
    setSelectedCustomerId(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setPaymentType('credit');
    setOrderDate(new Date().toISOString().split('T')[0]);
    setDeliveryDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setReservationExpiresAt(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setAutoReserve(true);
    setTaxRate(0);
    setDiscountMode('value');
    setDiscountValue(0);
    setNotes('');
    setItems([
      {
        id: Date.now(),
        productId: 0,
        productName: '',
        unitName: 'قطعة',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        total: 0,
        stockOnHand: 0,
        warehouse: 'المستودع الرئيسي',
      },
    ]);
  };

  const { clearDraft, isDraftRestored, dismissRestoredNotice } = useFormDraft({
    key: 'z_draft_sales_order_fullpage',
    data: draftData,
    isEmpty: (d) => {
      const hasHeader = Boolean(d.customerName?.trim() || d.customerPhone?.trim() || d.notes?.trim());
      const hasItems = Array.isArray(d.items) && d.items.some((it) => Boolean(it.productId > 0 || it.productName?.trim()));
      return !hasHeader && !hasItems;
    },
    onRestore: (saved) => {
      if (saved.selectedCustomerId) setSelectedCustomerId(saved.selectedCustomerId);
      if (saved.customerName) setCustomerName(saved.customerName);
      if (saved.customerPhone) setCustomerPhone(saved.customerPhone);
      if (saved.customerAddress) setCustomerAddress(saved.customerAddress);
      if (saved.paymentType) setPaymentType(saved.paymentType);
      if (saved.orderDate) setOrderDate(saved.orderDate);
      if (saved.deliveryDate) setDeliveryDate(saved.deliveryDate);
      if (saved.reservationExpiresAt) setReservationExpiresAt(saved.reservationExpiresAt);
      if (typeof saved.autoReserve === 'boolean') setAutoReserve(saved.autoReserve);
      if (saved.currency) setCurrency(saved.currency);
      if (typeof saved.taxRate === 'number') setTaxRate(saved.taxRate);
      if (saved.discountMode) setDiscountMode(saved.discountMode);
      if (typeof saved.discountValue === 'number') setDiscountValue(saved.discountValue);
      if (saved.notes) setNotes(saved.notes);
      if (saved.termsConditions) setTermsConditions(saved.termsConditions);
      if (Array.isArray(saved.items) && saved.items.length > 0) {
        setItems(saved.items);
      }
    },
  });

  // Line Handlers
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        productId: 0,
        productName: '',
        unitName: 'قطعة',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        total: 0,
        stockOnHand: 0,
        warehouse: 'المستودع الرئيسي',
      },
    ]);
  };

  const handleAddServiceLine = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        productId: 0,
        productName: 'خدمة شحن وتوصيل',
        unitName: 'خدمة',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        total: 0,
        stockOnHand: 0,
        warehouse: 'لا يؤثر على المخزون',
      },
    ]);
  };

  const handleRemoveItem = (id: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleUpdateLine = (id: number, field: keyof SalesOrderFormItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        const qty = Number(field === 'quantity' ? value : updated.quantity) || 0;
        const price = Number(field === 'unitPrice' ? value : updated.unitPrice) || 0;
        const disc = Number(field === 'discount' ? value : updated.discount) || 0;
        updated.total = Math.max(0, qty * price - disc);
        return updated;
      })
    );
  };

  const handleProductSelect = (id: number, option: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const qty = item.quantity || 1;
        const price = option.price || 0;
        const disc = item.discount || 0;
        return {
          ...item,
          productId: option.rawId,
          productName: option.name,
          unitName: option.unit,
          unitPrice: price,
          stockOnHand: option.stock,
          barcode: option.barcode,
          total: Math.max(0, qty * price - disc),
        };
      })
    );
  };

  const handleBarcodeScan = () => {
    const barcode = window.prompt('امسح أو أدخل باركود الصنف:');
    if (barcode && barcode.trim()) {
      const found = productOptions.find((p) => p.barcode === barcode.trim() || p.sku === barcode.trim());
      if (found) {
        setItems((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            productId: found.rawId,
            productName: found.name,
            unitName: found.unit,
            quantity: 1,
            unitPrice: found.price,
            discount: 0,
            total: found.price,
            stockOnHand: found.stock,
            warehouse: 'المستودع الرئيسي',
          },
        ]);
        toast.success(`تمت إضافة الصنف: ${found.name}`);
      } else {
        toast.warning('لم يتم العثور على صنف بهذا الباركود');
      }
    }
  };

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  }, [items]);

  const itemsDiscountTotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.discount) || 0), 0);
  }, [items]);

  const globalDiscountAmount = useMemo(() => {
    if (discountMode === 'percent') {
      return (subtotal * discountValue) / 100;
    }
    return discountValue;
  }, [subtotal, discountMode, discountValue]);

  const totalDiscount = itemsDiscountTotal + globalDiscountAmount;
  const taxableAmount = Math.max(0, subtotal - totalDiscount);
  const taxAmount = (taxableAmount * taxRate) / 100;
  const totalAmount = Math.max(0, taxableAmount + taxAmount);

  const handleSubmit = () => {
    if (!customerName.trim()) {
      toast.error('يرجى إدخال اسم العميل');
      return;
    }

    const validItems = items.filter((it) => it.productName.trim() && Number(it.quantity) > 0);
    if (validItems.length === 0) {
      toast.error('يرجى إضافة صنف واحد على الأقل باسم وكمية صحيحة');
      return;
    }

    createSalesOrder({
      customerId: selectedCustomerId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      customerAddress: customerAddress.trim() || undefined,
      deliveryDate: deliveryDate || undefined,
      reservationExpiresAt: reservationExpiresAt || undefined,
      autoReserve,
      subtotal,
      discountAmount: totalDiscount,
      taxAmount,
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

  return (
    <div className="purchase-prototype-theme-root" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '32px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        {/* Universal Document Header */}
        <PageHeader
          title="أمر بيع جديد"
          onBack={() => navigate('/sales/orders')}
          badge={
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span className="document-prototype-status-badge is-draft">مسودة</span>
              <span className="nav-pill" style={{ fontWeight: 700, color: '#0f172a' }}>
                الإجمالي: {formatCurrencyWithSymbol(totalAmount, currency)}
              </span>
            </div>
          }
          actions={
            <div className="actions compact-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Button
                variant="secondary"
                type="button"
                className="purchase-prototype-toolbar-action purchase-prototype-toolbar-action-secondary"
                onClick={() => navigate('/sales/orders')}
                style={{ color: 'var(--danger-color)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
              >
                <span>إلغاء المسودة</span>
              </Button>
              <Button
                variant="secondary"
                type="button"
                className="purchase-prototype-toolbar-action purchase-prototype-toolbar-action-secondary"
                onClick={() => {
                  toast.success('تم حفظ مسودة أمر البيع بنجاح');
                }}
              >
                <span>حفظ كمسودة</span>
              </Button>
              <Button
                type="button"
                className="purchase-prototype-toolbar-action purchase-prototype-toolbar-action-primary"
                onClick={() => handleSubmit()}
                disabled={isSubmitting}
                style={{ backgroundColor: '#170e5e', color: '#ffffff' }}
              >
                <span>{isSubmitting ? 'جارٍ الاعتماد...' : 'اعتماد أمر البيع'}</span>
              </Button>
            </div>
          }
        />

        <DraftRestoredBanner
          show={isDraftRestored}
          onClear={resetForm}
          onDismiss={dismissRestoredNotice}
        />

        {/* Section 1: Basic Info */}
        <section className="document-prototype-section" style={{ marginTop: '12px' }}>
          <div className="section-header-compact-row" style={{ marginBottom: '0.6rem' }}>
            <h3 className="document-prototype-section-title">المعلومات الأساسية</h3>
            <div className="section-header-actions-group" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <label className="section-header-action-btn purchase-camera-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', margin: 0 }}>
                <input type="file" accept="image/*" capture="environment" onChange={handleFileUpload} style={{ display: 'none' }} />
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span>كاميرا</span>
              </label>
              <label className="section-header-action-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', margin: 0 }}>
                <input type="file" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                  <path d="M21 12.5 12.8 20.7a5 5 0 0 1-7.1-7.1L14.2 5.1a3.5 3.5 0 0 1 4.9 4.9L9.9 19.2" />
                </svg>
                <span>إرفاق</span>
                {attachments.length > 0 && <span className="nav-pill" style={{ fontSize: '0.65rem', padding: '1px 4px', marginInlineStart: '2px' }}>{attachments.length}</span>}
              </label>
            </div>
          </div>

          <div className="purchase-prototype-form-grid">
            {/* Customer Name */}
            <SearchableCombobox
              label="العميل *"
              placeholder="ابحث عن عميل بالاسم أو الهاتف..."
              value={customerName}
              onChange={(value) => {
                setCustomerName(value);
                const found = customers.find((c: any) => c.name === value);
                if (found) {
                  setSelectedCustomerId(Number(found.id));
                  setCustomerPhone(found.phone || '');
                  setCustomerAddress(found.address || '');
                } else {
                  setSelectedCustomerId(null);
                }
              }}
              options={customerOptions}
              search={(c, query) => matchesArabic(c.name, query) || (c.phone ? c.phone.includes(query) : false)}
              getLabel={(c) => c.name}
              getMeta={(c) => [c.code, c.phone].filter(Boolean).join(' · ')}
              onSelect={(c) => {
                setSelectedCustomerId(c.rawId);
                setCustomerName(c.name);
                setCustomerPhone(c.phone || '');
                setCustomerAddress(c.address || '');
              }}
              inputClassName="purchase-prototype-field-input"
              emptyLabel="عميل جديد غير مسجل (يمكنك المتابعة بالاسم المدخل)"
            />

            {/* Customer Phone */}
            <Field label="رقم الهاتف">
              <input
                className="purchase-prototype-field-input"
                type="text"
                placeholder="ابحث عن رقم تليفون أو أدخله..."
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </Field>

            {/* Payment Type */}
            <Field label="طريقة الدفع / المعاملة">
              <CustomSelect
                value={paymentType}
                onChange={(val) => setPaymentType(val as 'cash' | 'credit')}
                options={[
                  { value: 'credit', label: 'آجل (حساب المديونية للعميل)' },
                  { value: 'cash', label: 'نقدي (سداد فوري عند الاستلام)' },
                ]}
                placeholder="اختر طريقة الدفع..."
              />
            </Field>

            {/* Order Date */}
            <Field label="تاريخ أمر البيع">
              <input
                className="purchase-prototype-field-input"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
              />
            </Field>

            {/* Expected Delivery Date */}
            <Field label="تاريخ التسليم المتوقع">
              <input
                className="purchase-prototype-field-input"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </Field>

            {/* Currency */}
            <Field label="العملة">
              <CustomSelect
                value={currency}
                onChange={(val) => setCurrency(val)}
                options={[
                  { value: 'EGP', label: 'EGP - جنيه مصري' },
                  { value: 'USD', label: 'USD - دولار أمريكي' },
                  { value: 'SAR', label: 'SAR - ريال سعودي' },
                  { value: 'AED', label: 'AED - درهم إماراتي' },
                ]}
                placeholder="اختر العملة..."
              />
            </Field>
          </div>
        </section>

        {/* Section 2: Stock Reservation & Delivery Settings */}
        <section className="document-prototype-section" style={{ marginTop: '12px' }}>
          <h3 className="document-prototype-section-title">حجز المخزون وموقع التسليم</h3>
          <div className="purchase-prototype-form-grid" style={{ marginBottom: '14px' }}>
            <Field label="صلاحية حجز المخزون حتى">
              <input
                className="purchase-prototype-field-input"
                type="date"
                value={reservationExpiresAt}
                onChange={(e) => setReservationExpiresAt(e.target.value)}
              />
            </Field>

            <Field label="عنوان العميل / موقع التسليم">
              <input
                className="purchase-prototype-field-input"
                type="text"
                placeholder="العنوان التفصيلي للتسليم أو الاستلام..."
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
              />
            </Field>
          </div>

          {/* Auto Reservation Banner */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: autoReserve ? '#eff6ff' : '#f8fafc',
              borderRadius: '8px',
              border: `1px solid ${autoReserve ? '#bfdbfe' : '#e2e8f0'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <LockIcon size={18} color={autoReserve ? '#1d4ed8' : '#64748b'} />
              <div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: autoReserve ? '#1e3a8a' : '#334155', display: 'block' }}>
                  تفعيل حجز المخزون التلقائي فور الحفظ (Stock Reservation)
                </span>
                <span style={{ fontSize: '11.5px', color: autoReserve ? '#2563eb' : '#64748b' }}>
                  يتم زيادة الكمية المحجوزة للمنتجات ومنع بيعها في الكاشير أو المتجر الإلكتروني حتى إتمام الفاتورة.
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
        </section>

        {/* Section 3: Items Table */}
        <section className="document-prototype-section" style={{ marginTop: '12px' }}>
          <div className="section-header-compact-row" style={{ marginBottom: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PackageIcon size={16} color="#170e5e" />
              <h3 className="document-prototype-section-title" style={{ margin: 0 }}>الأصناف والكميات</h3>
              <span className="nav-pill" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>({items.length} صنف)</span>
            </div>
            <div className="purchase-prototype-quick-actions" aria-label="إجراءات سريعة">
              <button
                type="button"
                className="purchase-prototype-quick-action"
                title="إضافة صنف جديد"
                onClick={handleAddItem}
                style={{ fontWeight: 700, color: '#1e40af' }}
              >
                <span aria-hidden="true">+</span>
                <span>صنف</span>
              </button>
              <button
                type="button"
                className="purchase-prototype-quick-action"
                title="إضافة بند خدمة أو شحن"
                onClick={handleAddServiceLine}
                style={{ fontWeight: 700, color: '#0284c7' }}
              >
                <span aria-hidden="true">+</span>
                <span>خدمة</span>
              </button>
              <button
                type="button"
                className="purchase-prototype-quick-action"
                title="تطبيق ضريبة"
                onClick={() => setActiveQuickAction((curr) => (curr === 'tax' ? null : 'tax'))}
                style={
                  taxRate > 0
                    ? { borderColor: '#2563eb', color: '#1d4ed8', backgroundColor: '#eff6ff', fontWeight: 700 }
                    : undefined
                }
              >
                <span aria-hidden="true">%</span>
                <span>ضريبة{taxRate > 0 ? ` ${taxRate}%` : ''}</span>
              </button>
              <button
                type="button"
                className="purchase-prototype-quick-action"
                title="إضافة خصم"
                onClick={() => setActiveQuickAction((curr) => (curr === 'discount' ? null : 'discount'))}
                style={
                  discountValue > 0
                    ? { borderColor: '#16a34a', color: '#15803d', backgroundColor: '#f0fdf4', fontWeight: 700 }
                    : undefined
                }
              >
                <span>خصم{discountValue > 0 ? (discountMode === 'percent' ? ` ${discountValue}%` : ` ${discountValue}`) : ''}</span>
              </button>
            </div>
          </div>

          {/* Quick Action Popovers */}
          {activeQuickAction === 'tax' && (
            <div className="purchase-prototype-popover" role="dialog" style={{ marginBottom: '12px' }}>
              <div className="purchase-prototype-popover-row">
                <button
                  type="button"
                  className={`purchase-prototype-popover-option ${taxRate === 0 ? 'active' : ''}`}
                  onClick={() => {
                    setTaxRate(0);
                    setActiveQuickAction(null);
                  }}
                  style={taxRate === 0 ? { backgroundColor: '#e0e7ff', borderColor: '#4338ca', color: '#3730a3', fontWeight: 700 } : undefined}
                >
                  بدون ضريبة
                </button>
                <button
                  type="button"
                  className={`purchase-prototype-popover-option ${taxRate === 14 ? 'active' : ''}`}
                  onClick={() => {
                    setTaxRate(14);
                    setActiveQuickAction(null);
                  }}
                  style={taxRate === 14 ? { backgroundColor: '#e0e7ff', borderColor: '#4338ca', color: '#3730a3', fontWeight: 700 } : undefined}
                >
                  14% (قيمة مضافة قياسية)
                </button>
                <button
                  type="button"
                  className={`purchase-prototype-popover-option ${taxRate === 15 ? 'active' : ''}`}
                  onClick={() => {
                    setTaxRate(15);
                    setActiveQuickAction(null);
                  }}
                  style={taxRate === 15 ? { backgroundColor: '#e0e7ff', borderColor: '#4338ca', color: '#3730a3', fontWeight: 700 } : undefined}
                >
                  15% (الضريبة الخليجية)
                </button>
              </div>
            </div>
          )}

          {activeQuickAction === 'discount' && (
            <div className="purchase-prototype-popover" role="dialog" style={{ marginBottom: '12px' }}>
              <div className="purchase-prototype-popover-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  value={discountMode}
                  onChange={(e) => setDiscountMode(e.target.value as 'percent' | 'value')}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  <option value="value">مبلغ ثابت (ج.م)</option>
                  <option value="percent">نسبة مئوية (%)</option>
                </select>
                <input
                  type="number"
                  min="0"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                  placeholder="قيمة الخصم..."
                  style={{ width: '120px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', textAlign: 'center' }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setActiveQuickAction(null)}
                  style={{ height: '32px', fontSize: '12px' }}
                >
                  تطبيق
                </Button>
              </div>
            </div>
          )}

          {/* Desktop Items Table with Shaded Header */}
          <div className="document-line-items-table-wrap">
            <table className="document-line-items-table">
              <thead>
                <tr>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-product" style={{ width: '32%', textAlign: 'right' }}>الصنف</th>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-category" style={{ width: '12%', textAlign: 'center' }}>الوحدة</th>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-warehouse" style={{ width: '12%', textAlign: 'center' }}>رصيد المخزن</th>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-qty" style={{ width: '10%', textAlign: 'center' }}>الكمية</th>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-price" style={{ width: '12%', textAlign: 'center' }}>السعر</th>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-price" style={{ width: '10%', textAlign: 'center' }}>الخصم</th>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-amount" style={{ width: '12%', textAlign: 'center' }}>المبلغ</th>
                  <th className="purchase-prototype-table-head purchase-prototype-table-head-actions" style={{ width: '5%', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((line) => (
                  <tr key={line.id}>
                    {/* Item Name */}
                    <td className="purchase-prototype-table-cell purchase-prototype-table-cell-item">
                      <SearchableCombobox
                        inline
                        className="purchase-prototype-inline-combobox"
                        inputClassName="purchase-prototype-field-input purchase-prototype-combobox-input purchase-prototype-combobox-input-inline"
                        placeholder="ابحث عن صنف بالاسم أو الباركود..."
                        value={line.productName}
                        onChange={(value) => handleUpdateLine(line.id, 'productName', value)}
                        options={productOptions}
                        getLabel={(p) => p.name}
                        getMeta={(p) => [p.barcode, p.price > 0 ? `${formatCurrency(p.price)}` : undefined, `رصيد: ${p.stock}`].filter(Boolean).join(' · ')}
                        search={(p, query) =>
                          matchesArabic(p.name, query) ||
                          (p.barcode ? p.barcode.includes(query) : false) ||
                          (p.sku ? p.sku.toLowerCase().includes(query.toLowerCase()) : false)
                        }
                        onSelect={(option) => handleProductSelect(line.id, option)}
                        showDropdownOnEmpty={true}
                        emptyLabel="صنف جديد (يمكنك المتابعة بالاسم المدخل)"
                      />
                    </td>

                    {/* Unit */}
                    <td className="purchase-prototype-table-cell" style={{ textAlign: 'center' }}>
                      <input
                        className="purchase-prototype-table-input"
                        type="text"
                        placeholder="الوحدة..."
                        value={line.unitName || ''}
                        onChange={(e) => handleUpdateLine(line.id, 'unitName', e.target.value)}
                        style={{ textAlign: 'center' }}
                      />
                    </td>

                    {/* Stock on hand */}
                    <td className="purchase-prototype-table-cell" style={{ textAlign: 'center' }}>
                      <span
                        className="nav-pill"
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          fontWeight: 700,
                          backgroundColor: (line.stockOnHand ?? 0) > 0 ? '#f0fdf4' : '#fef2f2',
                          color: (line.stockOnHand ?? 0) > 0 ? '#15803d' : '#b91c1c',
                          borderColor: (line.stockOnHand ?? 0) > 0 ? '#bbf7d0' : '#fecaca',
                        }}
                      >
                        {line.stockOnHand ?? 0} متاح
                      </span>
                    </td>

                    {/* Quantity */}
                    <td className="purchase-prototype-table-cell" style={{ textAlign: 'center' }}>
                      <input
                        className="purchase-prototype-table-input"
                        type="number"
                        min="1"
                        step="1"
                        value={line.quantity}
                        onChange={(e) => handleUpdateLine(line.id, 'quantity', Math.max(1, Number(e.target.value) || 1))}
                        style={{ textAlign: 'center', fontWeight: 600 }}
                      />
                    </td>

                    {/* Price */}
                    <td className="purchase-prototype-table-cell" style={{ textAlign: 'center' }}>
                      <input
                        className="purchase-prototype-table-input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitPrice}
                        onChange={(e) => handleUpdateLine(line.id, 'unitPrice', Math.max(0, Number(e.target.value) || 0))}
                        style={{ textAlign: 'center', fontWeight: 600 }}
                      />
                    </td>

                    {/* Line Discount */}
                    <td className="purchase-prototype-table-cell" style={{ textAlign: 'center' }}>
                      <input
                        className="purchase-prototype-table-input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.discount || 0}
                        onChange={(e) => handleUpdateLine(line.id, 'discount', Math.max(0, Number(e.target.value) || 0))}
                        style={{ textAlign: 'center', color: '#dc2626' }}
                      />
                    </td>

                    {/* Line Total */}
                    <td className="line-total" style={{ textAlign: 'center', fontWeight: 700, color: '#170e5e' }}>
                      {formatCurrencyWithSymbol(line.total || 0, currency)}
                    </td>

                    {/* Delete Action */}
                    <td className="purchase-prototype-table-cell purchase-prototype-table-cell-actions" style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="document-row-delete purchase-prototype-row-delete"
                        onClick={() => handleRemoveItem(line.id)}
                        disabled={items.length === 1}
                        title="حذف هذا الصنف"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Dashed Actions */}
          <div className="document-line-items-actions" style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <Button type="button" variant="dashedAction" onClick={handleAddItem}>
              <span aria-hidden="true">+</span>
              <span>إضافة صنف</span>
            </Button>
            <Button type="button" variant="dashedAction" onClick={handleBarcodeScan}>
              <span aria-hidden="true" className="purchase-prototype-scan-icon">
                <svg viewBox="0 0 16 16" role="img" focusable="false" aria-hidden="true" width="14" height="14">
                  <path d="M3 4.2V3.1A.6.6 0 0 1 3.6 2.5h1.1M11.3 2.5h1.1a.6.6 0 0 1 .6.6v1.1M13 11.8v1.1a.6.6 0 0 1-.6.6h-1.1M4.7 13.5H3.6a.6.6 0 0 1-.6-.6v-1.1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5.1 5.2v5.6M7 5.2v5.6M9 5.2v5.6M10.9 5.2v5.6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </span>
              <span>مسح باركود</span>
            </Button>
            <Button
              type="button"
              variant="dashedAction"
              onClick={() => {
                const name = window.prompt('أدخل اسم المنتج الجديد:');
                if (name && name.trim()) {
                  setItems((prev) => [
                    ...prev,
                    {
                      id: Date.now() + Math.random(),
                      productId: 0,
                      productName: name.trim(),
                      unitName: 'قطعة',
                      quantity: 1,
                      unitPrice: 0,
                      total: 0,
                      discount: 0,
                      stockOnHand: 0,
                      warehouse: 'المستودع الرئيسي',
                    },
                  ]);
                }
              }}
            >
              <span aria-hidden="true">+</span>
              <span>منتج جديد</span>
            </Button>
          </div>
        </section>

        {/* Section 4: Terms & Conditions */}
        <section className="document-prototype-section" style={{ marginTop: '12px' }}>
          <h3 className="document-prototype-section-title">الشروط والأحكام</h3>
          <textarea
            className="purchase-prototype-notes-textarea"
            rows={3}
            value={termsConditions}
            onChange={(e) => setTermsConditions(e.target.value)}
            placeholder="الشروط والأحكام الخاصة بحجز البضاعة وسداد القيمة..."
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </section>

        {/* Section 5: Notes & Totals (60/40 Split) */}
        <section className="document-prototype-bottom-grid" style={{ marginTop: '12px' }}>
          {/* Notes Card (60%) */}
          <div className="document-prototype-section">
            <h3 className="document-prototype-section-title">ملاحظات</h3>
            <textarea
              className="purchase-prototype-notes-textarea"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات إضافية للتسليم أو العميل..."
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* Totals Card (40%) */}
          <div className="document-prototype-section document-totals-card">
            <h3 className="document-prototype-section-title">الإجماليات</h3>
            <div className="document-totals-panel">
              <div>
                <span>الإجمالي الفرعي:</span>
                <strong>{formatCurrencyWithSymbol(subtotal, currency)}</strong>
              </div>
              {totalDiscount > 0 && (
                <div style={{ color: '#dc2626' }}>
                  <span>الخصم:</span>
                  <strong>- {formatCurrencyWithSymbol(totalDiscount, currency)}</strong>
                </div>
              )}
              <div>
                <span>الضريبة ({taxRate}%):</span>
                <strong>{formatCurrencyWithSymbol(taxAmount, currency)}</strong>
              </div>
              <div className="document-total-grand" style={{ borderTop: '2px solid #e2e8f0', paddingTop: '8px', marginTop: '6px' }}>
                <span>الصافي المطلوب:</span>
                <strong>{formatCurrencyWithSymbol(totalAmount, currency)}</strong>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
