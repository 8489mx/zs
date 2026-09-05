import { Inject, Injectable, Logger, NotFoundException, BadRequestException, UnauthorizedException, Optional } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { WhatsAppGatewayService } from '../settings/services/whatsapp-gateway.service';
import * as crypto from 'crypto';

export interface TenantPaymentConfig {
  enabled: boolean;
  provider: 'paymob' | 'xpay' | 'mock';
  apiKey: string;
  secretKey?: string;
  publicKey?: string;
  integrationId: string;
  iframeId: string;
  hmacSecret: string;
  testMode: boolean;
  xpayApiKey: string;
  xpayCommunityId: string;
  xpayTestMode: boolean;
}

@Injectable()
export class StorefrontPaymentService {
  private readonly logger = new Logger(StorefrontPaymentService.name);

  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    @Optional() private readonly whatsappService?: WhatsAppGatewayService,
  ) {}

  private async getTenantBySlug(slug: string) {
    const cleanSlug = String(slug || '').trim().toLowerCase();
    if (!cleanSlug || cleanSlug === 'admin') throw new NotFoundException('المتجر غير موجود');

    let tenant = await this.db
      .selectFrom('tenants')
      .selectAll()
      .where('slug', '=', cleanSlug)
      .executeTakeFirst();

    if (!tenant && cleanSlug.includes('.')) {
      tenant = await this.db
        .selectFrom('tenants')
        .selectAll()
        .where('custom_domain', '=', cleanSlug)
        .executeTakeFirst();
    }

    if (!tenant) {
      const slugSetting = await this.db
        .selectFrom('settings')
        .select('tenant_id')
        .where('key', '=', 'storefront_slug')
        .where(sql<boolean>`LOWER(TRIM(BOTH '"' FROM value)) = ${cleanSlug}`)
        .executeTakeFirst();

      if (slugSetting) {
        tenant = await this.db
          .selectFrom('tenants')
          .selectAll()
          .where('id', '=', slugSetting.tenant_id)
          .executeTakeFirst();
      }
    }

    if (!tenant && (cleanSlug === 'default' || cleanSlug === 'almhnds' || cleanSlug === 'slmhnds' || cleanSlug === 'elmhnds' || cleanSlug === 'almohandes' || cleanSlug === 'elmohandes')) {
      tenant = await this.db
        .selectFrom('tenants')
        .selectAll()
        .where('id', '=', 'default')
        .executeTakeFirst();

      if (!tenant) {
        tenant = await this.db
          .selectFrom('tenants')
          .selectAll()
          .orderBy('created_at', 'asc')
          .executeTakeFirst();
      }
    }

    if (!tenant) throw new NotFoundException('المتجر غير موجود');
    return tenant;
  }

  async getTenantPaymentConfig(tenantId: string): Promise<TenantPaymentConfig> {
    const rows = await this.db
      .selectFrom('settings')
      .select(['key', 'value'])
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .where('key', 'in', [
        'storefront_online_payment_enabled',
        'storefront_online_payment_provider',
        'storefront_paymob_api_key',
        'storefront_paymob_integration_id',
        'storefront_paymob_iframe_id',
        'storefront_paymob_hmac_secret',
        'storefront_paymob_test_mode',
        'storefront_xpay_api_key',
        'storefront_xpay_community_id',
        'storefront_xpay_test_mode',
      ])
      .execute();

    const map = new Map<string, string>();
    for (const r of rows) {
      try {
        const parsed = JSON.parse(r.value);
        map.set(r.key, typeof parsed === 'string' ? parsed : String(parsed));
      } catch {
        map.set(r.key, r.value);
      }
    }

    const enabled = map.get('storefront_online_payment_enabled') === 'true';
    const provider = (map.get('storefront_online_payment_provider') || 'paymob') as 'paymob' | 'xpay' | 'mock';
    const apiKey = map.get('storefront_paymob_api_key') || '';
    const integrationId = map.get('storefront_paymob_integration_id') || '';
    const iframeId = map.get('storefront_paymob_iframe_id') || '';
    const hmacSecret = map.get('storefront_paymob_hmac_secret') || '';
    const testMode = map.get('storefront_paymob_test_mode') !== 'false';
    const xpayApiKey = map.get('storefront_xpay_api_key') || '';
    const xpayCommunityId = map.get('storefront_xpay_community_id') || '';
    const xpayTestMode = map.get('storefront_xpay_test_mode') !== 'false';

    return {
      enabled,
      provider,
      apiKey,
      integrationId,
      iframeId,
      hmacSecret,
      testMode,
      xpayApiKey,
      xpayCommunityId,
      xpayTestMode,
    };
  }

  async initiatePaymentSession(slug: string, orderNumber: string) {
    const tenant = await this.getTenantBySlug(slug);
    const order = await this.db
      .selectFrom('online_orders')
      .selectAll()
      .where(sql<boolean>`tenant_id = ${tenant.id}`)
      .where('order_number', '=', orderNumber)
      .executeTakeFirst();

    if (!order) {
      throw new NotFoundException(`الطلب رقم ${orderNumber} غير موجود`);
    }

    if (order.payment_status === 'paid') {
      return {
        ok: true,
        isPaid: true,
        orderNumber: order.order_number,
        paymentStatus: 'paid',
        transactionId: order.gateway_transaction_id,
        message: 'تم سداد هذا الطلب بالفعل.',
      };
    }

    const totalAmount = Number(order.total_amount || 0);
    if (totalAmount <= 0) {
      throw new BadRequestException('إجمالي الطلب غير صحيح للدفع الإلكتروني.');
    }

    const config = await this.getTenantPaymentConfig(tenant.id);
    if (!config.enabled) {
      throw new BadRequestException('الدفع الإلكتروني غير مفعل في هذا المتجر حالياً.');
    }

    // Try Live Paymob Flow if provider is paymob and API key & Integration ID are present
    if (config.provider === 'paymob' && !config.testMode && config.apiKey && config.integrationId) {
      try {
        const authRes = await fetch('https://accept.paymob.com/api/auth/tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: config.apiKey }),
        });

        if (authRes.ok) {
          const authData: any = await authRes.json();
          const token = authData?.token;

          const merchantOrderId = `${tenant.id}__${order.order_number}`;

          const orderRes = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              auth_token: token,
              delivery_needed: 'false',
              amount_cents: Math.round(totalAmount * 100),
              currency: 'EGP',
              merchant_order_id: merchantOrderId,
              items: [],
            }),
          });

          if (orderRes.ok) {
            const orderData: any = await orderRes.json();
            const paymobOrderId = orderData?.id;

            const keyRes = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                auth_token: token,
                amount_cents: Math.round(totalAmount * 100),
                expiration: 3600,
                order_id: paymobOrderId,
                billing_data: {
                  first_name: order.customer_name?.split(' ')[0] || 'Customer',
                  last_name: order.customer_name?.split(' ').slice(1).join(' ') || 'Storefront',
                  email: 'customer@z-systems.cloud',
                  phone_number: order.customer_phone || '01000000000',
                  apartment: 'NA',
                  floor: 'NA',
                  street: order.customer_address || 'NA',
                  building: 'NA',
                  shipping_method: 'NA',
                  postal_code: 'NA',
                  city: 'Cairo',
                  country: 'EG',
                  state: 'Cairo',
                },
                currency: 'EGP',
                integration_id: Number(config.integrationId),
                lock_order_when_paid: 'false',
              }),
            });

            if (keyRes.ok) {
              const keyData: any = await keyRes.json();
              const paymentToken = keyData?.token;
              const iframe = config.iframeId || 'default';

              await this.db
                .updateTable('online_orders')
                .set({
                  gateway_provider: 'paymob',
                  gateway_order_id: String(paymobOrderId),
                  updated_at: new Date(),
                })
                .where('id', '=', order.id)
                .execute();

              return {
                ok: true,
                mode: 'paymob',
                provider: 'paymob',
                orderNumber: order.order_number,
                amount: totalAmount,
                paymentToken,
                iframeId: iframe,
                iframeUrl: `https://accept.paymob.com/api/acceptance/iframes/${iframe}?payment_token=${paymentToken}`,
                orderId: String(paymobOrderId),
                testMode: false,
              };
            }
          }
        }
      } catch (err: any) {
        this.logger.error(`Live Paymob initiation error: ${err.message}`);
      }
    }

    // Try Live XPay Flow if provider is xpay and credentials are present
    if (config.provider === 'xpay') {
      if (config.xpayApiKey && config.xpayCommunityId) {
        try {
          const xpayBase = config.xpayTestMode ? 'https://staging.xpay.app' : 'https://community.xpay.app';
          const phone = order.customer_phone || '01000000000';
          const formattedPhone = phone.startsWith('+') ? phone : (phone.startsWith('0') ? `+2${phone}` : `+20${phone}`);

          const xpayRes = await fetch(`${xpayBase}/api/v1/payments/pay/variable-amount`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': config.xpayApiKey,
            },
            body: JSON.stringify({
              billing_data: {
                name: order.customer_name || 'Customer',
                email: 'customer@z-systems.cloud',
                phone_number: formattedPhone,
              },
              amount: totalAmount,
              currency: 'EGP',
              community_id: config.xpayCommunityId,
              pay_using: 'card',
              custom_fields: [
                { field_label: 'OrderNumber', value: order.order_number },
                { field_label: 'TenantId', value: tenant.id },
              ],
            }),
          });

          if (xpayRes.ok) {
            const xpayData: any = await xpayRes.json();
            const iframeUrl = xpayData?.data?.iframe_url || xpayData?.data?.payment_url;
            const txnId = xpayData?.data?.transaction_id || xpayData?.data?.transaction_uuid;

            if (iframeUrl) {
              await this.db
                .updateTable('online_orders')
                .set({
                  gateway_provider: 'xpay',
                  gateway_order_id: String(txnId || ''),
                  updated_at: new Date(),
                })
                .where('id', '=', order.id)
                .execute();

              return {
                ok: true,
                mode: 'xpay',
                provider: 'xpay',
                orderNumber: order.order_number,
                amount: totalAmount,
                iframeUrl,
                transactionId: String(txnId || ''),
                testMode: config.xpayTestMode,
              };
            }
          } else {
            const errText = await xpayRes.text();
            this.logger.error(`XPay API response error (${xpayRes.status}): ${errText}`);
          }
        } catch (err: any) {
          this.logger.error(`Live XPay initiation error: ${err.message}`);
        }
      }

      // Default XPay Sandbox Simulator
      return {
        ok: true,
        mode: 'mock',
        provider: 'xpay',
        orderNumber: order.order_number,
        amount: totalAmount,
        testMode: true,
        message: 'تم تجهيز جلسة الدفع عبر إكس باي في الوضع التجريبي (XPay Sandbox Mode).',
      };
    }

    // Default: Mock / Sandbox Simulator Mode
    return {
      ok: true,
      mode: 'mock',
      provider: config.provider || 'mock',
      orderNumber: order.order_number,
      amount: totalAmount,
      testMode: true,
      message: 'تم تجهيز جلسة الدفع بالبطاقة البنكية في الوضع التجريبي الآمن (Sandbox Mode).',
    };
  }

  async processPaymobWebhook(headers: Record<string, any>, body: any) {
    const obj = body?.obj || body;
    const merchantOrderId = String(obj?.order?.merchant_order_id || '');

    let tenantId = '';
    let orderNumber = '';

    if (merchantOrderId.includes('__')) {
      const parts = merchantOrderId.split('__');
      tenantId = parts[0];
      orderNumber = parts.slice(1).join('__');
    } else {
      orderNumber = merchantOrderId;
    }

    // Lookup order
    let orderQuery = this.db.selectFrom('online_orders').selectAll();
    if (tenantId) {
      orderQuery = orderQuery.where(sql<boolean>`tenant_id = ${tenantId}`);
    }
    if (orderNumber) {
      orderQuery = orderQuery.where('order_number', '=', orderNumber);
    } else if (obj?.order?.id) {
      orderQuery = orderQuery.where('gateway_order_id', '=', String(obj.order.id));
    }

    const order = await orderQuery.executeTakeFirst();
    if (!order) {
      this.logger.warn(`Paymob Webhook received for unknown order: ${merchantOrderId}`);
      return { ok: false, message: 'Order not found' };
    }

    // Validate HMAC if tenant has secret configured
    const config = await this.getTenantPaymentConfig(order.tenant_id);
    const hmacHeader = (headers['hmac'] || headers['HMAC'] || '') as string;

    if (config.hmacSecret && hmacHeader) {
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

      const computedHmac = crypto.createHmac('sha512', config.hmacSecret).update(concatenated).digest('hex');
      if (hmacHeader.toLowerCase() !== computedHmac.toLowerCase()) {
        this.logger.error(`Paymob HMAC verification failed for order ${order.order_number}`);
        throw new UnauthorizedException('توقيع HMAC غير صحيح.');
      }
    }

    const isSuccessful = obj.success === true && obj.pending === false;

    if (isSuccessful) {
      await this.db
        .updateTable('online_orders')
        .set({
          payment_status: 'paid',
          status: 'confirmed',
          gateway_provider: 'paymob',
          gateway_transaction_id: String(obj.id || ''),
          gateway_order_id: String(obj.order?.id || order.gateway_order_id || ''),
          gateway_response_json: JSON.stringify(body),
          paid_at: new Date(),
          updated_at: new Date(),
        })
        .where('id', '=', order.id)
        .execute();

      // Trigger WhatsApp notification
      if (this.whatsappService) {
        void this.whatsappService.sendOnlineOrderNotification(order.id, order.tenant_id).catch(() => undefined);
      }

      this.logger.log(`Order ${order.order_number} marked as PAID via Paymob Webhook.`);
      return { ok: true, status: 'paid', orderNumber: order.order_number };
    } else {
      await this.db
        .updateTable('online_orders')
        .set({
          payment_status: 'failed',
          gateway_response_json: JSON.stringify(body),
          updated_at: new Date(),
        })
        .where('id', '=', order.id)
        .execute();

      return { ok: true, status: 'failed', orderNumber: order.order_number };
    }
  }

  async processXPayWebhook(headers: Record<string, any>, body: any) {
    this.logger.log(`XPay Webhook received: ${JSON.stringify(body)}`);
    const data = body?.data || body;
    const transactionStatus = String(data?.transaction_status || body?.transaction_status || data?.status || '').toUpperCase();
    const transactionId = String(data?.transaction_id || data?.id || body?.transaction_id || '');

    // Extract orderNumber from custom_fields or payload
    let orderNumber = '';
    let tenantId = '';
    const customFields = Array.isArray(data?.custom_fields) ? data.custom_fields : Array.isArray(body?.custom_fields) ? body.custom_fields : [];
    for (const f of customFields) {
      if (f.field_label === 'OrderNumber' || f.label === 'OrderNumber') orderNumber = String(f.value || '');
      if (f.field_label === 'TenantId' || f.label === 'TenantId') tenantId = String(f.value || '');
    }

    let orderQuery = this.db.selectFrom('online_orders').selectAll();
    if (tenantId) {
      orderQuery = orderQuery.where(sql<boolean>`tenant_id = ${tenantId}`);
    }
    if (orderNumber) {
      orderQuery = orderQuery.where('order_number', '=', orderNumber);
    } else if (transactionId) {
      orderQuery = orderQuery.where('gateway_order_id', '=', transactionId);
    }

    const order = await orderQuery.executeTakeFirst();
    if (!order) {
      this.logger.warn(`XPay Webhook received for unknown order. Transaction: ${transactionId}, Order: ${orderNumber}`);
      return { ok: false, message: 'Order not found' };
    }

    const isSuccessful = transactionStatus === 'SUCCESSFUL' || transactionStatus === 'SUCCESS' || transactionStatus === 'PAID';

    if (isSuccessful) {
      await this.db
        .updateTable('online_orders')
        .set({
          payment_status: 'paid',
          status: 'confirmed',
          gateway_provider: 'xpay',
          gateway_transaction_id: transactionId,
          gateway_response_json: JSON.stringify(body),
          paid_at: new Date(),
          updated_at: new Date(),
        })
        .where('id', '=', order.id)
        .execute();

      if (this.whatsappService) {
        void this.whatsappService.sendOnlineOrderNotification(order.id, order.tenant_id).catch(() => undefined);
      }

      this.logger.log(`Order ${order.order_number} marked as PAID via XPay Webhook.`);
      return { ok: true, status: 'paid', orderNumber: order.order_number };
    } else {
      await this.db
        .updateTable('online_orders')
        .set({
          payment_status: 'failed',
          gateway_response_json: JSON.stringify(body),
          updated_at: new Date(),
        })
        .where('id', '=', order.id)
        .execute();

      return { ok: true, status: 'failed', orderNumber: order.order_number };
    }
  }

  async processMockPayment(slug: string, orderNumber: string, payload?: { cardNumber?: string; cardHolder?: string }) {
    const tenant = await this.getTenantBySlug(slug);
    const order = await this.db
      .selectFrom('online_orders')
      .selectAll()
      .where(sql<boolean>`tenant_id = ${tenant.id}`)
      .where('order_number', '=', orderNumber)
      .executeTakeFirst();

    if (!order) {
      throw new NotFoundException(`الطلب رقم ${orderNumber} غير موجود`);
    }

    const transactionId = `MOCK-TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    await this.db
      .updateTable('online_orders')
      .set({
        payment_status: 'paid',
        status: 'confirmed',
        gateway_provider: 'mock',
        gateway_transaction_id: transactionId,
        paid_at: new Date(),
        gateway_response_json: JSON.stringify({
          mock: true,
          cardHolder: payload?.cardHolder || 'عميل تجريبي',
          last4: payload?.cardNumber ? payload.cardNumber.slice(-4) : '4242',
          paidAt: new Date().toISOString(),
        }),
        updated_at: new Date(),
      })
      .where('id', '=', order.id)
      .execute();

    // Trigger WhatsApp notification
    if (this.whatsappService) {
      void this.whatsappService.sendOnlineOrderNotification(order.id, tenant.id).catch(() => undefined);
    }

    return {
      ok: true,
      orderNumber: order.order_number,
      paymentStatus: 'paid',
      transactionId,
      message: 'تم سداد الطلب بنجاح في الوضع التجريبي (Sandbox Mock)!',
    };
  }

  async getOrderPaymentStatus(slug: string, orderNumber: string) {
    const tenant = await this.getTenantBySlug(slug);
    const order = await this.db
      .selectFrom('online_orders')
      .selectAll()
      .where(sql<boolean>`tenant_id = ${tenant.id}`)
      .where('order_number', '=', orderNumber)
      .executeTakeFirst();

    if (!order) {
      throw new NotFoundException(`الطلب رقم ${orderNumber} غير موجود`);
    }

    return {
      ok: true,
      orderNumber: order.order_number,
      paymentStatus: order.payment_status || 'pending',
      orderStatus: order.status,
      totalAmount: Number(order.total_amount || 0),
      gatewayProvider: order.gateway_provider || null,
      gatewayTransactionId: order.gateway_transaction_id || null,
      paidAt: order.paid_at || null,
    };
  }
}
