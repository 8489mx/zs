import { Injectable, InternalServerErrorException } from '@nestjs/common';

type TrialSignupMailPayload = {
  businessName: string;
  ownerEmail: string;
  username: string;
  temporaryPassword: string;
};

@Injectable()
export class TrialSignupMailService {
  private getDeliveryMode(): 'smtp' | 'console' {
    const mode = String(process.env.MAIL_DELIVERY_MODE || '').trim().toLowerCase();
    return mode === 'console' ? 'console' : 'smtp';
  }

  private buildBody(payload: TrialSignupMailPayload): string {
    const loginUrl = String(process.env.APP_LOGIN_URL || '').trim() || 'http://localhost:5173/login';
    return [
      `مرحبًا ${payload.businessName}،`,
      '',
      'تم إنشاء نسختك التجريبية في Z Systems بنجاح.',
      '',
      `رابط تسجيل الدخول: ${loginUrl}`,
      `اسم المستخدم: ${payload.username}`,
      `كلمة المرور المؤقتة: ${payload.temporaryPassword}`,
      '',
      'مهم: يجب تغيير كلمة المرور عند أول تسجيل دخول.',
      'للدعم عبر واتساب، تواصل مع فريق الدعم المعتمد لديك.',
    ].join('\n');
  }

  async sendTrialCredentials(payload: TrialSignupMailPayload): Promise<void> {
    const fromName = String(process.env.MAIL_FROM_NAME || 'Z Systems').trim();
    const fromEmail = String(process.env.MAIL_FROM_EMAIL || '').trim();
    const subject = 'بيانات الدخول إلى النسخة التجريبية - Z Systems';
    const text = this.buildBody(payload);
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

    const nodemailer = await import('nodemailer');
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
    });
  }
}

