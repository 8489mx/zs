import { memo } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';

import type { PosWorkspaceState } from '@/features/pos/components/pos-workspace/posWorkspace.helpers';
import type { PosSaleMode } from '@/features/pos/lib/pos-sale-mode';
import { dispatchPosChromeToggle, dispatchPosFullscreenToggle } from '@/features/pos/lib/pos-shell';
import { ZErpIcon } from '@/shared/components/z-erp-brand';
import { usePosOfflineSync } from '@/features/pos/hooks/usePosOfflineSync';

function buildDescription(pos: PosWorkspaceState, offlineQueueCount: number) {
  if (offlineQueueCount > 0) return `يوجد ${offlineQueueCount} فواتير معلقة تنتظر عودة الإنترنت ليتم مزامنتها.`;
  if (!pos.hasOperationalSetup) return 'أكمل تعريف المتجر ونقطة التشغيل أولًا، ثم ارجع لنقطة البيع لإتمام البيع من نفس الشاشة.';
  if (!pos.hasCatalogReady) return 'أضف صنفًا واحدًا على الأقل حتى تظهر تجربة البيع اليومية بشكل كامل.';
  if (pos.requiresCashierShift && !pos.ownOpenShift) return 'افتح وردية لهذا المستخدم أولًا حتى يبدأ البيع النقدي أو الشبكة بدون تعطيل.';
  if (!pos.cart.length) return 'ابدأ بالباركود أو البحث السريع، ثم راجع السلة والدفع من العمود المقابل.';
  if (pos.canSubmitSale) return 'السلة جاهزة الآن. راجع الإجمالي والدفع ثم أكد البيع مباشرة.';
  return `راجع السلة الحالية. ${pos.canSubmitHint || 'أكمل المطلوب أولًا قبل تأكيد الفاتورة.'}`;
}



interface PosWorkspaceHeaderProps {
  pos: PosWorkspaceState;
  posMode: PosSaleMode;
  onModeChange: (mode: PosSaleMode) => void;
  onFocusSearch: () => void;
  onPrintDraft: () => void;
}

function PosWorkspaceHeaderComponent({ pos, posMode, onModeChange, onFocusSearch }: PosWorkspaceHeaderProps) {
  const { offlineQueue, isSyncing, hasFailedSales } = usePosOfflineSync();

  return (
    <PageHeader
      title="نقطة البيع"
      description={buildDescription(pos, offlineQueue.length)}
      badge={(
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', direction: 'ltr', color: '#0f172a' }} aria-label="Z ERP">
          <ZErpIcon size={38} />
          <strong style={{ fontSize: '16px', fontWeight: 900, letterSpacing: '0.04em', lineHeight: 1 }}>ERP</strong>
          {offlineQueue.length > 0 && (
            <span style={{ background: hasFailedSales ? '#dc3545' : '#fd7e14', color: 'white', padding: '2px 8px', borderRadius: '8px', fontSize: '12px', marginRight: '8px', direction: 'rtl' }}>
              {isSyncing ? 'جاري المزامنة...' : `أوفلاين (${offlineQueue.length})`}
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
          <Button type="button" variant="secondary" onClick={onFocusSearch}>البحث F3</Button>
          <Button type="button" variant="secondary" onClick={pos.reprintLastSale}>F9 إعادة طباعة آخر فاتورة</Button>
          <Button type="button" variant="secondary" onClick={() => { dispatchPosChromeToggle(); }}>القائمة F10</Button>
          <Button type="button" variant="secondary" onClick={() => { dispatchPosFullscreenToggle(); }}>ملء الشاشة F11</Button>
          <Link to="/cash-drawer"><Button type="button" variant={pos.ownOpenShift ? 'secondary' : 'primary'}>{pos.ownOpenShift ? 'تقفيل الوردية' : 'فتح وردية'}</Button></Link>
        </div>
      )}
    />
  );
}

function areEqual(prev: PosWorkspaceHeaderProps, next: PosWorkspaceHeaderProps) {
  return prev.pos.paymentType === next.pos.paymentType
    && prev.pos.paymentChannel === next.pos.paymentChannel
    && prev.pos.ownOpenShift === next.pos.ownOpenShift
    && prev.pos.hasOperationalSetup === next.pos.hasOperationalSetup
    && prev.pos.hasCatalogReady === next.pos.hasCatalogReady
    && prev.pos.requiresCashierShift === next.pos.requiresCashierShift
    && prev.pos.cart === next.pos.cart
    && prev.pos.lastSale === next.pos.lastSale
    && prev.pos.canSubmitSale === next.pos.canSubmitSale
    && prev.pos.canSubmitHint === next.pos.canSubmitHint
    && prev.posMode === next.posMode
    && prev.onFocusSearch === next.onFocusSearch
    && prev.onModeChange === next.onModeChange
    && prev.onPrintDraft === next.onPrintDraft;
}

export const PosWorkspaceHeader = memo(PosWorkspaceHeaderComponent, areEqual);
