import { memo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { storefrontApi } from '@/features/storefront/api/storefront.api';
import { PosOnlineOrdersModal } from './PosOnlineOrdersModal';
import { PosTablesFloorPlanDialog } from './PosTablesFloorPlanDialog';

import type { PosWorkspaceState } from '@/features/pos/components/pos-workspace/posWorkspace.helpers';
import type { PosSaleMode } from '@/features/pos/lib/pos-sale-mode';
import { dispatchPosChromeToggle, dispatchPosFullscreenToggle } from '@/features/pos/lib/pos-shell';
import { ZErpIcon } from '@/shared/components/z-erp-brand';
import { usePosOfflineSync } from '@/features/pos/hooks/usePosOfflineSync';

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

function PosWorkspaceHeaderComponent({ pos, posMode, onModeChange, onFocusSearch, onOpenNewProduct, onOpenQuickService, onRequestOpenShift, onOpenReprintModal }: PosWorkspaceHeaderProps) {
  const { offlineQueue, isSyncing, hasFailedSales } = usePosOfflineSync();
  const [isOnlineOrdersOpen, setIsOnlineOrdersOpen] = useState(false);
  const [isTablesOpen, setIsTablesOpen] = useState(false);

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
    refetchInterval: 15 * 1000,
    staleTime: 10 * 1000,
  });

  const pendingCount = pendingOrdersQuery.data || 0;

  return (
    <>
      <PageHeader
      title="نقطة البيع"
      badge={(
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', direction: 'ltr', color: '#0f172a' }} aria-label="Z ERP">
          <ZErpIcon size={26} />
          <strong style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '0.02em', lineHeight: 1 }}>ERP</strong>
          {offlineQueue.length > 0 && (
            <span style={{ background: hasFailedSales ? '#dc3545' : '#fd7e14', color: 'white', padding: '2px 6px', borderRadius: '6px', fontSize: '11px', marginRight: '6px', direction: 'rtl' }}>
              {isSyncing ? '...' : `(${offlineQueue.length})`}
            </span>
          )}
        </span>
      )}
      className="page-header--dense pos-page-header pos-page-header-streamlined"
      actions={(
        <div className="actions compact-actions pos-header-actions-row pos-header-toolbar-single">
          <div className="pos-mode-toggle" role="group" aria-label="POS mode">
            <Button type="button" variant={posMode === 'scanner' ? 'primary' : 'secondary'} onClick={() => onModeChange('scanner')}>سكانر</Button>
            <Button type="button" variant={posMode === 'touch' ? 'primary' : 'secondary'} onClick={() => onModeChange('touch')}>تاتش</Button>
          </div>
          {pos.currentBranch?.name && (
             <div className="pos-header-branch-info" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', background: '#e2e8f0', padding: '4px 12px', borderRadius: '4px', fontWeight: 600 }}>
               <span>{pos.currentBranch.name}</span>
               <span style={{ opacity: 0.5 }}>|</span>
               <span>{(pos.currentBranch as any).salesStockMode === 'all_operational_locations' ? 'كل المخازن' : 'مخزن أساسي'}</span>
             </div>
          )}
           <Button type="button" variant="secondary" onClick={onFocusSearch}>البحث F6</Button>
          <Button type="button" variant="secondary" onClick={onOpenNewProduct} style={{ fontWeight: 700, color: '#1e3a8a' }}>+ صنف جديد</Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsTablesOpen(true)}
            style={{
              fontWeight: 700,
              color: pos.tableNumber ? '#166534' : undefined,
              background: pos.tableNumber ? '#f0fdf4' : undefined,
              border: pos.tableNumber ? '1px solid #bbf7d0' : undefined,
            }}
          >
            {pos.tableNumber ? `طاولة: ${pos.tableNumber}` : 'الطاولات'}
          </Button>
          <Button type="button" variant="secondary" onClick={onOpenQuickService}>خدمة سريعة F8</Button>
          <Button type="button" variant="secondary" onClick={onOpenReprintModal || pos.reprintLastSale}>F9 إعادة طباعة الفواتير</Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsOnlineOrdersOpen(true)}
            style={{
              fontWeight: 700,
              background: pendingCount > 0 ? '#10b981' : undefined,
              color: pendingCount > 0 ? '#ffffff' : '#0f172a',
              border: pendingCount > 0 ? '1px solid #059669' : undefined,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>طلبات الأونلاين</span>
            {pendingCount > 0 && (
              <span
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 800,
                  borderRadius: '999px',
                  padding: '1px 6px',
                  lineHeight: '1.2',
                }}
              >
                {pendingCount}
              </span>
            )}
          </Button>
          <Button type="button" variant="secondary" onClick={() => { dispatchPosChromeToggle(); }}>القائمة F10</Button>
          <Button type="button" variant="secondary" onClick={() => { dispatchPosFullscreenToggle(); }}>ملء الشاشة F11</Button>
          {pos.ownOpenShift ? (
            <Link to="/cash-drawer">
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
