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
  verifyAndParseWebhook(headers: Record<string, any>, body: any): Promise<WebhookValidationResult>;
}
