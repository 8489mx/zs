import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { storefrontApi } from '@/features/storefront/api/storefront.api';
import { PosOnlineOrdersModal } from './PosOnlineOrdersModal';
import { PosTablesFloorPlanDialog } from './PosTablesFloorPlanDialog';
import { PosOnlineOrderFloatingAlert } from './PosOnlineOrderFloatingAlert';
import { PosOfflineQueueModal } from './PosOfflineQueueModal';
import { playNotificationChime } from '@/lib/audio-chime';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';

import type { PosWorkspaceState } from '@/features/pos/components/pos-workspace/posWorkspace.helpers';
import type { PosSaleMode } from '@/features/pos/lib/pos-sale-mode';
import { dispatchPosChromeToggle, dispatchPosFullscreenToggle } from '@/features/pos/lib/pos-shell';
import { ZErpIcon } from '@/shared/components/z-erp-brand';
import { usePosOfflineSync } from '@/features/pos/hooks/usePosOfflineSync';
import { APP_NETWORK_STATE_EVENT } from '@/features/pos/lib/pos-offline-sync';
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
} from '@/shared/components/icons/AppIcons';

interface PosWorkspaceHeaderProps {
  pos: PosWorkspaceState;
  posMode: PosSaleMode;
  onModeChange: (mode: PosSaleMode) => void;
  onFocusSearch: () => void;
  onOpenNewProduct?: () => void;
  onOpenQuickService?: () => void;
  onOpenHeldDrafts?: () => void;
  onPrintDraft: () => void;
  onRequestOpenShift?: () => void;
  onOpenSerialLookup?: () => void;
  onOpenReprintModal?: () => void;
}

function PosWorkspaceHeaderComponent({ pos, posMode, onModeChange, onFocusSearch, onOpenQuickService, onRequestOpenShift, onOpenReprintModal }: PosWorkspaceHeaderProps) {
  const { data: settings } = useSettingsQuery();
  const isRestaurantActive = settings?.restaurantModuleEnabled === true;
  const isStorefrontActive = settings?.storefrontModuleEnabled !== false;
  const isServicesActive = settings?.servicesModuleEnabled === true || Boolean(settings?.enableMobileStoreFeatures);

  const { offlineQueue, isSyncing, hasFailedSales, syncOfflineSales } = usePosOfflineSync();
  const [isOfflineQueueModalOpen, setIsOfflineQueueModalOpen] = useState(false);
  const [isOnlineOrdersOpen, setIsOnlineOrdersOpen] = useState(false);
  const [isTablesOpen, setIsTablesOpen] = useState(false);
  const [isScreensMenuOpen, setIsScreensMenuOpen] = useState(false);
  const [screensMenuStyle, setScreensMenuStyle] = useState<React.CSSProperties>({});
  const screensMenuContainerRef = useRef<HTMLDivElement>(null);
  const screensMenuDropdownRef = useRef<HTMLDivElement>(null);

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
        const res = await storefrontApi.listOrders('pending');
        return res.orders?.length || 0;
      } catch {
        return 0;
      }
    },
    enabled: isStorefrontActive,
    refetchInterval: 15 * 1000,
    staleTime: 10 * 1000,
  });

  const pendingCount = isStorefrontActive ? (pendingOrdersQuery.data || 0) : 0;

  useEffect(() => {
    if (previousPendingCountRef.current !== null && pendingCount > previousPendingCountRef.current) {
      playNotificationChime();
      setShowFloatingAlert(true);
    }
    previousPendingCountRef.current = pendingCount;
  }, [pendingCount]);

  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    const onNetworkEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ online?: boolean }>;
      if (typeof customEvent.detail?.online === 'boolean') {
        setIsOnline(customEvent.detail.online);
      }
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener(APP_NETWORK_STATE_EVENT, onNetworkEvent);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener(APP_NETWORK_STATE_EVENT, onNetworkEvent);
    };
  }, []);

  return (
    <>
      {!isOnline && (
        <div style={{
          background: '#fffbeb',
          color: '#92400e',
          borderBottom: '1px solid #fde68a',
          padding: '8px 16px',
          fontSize: '12px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          direction: 'rtl',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d97706', display: 'inline-block' }} />
            <span>وضع عدم الاتصال: انقطع الاتصال بالخادم. المبيعات مستمرة وتُحفظ محلياً بأمان.</span>
          </div>
          {offlineQueue.length > 0 && (
            <button
              type="button"
              onClick={() => setIsOfflineQueueModalOpen(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#b45309',
                fontWeight: 800,
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: '12px'
              }}
            >
              عرض الفواتير المعلقة ({offlineQueue.length})
            </button>
          )}
        </div>
      )}
      {isOnline && isSyncing && (
        <div style={{
          background: '#ecfdf5',
          color: '#065f46',
          borderBottom: '1px solid #a7f3d0',
          padding: '6px 16px',
          fontSize: '12px',
          fontWeight: 700,
          textAlign: 'center',
          direction: 'rtl',
        }}>
          تم استعادة الاتصال بالخادم. جاري ترحيل الفواتير المعلقة تلقائياً...
        </div>
      )}
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

          {/* 4. Active Table (if selected) */}
          {pos.tableNumber && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsTablesOpen(true)}
              style={{
                fontWeight: 800,
                color: '#166534',
                background: '#f0fdf4',
                border: '1px solid #86efac',
              }}
            >
              طاولة: {pos.tableNumber}
            </Button>
          )}

          {/* 4. Restaurant Tables (Only when Restaurant Module is active or table is assigned) */}
          {(isRestaurantActive || pos.tableNumber) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsTablesOpen(true)}
              style={{
                fontWeight: 700,
                color: pos.tableNumber ? '#166534' : undefined,
                background: pos.tableNumber ? '#f0fdf4' : undefined,
                border: pos.tableNumber ? '1px solid #86efac' : undefined,
              }}
              title="إدارة طاولات الصالة وجلسات الطعام"
            >
              {pos.tableNumber ? `طاولة: ${pos.tableNumber}` : 'الطاولات'}
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
          <div ref={screensMenuContainerRef} style={{ position: 'relative' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginInlineStart: 'auto' }}>
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
    <PosTablesFloorPlanDialog
      open={isTablesOpen}
      onClose={() => setIsTablesOpen(false)}
      currentTableNumber={pos.tableNumber}
      heldDrafts={pos.heldDraftSummaries || []}
      onSelectTable={(tableNum) => {
        pos.setOrderType('dine_in');
        pos.setTableNumber(tableNum);
      }}
      onRecallDraft={async (draftId) => {
        await pos.recallDraft(draftId);
      }}
      onTransferTable={(from, to) => {
        pos.setTableNumber(to);
        alert(`تم نقل الطلب بنجاح من طاولة ${from} إلى طاولة ${to}!`);
      }}
    />
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
    </>
  );
}

function areEqual(prev: PosWorkspaceHeaderProps, next: PosWorkspaceHeaderProps) {
  return prev.pos.isLoading === next.pos.isLoading
    && prev.pos.paymentType === next.pos.paymentType
    && prev.pos.paymentChannel === next.pos.paymentChannel
    && prev.pos.ownOpenShift === next.pos.ownOpenShift
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
