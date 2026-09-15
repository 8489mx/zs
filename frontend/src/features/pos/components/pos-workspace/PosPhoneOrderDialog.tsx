import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { posApi, type PosCustomerDeliveryProfile, type PosCustomerDeliveryProfileOrder } from '@/features/pos/api/pos.api';
import { catalogApi } from '@/lib/api/catalog';
import { toast } from '@/shared/components/system-alert';
import { formatCurrency, formatDate } from '@/lib/format';
import { callerIdService } from '@/features/pos/lib/pos-caller-id-service';
import type { PosWorkspaceState } from '@/features/pos/components/pos-workspace/posWorkspace.helpers';
import type { PosItem } from '@/features/pos/types/pos.types';
import {
  PhoneIcon,
  PhoneCallIcon,
  PhoneIncomingIcon,
  SearchIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  ReceiptIcon,
  RotateCcwIcon,
  SlidersIcon,
  RefreshCwIcon,
  XIcon,
} from '@/shared/components/icons/AppIcons';

interface PosPhoneOrderDialogProps {
  open: boolean;
  onClose: () => void;
  pos: PosWorkspaceState;
  initialPhone?: string;
  initialName?: string;
}

export function PosPhoneOrderDialog({
  open,
  onClose,
  pos,
  initialPhone = '',
  initialName = '',
}: PosPhoneOrderDialogProps) {
  const queryClient = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [phoneQuery, setPhoneQuery] = useState(initialPhone);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [isCustomAddressMode, setIsCustomAddressMode] = useState(false);
  const [customAddressInput, setCustomAddressInput] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  
  // Tab: 'desk' (Order lookup & history) | 'hardware' (Caller ID USB setup)
  const [activeTab, setActiveTab] = useState<'desk' | 'hardware'>('desk');

  // New Customer Form State
  const [newName, setNewName] = useState(initialName);
  const [newPhone, setNewPhone] = useState(initialPhone);
  const [newAddress, setNewAddress] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Hardware caller ID status
  const [isSerialConnected, setIsSerialConnected] = useState(callerIdService.isConnected());
  const [isConnectingHardware, setIsConnectingHardware] = useState(false);
  const isSerialSupported = callerIdService.isSupported();

  useEffect(() => {
    if (open) {
      if (initialPhone) {
        setPhoneQuery(initialPhone);
        setNewPhone(initialPhone);
      }
      if (initialName) {
        setNewName(initialName);
      }
      const frame = window.requestAnimationFrame(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [open, initialPhone, initialName]);

  const cleanDigits = phoneQuery.replace(/\D/g, '');

  const deliveryLookupQuery = useQuery<PosCustomerDeliveryProfile>({
    queryKey: ['posCustomerDeliveryLookup', cleanDigits],
    queryFn: () => posApi.customerDeliveryLookup(cleanDigits),
    enabled: open && cleanDigits.length >= 3,
    staleTime: 15_000,
  });

  const specificProfileQuery = useQuery<PosCustomerDeliveryProfile>({
    queryKey: ['posCustomerDeliveryProfile', selectedCustomerId],
    queryFn: () => posApi.customerDeliveryProfile(selectedCustomerId!),
    enabled: open && Boolean(selectedCustomerId),
    staleTime: 15_000,
  });

  const profileData = selectedCustomerId ? specificProfileQuery.data : deliveryLookupQuery.data;
  const currentCustomer = profileData?.customer;
  const addresses = useMemo(() => profileData?.addresses || [], [profileData?.addresses]);
  const recentOrders = useMemo(() => profileData?.recentOrders || [], [profileData?.recentOrders]);

  // Update selected address when profile loads
  useEffect(() => {
    if (currentCustomer && addresses.length > 0 && !selectedAddress && !isCustomAddressMode) {
      setSelectedAddress(addresses[0] || currentCustomer.address || '');
    } else if (currentCustomer && currentCustomer.address && !selectedAddress && !isCustomAddressMode) {
      setSelectedAddress(currentCustomer.address);
    }
  }, [currentCustomer, addresses, selectedAddress, isCustomAddressMode]);

  // Quick Customer Creation Mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (payload: { name: string; phone: string; address: string; notes?: string }) => {
      return catalogApi.createCustomer({
        name: payload.name.trim(),
        phone: payload.phone.trim(),
        address: payload.address.trim(),
        balance: 0,
        type: 'cash',
        creditLimit: 0,
        metadata: payload.notes ? { notes: payload.notes } : undefined,
      });
    },
    onSuccess: async (created: any) => {
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      await queryClient.invalidateQueries({ queryKey: ['posCustomers'] });
      
      const createdId = String(created?.id || created?.customer?.id || '');
      const assignedAddress = newAddress.trim();
      
      toast.success('تم تسجيل العميل بنجاح وتجهيز طلب التوصيل');
      
      if (createdId) {
        pos.setCustomerId(createdId);
      }
      pos.setQuickCustomerName(newName.trim());
      pos.setQuickCustomerPhone(newPhone.trim());
      pos.setQuickCustomerAddress(assignedAddress);
      pos.setOrderType('delivery');
      if (deliveryNotes.trim()) {
        pos.setNote(deliveryNotes.trim());
      }
      
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر تسجيل بيانات العميل');
    },
  });

  // Re-order handler: reconstructs cart from previous sale
  function handleReorder(order: PosCustomerDeliveryProfileOrder) {
    if (!currentCustomer) return;
    const finalAddress = isCustomAddressMode ? customAddressInput.trim() : (selectedAddress || currentCustomer.address || '');

    const productsCatalog = pos.productsQuery.data || [];
    const newCart: PosItem[] = [];

    for (let idx = 0; idx < order.items.length; idx++) {
      const orderItem = order.items[idx];
      const matchedProduct = productsCatalog.find(
        (p) => String(p.id) === String(orderItem.productId) || p.name.trim().toLowerCase() === orderItem.name.trim().toLowerCase()
      );

      const unitId = matchedProduct?.units?.[0]?.id ? String(matchedProduct.units[0].id) : 'default';
      const unitName = orderItem.unitName || matchedProduct?.units?.[0]?.name || 'قطعة';
      const unitMultiplier = orderItem.unitMultiplier || matchedProduct?.units?.[0]?.multiplier || 1;
      const currentPrice = matchedProduct ? Number(matchedProduct.retailPrice || 0) : Number(orderItem.unitPrice || 0);

      newCart.push({
        lineKey: `reorder-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
        productId: String(orderItem.productId || matchedProduct?.id || `custom-${idx}`),
        name: orderItem.name,
        itemCode: matchedProduct?.barcode || matchedProduct?.sku || '',
        unitId,
        unitName,
        unitMultiplier,
        price: currentPrice > 0 ? currentPrice : Number(orderItem.unitPrice || 0),
        costPrice: Number(matchedProduct?.costPrice || 0),
        qty: Number(orderItem.qty || 1),
        stockLimit: Number(matchedProduct?.stock || 9999),
        currentStock: Number(matchedProduct?.stock || 9999),
        minStock: Number(matchedProduct?.minStock || 0),
        priceType: 'retail',
        modifiers: orderItem.modifiers || [],
        notes: orderItem.notes || '',
      });
    }

    // Populate POS workspace
    pos.setCart(newCart);
    pos.setCustomerId(String(currentCustomer.id));
    pos.setQuickCustomerName(currentCustomer.name);
    pos.setQuickCustomerPhone(currentCustomer.phone);
    pos.setQuickCustomerAddress(finalAddress);
    pos.setOrderType('delivery');
    if (order.deliveryFee > 0) {
      pos.setDeliveryFee(order.deliveryFee);
    }
    if (order.note) {
      pos.setNote(order.note);
    }

    toast.success(`تم تكرار الطلب (${order.docNo}) بنجاح وتعبئة السلة بـ ${newCart.length} صنف.`);
    onClose();
  }

  // Start new empty delivery order for this customer
  function handleStartNewOrder() {
    if (!currentCustomer) return;
    const finalAddress = isCustomAddressMode ? customAddressInput.trim() : (selectedAddress || currentCustomer.address || '');

    pos.setCustomerId(String(currentCustomer.id));
    pos.setQuickCustomerName(currentCustomer.name);
    pos.setQuickCustomerPhone(currentCustomer.phone);
    pos.setQuickCustomerAddress(finalAddress);
    pos.setOrderType('delivery');
    if (deliveryNotes.trim()) {
      pos.setNote(deliveryNotes.trim());
    }

    toast.info(`تم تعيين العميل (${currentCustomer.name}) وبدء طلب توصيل جديد.`);
    onClose();
  }

  // Hardware connection handler
  async function handleConnectHardware() {
    setIsConnectingHardware(true);
    try {
      const res = await callerIdService.requestDeviceConnection(9600);
      if (res.success) {
        setIsSerialConnected(true);
        toast.success('تم الاتصال بجهاز كاشف المتصل (Caller ID) بنجاح');
      } else {
        toast.error(res.error || 'تعذر الاتصال بالجهاز');
      }
    } finally {
      setIsConnectingHardware(false);
    }
  }

  function handleSimulateCall() {
    const testPhones = ['01012345678', '01122334455', '01299887766', '01500112233'];
    const randomPhone = testPhones[Math.floor(Math.random() * testPhones.length)];
    callerIdService.simulateCall(randomPhone, 'عميل تجريبي');
    toast.info(`تم إرسال إشارة رنين تجريبية للرقم ${randomPhone}`);
    setPhoneQuery(randomPhone);
  }

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PhoneCallIcon size={20} color="#170e5e" />
          <span>مكتب طلبات الهاتف والتوصيل السريع (Phone Order Desk)</span>
        </div>
      }
      subtitle="استقبال مكالمات العملاء، البحث الفوري بالهاتف، وتكرار الطلبات بضغطة واحدة"
      width="960px"
      maxWidth="95vw"
      minHeight="540px"
      badge={
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('desk')}
            style={{
              background: activeTab === 'desk' ? '#170e5e' : '#f1f5f9',
              color: activeTab === 'desk' ? '#ffffff' : '#475569',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            شاشة الطلبات
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hardware')}
            style={{
              background: activeTab === 'hardware' ? '#170e5e' : '#f1f5f9',
              color: activeTab === 'hardware' ? '#ffffff' : '#475569',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <SlidersIcon size={12} />
            كاشف المتصل (Caller ID)
            {isSerialConnected && (
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
            )}
          </button>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {currentCustomer ? (
              <span>العميل المحدد: <strong>{currentCustomer.name}</strong> ({currentCustomer.phone || 'بدون هاتف'})</span>
            ) : (
              <span>أدخل رقم هاتف العميل للبحث التلقائي</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={onClose}>
              إلغاء وإغلاق
            </Button>
            {currentCustomer && (
              <Button
                style={{ background: '#170e5e', color: '#ffffff', fontWeight: 700 }}
                onClick={handleStartNewOrder}
              >
                <PlusIcon size={15} style={{ marginLeft: '4px' }} />
                بدء طلب جديد للعميل
              </Button>
            )}
          </div>
        </div>
      }
    >
      {activeTab === 'hardware' ? (
        /* Hardware Configuration Tab */
        <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
              إعدادات جهاز كاشف رقم المتصل (USB Serial Caller ID)
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0, lineHeight: 1.6 }}>
              يتيح ربط جهاز كاشف الرقم التقاط رقم المتصل فور رنين هاتف المطعم وفتح ملف العميل تلقائياً بضغطة واحدة دون الحاجة لكتابة الرقم يدوياً.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                حالة التوصيل المباشر
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: isSerialConnected ? '#10b981' : '#94a3b8',
                  }}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isSerialConnected ? '#065f46' : '#64748b' }}>
                  {isSerialConnected ? 'متصل بجهاز كاشف الرقم' : 'غير متصل'}
                </span>
              </div>
              <Button
                style={{ width: '100%', background: '#170e5e', color: '#ffffff', fontWeight: 700 }}
                disabled={!isSerialSupported || isConnectingHardware}
                onClick={handleConnectHardware}
              >
                <RefreshCwIcon size={14} style={{ marginLeft: '6px' }} />
                {isConnectingHardware ? 'جاري الاتصال...' : 'توصيل جهاز كاشف الأرقام USB'}
              </Button>
              {!isSerialSupported && (
                <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '8px' }}>
                  المتصفح الحالي لا يدعم Web Serial API. يرجى استخدام متصفح Chrome أو Edge.
                </div>
              )}
            </div>

            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                محاكاة واختبار الرنين (QA & Testing)
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '16px', lineHeight: 1.5 }}>
                يمكنك محاكاة مكالمة هاتفية واردة لتجربة التنبيه الصوتي والنافذة المنبثقة فورياً.
              </p>
              <Button
                variant="secondary"
                style={{ width: '100%', fontWeight: 700 }}
                onClick={handleSimulateCall}
              >
                <PhoneIncomingIcon size={14} style={{ marginLeft: '6px' }} />
                محاكاة اتصال هاتفي وارد الآن
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Order Desk Tab */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Top Phone Search Bar */}
          <div
            style={{
              background: '#f8fafc',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                ref={searchInputRef}
                type="text"
                value={phoneQuery}
                onChange={(e) => {
                  setPhoneQuery(e.target.value);
                  setSelectedCustomerId(null);
                  setSelectedAddress('');
                  setNewPhone(e.target.value);
                }}
                placeholder="أدخل رقم هاتف العميل (مثال: 01012345678)..."
                style={{
                  width: '100%',
                  padding: '10px 38px 10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  background: '#ffffff',
                  outline: 'none',
                }}
              />
              <SearchIcon
                size={18}
                color="#94a3b8"
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              {phoneQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setPhoneQuery('');
                    setSelectedCustomerId(null);
                    setSelectedAddress('');
                    searchInputRef.current?.focus();
                  }}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  <XIcon size={14} />
                </button>
              )}
            </div>

            {deliveryLookupQuery.isFetching && (
              <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <RefreshCwIcon size={14} className="spin" />
                <span>جاري البحث...</span>
              </div>
            )}
          </div>

          {/* Search Results / Multi-matches dropdown if any */}
          {deliveryLookupQuery.data?.matchedCustomers && deliveryLookupQuery.data.matchedCustomers.length > 1 && (
            <div style={{ background: '#eff6ff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e40af', marginBottom: '6px' }}>
                تم العثور على أكثر من عميل يطابق الرقم:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {deliveryLookupQuery.data.matchedCustomers.map((mc) => (
                  <button
                    key={mc.id}
                    type="button"
                    onClick={() => {
                      setSelectedCustomerId(mc.id);
                      setSelectedAddress('');
                    }}
                    style={{
                      background: (selectedCustomerId === mc.id || (!selectedCustomerId && currentCustomer?.id === mc.id)) ? '#1e40af' : '#ffffff',
                      color: (selectedCustomerId === mc.id || (!selectedCustomerId && currentCustomer?.id === mc.id)) ? '#ffffff' : '#1e293b',
                      border: '1px solid #93c5fd',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {mc.name} ({mc.phone})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main Content Area */}
          {cleanDigits.length < 3 ? (
            /* Empty prompt state */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 24px',
                textAlign: 'center',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px dashed #cbd5e1',
              }}
            >
              <PhoneIcon size={42} color="#94a3b8" style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                ابدأ بكتابة رقم هاتف العميل المتصل
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', maxWidth: '420px', margin: 0 }}>
                بمجرد إدخال الرقم، سيقوم النظام باسترجاع بيانات العميل وعناوينه المسجلة وتاريخ طلباته السابقة لتكرارها بضغطة واحدة.
              </p>
            </div>
          ) : currentCustomer ? (
            /* STATE 1: Existing Customer Found */
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '16px' }}>
              {/* Left Column: Customer Profile & Addresses */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Profile Card */}
                <div
                  style={{
                    background: '#ffffff',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                        {currentCustomer.name}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                        {currentCustomer.phone || 'بدون رقم مسجل'}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: currentCustomer.customerType === 'vip' ? '#fef3c7' : '#f1f5f9',
                        color: currentCustomer.customerType === 'vip' ? '#92400e' : '#475569',
                      }}
                    >
                      {currentCustomer.customerType === 'vip' ? 'عميل VIP' : 'عميل نقدي'}
                    </span>
                  </div>

                  {/* Customer Quick Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600 }}>إجمالي الطلبات</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>
                        {profileData?.stats?.invoiceCount || 0}
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600 }}>إجمالي المشتريات</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#170e5e' }}>
                        {formatCurrency(profileData?.stats?.totalSalesAmount || 0)}
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600 }}>نقاط الولاء</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#059669' }}>
                        {currentCustomer.loyaltyPoints || 0}
                      </div>
                    </div>
                  </div>

                  {/* Preferences or Notes */}
                  {currentCustomer.notes && (
                    <div style={{ background: '#fffbeb', padding: '8px 12px', borderRadius: '8px', border: '1px solid #fef3c7', fontSize: '0.78rem', color: '#92400e' }}>
                      <strong>ملاحظات العميل:</strong> {currentCustomer.notes}
                    </div>
                  )}
                </div>

                {/* Delivery Address Selector */}
                <div
                  style={{
                    background: '#ffffff',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPinIcon size={16} color="#2563eb" />
                      <span>عنوان التوصيل المعتمد للطلب</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCustomAddressMode(!isCustomAddressMode)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      {isCustomAddressMode ? 'اختيار من العناوين المحفوظة' : '+ عنوان جديد'}
                    </button>
                  </div>

                  {isCustomAddressMode ? (
                    <div>
                      <input
                        type="text"
                        value={customAddressInput}
                        onChange={(e) => setCustomAddressInput(e.target.value)}
                        placeholder="أدخل العنوان الجديد بالتفصيل (المنطقة، الشارع، رقم العقار، الدور)..."
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.8125rem',
                          outline: 'none',
                          marginBottom: '8px',
                        }}
                      />
                    </div>
                  ) : addresses.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {addresses.map((addr, idx) => (
                        <label
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: selectedAddress === addr ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                            background: selectedAddress === addr ? '#eff6ff' : '#ffffff',
                            cursor: 'pointer',
                            fontSize: '0.8125rem',
                            fontWeight: selectedAddress === addr ? 700 : 500,
                            color: selectedAddress === addr ? '#1e40af' : '#334155',
                          }}
                        >
                          <input
                            type="radio"
                            name="delivery_address"
                            checked={selectedAddress === addr}
                            onChange={() => setSelectedAddress(addr)}
                            style={{ accentColor: '#2563eb' }}
                          />
                          <span style={{ flex: 1, wordBreak: 'break-word' }}>{addr}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', padding: '12px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px' }}>
                      لا يوجد عناوين سابقة مسجلة لهذا العميل.
                    </div>
                  )}

                  {/* Delivery Note input */}
                  <div style={{ marginTop: '12px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                      توجيهات إضافية للطيار (Delivery Note)
                    </label>
                    <input
                      type="text"
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder="مثال: رن الجرس مرتين، بجوار صيدلية العزبي..."
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.8rem',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Order History & 1-Click Repeat */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ReceiptIcon size={16} color="#170e5e" />
                    <span>سجل آخر طلبات العميل وتكرار الطلب</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {recentOrders.length} طلبات سابقة
                  </span>
                </div>

                {recentOrders.length === 0 ? (
                  <div
                    style={{
                      background: '#f8fafc',
                      padding: '36px 16px',
                      borderRadius: '12px',
                      border: '1px dashed #cbd5e1',
                      textAlign: 'center',
                    }}
                  >
                    <ClockIcon size={32} color="#94a3b8" style={{ marginBottom: '8px' }} />
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155' }}>
                      لا توجد طلبات سابقة لهذا العميل
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                      يمكنك بدء أول طلب له عبر زر "بدء طلب جديد للعميل".
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto', paddingLeft: '4px' }}>
                    {recentOrders.map((order) => (
                      <div
                        key={order.id}
                        style={{
                          background: '#ffffff',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                          padding: '12px 14px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#170e5e' }}>
                              {order.docNo}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              {order.createdAt ? formatDate(order.createdAt) : ''}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                            {formatCurrency(order.total)}
                          </span>
                        </div>

                        {/* Items breakdown list */}
                        <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', fontSize: '0.78rem', color: '#334155' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {order.items.map((item, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>
                                  <strong>{item.qty}x</strong> {item.name}
                                  {item.modifiers && item.modifiers.length > 0 && (
                                    <span style={{ color: '#64748b', fontSize: '0.72rem', marginRight: '4px' }}>
                                      ({item.modifiers.map((m: any) => m.name || m).join(' + ')})
                                    </span>
                                  )}
                                </span>
                                <span style={{ color: '#64748b', fontWeight: 600 }}>{formatCurrency(item.lineTotal)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Order Footer & Repeat Button */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                            {order.customerAddress ? `العنوان: ${order.customerAddress}` : 'بدون عنوان محدد'}
                          </div>
                          <Button
                            size="sm"
                            style={{
                              background: '#170e5e',
                              color: '#ffffff',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              padding: '5px 12px',
                              borderRadius: '6px',
                            }}
                            onClick={() => handleReorder(order)}
                          >
                            <RotateCcwIcon size={13} style={{ marginLeft: '4px' }} />
                            تكرار هذا الطلب في السلة
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* STATE 2: Customer Not Found - New Customer Quick Form */
            <div
              style={{
                background: '#ffffff',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <PlusIcon size={18} color="#2563eb" />
                <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  تسجيل عميل جديد وبدء طلب التوصيل
                </h3>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newName.trim()) {
                    toast.error('اسم العميل مطلوب');
                    return;
                  }
                  createCustomerMutation.mutate({
                    name: newName,
                    phone: newPhone,
                    address: newAddress,
                    notes: newNotes,
                  });
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      اسم العميل <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="اسم العميل الكامل..."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      رقم الهاتف
                    </label>
                    <input
                      type="text"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="رقم الهاتف..."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    عنوان التوصيل التفصيلي (المنطقة، الشارع، العقار، الدور، الشقة)
                  </label>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="مثال: المعادي - شارع 9 - عمارة 14 - الدور الثالث شقة 6"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    ملاحظات أو علامات مميزة للعنوان
                  </label>
                  <input
                    type="text"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="مثال: أمام مسجد الفتح، مدخل العمارة من الجانب..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                  <Button
                    type="submit"
                    disabled={createCustomerMutation.isPending}
                    style={{ background: '#170e5e', color: '#ffffff', fontWeight: 700 }}
                  >
                    <CheckCircleIcon size={16} style={{ marginLeft: '6px' }} />
                    {createCustomerMutation.isPending ? 'جاري الحفظ...' : 'حفظ العميل وبدء طلب التوصيل'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </StandardDialog>
  );
}
