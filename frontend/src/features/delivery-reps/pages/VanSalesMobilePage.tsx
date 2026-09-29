import { useState, useMemo, useEffect } from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { getGlobalCurrencySymbol } from '@/lib/currencies';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vanSalesApi, VanActiveTripResponse, VanStockItem, VanLoadRequisitionRecord } from '../api/van-sales.api';
import { driverPortalApi } from '@/shared/api/delivery-reps.api';
import { Button } from '@/shared/ui/button';
import {
  TruckIcon,
  PackageIcon,
  MapPinIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ClockIcon,
  ReceiptIcon,
  RefreshCwIcon,
  CreditCardIcon,
} from '@/shared/components/icons/AppIcons';
import { systemConfirm, toast } from '@/shared/components/system-alert';
import { vanOfflineDb } from '../offline/van-sales-offline.db';
import { vanSyncEngine } from '../offline/van-sync.engine';
import { VanSalesLogin } from '../components/VanSalesLogin';
import { VanSalesReceiptModal } from '../components/VanSalesReceiptModal';
import { VanInventoryTab } from '../components/VanInventoryTab';
import { VanSaleTab, CartItem } from '../components/VanSaleTab';
import { VanSaleCheckoutModal } from '../components/VanSaleCheckoutModal';
import { VanCollectionTab } from '../components/VanCollectionTab'; // live-synced
import { VanSettleTab } from '../components/VanSettleTab';
import { VanItineraryTab } from '../components/VanItineraryTab';
import { VanFleetTab } from '../components/VanFleetTab';
import { VanTransferModal } from '../components/VanTransferModal';
import { DriverNewLoadRequisitionView } from '../components/DriverNewLoadRequisitionView';
import { VanSalesHistoryTab } from '../components/VanSalesHistoryTab';

export default function VanSalesMobilePage() {
  const queryClient = useQueryClient();

  const [session, setSession] = useState(() => driverPortalApi.getStoredSession());
  const [viewMode, setViewMode] = useState<'dashboard' | 'new-requisition'>('dashboard');
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Monitor connectivity, load pending outbox items, and listen to sync completion
  useEffect(() => {
    vanOfflineDb.getPendingCount().then(setPendingSyncCount);

    const cleanup = vanSyncEngine.startAutoSyncListener((online) => {
      setIsOnline(online);
      vanOfflineDb.getPendingCount().then(setPendingSyncCount);
    });

    const handleSyncComplete = (e: any) => {
      vanOfflineDb.getPendingCount().then(setPendingSyncCount);
      queryClient.invalidateQueries({ queryKey: ['van-sales-active-trip'] });
      queryClient.invalidateQueries({ queryKey: ['driver-itinerary'] });
      queryClient.invalidateQueries({ queryKey: ['driver-sales-history'] });
      const synced = e?.detail?.syncedCount || 0;
      if (synced > 0) {
        toast.success(`تمت مزامنة ${synced} عملية ميدانية مع الخادم بنجاح!`);
      }
    };

    window.addEventListener('van-offline-sync-completed', handleSyncComplete);

    return () => {
      cleanup();
      window.removeEventListener('van-offline-sync-completed', handleSyncComplete);
    };
  }, [queryClient]);

  const handleManualSync = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.warning('أنت غير متصل بالإنترنت حالياً للمزامنة');
      return;
    }
    setIsSyncing(true);
    try {
      const res = await vanSyncEngine.syncAll();
      await vanOfflineDb.getPendingCount().then(setPendingSyncCount);
      if (res.syncedCount > 0) {
        toast.success(`تمت مزامنة ${res.syncedCount} عملية بنجاح!`);
        refetch();
      } else if (res.failedCount > 0) {
        toast.error(`فشلت مزامنة ${res.failedCount} عملية: ${res.errors.join(' | ')}`);
      } else {
        toast.info('جميع العمليات متزامنة بالفعل مع الخادم');
      }
    } catch (err: any) {
      toast.error(err?.message || 'تعذرت المزامنة');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    const confirmed = await systemConfirm({
      title: 'تسجيل الخروج',
      message: 'هل تود بالتأكيد تسجيل الخروج من بوابة مبيعات الفان الميدانية؟',
      confirmText: 'تسجيل الخروج',
      cancelText: 'إلغاء',
      variant: 'danger',
    });
    if (confirmed) {
      driverPortalApi.logout();
      setSession(null);
      queryClient.clear();
      toast.info('تم تسجيل الخروج بنجاح');
    }
  };

  const { data, isLoading, refetch } = useQuery<VanActiveTripResponse>({
    queryKey: ['van-sales-active-trip'],
    queryFn: async () => {
      try {
        const live = await vanSalesApi.getActiveTrip();
        if (live && live.hasActiveTrip) {
          void vanOfflineDb.saveSnapshot(live, session);
        }
        return live;
      } catch (err: any) {
        if (err?.status === 401) {
          driverPortalApi.logout();
          setSession(null);
          throw err;
        }
        // Fallback to offline cached snapshot from IndexedDB
        const offlineData = await vanOfflineDb.getOfflineActiveTrip();
        if (offlineData) {
          return offlineData;
        }
        throw err;
      }
    },
    enabled: Boolean(session),
    networkMode: 'always',
    refetchInterval: isOnline ? 60000 : false,
    staleTime: 30000,
    retry: false,
  });

  // Query driver's recent requisitions
  const { data: myRequisitions = [] } = useQuery<VanLoadRequisitionRecord[]>({
    queryKey: ['driver-my-requisitions'],
    queryFn: () => vanSalesApi.listMyRequisitions(),
    enabled: Boolean(session),
    staleTime: 60000,
  });

  // Itinerary Query - Always enabled for driver to plan their day (on-demand updates, no CPU-heavy polling)
  const { data: itinerary = [], isLoading: isItineraryLoading, refetch: refetchItinerary } = useQuery({
    queryKey: ['driver-itinerary'],
    queryFn: async () => {
      try {
        const live = await vanSalesApi.getMyItinerary();
        if (Array.isArray(live) && live.length > 0) {
          void vanOfflineDb.saveItinerary(live);
        }
        return live;
      } catch (err: any) {
        const cached = await vanOfflineDb.getItinerary();
        if (cached && cached.length > 0) {
          return cached;
        }
        throw err;
      }
    },
    enabled: Boolean(session),
    networkMode: 'always',
    staleTime: 60000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fuel Logs Query - Always enabled to track vehicle history
  const { data: fuelLogs = [], refetch: refetchFuelLogs } = useQuery({
    queryKey: ['driver-fuel-logs'],
    queryFn: () => vanSalesApi.getDriverFuelLogs(),
    enabled: Boolean(session),
    staleTime: 120000,
    refetchOnWindowFocus: false,
  });

  // Maintenance Alerts Query - Critical for vehicle health & oil changes
  const { data: maintenanceAlerts = [] } = useQuery({
    queryKey: ['driver-maintenance-alerts'],
    queryFn: () => vanSalesApi.getDriverMaintenanceAlerts(),
    enabled: Boolean(session),
    staleTime: 120000,
    refetchOnWindowFocus: false,
  });

  // Peer Inter-Van Transfers Query
  const { data: peerTransfers = [], refetch: refetchTransfers } = useQuery({
    queryKey: ['driver-transfers'],
    queryFn: () => vanSalesApi.getDriverTransfers(),
    enabled: Boolean(session),
    refetchInterval: 45000,
    staleTime: 20000,
  });

  // Peer Delivery Reps for Street Transfers
  const { data: peerReps = [] } = useQuery({
    queryKey: ['driver-peer-reps'],
    queryFn: () => vanSalesApi.getPeerReps(),
    enabled: Boolean(session),
    staleTime: 60000,
  });

  const [isGlobalRefreshing, setIsGlobalRefreshing] = useState(false);

  const handleGlobalRefresh = async () => {
    if (isGlobalRefreshing) return;
    setIsGlobalRefreshing(true);
    try {
      await Promise.allSettled([
        refetch(),
        refetchItinerary(),
        refetchFuelLogs(),
        refetchTransfers(),
        queryClient.invalidateQueries({ queryKey: ['van-sales-active-trip'] }),
        queryClient.invalidateQueries({ queryKey: ['driver-itinerary'] }),
        queryClient.invalidateQueries({ queryKey: ['driver-sales-history'] }),
        queryClient.invalidateQueries({ queryKey: ['driver-maintenance-alerts'] }),
      ]);
      toast.success('تم تحديث خط السير وكافة البيانات بنجاح');
    } catch {
      toast.error('تعذر استكمال التحديث، يرجى التحقق من الاتصال');
    } finally {
      setIsGlobalRefreshing(false);
    }
  };

  const [activeTab, setActiveTab] = useState<'cockpit' | 'itinerary' | 'inventory' | 'sale' | 'sales-history' | 'collection' | 'fleet' | 'settle' | 'requisitions'>('cockpit');
  const [stockSearch, setStockSearch] = useState('');
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [saleNotes, setSaleNotes] = useState('');
  const [deliveryProofPhoto, setDeliveryProofPhoto] = useState('');
  const [cartonsCount, setCartonsCount] = useState('');

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'card' | 'split'>('cash');
  const [cart, setCart] = useState<CartItem[]>([]);

  const [colCustomerId, setColCustomerId] = useState<number | ''>('');
  const [colAmount, setColAmount] = useState<string>('');

  const [countedCash, setCountedCash] = useState<string>('');
  const [unloadRemaining, setUnloadRemaining] = useState<boolean>(true);

  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [lastSaleReceipt, setLastSaleReceipt] = useState<any | null>(null);
  const [isTargetMetricsExpanded, setIsTargetMetricsExpanded] = useState(false);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const filteredInventory = useMemo(() => {
    if (!data?.inventory) return [];
    if (!stockSearch.trim()) return data.inventory;
    const q = stockSearch.toLowerCase();
    return data.inventory.filter(
      (item) => item.productName.toLowerCase().includes(q) || item.barcode.toLowerCase().includes(q),
    );
  }, [data?.inventory, stockSearch]);

  const addToCart = (item: VanStockItem) => {
    setCart((prev) => {
      const exists = prev.find((c) => c.productId === item.productId);
      if (exists) {
        if (exists.qty >= item.qty) {
          showAlert('error', `أقصى كمية متوفرة بالسيارة هي ${item.qty}`);
          return prev;
        }
        return prev.map((c) => (c.productId === item.productId ? { ...c, qty: c.qty + 1 } : c));
      }
      return [
        ...prev,
        {
          productId: item.productId,
          name: item.productName,
          qty: 1,
          unitPrice: item.retailPrice,
          maxQty: item.qty,
        },
      ];
    });
  };

  const updateCartQty = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.productId === productId) {
            const next = c.qty + delta;
            if (next > c.maxQty) {
              showAlert('error', `أقصى كمية متوفرة هي ${c.maxQty}`);
              return c;
            }
            return { ...c, qty: next };
          }
          return c;
        })
        .filter((c) => c.qty > 0),
    );
  };

  const allAvailableCustomers = useMemo(() => {
    const map = new Map<number, any>();
    if (data?.customers && Array.isArray(data.customers)) {
      for (const c of data.customers) {
        map.set(c.id, c);
      }
    }
    if (itinerary && Array.isArray(itinerary)) {
      for (const it of itinerary) {
        if (!map.has(it.customerId)) {
          map.set(it.customerId, {
            id: it.customerId,
            name: it.customerName,
            phone: it.customerPhone,
            address: it.customerAddress,
            balance: it.balance,
            creditLimit: it.creditLimit,
            customerCode: it.customerCode,
            route: it.route,
            locationUrl: it.locationUrl,
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [data?.customers, itinerary]);

  const cartTotal = useMemo(() => cart.reduce((sum, c) => sum + c.qty * c.unitPrice, 0), [cart]);

  const executeSaleMutation = useMutation({
    networkMode: 'always',
    mutationFn: async (payload: any) => {
      const isActuallyOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      if (isActuallyOffline) {
        const offRes = await vanOfflineDb.recordOfflineSale({
          tripId: payload.tripId,
          customerId: payload.customerId,
          customerName: payload.customerName,
          items: payload.items,
          paymentMethod: payload.paymentMethod,
          paidAmount: payload.paidAmount,
          notes: payload.notes,
          gpsLat: payload.deliveryGpsLat,
          gpsLng: payload.deliveryGpsLng,
          deliveryProofPhoto: payload.deliveryProofPhoto,
          cartonsCount: payload.packagingBreakdown?.cartonsCount,
        });
        return {
          ok: true,
          saleId: -Date.now(),
          docNo: offRes.docNo,
          total: offRes.total,
          paymentMethod: payload.paymentMethod,
          customerName: payload.customerName || 'عميل نقدي',
          itemsCount: payload.items.length,
          cashPaid: payload.paymentMethod === 'cash' ? offRes.total : Number(payload.paidAmount || 0),
          creditOwed: payload.paymentMethod === 'credit' ? offRes.total : 0,
          isOffline: true,
        };
      }

      try {
        return await vanSalesApi.executeSale(payload);
      } catch (err: any) {
        const isNetworkErr =
          !err?.status ||
          err?.status === 0 ||
          err?.message?.toLowerCase().includes('failed to fetch') ||
          err?.message?.includes('NetworkError');

        if (isNetworkErr) {
          const offRes = await vanOfflineDb.recordOfflineSale({
            tripId: payload.tripId,
            customerId: payload.customerId,
            customerName: payload.customerName,
            items: payload.items,
            paymentMethod: payload.paymentMethod,
            paidAmount: payload.paidAmount,
            notes: payload.notes,
            gpsLat: payload.deliveryGpsLat,
            gpsLng: payload.deliveryGpsLng,
            deliveryProofPhoto: payload.deliveryProofPhoto,
            cartonsCount: payload.packagingBreakdown?.cartonsCount,
          });
          return {
            ok: true,
            saleId: -Date.now(),
            docNo: offRes.docNo,
            total: offRes.total,
            paymentMethod: payload.paymentMethod,
            customerName: payload.customerName || 'عميل نقدي',
            itemsCount: payload.items.length,
            cashPaid: payload.paymentMethod === 'cash' ? offRes.total : Number(payload.paidAmount || 0),
            creditOwed: payload.paymentMethod === 'credit' ? offRes.total : 0,
            isOffline: true,
          };
        }
        throw err;
      }
    },
    onSuccess: (res: any) => {
      vanOfflineDb.getPendingCount().then(setPendingSyncCount);
      const isOff = res?.isOffline;
      if (isOff) {
        toast.success(`تم حفظ الفاتورة أوفلاين #${res.docNo} بمبلغ ${res.total} ${getGlobalCurrencySymbol()} وسيتم ترحيلها آلياً عند عودة الشبكة.`);
      } else {
        showAlert('success', `تم إصدار الفاتورة #${res.docNo} بمبلغ ${res.total} ${getGlobalCurrencySymbol()} بنجاح!`);
      }
      const matchedCustomer = allAvailableCustomers.find((c) => String(c.id) === String(selectedCustomerId));
      setLastSaleReceipt({
        ...res,
        paidAmount: res.cashPaid,
        remainingCredit: res.creditOwed,
        packagingBreakdown: {
          cartonsCount: Number(cartonsCount) || 0,
          piecesCount: cart.reduce((s, it) => s + it.qty, 0),
          itemsCount: cart.length,
        },
        deliveryProofPhoto: deliveryProofPhoto || undefined,
        customerName: res.customerName || matchedCustomer?.name || newCustomerName || 'عميل نقدي',
        customerPhone: matchedCustomer?.phone || '',
        customerCode: matchedCustomer?.customerCode || '',
        customerAddress: matchedCustomer?.address || '',
        items: cart.map((c) => ({
          productId: c.productId,
          name: c.name,
          qty: c.qty,
          unitPrice: c.unitPrice,
          lineTotal: c.qty * c.unitPrice,
        })),
        repName: data?.trip?.repName || (session?.rep as any)?.name || 'مندوب التوزيع',
        vehiclePlate: data?.assignedVehicle?.plateNumber || data?.trip?.vehiclePlate || '',
        warehouseName: data?.trip?.sourceWarehouseName || '',
        date: new Date().toISOString(),
      });
      setCheckoutModalOpen(false);
      setSaleNotes('');
      setDeliveryProofPhoto('');
      setCartonsCount('');
      setCart([]);
      setSelectedCustomerId('');
      setNewCustomerName('');
      queryClient.invalidateQueries({ queryKey: ['van-sales-active-trip'] });
      queryClient.invalidateQueries({ queryKey: ['driver-itinerary'] });
      queryClient.invalidateQueries({ queryKey: ['driver-sales-history'] });
    },
    onError: (err: any) => showAlert('error', err?.message || 'فشل إصدار الفاتورة'),
  });

  const recordCollectionMutation = useMutation({
    networkMode: 'always',
    mutationFn: async (payload: any) => {
      const isActuallyOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      if (isActuallyOffline) {
        const cust = allAvailableCustomers.find((c) => Number(c.id) === Number(payload.customerId));
        const offRes = await vanOfflineDb.recordOfflineCollection({
          tripId: payload.tripId,
          customerId: payload.customerId,
          customerName: cust?.name || 'العميل',
          amount: payload.amount,
          note: payload.notes,
          gpsLat: payload.gpsLat,
          gpsLng: payload.gpsLng,
        });
        return {
          ok: true,
          receiptNo: offRes.docNo,
          amount: payload.amount,
          customerName: cust?.name || 'العميل',
          newBalance: Math.max(0, (cust?.balance || 0) - payload.amount),
          isOffline: true,
        };
      }

      try {
        return await vanSalesApi.recordCollection(payload);
      } catch (err: any) {
        const isNetworkErr =
          !err?.status ||
          err?.status === 0 ||
          err?.message?.toLowerCase().includes('failed to fetch');
        if (isNetworkErr) {
          const cust = allAvailableCustomers.find((c) => Number(c.id) === Number(payload.customerId));
          const offRes = await vanOfflineDb.recordOfflineCollection({
            tripId: payload.tripId,
            customerId: payload.customerId,
            customerName: cust?.name || 'العميل',
            amount: payload.amount,
            note: payload.notes,
            gpsLat: payload.gpsLat,
            gpsLng: payload.gpsLng,
          });
          return {
            ok: true,
            receiptNo: offRes.docNo,
            amount: payload.amount,
            customerName: cust?.name || 'العميل',
            newBalance: Math.max(0, (cust?.balance || 0) - payload.amount),
            isOffline: true,
          };
        }
        throw err;
      }
    },
    onSuccess: (res: any) => {
      vanOfflineDb.getPendingCount().then(setPendingSyncCount);
      if (res?.isOffline) {
        toast.success(`تم حفظ التحصيل أوفلاين #${res.receiptNo} بمبلغ ${res.amount} ${getGlobalCurrencySymbol()} وسيتم ترحيله آلياً.`);
      } else {
        showAlert('success', `تم تسجيل تحصيل ${res.amount} ${getGlobalCurrencySymbol()} من "${res.customerName}"، الرصيد المتبقي: ${res.newBalance} ${getGlobalCurrencySymbol()}`);
      }
      setColAmount('');
      setColCustomerId('');
      queryClient.invalidateQueries({ queryKey: ['van-sales-active-trip'] });
    },
    onError: (err: any) => showAlert('error', err?.message || 'فشل تسجيل التحصيل'),
  });

  const settleTripMutation = useMutation({
    mutationFn: vanSalesApi.settleTrip,
    onSuccess: (res) => {
      showAlert('success', `تم إغلاق وتصفية رحلة التوزيع بنجاح! عجز/زيادة الكاش: ${res.variance} ${getGlobalCurrencySymbol()}`);
      setCountedCash('');
      setActiveTab('cockpit');
      queryClient.invalidateQueries({ queryKey: ['van-sales-active-trip'] });
    },
    onError: (err: any) => showAlert('error', err?.message || 'فشل تصفية الرحلة'),
  });

  const startTripMutation = useMutation({
    mutationFn: (notes?: string | void) => vanSalesApi.openTrip({ notes: typeof notes === 'string' ? notes : undefined }),
    onSuccess: (res) => {
      showAlert('success', `تم بدء رحلة التوزيع بنجاح! رقم الرحلة #${res.tripId}`);
      setActiveTab('sale');
      queryClient.invalidateQueries({ queryKey: ['van-sales-active-trip'] });
      queryClient.invalidateQueries({ queryKey: ['driver-itinerary'] });
      queryClient.invalidateQueries({ queryKey: ['driver-fuel-logs'] });
    },
    onError: (err: any) => showAlert('error', err?.message || 'فشل بدء رحلة التوزيع'),
  });

  const totalInventoryValue = useMemo(() => {
    if (!data?.inventory) return 0;
    return data.inventory.reduce((sum, item) => sum + item.qty * item.retailPrice, 0);
  }, [data?.inventory]);


  const vehicle = useMemo(() => {
    if (data?.trip?.vehiclePlate) {
      return {
        id: data.trip.vehicleId,
        plate: data.trip.vehiclePlate,
        model: data.trip.vehicleModel,
        startOdometer: data.trip.startOdometer,
        endOdometer: data.trip.endOdometer,
        fuelType: data.assignedVehicle?.fuelType || 'petrol_92',
        licenseExpiresAt: data.assignedVehicle?.licenseExpiresAt,
        status: data.assignedVehicle?.status || 'assigned',
      };
    }
    if (data?.assignedVehicle) {
      return {
        id: data.assignedVehicle.id,
        plate: data.assignedVehicle.plateNumber,
        model: data.assignedVehicle.modelName,
        startOdometer: data.assignedVehicle.currentOdometer,
        endOdometer: undefined,
        fuelType: data.assignedVehicle.fuelType,
        licenseExpiresAt: data.assignedVehicle.licenseExpiresAt,
        status: data.assignedVehicle.status,
      };
    }
    if (session?.rep?.vehiclePlate) {
      return {
        id: undefined,
        plate: session.rep.vehiclePlate,
        model: 'فان توزيع ميداني',
        startOdometer: 0,
        endOdometer: undefined,
        fuelType: 'petrol_92',
        licenseExpiresAt: undefined,
        status: 'assigned',
      };
    }
    return undefined;
  }, [data?.trip, data?.assignedVehicle, session?.rep]);

  const currentTab = useMemo(() => {
    if (data?.hasActiveTrip && activeTab === 'cockpit') return 'sale';
    return activeTab;
  }, [data?.hasActiveTrip, activeTab]);

  if (!session) {
    return <VanSalesLogin onLoginSuccess={(sess) => { setSession(sess); queryClient.invalidateQueries({ queryKey: ['van-sales-active-trip'] }); }} />;
  }

  if (viewMode === 'new-requisition') {
    return (
      <DriverNewLoadRequisitionView
        onBack={() => setViewMode('dashboard')}
        onRequisitionSubmitted={(docNo: string) => {
          showAlert('success', `تم إرسال طلب إذن التحميل #${docNo} للمشرف بنجاح!`);
          setViewMode('dashboard');
          refetch();
          queryClient.invalidateQueries({ queryKey: ['driver-my-requisitions'] });
        }}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', paddingBottom: '40px', fontFamily: 'inherit', overflowX: 'hidden' }} dir="rtl">
      {/* Responsive Styles for Mobile vs Desktop */}
      <style>{`
        @media (max-width: 640px) {
          .van-erp-link { display: none !important; }
        }
        @media (max-width: 767px) {
          .van-top-nav-tabs { display: none !important; }
          .van-bottom-nav { display: flex !important; }
        }
        @media (min-width: 768px) {
          .van-top-nav-tabs { display: flex !important; }
          .van-bottom-nav { display: none !important; }
        }
        @keyframes vanSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Top Header */}
      <header
        style={{
          backgroundColor: '#170e5e',
          color: '#ffffff',
          paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
          paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
          paddingBottom: '12px',
          paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TruckIcon size={22} color="#ffffff" />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#ffffff', lineHeight: 1.2 }}>
              مبيعات وتوزيع الفان
            </h1>
            <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', display: 'block', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {session.rep?.fullName || session.rep?.name || 'المندوب'} • {vehicle?.plate ? `سيارة [${vehicle.plate}]` : 'الميدان'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <a
            href="/inventory/van-sales"
            title="الانتقال إلى لوحة إدارة المشرف والأسطول المركزية"
            className="van-erp-link"
            style={{
              backgroundColor: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: '#ffffff',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '11px',
              textDecoration: 'none',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
            }}
          >
            لوحة الإدارة (ERP)
          </a>
          <button
            type="button"
            onClick={handleGlobalRefresh}
            disabled={isGlobalRefreshing}
            title="تحديث البيانات"
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '8px',
              height: '32px',
              padding: '0 10px',
              fontSize: '11px',
              cursor: isGlobalRefreshing ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              opacity: isGlobalRefreshing ? 0.7 : 1,
            }}
          >
            <RefreshCwIcon
              size={13}
              color="#ffffff"
              style={{ animation: isGlobalRefreshing ? 'vanSpin 0.8s linear infinite' : 'none' }}
            />
            <span>{isGlobalRefreshing ? 'جاري...' : 'تحديث'}</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            title="تسجيل الخروج"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              borderRadius: '8px',
              height: '32px',
              padding: '0 10px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            خروج
          </button>
        </div>
      </header>

      {/* Offline & Sync Status Banner */}
      {(!isOnline || pendingSyncCount > 0) && (
        <div
          style={{
            backgroundColor: !isOnline ? '#fffbeb' : '#eff6ff',
            borderBottom: `1px solid ${!isOnline ? '#fde68a' : '#bfdbfe'}`,
            padding: '8px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            fontWeight: 700,
            color: !isOnline ? '#b45309' : '#1e40af',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: !isOnline ? '#f59e0b' : '#3b82f6',
                display: 'inline-block',
              }}
            />
            <span>
              {!isOnline
                ? 'وضع عدم الاتصال (أوفلاين) • فواتيرك تُحفظ محلياً وتُطبع فوراً'
                : `تم الاتصال بالإنترنت • يوجد ${pendingSyncCount} عمليات جاهزة للمزامنة`}
            </span>
            {pendingSyncCount > 0 && (
              <span
                style={{
                  backgroundColor: !isOnline ? '#fef3c7' : '#dbeafe',
                  color: !isOnline ? '#92400e' : '#1e3a8a',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 800,
                }}
              >
                {pendingSyncCount} معلقة
              </span>
            )}
          </div>
          {isOnline && pendingSyncCount > 0 && (
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              style={{
                backgroundColor: '#170e5e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <RefreshCwIcon size={12} color="#ffffff" style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
              {isSyncing ? 'جاري المزامنة...' : 'مزامنة الآن'}
            </button>
          )}
        </div>
      )}

      {/* Alert Banner */}
      {alert && (
        <div
          style={{
            backgroundColor: alert.type === 'success' ? '#10b981' : '#ef4444',
            color: '#ffffff',
            padding: '10px 16px',
            fontSize: '12.5px',
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          {alert.message}
        </div>
      )}

      {/* Main Container */}
      <main style={{ padding: '14px 16px 88px', maxWidth: '1280px', width: 'min(100%, 1280px)', margin: '0 auto' }}>
        {/* Monthly Multi-Dimensional Target Progress Card */}
        {data?.targetMetrics && (
          (data.targetMetrics.targetAmount > 0) ||
          ((data.targetMetrics.collectionTarget ?? 0) > 0) ||
          ((data.targetMetrics.visitsTarget ?? 0) > 0)
        ) && (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              padding: '14px 16px',
              border: '1px solid #e2e8f0',
              marginBottom: '14px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isTargetMetricsExpanded ? '12px' : '0', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#170e5e' }}>
                  مستهدفات وإنجازات الشهر ({data.targetMetrics.periodMonth})
                </span>
                <button
                  type="button"
                  onClick={() => setIsTargetMetricsExpanded((prev) => !prev)}
                  style={{
                    border: 'none',
                    background: '#eef2ff',
                    color: '#170e5e',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isTargetMetricsExpanded ? 'إخفاء التفاصيل ▲' : 'عرض التفاصيل ▼'}
                </button>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#475569',
                  backgroundColor: '#f1f5f9',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                }}
              >
                متبقي {data.targetMetrics.remainingWorkingDays} يوم عمل (مستبعداً الجمعات)
              </span>
            </div>

            {/* Compact summary when collapsed */}
            {!isTargetMetricsExpanded && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-around',
                  paddingTop: '10px',
                  marginTop: '10px',
                  borderTop: '1px dashed #e2e8f0',
                  fontSize: '11.5px',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                {data.targetMetrics.targetAmount > 0 && (
                  <div>
                    <span style={{ color: '#64748b' }}>المبيعات: </span>
                    <strong style={{ color: data.targetMetrics.isTargetAchieved ? '#16a34a' : '#1d4ed8' }}>
                      {data.targetMetrics.achievementRate}% ({data.targetMetrics.actualSalesMTD.toFixed(0)}/{data.targetMetrics.targetAmount.toFixed(0)})
                    </strong>
                  </div>
                )}
                {(data.targetMetrics.collectionTarget ?? 0) > 0 && (
                  <div>
                    <span style={{ color: '#64748b' }}>التحصيل: </span>
                    <strong style={{ color: data.targetMetrics.isCollectionAchieved ? '#16a34a' : '#0284c7' }}>
                      {data.targetMetrics.collectionAchievementRate ?? 0}% ({(data.targetMetrics.actualCollectionsMTD ?? 0).toFixed(0)}/{(data.targetMetrics.collectionTarget ?? 0).toFixed(0)})
                    </strong>
                  </div>
                )}
                {(data.targetMetrics.visitsTarget ?? 0) > 0 && (
                  <div>
                    <span style={{ color: '#64748b' }}>الزيارات: </span>
                    <strong style={{ color: data.targetMetrics.isVisitsAchieved ? '#16a34a' : '#7c3aed' }}>
                      {data.targetMetrics.visitsAchievementRate ?? 0}% ({data.targetMetrics.actualVisitsMTD ?? 0}/{data.targetMetrics.visitsTarget ?? 0})
                    </strong>
                  </div>
                )}
              </div>
            )}

            {/* Target Dimensions Grid */}
            {isTargetMetricsExpanded && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '12px',
                }}
              >
              {/* 1. Sales Target */}
              {data.targetMetrics.targetAmount > 0 && (
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#1e293b' }}>
                      المبيعات: {data.targetMetrics.targetAmount.toFixed(0)} {getGlobalCurrencySymbol()}
                    </span>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 800,
                        color: data.targetMetrics.isTargetAchieved ? '#15803d' : '#1d4ed8',
                        backgroundColor: data.targetMetrics.isTargetAchieved ? '#dcfce7' : '#eff6ff',
                        padding: '1px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      {data.targetMetrics.isTargetAchieved ? 'تم الإنجاز' : `${data.targetMetrics.achievementRate}%`}
                    </span>
                  </div>

                  <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                    <div
                      style={{
                        width: `${Math.min(100, data.targetMetrics.achievementRate)}%`,
                        height: '100%',
                        backgroundColor: data.targetMetrics.isTargetAchieved ? '#16a34a' : '#170e5e',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>

                  <div style={{ fontSize: '10.5px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>المحقق بالشهر: <strong style={{ color: '#0f172a' }}>{data.targetMetrics.actualSalesMTD.toFixed(0)}</strong></span>
                      <span>المتبقي: <strong style={{ color: '#dc2626' }}>{data.targetMetrics.remainingTarget.toFixed(0)}</strong></span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', paddingTop: '3px', marginTop: '2px' }}>
                      <span>بيع رحلة اليوم: <strong style={{ color: '#16a34a' }}>{(data.targetMetrics.todaySales ?? 0).toFixed(0)}</strong></span>
                      <span>المطلوب يومياً: <strong style={{ color: '#d97706' }}>{data.targetMetrics.requiredDailyTarget.toFixed(0)}/يوم</strong></span>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Collection Target */}
              {(data.targetMetrics.collectionTarget ?? 0) > 0 && (
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#1e293b' }}>
                      التحصيل: {(data.targetMetrics.collectionTarget ?? 0).toFixed(0)} {getGlobalCurrencySymbol()}
                    </span>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 800,
                        color: data.targetMetrics.isCollectionAchieved ? '#15803d' : '#0369a1',
                        backgroundColor: data.targetMetrics.isCollectionAchieved ? '#dcfce7' : '#e0f2fe',
                        padding: '1px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      {data.targetMetrics.isCollectionAchieved ? 'تم الإنجاز' : `${data.targetMetrics.collectionAchievementRate ?? 0}%`}
                    </span>
                  </div>

                  <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                    <div
                      style={{
                        width: `${Math.min(100, data.targetMetrics.collectionAchievementRate ?? 0)}%`,
                        height: '100%',
                        backgroundColor: data.targetMetrics.isCollectionAchieved ? '#16a34a' : '#0284c7',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>

                  <div style={{ fontSize: '10.5px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>المحصل بالشهر: <strong style={{ color: '#0f172a' }}>{(data.targetMetrics.actualCollectionsMTD ?? 0).toFixed(0)}</strong></span>
                      <span>المتبقي: <strong style={{ color: '#dc2626' }}>{(data.targetMetrics.remainingCollection ?? 0).toFixed(0)}</strong></span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', paddingTop: '3px', marginTop: '2px' }}>
                      <span>كاش رحلة اليوم: <strong style={{ color: '#0284c7' }}>{(data.targetMetrics.todayCollections ?? 0).toFixed(0)}</strong></span>
                      <span>المطلوب يومياً: <strong style={{ color: '#d97706' }}>{(data.targetMetrics.requiredDailyCollection ?? 0).toFixed(0)}/يوم</strong></span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Field Visits Target */}
              {(data.targetMetrics.visitsTarget ?? 0) > 0 && (
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#1e293b' }}>
                      الزيارات: {data.targetMetrics.visitsTarget} زيارة
                    </span>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 800,
                        color: data.targetMetrics.isVisitsAchieved ? '#15803d' : '#7c3aed',
                        backgroundColor: data.targetMetrics.isVisitsAchieved ? '#dcfce7' : '#f5f3ff',
                        padding: '1px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      {data.targetMetrics.isVisitsAchieved ? 'تم الإنجاز' : `${data.targetMetrics.visitsAchievementRate ?? 0}%`}
                    </span>
                  </div>

                  <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                    <div
                      style={{
                        width: `${Math.min(100, data.targetMetrics.visitsAchievementRate ?? 0)}%`,
                        height: '100%',
                        backgroundColor: data.targetMetrics.isVisitsAchieved ? '#16a34a' : '#7c3aed',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>

                  <div style={{ fontSize: '10.5px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>منجز بالشهر: <strong style={{ color: '#0f172a' }}>{data.targetMetrics.actualVisitsMTD ?? 0}</strong></span>
                      <span>المتبقي: <strong style={{ color: '#dc2626' }}>{data.targetMetrics.remainingVisits ?? 0}</strong></span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', paddingTop: '3px', marginTop: '2px' }}>
                      <span>زيارات اليوم: <strong style={{ color: '#7c3aed' }}>{data.targetMetrics.todayVisits ?? 0}</strong></span>
                      <span>المطلوب يومياً: <strong style={{ color: '#d97706' }}>{data.targetMetrics.requiredDailyVisits ?? 0} زيارة/يوم</strong></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8', fontWeight: 700 }}>جاري تحميل بيانات رحلة الفان...</div>
        ) : (
          <>
            {/* Live Financial & KPI Strip - Active Trip Mode */}
            {data?.hasActiveTrip && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '4px',
                  marginBottom: '8px',
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  padding: '6px 8px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  textAlign: 'center',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ flex: '1 1 0', minWidth: 0, borderInlineEnd: '1px solid #e2e8f0', padding: '2px 2px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', display: 'block', whiteSpace: 'nowrap' }}>مبيعات</span>
                  <span style={{ fontSize: '12px', fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap' }}>
                    {(data.trip?.salesAmount ?? 0).toFixed(0)} <CurrencySymbol />
                  </span>
                </div>
                <div style={{ flex: '1 1 0', minWidth: 0, borderInlineEnd: '1px solid #e2e8f0', padding: '2px 2px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#059669', display: 'block', whiteSpace: 'nowrap' }}>كاش</span>
                  <span style={{ fontSize: '12px', fontWeight: 900, color: '#047857', whiteSpace: 'nowrap' }}>
                    {(data.trip?.cashCollected ?? 0).toFixed(0)} <CurrencySymbol />
                  </span>
                </div>
                <div style={{ flex: '1 1 0', minWidth: 0, borderInlineEnd: '1px solid #e2e8f0', padding: '2px 2px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#d97706', display: 'block', whiteSpace: 'nowrap' }}>آجل</span>
                  <span style={{ fontSize: '12px', fontWeight: 900, color: '#b45309', whiteSpace: 'nowrap' }}>
                    {(data.trip?.creditSales ?? 0).toFixed(0)} <CurrencySymbol />
                  </span>
                </div>
                <div style={{ flex: '1 1 0', minWidth: 0, padding: '2px 2px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#170e5e', display: 'block', whiteSpace: 'nowrap' }}>بضاعة</span>
                  <span style={{ fontSize: '12px', fontWeight: 900, color: '#1e1b4b', whiteSpace: 'nowrap' }}>
                    {data.inventory.length} صنف
                  </span>
                </div>
              </div>
            )}

            {/* Navigation Tabs Bar - Visible only on Desktop/Tablet, hidden on Mobile where Bottom Navigation is used */}
            <div className="van-top-nav-tabs" style={{ display: 'flex', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '10px', marginBottom: '14px', fontSize: '11.5px', fontWeight: 600, overflowX: 'auto', gap: '3px' }}>
              {data?.hasActiveTrip ? (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab('itinerary')}
                    style={{
                      flex: 1,
                      minWidth: '70px',
                      padding: '8px 4px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: currentTab === 'itinerary' ? '#170e5e' : 'transparent',
                      color: currentTab === 'itinerary' ? '#ffffff' : '#475569',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    خط السير {itinerary.length > 0 && `(${itinerary.filter((i) => i.visitStatus !== 'pending').length}/${itinerary.length})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('inventory')}
                    style={{
                      flex: 1,
                      minWidth: '70px',
                      padding: '8px 4px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: currentTab === 'inventory' ? '#170e5e' : 'transparent',
                      color: currentTab === 'inventory' ? '#ffffff' : '#475569',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    بضاعة السيارة ({data.inventory.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('sale')}
                    style={{
                      flex: 1,
                      minWidth: '70px',
                      padding: '8px 4px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: currentTab === 'sale' ? '#170e5e' : 'transparent',
                      color: currentTab === 'sale' ? '#ffffff' : '#475569',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    فاتورة بيع {cart.length > 0 && `(${cart.length})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('sales-history')}
                    style={{
                      flex: 1,
                      minWidth: '70px',
                      padding: '8px 4px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: currentTab === 'sales-history' ? '#170e5e' : 'transparent',
                      color: currentTab === 'sales-history' ? '#ffffff' : '#475569',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    سجل الفواتير
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('collection')}
                    style={{
                      flex: 1,
                      minWidth: '70px',
                      padding: '8px 4px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: currentTab === 'collection' ? '#170e5e' : 'transparent',
                      color: currentTab === 'collection' ? '#ffffff' : '#475569',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    تحصيل / مرتجع
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('fleet')}
                    style={{
                      flex: 1,
                      minWidth: '70px',
                      padding: '8px 4px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: currentTab === 'fleet' ? '#170e5e' : 'transparent',
                      color: currentTab === 'fleet' ? '#ffffff' : '#475569',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      position: 'relative',
                    }}
                  >
                    السيارة والوقود
                    {maintenanceAlerts.some((a) => a.severity === 'critical') && (
                      <span
                        style={{
                          display: 'inline-block',
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: '#ef4444',
                          marginRight: '4px',
                        }}
                      />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('settle')}
                    style={{
                      flex: 1,
                      minWidth: '70px',
                      padding: '8px 4px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: currentTab === 'settle' ? '#170e5e' : 'transparent',
                      color: currentTab === 'settle' ? '#ffffff' : '#475569',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    تصفية اليومية
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab('cockpit')}
                    style={{
                      flex: 1,
                      minWidth: '70px',
                      padding: '8px 4px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: currentTab === 'cockpit' ? '#170e5e' : 'transparent',
                      color: currentTab === 'cockpit' ? '#ffffff' : '#475569',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    مركز القيادة
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('itinerary')}
                    style={{
                      flex: 1,
                      minWidth: '70px',
                      padding: '8px 4px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: currentTab === 'itinerary' ? '#170e5e' : 'transparent',
                      color: currentTab === 'itinerary' ? '#ffffff' : '#475569',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    خط السير {itinerary.length > 0 && `(${itinerary.length})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('inventory')}
                    style={{
                      flex: 1,
                      minWidth: '70px',
                      padding: '8px 4px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: currentTab === 'inventory' ? '#170e5e' : 'transparent',
                      color: currentTab === 'inventory' ? '#ffffff' : '#475569',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    بضاعة السيارة {data?.inventory?.length ? `(${data.inventory.length})` : '(0)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('fleet')}
                    style={{
                      flex: 1,
                      minWidth: '70px',
                      padding: '8px 4px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: currentTab === 'fleet' ? '#170e5e' : 'transparent',
                      color: currentTab === 'fleet' ? '#ffffff' : '#475569',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      position: 'relative',
                    }}
                  >
                    السيارة والوقود
                    {maintenanceAlerts.length > 0 && (
                      <span
                        style={{
                          display: 'inline-block',
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: maintenanceAlerts.some((a) => a.severity === 'critical') ? '#ef4444' : '#d97706',
                          marginRight: '4px',
                        }}
                      />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('requisitions')}
                    style={{
                      flex: 1,
                      minWidth: '70px',
                      padding: '8px 4px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: currentTab === 'requisitions' ? '#170e5e' : 'transparent',
                      color: currentTab === 'requisitions' ? '#ffffff' : '#475569',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    أذونات الشحن {myRequisitions.length > 0 && `(${myRequisitions.length})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('sale')}
                    style={{
                      flex: 1,
                      minWidth: '70px',
                      padding: '8px 4px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: currentTab === 'sale' ? '#170e5e' : 'transparent',
                      color: currentTab === 'sale' ? '#ffffff' : '#475569',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    فاتورة بيع
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('sales-history')}
                    style={{
                      flex: 1,
                      minWidth: '70px',
                      padding: '8px 4px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: currentTab === 'sales-history' ? '#170e5e' : 'transparent',
                      color: currentTab === 'sales-history' ? '#ffffff' : '#475569',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    سجل الفواتير
                  </button>
                </>
              )}
            </div>

            {/* TAB CONTENT: COCKPIT (Idle / Standby Morning Hub) */}
            {!data?.hasActiveTrip && currentTab === 'cockpit' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* 1. Vehicle Fleet Status & Health Cockpit */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    padding: '16px 18px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TruckIcon size={18} color="#170e5e" />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>مركبة التوزيع والأسطول الميداني</h3>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>حالة السيارة وقراءة العداد وتنبيهات الصيانة</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setActiveTab('fleet')}
                        style={{
                          backgroundColor: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          color: '#170e5e',
                          borderRadius: '8px',
                          padding: '5px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        + تفويلة وقود
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('fleet')}
                        style={{
                          backgroundColor: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          color: '#170e5e',
                          borderRadius: '8px',
                          padding: '5px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        + غيار زيت
                      </button>
                    </div>
                  </div>

                  {/* Vehicle Specs Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block', fontWeight: 600 }}>رقم لوحة السيارة</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#170e5e' }}>{vehicle?.plate || 'سيارة التوزيع'}</span>
                    </div>
                    <div style={{ backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block', fontWeight: 600 }}>الموديل والنوع</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{vehicle?.model || 'فان توزيع بضاعة'}</span>
                    </div>
                    <div style={{ backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block', fontWeight: 600 }}>عداد الكيلومتر الحالي</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{vehicle?.startOdometer ? `${vehicle.startOdometer.toLocaleString()} كم` : '0 كم'}</span>
                    </div>
                    <div style={{ backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block', fontWeight: 600 }}>نوع الوقود</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#059669' }}>{vehicle?.fuelType === 'diesel' ? 'سولار' : 'بنزين 92'}</span>
                    </div>
                  </div>

                  {/* Maintenance & Oil Alerts Strip */}
                  {maintenanceAlerts.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {maintenanceAlerts.map((al) => (
                        <div
                          key={al.id}
                          style={{
                            backgroundColor: al.severity === 'critical' ? '#fef2f2' : '#fffbeb',
                            border: `1px solid ${al.severity === 'critical' ? '#fecaca' : '#fde68a'}`,
                            borderRadius: '8px',
                            padding: '8px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertTriangleIcon size={16} color={al.severity === 'critical' ? '#dc2626' : '#d97706'} />
                            <span style={{ fontSize: '12px', fontWeight: 700, color: al.severity === 'critical' ? '#991b1b' : '#92400e' }}>
                              {al.description || al.title}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveTab('fleet')}
                            style={{
                              backgroundColor: '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: '#0f172a',
                              borderRadius: '6px',
                              padding: '3px 8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            تسجيل الصيانة
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircleIcon size={16} color="#16a34a" />
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#166534' }}>
                        حالة المركبة ممتازة ولا توجد تنبيهات صيانة أو غيارات زيت متأخرة
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Morning Operations & Trip Launch Card */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PackageIcon size={20} color="#170e5e" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>بدء رحلة التوزيع وعمليات الصباح</h3>
                      <span style={{ fontSize: '11.5px', color: '#64748b' }}>إعداد بضاعة السيارة والانطلاق للميدان</span>
                    </div>
                  </div>

                  {/* Existing Stock Banner */}
                  {data?.inventory && data.inventory.length > 0 ? (
                    <div
                      style={{
                        backgroundColor: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        marginBottom: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#1e40af', display: 'block' }}>
                          يوجد بضاعة متوفرة بالسيارة حالياً ({data.inventory.length} أصناف)
                        </span>
                        <span style={{ fontSize: '11px', color: '#3b82f6' }}>
                          إجمالي القيمة: {totalInventoryValue.toFixed(2)} {getGlobalCurrencySymbol()} جاهزة للبيع الفوري
                        </span>
                      </div>
                      <Button
                        variant="primary"
                        onClick={() => startTripMutation.mutate()}
                        disabled={startTripMutation.isPending}
                        style={{ backgroundColor: '#170e5e', color: '#ffffff', fontSize: '12.5px', fontWeight: 800 }}
                      >
                        {startTripMutation.isPending ? 'جاري بدء الرحلة...' : 'بدء رحلة التوزيع بالبضاعة الحالية'}
                      </Button>
                    </div>
                  ) : (
                    <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 16px', lineHeight: 1.5 }}>
                      سيارتك جاهزة لبدء العمل! يمكنك إرسال طلب شحن بضاعة صباحي لمشرف المستودع للمراجعة وصرف البضاعة، أو بدء الرحلة مباشرة للتحصيل وزيارة المتاجر.
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <Button
                      variant="primary"
                      onClick={() => setViewMode('new-requisition')}
                      style={{ backgroundColor: '#170e5e', color: '#ffffff', fontSize: '12.5px', fontWeight: 800 }}
                    >
                      + إنشاء طلب شحن بضاعة صباحي (إذن تحميل)
                    </Button>
                    {(!data?.inventory || data.inventory.length === 0) && (
                      <Button
                        variant="secondary"
                        onClick={() => startTripMutation.mutate()}
                        disabled={startTripMutation.isPending}
                        style={{ fontSize: '12.5px', fontWeight: 700 }}
                      >
                        {startTripMutation.isPending ? 'جاري فتح الرحلة...' : 'بدء الرحلة مباشرة (للزيارات والتحصيل)'}
                      </Button>
                    )}
                    <Button variant="secondary" onClick={() => refetch()} style={{ fontSize: '12.5px' }}>
                      تحديث حالة الرحلة
                    </Button>
                  </div>
                </div>

                {/* 3. Today's Scheduled Route Strip */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    padding: '14px 16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MapPinIcon size={18} color="#16a34a" />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                        خط سير اليوم: {itinerary.length} متاجر مجدولة
                      </h4>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        استعرض قائمة المحلات ومواقعها وأرقام الهواتف للاستعداد الميداني
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('itinerary')}
                    style={{
                      backgroundColor: '#170e5e',
                      border: 'none',
                      color: '#ffffff',
                      borderRadius: '8px',
                      padding: '7px 14px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    استعراض خط السير ({itinerary.length} متجر)
                  </button>
                </div>

                {/* 4. Recent Requisitions List */}
                {myRequisitions.length > 0 && (
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      padding: '14px 16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#170e5e' }}>
                        أحدث طلبات الشحن الصباحية الخاصة بك:
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('requisitions')}
                        style={{ backgroundColor: 'transparent', border: 'none', color: '#4338ca', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        عرض الكل ({myRequisitions.length})
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {myRequisitions.slice(0, 3).map((req) => (
                        <div
                          key={req.id}
                          style={{
                            backgroundColor: '#f8fafc',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', display: 'block' }}>
                              طلب شحن #{req.docNo}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              المستودع: {req.sourceWarehouseName} • {req.requestedItems.length} أصناف
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor:
                                req.status === 'dispatched'
                                  ? '#dcfce7'
                                  : req.status === 'rejected'
                                  ? '#fee2e2'
                                  : '#fef3c7',
                              color:
                                req.status === 'dispatched'
                                  ? '#15803d'
                                  : req.status === 'rejected'
                                  ? '#b91c1c'
                                  : '#b45309',
                            }}
                          >
                            {req.status === 'dispatched'
                              ? 'تم الصرف والتحميل'
                              : req.status === 'rejected'
                              ? 'مرفوض'
                              : 'قيد مراجعة المشرف'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: ITINERARY (Works before & during active trip) */}
            {currentTab === 'itinerary' && (
              <VanItineraryTab
                itinerary={itinerary}
                tripId={data?.trip?.id}
                isLoading={isItineraryLoading}
                onSelectCustomerForSale={(customerId) => {
                  setSelectedCustomerId(customerId);
                  setNewCustomerName('');
                  if (data?.hasActiveTrip) {
                    setActiveTab('sale');
                  } else {
                    toast.info('يرجى بدء رحلة التوزيع أولاً لإصدار فاتورة بيع');
                  }
                }}
                onRefreshItinerary={() => {
                  refetchItinerary();
                  queryClient.invalidateQueries({ queryKey: ['van-sales-active-trip'] });
                }}
              />
            )}

            {/* TAB CONTENT: INVENTORY (Works before & during active trip) */}
            {currentTab === 'inventory' && (
              <VanInventoryTab
                stockSearch={stockSearch}
                onSearchChange={setStockSearch}
                filteredInventory={filteredInventory}
                cart={cart}
                cartTotal={cartTotal}
                onAddToCart={(item) => {
                  if (data?.hasActiveTrip) {
                    addToCart(item);
                  } else {
                    toast.info('يرجى بدء رحلة التوزيع أولاً لإضافة الأصناف للفاتورة');
                  }
                }}
                onUpdateCartQty={updateCartQty}
                onGoToSale={() => setActiveTab('sale')}
                onOpenTransferModal={() => setTransferModalOpen(true)}
                pendingTransfersCount={peerTransfers.filter((t) => t.status === 'pending').length}
              />
            )}

            {/* TAB CONTENT: FLEET & FUEL (Works before & during active trip) */}
            {currentTab === 'fleet' && (
              <VanFleetTab
                vehicle={vehicle}
                tripId={data?.trip?.id}
                maintenanceAlerts={maintenanceAlerts}
                fuelLogs={fuelLogs}
                onRefreshFuel={() => {
                  refetchFuelLogs();
                  refetch();
                }}
              />
            )}

            {/* TAB CONTENT: REQUISITIONS (History & New Requisitions) */}
            {currentTab === 'requisitions' && (
              <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>طلبات الشحن وأذونات التحميل الصباحية</h3>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>متابعة حالة صرف البضاعة من المستودع للسيارة</span>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => setViewMode('new-requisition')}
                    style={{ backgroundColor: '#170e5e', color: '#ffffff', fontSize: '12px', fontWeight: 800 }}
                  >
                    + إنشاء طلب شحن جديد
                  </Button>
                </div>

                {myRequisitions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 0', color: '#94a3b8' }}>
                    <PackageIcon size={32} color="#cbd5e1" style={{ margin: '0 auto 8px', display: 'block' }} />
                    <span style={{ fontSize: '12.5px', fontWeight: 600 }}>لا توجد طلبات شحن سابقة مسجلة</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {myRequisitions.map((req) => (
                      <div
                        key={req.id}
                        style={{
                          backgroundColor: '#f8fafc',
                          borderRadius: '10px',
                          padding: '12px 14px',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                            طلب شحن #{req.docNo}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor:
                                req.status === 'dispatched'
                                  ? '#dcfce7'
                                  : req.status === 'rejected'
                                  ? '#fee2e2'
                                  : '#fef3c7',
                              color:
                                req.status === 'dispatched'
                                  ? '#15803d'
                                  : req.status === 'rejected'
                                  ? '#b91c1c'
                                  : '#b45309',
                            }}
                          >
                            {req.status === 'dispatched'
                              ? 'تم الصرف والتحميل'
                              : req.status === 'rejected'
                              ? 'مرفوض'
                              : 'قيد مراجعة المشرف'}
                          </span>
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748b', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                          <span>المستودع المصدر: <strong style={{ color: '#0f172a' }}>{req.sourceWarehouseName}</strong></span>
                          <span>الأصناف المطلوبة: <strong style={{ color: '#0f172a' }}>{req.requestedItems.length} صنف</strong></span>
                          <span>تاريخ الطلب: {new Date(req.createdAt).toLocaleDateString('ar-EG')}</span>
                        </div>
                        {req.rejectionReason && (
                          <div style={{ marginTop: '8px', padding: '6px 10px', backgroundColor: '#fef2f2', borderRadius: '6px', fontSize: '11.5px', color: '#b91c1c', fontWeight: 600 }}>
                            سبب الرفض: {req.rejectionReason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: SALE */}
            {currentTab === 'sale' && (
              data?.hasActiveTrip ? (
                <VanSaleTab
                  customers={allAvailableCustomers}
                  selectedCustomerId={selectedCustomerId}
                  onSelectCustomer={(val) => {
                    setSelectedCustomerId(val);
                    if (val) setNewCustomerName('');
                  }}
                  newCustomerName={newCustomerName}
                  onNewCustomerNameChange={setNewCustomerName}
                  paymentMethod={paymentMethod}
                  onPaymentMethodChange={setPaymentMethod}
                  cart={cart}
                  onUpdateCartQty={updateCartQty}
                  cartTotal={cartTotal}
                  inventory={data?.inventory || []}
                  onAddToCart={addToCart}
                  deliveryProofPhoto={deliveryProofPhoto}
                  onDeliveryProofPhotoChange={setDeliveryProofPhoto}
                  cartonsCount={cartonsCount}
                  onCartonsCountChange={setCartonsCount}
                  onGoToInventory={() => setActiveTab('inventory')}
                  onGoToSalesHistory={() => setActiveTab('sales-history')}
                  onSubmitSale={() => {
                    if (cart.length === 0) {
                      showAlert('error', 'السلة فارغة حالياً. يرجى اختيار صنف واحد على الأقل لإصدار الفاتورة.');
                      return;
                    }
                    setCheckoutModalOpen(true);
                  }}
                  isSubmitting={executeSaleMutation.isPending}
                />
              ) : (
                <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '36px 20px', textAlign: 'center' }}>
                  <div style={{ width: '56px', height: '56px', backgroundColor: '#eef2ff', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <ReceiptIcon size={28} color="#170e5e" />
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>نقطة بيع الفاتورة السريعة</h3>
                  <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 auto 16px', maxWidth: '380px', lineHeight: 1.5 }}>
                    لبدء إضافة الأصناف وإصدار الفواتير للعملاء وإرفاق صور التسليم، يرجى بدء رحلة التوزيع أولاً.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => startTripMutation.mutate()}
                    disabled={startTripMutation.isPending}
                    style={{ backgroundColor: '#170e5e', color: '#ffffff', fontSize: '12.5px', fontWeight: 800 }}
                  >
                    {startTripMutation.isPending ? 'جاري بدء الرحلة...' : 'بدء رحلة التوزيع الآن'}
                  </Button>
                </div>
              )
            )}

            {/* TAB CONTENT: SALES HISTORY */}
            {currentTab === 'sales-history' && (
              <VanSalesHistoryTab
                tripId={data?.trip?.id}
                customers={allAvailableCustomers}
                onViewReceipt={(receiptData) => setLastSaleReceipt(receiptData)}
                onGoToNewSale={() => setActiveTab('sale')}
                storeName={data?.trip?.sourceWarehouseName || 'مبيعات التوزيع الميداني'}
              />
            )}

            {/* TAB CONTENT: COLLECTION */}
            {currentTab === 'collection' && (
              data?.hasActiveTrip ? (
                <VanCollectionTab
                  tripId={data.trip!.id}
                  customers={data.customers}
                  colCustomerId={colCustomerId}
                  onColCustomerChange={setColCustomerId}
                  colAmount={colAmount}
                  onColAmountChange={setColAmount}
                  onSubmitCollection={async () => {
                    if (!colCustomerId || !Number(colAmount)) {
                      showAlert('error', 'يرجى اختيار العميل وإدخال مبلغ التحصيل');
                      return;
                    }
                    let gpsLat: number | undefined;
                    let gpsLng: number | undefined;
                    if (typeof navigator !== 'undefined' && navigator.geolocation) {
                      try {
                        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3500, enableHighAccuracy: true });
                        });
                        gpsLat = pos.coords.latitude;
                        gpsLng = pos.coords.longitude;
                      } catch {}
                    }
                    recordCollectionMutation.mutate({
                      tripId: data.trip!.id,
                      customerId: Number(colCustomerId),
                      amount: Number(colAmount),
                      gpsLat,
                      gpsLng,
                    });
                  }}
                  isSubmitting={recordCollectionMutation.isPending}
                  onReturnSuccess={(docNo, amount) => {
                    showAlert('success', `تم رفع إذن المرتجع #${docNo} بقيمة ${amount.toFixed(2)} ${getGlobalCurrencySymbol()} للإدارة بنجاح`);
                  }}
                />
              ) : (
                <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '36px 20px', textAlign: 'center' }}>
                  <div style={{ width: '56px', height: '56px', backgroundColor: '#ecfdf5', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <ReceiptIcon size={28} color="#059669" />
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>تحصيل المديونيات والمرتجعات</h3>
                  <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 auto 16px', maxWidth: '380px', lineHeight: 1.5 }}>
                    لبدء تسجيل سندات القبض والتحصيل النقدي من العملاء، يرجى بدء رحلة التوزيع أولاً.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => startTripMutation.mutate()}
                    disabled={startTripMutation.isPending}
                    style={{ backgroundColor: '#170e5e', color: '#ffffff', fontSize: '12.5px', fontWeight: 800 }}
                  >
                    {startTripMutation.isPending ? 'جاري بدء الرحلة...' : 'بدء رحلة التوزيع الآن'}
                  </Button>
                </div>
              )
            )}

            {/* TAB CONTENT: SETTLE (Active Trip Only) */}
            {currentTab === 'settle' && (
              data?.hasActiveTrip ? (
                <VanSettleTab
                  tripData={data.trip}
                  sales={data.sales || []}
                  collections={data.collections || []}
                  returns={data.returns || []}
                  inventory={data.inventory || []}
                  countedCash={countedCash}
                  onCountedCashChange={setCountedCash}
                  unloadRemaining={unloadRemaining}
                  onUnloadRemainingChange={setUnloadRemaining}
                  onSubmitSettle={() => {
                    if (countedCash === '') {
                      showAlert('error', 'يرجى جرد وإدخال النقدية الفعلية الموجودة معك');
                      return;
                    }
                    settleTripMutation.mutate({
                      tripId: data.trip!.id,
                      countedCash: Number(countedCash),
                      unloadRemainingToWarehouse: unloadRemaining,
                    });
                  }}
                  isSubmitting={settleTripMutation.isPending}
                />
              ) : (
                <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '36px 20px', textAlign: 'center' }}>
                  <div style={{ width: '56px', height: '56px', backgroundColor: '#fef3c7', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <ClockIcon size={28} color="#d97706" />
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>تصفية اليومية وإغلاق العهدة</h3>
                  <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 auto 16px', maxWidth: '380px', lineHeight: 1.5 }}>
                    لا توجد رحلة توزيع مفتوحة لتصفيتها حالياً. يتم فتح هذا القسم بعد انطلاق الرحلة لتسليم النقدية ومطابقة العهدة المسائية.
                  </p>
                </div>
              )
            )}
          </>
        )}
      </main>

      {/* Street Inter-Van Transfer Modal */}
      {(data?.trip || (data?.inventory && data.inventory.length > 0)) && (
        <VanTransferModal
          open={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          inventory={data?.inventory || []}
          peerReps={peerReps}
          transfers={peerTransfers}
          onRefreshTransfers={() => refetchTransfers()}
          onRefreshInventory={() => refetch()}
        />
      )}

      {/* Field Sale Checkout & Payment Modal */}
      {data?.trip && checkoutModalOpen && (
        <VanSaleCheckoutModal
          open={checkoutModalOpen}
          onClose={() => setCheckoutModalOpen(false)}
          cartTotal={cartTotal}
          cartItemsCount={cart.length}
          cartTotalPieces={cart.reduce((s, it) => s + it.qty, 0)}
          customer={allAvailableCustomers.find((c) => String(c.id) === String(selectedCustomerId)) || null}
          newCustomerName={newCustomerName}
          cartonsCount={cartonsCount}
          onCartonsCountChange={setCartonsCount}
          deliveryProofPhoto={deliveryProofPhoto}
          onDeliveryProofPhotoChange={setDeliveryProofPhoto}
          notes={saleNotes}
          onNotesChange={setSaleNotes}
          isSubmitting={executeSaleMutation.isPending}
          onConfirmCheckout={async (checkoutData) => {
            let gpsLat: number | undefined;
            let gpsLng: number | undefined;
            if (typeof navigator !== 'undefined' && navigator.geolocation) {
              try {
                const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                  navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3500, enableHighAccuracy: true });
                });
                gpsLat = pos.coords.latitude;
                gpsLng = pos.coords.longitude;
              } catch {}
            }

            executeSaleMutation.mutate({
              tripId: data.trip!.id,
              customerId: selectedCustomerId ? Number(selectedCustomerId) : undefined,
              customerName: newCustomerName || undefined,
              paymentMethod: checkoutData.paymentMethod,
              paidAmount: checkoutData.paidAmount,
              notes: checkoutData.notes,
              deliveryGpsLat: gpsLat,
              deliveryGpsLng: gpsLng,
              deliveryProofPhoto: checkoutData.deliveryProofPhoto || deliveryProofPhoto || undefined,
              packagingBreakdown: checkoutData.cartonsCount
                ? {
                    cartonsCount: Number(checkoutData.cartonsCount) || 0,
                    piecesCount: cart.reduce((s, it) => s + it.qty, 0),
                    itemsCount: cart.length,
                  }
                : undefined,
              items: cart.map((c) => ({ productId: c.productId, qty: c.qty, unitPrice: c.unitPrice })),
            });
          }}
        />
      )}

      {/* Sale Receipt Modal */}
      {lastSaleReceipt && (
        <VanSalesReceiptModal
          receipt={lastSaleReceipt}
          onClose={() => setLastSaleReceipt(null)}
          storeName={data?.trip?.sourceWarehouseName || 'مبيعات التوزيع الميداني'}
        />
      )}

      {/* Mobile Fixed Bottom Navigation Bar (Under-the-Thumb Ergonomics) */}
      <nav
        dir="rtl"
        aria-label="شريط الملاحة الميداني السريع للمندوب"
        className="van-bottom-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '60px',
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          boxShadow: '0 -4px 16px rgba(15, 23, 42, 0.08)',
          zIndex: 90,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: '0 4px',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          boxSizing: 'border-box',
        }}
      >
        {data?.hasActiveTrip ? (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('itinerary')}
              style={{
                flex: 1,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: currentTab === 'itinerary' ? '#170e5e' : '#64748b',
                fontWeight: currentTab === 'itinerary' ? 800 : 600,
                fontSize: '11px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '24px',
                  borderRadius: '12px',
                  backgroundColor: currentTab === 'itinerary' ? '#eef2ff' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MapPinIcon size={17} color={currentTab === 'itinerary' ? '#170e5e' : '#64748b'} />
              </div>
              <span>خط السير</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sale')}
              style={{
                flex: 1,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: (currentTab === 'sale' || currentTab === 'sales-history') ? '#170e5e' : '#64748b',
                fontWeight: (currentTab === 'sale' || currentTab === 'sales-history') ? 800 : 600,
                fontSize: '11px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '24px',
                  borderRadius: '12px',
                  backgroundColor: (currentTab === 'sale' || currentTab === 'sales-history') ? '#eef2ff' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <ReceiptIcon size={17} color={(currentTab === 'sale' || currentTab === 'sales-history') ? '#170e5e' : '#64748b'} />
                {cart.length > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 900,
                      borderRadius: '8px',
                      padding: '0 4px',
                      lineHeight: '14px',
                      minWidth: '14px',
                      textAlign: 'center',
                    }}
                  >
                    {cart.length}
                  </span>
                )}
              </div>
              <span>فاتورة بيع</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              style={{
                flex: 1,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: currentTab === 'inventory' ? '#170e5e' : '#64748b',
                fontWeight: currentTab === 'inventory' ? 800 : 600,
                fontSize: '11px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '24px',
                  borderRadius: '12px',
                  backgroundColor: currentTab === 'inventory' ? '#eef2ff' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PackageIcon size={17} color={currentTab === 'inventory' ? '#170e5e' : '#64748b'} />
              </div>
              <span>السيارة</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('collection')}
              style={{
                flex: 1,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: currentTab === 'collection' ? '#170e5e' : '#64748b',
                fontWeight: currentTab === 'collection' ? 800 : 600,
                fontSize: '11px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '24px',
                  borderRadius: '12px',
                  backgroundColor: currentTab === 'collection' ? '#eef2ff' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CreditCardIcon size={17} color={currentTab === 'collection' ? '#170e5e' : '#64748b'} />
              </div>
              <span>التحصيل</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settle')}
              style={{
                flex: 1,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: (currentTab === 'settle' || currentTab === 'fleet') ? '#170e5e' : '#64748b',
                fontWeight: (currentTab === 'settle' || currentTab === 'fleet') ? 800 : 600,
                fontSize: '11px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '24px',
                  borderRadius: '12px',
                  backgroundColor: (currentTab === 'settle' || currentTab === 'fleet') ? '#eef2ff' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ClockIcon size={17} color={(currentTab === 'settle' || currentTab === 'fleet') ? '#170e5e' : '#64748b'} />
              </div>
              <span>اليومية</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('cockpit')}
              style={{
                flex: 1,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: currentTab === 'cockpit' ? '#170e5e' : '#64748b',
                fontWeight: currentTab === 'cockpit' ? 800 : 600,
                fontSize: '11px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '24px',
                  borderRadius: '12px',
                  backgroundColor: currentTab === 'cockpit' ? '#eef2ff' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TruckIcon size={17} color={currentTab === 'cockpit' ? '#170e5e' : '#64748b'} />
              </div>
              <span>لوحة الصباح</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('itinerary')}
              style={{
                flex: 1,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: currentTab === 'itinerary' ? '#170e5e' : '#64748b',
                fontWeight: currentTab === 'itinerary' ? 800 : 600,
                fontSize: '11px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '24px',
                  borderRadius: '12px',
                  backgroundColor: currentTab === 'itinerary' ? '#eef2ff' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MapPinIcon size={17} color={currentTab === 'itinerary' ? '#170e5e' : '#64748b'} />
              </div>
              <span>خط السير</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              style={{
                flex: 1,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: currentTab === 'inventory' ? '#170e5e' : '#64748b',
                fontWeight: currentTab === 'inventory' ? 800 : 600,
                fontSize: '11px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '24px',
                  borderRadius: '12px',
                  backgroundColor: currentTab === 'inventory' ? '#eef2ff' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PackageIcon size={17} color={currentTab === 'inventory' ? '#170e5e' : '#64748b'} />
              </div>
              <span>السيارة</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('requisitions')}
              style={{
                flex: 1,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: currentTab === 'requisitions' ? '#170e5e' : '#64748b',
                fontWeight: currentTab === 'requisitions' ? 800 : 600,
                fontSize: '11px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '24px',
                  borderRadius: '12px',
                  backgroundColor: currentTab === 'requisitions' ? '#eef2ff' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ReceiptIcon size={17} color={currentTab === 'requisitions' ? '#170e5e' : '#64748b'} />
              </div>
              <span>طلب شحن</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('fleet')}
              style={{
                flex: 1,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: currentTab === 'fleet' ? '#170e5e' : '#64748b',
                fontWeight: currentTab === 'fleet' ? 800 : 600,
                fontSize: '11px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '24px',
                  borderRadius: '12px',
                  backgroundColor: currentTab === 'fleet' ? '#eef2ff' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TruckIcon size={17} color={currentTab === 'fleet' ? '#170e5e' : '#64748b'} />
              </div>
              <span>المركبة</span>
            </button>
          </>
        )}
      </nav>
    </div>
  );
}
