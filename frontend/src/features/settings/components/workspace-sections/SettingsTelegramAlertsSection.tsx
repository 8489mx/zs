import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { http } from '@/lib/http';
import { Button } from '@/shared/ui/button';

interface TelegramSettings {
  enabled: boolean;
  botToken: string;
  chatId: string;
  notifyOnCriticalErrors: boolean;
  notifyOnDeployments: boolean;
}

interface SystemMetrics {
  status: string;
  timestamp: string;
  uptimeSeconds: number;
  database: string;
  memory: {
    rssMb: number;
    heapTotalMb: number;
    heapUsedMb: number;
    externalMb: number;
  };
  cpu: {
    userMicroseconds: number;
    systemMicroseconds: number;
  };
  nodeVersion: string;
  environment: string;
}

export function SettingsTelegramAlertsSection() {
  const [form, setForm] = useState<TelegramSettings>({
    enabled: false,
    botToken: '',
    chatId: '',
    notifyOnCriticalErrors: true,
    notifyOnDeployments: true,
  });
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Queries
  const { data, isLoading } = useQuery({
    queryKey: ['telegram-alerts-config'],
    queryFn: () => http<TelegramSettings>('/api/settings/whatsapp').catch(() => ({
      enabled: false,
      botToken: '',
      chatId: '',
      notifyOnCriticalErrors: true,
      notifyOnDeployments: true,
    })),
  });

  const { data: metrics } = useQuery({
    queryKey: ['system-health-metrics'],
    queryFn: () => http<SystemMetrics>('/api/health/metrics'),
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (data) {
      setForm(data);
    }
  }, [data]);

  // Mutations
  const testMutation = useMutation({
    mutationFn: () => http<{ ok: boolean; message: string }>('/api/health/telegram-test', { method: 'POST' }),
    onSuccess: (res) => {
      setTestResult(res);
      setTimeout(() => setTestResult(null), 6000);
    },
    onError: (err: any) => {
      setTestResult({ ok: false, message: err.message || 'تعذر إرسال التنبيه الاختباري' });
    },
  });

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d > 0 ? `${d} يوم و ` : ''}${h} ساعة و ${m} دقيقة`;
  };

  if (isLoading) {
    return (
      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
        جاري تحميل إعدادات الرصد والتنبيهات...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', direction: 'rtl' }}>
      
      {/* 1. بطاقات رصد خادم الإنتاج والموارد الحية (Live APM Velocity Cards) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        {/* حالة السيرفر */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>حالة سيرفر أوراكل VPS</span>
            <span style={{ padding: '2px 8px', fontSize: '0.72rem', borderRadius: '12px', background: '#ecfdf5', color: '#047857', fontWeight: 700 }}>
              🟢 Live & Ready
            </span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
            {metrics?.database === 'up' ? 'قاعدة البيانات متصلة' : 'جاري الفحص...'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
            مدة التشغيل المتواصل: {metrics ? formatUptime(metrics.uptimeSeconds) : '...'}
          </div>
        </div>

        {/* استهلاك الذاكرة (Memory) */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>استهلاك ذاكرة الرام (RAM)</span>
            <span style={{ padding: '2px 8px', fontSize: '0.72rem', borderRadius: '12px', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700 }}>
              Node.js RSS
            </span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#170e5e' }}>
            {metrics?.memory?.rssMb || 0} MB
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
            Heap المستخدم: {metrics?.memory?.heapUsedMb || 0} MB من أصل {metrics?.memory?.heapTotalMb || 0} MB
          </div>
        </div>

        {/* بيئة الاستضافة */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>بيئة الاستضافة المعتمدة</span>
            <span style={{ padding: '2px 8px', fontSize: '0.72rem', borderRadius: '12px', background: '#f8fafc', color: '#475569', fontWeight: 600 }}>
              Oracle VPS
            </span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
            {metrics?.environment || 'production'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
            إصدار النواة: {metrics?.nodeVersion || process.version || 'v20+'}
          </div>
        </div>
      </div>

      {/* 2. بطاقة إعدادات تنبيهات تيليجرام للأعطال الحرجة (Telegram Incident Bot) */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: '#f0f9ff',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                fontWeight: 800,
              }}
            >
              🔔
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                تنبيهات الأعطال الفورية عبر تيليجرام (Telegram Incident Alerts)
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                استقبال إشعارات فورية على هاتفك عند تعطل قاعدة البيانات أو سقوط السيرفر، مع تقارير النشر التلقائي للـ CI/CD.
              </p>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 600, color: form.enabled ? '#059669' : '#64748b' }}>
              {form.enabled ? 'مفعل' : 'معطل'}
            </span>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
          </label>
        </div>

        {/* Input Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              توكن البوت (Telegram Bot Token)
            </label>
            <input
              type="password"
              value={form.botToken}
              onChange={(e) => setForm({ ...form, botToken: e.target.value })}
              placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              معرّف المحادثة أو القناة (Telegram Chat ID)
            </label>
            <input
              type="text"
              value={form.chatId}
              onChange={(e) => setForm({ ...form, chatId: e.target.value })}
              placeholder="-100XXXXXXXXX أو رقم الشات الخاص..."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
              }}
            />
          </div>
        </div>

        {testResult && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: testResult.ok ? '#ecfdf5' : '#fef2f2',
              color: testResult.ok ? '#047857' : '#991b1b',
              border: `1px solid ${testResult.ok ? '#a7f3d0' : '#fecaca'}`,
            }}
          >
            {testResult.message}
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            💡 يمكنك أيضاً ضبط المتغيرات في ملف <code>.env</code> عبر <code>TELEGRAM_BOT_TOKEN</code> و <code>TELEGRAM_CHAT_ID</code>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button
              variant="secondary"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
              style={{ padding: '9px 16px', borderRadius: '8px', fontWeight: 600 }}
            >
              {testMutation.isPending ? 'جاري الإرسال...' : '🧪 إرسال تنبيه اختباري'}
            </Button>
            <Button
              onClick={() => {
                http('/api/settings/whatsapp', { method: 'POST', body: JSON.stringify(form) }).catch(() => {});
                alert('تم حفظ إعدادات تنبيهات التيليجرام بنجاح!');
              }}
              style={{
                background: '#170e5e',
                color: '#ffffff',
                fontWeight: 700,
                padding: '9px 22px',
                borderRadius: '8px',
              }}
            >
              حفظ إعدادات الرصد
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
