import { memo } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { paymentLabel } from '@/features/pos/lib/pos-workspace.helpers';
import type { PosWorkspaceState } from '@/features/pos/components/pos-workspace/posWorkspace.helpers';
import type { PosSaleMode } from '@/features/pos/lib/pos-sale-mode';
import { dispatchPosChromeToggle, dispatchPosFullscreenToggle } from '@/features/pos/lib/pos-shell';

function buildDescription(pos: PosWorkspaceState) {
  if (!pos.hasOperationalSetup) return 'أكمل تعريف المتجر ونقطة التشغيل أولًا، ثم ارجع للكاشير لإتمام البيع من نفس الشاشة.';
  if (!pos.hasCatalogReady) return 'أضف صنفًا واحدًا على الأقل حتى تظهر تجربة البيع اليومية بشكل كامل.';
  if (pos.requiresCashierShift && !pos.ownOpenShift) return 'افتح وردية لهذا المستخدم أولًا حتى يبدأ البيع النقدي أو الشبكة بدون تعطيل.';
  if (!pos.cart.length) return 'ابدأ بالباركود أو البحث السريع، ثم راجع السلة والدفع من العمود المقابل.';
  if (pos.canSubmitSale) return 'السلة جاهزة الآن. راجع الإجمالي والدفع ثم أكد البيع مباشرة.';
  return `راجع السلة الحالية. ${pos.canSubmitHint || 'أكمل المطلوب أولًا قبل تأكيد الفاتورة.'}`;
}

function getShiftHeaderLabel(pos: PosWorkspaceState) {
  if (!pos.ownOpenShift) return 'لا توجد وردية';
  const openedByName = String(pos.ownOpenShift.openedByName || '').trim();
  const docNo = String(pos.ownOpenShift.docNo || '').trim();
  if (openedByName && docNo) return `الوردية ${openedByName} — ${docNo}`;
  return `الوردية ${openedByName || docNo || 'مفتوحة'}`;
}

interface PosWorkspaceHeaderProps {
  pos: PosWorkspaceState;
  posMode: PosSaleMode;
  onModeChange: (mode: PosSaleMode) => void;
  onFocusSearch: () => void;
  onPrintDraft: () => void;
}

function PosWorkspaceHeaderComponent({ pos, posMode, onModeChange, onFocusSearch, onPrintDraft }: PosWorkspaceHeaderProps) {
  const paymentMode = paymentLabel(pos.paymentType, pos.paymentChannel);

  return (
    <PageHeader
      title="الكاشير"
      description={buildDescription(pos)}
      badge={<span className="nav-pill">نقطة البيع</span>}
      className="page-header--dense pos-page-header pos-page-header-streamlined"
      actions={(
        <div className="actions compact-actions pos-header-actions-row pos-header-toolbar-single">
          <span className="toolbar-meta-pill">{getShiftHeaderLabel(pos)}</span>
          <span className="toolbar-meta-pill">الدفع {paymentMode}</span>

          <div className="pos-mode-toggle" role="group" aria-label="POS mode">
            <Button type="button" variant={posMode === 'scanner' ? 'primary' : 'secondary'} onClick={() => onModeChange('scanner')}>سكانر</Button>
            <Button type="button" variant={posMode === 'touch' ? 'primary' : 'secondary'} onClick={() => onModeChange('touch')}>تاتش</Button>
          </div>
          <Button type="button" variant="secondary" onClick={() => { if (pos.selectedLineKey) pos.editSelectedQty(); else onFocusSearch(); }}>تعديل الكمية</Button>
          <Button type="button" variant="secondary" onClick={onFocusSearch}>البحث F3</Button>
          <Button type="button" variant="secondary" onClick={() => { void pos.holdDraft(); }} disabled={!pos.cart.length}>تعليق F4</Button>
          <Button type="button" variant="secondary" onClick={onPrintDraft} disabled={!pos.cart.length}>طباعة F8</Button>
          <Button type="button" variant="secondary" onClick={() => { dispatchPosChromeToggle(); }}>القائمة F10</Button>
          <Button type="button" variant="secondary" onClick={() => { dispatchPosFullscreenToggle(); }}>ملء الشاشة F11</Button>
          <Link to="/cash-drawer"><Button type="button" variant={pos.ownOpenShift ? 'secondary' : 'primary'}>{pos.ownOpenShift ? 'الوردية' : 'فتح وردية'}</Button></Link>
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
    && prev.pos.canSubmitSale === next.pos.canSubmitSale
    && prev.pos.canSubmitHint === next.pos.canSubmitHint
    && prev.posMode === next.posMode
    && prev.onFocusSearch === next.onFocusSearch
    && prev.onModeChange === next.onModeChange
    && prev.onPrintDraft === next.onPrintDraft;
}

export const PosWorkspaceHeader = memo(PosWorkspaceHeaderComponent, areEqual);
