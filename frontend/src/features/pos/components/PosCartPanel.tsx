import { memo } from 'react';
import { Card } from '@/shared/ui/card';
import { PosCartMetaForm } from '@/features/pos/components/pos-cart-panel/PosCartMetaForm';
import { PosCartPaymentSection } from '@/features/pos/components/pos-cart-panel/PosCartPaymentSection';
import { PosCartItemsList } from '@/features/pos/components/pos-cart-panel/PosCartItemsList';
import { PosCartFooter } from '@/features/pos/components/pos-cart-panel/PosCartFooter';
import { getAlertMessages } from '@/features/pos/components/pos-cart-panel/posCartPanel.helpers';
import type { HeldPosDraftSummary, PosCartPanelProps } from '@/features/pos/components/pos-cart-panel/posCartPanel.types';

export type { HeldPosDraftSummary, PosCartPanelProps };

function PosCartPanelComponent(props: PosCartPanelProps) {
  const alertMessages = getAlertMessages(props);

  return (
    <Card
      title="2. مراجعة السلة والدفع"
      className="workspace-panel pos-checkout-card pos-checkout-card-compact"
    >
      <div className="pos-checkout-static">
        <PosCartMetaForm {...props} />
        <PosCartPaymentSection {...props} />

        {alertMessages.length ? (
          <div className="warning-box pos-alert-stack pos-compact-message" style={{ marginBottom: 10 }}>
            <strong>راجع قبل الإتمام:</strong>
            <ul>{alertMessages.map((message) => <li key={message}>{message}</li>)}</ul>
          </div>
        ) : null}
      </div>

      <div className="pos-checkout-scroll">
        <div className="pos-checkout-body">
          <PosCartItemsList {...props} />
          <PosCartFooter {...props} />
        </div>
      </div>
    </Card>
  );
}

function arePropsEqual(prev: PosCartPanelProps, next: PosCartPanelProps) {
  return prev.cart === next.cart
    && prev.customers === next.customers
    && prev.branches === next.branches
    && prev.locations === next.locations
    && prev.customerId === next.customerId
    && prev.branchId === next.branchId
    && prev.locationId === next.locationId
    && prev.paymentType === next.paymentType
    && prev.paymentChannel === next.paymentChannel
    && prev.paidAmount === next.paidAmount
    && prev.cashAmount === next.cashAmount
    && prev.cardAmount === next.cardAmount
    && prev.discount === next.discount
    && prev.note === next.note
    && prev.submitMessage === next.submitMessage
    && prev.lastSaleDocNo === next.lastSaleDocNo
    && prev.canShowLastSaleActions === next.canShowLastSaleActions
    && prev.quickCustomerName === next.quickCustomerName
    && prev.quickCustomerPhone === next.quickCustomerPhone
    && prev.isQuickCustomerPending === next.isQuickCustomerPending
    && prev.heldDrafts === next.heldDrafts
    && prev.isError === next.isError
    && prev.isPending === next.isPending
    && prev.totals === next.totals
    && prev.changeAmount === next.changeAmount
    && prev.amountDue === next.amountDue
    && prev.hasOpenShift === next.hasOpenShift
    && prev.canApplyDiscount === next.canApplyDiscount
    && prev.hasDiscountPermissionViolation === next.hasDiscountPermissionViolation
    && prev.hasPricePermissionViolation === next.hasPricePermissionViolation
    && prev.canSubmitSale === next.canSubmitSale
    && prev.canSubmitHint === next.canSubmitHint
    && prev.lastAddedLineKey === next.lastAddedLineKey
    && prev.selectedLineKey === next.selectedLineKey;
}

export const PosCartPanel = memo(PosCartPanelComponent, arePropsEqual);
