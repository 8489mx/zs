export type PaymentInitiateInput = {
  tenantId: string;
  tenantSlug: string;
  businessName: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  planId: number;
  planName: string;
  amount: number;
  currency: string;
  durationMonths: number;
  redirectUrl?: string;
};

export type PaymentInitiateResult = {
  ok: boolean;
  paymentUrl: string;
  transactionReference: string;
  gateway: 'xpay' | 'paymob' | 'stripe' | 'fawry';
  message?: string;
};

export type WebhookValidationResult = {
  isValid: boolean;
  isSuccessful: boolean;
  /**
   * The gateway's own identifier for this transaction, used as the idempotency key
   * when granting subscription time.
   *
   * It must be empty when the payload did not carry one. Synthesising a reference
   * (e.g. `GATEWAY-${Date.now()}`) makes every retry of the same payment look like a
   * new payment, which is forbidden pattern F4 — that is exactly how a retried
   * webhook used to stack another billing period onto the tenant.
   */
  transactionReference: string;
  amount: number;
  currency: string;
  gateway: 'xpay' | 'paymob' | 'stripe' | 'fawry';
  tenantId?: string;
  planId?: number;
  durationMonths?: number;
  rawPayload?: any;
};

export interface IPaymentGateway {
  readonly gatewayName: 'xpay' | 'paymob' | 'stripe' | 'fawry';
  initiatePayment(input: PaymentInitiateInput): Promise<PaymentInitiateResult>;
  verifyAndParseWebhook(headers: Record<string, any>, body: any, rawBody?: Buffer): Promise<WebhookValidationResult>;
}
