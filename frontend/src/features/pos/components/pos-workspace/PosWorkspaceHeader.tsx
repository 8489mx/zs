import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { DialogShell } from '@/shared/components/dialog-shell';
import { posApi } from '@/features/pos/api/pos.api';
import { storefrontApi } from '@/features/storefront/api/storefront.api';
import { PosOnlineOrdersModal } from './PosOnlineOrdersModal';
import { PosTablesFloorPlanDialog } from './PosTablesFloorPlanDialog';
import { PosOnlineOrderFloatingAlert } from './PosOnlineOrderFloatingAlert';
import { PosOfflineQueueModal } from './PosOfflineQueueModal';
import { PosInstantExchangeDialog } from './PosInstantExchangeDialog';
import { PosDeliveryAggregatorsModal } from './PosDeliveryAggregatorsModal';
import { PosFoodWasteModal } from './PosFoodWasteModal';
import { RestaurantDeliveryDispatcherModal } from './RestaurantDeliveryDispatcherModal';
import { Pos86ItemsModal } from './Pos86ItemsModal';
import { PosTipPoolModal } from './PosTipPoolModal';
import { KitchenDailyPrepSheetModal } from './KitchenDailyPrepSheetModal';
import { PosPlateCostRadarModal } from './PosPlateCostRadarModal';
import { PosCustomerPunchCardModal } from './PosCustomerPunchCardModal';
import { PosDriveThruModal } from './PosDriveThruModal';
import { PosSmartUpsellModal } from './PosSmartUpsellModal';
import { restaurantAdvancedFnbApi } from '@/features/pos/api/restaurant-advanced-fnb.api';
import { playNotificationChime } from '@/lib/audio-chime';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import { toast } from '@/shared/components/system-alert';

import type { PosWorkspaceState } from '@/features/pos/components/pos-workspace/posWorkspace.helpers';
import type { PosSaleMode } from '@/features/pos/lib/pos-sale-mode';
import { dispatchPosChromeToggle, dispatchPosFullscreenToggle } from '@/features/pos/lib/pos-shell';
import { ZErpIcon } from '@/shared/components/z-erp-brand';
import { usePosOfflineSync } from '@/features/pos/hooks/usePosOfflineSync';
import {
  openCustomerDisplayWindow,
  openKitchenDisplayWindow,
  openDigitalSignageWindow,
} from '@/features/pos/lib/pos-customer-display-bridge';
import {
  UtensilsIcon,
  LaptopIcon,
  MonitorIcon,
  MaximizeIcon,
  MenuIcon,
  ChevronDownIcon,
  PhoneCallIcon,
  PrinterIcon,
  CheckCircleIcon,
  UsersIcon,
  TruckIcon,
} from '@/shared/components/icons/AppIcons';
import { formatCurrency } from '@/lib/format';

interface PosWorkspaceHeaderProps {
  pos: PosWorkspaceState;
  posMode: PosSaleMode;
  onModeChange: (mode: PosSaleMode) => void;
  onFocusSearch: () => void;
  onOpenNewProduct?: () => void;
  onOpenQuickService?: () => void;
  onOpenHeldDrafts?: () => void;
  onOpenTables?: () => void;
  onOpenPhoneOrder?: () => void;
  onPrintDraft: () => void;
  onRequestOpenShift?: () => void;
  onOpenSerialLookup?: () => void;
  onOpenReprintModal?: () => void;
  onOpenComboModal?: () => void;
  onOpenManagerComp?: () => void;
  onPrintCupLabels?: () => void;
}

function PosWorkspaceHeaderComponent({
  pos,
  posMode,
  onModeChange,
  onFocusSearch,
  onOpenQuickService,
  onOpenHeldDrafts,
  onOpenTables,
  onOpenPhoneOrder,
  onRequestOpenShift,
  onOpenReprintModal,
  onOpenComboModal,
  onOpenManagerComp,
  onPrintCupLabels,
}: PosWorkspaceHeaderProps) {
  const { data: settings } = useSettingsQuery();
  const isRestaurantActive = settings?.restaurantModuleEnabled === true;
  const isPhoneOrdersActive = settings?.phoneOrdersModuleEnabled === true || (settings?.phoneOrdersModuleEnabled === undefined && (isRestaurantActive || ['restaurant', 'pharmacy', 'supermarket', 'grocery', 'food_beverage'].includes(settings?.businessIndustry || '')));
  const isStorefrontActive = settings?.storefrontModuleEnabled !== false;
  const isServicesActive = settings?.servicesModuleEnabled === true || Boolean(settings?.enableMobileStoreFeatures);

  const { offlineQueue, isSyncing, hasFailedSales, syncOfflineSales } = usePosOfflineSync();
  const [isOfflineQueueModalOpen, setIsOfflineQueueModalOpen] = useState(false);
  const [isNoSaleOpen, setIsNoSaleOpen] = useState(false);
  const [isExchangeOpen, setIsExchangeOpen] = useState(false);
  const [noSaleReason, setNoSaleReason] = useState('');
  const [noSaleManagerPin, setNoSaleManagerPin] = useState('');
  const [isNoSalePending, setIsNoSalePending] = useState(false);
  const [isOnlineOrdersOpen, setIsOnlineOrdersOpen] = useState(false);
  const [isTablesOpen, setIsTablesOpen] = useState(false);
  const [isAggregatorsOpen, setIsAggregatorsOpen] = useState(false);
  const [isDriverDispatchOpen, setIsDriverDispatchOpen] = useState(false);
  const [isFoodWasteOpen, setIsFoodWasteOpen] = useState(false);
  const [is86ModalOpen, setIs86ModalOpen] = useState(false);
  const [isTipPoolOpen, setIsTipPoolOpen] = useState(false);
  const [isPrepSheetOpen, setIsPrepSheetOpen] = useState(false);
  const [isPlateRadarOpen, setIsPlateRadarOpen] = useState(false);
  const [isStampCardOpen, setIsStampCardOpen] = useState(false);
  const [isDriveThruOpen, setIsDriveThruOpen] = useState(false);
  const [isUpsellModalOpen, setIsUpsellModalOpen] = useState(false);
  const [upsellRules, setUpsellRules] = useState<any[]>([]);

  const { data: headerZones = [] } = useQuery({
    queryKey: ['restaurant-floor-zones', pos.branchId],
    queryFn: () => restaurantAdvancedFnbApi.getZones(pos.branchId ? Number(pos.branchId) : undefined),
    enabled: isRestaurantActive,
    staleTime: 60_000,
  });

  const activeTableZone = headerZones.find((z) => {
    if (!pos.tableNumber) return false;
    const nums = Array.isArray(z.table_numbers) ? z.table_numbers : [];
    return nums.map(String).includes(String(pos.tableNumber).trim());
  });
  const activeZoneMinSpend = Number(activeTableZone?.minimum_spend || 0);
  const currentCartTotal = Number(pos.totals?.total || 0);

  const { data: items86 = [] } = useQuery({
    queryKey: ['pos-86-items-header', pos.branchId],
    queryFn: () => restaurantAdvancedFnbApi.get86Items(pos.branchId ? Number(pos.branchId) : undefined),
    enabled: isRestaurantActive,
    refetchInterval: 15_000,
  });
  const count86 = items86.length;
  const [isScreensMenuOpen, setIsScreensMenuOpen] = useState(false);
  const [screensMenuStyle, setScreensMenuStyle] = useState<React.CSSProperties>({});
  const screensMenuContainerRef = useRef<HTMLDivElement>(null);
  const screensMenuDropdownRef = useRef<HTMLDivElement>(null);

  const handleNoSaleDrawerKick = useCallback(async () => {
    if (isNoSalePending) return;
    const branchId = Number(pos.branchId);
    if (!pos.ownOpenShift || !Number.isInteger(branchId) || branchId <= 0) {
      toast.error('افتح وردية على الفرع الحالي أولاً');
      return;
    }
    if (noSaleReason.trim().length < 10 || !noSaleManagerPin.trim()) {
      toast.error('أدخل سبباً من 10 أحرف على الأقل ورمز اعتماد المشرف');
      return;
    }
    setIsNoSalePending(true);
    try {
      await posApi.logSecurityEvent({ eventType: 'no_sale', branchId, note: noSaleReason.trim(), managerPin: noSaleManagerPin.trim() });
      setIsNoSaleOpen(false);
      setNoSaleReason('');
      setNoSaleManagerPin('');
      const printer = (window as Window & { electronPrinter?: { kickCashDrawer: (device?: string) => Promise<unknown> } }).electronPrinter;
      if (printer?.kickCashDrawer) {
        try {
          await printer.kickCashDrawer(settings?.posElectronCashierPrinter);
          toast.success('تم تسجيل فتح الدرج وإرسال أمر الفتح');
        } catch {
          toast.warning('تم تسجيل الحدث، لكن تعذر الاتصال بدرج النقدية');
        }
      } else {
        toast.warning('تم تسجيل الحدث، لكن فتح الدرج المباشر متاح من تطبيق سطح المكتب فقط');
      }
    } catch {
      toast.error('تعذر اعتماد فتح الدرج؛ لم يُرسل أمر الفتح');
    } finally {
      setIsNoSalePending(false);
    }
  }, [isNoSalePending, noSaleManagerPin, noSaleReason, pos.branchId, pos.ownOpenShift, settings?.posElectronCashierPrinter]);

  const updateScreensMenuPosition = useCallback(() => {
    if (!screensMenuContainerRef.current) return;
    const rect = screensMenuContainerRef.current.getBoundingClientRect();
    const menuWidth = 280;
    let left = rect.right - menuWidth;
    if (left < 10) left = 10;
    if (left + menuWidth > window.innerWidth - 10) {
      left = Math.max(10, window.innerWidth - menuWidth - 10);
    }
    setScreensMenuStyle({
      position: 'fixed',
      top: `${rect.bottom + 6}px`,
      left: `${left}px`,
      width: `${menuWidth}px`,
      zIndex: 99999,
    });
  }, []);

  useEffect(() => {
    if (!isScreensMenuOpen) return;
    updateScreensMenuPosition();

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (screensMenuContainerRef.current?.contains(target)) return;
      if (screensMenuDropdownRef.current?.contains(target)) return;
      setIsScreensMenuOpen(false);
    }

    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsScreensMenuOpen(false);
    }

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('resize', updateScreensMenuPosition);
    window.addEventListener('scroll', updateScreensMenuPosition, true);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('resize', updateScreensMenuPosition);
      window.removeEventListener('scroll', updateScreensMenuPosition, true);
    };
  }, [isScreensMenuOpen, updateScreensMenuPosition]);

  const [showFloatingAlert, setShowFloatingAlert] = useState(false);
  const previousPendingCountRef = useRef<number | null>(null);

  const pendingOrdersQuery = useQuery({
    queryKey: ['pos-pending-orders-count'],
    queryFn: async () => {
      try {
        const res = await storefrontApi.getOrderCounts();
        return res.counts?.pending || 0;
      } catch {
        return 0;
      }
    },
    enabled: isStorefrontActive,
    refetchInterval: 20 * 1000,
    staleTime: 15 * 1000,
  });

  const pendingCount = isStorefrontActive ? (pendingOrdersQuery.data || 0) : 0;

  useEffect(() => {
    if (previousPendingCountRef.current !== null && pendingCount > previousPendingCountRef.current) {
      playNotificationChime();
      setShowFloatingAlert(true);
    }
    previousPendingCountRef.current = pendingCount;
  }, [pendingCount]);

  return (
    <>
      <PageHeader
      title="نقطة البيع"
      badge={(
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', direction: 'ltr', color: '#0f172a' }} aria-label="Z ERP">
          <ZErpIcon size={26} />
          <strong style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '0.02em', lineHeight: 1 }}>ERP</strong>
          {offlineQueue.length > 0 && (
            <button
              type="button"
              onClick={() => setIsOfflineQueueModalOpen(true)}
              title="انقر لعرض وإدارة الفواتير المعلقة بدون إنترنت"
              style={{
                background: hasFailedSales ? '#fee2e2' : '#ffedd5',
                color: hasFailedSales ? '#991b1b' : '#9a3412',
                border: hasFailedSales ? '1px solid #fca5a5' : '1px solid #fed7aa',
                padding: '3px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 700,
                marginRight: '8px',
                direction: 'rtl',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'transform 0.1s ease',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: hasFailedSales ? '#dc2626' : '#d97706', display: 'inline-block' }} />
              <span>{isSyncing ? 'جاري المزامنة...' : `${offlineQueue.length} فواتير معلقة`}</span>
            </button>
          )}
        </span>
      )}
      className="page-header--dense pos-page-header pos-page-header-streamlined"
      actions={(
        <div className="actions compact-actions pos-header-actions-row pos-header-toolbar-single" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* 1. Mode Toggle */}
          <div className="pos-mode-toggle" role="group" aria-label="POS mode">
            <Button type="button" variant={posMode === 'scanner' ? 'primary' : 'secondary'} onClick={() => onModeChange('scanner')}>سكانر</Button>
            <Button type="button" variant={posMode === 'touch' ? 'primary' : 'secondary'} onClick={() => onModeChange('touch')}>تاتش</Button>
          </div>

          {/* 2. Branch Info */}
          {pos.currentBranch?.name && (
            <div className="pos-header-branch-info" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '5px 12px', borderRadius: '8px', fontWeight: 700, color: '#334155' }}>
              <span>{pos.currentBranch.name}</span>
              <span style={{ opacity: 0.4 }}>|</span>
              <span>{(pos.currentBranch as any).salesStockMode === 'all_operational_locations' ? 'كل المخازن' : 'مخزن أساسي'}</span>
            </div>
          )}

          {/* 3. Fast Actions */}
          <Button type="button" variant="secondary" onClick={onFocusSearch} title="البحث في الأصناف (F6)">
            البحث F6
          </Button>
          {isServicesActive && onOpenQuickService && (
            <Button type="button" variant="secondary" onClick={onOpenQuickService} title="قائمة الخدمات السريعة (F8)">
              خدمة سريعة F8
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onOpenReprintModal || pos.reprintLastSale} title="إعادة طباعة الفواتير (F9)">
            F9 إعادة طباعة
          </Button>
          <Button type="button" variant="secondary" onClick={() => setIsNoSaleOpen(true)} disabled={!pos.ownOpenShift} title="فتح الدرج بدون بيع بعد اعتماد المشرف">
            فتح الدرج
          </Button>
          <Button type="button" variant="secondary" onClick={() => setIsExchangeOpen(true)} disabled={!pos.ownOpenShift || !pos.cart.length} title="استبدال بضاعة بالفاتورة الأصلية">
            استبدال فوري
          </Button>

          {/* Phone & Delivery Order Desk (F7) */}
          {isPhoneOrdersActive && onOpenPhoneOrder && (
            <Button
              type="button"
              variant="secondary"
              onClick={onOpenPhoneOrder}
              style={{
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                color: pos.orderType === 'delivery' ? '#1e40af' : '#334155',
                background: pos.orderType === 'delivery' ? '#eff6ff' : undefined,
                border: pos.orderType === 'delivery' ? '1px solid #93c5fd' : undefined,
              }}
              title="مكتب طلبات الهاتف والتوصيل السريع وكاشف المتصل (F7 أو Alt + P)"
            >
              <PhoneCallIcon size={14} color={pos.orderType === 'delivery' ? '#2563eb' : '#170e5e'} />
              <span>طلب هاتفي F7</span>
            </Button>
          )}

          {/* 4. Restaurant Tables (Only when Restaurant Module is active or table is assigned) */}
          {(isRestaurantActive || pos.tableNumber) && (
            <Button
              type="button"
              variant="secondary"
              onClick={onOpenTables || onOpenHeldDrafts || (() => setIsTablesOpen(true))}
              style={{
                fontWeight: 700,
                color: pos.tableNumber ? '#166534' : undefined,
                background: pos.tableNumber ? '#f0fdf4' : undefined,
                border: pos.tableNumber ? '1px solid #86efac' : undefined,
              }}
              title="إدارة طاولات الصالة وجلسات الطعام والطلبات المعلقة (F3)"
            >
              {pos.tableNumber ? `طاولة: ${pos.tableNumber}` : 'الطاولات F3'}
            </Button>
          )}

          {/* Dining Course Selector for Active Table */}
          {pos.tableNumber && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                padding: '2px',
                gap: '2px',
              }}
              title="تحديد مسار تقديم الوجبة للمطبخ (Courser)"
            >
              {[
                { key: 'appetizer', label: 'مقبلات' },
                { key: 'main', label: 'رئيسي' },
                { key: 'dessert', label: 'حلوى' },
              ].map((c) => {
                const active = (pos as any).diningCourse === c.key || (!pos.diningCourse && c.key === 'main');
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => (pos as any).setDiningCourse?.(c.key)}
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '4px',
                      border: 'none',
                      background: active ? '#170e5e' : 'transparent',
                      color: active ? '#ffffff' : '#64748b',
                      cursor: 'pointer',
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Guest Count (Covers) Stepper & Spend per guest - Strict RTL Stepper: [+] (العدد) [-] */}
          {(pos.tableNumber || pos.orderType === 'dine_in') && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                padding: '2px 4px',
                gap: '3px',
                height: '30px',
              }}
              title="عدد الضيوف على الطاولة ومؤشر متوسط إنفاق الفرد"
            >
              <button
                type="button"
                onClick={() => (pos as any).setGuestCount?.((prev: number) => Math.min(99, (prev || 1) + 1))}
                style={{
                  width: '22px',
                  height: '22px',
                  border: 'none',
                  background: '#f1f5f9',
                  color: '#0f172a',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="زيادة عدد الضيوف"
              >
                +
              </button>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#170e5e', minWidth: '46px', textAlign: 'center' }}>
                {(pos as any).guestCount || 1} ضيوف
              </span>
              <button
                type="button"
                onClick={() => (pos as any).setGuestCount?.((prev: number) => Math.max(1, (prev || 1) - 1))}
                style={{
                  width: '22px',
                  height: '22px',
                  border: 'none',
                  background: '#f1f5f9',
                  color: '#0f172a',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="إنقاص عدد الضيوف"
              >
                -
              </button>
              {pos.cart.length > 0 && (
                <span
                  style={{
                    marginRight: '4px',
                    paddingRight: '6px',
                    borderRight: '1px solid #e2e8f0',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    color: '#475569',
                    whiteSpace: 'nowrap',
                  }}
                >
                  متوسط الفرد: <strong style={{ color: '#047857' }}>{formatCurrency((pos.totals?.total || 0) / ((pos as any).guestCount || 1))}</strong>
                </span>
              )}
              {activeZoneMinSpend > 0 && (
                <span
                  style={{
                    marginRight: '4px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10.5px',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    background: currentCartTotal >= activeZoneMinSpend ? '#ecfdf5' : '#fef2f2',
                    color: currentCartTotal >= activeZoneMinSpend ? '#047857' : '#b91c1c',
                    border: `1px solid ${currentCartTotal >= activeZoneMinSpend ? '#a7f3d0' : '#fecaca'}`,
                  }}
                  title={`الحد الأدنى لإنفاق الطاولة في هذه المنطقة: ${activeZoneMinSpend}`}
                >
                  الحد الأدنى: {activeZoneMinSpend} ر.س {currentCartTotal < activeZoneMinSpend && `(عجز: ${(activeZoneMinSpend - currentCartTotal).toFixed(2)})`}
                </span>
              )}
            </div>
          )}

          {/* 1-Click Print Guest Check Button for Active Table/Cart */}
          {(pos.tableNumber || pos.orderType === 'dine_in') && pos.cart.length > 0 && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => (pos as any).printGuestCheckNow?.()}
              style={{
                fontWeight: 800,
                fontSize: '11.5px',
                height: '30px',
                padding: '0 10px',
                color: (pos as any).guestCheckPrintedAt ? '#92400e' : '#170e5e',
                background: (pos as any).guestCheckPrintedAt ? '#fef3c7' : '#f8fafc',
                border: (pos as any).guestCheckPrintedAt ? '1px solid #fde68a' : '1px solid #cbd5e1',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="طباعة شيك حساب الطاولة غير المسدد للزبون للمعاينة"
            >
              <PrinterIcon size={14} />
              <span>{(pos as any).guestCheckPrintedAt ? 'تم تسليم الشيك (إعادة طباعة)' : 'طباعة الشيك المبدئي'}</span>
            </Button>
          )}

          {/* Combo Meal Builder */}
          {isRestaurantActive && onOpenComboModal && (
            <Button
              type="button"
              variant="secondary"
              onClick={onOpenComboModal}
              style={{
                fontWeight: 800,
                fontSize: '11.5px',
                height: '30px',
                padding: '0 10px',
                color: '#170e5e',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="بناء وجبة كومبو تجميعية سريعة خطوة بخطوة"
            >
              <span>وجبة كومبو</span>
            </Button>
          )}

          {/* Delivery Aggregators Hub (Jahez, Hungerstation, Talabat, Keeta) */}
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsAggregatorsOpen(true)}
            style={{
              fontWeight: 700,
              color: '#170e5e',
              background: '#eef2ff',
              border: '1px solid #c7d2fe',
            }}
            title="منظومة تطبيقات التوصيل الخليجية (جاهز، هنقرستيشن، طلبات، كيتا) وإيقاف الأصناف 86"
          >
            منصات التوصيل
          </Button>

          {/* In-House Restaurant Delivery Driver Dispatcher */}
          {(isPhoneOrdersActive || isRestaurantActive || isStorefrontActive) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsDriverDispatchOpen(true)}
              style={{
                fontWeight: 700,
                color: '#0369a1',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="إسناد وترحيل طلبات التوصيل لسائقي المطعم ومتابعة التحصيل وإرسال واتساب السائق"
            >
              <TruckIcon size={14} color="#0284c7" />
              <span>سائقي التوصيل</span>
            </Button>
          )}

          {/* Kitchen Food Waste Logger */}
          {(isRestaurantActive || ['restaurant', 'food_beverage'].includes(settings?.businessIndustry || '')) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsFoodWasteOpen(true)}
              style={{
                fontWeight: 700,
                color: '#991b1b',
                background: '#fef2f2',
                border: '1px solid #fecaca',
              }}
              title="تسجيل هدر وتالف المطبخ والوجبات وخصم المواد الخام لحظياً"
            >
              هدر المطبخ
            </Button>
          )}

          {/* Fast 86 Items Exclusion */}
          {isRestaurantActive && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIs86ModalOpen(true)}
              style={{
                fontWeight: 700,
                color: count86 > 0 ? '#991b1b' : '#334155',
                background: count86 > 0 ? '#fee2e2' : '#f8fafc',
                border: count86 > 0 ? '1px solid #fca5a5' : '1px solid #cbd5e1',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="استبعاد الأصناف والمكونات النافذة لحظياً من الكاشير والمطبخ (86'd Items)"
            >
              <span>استبعاد 86</span>
              {count86 > 0 && (
                <span
                  style={{
                    background: '#dc2626',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 900,
                    padding: '0 5px',
                    borderRadius: '999px',
                  }}
                >
                  {count86}
                </span>
              )}
            </Button>
          )}

          {/* Tip Pooling & Shift Distribution */}
          {isRestaurantActive && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsTipPoolOpen(true)}
              style={{
                fontWeight: 700,
                color: '#1e40af',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
              }}
              title="مجمع الإكراميات وتوزيع حصص الوردية على طاقم الصالة والمطبخ"
            >
              مجمع الإكراميات
            </Button>
          )}

          {/* Daily Prep Sheet */}
          {isRestaurantActive && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsPrepSheetOpen(true)}
              style={{
                fontWeight: 700,
                color: '#166534',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
              }}
              title="ورقة التحضير اليومية للمطبخ والأصناف نصف المصنعة"
            >
              ورقة التحضير
            </Button>
          )}

          {/* Plate Cost Radar */}
          {isRestaurantActive && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsPlateRadarOpen(true)}
              style={{
                fontWeight: 700,
                color: '#7c2d12',
                background: '#fff7ed',
                border: '1px solid #fed7aa',
              }}
              title="رادار تذبذب تكلفة الأطباق وهوامش ربح الوجبات"
            >
              رادار التكلفة
            </Button>
          )}

          {/* Customer Stamp Loyalty */}
          {(isRestaurantActive || Boolean(pos.customerId)) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsStampCardOpen(true)}
              style={{
                fontWeight: 700,
                color: '#6b21a8',
                background: '#faf5ff',
                border: '1px solid #e9d5ff',
              }}
              title="كرت الأختام الرقمي للعميل ومكافآت المقاهي والمطاعم"
            >
              كرت الأختام
            </Button>
          )}

          {/* Manager Comps & VIP On-the-house */}
          {isRestaurantActive && onOpenManagerComp && (
            <Button
              type="button"
              variant="secondary"
              onClick={onOpenManagerComp}
              style={{
                fontWeight: 700,
                color: '#15803d',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
              }}
              title="اعتماد ضيافة الإدارة والخصومات الرسمية (Manager Comps)"
            >
              ضيافة الإدارة
            </Button>
          )}

          {/* Sticky Cup & Box Labels Printing */}
          {isRestaurantActive && onPrintCupLabels && (
            <Button
              type="button"
              variant="secondary"
              onClick={onPrintCupLabels}
              style={{
                fontWeight: 700,
                color: '#170e5e',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="طباعة ملصقات لاصقة للأكواب والعلب حرارياً 50x30 مم"
            >
              <PrinterIcon size={14} color="#170e5e" />
              <span>ملصقات الأكواب</span>
            </Button>
          )}

          {/* Drive-Thru Lane (طلبات السيارات ومؤشر SOS) */}
          {isRestaurantActive && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsDriveThruOpen(true)}
              style={{
                fontWeight: 700,
                color: '#1e3a8a',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="طابور طلبات السيارات ومؤشر سرعة الخدمة SOS"
            >
              <TruckIcon size={14} color="#1e3a8a" />
              <span>طلبات السيارات</span>
            </Button>
          )}

          {/* Smart Upsell Recommendations */}
          {isRestaurantActive && pos.cart.length > 0 && (
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                try {
                  const firstProductId = Number(pos.cart[0]?.productId) || undefined;
                  const rules = await restaurantAdvancedFnbApi.getUpsellRecommendations(firstProductId);
                  setUpsellRules(rules || []);
                  setIsUpsellModalOpen(true);
                } catch {
                  setIsUpsellModalOpen(true);
                }
              }}
              style={{
                fontWeight: 700,
                color: '#b45309',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="اقتراحات الترقية الذكية وزيادة متوسط الفاتورة (Upsell & Cross-sell)"
            >
              <CheckCircleIcon size={14} color="#b45309" />
              <span>عروض ذكية</span>
            </Button>
          )}

          {/* 5. Online Orders Smart Notification Badge (Only when Storefront is active and pending orders exist) */}
          {isStorefrontActive && pendingCount > 0 && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOnlineOrdersOpen(true)}
              style={{
                fontWeight: 800,
                background: '#059669',
                color: '#ffffff',
                border: '1px solid #047857',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="طلبات متجر إلكتروني جديدة معلقة بانتظار الاعتماد"
            >
              <span>طلبات أونلاين</span>
              <span
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 900,
                  borderRadius: '999px',
                  padding: '1px 7px',
                  lineHeight: '1.2',
                }}
              >
                {pendingCount}
              </span>
            </Button>
          )}

          {/* 6. Screens Dropdown Menu */}
          <div ref={screensMenuContainerRef} className="desktop-only-toolbar-item pos-screens-menu-container" style={{ position: 'relative' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsScreensMenuOpen((prev) => !prev)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 700,
                background: isScreensMenuOpen ? '#f1f5f9' : undefined,
                color: '#1e293b',
              }}
              title="شاشات العرض الخارجية (العميل والإعلانات والمطبخ)"
            >
              <MonitorIcon size={16} color="#170e5e" />
              <span>شاشات العرض</span>
              <ChevronDownIcon size={14} color="#64748b" style={{ transform: isScreensMenuOpen ? 'rotate(180deg)' : undefined, transition: 'transform 0.2s' }} />
            </Button>

            {isScreensMenuOpen && typeof document !== 'undefined' && createPortal(
              <div
                ref={screensMenuDropdownRef}
                style={{
                  ...screensMenuStyle,
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 16px 36px -4px rgba(15, 23, 42, 0.2), 0 8px 16px -4px rgba(15, 23, 42, 0.12)',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  direction: 'rtl',
                }}
              >
                {/* 1. Customer Display */}
                <button
                  type="button"
                  onClick={() => {
                    setIsScreensMenuOpen(false);
                    openCustomerDisplayWindow();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'right',
                    width: '100%',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MonitorIcon size={17} color="#1d4ed8" />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>شاشة العميل (Customer Display)</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>عرض الأسعار والمشتريات للزبون</div>
                  </div>
                </button>

                {/* 2. Digital Signage */}
                <button
                  type="button"
                  onClick={() => {
                    setIsScreensMenuOpen(false);
                    openDigitalSignageWindow();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'right',
                    width: '100%',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <LaptopIcon size={17} color="#0369a1" />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>شاشة العروض والأسعار (Signage)</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>شاشة التلفزيون الترويجية في المتجر</div>
                  </div>
                </button>

                {/* 3. Kitchen Display (KDS) - Only if Restaurant module is enabled! */}
                {isRestaurantActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsScreensMenuOpen(false);
                      openKitchenDisplayWindow();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'right',
                      width: '100%',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <UtensilsIcon size={17} color="#c2410c" />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>شاشة المطبخ (KDS)</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>شاشة تفاعلية لتحضير الوجبات للشيف</div>
                    </div>
                  </button>
                )}

                {/* 4. Order Status / Pickup Board - Restaurant Mode */}
                {isRestaurantActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsScreensMenuOpen(false);
                      window.open('/pos/order-status', 'OrderStatusBoardWindow', 'menubar=no,toolbar=no,location=no,status=no,resizable=yes');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'right',
                      width: '100%',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckCircleIcon size={17} color="#16a34a" />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>شاشة جاهزية الطلبات (Pickup Board)</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>شاشة الانتظار وإعلان أرقام الطلبات للزبائن</div>
                    </div>
                  </button>
                )}

                {/* 5. Handheld Waiter / Captain Station */}
                {isRestaurantActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsScreensMenuOpen(false);
                      window.open('/pos/waiter', 'WaiterStationWindow', 'menubar=no,toolbar=no,location=no,status=no,resizable=yes');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'right',
                      width: '100%',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <UsersIcon size={17} color="#4338ca" />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>محطة الويتر وكابتن الصالة (Captain Station)</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>واجهة سريعة للأجهزة المحمولة لأخذ طلبات الطاولة</div>
                    </div>
                  </button>
                )}
              </div>,
              document.body
            )}
          </div>

          {/* 7. Shift Button */}
          {pos.ownOpenShift ? (
            <Link to={`/cash-drawer?action=close${pos.ownOpenShift?.id ? `&shiftId=${pos.ownOpenShift.id}` : ''}`}>
              <Button type="button" variant="secondary" className="pos-close-shift-btn">
                <span className="pos-close-shift-text-full">تقفيل الوردية</span>
                <span className="pos-close-shift-text-short">تقفيل</span>
              </Button>
            </Link>
          ) : (
            <Button type="button" variant="primary" className="pos-close-shift-btn" onClick={onRequestOpenShift}>
              <span className="pos-close-shift-text-full">فتح وردية</span>
              <span className="pos-close-shift-text-short">فتح</span>
            </Button>
          )}

          {/* 8. Compact Window Controls */}
          <div className="desktop-only-toolbar-item pos-window-controls" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginInlineStart: 'auto' }}>
            <button
              type="button"
              onClick={() => dispatchPosChromeToggle()}
              title="إظهار / إخفاء القائمة الجانبية (F10)"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#0f172a'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#475569'; }}
            >
              <MenuIcon size={16} />
            </button>
            <button
              type="button"
              onClick={() => dispatchPosFullscreenToggle()}
              title="ملء الشاشة الكاملة (F11)"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#0f172a'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#475569'; }}
            >
              <MaximizeIcon size={15} />
            </button>
          </div>
        </div>
      )}
    />
    <PosOnlineOrdersModal
      isOpen={isOnlineOrdersOpen}
      onClose={() => setIsOnlineOrdersOpen(false)}
    />
    {!onOpenTables && (
      <PosTablesFloorPlanDialog
        open={isTablesOpen}
        onClose={() => setIsTablesOpen(false)}
        currentTableNumber={pos.tableNumber}
        currentCartItemsCount={pos.cart.length}
        currentCartTotal={Number(pos.totals?.total || 0)}
        heldDrafts={pos.heldDraftSummaries || []}
        onSelectTable={async (tableNum) => {
          if (pos.cart.length > 0) {
            await pos.holdDraft();
          }
          pos.setOrderType('dine_in');
          pos.setTableNumber(tableNum);
          pos.setCustomerId('');
          pos.setQuickCustomerName('');
          pos.setQuickCustomerPhone('');
          pos.setQuickCustomerAddress('');
        }}
        onRecallDraft={async (draftId) => {
          if (pos.cart.length > 0) {
            await pos.holdDraft();
          }
          await pos.recallDraft(draftId);
        }}
        onTransferTable={(from, to) => {
          pos.setTableNumber(to);
          toast.success(`تم نقل الطلب بنجاح من طاولة ${from} إلى طاولة ${to}`);
        }}
      />
    )}
    {showFloatingAlert && (
      <PosOnlineOrderFloatingAlert
        orderCount={pendingCount}
        onOpenOrders={() => {
          setShowFloatingAlert(false);
          setIsOnlineOrdersOpen(true);
        }}
        onDismiss={() => setShowFloatingAlert(false)}
      />
    )}
    <PosOfflineQueueModal
      open={isOfflineQueueModalOpen}
      onClose={() => setIsOfflineQueueModalOpen(false)}
      offlineQueue={offlineQueue}
      isSyncing={isSyncing}
      onRetrySync={syncOfflineSales}
    />
    <DialogShell open={isNoSaleOpen} onClose={() => { if (!isNoSalePending) setIsNoSaleOpen(false); }} width="min(480px, 100%)">
      <div dir="rtl" style={{ padding: 24, background: '#fff' }}>
        <h2 style={{ marginTop: 0 }}>فتح الدرج بدون بيع</h2>
        <p>سيُحفظ اسم المستخدم والوردية والسبب في سجل التدقيق قبل إرسال أمر فتح الدرج.</p>
        <label htmlFor="pos-no-sale-reason">سبب فتح الدرج</label>
        <textarea id="pos-no-sale-reason" value={noSaleReason} onChange={(event) => setNoSaleReason(event.target.value)} maxLength={500} rows={3} style={{ width: '100%', marginBottom: 12 }} disabled={isNoSalePending} />
        <label htmlFor="pos-no-sale-pin">رمز اعتماد المشرف</label>
        <input id="pos-no-sale-pin" type="password" autoComplete="off" value={noSaleManagerPin} onChange={(event) => setNoSaleManagerPin(event.target.value)} style={{ width: '100%', marginBottom: 18 }} disabled={isNoSalePending} />
        <Button type="button" variant="primary" onClick={() => { void handleNoSaleDrawerKick(); }} disabled={isNoSalePending || noSaleReason.trim().length < 10 || !noSaleManagerPin.trim()}>
          {isNoSalePending ? 'جاري الاعتماد...' : 'اعتماد وفتح الدرج'}
        </Button>
      </div>
    </DialogShell>
    <PosInstantExchangeDialog open={isExchangeOpen} onClose={() => setIsExchangeOpen(false)} pos={pos} />
    <PosDeliveryAggregatorsModal open={isAggregatorsOpen} onClose={() => setIsAggregatorsOpen(false)} />
    <RestaurantDeliveryDispatcherModal open={isDriverDispatchOpen} onClose={() => setIsDriverDispatchOpen(false)} />
    <PosFoodWasteModal open={isFoodWasteOpen} onClose={() => setIsFoodWasteOpen(false)} branchId={Number(pos.branchId) || 1} />
    <Pos86ItemsModal
      open={is86ModalOpen}
      onClose={() => setIs86ModalOpen(false)}
      products={(pos as any).productsQuery?.data || []}
      branchId={Number(pos.branchId) || undefined}
    />
    <PosTipPoolModal
      open={isTipPoolOpen}
      onClose={() => setIsTipPoolOpen(false)}
      branchId={Number(pos.branchId) || undefined}
      currency={(pos as any).currency || 'ج.م'}
    />
    <KitchenDailyPrepSheetModal
      open={isPrepSheetOpen}
      onClose={() => setIsPrepSheetOpen(false)}
      branchId={Number(pos.branchId) || undefined}
    />
    <PosPlateCostRadarModal
      open={isPlateRadarOpen}
      onClose={() => setIsPlateRadarOpen(false)}
      currency={(pos as any).currency || 'ج.م'}
    />
    <PosCustomerPunchCardModal
      open={isStampCardOpen}
      onClose={() => setIsStampCardOpen(false)}
      customerId={Number(pos.customerId) || 1}
      customerName={(pos as any).customerName || 'العميل الحالي'}
    />
    <PosDriveThruModal
      open={isDriveThruOpen}
      onClose={() => setIsDriveThruOpen(false)}
      branchId={Number(pos.branchId) || undefined}
    />
    <PosSmartUpsellModal
      open={isUpsellModalOpen}
      onClose={() => setIsUpsellModalOpen(false)}
      recommendations={upsellRules}
      onAcceptUpsell={(product: any) => {
        if ((pos as any).addProduct) {
          (pos as any).addProduct(product);
        }
      }}
    />
    </>
  );
}

function areEqual(prev: PosWorkspaceHeaderProps, next: PosWorkspaceHeaderProps) {
  return prev.pos.isLoading === next.pos.isLoading
    && prev.pos.paymentType === next.pos.paymentType
    && prev.pos.paymentChannel === next.pos.paymentChannel
    && prev.pos.ownOpenShift === next.pos.ownOpenShift
    && prev.pos.branchId === next.pos.branchId
    && prev.pos.hasOperationalSetup === next.pos.hasOperationalSetup
    && prev.pos.hasCatalogReady === next.pos.hasCatalogReady
    && prev.pos.requiresCashierShift === next.pos.requiresCashierShift
    && prev.pos.cart === next.pos.cart
    && prev.pos.lastSale === next.pos.lastSale
    && prev.pos.canSubmitSale === next.pos.canSubmitSale
    && prev.pos.canSubmitHint === next.pos.canSubmitHint
    && prev.pos.heldDraftSummaries === next.pos.heldDraftSummaries
    && prev.pos.settingsQuery.data?.enableMobileStoreFeatures === next.pos.settingsQuery.data?.enableMobileStoreFeatures
    && prev.posMode === next.posMode
    && prev.onFocusSearch === next.onFocusSearch
    && prev.onOpenNewProduct === next.onOpenNewProduct
    && prev.onOpenQuickService === next.onOpenQuickService
    && prev.onOpenHeldDrafts === next.onOpenHeldDrafts
    && prev.onModeChange === next.onModeChange
    && prev.onPrintDraft === next.onPrintDraft;
}

export const PosWorkspaceHeader = memo(PosWorkspaceHeaderComponent, areEqual);
