import { Card } from '@/components/ui/Card';
import { PosCartSummary } from '@/features/pos/components/pos-cart-panel/PosCartSummary';
import { PosCartMetaForm } from '@/features/pos/components/pos-cart-panel/PosCartMetaForm';
import { PosCartPaymentSection } from '@/features/pos/components/pos-cart-panel/PosCartPaymentSection';
import { PosCartItemsList } from '@/features/pos/components/pos-cart-panel/PosCartItemsList';
import { PosCartFooter } from '@/features/pos/components/pos-cart-panel/PosCartFooter';
import { getAlertMessages } from '@/features/pos/components/pos-cart-panel/posCartPanel.helpers';
import type { HeldPosDraftSummary, PosCartPanelProps } from '@/features/pos/components/pos-cart-panel/posCartPanel.types';

export type { HeldPosDraftSummary, PosCartPanelProps };

export function PosCartPanel(props: PosCartPanelProps) {
  const alertMessages = getAlertMessages(props);

  return (
    <Card title="مراجعة السلة والدفع" actions={<span className="nav-pill">{props.cart.length} عناصر</span>} className="workspace-panel pos-checkout-card">
      <PosCartSummary {...props} />
      <PosCartMetaForm {...props} />
      <PosCartPaymentSection {...props} />

      {alertMessages.length ? (
        <div className="warning-box pos-alert-stack" style={{ marginBottom: 12 }}>
          <strong>راجع هذه النقاط قبل الإتمام:</strong>
          <ul>{alertMessages.map((message) => <li key={message}>{message}</li>)}</ul>
        </div>
      ) : null}

      <PosCartItemsList {...props} />
      <PosCartFooter {...props} />
    </Card>
  );
}
