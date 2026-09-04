import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DEFAULT_TRIAL_DAYS } from '../saas-admin/trial.constants';

type TrialSignupMailPayload = {
  businessName: string;
  ownerEmail: string;
  username: string;
  temporaryPassword: string;
  trialDays?: number;
};

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

@Injectable()
export class TrialSignupMailService {
  private getDeliveryMode(): 'smtp' | 'console' {
    const mode = String(process.env.MAIL_DELIVERY_MODE || '').trim().toLowerCase();
    return mode === 'console' ? 'console' : 'smtp';
  }

  private buildText(payload: TrialSignupMailPayload): string {
    const loginUrl = String(process.env.APP_LOGIN_URL || '').trim() || '/login';
    const trialDays = payload.trialDays ?? DEFAULT_TRIAL_DAYS;

    return [
      '==================================================',
      '      Z SYSTEMS PRO | Z ERP - النسخة التجريبية    ',
      '==================================================',
      '',
      `مرحباً ${payload.businessName}،`,
      '',
      'تم إنشاء وتجهيز نسختك التجريبية في Z Systems Pro بنجاح.',
      `مدة التجربة المجانية: ${trialDays} أيام كاملة بكافة المميزات.`,
      '',
      '--------------------------------------------------',
      'بيانات تسجيل الدخول إلى حسابك:',
      '--------------------------------------------------',
      `• رابط الدخول: ${loginUrl}`,
      `• اسم المستخدم: ${payload.username}`,
      `• البريد الإلكتروني: ${payload.ownerEmail}`,
      `• كلمة المرور المؤقتة: ${payload.temporaryPassword}`,
      '',
      'ملاحظة: يمكنك تسجيل الدخول باستخدام اسم المستخدم أو البريد الإلكتروني.',
      'تنبيه أمني: يرجى تغيير كلمة المرور فور أول تسجيل دخول.',
      '',
      '==================================================',
      '           ENGLISH VERSION / SUMMARY              ',
      '==================================================',
      `Welcome ${payload.businessName},`,
      `Your Z Systems Pro workspace is active for ${trialDays} days.`,
      '',
      `• Login URL: ${loginUrl}`,
      `• Username: ${payload.username}`,
      `• Temporary Password: ${payload.temporaryPassword}`,
      '',
      'Important: Please change your password upon initial login.',
      '==================================================',
      'Z Systems Pro © All rights reserved.',
    ].join('\n');
  }

  private buildHtml(payload: TrialSignupMailPayload): string {
    const loginUrl = String(process.env.APP_LOGIN_URL || '').trim() || '/login';
    const trialDays = payload.trialDays ?? DEFAULT_TRIAL_DAYS;
    const safeBusinessName = escapeHtml(payload.businessName);
    const safeUsername = escapeHtml(payload.username);
    const safeEmail = escapeHtml(payload.ownerEmail);
    const safePassword = escapeHtml(payload.temporaryPassword);
    const safeLoginUrl = escapeHtml(loginUrl);
    const year = new Date().getFullYear();

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>بيانات الدخول إلى النسخة التجريبية - Z Systems Pro</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
    
    <!-- HEADER -->
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #312e81 100%); padding: 36px 24px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: 0.5px;">Z SYSTEMS PRO</h1>
      <p style="margin: 8px 0 0 0; color: #c7d2fe; font-size: 13px; font-weight: 500;">المنظومة المحاسبية والإدارية السحابية المتكاملة • Cloud ERP</p>
      <div style="display: inline-block; margin-top: 16px; padding: 6px 18px; background-color: rgba(99, 102, 241, 0.25); border: 1px solid rgba(199, 210, 254, 0.35); border-radius: 20px; color: #ffffff; font-size: 12px; font-weight: 600;">
        تفعيل النسخة التجريبية | Free Trial Active
      </div>
    </div>

    <!-- MAIN BODY -->
    <div style="padding: 32px 28px;">
      
      <!-- ARABIC SECTION -->
      <div dir="rtl" style="text-align: right;">
        <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700;">مرحباً ${safeBusinessName}</h2>
        <p style="margin: 0 0 18px 0; color: #334155; font-size: 15px; line-height: 1.7;">
          يسعدنا انضمامك إلى <strong>Z Systems Pro</strong>. تم تجهيز وتفعيل مساحة العمل السحابية الخاصة بنشاطك التجاري بنجاح، ونسختك التجريبية جاهزة للاستخدام الفوري بكافة الصلاحيات والمميزات لمدة <strong>${trialDays} أيام</strong>.
        </p>

        <!-- CREDENTIALS BOX -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 22px; margin: 24px 0;">
          <div style="margin: 0 0 16px 0; color: #1e1b4b; font-size: 15px; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; display: flex; align-items: center;">
            بيانات تسجيل الدخول إلى حسابك:
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
            <tr>
              <td style="padding: 9px 0; color: #64748b; font-weight: 600; width: 140px; vertical-align: middle;">رابط النظام:</td>
              <td style="padding: 9px 0; font-weight: 600; vertical-align: middle;">
                <a href="${safeLoginUrl}" target="_blank" style="color: #4f46e5; text-decoration: none; word-break: break-all;" dir="ltr">${safeLoginUrl}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 9px 0; color: #64748b; font-weight: 600; vertical-align: middle;">اسم المستخدم:</td>
              <td style="padding: 9px 0; font-weight: 700; color: #0f172a; vertical-align: middle;">
                <span dir="ltr" style="background-color: #e2e8f0; color: #1e293b; padding: 4px 10px; border-radius: 6px; font-family: -apple-system, sans-serif; display: inline-block;">${safeUsername}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 9px 0; color: #64748b; font-weight: 600; vertical-align: middle;">البريد الإلكتروني:</td>
              <td style="padding: 9px 0; font-weight: 600; color: #0f172a; vertical-align: middle;">
                <span dir="ltr" style="color: #334155;">${safeEmail}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 9px 0; color: #64748b; font-weight: 600; vertical-align: middle;">كلمة المرور المؤقتة:</td>
              <td style="padding: 9px 0; vertical-align: middle;">
                <span dir="ltr" style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 15px; font-weight: 700; background-color: #e0e7ff; color: #3730a3; padding: 6px 12px; border-radius: 6px; border: 1px dashed #6366f1; letter-spacing: 0.5px; display: inline-block;">${safePassword}</span>
              </td>
            </tr>
          </table>
          <p style="margin: 14px 0 0 0; color: #64748b; font-size: 12px; line-height: 1.5;">
            * يمكنك تسجيل الدخول باستخدام اسم المستخدم أو البريد الإلكتروني.
          </p>
        </div>

        <!-- CTA BUTTON -->
        <div style="text-align: center; margin: 28px 0;">
          <a href="${safeLoginUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 34px; border-radius: 10px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);">
            الدخول إلى النظام الآن
          </a>
        </div>

        <!-- SECURITY NOTICE -->
        <div style="background-color: #fffbeb; border-right: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px;">
          <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.6;">
            <strong>تنبيه أمني:</strong> يُرجى تغيير كلمة المرور المؤقتة فور تسجيل الدخول لأول مرة من إعدادات المستخدم لضمان أعلى مستويات الحماية.
          </p>
        </div>
      </div>

      <!-- SEPARATOR -->
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

      <!-- ENGLISH SECTION -->
      <div dir="ltr" style="text-align: left;">
        <h3 style="margin: 0 0 8px 0; color: #0f172a; font-size: 17px; font-weight: 700;">Welcome to Z Systems Pro</h3>
        <p style="margin: 0 0 16px 0; color: #475569; font-size: 14px; line-height: 1.6;">
          Hello <strong>${safeBusinessName}</strong>, your cloud workspace is ready. You have full trial access for <strong>${trialDays} days</strong>.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 16px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 140px;">Portal URL:</td>
              <td style="padding: 6px 0;"><a href="${safeLoginUrl}" target="_blank" style="color: #4f46e5; text-decoration: none; font-weight: 600;">${safeLoginUrl}</a></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Username:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${safeUsername}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Temp Password:</td>
              <td style="padding: 6px 0;">
                <span style="font-family: 'SFMono-Regular', Consolas, monospace; font-size: 14px; font-weight: 700; background-color: #e0e7ff; color: #3730a3; padding: 4px 8px; border-radius: 4px; border: 1px dashed #6366f1;">${safePassword}</span>
              </td>
            </tr>
          </table>
        </div>

        <p style="margin: 0; color: #64748b; font-size: 12px;">
          * Please make sure to change your temporary password upon first login.
        </p>
      </div>

    </div>

    <!-- FOOTER -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; color: #64748b; font-size: 12px; line-height: 1.6;">
      <p style="margin: 0 0 6px 0; font-weight: 600; color: #334155;">Z Systems Pro • Cloud ERP Solutions</p>
      <p style="margin: 0;">جميع الحقوق محفوظة © ${year} Z Systems Pro. All rights reserved.</p>
    </div>

  </div>
</body>
</html>`;
  }

  async sendTrialCredentials(payload: TrialSignupMailPayload): Promise<void> {
    const fromName = String(process.env.MAIL_FROM_NAME || 'Z Systems').trim();
    const fromEmail = String(process.env.MAIL_FROM_EMAIL || '').trim();
    const subject = 'بيانات الدخول إلى النسخة التجريبية - Z Systems Pro | Trial Access';
    const text = this.buildText(payload);
    const html = this.buildHtml(payload);
    const mode = this.getDeliveryMode();
    const isProduction = String(process.env.NODE_ENV || '').trim() === 'production';

    if (mode === 'console' && !isProduction) {
      // Development-only console mode. Never use this in production.
      // eslint-disable-next-line no-console
      console.info(`[trial-signup-mail] to=${payload.ownerEmail} subject=${subject}`);
      return;
    }

    const host = String(process.env.SMTP_HOST || '').trim();
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = String(process.env.SMTP_SECURE || 'false').trim().toLowerCase() === 'true';
    const user = String(process.env.SMTP_USER || '').trim();
    const pass = String(process.env.SMTP_PASSWORD || '').trim();

    if (!host || !port || !fromEmail) {
      throw new InternalServerErrorException('MAIL_CONFIG_MISSING');
    }

    const nodemailer = require('nodemailer') as {
      createTransport(config: Record<string, unknown>): {
        sendMail(payload: Record<string, unknown>): Promise<unknown>;
      };
    };
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });

    await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: payload.ownerEmail,
      subject,
      text,
      html,
    });
  }
}
