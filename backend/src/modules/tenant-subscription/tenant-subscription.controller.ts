import { Body, Controller, Get, Headers, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { TenantSubscriptionService } from './tenant-subscription.service';
import { PaymentManagerService } from './gateways/payment-manager.service';
import { InitiateOnlinePaymentDto, RequestRenewalDto } from './dto/tenant-subscription.dto';

@Controller('api/tenant-subscription')
export class TenantSubscriptionController {
  constructor(
    private readonly service: TenantSubscriptionService,
    private readonly paymentManager: PaymentManagerService,
  ) {}

  @Get('me')
  @UseGuards(SessionAuthGuard)
  getMySubscription(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.service.getMySubscription(req.authContext!);
  }

  @Post('request-renewal')
  @UseGuards(SessionAuthGuard)
  requestRenewal(@Body() dto: RequestRenewalDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.service.requestRenewal(dto, req.authContext!);
  }

  @Post('initiate-online-payment')
  @UseGuards(SessionAuthGuard)
  initiateOnlinePayment(@Body() dto: InitiateOnlinePaymentDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.service.initiateOnlinePayment(dto, this.paymentManager, req.authContext!);
  }

  /**
   * Interactive Sandbox Payment Simulation Page
   * Rendered when live payment gateway keys (XPay/Paymob) are not configured.
   */
  @Get('sandbox-checkout')
  sandboxCheckout(@Query() query: any, @Res() res: Response) {
    const gateway = String(query.gateway || 'xpay').toUpperCase();
    const amount = Number(query.amount || 0).toLocaleString('ar-EG');
    const currency = query.currency || 'EGP';
    const planName = query.planName || 'الباقة المختارة';
    const businessName = query.businessName || 'المتجر الرئيسي';
    const ref = query.ref || `SANDBOX-${Date.now()}`;
    const redirectUrl = query.redirectUrl || '/settings/subscription';
    const tenantId = query.tenantId || '';
    const planId = query.planId || '';
    const duration = query.duration || '12';

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>بوابة الدفع الإلكتروني (${gateway}) - محاكاة تجريبية</title>
  <style>
    body {
      margin: 0;
      padding: 30px 16px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f1f5f9;
      color: #0f172a;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      box-sizing: border-box;
    }
    .checkout-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      max-width: 520px;
      width: 100%;
      padding: 28px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
    }
    .badge {
      display: inline-block;
      background: #e0e7ff;
      color: #3730a3;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
      margin-bottom: 12px;
    }
    .header {
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .title {
      margin: 0 0 6px;
      font-size: 20px;
      font-weight: 900;
      color: #170e5e;
    }
    .subtitle {
      margin: 0;
      font-size: 13px;
      color: #64748b;
    }
    .summary-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      font-size: 13px;
      border-bottom: 1px dashed #e2e8f0;
    }
    .summary-row:last-child {
      border-bottom: none;
      padding-top: 10px;
      margin-top: 4px;
      font-size: 16px;
      font-weight: 900;
      color: #170e5e;
    }
    .label {
      color: #64748b;
    }
    .val {
      font-weight: 700;
      color: #0f172a;
    }
    .payment-options {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 24px;
    }
    .option-card {
      border: 1.5px solid #cbd5e1;
      border-radius: 10px;
      padding: 12px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      background: #ffffff;
    }
    .option-card.selected {
      border-color: #170e5e;
      background: #f5f3ff;
    }
    .btn-pay {
      width: 100%;
      background: #170e5e;
      color: #ffffff;
      border: none;
      padding: 14px;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 800;
      cursor: pointer;
      transition: background 0.15s ease;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
    }
    .btn-pay:hover {
      background: #0d083d;
    }
    .btn-cancel {
      display: block;
      width: 100%;
      text-align: center;
      margin-top: 12px;
      color: #64748b;
      font-size: 13px;
      text-decoration: none;
      font-weight: 600;
    }
    .btn-cancel:hover {
      color: #0f172a;
    }
  </style>
</head>
<body>
  <div class="checkout-card">
    <span class="badge">بيئة تجريبية آمنة (Sandbox Simulation)</span>
    <div class="header">
      <h1 class="title">بوابة الدفع الإلكتروني (${gateway})</h1>
      <p class="subtitle">سداد اشتراك المنظومة السحابية Z-Systems</p>
    </div>

    <div class="summary-box">
      <div class="summary-row">
        <span class="label">اسم المنشأة:</span>
        <span class="val">${businessName}</span>
      </div>
      <div class="summary-row">
        <span class="label">الباقة المختارة:</span>
        <span class="val">${planName}</span>
      </div>
      <div class="summary-row">
        <span class="label">مدة الاشتراك:</span>
        <span class="val">${duration === '1' ? 'شهر واحد' : `${duration} شهراً`}</span>
      </div>
      <div class="summary-row">
        <span class="label">رقم المرجع:</span>
        <span class="val" style="font-family: monospace; font-size: 12px;">${ref}</span>
      </div>
      <div class="summary-row">
        <span class="label">المبلغ المطلوب:</span>
        <span class="val">${amount} ${currency}</span>
      </div>
    </div>

    <form method="POST" action="/api/tenant-subscription/sandbox-checkout/complete">
      <input type="hidden" name="gateway" value="${query.gateway || 'xpay'}">
      <input type="hidden" name="tenantId" value="${tenantId}">
      <input type="hidden" name="planId" value="${planId}">
      <input type="hidden" name="duration" value="${duration}">
      <input type="hidden" name="amount" value="${query.amount || '0'}">
      <input type="hidden" name="currency" value="${currency}">
      <input type="hidden" name="ref" value="${ref}">
      <input type="hidden" name="redirectUrl" value="${redirectUrl}">

      <div class="payment-options">
        <label class="option-card selected">
          <input type="radio" name="method" value="card" checked>
          <div>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a;">بطاقة بنكية تجريبية (فيزا / ماستركارد / ميزة)</div>
            <div style="font-size: 11px; color: #64748b; font-family: monospace;">•••• •••• •••• 4242 | EXP 12/28</div>
          </div>
        </label>
        <label class="option-card">
          <input type="radio" name="method" value="wallet">
          <div>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a;">محفظة ذكية تجريبية (فودافون كاش / إنستاباي)</div>
            <div style="font-size: 11px; color: #64748b; font-family: monospace;">01012345678</div>
          </div>
        </label>
      </div>

      <button type="submit" class="btn-pay">
        تأكيد الدفع التجريبي بنجاح وتفعيل الباقة الآن ✓
      </button>
      <a href="${redirectUrl}" class="btn-cancel">إلغاء المعاملة والعودة</a>
    </form>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  }

  /**
   * Complete Sandbox Payment
   */
  @Post('sandbox-checkout/complete')
  async completeSandboxCheckout(@Body() body: any, @Res() res: Response) {
    const gateway = String(body.gateway || 'xpay').toLowerCase();
    const tenantId = String(body.tenantId || '').trim();
    const planId = Number(body.planId) || undefined;
    const durationMonths = Number(body.duration) || 12;
    const amount = Number(body.amount) || 0;
    const currency = String(body.currency || 'EGP');
    const transactionReference = String(body.ref || `SANDBOX-${Date.now()}`);
    let redirectUrl = String(body.redirectUrl || '/settings/subscription');
    
    if (redirectUrl) {
      redirectUrl += redirectUrl.includes('?') ? '&payment_success=1' : '?payment_success=1';
    }

    if (tenantId) {
      await this.paymentManager.processDirectPayment({
        gatewayName: gateway,
        tenantId,
        planId,
        durationMonths,
        amount,
        currency,
        transactionReference,
      });
    }

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تم سداد الاشتراك بنجاح</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
    .card { background: white; padding: 36px; border-radius: 16px; border: 1px solid #e2e8f0; text-align: center; max-width: 480px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
    .icon { width: 56px; height: 56px; background: #ecfdf5; color: #10b981; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; margin-bottom: 16px; }
    .btn { display: inline-block; margin-top: 20px; background: #170e5e; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h2 style="margin: 0 0 10px; color: #0f172a;">تم سداد الاشتراك وتفعيله بنجاح!</h2>
    <p style="color: #64748b; font-size: 14px; margin: 0 0 16px;">تم تحديث باقة مؤسستك وترقيتها فورياً. جاري إعادتك للنظام...</p>
    <a href="${redirectUrl}" class="btn">العودة إلى لوحة التحكم</a>
  </div>
  <script>
    setTimeout(function() {
      window.location.href = "${redirectUrl}";
    }, 1200);
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  }

  /**
   * Public Webhook endpoint for payment gateways (XPay, Paymob, Stripe, Fawry)
   * e.g. POST /api/tenant-subscription/webhooks/xpay
   * e.g. POST /api/tenant-subscription/webhooks/paymob
   */
  @Post('webhooks/:gateway')
  handlePaymentWebhook(
    @Param('gateway') gateway: string,
    @Headers() headers: Record<string, any>,
    @Body() body: any,
  ): Promise<Record<string, unknown>> {
    return this.paymentManager.processWebhook(gateway, headers, body);
  }
}
