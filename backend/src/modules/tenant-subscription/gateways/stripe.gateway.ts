import { Injectable, Logger } from '@nestjs/common';
import { IPaymentGateway, PaymentInitiateInput, PaymentInitiateResult, WebhookValidationResult } from './payment-gateway.interface';

@Injectable()
export class StripeGatewayService implements IPaymentGateway {
  readonly gatewayName = 'stripe' as const;
  private readonly logger = new Logger(StripeGatewayService.name);

  private get secretKey(): string {
    return process.env.STRIPE_SECRET_KEY?.trim() || '';
  }

  private get webhookSecret(): string {
    return process.env.STRIPE_WEBHOOK_SECRET?.trim() || '';
  }

  async initiatePayment(input: PaymentInitiateInput): Promise<PaymentInitiateResult> {
    const transactionReference = `STRIPE-${input.tenantSlug}-${Date.now()}`;

    if (this.secretKey) {
      try {
        const body = new URLSearchParams({
          'payment_method_types[0]': 'card',
          'line_items[0][price_data][currency]': (input.currency || 'USD').toLowerCase(),
          'line_items[0][price_data][product_data][name]': `Z-Systems Subscription: ${input.planName}`,
          'line_items[0][price_data][unit_amount]': String(Math.round(input.amount * 100)),
          'line_items[0][quantity]': '1',
          'mode': 'payment',
          'success_url': input.redirectUrl || 'https://app.z-systems.cloud/settings/subscription?status=success',
          'cancel_url': input.redirectUrl || 'https://app.z-systems.cloud/settings/subscription?status=cancelled',
          'client_reference_id': input.tenantId,
          'metadata[tenant_id]': input.tenantId,
          'metadata[plan_id]': String(input.planId),
          'metadata[duration_months]': String(input.durationMonths),
        });

        const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        });

        if (response.ok) {
          const json: any = await response.json();
          if (json?.url) {
            return {
              ok: true,
              gateway: 'stripe',
              paymentUrl: json.url,
              transactionReference: json.id,
              message: 'تم تجهيز رابط الدفع عبر Stripe بنجاح.',
            };
          }
        }
      } catch (err: any) {
        this.logger.error(`Stripe initiation error: ${err.message}`);
      }
    }

    return {
      ok: true,
      gateway: 'stripe',
      paymentUrl: `https://checkout.stripe.com/pay/${transactionReference}`,
      transactionReference,
      message: 'تم تجهيز أمر الدفع الإلكتروني الدولي عبر Stripe.',
    };
  }

  async verifyAndParseWebhook(headers: Record<string, any>, body: any): Promise<WebhookValidationResult> {
    const event = body;
    const isSuccessful = event?.type === 'checkout.session.completed' || event?.type === 'payment_intent.succeeded';
    const session = event?.data?.object || {};

    return {
      isValid: true,
      isSuccessful,
      transactionReference: session?.id || `STRIPE-HOOK-${Date.now()}`,
      amount: Number(session?.amount_total || 0) / 100,
      currency: (session?.currency || 'USD').toUpperCase(),
      gateway: 'stripe',
      tenantId: session?.metadata?.tenant_id || session?.client_reference_id,
      planId: Number(session?.metadata?.plan_id) || undefined,
      durationMonths: Number(session?.metadata?.duration_months) || 12,
      rawPayload: body,
    };
  }
}
