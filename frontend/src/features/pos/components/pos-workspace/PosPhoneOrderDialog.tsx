import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { posApi, type PosCustomerDeliveryProfile, type PosCustomerDeliveryProfileOrder } from '@/features/pos/api/pos.api';
import { catalogApi } from '@/lib/api/catalog';
import { deliveryRepsApi, type DeliveryRep } from '@/shared/api/delivery-reps.api';
import { toast } from '@/shared/components/system-alert';
import { formatCurrency, formatDate } from '@/lib/format';
import { callerIdService, type CallerIdCallEvent } from '@/features/pos/lib/pos-caller-id-service';
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
  TruckIcon,
  CreditCardIcon,
  DollarSignIcon,
  TrashIcon,
} from '@/shared/components/icons/AppIcons';

interface PosPhoneOrderDialogProps {
  open: boolean;
  onClose: () => void;
  pos: PosWorkspaceState;
  initialPhone?: string;
  initialName?: string;
}

export type DoorstepPaymentMethod = 'cash' | 'card_pos' | 'instapay_wallet';

const DELIVERY_ZONES = [
  { id: 'zone_standard', name: 'توصيل عادي / داخل النطاق', fee: 15, eta: 30 },
  { id: 'zone_near', name: 'منطقة قريبة (أقل من 3 كم)', fee: 10, eta: 25 },
  { id: 'zone_med', name: 'منطقة متوسطة (3 - 6 كم)', fee: 20, eta: 35 },
  { id: 'zone_far', name: 'منطقة بعيدة (6 - 10 كم)', fee: 30, eta: 45 },
  { id: 'zone_extra', name: 'توصيل ممتد / خارج النطاق', fee: 45, eta: 60 },
  { id: 'zone_custom', name: 'تحديد رسوم مخصصة يدويًا', fee: 0, eta: 35 },
];

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
  const [addressTag, setAddressTag] = useState<'home' | 'work' | 'other'>('home');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Delivery & Payment Enhancements
  const [selectedZoneId, setSelectedZoneId] = useState<string>('zone_standard');
  const [customDeliveryFee, setCustomDeliveryFee] = useState<number>(15);
  const [etaMinutes, setEtaMinutes] = useState<number>(30);
  const [paymentMethodAtDoor, setPaymentMethodAtDoor] = useState<DoorstepPaymentMethod>('cash');
  const [customerPaidNote, setCustomerPaidNote] = useState<string>('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  
  // Tab: 'desk' | 'recent_calls' | 'hardware'
  const [activeTab, setActiveTab] = useState<'desk' | 'recent_calls' | 'hardware'>('desk');
  const [recentCallsList, setRecentCallsList] = useState<CallerIdCallEvent[]>([]);

  // New Customer Form State
  const [newName, setNewName] = useState(initialName);
  const [newPhone, setNewPhone] = useState(initialPhone);
  const [newAddress, setNewAddress] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Hardware caller ID status
  const [isSerialConnected, setIsSerialConnected] = useState(callerIdService.isConnected());
  const [isConnectingHardware, setIsConnectingHardware] = useState(false);
  const isSerialSupported = callerIdService.isSupported();

  // Load active delivery reps
  const deliveryRepsQuery = useQuery({
    queryKey: ['delivery-reps'],
    queryFn: deliveryRepsApi.list,
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  const deliveryReps = useMemo(() => {
    const list = deliveryRepsQuery.data || [];
    return list.filter((r: DeliveryRep) => r.is_active !== false);
  }, [deliveryRepsQuery.data]);

  // Sync recent calls on open & subscribe
  useEffect(() => {
    if (open) {
      setRecentCallsList(callerIdService.getRecentCalls());
      const unsub = callerIdService.subscribe(() => {
        setRecentCallsList(callerIdService.getRecentCalls());
      });
      return () => unsub();
    }
  }, [open]);

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

  // Zone selection calculation
  const currentDeliveryFee = useMemo(() => {
    if (selectedZoneId === 'zone_custom') return customDeliveryFee;
    const found = DELIVERY_ZONES.find((z) => z.id === selectedZoneId);
    return found ? found.fee : 15;
  }, [selectedZoneId, customDeliveryFee]);

  function handleZoneChange(zoneId: string) {
    setSelectedZoneId(zoneId);
    const found = DELIVERY_ZONES.find((z) => z.id === zoneId);
    if (found) {
      if (zoneId !== 'zone_custom') {
        setCustomDeliveryFee(found.fee);
      }
      setEtaMinutes(found.eta);
    }
  }

  // Construct combined delivery & payment operational note
  function buildCombinedNote(): string {
    const parts: string[] = [];

    // Zone & ETA
    const zoneObj = DELIVERY_ZONES.find((z) => z.id === selectedZoneId);
    const zoneName = zoneObj ? zoneObj.name : 'توصيل';
    parts.push(`[التوصيل: ${zoneName} - ${currentDeliveryFee} ج | الوقت المتوقع: ${etaMinutes} دقيقة]`);

    // Payment method at doorstep
    if (paymentMethodAtDoor === 'cash') {
      if (customerPaidNote.trim()) {
        parts.push(`[الدفع: كاش عند الاستلام | العميل يدفع: ${customerPaidNote.trim()} ج - تجهيز فكة للطيار]`);
      } else {
        parts.push(`[الدفع: كاش عند الاستلام]`);
      }
    } else if (paymentMethodAtDoor === 'card_pos') {
      parts.push(`[الدفع: فيزا مع الطيار | اصطحاب ماكينة POS المحمولة]`);
    } else if (paymentMethodAtDoor === 'instapay_wallet') {
      parts.push(`[الدفع: إنستاباي / محفظة إلكترونية]`);
    }

    if (deliveryNotes.trim()) {
      parts.push(`[ملاحظات الطيار: ${deliveryNotes.trim()}]`);
    }

    return parts.join(' ');
  }

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
      const assignedAddress = newAddress.trim() 
        ? `${addressTag === 'work' ? '[العمل] ' : addressTag === 'home' ? '[المنزل] ' : ''}${newAddress.trim()}`
        : '';
      
      toast.success('تم تسجيل العميل بنجاح وتجهيز طلب التوصيل');
      
      if (createdId) {
        pos.setCustomerId(createdId);
      }
      pos.setQuickCustomerName(newName.trim());
      pos.setQuickCustomerPhone(newPhone.trim());
      pos.setQuickCustomerAddress(assignedAddress);
      pos.setOrderType('delivery');
      pos.setDeliveryFee(currentDeliveryFee);
      if (selectedDriverId) {
        pos.setDeliveryRepId(selectedDriverId);
      }
      
      const note = buildCombinedNote();
      if (note) {
        pos.setNote(note);
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
    const rawAddress = isCustomAddressMode ? customAddressInput.trim() : (selectedAddress || currentCustomer.address || '');
    const finalAddress = isCustomAddressMode && rawAddress
      ? `${addressTag === 'work' ? '[العمل] ' : addressTag === 'home' ? '[المنزل] ' : ''}${rawAddress}`
      : rawAddress;

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
    pos.setDeliveryFee(currentDeliveryFee > 0 ? currentDeliveryFee : (order.deliveryFee || 0));
    if (selectedDriverId) {
      pos.setDeliveryRepId(selectedDriverId);
    }
    
    const note = buildCombinedNote();
    if (note) {
      pos.setNote(note);
    }

    toast.success(`تم تكرار الطلب (${order.docNo}) بنجاح وتعبئة السلة بـ ${newCart.length} صنف.`);
    onClose();
  }

  // Start new empty delivery order for this customer
  function handleStartNewOrder() {
    if (!currentCustomer) return;
    const rawAddress = isCustomAddressMode ? customAddressInput.trim() : (selectedAddress || currentCustomer.address || '');
    const finalAddress = isCustomAddressMode && rawAddress
      ? `${addressTag === 'work' ? '[العمل] ' : addressTag === 'home' ? '[المنزل] ' : ''}${rawAddress}`
      : rawAddress;

    pos.setCustomerId(String(currentCustomer.id));
    pos.setQuickCustomerName(currentCustomer.name);
    pos.setQuickCustomerPhone(currentCustomer.phone);
    pos.setQuickCustomerAddress(finalAddress);
    pos.setOrderType('delivery');
    pos.setDeliveryFee(currentDeliveryFee);
    if (selectedDriverId) {
      pos.setDeliveryRepId(selectedDriverId);
    }
    
    const note = buildCombinedNote();
    if (note) {
      pos.setNote(note);
    }

    toast.info(`تم تعيين العميل (${currentCustomer.name}) وتجهيز بيانات التوصيل.`);
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
    setRecentCallsList(callerIdService.getRecentCalls());
    setActiveTab('desk');
  }

  function handlePickRecentCall(phone: string) {
    setPhoneQuery(phone);
    setSelectedCustomerId(null);
    setSelectedAddress('');
    setActiveTab('desk');
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
      subtitle="استقبال مكالمات العملاء، كاشف الأرقام، تجهيز فكة الطيار، وتكرار الطلبات بضغطة واحدة"
      width="1040px"
      maxWidth="96vw"
      minHeight="560px"
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
              padding: '5px 12px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            شاشة الطلبات
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recent_calls')}
            style={{
              background: activeTab === 'recent_calls' ? '#170e5e' : '#f1f5f9',
              color: activeTab === 'recent_calls' ? '#ffffff' : '#475569',
              border: 'none',
              borderRadius: '6px',
              padding: '5px 12px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <ClockIcon size={13} />
            سجل المكالمات
            {recentCallsList.length > 0 && (
              <span
                style={{
                  background: activeTab === 'recent_calls' ? '#3b82f6' : '#e2e8f0',
                  color: activeTab === 'recent_calls' ? '#ffffff' : '#1e293b',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '10px',
                }}
              >
                {recentCallsList.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hardware')}
            style={{
              background: activeTab === 'hardware' ? '#170e5e' : '#f1f5f9',
              color: activeTab === 'hardware' ? '#ffffff' : '#475569',
              border: 'none',
              borderRadius: '6px',
              padding: '5px 12px',
              fontSize: '0.78rem',
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
            {currentCustomer && activeTab === 'desk' && (
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
      {activeTab === 'recent_calls' ? (
        /* Recent Incoming Calls Log Tab */
        <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                سجل المكالمات الواردة الأخيرة (Caller ID Log)
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                يمكنك الضغط على أي مكالمة فائتة أو واردة لفتح ملف العميل وبدء الطلب فوراً.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  callerIdService.clearRecentCalls();
                  setRecentCallsList([]);
                  toast.info('تم مسح سجل المكالمات');
                }}
                disabled={recentCallsList.length === 0}
              >
                <TrashIcon size={14} style={{ marginLeft: '4px' }} />
                مسح السجل
              </Button>
              <Button
                size="sm"
                style={{ background: '#170e5e', color: '#ffffff', fontWeight: 700 }}
                onClick={handleSimulateCall}
              >
                <PhoneIncomingIcon size={14} style={{ marginLeft: '4px' }} />
                محاكاة رنين وارد
              </Button>
            </div>
          </div>

          {recentCallsList.length === 0 ? (
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
              <PhoneIncomingIcon size={36} color="#94a3b8" style={{ marginBottom: '10px' }} />
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                لا توجد مكالمات مسجلة في الجلسة الحالية
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '380px', margin: 0 }}>
                بمجرد توصيل جهاز كاشف الأرقام USB أو استقبال رنين، ستظهر الأرقام هنا تلقائياً.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
              {recentCallsList.map((call) => (
                <div
                  key={call.id}
                  style={{
                    background: '#ffffff',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: '#eff6ff',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <PhoneCallIcon size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                        {call.phone}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                        {call.callerName ? `${call.callerName} • ` : ''}
                        {formatDate(call.timestamp)}
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    style={{ background: '#170e5e', color: '#ffffff', fontWeight: 700 }}
                    onClick={() => handlePickRecentCall(call.phone)}
                  >
                    <SearchIcon size={13} style={{ marginLeft: '4px' }} />
                    فتح ملف العميل وبدء الطلب
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'hardware' ? (
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: '16px' }}>
              {/* Left Column: Customer Profile, Addresses, Zone & Payment */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Profile Card */}
                <div
                  style={{
                    background: '#ffffff',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600 }}>إجمالي الطلبات</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>
                        {profileData?.stats?.invoiceCount || 0}
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600 }}>إجمالي المشتريات</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#170e5e' }}>
                        {formatCurrency(profileData?.stats?.totalSalesAmount || 0)}
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600 }}>نقاط الولاء</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#059669' }}>
                        {currentCustomer.loyaltyPoints || 0}
                      </div>
                    </div>
                  </div>

                  {/* Notes if any */}
                  {currentCustomer.notes && (
                    <div style={{ background: '#fffbeb', padding: '6px 10px', borderRadius: '6px', border: '1px solid #fef3c7', fontSize: '0.75rem', color: '#92400e', marginTop: '8px' }}>
                      <strong>ملاحظات العميل:</strong> {currentCustomer.notes}
                    </div>
                  )}
                </div>

                {/* Delivery Address Selector */}
                <div
                  style={{
                    background: '#ffffff',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPinIcon size={15} color="#2563eb" />
                      <span>عنوان التوصيل</span>
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
                      {isCustomAddressMode ? 'اختيار من العناوين المحفوظة' : '+ إضافة عنوان جديد'}
                    </button>
                  </div>

                  {isCustomAddressMode ? (
                    <div>
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                        {(['home', 'work', 'other'] as const).map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setAddressTag(tag)}
                            style={{
                              background: addressTag === tag ? '#2563eb' : '#f1f5f9',
                              color: addressTag === tag ? '#ffffff' : '#475569',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '3px 8px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {tag === 'home' ? 'المنزل' : tag === 'work' ? 'العمل' : 'أخرى'}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={customAddressInput}
                        onChange={(e) => setCustomAddressInput(e.target.value)}
                        placeholder="أدخل العنوان الجديد بالتفصيل (المنطقة، الشارع، رقم العقار، الدور)..."
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.8rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  ) : addresses.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                      {addresses.map((addr, idx) => (
                        <label
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: selectedAddress === addr ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                            background: selectedAddress === addr ? '#eff6ff' : '#ffffff',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
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
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', padding: '8px', textAlign: 'center', background: '#f8fafc', borderRadius: '6px' }}>
                      لا يوجد عناوين سابقة مسجلة لهذا العميل.
                    </div>
                  )}
                </div>

                {/* Delivery Zone, Fees & Driver Setup */}
                <div
                  style={{
                    background: '#ffffff',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <TruckIcon size={15} color="#059669" />
                    <span>منطقة التوصيل والطيار المتاح</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '3px' }}>
                        منطقة التوصيل والرسوم
                      </label>
                      <select
                        value={selectedZoneId}
                        onChange={(e) => handleZoneChange(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.78rem',
                          background: '#ffffff',
                        }}
                      >
                        {DELIVERY_ZONES.map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.name} ({z.fee} ج)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '3px' }}>
                        تعيين الطيار (اختياري)
                      </label>
                      <select
                        value={selectedDriverId}
                        onChange={(e) => setSelectedDriverId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.78rem',
                          background: '#ffffff',
                        }}
                      >
                        <option value="">توزيع تلقائي لاحقاً</option>
                        {deliveryReps.map((dr: DeliveryRep) => (
                          <option key={dr.id} value={dr.id}>
                            {dr.name} {dr.phone ? `(${dr.phone})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedZoneId === 'zone_custom' && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>رسوم التوصيل:</span>
                      <input
                        type="number"
                        min="0"
                        value={customDeliveryFee}
                        onChange={(e) => setCustomDeliveryFee(Number(e.target.value) || 0)}
                        style={{ width: '80px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                      />
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>ج.م</span>
                    </div>
                  )}

                  {/* Payment at Doorstep Selector */}
                  <div style={{ paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                      طريقة الدفع المتوقعة عند الاستلام
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setPaymentMethodAtDoor('cash')}
                        style={{
                          background: paymentMethodAtDoor === 'cash' ? '#170e5e' : '#f8fafc',
                          color: paymentMethodAtDoor === 'cash' ? '#ffffff' : '#334155',
                          border: '1px solid',
                          borderColor: paymentMethodAtDoor === 'cash' ? '#170e5e' : '#cbd5e1',
                          borderRadius: '6px',
                          padding: '6px 4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                      >
                        <DollarSignIcon size={12} />
                        كاش عند الاستلام
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethodAtDoor('card_pos')}
                        style={{
                          background: paymentMethodAtDoor === 'card_pos' ? '#170e5e' : '#f8fafc',
                          color: paymentMethodAtDoor === 'card_pos' ? '#ffffff' : '#334155',
                          border: '1px solid',
                          borderColor: paymentMethodAtDoor === 'card_pos' ? '#170e5e' : '#cbd5e1',
                          borderRadius: '6px',
                          padding: '6px 4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                      >
                        <CreditCardIcon size={12} />
                        فيزا مع الطيار
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethodAtDoor('instapay_wallet')}
                        style={{
                          background: paymentMethodAtDoor === 'instapay_wallet' ? '#170e5e' : '#f8fafc',
                          color: paymentMethodAtDoor === 'instapay_wallet' ? '#ffffff' : '#334155',
                          border: '1px solid',
                          borderColor: paymentMethodAtDoor === 'instapay_wallet' ? '#170e5e' : '#cbd5e1',
                          borderRadius: '6px',
                          padding: '6px 4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                      >
                        إنستاباي / محفظة
                      </button>
                    </div>

                    {paymentMethodAtDoor === 'cash' && (
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap' }}>العميل سيدفع:</span>
                        <input
                          type="text"
                          value={customerPaidNote}
                          onChange={(e) => setCustomerPaidNote(e.target.value)}
                          placeholder="مثلاً: 200 ج (فكة مطلوبة)..."
                          style={{
                            flex: 1,
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.78rem',
                          }}
                        />
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {['100', '200', '500'].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setCustomerPaidNote(val)}
                              style={{
                                background: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                padding: '3px 6px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Delivery Note input */}
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '3px' }}>
                      توجيهات إضافية للطيار (Delivery Note)
                    </label>
                    <input
                      type="text"
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder="مثال: رن الجرس مرتين، بجوار صيدلية العزبي..."
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.78rem',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Order History & 1-Click Repeat */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ReceiptIcon size={15} color="#170e5e" />
                    <span>سجل طلبات العميل السابقة</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {recentOrders.length} طلبات مسجلة
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
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                      لا توجد طلبات سابقة مسجلة لهذا العميل
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', marginBottom: '14px' }}>
                      يمكنك بدء أول طلب له وسيقوم النظام بحفظ عنوانه وتفضيلاته تلقائياً.
                    </p>
                    <Button
                      style={{ background: '#170e5e', color: '#ffffff', fontWeight: 700, fontSize: '0.8rem' }}
                      onClick={handleStartNewOrder}
                    >
                      <PlusIcon size={14} style={{ marginLeft: '4px' }} />
                      بدء أول طلب للعميل
                    </Button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '440px', overflowY: 'auto', paddingLeft: '4px' }}>
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
                          <div style={{ fontSize: '0.72rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
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
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <PlusIcon size={18} color="#2563eb" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  تسجيل عميل جديد وتجهيز طلب التوصيل
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
                style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
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
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.82rem',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      رقم الهاتف
                    </label>
                    <input
                      type="text"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="رقم الهاتف..."
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.82rem',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', margin: 0 }}>
                      عنوان التوصيل التفصيلي (المنطقة، الشارع، العقار، الدور، الشقة)
                    </label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {(['home', 'work', 'other'] as const).map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setAddressTag(tag)}
                          style={{
                            background: addressTag === tag ? '#2563eb' : '#f1f5f9',
                            color: addressTag === tag ? '#ffffff' : '#475569',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {tag === 'home' ? 'المنزل' : tag === 'work' ? 'العمل' : 'أخرى'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="مثال: المعادي - شارع 9 - عمارة 14 - الدور الثالث شقة 6"
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                    }}
                  />
                </div>

                {/* Delivery Zone & Payment in New Customer Form */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '3px' }}>
                      منطقة التوصيل
                    </label>
                    <select
                      value={selectedZoneId}
                      onChange={(e) => handleZoneChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '5px 8px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.78rem',
                        background: '#ffffff',
                      }}
                    >
                      {DELIVERY_ZONES.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name} ({z.fee} ج)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '3px' }}>
                      طريقة الدفع عند الاستلام
                    </label>
                    <select
                      value={paymentMethodAtDoor}
                      onChange={(e) => setPaymentMethodAtDoor(e.target.value as DoorstepPaymentMethod)}
                      style={{
                        width: '100%',
                        padding: '5px 8px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.78rem',
                        background: '#ffffff',
                      }}
                    >
                      <option value="cash">كاش عند الاستلام</option>
                      <option value="card_pos">فيزا مع الطيار (POS)</option>
                      <option value="instapay_wallet">إنستاباي / محفظة إلكترونية</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    ملاحظات أو علامات مميزة للعنوان
                  </label>
                  <input
                    type="text"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="مثال: أمام مسجد الفتح، مدخل العمارة من الجانب..."
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
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
