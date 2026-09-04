import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from '@/lib/http';
import { Button } from '@/shared/ui/button';
import { MessageSquareIcon } from '@/shared/components/icons/AppIcons';

export interface WhatsAppGatewayConfig {
  enabled: boolean;
  provider: 'ultramsg' | 'greenapi' | 'custom_webhook';
  apiUrl?: string;
  instanceId?: string;
  token?: string;
  autoSendInvoice: boolean;
  autoSendOnlineOrder: boolean;
  invoiceTemplate?: string;
}

export function SettingsWhatsAppGatewaySection() {
  const queryClient = useQueryClient();
  const [testPhone, setTestPhone] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const { data } = useQuery<WhatsAppGatewayConfig>({
    queryKey: ['settings-whatsapp-config'],
    queryFn: () => http<WhatsAppGatewayConfig>('/api/settings/whatsapp'),
  });

  const [form, setForm] = useState<Partial<WhatsAppGatewayConfig>>({});

  // Sync state once data is loaded
  const currentConfig: WhatsAppGatewayConfig = {
    enabled: form.enabled ?? data?.enabled ?? false,
    provider: form.provider ?? data?.provider ?? 'ultramsg',
    apiUrl: form.apiUrl ?? data?.apiUrl ?? '',
    instanceId: form.instanceId ?? data?.instanceId ?? '',
    token: form.token ?? data?.token ?? '',
    autoSendInvoice: form.autoSendInvoice ?? data?.autoSendInvoice ?? false,
    autoSendOnlineOrder: form.autoSendOnlineOrder ?? data?.autoSendOnlineOrder ?? false,
    invoiceTemplate: form.invoiceTemplate ?? data?.invoiceTemplate ??
      'مرحباً بك يا {customerName} في {businessName}، يسعدنا تسوقك معنا! يمكنك استعراض فاتورتك رقم #{invoiceNo} بقيمة {totalAmount} ج.م عبر الرابط التالي: {invoiceLink}',
  };

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<WhatsAppGatewayConfig>) =>
      http<{ ok: boolean }>('/api/settings/whatsapp', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-whatsapp-config'] });
      setFeedback({ kind: 'success', message: 'تم حفظ إعدادات بوابة الواتساب السحابية بنجاح!' });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (err: any) => {
      setFeedback({ kind: 'error', message: err?.message || 'فشل حفظ الإعدادات' });
    },
  });

  const testMutation = useMutation({
    mutationFn: (phone: string) =>
      http<{ success: boolean; message?: string }>('/api/settings/whatsapp/test', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      }),
    onSuccess: (res) => {
      if (res.success) {
        setFeedback({ kind: 'success', message: '✅ وصل الاختبار بنجاح إلى هاتفك! البوابة تعمل وجاهزة.' });
      } else {
        setFeedback({ kind: 'error', message: res.message || 'فشل إرسال رسالة الاختبار. تأكد من البيانات والاشتراك.' });
      }
    },
    onError: (err: any) => {
      setFeedback({ kind: 'error', message: err?.message || 'خطأ أثناء فحص البوابة' });
    },
  });

  const handleSave = () => {
    setFeedback(null);
    saveMutation.mutate(currentConfig);
  };

  const handleSendTest = () => {
    if (!testPhone.trim()) {
      setFeedback({ kind: 'error', message: 'يرجى إدخال رقم الهاتف لإجراء الاختبار' });
      return;
    }
    setFeedback(null);
    testMutation.mutate(testPhone.trim());
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
      {/* Main Enterprise Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageSquareIcon size={18} color="#166534" />
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>
                بوابة الواتساب السحابية التلقائية (Automated Cloud WhatsApp)
              </h3>
              <span style={{ fontSize: '11px', background: currentConfig.enabled ? '#dcfce7' : '#f1f5f9', color: currentConfig.enabled ? '#166534' : '#64748b', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                {currentConfig.enabled ? 'مفعلة' : 'متوقفة'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748b' }}>
              ربط المنظومة ببوابة واتساب سحابية لإرسال الفواتير الإلكترونية وإشعارات الطلبات تلقائياً للعملاء في الخلفية وبدون تدخل بشري.
            </p>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: currentConfig.enabled ? '#166534' : '#475569' }}>
              {currentConfig.enabled ? 'البوابة مفعلة' : 'تفعيل البوابة'}
            </span>
            <input
              type="checkbox"
              checked={currentConfig.enabled}
              onChange={(e) => setForm({ ...currentConfig, enabled: e.target.checked })}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
          </label>
        </div>

        {/* 2-Column Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          {/* Provider & Credentials */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 800 }}>مزود خدمة الواتساب السحابي:</strong>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                المزود المعتمد:
              </label>
              <select
                value={currentConfig.provider}
                onChange={(e) => setForm({ ...currentConfig, provider: e.target.value as any })}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', background: '#ffffff', fontWeight: 700 }}
              >
                <option value="ultramsg">UltraMsg (الأشهر في مصر والوطن العربي)</option>
                <option value="greenapi">Green API (بوابة عالمية مستقرة)</option>
                <option value="custom_webhook">Custom Webhook (بوابة أو سيرفر خاص بك)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                معرّف الحساب / Instance ID:
              </label>
              <input
                type="text"
                placeholder="مثال: instance98765"
                value={currentConfig.instanceId || ''}
                onChange={(e) => setForm({ ...currentConfig, instanceId: e.target.value })}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', background: '#ffffff', direction: 'ltr', textAlign: 'left', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                مفتاح الاتصال / Token:
              </label>
              <input
                type="password"
                placeholder="رمز الـ Token السري الخاص بحسابك..."
                value={currentConfig.token || ''}
                onChange={(e) => setForm({ ...currentConfig, token: e.target.value })}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', background: '#ffffff', direction: 'ltr', textAlign: 'left', boxSizing: 'border-box' }}
              />
            </div>

            {currentConfig.provider === 'custom_webhook' && (
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                  رابط الويب هوك (Webhook URL):
                </label>
                <input
                  type="url"
                  placeholder="https://your-api.com/send-message"
                  value={currentConfig.apiUrl || ''}
                  onChange={(e) => setForm({ ...currentConfig, apiUrl: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', background: '#ffffff', direction: 'ltr', textAlign: 'left', boxSizing: 'border-box' }}
                />
              </div>
            )}
          </div>

          {/* Automation Rules */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 800 }}>قواعد الإرسال التلقائي الصامت:</strong>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: '#1e293b' }}>
              <input
                type="checkbox"
                checked={currentConfig.autoSendInvoice}
                onChange={(e) => setForm({ ...currentConfig, autoSendInvoice: e.target.checked })}
                style={{ width: '16px', height: '16px' }}
              />
              <span>إرسال رابط الفاتورة الإلكترونية للعميل تلقائياً فور حفظ الفاتورة بالكاشير.</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: '#1e293b' }}>
              <input
                type="checkbox"
                checked={currentConfig.autoSendOnlineOrder}
                onChange={(e) => setForm({ ...currentConfig, autoSendOnlineOrder: e.target.checked })}
                style={{ width: '16px', height: '16px' }}
              />
              <span>إرسال رسالة تأكيد للعميل فور وصول طلب من المتجر الإلكتروني.</span>
            </label>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                قالب رسالة الفاتورة (تتغير المتغيرات تلقائياً):
              </label>
              <textarea
                rows={3}
                value={currentConfig.invoiceTemplate}
                onChange={(e) => setForm({ ...currentConfig, invoiceTemplate: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#ffffff', boxSizing: 'border-box' }}
              />
              <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                المتغيرات المتاحة: {'{customerName}'}, {'{businessName}'}, {'{invoiceNo}'}, {'{totalAmount}'}, {'{invoiceLink}'}
              </span>
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 700,
              marginBottom: '14px',
              background: feedback.kind === 'success' ? '#dcfce7' : '#fee2e2',
              color: feedback.kind === 'success' ? '#166534' : '#991b1b',
              border: `1px solid ${feedback.kind === 'success' ? '#bbf7d0' : '#fecaca'}`,
            }}
          >
            {feedback.message}
          </div>
        )}

        {/* Footer Actions & Testing */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
          {/* Test connection row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="tel"
              placeholder="رقم الهاتف للتجربة (مثلاً 010...)"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              style={{ width: '190px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#ffffff', direction: 'ltr', textAlign: 'left' }}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={testMutation.isPending || !currentConfig.enabled}
              onClick={handleSendTest}
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              {testMutation.isPending ? 'جاري الإرسال...' : 'إرسال رسالة اختبار'}
            </Button>
          </div>

          <Button
            type="button"
            variant="primary"
            disabled={saveMutation.isPending}
            onClick={handleSave}
            style={{ background: '#170e5e', fontSize: '13px', padding: '8px 20px', fontWeight: 800 }}
          >
            {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </Button>
        </div>
      </div>
    </div>
  );
}
