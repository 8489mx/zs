import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { getGlobalCurrencySymbol } from '@/lib/currencies';
import React, { useState, useEffect, useRef } from 'react';
import { CartItem, CreateOnlineOrderResponse, StorefrontInfo, ValidateCouponResponse, StorefrontPaymentSessionResponse, QuoteCartResponse } from '../types/storefront.types';
import { storefrontApi } from '../api/storefront.api';
import { StorefrontOnlinePaymentModal } from './StorefrontOnlinePaymentModal';
import { UtensilsIcon, XIcon, CheckIcon, TagIcon, TruckIcon, PackageIcon } from '@/shared/components/icons/AppIcons';
import { trackStorefrontEvent } from '../lib/storefront-pixel-tracker';
import { getCustomerOrderToken, saveCustomerOrderRef } from '../lib/customer-order-refs';
import { calculateCartSubtotal } from '../lib/storefront-cart-pricing';
import { getContrastTextColor } from '../lib/storefront-theme-contrast';

const STOREFRONT_SAVED_CUSTOMER_KEY = 'zsystems.storefront.saved_customer';

interface StorefrontCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  info?: StorefrontInfo;
  deliveryFee?: number;
  tenantSlug?: string;
  tableNumber?: string | null;
  orderType?: 'delivery' | 'dine_in';
  editingOrderNumber?: string;
  onEditSuccess?: (orderNumber: string) => void;
  onOrderSuccess?: (orderData: CreateOnlineOrderResponse) => void;
  onSubmitOrder?: (formData: {
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    customerNotes: string;
    paymentMethod?: string;
    couponCode?: string;
    deliveryZoneId?: number;
    deliveryZoneName?: string;
    orderType?: 'delivery' | 'dine_in';
    tableNumber?: string;
    fulfillmentType?: 'delivery' | 'pickup' | 'dine_in';
    countryCode?: string;
  }) => Promise<void>;
}

export interface CountryOption {
  code: string;
  name: string;
  dialCode: string;
  placeholder: string;
}

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'EG', name: 'مصر', dialCode: '+20', placeholder: '01012345678 (11 رقم)' },
  { code: 'SA', name: 'السعودية', dialCode: '+966', placeholder: '501234567 (9 أرقام)' },
  { code: 'AE', name: 'الإمارات', dialCode: '+971', placeholder: '501234567 (9 أرقام)' },
  { code: 'KW', name: 'الكويت', dialCode: '+965', placeholder: '91234567 (8 أرقام)' },
  { code: 'OM', name: 'عمان', dialCode: '+968', placeholder: '91234567 (8 أرقام)' },
  { code: 'QA', name: 'قطر', dialCode: '+974', placeholder: '51234567 (8 أرقام)' },
  { code: 'BH', name: 'البحرين', dialCode: '+973', placeholder: '31234567 (8 أرقام)' },
  { code: 'OTHER', name: 'دولي / أخرى', dialCode: '+', placeholder: 'رقم الهاتف' },
];

export function getDynamicPhoneValidation(phone: string, countryCode: string = 'EG'): { isValid: boolean; message: string; isComplete: boolean } {
  const clean = phone.replace(/[^0-9+]/g, '');
  if (!clean) return { isValid: false, message: '', isComplete: false };

  if (countryCode === 'EG') {
    const digits = clean.replace(/\D/g, '');
    if (!digits.startsWith('01')) {
      return { isValid: false, message: 'يجب أن يبدأ بـ 01', isComplete: false };
    }
    if (digits.length >= 3 && !['010', '011', '012', '015'].includes(digits.slice(0, 3))) {
      return { isValid: false, message: 'كود شبكة غير صحيح (010, 011, 012, 015)', isComplete: false };
    }
    if (digits.length === 11) {
      return { isValid: true, message: 'رقم هاتف صحيح (11 رقم)', isComplete: true };
    }
    return { isValid: false, message: `متبقي ${11 - digits.length} أرقام`, isComplete: false };
  }

  if (countryCode === 'SA') {
    const digits = clean.replace(/\D/g, '').replace(/^966/, '').replace(/^0/, '');
    if (digits.length === 9 && digits.startsWith('5')) {
      return { isValid: true, message: 'رقم هاتف سعودي صحيح', isComplete: true };
    }
    if (digits.length < 9) {
      return { isValid: false, message: `متبقي ${9 - digits.length} أرقام`, isComplete: false };
    }
    return { isValid: true, message: 'رقم هاتف مكتمل', isComplete: true };
  }

  const generalDigits = clean.replace(/\D/g, '');
  if (generalDigits.length >= 7 && generalDigits.length <= 15) {
    return { isValid: true, message: 'رقم الهاتف صحيح', isComplete: true };
  }
  return { isValid: false, message: 'رقم الهاتف غير مكتمل', isComplete: false };
}

export function getEgyptianPhoneValidation(phone: string): { isValid: boolean; message: string; isComplete: boolean } {
  return getDynamicPhoneValidation(phone, 'EG');
}

export function getCustomerNameValidation(name: string): { isValid: boolean; message: string } {
  const trimmed = name.trim();
  if (!trimmed) return { isValid: false, message: '' };
  const lettersCount = (trimmed.match(/[\p{L}\p{M}]/gu) || []).length;
  if (trimmed.length < 3 || lettersCount < 3) {
    return { isValid: false, message: 'الاسم يجب ألا يقل عن 3 أحرف' };
  }
  return { isValid: true, message: 'الاسم مكتمل' };
}

export function getCustomerAddressValidation(address: string): { isValid: boolean; message: string } {
  const trimmed = address.trim();
  if (!trimmed) return { isValid: false, message: '' };
  const lettersCount = (trimmed.match(/[\p{L}\p{M}]/gu) || []).length;
  if (trimmed.length < 5 || lettersCount < 3) {
    return { isValid: false, message: 'العنوان يجب ألا يقل عن 5 أحرف بالتفصيل' };
  }
  return { isValid: true, message: 'العنوان مكتمل' };
}

export function StorefrontCheckoutModal({
  isOpen,
  onClose,
  cartItems,
  info,
  deliveryFee: deliveryFeeProp,
  tenantSlug,
  tableNumber,
  orderType,
  editingOrderNumber,
  onEditSuccess,
  onOrderSuccess,
  onSubmitOrder,
}: StorefrontCheckoutModalProps) {
  const isDineIn = Boolean(tableNumber) || orderType === 'dine_in';
  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup'>('delivery');
  const [selectedCountry, setSelectedCountry] = useState<string>(() => {
    if (info?.currency === 'SAR') return 'SA';
    if (info?.currency === 'AED') return 'AE';
    if (info?.currency === 'KWD') return 'KW';
    if (info?.currency === 'OMR') return 'OM';
    if (info?.currency === 'QAR') return 'QA';
    if (info?.currency === 'BHD') return 'BH';
    return 'EG';
  });
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'instapay_wallet' | 'credit_card'>('cod');
  const [paymentSession, setPaymentSession] = useState<StorefrontPaymentSessionResponse | null>(null);
  const [createdOrderForPayment, setCreatedOrderForPayment] = useState<CreateOnlineOrderResponse | null>(null);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isDeviceMatched, setIsDeviceMatched] = useState(false);
  // Returning shopper: their saved details collapse into one summary line and the order is one tap
  // away. "تعديل البيانات" brings the full form back.
  const [expressMode, setExpressMode] = useState(false);
  const brandColor = info?.brandColor || 'var(--storefront-primary-color, #170e5e)';
  const brandColorContrast = getContrastTextColor(info?.brandColor);
  const [serverQuote, setServerQuote] = useState<QuoteCartResponse | null>(null);
  const [, setIsQuoting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<ValidateCouponResponse | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const isSubmittingRef = useRef(false);
  const idempotencyKeyRef = useRef<string>('');
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !tenantSlug || cartItems.length === 0) {
      setServerQuote(null);
      return;
    }
    let cancelled = false;
    setIsQuoting(true);

    const quotePayload = {
      items: cartItems.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        variantName: item.product.variantName || undefined,
      })),
      couponCode: appliedCoupon?.ok ? appliedCoupon.code : undefined,
      deliveryZoneId: selectedZoneId || undefined,
      fulfillmentType,
      orderType: isDineIn ? ('dine_in' as const) : ('delivery' as const),
      tableNumber: tableNumber ? String(tableNumber) : undefined,
    };

    storefrontApi
      .quoteCart(tenantSlug, quotePayload)
      .then((res) => {
        if (!cancelled && res?.ok) {
          setServerQuote(res);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsQuoting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, tenantSlug, cartItems, appliedCoupon, selectedZoneId, fulfillmentType, isDineIn, tableNumber]);

  // Trigger initiate checkout event for marketing pixels
  useEffect(() => {
    if (isOpen) {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = globalThis.crypto.randomUUID();
      }
      trackStorefrontEvent('InitiateCheckout', {
        value: subtotal,
        currency: info?.currency || 'EGP',
        numItems: cartItems.length,
      });
    }
  }, [isOpen]);

  // Silent abandoned cart capture
  const recordAbandonedCartSilent = () => {
    if (!tenantSlug || !customerPhone || isDineIn) return;
    const phoneValid = getDynamicPhoneValidation(customerPhone, selectedCountry);
    if (!phoneValid.isValid) return;
    try {
      storefrontApi.recordAbandonedCart(tenantSlug, {
        customerPhone: customerPhone.trim(),
        customerName: customerName.trim() || undefined,
        countryCode: selectedCountry,
        items: cartItems.map((item) => ({
          productId: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          unitPrice: item.product.price,
          total: item.product.price * item.quantity,
        })),
        subtotal,
      });
    } catch {}
  };

  const activeDeliveryZones = (info?.deliveryZones || []).filter((z) => z.isActive !== false);

  useEffect(() => {
    if (!isOpen) return;
    try {
      const savedZone = localStorage.getItem('zsystems.storefront.saved_zone_id');
      if (savedZone && activeDeliveryZones.some((z) => z.id === Number(savedZone))) {
        setSelectedZoneId(Number(savedZone));
      } else if (activeDeliveryZones.length > 0) {
        setSelectedZoneId((prev) => (prev !== null && activeDeliveryZones.some((z) => z.id === prev) ? prev : activeDeliveryZones[0].id));
      }
    } catch {
      if (activeDeliveryZones.length > 0) {
        setSelectedZoneId((prev) => (prev !== null && activeDeliveryZones.some((z) => z.id === prev) ? prev : activeDeliveryZones[0].id));
      }
    }
  }, [isOpen, activeDeliveryZones.length]);

  const handleZoneSelect = (zoneId: number) => {
    setSelectedZoneId(zoneId);
    try {
      localStorage.setItem('zsystems.storefront.saved_zone_id', String(zoneId));
    } catch {}
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    scrollBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    // Always reset loading and error states whenever modal open state toggles
    setLoading(false);
    setErrorMsg('');
    setCouponError('');
    isSubmittingRef.current = false;

    if (!isOpen) return;

    try {
      const saved = localStorage.getItem(STOREFRONT_SAVED_CUSTOMER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.phone) {
          setCustomerPhone(parsed.phone);
          if (parsed?.name) setCustomerName(parsed.name);
          if (parsed?.address) setCustomerAddress(parsed.address);
          setIsDeviceMatched(true);
          setExpressMode(!editingOrderNumber);
        }
      }
    } catch {}
  }, [isOpen]);

  const handlePhoneChange = (rawVal: string) => {
    const maxLen = selectedCountry === 'EG' ? 11 : selectedCountry === 'SA' || selectedCountry === 'AE' ? 10 : 15;
    const val = rawVal.replace(/\D/g, '').slice(0, maxLen);
    setCustomerPhone(val);

    const phoneVal = getDynamicPhoneValidation(val, selectedCountry);
    if (phoneVal.isValid) {
      try {
        const saved = localStorage.getItem(STOREFRONT_SAVED_CUSTOMER_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const savedClean = (parsed?.phone || '').replace(/\D/g, '');
          if (savedClean === val) {
            if (parsed?.name) setCustomerName(parsed.name);
            if (parsed?.address) setCustomerAddress(parsed.address);
            setIsDeviceMatched(true);
            return;
          }
        }
      } catch {}
    }
    setIsDeviceMatched(false);
  };

  const handleModalClose = () => {
    setLoading(false);
    setErrorMsg('');
    setCouponCodeInput('');
    setAppliedCoupon(null);
    setCouponError('');
    isSubmittingRef.current = false;
    onClose();
  };

  const handleApplyCoupon = async () => {
    const cleanCode = couponCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setCouponError('يرجى كتابة كود الكوبون أولاً');
      return;
    }
    if (!tenantSlug) return;

    setCouponLoading(true);
    setCouponError('');

    try {
      const res = await storefrontApi.validateCoupon(tenantSlug, cleanCode, subtotal);
      if (res.ok) {
        setAppliedCoupon(res);
        setCouponError('');
      } else {
        setAppliedCoupon(null);
        setCouponError(res.message || 'كود الكوبون غير صالح');
      }
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponError(err.message || 'تعذر التحقق من كود الكوبون');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
    setCouponError('');
  };

  if (!isOpen) return null;

  const localTotals = calculateCartSubtotal(cartItems);
  const subtotal = serverQuote ? serverQuote.subtotal : localTotals.subtotal;
  const bogoSavings = serverQuote ? serverQuote.bogoSavings : localTotals.totalSavings;

  const selectedZone = activeDeliveryZones.find((z) => z.id === selectedZoneId) || (activeDeliveryZones.length > 0 ? activeDeliveryZones[0] : null);
  const rawDeliveryFee = serverQuote
    ? serverQuote.deliveryFee
    : (selectedZone ? selectedZone.deliveryFee : (deliveryFeeProp ?? info?.deliveryFee ?? 0));

  // Automatic Free Shipping Rule
  const isAutoFreeShipping = Boolean(info?.freeShippingEnabled && subtotal >= (info?.freeShippingMinOrder || 500));
  const freeShippingThreshold = info?.freeShippingMinOrder || 500;
  const freeShippingRemaining = (info?.freeShippingEnabled && !isAutoFreeShipping)
    ? Math.max(0, freeShippingThreshold - subtotal)
    : 0;

  // Coupon Free Shipping & Discount
  const isPickup = fulfillmentType === 'pickup';
  const isCouponFreeShipping = Boolean(appliedCoupon?.ok && appliedCoupon?.isFreeShipping);
  const effectiveDeliveryFee = (isDineIn || isPickup || isAutoFreeShipping || isCouponFreeShipping) ? 0 : rawDeliveryFee;

  let discountAmount = 0;
  if (serverQuote) {
    discountAmount = serverQuote.discountAmount;
  } else if (appliedCoupon?.ok && appliedCoupon.discountAmount) {
    discountAmount = Math.min(subtotal, appliedCoupon.discountAmount);
  }

  const total = serverQuote
    ? serverQuote.totalAmount
    : (Math.max(0, subtotal - discountAmount) + effectiveDeliveryFee);

  const phoneStatus = getDynamicPhoneValidation(customerPhone, selectedCountry);
  const nameStatus = getCustomerNameValidation(customerName);
  const addressStatus = getCustomerAddressValidation(customerAddress);
  // Only collapse when every saved field would pass validation — otherwise show the form so the
  // shopper can see what needs fixing.
  const canExpress = expressMode && phoneStatus.isValid && nameStatus.isValid && (isDineIn || isPickup || addressStatus.isValid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || loading) return;

    if (!editingOrderNumber && cartItems.length === 0) {
      showError('سلة المشتريات فارغة، يرجى إضافة أصناف إلى السلة أولاً.');
      return;
    }

    const phoneValid = getDynamicPhoneValidation(customerPhone, selectedCountry);
    if (!phoneValid.isValid) {
      showError(phoneValid.message || 'يرجى إدخال رقم هاتف صحيح');
      return;
    }

    const trimmedName = customerName.trim();
    const nameLetters = (trimmedName.match(/[\p{L}\p{M}]/gu) || []).length;
    if (trimmedName.length < 3 || nameLetters < 3) {
      showError('يرجى إدخال اسم مستلم صحيح لا يقل عن 3 أحرف (مثال: علي، مازن، محمد)');
      return;
    }

    const trimmedAddress = isDineIn
      ? `طاولة رقم ${tableNumber}`
      : isPickup
      ? 'استلام ذاتي من الفرع'
      : customerAddress.trim();

    if (!isDineIn && !isPickup) {
      const addressLetters = (trimmedAddress.match(/[\p{L}\p{M}]/gu) || []).length;
      if (trimmedAddress.length < 5 || addressLetters < 3) {
        showError('يرجى إدخال عنوان توصيل واضح ومفصل لا يقل عن 5 أحرف (المنطقة، الشارع، رقم العقار)');
        return;
      }
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setErrorMsg('');

    try {
      // Persist customer details on this device if requested
      if (rememberDevice) {
        try {
          localStorage.setItem(
            STOREFRONT_SAVED_CUSTOMER_KEY,
            JSON.stringify({
              name: customerName.trim(),
              phone: customerPhone.trim(),
              address: customerAddress.trim(),
              savedAt: new Date().toISOString(),
            })
          );
        } catch {}
      } else {
        try {
          localStorage.removeItem(STOREFRONT_SAVED_CUSTOMER_KEY);
        } catch {}
      }

      if (editingOrderNumber && tenantSlug) {
        const payload = {
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim(),
          customerNotes: customerNotes.trim(),
          paymentMethod,
          couponCode: appliedCoupon?.ok ? appliedCoupon.code : undefined,
          deliveryZoneId: selectedZone ? selectedZone.id : undefined,
          deliveryZoneName: selectedZone ? selectedZone.name : undefined,
          items: cartItems.map((item) => ({
            productId: Number(item.product.id),
            quantity: Number(item.quantity) || 1,
            variantName: item.product.variantName || undefined,
          })),
        };
        const editToken = getCustomerOrderToken(tenantSlug, editingOrderNumber);
        if (!editToken) {
          throw new Error('تعذر التحقق من ملكية الطلب على هذا الجهاز، يرجى التواصل مع المتجر لتعديله');
        }
        await storefrontApi.updateCustomerOrder(tenantSlug, editingOrderNumber, editToken, payload);
        if (onEditSuccess) {
          onEditSuccess(editingOrderNumber);
        } else {
          handleModalClose();
        }
      } else if (onSubmitOrder) {
        await onSubmitOrder({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: trimmedAddress,
          customerNotes: customerNotes.trim(),
          paymentMethod,
          couponCode: appliedCoupon?.ok ? appliedCoupon.code : undefined,
          deliveryZoneId: selectedZone ? selectedZone.id : undefined,
          deliveryZoneName: selectedZone ? selectedZone.name : undefined,
          orderType: isDineIn ? 'dine_in' : 'delivery',
          tableNumber: tableNumber || undefined,
          fulfillmentType: isDineIn ? 'dine_in' : (isPickup ? 'pickup' : 'delivery'),
          countryCode: selectedCountry,
        });
      } else if (tenantSlug && onOrderSuccess) {
        const payload = {
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: trimmedAddress,
          customerNotes: customerNotes.trim(),
          paymentMethod,
          couponCode: appliedCoupon?.ok ? appliedCoupon.code : undefined,
          deliveryZoneId: selectedZone ? selectedZone.id : undefined,
          deliveryZoneName: selectedZone ? selectedZone.name : undefined,
          orderType: isDineIn ? ('dine_in' as const) : ('delivery' as const),
          tableNumber: tableNumber || undefined,
          fulfillmentType: isDineIn ? ('dine_in' as const) : (isPickup ? ('pickup' as const) : ('delivery' as const)),
          countryCode: selectedCountry,
          idempotencyKey: idempotencyKeyRef.current || undefined,
          items: cartItems.map((item) => ({
            productId: Number(item.product.id),
            quantity: Number(item.quantity) || 1,
            variantName: item.product.variantName || undefined,
          })),
        };
        const res = await storefrontApi.createOrder(tenantSlug, payload);
        idempotencyKeyRef.current = '';

        trackStorefrontEvent('Purchase', {
          orderNumber: res.orderNumber,
          value: res.totalAmount,
          currency: info?.currency || 'EGP',
          numItems: cartItems.length,
        });

        saveCustomerOrderRef(tenantSlug, res.orderNumber, res.accessToken);

        if (paymentMethod === 'credit_card') {
          try {
            const session = await storefrontApi.createPaymentSession(tenantSlug, res.orderNumber, res.accessToken || '');
            setCreatedOrderForPayment(res);
            setPaymentSession(session);
            setLoading(false);
            isSubmittingRef.current = false;
            return;
          } catch (sessionErr: any) {
            console.error('Failed to initiate online payment session:', sessionErr);
            onOrderSuccess(res);
            return;
          }
        }

        onOrderSuccess(res);
      } else {
        throw new Error('تعذر إرسال الطلب لعدم اكتمال بيانات المتجر، يرجى تحديث الصفحة والمحاولة مجدداً.');
      }
    } catch (err: any) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setErrorMsg('تعذر إرسال الطلب نظراً لعدم وجود اتصال بالإنترنت. يرجى التحقق من اتصالك بالشبكة ثم إعادة المحاولة.');
      } else {
        setErrorMsg(err.message || 'حدث خطأ أثناء تأكيد الطلب، يرجى المحاولة مرة أخرى');
      }
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleOnlinePaymentSuccess = (paymentInfo: { orderNumber: string; transactionId: string }) => {
    if (createdOrderForPayment && onOrderSuccess) {
      const updatedOrder = {
        ...createdOrderForPayment,
        paymentStatus: 'paid',
        gatewayTransactionId: paymentInfo.transactionId,
      };
      setPaymentSession(null);
      setCreatedOrderForPayment(null);
      onOrderSuccess(updatedOrder as any);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={handleModalClose}
    >
      <div
        className="storefront-checkout-modal-container"
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: 'min(92vh, calc(100dvh - 24px))',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          margin: 'auto',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          .storefront-checkout-modal-container {
            width: 100%;
            max-width: 860px;
          }
          .storefront-checkout-grid {
            display: grid;
            grid-template-columns: 1.12fr 0.88fr;
            gap: 16px;
            align-items: start;
          }
          .storefront-checkout-col {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .storefront-checkout-header {
            padding: 10px 16px;
          }
          .storefront-checkout-body {
            padding: 10px 14px;
          }
          .storefront-checkout-footer {
            padding: 8px 14px;
          }
          @media (max-width: 768px) {
            .storefront-checkout-modal-container {
              max-width: 480px !important;
              max-height: calc(100dvh - 12px) !important;
            }
            .storefront-checkout-grid {
              grid-template-columns: 1fr !important;
              gap: 6px !important;
            }
            .storefront-checkout-col {
              gap: 6px !important;
            }
            .storefront-checkout-header {
              padding: 7px 12px !important;
            }
            .storefront-checkout-body {
              padding: 6px 10px !important;
            }
            .storefront-checkout-footer {
              padding: 6px 10px !important;
            }
          }
        `}</style>
        {/* Header */}
        <div
          className="storefront-checkout-header"
          style={{
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
            flexShrink: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: '#eef2ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #e0e7ff',
                flexShrink: 0,
              }}
            >
              <PackageIcon size={16} color="#170e5e" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '3px', height: '12px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
                <h2 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>
                  {editingOrderNumber ? `تعديل الطلب #${editingOrderNumber}` : 'إتمام وتأكيد الطلب'}
                </h2>
              </div>
              <p style={{ margin: '1px 0 0', fontSize: '10.5px', color: '#64748b' }}>
                {editingOrderNumber ? 'تعديل بيانات وأصناف طلبك قبل اعتماده من المتجر' : 'الدفع نقداً عند استلام الطلب'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              aspectRatio: '1 / 1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              padding: 0,
              boxSizing: 'border-box',
              flexShrink: 0,
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#e2e8f0')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#f8fafc')}
            title="إغلاق (Esc)"
          >
            <XIcon size={14} color="#64748b" strokeWidth={2.2} />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* Scrollable Fields Body */}
          <div
            ref={scrollBodyRef}
            className="storefront-checkout-body"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
            }}
          >
            {errorMsg && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  color: '#991b1b',
                  marginBottom: '16px',
                }}
              >
                {errorMsg}
              </div>
            )}

            <div className="storefront-checkout-grid">
              {/* Column 1: Fulfillment, Customer Details & Address */}
              <div className="storefront-checkout-col">
                {/* Fulfillment Type Toggle (Delivery vs Pickup) - Hidden for Dine-in */}
                {!isDineIn && info?.pickupEnabled !== false && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: '6px',
                      width: '100%',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setFulfillmentType('delivery')}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: '0 8px',
                        height: '32px',
                        borderRadius: '8px',
                        border: fulfillmentType === 'delivery' ? `2px solid ${brandColor}` : '1.5px solid #cbd5e1',
                        background: fulfillmentType === 'delivery' ? 'rgba(23, 14, 94, 0.05)' : '#ffffff',
                        color: fulfillmentType === 'delivery' ? brandColor : '#475569',
                        fontWeight: 700,
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        whiteSpace: 'nowrap',
                        boxSizing: 'border-box',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <TruckIcon size={14} color={fulfillmentType === 'delivery' ? brandColor : '#64748b'} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>توصيل للمنزل</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFulfillmentType('pickup')}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: '0 8px',
                        height: '32px',
                        borderRadius: '8px',
                        border: fulfillmentType === 'pickup' ? `2px solid ${brandColor}` : '1.5px solid #cbd5e1',
                        background: fulfillmentType === 'pickup' ? 'rgba(23, 14, 94, 0.05)' : '#ffffff',
                        color: fulfillmentType === 'pickup' ? brandColor : '#475569',
                        fontWeight: 700,
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        whiteSpace: 'nowrap',
                        boxSizing: 'border-box',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <PackageIcon size={14} color={fulfillmentType === 'pickup' ? brandColor : '#64748b'} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>استلام من الفرع</span>
                      <span style={{ fontSize: '9px', fontWeight: 800, background: '#dcfce7', color: '#166534', padding: '1px 3px', borderRadius: '4px', flexShrink: 0 }}>مجاني</span>
                    </button>
                  </div>
                )}

                {canExpress && (
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '10px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                          {isDineIn ? 'الطلب باسم' : isPickup ? 'الاستلام باسم' : 'بيانات التوصيل'}
                        </span>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            background: '#dcfce7',
                            color: '#15803d',
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '8px',
                          }}
                        >
                          <CheckIcon size={10} color="#15803d" strokeWidth={3} />
                          بيانات محفوظة
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{customerName}</div>
                      <div style={{ fontSize: '11.5px', color: '#334155', direction: 'ltr', textAlign: 'right', marginTop: '1px', fontWeight: 600 }}>
                        {customerPhone}
                      </div>
                      {!isDineIn && !isPickup && (
                        <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px', lineHeight: 1.4, wordBreak: 'break-word' }}>
                          {customerAddress}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpressMode(false)}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        color: brandColor,
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        fontFamily: 'inherit',
                        padding: '4px 8px',
                      }}
                    >
                      تعديل
                    </button>
                  </div>
                )}

                {!canExpress && (
                  <>
                    {/* Customer Phone & Country Selector */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b' }}>
                          رقم الهاتف (للتواصل وتأكيد الطلب) <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        {customerPhone.length > 0 && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color: phoneStatus.isValid ? '#16a34a' : '#e11d48',
                            }}
                          >
                            {phoneStatus.message}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <select
                          value={selectedCountry}
                          onChange={(e) => {
                            setSelectedCountry(e.target.value);
                            setCustomerPhone('');
                          }}
                          style={{
                            width: '95px',
                            padding: '4px 6px',
                            height: '32px',
                            borderRadius: '8px',
                            border: '1.5px solid #cbd5e1',
                            fontSize: '11px',
                            background: '#f8fafc',
                            fontFamily: 'inherit',
                            fontWeight: 600,
                            color: '#1e293b',
                            cursor: 'pointer',
                            outline: 'none',
                            flexShrink: 0,
                          }}
                        >
                          {COUNTRY_OPTIONS.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name} ({c.dialCode})
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          required
                          maxLength={selectedCountry === 'EG' ? 11 : selectedCountry === 'SA' || selectedCountry === 'AE' ? 10 : 15}
                          autoFocus
                          value={customerPhone}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          onBlur={recordAbandonedCartSilent}
                          placeholder={COUNTRY_OPTIONS.find((c) => c.code === selectedCountry)?.placeholder || 'رقم الهاتف'}
                          style={{
                            flex: 1,
                            padding: '4px 10px',
                            height: '32px',
                            boxSizing: 'border-box',
                            borderRadius: '8px',
                            border:
                              customerPhone.length > 0
                                ? phoneStatus.isValid
                                  ? '1.5px solid #22c55e'
                                  : '1.5px solid #f87171'
                                : '1.5px solid #cbd5e1',
                            fontSize: '12.5px',
                            outline: 'none',
                            background: '#f8fafc',
                            fontFamily: 'inherit',
                            direction: 'ltr',
                            textAlign: 'right',
                            transition: 'border-color 0.2s ease',
                          }}
                        />
                      </div>

                      {isDeviceMatched && (
                        <div
                          style={{
                            background: '#f0fdf4',
                            border: '1px solid #86efac',
                            borderRadius: '6px',
                            padding: '3px 8px',
                            fontSize: '10px',
                            color: '#166534',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: '3px',
                          }}
                        >
                          <span>
                            <strong>تم استرجاع بياناتك تلقائياً:</strong> لأنك طلبت مسبقاً.
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomerName('');
                              setCustomerAddress('');
                              setIsDeviceMatched(false);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#15803d',
                              fontSize: '10px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              whiteSpace: 'nowrap',
                              marginRight: '6px',
                            }}
                          >
                            تغيير
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Customer Name */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#1e293b', marginBottom: '2px' }}>
                        الاسم بالكامل <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        onBlur={recordAbandonedCartSilent}
                        placeholder="مثال: علي محمد / مازن أحمد"
                        style={{
                          width: '100%',
                          padding: '4px 10px',
                          height: '32px',
                          boxSizing: 'border-box',
                          borderRadius: '8px',
                          border:
                            customerName.length > 0
                              ? nameStatus.isValid
                                ? '1.5px solid #22c55e'
                                : '1.5px solid #f87171'
                              : '1.5px solid #cbd5e1',
                          fontSize: '12px',
                          outline: 'none',
                          background: '#f8fafc',
                          fontFamily: 'inherit',
                          transition: 'border-color 0.2s ease',
                        }}
                      />
                    </div>
                  </>
                )}

                {/* Delivery Zone Matrix Selector (Hidden for Dine-In and Pickup) */}
                {!isDineIn && !isPickup && activeDeliveryZones.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b' }}>
                        منطقة / حي التوصيل <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      {selectedZone?.estimatedTime && (
                        <span style={{ fontSize: '10px', color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                          {selectedZone.estimatedTime}
                        </span>
                      )}
                    </div>

                    <select
                      value={selectedZone?.id ?? ''}
                      onChange={(e) => handleZoneSelect(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '4px 8px',
                        height: '32px',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '11.5px',
                        outline: 'none',
                        background: '#f8fafc',
                        fontFamily: 'inherit',
                        fontWeight: 600,
                        color: '#0f172a',
                        cursor: 'pointer',
                      }}
                    >
                      {activeDeliveryZones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name} — {z.deliveryFee === 0 ? 'توصيل مجاني (0 ج)' : `${z.deliveryFee} ${getGlobalCurrencySymbol()}`} {z.estimatedTime ? `(${z.estimatedTime})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Customer Address, Pickup Notice, or Dine-In Table Badge */}
                {isDineIn ? (
                  <div
                    style={{
                      background: '#f0fdf4',
                      border: '1.5px solid #86efac',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <UtensilsIcon size={15} color="#166534" strokeWidth={2} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: '#166534', fontSize: '11.5px' }}>
                        طلب مباشر من الصالة / الكافيه
                      </div>
                      <div style={{ color: '#15803d', fontSize: '10.5px' }}>
                        طاولة رقم: <strong>{tableNumber || 'غير محدد'}</strong>
                      </div>
                    </div>
                  </div>
                ) : isPickup ? (
                  <div
                    style={{
                      background: '#eff6ff',
                      border: '1.5px solid #93c5fd',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <PackageIcon size={15} color="#1e40af" strokeWidth={2} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: '#1e40af', fontSize: '11.5px' }}>
                        استلام ذاتي من الفرع (Click & Collect)
                      </div>
                      <div style={{ color: '#2563eb', fontSize: '10.5px' }}>
                        تجهيز الطلب للاستلام المباشر بدون رسوم شحن.
                      </div>
                    </div>
                  </div>
                ) : canExpress ? null : (
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#1e293b', marginBottom: '2px' }}>
                      عنوان التوصيل بالتفصيل <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <textarea
                      required
                      rows={1}
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      onBlur={recordAbandonedCartSilent}
                      placeholder="اسم الشارع، رقم العمارة، الطابق، الشقة، وعلامة مميزة..."
                      style={{
                        width: '100%',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        border:
                          customerAddress.length > 0
                            ? addressStatus.isValid
                              ? '1.5px solid #22c55e'
                              : '1.5px solid #f87171'
                            : '1.5px solid #cbd5e1',
                        fontSize: '11.5px',
                        outline: 'none',
                        background: '#f8fafc',
                        fontFamily: 'inherit',
                        resize: 'none',
                        minHeight: '32px',
                        height: '32px',
                        boxSizing: 'border-box',
                        lineHeight: '1.4',
                        transition: 'border-color 0.2s ease',
                      }}
                    />
                  </div>
                )}

                {/* Optional Notes & Promo Link Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '1px 2px' }}>
                  {!showNotes && !customerNotes.trim() ? (
                    <button
                      type="button"
                      onClick={() => setShowNotes(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: brandColor,
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '2px 0',
                        fontFamily: 'inherit',
                      }}
                    >
                      + إضافة ملاحظات للطلب (اختياري)
                    </button>
                  ) : (
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>ملاحظات الطلب</span>
                  )}

                  {!showCouponInput && !appliedCoupon?.ok ? (
                    <button
                      type="button"
                      onClick={() => setShowCouponInput(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#b45309',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '2px 0',
                        fontFamily: 'inherit',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <TagIcon size={12} color="#b45309" />
                      <span>لديك كوبون خصم؟</span>
                    </button>
                  ) : null}
                </div>

                {/* Collapsed Notes Field (visible when clicked or has content) */}
                {(showNotes || customerNotes.trim()) && (
                  <div>
                    <textarea
                      rows={1}
                      autoFocus={showNotes && !customerNotes}
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      placeholder="اكتب أي تعليمات لتحضير طلبك أو للتوصيل (اختياري)..."
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '11.5px',
                        outline: 'none',
                        background: '#f8fafc',
                        fontFamily: 'inherit',
                        resize: 'none',
                        minHeight: '34px',
                        height: '34px',
                        boxSizing: 'border-box',
                        lineHeight: '1.4',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Column 2: Payment, Promo, Summary */}
              <div className="storefront-checkout-col">
                {/* Payment Method Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#1e293b', marginBottom: '3px' }}>
                    طريقة الدفع
                  </label>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      gap: '6px',
                      width: '100%',
                    }}
                  >
                    {/* COD Option */}
                    <div
                      onClick={() => setPaymentMethod('cod')}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        border: paymentMethod === 'cod' ? `2px solid ${brandColor}` : '1.5px solid #cbd5e1',
                        background: paymentMethod === 'cod' ? 'rgba(23, 14, 94, 0.04)' : '#ffffff',
                        borderRadius: '8px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        height: '32px',
                        boxSizing: 'border-box',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          width: '11px',
                          height: '11px',
                          borderRadius: '50%',
                          border: paymentMethod === 'cod' ? `3.5px solid ${brandColor}` : '1.5px solid #94a3b8',
                          background: '#ffffff',
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          color: paymentMethod === 'cod' ? brandColor : '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {isDineIn ? 'في الصالة' : fulfillmentType === 'pickup' ? 'عند الاستلام' : 'الدفع عند الاستلام'}
                      </span>
                    </div>

                    {/* Pre-payment Option */}
                    <div
                      onClick={() => setPaymentMethod('instapay_wallet')}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        border: paymentMethod === 'instapay_wallet' ? `2px solid ${brandColor}` : '1.5px solid #cbd5e1',
                        background: paymentMethod === 'instapay_wallet' ? 'rgba(23, 14, 94, 0.04)' : '#ffffff',
                        borderRadius: '8px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        height: '32px',
                        boxSizing: 'border-box',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          width: '11px',
                          height: '11px',
                          borderRadius: '50%',
                          border: paymentMethod === 'instapay_wallet' ? `3.5px solid ${brandColor}` : '1.5px solid #94a3b8',
                          background: '#ffffff',
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          color: paymentMethod === 'instapay_wallet' ? brandColor : '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        إنستاباي / محفظة
                      </span>
                    </div>

                    {/* Credit Card Online Payment Option */}
                    {info?.onlinePaymentEnabled && (
                      <div
                        onClick={() => setPaymentMethod('credit_card')}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          border: paymentMethod === 'credit_card' ? `2px solid ${brandColor}` : '1.5px solid #cbd5e1',
                          background: paymentMethod === 'credit_card' ? 'rgba(23, 14, 94, 0.04)' : '#ffffff',
                          borderRadius: '8px',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          height: '32px',
                          boxSizing: 'border-box',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div
                          style={{
                            width: '11px',
                            height: '11px',
                            borderRadius: '50%',
                            border: paymentMethod === 'credit_card' ? `3.5px solid ${brandColor}` : '1.5px solid #94a3b8',
                            background: '#ffffff',
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            color: paymentMethod === 'credit_card' ? brandColor : '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          بطاقة بنكية
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Notice if credit_card is selected */}
                  {paymentMethod === 'credit_card' && (
                    <div
                      style={{
                        marginTop: '6px',
                        background: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '11px',
                        color: '#0369a1',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>
                        دفع إلكتروني فوري وآمن:
                      </div>
                      <div style={{ color: '#0c4a6e', fontSize: '10.5px', lineHeight: '1.3' }}>
                        سيتم فتح بوابة الدفع الآمنة لسداد مبلغ الطلب ({total.toFixed(0)} <CurrencySymbol />) ببطاقتك البنكية فور الضغط على إرسال الطلب.
                      </div>
                    </div>
                  )}

                  {/* Notice if instapay/wallet is selected */}
                  {paymentMethod === 'instapay_wallet' && (
                    <div
                      style={{
                        marginTop: '6px',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '11px',
                        color: '#166534',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>
                        رقم التحويل (إنستاباي / كاش):{' '}
                        <span style={{ direction: 'ltr', display: 'inline-block', color: brandColor, fontWeight: 900 }}>
                          {info?.whatsappPhone || 'يرجى التواصل عبر الواتساب'}
                        </span>
                      </div>
                      <div style={{ color: '#15803d', fontSize: '10.5px', lineHeight: '1.3' }}>
                        يرجى تحويل مبلغ الطلب ({total.toFixed(0)} <CurrencySymbol />) وإرسال إشعار التحويل عبر الواتساب لتأكيد الشحن فوراً.
                      </div>
                    </div>
                  )}
                </div>

                {/* Automatic Free Shipping Callout (Hidden for Dine-In) */}
                {!isDineIn && info?.freeShippingEnabled && (
                  <div>
                    {isAutoFreeShipping ? (
                      <div
                        style={{
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#065f46',
                          fontSize: '10.5px',
                          fontWeight: 700,
                        }}
                      >
                        <span>
                          مبروك! مشترياتك تجاوزت {freeShippingThreshold} <CurrencySymbol /> وحصلت على شحن مجاني{rawDeliveryFee > 0 ? <> (توفير {rawDeliveryFee.toFixed(0)} <CurrencySymbol />)</> : ''}.
                        </span>
                      </div>
                    ) : freeShippingRemaining > 0 ? (
                      <div
                        style={{
                          background: '#f0f9ff',
                          border: '1px solid #bae6fd',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          color: '#0369a1',
                          fontSize: '10.5px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <TruckIcon size={12} color="#0284c7" />
                          <span>
                            أضف بـ <strong style={{ color: '#0284c7' }}>{freeShippingRemaining.toFixed(0)} <CurrencySymbol /></strong> لشحن مجاني!
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '9.5px',
                            background: '#e0f2fe',
                            color: '#0369a1',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontWeight: 700,
                          }}
                        >
                          عرض الشحن
                        </span>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Promo Code Input Box (Visible when toggled or applied) */}
                {(showCouponInput || appliedCoupon?.ok) && (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '6px 8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>
                        كود الخصم أو الكوبون:
                      </label>
                      {appliedCoupon?.ok && (
                        <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <CheckIcon size={11} color="#16a34a" strokeWidth={2.5} />
                          <span>تم التطبيق</span>
                        </span>
                      )}
                    </div>

                    {appliedCoupon?.ok ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#ecfdf5',
                          border: '1px solid #86efac',
                          borderRadius: '6px',
                          padding: '4px 8px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <TagIcon size={12} color="#166534" strokeWidth={2} />
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#166534', fontSize: '11.5px' }}>
                            {appliedCoupon.code}
                          </span>
                          <span style={{ fontSize: '10px', color: '#15803d', marginRight: '4px' }}>
                            {appliedCoupon.isFreeShipping ? '(شحن مجاني)' : `(خصم ${discountAmount.toFixed(0)} ج)`}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#dc2626',
                            fontSize: '10px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: '1px 3px',
                          }}
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input
                            type="text"
                            value={couponCodeInput}
                            onChange={(e) => {
                              setCouponCodeInput(e.target.value.toUpperCase().replace(/\s+/g, ''));
                              setCouponError('');
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleApplyCoupon();
                              }
                            }}
                            placeholder="أدخل كود الكوبون هنا..."
                            style={{
                              flex: 1,
                              padding: '4px 8px',
                              height: '30px',
                              boxSizing: 'border-box',
                              borderRadius: '6px',
                              border: couponError ? '1.5px solid #f87171' : '1px solid #cbd5e1',
                              fontSize: '11px',
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              direction: 'ltr',
                              textAlign: 'right',
                              background: '#ffffff',
                              outline: 'none',
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleApplyCoupon}
                            disabled={couponLoading || !couponCodeInput.trim()}
                            style={{
                              padding: '4px 10px',
                              height: '30px',
                              borderRadius: '6px',
                              background: brandColor,
                              color: brandColorContrast || 'var(--storefront-primary-contrast, #ffffff)',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              border: 'none',
                              cursor: couponLoading || !couponCodeInput.trim() ? 'not-allowed' : 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {couponLoading ? 'جاري...' : 'تطبيق'}
                          </button>
                        </div>
                        {couponError && (
                          <span style={{ display: 'block', fontSize: '10px', color: '#dc2626', marginTop: '2px', fontWeight: 600 }}>
                            {couponError}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Order Total Summary */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#64748b' }}>
                    <span>مجموع الأصناف:</span>
                    <span style={{ fontWeight: 600, color: '#334155' }}>{subtotal.toFixed(0)} <CurrencySymbol /></span>
                  </div>

                  {bogoSavings > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#059669', background: '#ecfdf5', padding: '2px 5px', borderRadius: '4px' }}>
                      <span style={{ fontWeight: 700 }}>وفرت من عروض المتجر (BOGO):</span>
                      <strong style={{ fontWeight: 800 }}>- {bogoSavings.toFixed(0)} <CurrencySymbol /></strong>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#64748b' }}>
                    <span>{isDineIn ? 'خدمة الصالة / الطاولة:' : `خدمة التوصيل ${selectedZone ? `(${selectedZone.name})` : ''}:`}</span>
                    {isDineIn ? (
                      <strong style={{ color: '#166534' }}>مجاناً (طلب صالة)</strong>
                    ) : effectiveDeliveryFee === 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {rawDeliveryFee > 0 && (
                          <span style={{ textDecoration: 'line-through', color: '#94a3b8' }}>{rawDeliveryFee.toFixed(0)} ج</span>
                        )}
                        <strong style={{ color: '#166534' }}>توصيل مجاني</strong>
                      </div>
                    ) : (
                      <span style={{ fontWeight: 600, color: '#334155' }}>{effectiveDeliveryFee.toFixed(0)} <CurrencySymbol /></span>
                    )}
                  </div>

                  {discountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#16a34a' }}>
                      <span>خصم الكوبون ({appliedCoupon?.code}):</span>
                      <strong style={{ fontWeight: 800 }}>- {discountAmount.toFixed(0)} <CurrencySymbol /></strong>
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '3px',
                      marginTop: '1px',
                      borderTop: '1px dashed #cbd5e1',
                    }}
                  >
                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#0f172a' }}>
                      المبلغ الإجمالي للدفع:
                    </span>
                    <span style={{ fontSize: '14.5px', fontWeight: 900, color: '#0f172a' }}>
                      {total.toFixed(0)} <CurrencySymbol />
                    </span>
                  </div>
                </div>

                {/* Remember details checkbox (default checked) */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    color: '#475569',
                    userSelect: 'none',
                    margin: '0 2px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    style={{
                      width: '12px',
                      height: '12px',
                      accentColor: brandColor,
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                    تذكر بياناتي على هذا الجهاز لتسريع الطلب في المرات القادمة
                  </span>
                </label>
              </div>
            </div>
        </div>

        {/* Sticky Bottom Actions Bar (Always visible & accessible on all screens) */}
        <div
          className="storefront-checkout-footer"
          style={{
            borderTop: '1px solid #e2e8f0',
            background: '#ffffff',
            display: 'flex',
            gap: '8px',
            flexShrink: 0,
            boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.04)',
            zIndex: 10,
          }}
        >
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1,
              height: '38px',
              padding: '0 16px',
              borderRadius: '8px',
              background: brandColor,
              color: brandColorContrast || 'var(--storefront-primary-contrast, #ffffff)',
              fontSize: '13px',
              fontWeight: 800,
              border: 'none',
              cursor: loading ? 'wait' : 'pointer',
              boxShadow: '0 3px 10px rgba(0, 0, 0, 0.16)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            {loading ? 'جاري الحفظ...' : editingOrderNumber ? 'حفظ تعديلات الطلب' : isDineIn ? `إرسال للمطبخ (طاولة ${tableNumber || ''})` : 'إرسال وتأكيد الطلب الآن'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              height: '38px',
              padding: '0 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>

    {/* Online Payment Gateway Overlay */}
    {paymentSession && createdOrderForPayment && tenantSlug && (
      <StorefrontOnlinePaymentModal
        isOpen={Boolean(paymentSession)}
        session={paymentSession}
        orderData={createdOrderForPayment}
        tenantSlug={tenantSlug}
        onSuccess={handleOnlinePaymentSuccess}
        onClose={() => {
          if (createdOrderForPayment && onOrderSuccess) {
            onOrderSuccess(createdOrderForPayment);
          }
          setPaymentSession(null);
          setCreatedOrderForPayment(null);
        }}
      />
    )}
  </div>
);
}
