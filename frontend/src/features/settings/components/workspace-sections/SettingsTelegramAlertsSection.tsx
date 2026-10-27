import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { http } from '@/lib/http';
import { Button } from '@/shared/ui/button';
import { SubmitButton } from '@/shared/components/submit-button';
import { BellIcon, LightbulbIcon, CheckIcon } from '@/shared/components/icons/AppIcons';
import { toast } from '@/shared/components/system-alert';

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
  const { t } = useTranslation();
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

  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await http('/api/settings/whatsapp', { method: 'POST', body: JSON.stringify(form) });
      setIsSaved(true);
      toast.success(t('settings.workspace_sections.settings_telegram_alerts_section.s22', "تم حفظ إعدادات تنبيهات التيليجرام بنجاح!"));
      setTimeout(() => setIsSaved(false), 3500);
    } catch (err: any) {
      toast.error(err?.message || 'تعذر حفظ إعدادات التيليجرام');
    } finally {
      setIsSaving(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d > 0 ? `${d} يوم و ` : ''}${h} ساعة و ${m} دقيقة`;
  };

  if (isLoading) {
    return (
      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
        {t('settings.workspace_sections.settings_telegram_alerts_section.s0', "جاري تحميل إعدادات الرصد والتنبيهات...")}
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
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>{t('settings.workspace_sections.settings_telegram_alerts_section.s1', "حالة سيرفر أوراكل VPS")}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', fontSize: '0.72rem', borderRadius: '12px', background: '#ecfdf5', color: '#047857', fontWeight: 700 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
              Live & Ready
            </span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
            {metrics?.database === 'up' ? t('settings.workspace_sections.settings_telegram_alerts_section.s2', "قاعدة البيانات متصلة") : t('settings.workspace_sections.settings_telegram_alerts_section.s3', "جاري الفحص...")}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
            {t('settings.workspace_sections.settings_telegram_alerts_section.s4', "مدة التشغيل المتواصل:")} {metrics ? formatUptime(metrics.uptimeSeconds) : '...'}
          </div>
        </div>

        {/* استهلاك الذاكرة (Memory) */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>{t('settings.workspace_sections.settings_telegram_alerts_section.s5', "استهلاك ذاكرة الرام (RAM)")}</span>
            <span style={{ padding: '2px 8px', fontSize: '0.72rem', borderRadius: '12px', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700 }}>
              Node.js RSS
            </span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#170e5e' }}>
            {metrics?.memory?.rssMb || 0} MB
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
            {t('settings.workspace_sections.settings_telegram_alerts_section.s6', "Heap المستخدم:")} {metrics?.memory?.heapUsedMb || 0} {t('settings.workspace_sections.settings_telegram_alerts_section.s7', "MB من أصل")} {metrics?.memory?.heapTotalMb || 0} MB
          </div>
        </div>

        {/* بيئة الاستضافة */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>{t('settings.workspace_sections.settings_telegram_alerts_section.s8', "بيئة الاستضافة المعتمدة")}</span>
            <span style={{ padding: '2px 8px', fontSize: '0.72rem', borderRadius: '12px', background: '#f8fafc', color: '#475569', fontWeight: 600 }}>
              Oracle VPS
            </span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
            {metrics?.environment || 'production'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
            {t('settings.workspace_sections.settings_telegram_alerts_section.s9', "إصدار النواة:")} {metrics?.nodeVersion || 'v20+'}
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
                fontWeight: 800,
              }}
            >
              <BellIcon size={22} color="#0284c7" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.35 }}>
                {t('settings.workspace_sections.settings_telegram_alerts_section.s10', "تنبيهات الأعطال الفورية عبر تيليجرام")}
                <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', fontWeight: 600, direction: 'ltr', textAlign: 'right', marginTop: '2px' }}>
                  (Telegram Incident Alerts)
                </span>
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
                {t('settings.workspace_sections.settings_telegram_alerts_section.s11', "استقبال إشعارات فورية على هاتفك عند تعطل قاعدة البيانات أو سقوط السيرفر، مع تقارير النشر التلقائي للـ CI/CD.")}
              </p>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 600, color: form.enabled ? '#059669' : '#64748b' }}>
              {form.enabled ? t('settings.workspace_sections.settings_telegram_alerts_section.s12', "مفعل") : t('settings.workspace_sections.settings_telegram_alerts_section.s13', "معطل")}
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
              {t('settings.workspace_sections.settings_telegram_alerts_section.s14', "توكن البوت (Telegram Bot Token)")}
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
              {t('settings.workspace_sections.settings_telegram_alerts_section.s15', "معرّف المحادثة أو القناة (Telegram Chat ID)")}
            </label>
            <input
              type="text"
              value={form.chatId}
              onChange={(e) => setForm({ ...form, chatId: e.target.value })}
              placeholder={t('settings.workspace_sections.settings_telegram_alerts_section.s16', "-100XXXXXXXXX أو رقم الشات الخاص...")}
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
        <div className="telegram-alerts-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '16px', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#64748b', minWidth: 0 }}>
            <LightbulbIcon size={15} color="#64748b" style={{ flexShrink: 0 }} />
            <span style={{ lineHeight: 1.5 }}>
              {t('settings.workspace_sections.settings_telegram_alerts_section.s17', "يمكنك أيضاً ضبط المتغيرات في ملف")} <code>.env</code> {t('settings.workspace_sections.settings_telegram_alerts_section.s18', "عبر")} <code>TELEGRAM_BOT_TOKEN</code> {t('settings.workspace_sections.settings_telegram_alerts_section.s19', "و")} <code>TELEGRAM_CHAT_ID</code>
            </span>
          </div>

          <div className="telegram-alerts-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
              style={{ padding: '9px 16px', borderRadius: '8px', fontWeight: 600 }}
            >
              {testMutation.isPending ? t('settings.workspace_sections.settings_telegram_alerts_section.s20', "جاري الإرسال...") : t('settings.workspace_sections.settings_telegram_alerts_section.s21', "إرسال تنبيه اختباري")}
            </Button>
            <SubmitButton
              type="button"
              onClick={handleSave}
              isPending={isSaving}
              isSuccess={isSaved}
              idleText={t('settings.workspace_sections.settings_telegram_alerts_section.s23', "حفظ إعدادات الرصد")}
              pendingText={t('settings.workspace_sections.settings_telegram_alerts_section.s20', "جاري الحفظ...")}
              successText="تم حفظ إعدادات التيليجرام بنجاح!"
              style={{
                background: '#170e5e',
                color: '#ffffff',
                fontWeight: 700,
                padding: '9px 22px',
                borderRadius: '8px',
              }}
            />
          </div>

          {isSaved && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                background: '#f0fdf4',
                border: '1.5px solid #86efac',
                borderRadius: '8px',
                color: '#15803d',
                fontSize: '12.5px',
                fontWeight: 800,
                marginTop: '10px',
                boxShadow: '0 1px 4px rgba(22, 163, 74, 0.12)',
              }}
            >
              <CheckIcon size={16} color="#16a34a" />
              <span>تم حفظ وتفعيل إعدادات تنبيهات التيليجرام بنجاح! الرصد يعمل مباشرة الآن.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
