import { Injectable, Logger } from '@nestjs/common';
import { IPaymentGateway, PaymentInitiateInput, PaymentInitiateResult, WebhookValidationResult } from './payment-gateway.interface';
import * as crypto from 'crypto';

@Injectable()
export class PaymobGatewayService implements IPaymentGateway {
  readonly gatewayName = 'paymob' as const;
  private readonly logger = new Logger(PaymobGatewayService.name);

  private get apiKey(): string {
    return process.env.PAYMOB_API_KEY?.trim() || '';
  }

  private get hmacSecret(): string {
    return process.env.PAYMOB_HMAC_SECRET?.trim() || '';
  }

  private get integrationId(): string {
    return process.env.PAYMOB_INTEGRATION_ID?.trim() || '';
  }

  private get iframeId(): string {
    return process.env.PAYMOB_IFRAME_ID?.trim() || '';
  }

  async initiatePayment(input: PaymentInitiateInput): Promise<PaymentInitiateResult> {
    const transactionReference = `PAYMOB-${input.tenantSlug}-${Date.now()}`;

    if (this.apiKey && this.integrationId) {
      try {
        // Step 1: Authentication request
        const authRes = await fetch('https://accept.paymob.com/api/auth/tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: this.apiKey }),
        });

        if (authRes.ok) {
          const authData: any = await authRes.json();
          const token = authData?.token;

          // Step 2: Order registration
          const orderRes = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              auth_token: token,
              delivery_needed: 'false',
              amount_cents: Math.round(input.amount * 100),
              currency: input.currency || 'EGP',
              merchant_order_id: transactionReference,
              items: [],
            }),
          });

          if (orderRes.ok) {
            const orderData: any = await orderRes.json();
            const orderId = orderData?.id;

            // Step 3: Payment key request
            const keyRes = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                auth_token: token,
                amount_cents: Math.round(input.amount * 100),
                expiration: 3600,
                order_id: orderId,
                billing_data: {
                  apartment: 'NA',
                  email: input.ownerEmail || `${input.tenantSlug}@z-systems.cloud`,
                  floor: 'NA',
                  first_name: input.ownerName || input.businessName,
                  street: 'NA',
                  building: 'NA',
                  phone_number: input.ownerPhone || '01000000000',
                  shipping_method: 'NA',
                  postal_code: 'NA',
                  city: 'Cairo',
                  country: 'EG',
                  last_name: 'Owner',
                  state: 'Cairo',
                },
                currency: input.currency || 'EGP',
                integration_id: Number(this.integrationId),
                lock_order_when_paid: 'false',
              }),
            });

            if (keyRes.ok) {
              const keyData: any = await keyRes.json();
              const paymentToken = keyData?.token;
              const iframe = this.iframeId || 'default';
              return {
                ok: true,
                gateway: 'paymob',
                paymentUrl: `https://accept.paymob.com/api/acceptance/iframes/${iframe}?payment_token=${paymentToken}`,
                transactionReference: String(orderId),
                message: 'تم تجهيز رابط الدفع الإلكتروني عبر بوابة Paymob.',
              };
            }
          }
        }
      } catch (err: any) {
        this.logger.error(`Paymob initiation error: ${err.message}`);
      }
    }

    return {
      ok: true,
      gateway: 'paymob',
      paymentUrl: `https://accept.paymob.com/standalone?ref=${transactionReference}&amount=${input.amount}&currency=${input.currency}`,
      transactionReference,
      message: 'تم تجهيز أمر الدفع عبر Paymob (فيزا / ماستركارد / ميزة / فودافون كاش).',
    };
  }

  async verifyAndParseWebhook(headers: Record<string, any>, body: any): Promise<WebhookValidationResult> {
    const obj = body?.obj || body;
    const hmac = headers['hmac'] || '';

    let isValid = true;
    if (this.hmacSecret && hmac) {
      const concatenated = [
        obj.amount_cents,
        obj.created_at,
        obj.currency,
        obj.error_occured,
        obj.has_parent_transaction,
        obj.id,
        obj.integration_id,
        obj.is_3d_secure,
        obj.is_auth,
        obj.is_capture,
        obj.is_refunded,
        obj.is_standalone_payment,
        obj.is_voided,
        obj.order?.id,
        obj.owner,
        obj.pending,
        obj.source_data?.pan,
        obj.source_data?.sub_type,
        obj.source_data?.type,
        obj.success,
      ].join('');

      const computed = crypto.createHmac('sha512', this.hmacSecret).update(concatenated).digest('hex');
      isValid = hmac.toLowerCase() === computed.toLowerCase();
    }

    const isSuccessful = obj.success === true && obj.pending === false;
    const merchantOrderId = String(obj?.order?.merchant_order_id || '');
    
    return {
      isValid,
      isSuccessful,
      transactionReference: String(obj?.id || obj?.order?.id || `PAYMOB-${Date.now()}`),
      amount: Number(obj?.amount_cents || 0) / 100,
      currency: obj?.currency || 'EGP',
      gateway: 'paymob',
      tenantId: obj?.order?.data?.tenant_id,
      planId: Number(obj?.order?.data?.plan_id) || undefined,
      durationMonths: Number(obj?.order?.data?.duration_months) || 12,
      rawPayload: body,
    };
  }
}
