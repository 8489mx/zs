import { strict as assert } from 'node:assert';
import * as crypto from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import { StorefrontPaymentService } from '../../src/modules/storefront/storefront-payment.service';

/**
 * Critical Regression Test Suite for Storefront Payment Webhooks (Invariant O25)
 * Verifies fail-closed behavior, cryptographic signature verification, replay protection,
 * and idempotency across Paymob, XPay, Tap, and Stripe storefront webhook handlers.
 */

interface MockOrder {
  id: number;
  tenant_id: string;
  order_number: string;
  total_amount: number;
  payment_status: string;
  status: string;
  gateway_provider?: string;
  gateway_transaction_id?: string;
  gateway_order_id?: string;
}

function createMockDb(orders: MockOrder[], settingsMap: Record<string, string>) {
  const db: any = {
    selectFrom: (table: string) => {
      if (table === 'settings') {
        return {
          select: () => ({
            where: () => ({
              where: (col: any, op: any, val: any) => ({
                execute: async () => {
                  return Object.entries(settingsMap).map(([key, value]) => ({ key, value }));
                },
              }),
            }),
          }),
        };
      }
      if (table === 'online_orders') {
        return {
          selectAll: () => ({
            where: (col: any, op: any, val: any) => ({
              where: (col2: any, op2: any, val2: any) => ({
                executeTakeFirst: async () => {
                  return orders.find((o) => (col2 === 'order_number' ? o.order_number === val2 : o.gateway_order_id === val2));
                },
                execute: async () => {
                  return orders.filter((o) => (col2 === 'order_number' ? o.order_number === val2 : o.gateway_order_id === val2));
                },
              }),
              limit: (n: number) => ({
                execute: async () => orders.slice(0, n),
              }),
              executeTakeFirst: async () => orders[0],
            }),
          }),
        };
      }
      return {};
    },
    updateTable: (table: string) => ({
      set: (updates: any) => ({
        where: (col: any, op: any, val: any) => ({
          where: () => ({
            execute: async () => {
              const order = orders.find((o) => o.id === val);
              if (order) Object.assign(order, updates);
            },
          }),
        }),
      }),
    }),
  };
  return db;
}

async function testPaymobFailClosed(): Promise<void> {
  const order: MockOrder = {
    id: 1,
    tenant_id: 'tenant-1',
    order_number: 'ON-260920-0001',
    total_amount: 150,
    payment_status: 'pending',
    status: 'pending',
  };

  // 1. Fail-closed when hmac secret is unset
  {
    const db = createMockDb([order], {
      storefront_paymob_hmac_secret: '',
    });
    const service = new StorefrontPaymentService(db);
    const body = {
      obj: {
        id: 12345,
        success: true,
        pending: false,
        amount_cents: 15000,
        currency: 'EGP',
        order: { id: 999, merchant_order_id: 'tenant-1__ON-260920-0001' },
      },
    };

    await assert.rejects(
      async () => service.processPaymobWebhook({ hmac: 'some-hash' }, body),
      (err: any) => err instanceof UnauthorizedException,
      'Paymob webhook must be rejected when hmacSecret is not configured',
    );
  }

  // 2. Fail-closed when hmac header is missing
  {
    const db = createMockDb([order], {
      storefront_paymob_hmac_secret: 'my-paymob-secret',
    });
    const service = new StorefrontPaymentService(db);
    const body = {
      obj: {
        id: 12345,
        success: true,
        pending: false,
        amount_cents: 15000,
        currency: 'EGP',
        order: { id: 999, merchant_order_id: 'tenant-1__ON-260920-0001' },
      },
    };

    await assert.rejects(
      async () => service.processPaymobWebhook({}, body),
      (err: any) => err instanceof UnauthorizedException,
      'Paymob webhook must be rejected when hmac header is missing',
    );
  }

  // 3. Fail-closed when hmac is forged / invalid
  {
    const db = createMockDb([order], {
      storefront_paymob_hmac_secret: 'my-paymob-secret',
    });
    const service = new StorefrontPaymentService(db);
    const body = {
      obj: {
        id: 12345,
        success: true,
        pending: false,
        amount_cents: 15000,
        currency: 'EGP',
        order: { id: 999, merchant_order_id: 'tenant-1__ON-260920-0001' },
      },
    };

    await assert.rejects(
      async () => service.processPaymobWebhook({ hmac: 'forged-hash-1234' }, body),
      (err: any) => err instanceof UnauthorizedException,
      'Paymob webhook must be rejected when hmac signature does not match',
    );
  }

  // 4. Accepts valid HMAC
  {
    const db = createMockDb([{ ...order }], {
      storefront_paymob_hmac_secret: 'my-paymob-secret',
    });
    const service = new StorefrontPaymentService(db);
    const obj: any = {
      amount_cents: 15000,
      created_at: '2026-09-20T10:00:00.000Z',
      currency: 'EGP',
      error_occured: false,
      has_parent_transaction: false,
      id: 12345,
      integration_id: 111,
      is_3d_secure: true,
      is_auth: false,
      is_capture: false,
      is_refunded: false,
      is_standalone_payment: true,
      is_voided: false,
      order: { id: 999, merchant_order_id: 'tenant-1__ON-260920-0001' },
      owner: 10,
      pending: false,
      source_data: { pan: '2345', sub_type: 'MasterCard', type: 'card' },
      success: true,
    };

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

    const validHmac = crypto.createHmac('sha512', 'my-paymob-secret').update(concatenated).digest('hex');
    const result = await service.processPaymobWebhook({ hmac: validHmac }, { obj });
    assert.equal(result.ok, true);
    assert.equal(result.status, 'paid');
  }

  // 5. Idempotent: already paid order returns without error and does not re-process
  {
    const paidOrder: MockOrder = { ...order, payment_status: 'paid' };
    const db = createMockDb([paidOrder], {
      storefront_paymob_hmac_secret: 'my-paymob-secret',
    });
    const service = new StorefrontPaymentService(db);
    const result = await service.processPaymobWebhook({}, { obj: { order: { merchant_order_id: 'tenant-1__ON-260920-0001' } } });
    assert.equal(result.ok, true);
    assert.equal(result.alreadyPaid, true);
  }

  console.log('  -> Paymob: fail-closed without secret/signature, rejects forged HMAC, accepts valid signature, idempotent.');
}

async function testXPayFailClosed(): Promise<void> {
  const order: MockOrder = {
    id: 2,
    tenant_id: 'tenant-1',
    order_number: 'ON-260920-0002',
    total_amount: 250,
    payment_status: 'pending',
    status: 'pending',
  };

  const body = {
    data: {
      transaction_status: 'SUCCESSFUL',
      transaction_id: 'txn_9988',
      custom_fields: [
        { field_label: 'OrderNumber', value: 'ON-260920-0002' },
        { field_label: 'TenantId', value: 'tenant-1' },
      ],
    },
  };
  const rawBody = Buffer.from(JSON.stringify(body));

  // 1. Fail-closed when secret is unset
  {
    const db = createMockDb([order], {
      storefront_xpay_api_key: '',
    });
    const service = new StorefrontPaymentService(db);
    await assert.rejects(
      async () => service.processXPayWebhook({ 'x-xpay-signature': 'any-sig' }, body, rawBody),
      (err: any) => err instanceof UnauthorizedException,
      'XPay webhook must be rejected when xpayApiKey is unset',
    );
  }

  // 2. Fail-closed when signature is missing
  {
    const db = createMockDb([order], {
      storefront_xpay_api_key: 'xpay-secret-123',
    });
    const service = new StorefrontPaymentService(db);
    await assert.rejects(
      async () => service.processXPayWebhook({}, body, rawBody),
      (err: any) => err instanceof UnauthorizedException,
      'XPay webhook must be rejected when signature header is missing',
    );
  }

  // 3. Fail-closed when signature is forged
  {
    const db = createMockDb([order], {
      storefront_xpay_api_key: 'xpay-secret-123',
    });
    const service = new StorefrontPaymentService(db);
    await assert.rejects(
      async () => service.processXPayWebhook({ 'x-xpay-signature': 'deadbeef'.repeat(8) }, body, rawBody),
      (err: any) => err instanceof UnauthorizedException,
      'XPay webhook must be rejected when signature is forged',
    );
  }

  // 4. Accepts valid HMAC-SHA256 signature
  {
    const db = createMockDb([{ ...order }], {
      storefront_xpay_api_key: 'xpay-secret-123',
    });
    const service = new StorefrontPaymentService(db);
    const validSig = crypto.createHmac('sha256', 'xpay-secret-123').update(rawBody).digest('hex');
    const result = await service.processXPayWebhook({ 'x-xpay-signature': validSig }, body, rawBody);
    assert.equal(result.ok, true);
    assert.equal(result.status, 'paid');
  }

  console.log('  -> XPay: fail-closed without secret/signature, rejects forged signature, accepts valid HMAC-SHA256.');
}

async function testStripeFailClosed(): Promise<void> {
  const order: MockOrder = {
    id: 3,
    tenant_id: 'tenant-1',
    order_number: 'ON-260920-0003',
    total_amount: 300,
    payment_status: 'pending',
    status: 'pending',
  };

  const body = {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_123',
        client_reference_id: 'tenant-1__ON-260920-0003',
        payment_intent: 'pi_test_999',
      },
    },
  };
  const rawBody = Buffer.from(JSON.stringify(body));

  // 1. Fail-closed when stripeWebhookSecret is unset
  {
    const db = createMockDb([order], {
      storefront_stripe_webhook_secret: '',
    });
    const service = new StorefrontPaymentService(db);
    await assert.rejects(
      async () => service.processStripeWebhook({ 'stripe-signature': 't=123,v1=abc' }, body, rawBody),
      (err: any) => err instanceof UnauthorizedException,
      'Stripe webhook must be rejected when stripeWebhookSecret is unset',
    );
  }

  // 2. Fail-closed when signature header is missing
  {
    const db = createMockDb([order], {
      storefront_stripe_webhook_secret: 'whsec_stripe_test',
    });
    const service = new StorefrontPaymentService(db);
    await assert.rejects(
      async () => service.processStripeWebhook({}, body, rawBody),
      (err: any) => err instanceof UnauthorizedException,
      'Stripe webhook must be rejected when stripe-signature is missing',
    );
  }

  // 3. Fail-closed when timestamp is stale (> 300s replay protection)
  {
    const db = createMockDb([order], {
      storefront_stripe_webhook_secret: 'whsec_stripe_test',
    });
    const service = new StorefrontPaymentService(db);
    const staleTimestamp = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago
    const signedPayload = `${staleTimestamp}.${rawBody.toString('utf8')}`;
    const sig = crypto.createHmac('sha256', 'whsec_stripe_test').update(signedPayload).digest('hex');
    await assert.rejects(
      async () => service.processStripeWebhook({ 'stripe-signature': `t=${staleTimestamp},v1=${sig}` }, body, rawBody),
      (err: any) => err instanceof UnauthorizedException,
      'Stripe webhook must be rejected when timestamp is stale (> 300s)',
    );
  }

  // 4. Accepts valid signature within timestamp tolerance
  {
    const db = createMockDb([{ ...order }], {
      storefront_stripe_webhook_secret: 'whsec_stripe_test',
    });
    const service = new StorefrontPaymentService(db);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${currentTimestamp}.${rawBody.toString('utf8')}`;
    const validSig = crypto.createHmac('sha256', 'whsec_stripe_test').update(signedPayload).digest('hex');
    const result = await service.processStripeWebhook(
      { 'stripe-signature': `t=${currentTimestamp},v1=${validSig}` },
      body,
      rawBody,
    );
    assert.equal(result.ok, true);
    assert.equal(result.status, 'paid');
  }

  console.log('  -> Stripe: fail-closed without secret/signature, enforces 300s replay protection, accepts valid signature.');
}

async function testTapFailClosed(): Promise<void> {
  const order: MockOrder = {
    id: 4,
    tenant_id: 'tenant-1',
    order_number: 'ON-260920-0004',
    total_amount: 400,
    payment_status: 'pending',
    status: 'pending',
  };

  const body: any = {
    id: 'chg_test_456',
    status: 'CAPTURED',
    amount: 400,
    currency: 'SAR',
    metadata: {
      orderNumber: 'ON-260920-0004',
      tenantId: 'tenant-1',
    },
  };

  // 1. Fail-closed when tapSecretKey is unset
  {
    const db = createMockDb([order], {
      storefront_tap_secret_key: '',
    });
    const service = new StorefrontPaymentService(db);
    await assert.rejects(
      async () => service.processTapWebhook({ hashstring: 'some-hash' }, body),
      (err: any) => err instanceof UnauthorizedException,
      'Tap webhook must be rejected when tapSecretKey is unset',
    );
  }

  // 2. Accepts valid HMAC hashstring
  {
    const db = createMockDb([{ ...order }], {
      storefront_tap_secret_key: 'sk_test_tap_123',
    });
    const service = new StorefrontPaymentService(db);
    const strToHash = `${body.id || ''}${Number(body.amount || 0).toFixed(2)}${body.currency || ''}${body.gateway?.reference || ''}${body.payment_reference || ''}${body.status || ''}${body.created || ''}`;
    const validHash = crypto.createHmac('sha256', 'sk_test_tap_123').update(strToHash).digest('hex');
    const result = await service.processTapWebhook({ hashstring: validHash }, body);
    assert.equal(result.ok, true);
    assert.equal(result.status, 'paid');
  }

  console.log('  -> Tap: fail-closed without secret key, validates HMAC hashstring.');
}

async function testOnlinePaidOrderSaleConversion(): Promise<void> {
  const onlineOrder: MockOrder = {
    id: 10,
    tenant_id: 'tenant-1',
    order_number: 'ON-260920-0010',
    total_amount: 500,
    payment_status: 'paid',
    status: 'confirmed',
    gateway_provider: 'paymob',
  };

  let capturedSalePayload: any = null;
  const mockSalesService: any = {
    createSale: async (payload: any) => {
      capturedSalePayload = payload;
      return { id: 101, sale: { id: 101 } };
    },
    getSaleById: async (id: number) => ({ id }),
  };

  const db: any = {
    selectFrom: (table: string) => ({
      select: () => ({
        where: () => ({
          where: () => ({
            executeTakeFirst: async () => {
              if (table === 'customers') return { id: 5, name: 'Customer Test', phone: '01000000000' };
              if (table === 'branches') return { id: 1, default_stock_location_id: 1 };
              if (table === 'delivery_representatives') return { id: 2, name: 'Store Rep' };
              return null;
            },
            orderBy: () => ({
              executeTakeFirst: async () => ({ id: 2, name: 'Store Rep' }),
            }),
          }),
          executeTakeFirst: async () => ({ id: 1, default_stock_location_id: 1 }),
        }),
      }),
      selectAll: () => ({
        where: () => ({
          where: () => ({
            executeTakeFirst: async () => ({
              ...onlineOrder,
              items: [{ productId: 1, quantity: 2, unitPrice: 250, total: 500 }],
              totalAmount: 500,
              deliveryFee: 0,
            }),
          }),
        }),
      }),
    }),
    updateTable: () => ({
      set: () => ({
        where: () => ({
          where: () => ({
            execute: async () => undefined,
          }),
        }),
      }),
    }),
  };

  const storefrontService = new (require('../../src/modules/storefront/storefront.service').StorefrontService)(
    db,
    mockSalesService,
  );

  const actor: any = { userId: 1, username: 'admin', role: 'admin', tenantId: 'tenant-1', accountId: 'tenant-1:main' };
  const res = await storefrontService.convertToSale(10, actor);
  assert.equal(res.ok, true);
  assert.equal(capturedSalePayload.collectionStatus, 'collected', 'Online paid orders must have collectionStatus = collected');
  assert.equal(capturedSalePayload.paidAmount, 500, 'Online paid orders must have paidAmount equal to order total');
  // Was asserting 'paymob' — but normalizeSalePayload maps every channel outside
  // cash|card|wallet|instapay to 'cash', so that value booked card money into the cash drawer.
  // The gateway name now travels in the note; the channel is 'card' (SF-3).
  assert.equal(capturedSalePayload.paymentChannel, 'card', 'Gateway-paid orders must post on the card channel');
  assert.equal(capturedSalePayload.payments[0].paymentChannel, 'card');
  assert.ok(String(capturedSalePayload.note).includes('paymob'), 'The gateway is recorded on the invoice note');
  assert.equal(capturedSalePayload.discount, 0, 'An order without a coupon carries no discount');

  console.log('  -> Storefront convertToSale: online paid order sets collectionStatus = collected and paidAmount.');
}

async function runAll(): Promise<void> {
  console.log('[PHASE 20 / ITEM 9] Running Storefront Webhooks & Payment Invariants Test Suite...');
  await testPaymobFailClosed();
  await testXPayFailClosed();
  await testStripeFailClosed();
  await testTapFailClosed();
  await testOnlinePaidOrderSaleConversion();
  console.log('[PHASE 20 / ITEM 9] ALL CRITICAL INVARIANT TESTS PASSED 100%!');
}

runAll().catch((err) => {
  console.error('[PHASE 20 / ITEM 9] TEST FAILED:', err);
  process.exit(1);
});
