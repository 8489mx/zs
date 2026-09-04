import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { KYSELY_DB } from '../../../database/database.constants';
import { Kysely, sql } from '../../../database/kysely';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';

export interface WhatsAppConfig {
  enabled: boolean;
  provider: 'ultramsg' | 'greenapi' | 'custom_webhook';
  apiUrl?: string;
  instanceId?: string;
  token?: string;
  autoSendInvoice: boolean;
  autoSendOnlineOrder: boolean;
  invoiceTemplate?: string;
}

@Injectable()
export class WhatsAppGatewayService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
  ) {}

  async getConfig(actor: AuthContext): Promise<WhatsAppConfig> {
    const { tenantId } = requireTenantScope(actor);
    const rows = await this.db
      .selectFrom('settings')
      .select(['key', 'value'])
      .where('tenant_id', '=', tenantId)
      .where('key', 'like', 'whatsapp_gateway_%')
      .execute();

    const map = new Map<string, any>();
    for (const r of rows) {
      try {
        map.set(r.key, JSON.parse(r.value));
      } catch {
        map.set(r.key, r.value);
      }
    }

    return {
      enabled: map.get('whatsapp_gateway_enabled') === true,
      provider: map.get('whatsapp_gateway_provider') || 'ultramsg',
      apiUrl: map.get('whatsapp_gateway_api_url') || '',
      instanceId: map.get('whatsapp_gateway_instance_id') || '',
      token: map.get('whatsapp_gateway_token') ? '••••••••' : '',
      autoSendInvoice: map.get('whatsapp_gateway_auto_invoice') === true,
      autoSendOnlineOrder: map.get('whatsapp_gateway_auto_order') === true,
      invoiceTemplate: map.get('whatsapp_gateway_invoice_template') ||
        'مرحباً بك يا {customerName} في {businessName}، يسعدنا تسوقك معنا! يمكنك استعراض فاتورتك رقم #{invoiceNo} بقيمة {totalAmount} ج.م عبر الرابط التالي: {invoiceLink}',
    };
  }

  async saveConfig(payload: Partial<WhatsAppConfig>, actor: AuthContext): Promise<{ ok: boolean }> {
    const { tenantId, accountId } = requireTenantScope(actor);

    const updates: Array<{ key: string; val: any }> = [];
    if (payload.enabled !== undefined) updates.push({ key: 'whatsapp_gateway_enabled', val: payload.enabled });
    if (payload.provider !== undefined) updates.push({ key: 'whatsapp_gateway_provider', val: payload.provider });
    if (payload.apiUrl !== undefined) updates.push({ key: 'whatsapp_gateway_api_url', val: payload.apiUrl });
    if (payload.instanceId !== undefined) updates.push({ key: 'whatsapp_gateway_instance_id', val: payload.instanceId });
    if (payload.token && payload.token !== '••••••••') {
      updates.push({ key: 'whatsapp_gateway_token', val: payload.token });
    }
    if (payload.autoSendInvoice !== undefined) updates.push({ key: 'whatsapp_gateway_auto_invoice', val: payload.autoSendInvoice });
    if (payload.autoSendOnlineOrder !== undefined) updates.push({ key: 'whatsapp_gateway_auto_order', val: payload.autoSendOnlineOrder });
    if (payload.invoiceTemplate !== undefined) updates.push({ key: 'whatsapp_gateway_invoice_template', val: payload.invoiceTemplate });

    for (const item of updates) {
      await sql`
        INSERT INTO settings (key, value, tenant_id, account_id)
        VALUES (${item.key}, ${JSON.stringify(item.val)}, ${tenantId}, ${accountId})
        ON CONFLICT (tenant_id, key)
        DO UPDATE SET value = EXCLUDED.value, account_id = EXCLUDED.account_id
      `.execute(this.db);
    }

    return { ok: true };
  }

  private async getRawConfig(tenantId: string): Promise<Record<string, any>> {
    const rows = await this.db
      .selectFrom('settings')
      .select(['key', 'value'])
      .where('tenant_id', '=', tenantId)
      .where('key', 'like', 'whatsapp_gateway_%')
      .execute();

    const map: Record<string, any> = {};
    for (const r of rows) {
      try {
        map[r.key] = JSON.parse(r.value);
      } catch {
        map[r.key] = r.value;
      }
    }
    return map;
  }

  async sendRawMessage(tenantId: string, phone: string, text: string): Promise<{ success: boolean; message?: string }> {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const to = cleanPhone.startsWith('01') ? `2${cleanPhone}` : cleanPhone;
    if (!to || to.length < 8) {
      return { success: false, message: 'رقم الهاتف غير صالح' };
    }

    const cfg = await this.getRawConfig(tenantId);
    if (!cfg.whatsapp_gateway_enabled) {
      return { success: false, message: 'بوابة الواتساب السحابية غير مفعلة' };
    }

    const provider = cfg.whatsapp_gateway_provider || 'ultramsg';
    const apiUrl = cfg.whatsapp_gateway_api_url;
    const instanceId = cfg.whatsapp_gateway_instance_id;
    const token = cfg.whatsapp_gateway_token;

    try {
      if (provider === 'ultramsg') {
        const url = apiUrl || `https://api.ultramsg.com/${instanceId}/messages/chat`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            token: token || '',
            to,
            body: text,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { success: false, message: data.message || 'خطأ من بوابة UltraMsg' };
        return { success: true };
      }

      if (provider === 'greenapi') {
        const url = `${apiUrl || 'https://api.green-api.com'}/waInstance${instanceId}/sendMessage/${token}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId: `${to}@c.us`,
            message: text,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { success: false, message: data.message || 'خطأ من بوابة Green API' };
        return { success: true };
      }

      if (provider === 'custom_webhook' && apiUrl) {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ phone: to, message: text, instanceId }),
        });
        if (!res.ok) return { success: false, message: 'خطأ من الويب هوك السحابي المخصص' };
        return { success: true };
      }

      return { success: false, message: 'مزود الواتساب غير معروف أو لم يتم إدخال إعدادات الاتصال' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'تعذر الاتصال بخادم الواتساب' };
    }
  }

  async sendTestMessage(phone: string, actor: AuthContext): Promise<{ success: boolean; message?: string }> {
    const { tenantId } = requireTenantScope(actor);
    const tenant = await this.db
      .selectFrom('tenants')
      .select('business_name')
      .where('id', '=', tenantId)
      .executeTakeFirst();

    const businessName = tenant?.business_name || 'منظومة Z-Systems';
    const testText = `تم نجاح اختبار ربط بوابة الواتساب السحابية بنظام ${businessName}!\nسيتم إرسال الفواتير والإشعارات آلياً لعملائك بنجاح.`;

    return this.sendRawMessage(tenantId, phone, testText);
  }

  async sendInvoiceNotification(saleId: number, actor: AuthContext, options?: { autoOnly?: boolean }): Promise<{ success: boolean; message?: string }> {
    const { tenantId } = requireTenantScope(actor);

    const cfg = await this.getRawConfig(tenantId);
    if (!cfg.whatsapp_gateway_enabled) {
      return { success: false, message: 'بوابة الواتساب السحابية غير مفعلة' };
    }
    if (options?.autoOnly && !cfg.whatsapp_gateway_auto_invoice) {
      return { success: false, message: 'الإرسال التلقائي للفواتير عبر الواتساب غير مفعل' };
    }

    const sale = await this.db
      .selectFrom('sales')
      .selectAll()
      .where('id', '=', saleId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!sale) throw new BadRequestException('الفاتورة غير موجودة');

    const customer = sale.customer_id
      ? await this.db.selectFrom('customers').selectAll().where('id', '=', sale.customer_id).executeTakeFirst()
      : null;

    const phone = customer?.phone;
    if (!phone) {
      return { success: false, message: 'العميل لا يمتلك رقم هاتف مسجل' };
    }

    const tenant = await this.db
      .selectFrom('tenants')
      .select(['business_name', 'slug'])
      .where('id', '=', tenantId)
      .executeTakeFirst();

    let template = cfg.whatsapp_gateway_invoice_template ||
      'مرحباً بك يا {customerName} في {businessName}، يسعدنا تسوقك معنا! يمكنك استعراض فاتورتك رقم #{invoiceNo} بقيمة {totalAmount} ج.م عبر الرابط التالي: {invoiceLink}';

    const customerName = customer?.name || 'عميلنا العزيز';
    const businessName = tenant?.business_name || 'متجرنا';
    const invoiceNo = sale.doc_no || String(sale.id);
    const totalAmount = Number(sale.total || 0).toLocaleString('ar-EG');
    const invoiceLink = `https://${tenant?.slug || 'my'}.sslip.io/invoice/${sale.doc_no || sale.id}`;

    const text = template
      .replace(/{customerName}/g, customerName)
      .replace(/{businessName}/g, businessName)
      .replace(/{invoiceNo}/g, invoiceNo)
      .replace(/{totalAmount}/g, totalAmount)
      .replace(/{invoiceLink}/g, invoiceLink);

    return this.sendRawMessage(tenantId, phone, text);
  }

  async sendOnlineOrderNotification(orderId: number, tenantId: string): Promise<{ success: boolean; message?: string }> {
    const cfg = await this.getRawConfig(tenantId);
    if (!cfg.whatsapp_gateway_enabled || !cfg.whatsapp_gateway_auto_order) {
      return { success: false, message: 'الإرسال التلقائي لطلبات المتجر عبر الواتساب غير مفعل' };
    }

    const order = await this.db
      .selectFrom('online_orders')
      .selectAll()
      .where('id', '=', orderId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!order) return { success: false, message: 'الطلب غير موجود' };

    const tenant = await this.db
      .selectFrom('tenants')
      .select(['business_name', 'owner_phone'])
      .where('id', '=', tenantId)
      .executeTakeFirst();

    const businessName = tenant?.business_name || 'متجرنا';
    const customerPhone = order.customer_phone;
    const orderNo = order.order_number || String(order.id);
    const total = Number(order.total_amount || 0).toLocaleString('ar-EG');

    // Send confirmation to customer
    if (customerPhone) {
      const customerMsg = `مرحباً بك ${order.customer_name || 'عميلنا العزيز'}!\nتم استلام طلبك رقم #${orderNo} بنجاح من متجر ${businessName} بقيمة ${total} ج.م.\nسنقوم بتجهيزه وتأكيده في أقرب وقت. شكراً لتسوقك معنا!`;
      void this.sendRawMessage(tenantId, customerPhone, customerMsg).catch(() => undefined);
    }

    // Send alert to store owner/merchant
    const merchantPhone = tenant?.owner_phone;
    if (merchantPhone) {
      const merchantMsg = `طلب أونلاين جديد #${orderNo}!\nالعميل: ${order.customer_name} (${order.customer_phone})\nالإجمالي: ${total} ج.م\nالعنوان: ${order.customer_address || 'استلام من الفرع'}\nيرجى فتح لوحة التحكم لتأكيد الطلب.`;
      void this.sendRawMessage(tenantId, merchantPhone, merchantMsg).catch(() => undefined);
    }

    return { success: true };
  }
}
