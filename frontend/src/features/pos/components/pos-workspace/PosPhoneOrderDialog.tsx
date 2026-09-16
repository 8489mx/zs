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
  CreditCardIcon,
  DollarSignIcon,
  TrashIcon,
  UserIcon,
  ArrowLeftIcon,
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
  const [isForceNewCustomer, setIsForceNewCustomer] = useState(false);

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

  const trimmedQuery = phoneQuery.trim();
  const cleanDigits = phoneQuery.replace(/\D/g, '');
  const isTextSearch = /[^\d\s\-+()]/.test(trimmedQuery);

  // International Gold Standard Search Trigger:
  // Phone numbers: >= 6 digits (eliminates 010, 011, 012 operator collision)
  // Text/Name: >= 2 characters
  const isSearchActive = isTextSearch ? trimmedQuery.length >= 2 : cleanDigits.length >= 6;
  const searchParam = isTextSearch ? trimmedQuery : cleanDigits;

  const deliveryLookupQuery = useQuery<PosCustomerDeliveryProfile>({
    queryKey: ['posCustomerDeliveryLookup', searchParam],
    queryFn: () => posApi.customerDeliveryLookup(searchParam),
    enabled: open && isSearchActive && !selectedCustomerId,
    staleTime: 15_000,
  });

  const specificProfileQuery = useQuery<PosCustomerDeliveryProfile>({
    queryKey: ['posCustomerDeliveryProfile', selectedCustomerId],
    queryFn: () => posApi.customerDeliveryProfile(selectedCustomerId!),
    enabled: open && Boolean(selectedCustomerId),
    staleTime: 15_000,
  });

  const profileData = selectedCustomerId ? specificProfileQuery.data : deliveryLookupQuery.data;

  // Active customer is either:
  // 1. Explicitly selected candidate
  // 2. Exact 1-to-1 match from phone lookup / caller ID
  const currentCustomer = selectedCustomerId
    ? specificProfileQuery.data?.customer
    : (deliveryLookupQuery.data?.isExactMatch ? deliveryLookupQuery.data?.customer : null);

  const matchedCustomers = deliveryLookupQuery.data?.matchedCustomers || [];
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

  // Add address to customer profile mutation
  const addAddressMutation = useMutation({
    mutationFn: async ({ customerId, address }: { customerId: string; address: string }) => {
      return posApi.addCustomerAddress(customerId, address);
    },
    onSuccess: async (_, vars) => {
      await queryClient.invalidateQueries({ queryKey: ['posCustomerDeliveryLookup'] });
      await queryClient.invalidateQueries({ queryKey: ['posCustomerDeliveryProfile', vars.customerId] });
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      setSelectedAddress(vars.address);
      setIsCustomAddressMode(false);
      setCustomAddressInput('');
      toast.success('تم حفظ العنوان الجديد للعميل بنجاح');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر حفظ العنوان');
    },
  });

  // Delete address from customer profile mutation
  const deleteAddressMutation = useMutation({
    mutationFn: async ({ customerId, address }: { customerId: string; address: string }) => {
      return posApi.deleteCustomerAddress(customerId, address);
    },
    onSuccess: async (_, vars) => {
      await queryClient.invalidateQueries({ queryKey: ['posCustomerDeliveryLookup'] });
      await queryClient.invalidateQueries({ queryKey: ['posCustomerDeliveryProfile', vars.customerId] });
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      if (selectedAddress === vars.address) {
        setSelectedAddress('');
      }
      toast.info('تم حذف العنوان بنجاح');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر حذف العنوان');
    },
  });

  function handleSaveCustomAddress() {
    if (!currentCustomer) return;
    const raw = customAddressInput.trim();
    if (!raw) {
      toast.warning('يرجى كتابة تفاصيل العنوان أولاً');
      return;
    }
    const tagPrefix = addressTag === 'work' ? '[العمل] ' : addressTag === 'home' ? '[المنزل] ' : '';
    const formatted = `${tagPrefix}${raw}`;
    addAddressMutation.mutate({ customerId: String(currentCustomer.id), address: formatted });
  }

  // Re-order handler: reconstructs cart from previous sale
  function handleReorder(order: PosCustomerDeliveryProfileOrder) {
    if (!currentCustomer) return;
    const rawAddress = isCustomAddressMode ? customAddressInput.trim() : (selectedAddress || currentCustomer.address || '');
    const finalAddress = isCustomAddressMode && rawAddress
      ? `${addressTag === 'work' ? '[العمل] ' : addressTag === 'home' ? '[المنزل] ' : ''}${rawAddress}`
      : rawAddress;

    // Automatically persist custom address if typed
    if (isCustomAddressMode && rawAddress) {
      posApi.addCustomerAddress(currentCustomer.id, finalAddress).then(() => {
        queryClient.invalidateQueries({ queryKey: ['posCustomerDeliveryLookup'] });
        queryClient.invalidateQueries({ queryKey: ['posCustomerDeliveryProfile', currentCustomer.id] });
      }).catch(() => {});
    }

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

    // Automatically persist custom address if typed
    if (isCustomAddressMode && rawAddress) {
      posApi.addCustomerAddress(currentCustomer.id, finalAddress).then(() => {
        queryClient.invalidateQueries({ queryKey: ['posCustomerDeliveryLookup'] });
        queryClient.invalidateQueries({ queryKey: ['posCustomerDeliveryProfile', currentCustomer.id] });
      }).catch(() => {});
    }

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
      compact
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PhoneCallIcon size={18} color="#170e5e" />
          <span>مكتب طلبات الهاتف والتوصيل السريع (Phone Order Desk)</span>
        </div>
      }
      subtitle="استقبال مكالمات العملاء، كاشف الأرقام، تجهيز فكة الطيار، وتكرار الطلبات بضغطة واحدة"
      width="1180px"
      maxWidth="96vw"
      minHeight="auto"
      badge={
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
            onClick={() => setActiveTab('recent_calls')}
            style={{
              background: activeTab === 'recent_calls' ? '#170e5e' : '#f1f5f9',
              color: activeTab === 'recent_calls' ? '#ffffff' : '#475569',
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
            <ClockIcon size={12} />
            سجل المكالمات
            {recentCallsList.length > 0 && (
              <span
                style={{
                  background: activeTab === 'recent_calls' ? '#3b82f6' : '#e2e8f0',
                  color: activeTab === 'recent_calls' ? '#ffffff' : '#1e293b',
                  fontSize: '0.6875rem',
                  fontWeight: 800,
                  padding: '1px 5px',
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
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <SlidersIcon size={11} />
            كاشف المتصل (Caller ID)
            {isSerialConnected && (
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
            )}
          </button>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            {currentCustomer ? (
              <span>العميل المحدد: <strong>{currentCustomer.name}</strong> ({currentCustomer.phone || 'بدون هاتف'})</span>
            ) : isSearchActive ? (
              <span>نتائج البحث للرقم: <strong>{phoneQuery}</strong></span>
            ) : (
              <span>أدخل 6 أرقام على الأقل للبحث السريع</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" size="sm" onClick={onClose} style={{ fontSize: '0.78rem' }}>
              إلغاء وإغلاق
            </Button>
            {currentCustomer && activeTab === 'desk' && (
              <Button
                size="sm"
                style={{ background: '#170e5e', color: '#ffffff', fontWeight: 700, fontSize: '0.78rem' }}
                onClick={handleStartNewOrder}
              >
                <PlusIcon size={14} style={{ marginLeft: '4px' }} />
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Top Phone Search Bar */}
          <div
            style={{
              background: '#f8fafc',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
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
                  setIsForceNewCustomer(false);
                  setNewPhone(e.target.value);
                }}
                placeholder="أدخل رقم هاتف العميل (مثال: 01012345678) أو اسم العميل..."
                style={{
                  width: '100%',
                  padding: '6px 32px 6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  background: '#ffffff',
                  outline: 'none',
                }}
              />
              <SearchIcon
                size={16}
                color="#94a3b8"
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}
              />
              {phoneQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setPhoneQuery('');
                    setSelectedCustomerId(null);
                    setSelectedAddress('');
                    setIsForceNewCustomer(false);
                    searchInputRef.current?.focus();
                  }}
                  style={{
                    position: 'absolute',
                    left: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '2px',
                  }}
                >
                  <XIcon size={13} />
                </button>
              )}
            </div>

            {deliveryLookupQuery.isFetching && (
              <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <RefreshCwIcon size={13} className="spin" />
                <span>جاري البحث...</span>
              </div>
            )}
          </div>

          {/* Main Content Area */}
          {!currentCustomer && !isSearchActive ? (
            /* Empty prompt state */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '36px 20px',
                textAlign: 'center',
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px dashed #cbd5e1',
              }}
            >
              <PhoneIcon size={36} color="#94a3b8" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                مكتب استقبال طلبات الهاتف والتوصيل السريع
              </div>
              <p style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: '440px', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                أدخل <strong>6 أرقام على الأقل</strong> للبحث برقم الهاتف لتجاوز بادئة شركات المحمول (010 / 011 / 012 / 015)، أو ابدأ بكتابة اسم العميل.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveTab('recent_calls')}
                  style={{ fontSize: '0.75rem', fontWeight: 700 }}
                >
                  <ClockIcon size={12} style={{ marginLeft: '4px' }} />
                  سجل المكالمات الواردة
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setIsForceNewCustomer(true);
                    setNewPhone(phoneQuery || '');
                  }}
                  style={{ fontSize: '0.75rem', fontWeight: 700 }}
                >
                  <PlusIcon size={12} style={{ marginLeft: '4px' }} />
                  تسجيل عميل جديد مباشرة
                </Button>
              </div>
            </div>
          ) : currentCustomer ? (
            /* STATE 1: Existing / Selected Customer Workspace */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Active Customer Strip */}
              <div
                style={{
                  background: '#eff6ff',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: '#1e40af',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <UserIcon size={14} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e3a8a' }}>
                      العميل النشط: {currentCustomer.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600 }}>
                      ({currentCustomer.phone || 'بدون رقم'})
                    </span>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: currentCustomer.customerType === 'vip' ? '#fef3c7' : '#e0e7ff',
                        color: currentCustomer.customerType === 'vip' ? '#92400e' : '#3730a3',
                      }}
                    >
                      {currentCustomer.customerType === 'vip' ? 'VIP' : 'نقدي'}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSelectedCustomerId(null);
                    setSelectedAddress('');
                    setIsForceNewCustomer(false);
                    searchInputRef.current?.focus();
                  }}
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    background: '#ffffff',
                    border: '1px solid #93c5fd',
                    color: '#1e40af',
                  }}
                >
                  <SearchIcon size={12} style={{ marginLeft: '4px' }} />
                  تغيير العميل
                </Button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: '10px' }}>
                {/* Left Column: Customer Profile, Addresses, Zone & Payment */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Customer Quick Stats & Address Card */}
                  <div
                    style={{
                      background: '#ffffff',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      <div style={{ background: '#f8fafc', padding: '4px 6px', borderRadius: '6px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>إجمالي الطلبات</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>
                          {profileData?.stats?.invoiceCount || 0}
                        </div>
                      </div>
                      <div style={{ background: '#f8fafc', padding: '4px 6px', borderRadius: '6px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>إجمالي المشتريات</div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#170e5e' }}>
                          {formatCurrency(profileData?.stats?.totalSalesAmount || 0)}
                        </div>
                      </div>
                      <div style={{ background: '#f8fafc', padding: '4px 6px', borderRadius: '6px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>نقاط الولاء</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#059669' }}>
                          {currentCustomer.loyaltyPoints || 0}
                        </div>
                      </div>
                    </div>

                    {/* Customer notes if any */}
                    {currentCustomer.notes && (
                      <div style={{ background: '#fffbeb', padding: '3px 8px', borderRadius: '4px', border: '1px solid #fef3c7', fontSize: '0.7rem', color: '#92400e' }}>
                        <strong>ملاحظات:</strong> {currentCustomer.notes}
                      </div>
                    )}

                    {/* Delivery Address Selector */}
                    <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '5px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPinIcon size={12} color="#2563eb" />
                          <span>عنوان التوصيل</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsCustomAddressMode(!isCustomAddressMode)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#2563eb',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          {isCustomAddressMode ? 'اختيار من العناوين المحفوظة' : '+ عنوان جديد'}
                        </button>
                      </div>

                      {isCustomAddressMode ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
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
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                {tag === 'home' ? 'المنزل' : tag === 'work' ? 'العمل' : 'أخرى'}
                              </button>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <input
                              type="text"
                              value={customAddressInput}
                              onChange={(e) => setCustomAddressInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveCustomAddress();
                                }
                              }}
                              placeholder="اكتب العنوان بالتفصيل (المنطقة، الشارع، العقار، الدور)..."
                              style={{
                                flex: 1,
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.75rem',
                                outline: 'none',
                              }}
                            />
                            <button
                              type="button"
                              onClick={handleSaveCustomAddress}
                              disabled={addAddressMutation.isPending || !customAddressInput.trim()}
                              style={{
                                background: '#10b981',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                whiteSpace: 'nowrap',
                                opacity: !customAddressInput.trim() ? 0.6 : 1,
                              }}
                              title="حفظ هذا العنوان في ملف العميل دائماً"
                            >
                              <PlusIcon size={12} />
                              <span>حفظ العنوان</span>
                            </button>
                          </div>
                        </div>
                      ) : addresses.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '80px', overflowY: 'auto' }}>
                          {addresses.map((addr, idx) => {
                            const isSelected = selectedAddress === addr;
                            const isHome = addr.startsWith('[المنزل]');
                            const isWork = addr.startsWith('[العمل]');
                            const displayAddr = addr.replace(/^\[(المنزل|العمل|أخرى)\]\s*/, '');
                            const tagLabel = isHome ? 'المنزل' : isWork ? 'العمل' : null;

                            return (
                              <div
                                key={idx}
                                onClick={() => setSelectedAddress(addr)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '6px',
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  border: isSelected ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                                  background: isSelected ? '#eff6ff' : '#ffffff',
                                  cursor: 'pointer',
                                  fontSize: '0.72rem',
                                  fontWeight: isSelected ? 700 : 500,
                                  color: isSelected ? '#1e40af' : '#334155',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                                  <input
                                    type="radio"
                                    name="delivery_address"
                                    checked={isSelected}
                                    onChange={() => setSelectedAddress(addr)}
                                    style={{ accentColor: '#2563eb', margin: 0 }}
                                  />
                                  {tagLabel && (
                                    <span
                                      style={{
                                        background: isHome ? '#e0f2fe' : '#fef3c7',
                                        color: isHome ? '#0369a1' : '#b45309',
                                        fontSize: '0.625rem',
                                        fontWeight: 700,
                                        padding: '1px 5px',
                                        borderRadius: '3px',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {tagLabel}
                                    </span>
                                  )}
                                  <span style={{ flex: 1, wordBreak: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {displayAddr}
                                  </span>
                                </div>
                                {currentCustomer && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteAddressMutation.mutate({ customerId: String(currentCustomer.id), address: addr });
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#94a3b8',
                                      cursor: 'pointer',
                                      padding: '2px',
                                      borderRadius: '3px',
                                      display: 'flex',
                                      alignItems: 'center',
                                    }}
                                    title="حذف هذا العنوان"
                                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                                  >
                                    <TrashIcon size={11} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', padding: '4px', textAlign: 'center', background: '#f8fafc', borderRadius: '4px' }}>
                          لا يوجد عناوين سابقة مسجلة لهذا العميل. اضغط على "+ عنوان جديد" لإضافة عنوان.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delivery Zone, Fees, Driver & Payment Setup */}
                  <div
                    style={{
                      background: '#ffffff',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '6px' }}>
                      <div>
                        <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '2px' }}>
                          منطقة التوصيل والرسوم
                        </label>
                        <select
                          value={selectedZoneId}
                          onChange={(e) => handleZoneChange(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '4px 6px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.72rem',
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
                        <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '2px' }}>
                          تعيين الطيار (اختياري)
                        </label>
                        <select
                          value={selectedDriverId}
                          onChange={(e) => setSelectedDriverId(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '4px 6px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.72rem',
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
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>رسوم التوصيل:</span>
                        <input
                          type="number"
                          min="0"
                          value={customDeliveryFee}
                          onChange={(e) => setCustomDeliveryFee(Number(e.target.value) || 0)}
                          style={{ width: '65px', padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.72rem' }}
                        />
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>ج.م</span>
                      </div>
                    )}

                    {/* Payment at Doorstep Selector */}
                    <div style={{ paddingTop: '4px', borderTop: '1px dashed #e2e8f0' }}>
                      <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '2px' }}>
                        طريقة الدفع عند الاستلام
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => setPaymentMethodAtDoor('cash')}
                          style={{
                            background: paymentMethodAtDoor === 'cash' ? '#170e5e' : '#f8fafc',
                            color: paymentMethodAtDoor === 'cash' ? '#ffffff' : '#334155',
                            border: '1px solid',
                            borderColor: paymentMethodAtDoor === 'cash' ? '#170e5e' : '#cbd5e1',
                            borderRadius: '4px',
                            padding: '3px 2px',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '3px',
                          }}
                        >
                          <DollarSignIcon size={11} />
                          كاش
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethodAtDoor('card_pos')}
                          style={{
                            background: paymentMethodAtDoor === 'card_pos' ? '#170e5e' : '#f8fafc',
                            color: paymentMethodAtDoor === 'card_pos' ? '#ffffff' : '#334155',
                            border: '1px solid',
                            borderColor: paymentMethodAtDoor === 'card_pos' ? '#170e5e' : '#cbd5e1',
                            borderRadius: '4px',
                            padding: '3px 2px',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '3px',
                          }}
                        >
                          <CreditCardIcon size={11} />
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
                            borderRadius: '4px',
                            padding: '3px 2px',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '3px',
                          }}
                        >
                          إنستاباي / محفظة
                        </button>
                      </div>

                      {paymentMethodAtDoor === 'cash' && (
                        <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.65rem', color: '#64748b', whiteSpace: 'nowrap' }}>العميل يدفع:</span>
                          <input
                            type="text"
                            value={customerPaidNote}
                            onChange={(e) => setCustomerPaidNote(e.target.value)}
                            placeholder="مثال: 200 ج..."
                            style={{
                              flex: 1,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.7rem',
                            }}
                          />
                          <div style={{ display: 'flex', gap: '2px' }}>
                            {['100', '200', '500'].map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setCustomerPaidNote(val)}
                                style={{
                                  background: '#f1f5f9',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '3px',
                                  padding: '1px 4px',
                                  fontSize: '0.65rem',
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
                      <input
                        type="text"
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        placeholder="توجيهات للطيار (مثال: رن الجرس مرتين، بجوار صيدلية العزبي)..."
                        style={{
                          width: '100%',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.72rem',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Order History & 1-Click Repeat */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ReceiptIcon size={13} color="#170e5e" />
                      <span>سجل طلبات العميل السابقة</span>
                    </div>
                    <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                      {recentOrders.length} طلبات مسجلة
                    </span>
                  </div>

                  {recentOrders.length === 0 ? (
                    <div
                      style={{
                        background: '#f8fafc',
                        padding: '24px 12px',
                        borderRadius: '8px',
                        border: '1px dashed #cbd5e1',
                        textAlign: 'center',
                      }}
                    >
                      <ClockIcon size={24} color="#94a3b8" style={{ marginBottom: '4px' }} />
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                        لا توجد طلبات سابقة مسجلة لهذا العميل
                      </div>
                      <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', marginBottom: '8px' }}>
                        يمكنك بدء أول طلب له وسيقوم النظام بحفظ عنوانه وتفضيلاته تلقائياً.
                      </p>
                      <Button
                        style={{ background: '#170e5e', color: '#ffffff', fontWeight: 700, fontSize: '0.72rem', padding: '3px 8px' }}
                        onClick={handleStartNewOrder}
                      >
                        <PlusIcon size={12} style={{ marginLeft: '4px' }} />
                        بدء أول طلب للعميل
                      </Button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '255px', overflowY: 'auto', paddingLeft: '2px' }}>
                      {recentOrders.map((order) => (
                        <div
                          key={order.id}
                          style={{
                            background: '#ffffff',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            padding: '6px 8px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#170e5e' }}>
                                {order.docNo}
                              </span>
                              <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                                {order.createdAt ? formatDate(order.createdAt) : ''}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>
                              {formatCurrency(order.total)}
                            </span>
                          </div>

                          {/* Items breakdown list */}
                          <div style={{ background: '#f8fafc', padding: '4px 6px', borderRadius: '4px', fontSize: '0.7rem', color: '#334155' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              {order.items.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>
                                    <strong>{item.qty}x</strong> {item.name}
                                    {item.modifiers && item.modifiers.length > 0 && (
                                      <span style={{ color: '#64748b', fontSize: '0.65rem', marginRight: '4px' }}>
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
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2px' }}>
                            <div style={{ fontSize: '0.65rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                              {order.customerAddress ? `العنوان: ${order.customerAddress}` : 'بدون عنوان محدد'}
                            </div>
                            <Button
                              size="sm"
                              style={{
                                background: '#170e5e',
                                color: '#ffffff',
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                padding: '2px 8px',
                                borderRadius: '4px',
                              }}
                              onClick={() => handleReorder(order)}
                            >
                              <RotateCcwIcon size={11} style={{ marginLeft: '3px' }} />
                              تكرار هذا الطلب
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : isSearchActive && !isForceNewCustomer && matchedCustomers.length > 0 ? (
            /* STATE 2: Candidate Customer Matches Cards Grid */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#f8fafc',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                    نتائج البحث المتطابقة
                  </span>
                  <span
                    style={{
                      background: '#170e5e',
                      color: '#ffffff',
                      fontSize: '0.6875rem',
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: '10px',
                    }}
                  >
                    {matchedCustomers.length} عميل
                  </span>
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setIsForceNewCustomer(true);
                    setNewPhone(phoneQuery || '');
                  }}
                  style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px' }}
                >
                  <PlusIcon size={12} style={{ marginLeft: '4px' }} />
                  تسجيل عميل جديد برقم ({phoneQuery})
                </Button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '8px',
                  maxHeight: '290px',
                  overflowY: 'auto',
                  padding: '2px',
                }}
              >
                {matchedCustomers.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      background: '#ffffff',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              background: '#f1f5f9',
                              color: '#170e5e',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <UserIcon size={14} />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                              {c.name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <PhoneIcon size={11} color="#64748b" />
                              <span>{c.phone || 'بدون رقم'}</span>
                            </div>
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '3px',
                            background: c.customerType === 'vip' ? '#fef3c7' : '#f1f5f9',
                            color: c.customerType === 'vip' ? '#92400e' : '#475569',
                          }}
                        >
                          {c.customerType === 'vip' ? 'VIP' : 'نقدي'}
                        </span>
                      </div>

                      {c.address && (
                        <div
                          style={{
                            fontSize: '0.7rem',
                            color: '#475569',
                            background: '#f8fafc',
                            padding: '4px 6px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            marginTop: '2px',
                          }}
                        >
                          <MapPinIcon size={11} color="#64748b" />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.address}
                          </span>
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      style={{
                        width: '100%',
                        background: '#170e5e',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        padding: '5px 8px',
                      }}
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setSelectedAddress('');
                      }}
                    >
                      <ArrowLeftIcon size={13} style={{ marginLeft: '4px' }} />
                      اختيار العميل وتجهيز الطلب
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* STATE 3: Customer Not Found / Force New Customer Form */
            <div
              style={{
                background: '#ffffff',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <PlusIcon size={16} color="#2563eb" />
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    تسجيل عميل جديد وتجهيز طلب التوصيل
                  </h3>
                </div>
                {isForceNewCustomer && matchedCustomers.length > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsForceNewCustomer(false)}
                    style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px' }}
                  >
                    العودة لنتائج البحث ({matchedCustomers.length})
                  </Button>
                )}
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
                style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '2px' }}>
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
                        padding: '5px 8px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.78rem',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '2px' }}>
                      رقم الهاتف
                    </label>
                    <input
                      type="text"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="رقم الهاتف..."
                      style={{
                        width: '100%',
                        padding: '5px 8px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.78rem',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#334155', margin: 0 }}>
                      عنوان التوصيل التفصيلي (المنطقة، الشارع، العقار، الدور، الشقة)
                    </label>
                    <div style={{ display: 'flex', gap: '3px' }}>
                      {(['home', 'work', 'other'] as const).map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setAddressTag(tag)}
                          style={{
                            background: addressTag === tag ? '#2563eb' : '#f1f5f9',
                            color: addressTag === tag ? '#ffffff' : '#475569',
                            border: 'none',
                            borderRadius: '3px',
                            padding: '1px 5px',
                            fontSize: '0.65rem',
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
                      padding: '5px 8px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.78rem',
                    }}
                  />
                </div>

                {/* Delivery Zone & Payment in New Customer Form */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#f8fafc', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '2px' }}>
                      منطقة التوصيل
                    </label>
                    <select
                      value={selectedZoneId}
                      onChange={(e) => handleZoneChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.72rem',
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
                    <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '2px' }}>
                      طريقة الدفع عند الاستلام
                    </label>
                    <select
                      value={paymentMethodAtDoor}
                      onChange={(e) => setPaymentMethodAtDoor(e.target.value as DoorstepPaymentMethod)}
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.72rem',
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
                  <input
                    type="text"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="ملاحظات أو علامات مميزة للعنوان (مثال: أمام مسجد الفتح، مدخل العمارة من الجانب)..."
                    style={{
                      width: '100%',
                      padding: '5px 8px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.75rem',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
                  <Button
                    type="submit"
                    disabled={createCustomerMutation.isPending}
                    size="sm"
                    style={{ background: '#170e5e', color: '#ffffff', fontWeight: 700, fontSize: '0.78rem' }}
                  >
                    <CheckCircleIcon size={14} style={{ marginLeft: '4px' }} />
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
