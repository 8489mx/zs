import { useState, useEffect } from 'react';
import { MaritimeMailConfig, maritimeApi } from '../api/maritime-freight.api';
import {
  SettingsIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  MailIcon,
  SendIcon,
  CheckIcon,
} from '@/shared/components/icons/AppIcons';

const DEFAULT_CONFIG: MaritimeMailConfig = {
  outgoingProvider: 'outlook',
  smtpHost: 'smtp.office365.com',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: '',
  smtpPassword: '',
  fromName: 'قسم الشحن البحري والعمليات',
  fromEmail: '',

  incomingProvider: 'outlook',
  imapHost: 'outlook.office365.com',
  imapPort: 993,
  imapSecure: true,
  imapUser: '',
  imapPassword: '',

  autoReadInboundBids: true,
  lastSyncAt: null,
  lastSyncStatus: null,
  lastSyncDetails: null,
};

export function MaritimeSettingsTab() {
  const [config, setConfig] = useState<MaritimeMailConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const [testResult, setTestResult] = useState<{
    smtpSuccess?: boolean;
    imapSuccess?: boolean;
    smtpMessage?: string;
    imapMessage?: string;
  } | null>(null);

  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    syncedCount: number;
    message: string;
    details?: any[];
  } | null>(null);

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testTargetEmail, setTestTargetEmail] = useState('');
  const [showTestEmailInput, setShowTestEmailInput] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await maritimeApi.getMailSettings();
      if (res.config) {
        setConfig({
          ...DEFAULT_CONFIG,
          ...res.config,
        });
        if (res.config.fromEmail) {
          setTestTargetEmail(res.config.fromEmail);
        }
      }
    } catch (err: any) {
      console.error('Failed to load maritime mail settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset: 'outlook' | 'gmail' | 'custom') => {
    if (preset === 'outlook') {
      setConfig((prev: MaritimeMailConfig) => ({
        ...prev,
        outgoingProvider: 'outlook',
        smtpHost: 'smtp.office365.com',
        smtpPort: 587,
        smtpSecure: false,
        incomingProvider: 'outlook',
        imapHost: 'outlook.office365.com',
        imapPort: 993,
        imapSecure: true,
      }));
    } else if (preset === 'gmail') {
      setConfig((prev: MaritimeMailConfig) => ({
        ...prev,
        outgoingProvider: 'gmail',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 465,
        smtpSecure: true,
        incomingProvider: 'gmail',
        imapHost: 'imap.gmail.com',
        imapPort: 993,
        imapSecure: true,
      }));
    } else {
      setConfig((prev: MaritimeMailConfig) => ({
        ...prev,
        outgoingProvider: 'custom',
        incomingProvider: 'custom',
      }));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setFeedbackMsg(null);
      await maritimeApi.saveMailSettings(config);
      setFeedbackMsg({ type: 'success', text: 'تم حفظ إعدادات البريد الإلكتروني بنجاح.' });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'فشل حفظ الإعدادات.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      setFeedbackMsg(null);
      const res = await maritimeApi.testMailConnection({
        smtp: {
          host: config.smtpHost,
          port: config.smtpPort,
          secure: config.smtpSecure,
          user: config.smtpUser,
          password: config.smtpPassword || '',
        },
        imap: {
          host: config.imapHost,
          port: config.imapPort,
          secure: config.imapSecure,
          user: config.imapUser,
          password: config.imapPassword || '',
        },
      });

      setTestResult({
        smtpSuccess: res.smtpOk,
        imapSuccess: res.imapOk,
        smtpMessage: res.smtpMessage,
        imapMessage: res.imapMessage,
      });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'فشل تنفيذ اختبار الاتصال.' });
    } finally {
      setTesting(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testTargetEmail.trim()) {
      alert('يرجى كتابة البريد الإلكتروني المستلم للتجربة.');
      return;
    }
    try {
      setSendingTest(true);
      setFeedbackMsg(null);
      const res = await maritimeApi.sendTestEmail(testTargetEmail.trim());
      setFeedbackMsg({ type: 'success', text: `تم إرسال البريد التجريبي بنجاح (المعرف: ${res.messageId})` });
      setShowTestEmailInput(false);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'فشل إرسال البريد التجريبي.' });
    } finally {
      setSendingTest(false);
    }
  };

  const handleSyncInboundBids = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      setFeedbackMsg(null);
      const res = await maritimeApi.syncInboundBids();
      setSyncResult({
        success: !res.error,
        syncedCount: res.imported,
        message: res.summary || 'تم مسح صندوق الوارد بنجاح.',
      });
      await loadSettings();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'فشل مزامنة عروض الخطوط الملاحية.' });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#64748b' }}>
        جاري تحميل إعدادات بريد الشحن والربط الآلي...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* هيدر الكارت الموحد مع التنبيه والملاحظات */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SettingsIcon size={18} color="#170e5e" />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                إعدادات البريد الإلكتروني وأتمتة الشحن البحري (Mail & Freight Automation)
              </h3>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
              ربط حساب Outlook أو خادم البريد المخصص لشركتك لإرسال طلبات التسعير (RFQs) آلياً للخطوط الملاحية وقراءة عروض الأسعار الواردة بالذكاء الاصطناعي
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              style={{
                height: '36px',
                padding: '0 18px',
                background: '#170e5e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(23, 14, 94, 0.15)',
              }}
            >
              <CheckIcon size={15} />
              <span>{saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}</span>
            </button>
          </div>
        </div>

        {/* إشعار التغذية الراجعة */}
        {feedbackMsg && (
          <div
            style={{
              marginTop: '14px',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: feedbackMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${feedbackMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              color: feedbackMsg.type === 'success' ? '#166534' : '#991b1b',
            }}
          >
            {feedbackMsg.type === 'success' ? <CheckCircleIcon size={16} /> : <AlertTriangleIcon size={16} />}
            <span>{feedbackMsg.text}</span>
          </div>
        )}
      </div>

      {/* أزرار الضبط السريع لنوع السيرفر */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155' }}>
            الضبط المسبق لخوادم البريد الشائعة:
          </span>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            (اختر نوع السيرفر لتعبئة المنافذ والعناوين القياسية تلقائياً)
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => applyPreset('outlook')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: config.outgoingProvider === 'outlook' ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
              background: config.outgoingProvider === 'outlook' ? '#f0f4ff' : '#ffffff',
              color: config.outgoingProvider === 'outlook' ? '#170e5e' : '#475569',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Microsoft 365 / Outlook (الافتراضي للشحن)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('gmail')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: config.outgoingProvider === 'gmail' ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
              background: config.outgoingProvider === 'gmail' ? '#f0f4ff' : '#ffffff',
              color: config.outgoingProvider === 'gmail' ? '#170e5e' : '#475569',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Google Workspace / Gmail
          </button>
          <button
            type="button"
            onClick={() => applyPreset('custom')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: config.outgoingProvider === 'custom' ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
              background: config.outgoingProvider === 'custom' ? '#f0f4ff' : '#ffffff',
              color: config.outgoingProvider === 'custom' ? '#170e5e' : '#475569',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            سيرفر خاص مخصص (Custom Server)
          </button>
        </div>
      </div>

      {/* كارتان متناسقان وفق معيار المنظومة (2-Column Grid) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
        {/* كارت الإرسال SMTP */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '14px' }}>
            <SendIcon size={18} color="#170e5e" />
            <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
              خادم البريد الصادر (SMTP Outgoing)
            </h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                عنوان خادم الإرسال (SMTP Host) *
              </label>
              <input
                type="text"
                value={config.smtpHost}
                onChange={(e) => setConfig({ ...config, smtpHost: e.target.value })}
                placeholder="مثال: smtp.office365.com"
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8125rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  المنفذ (Port) *
                </label>
                <input
                  type="number"
                  value={config.smtpPort}
                  onChange={(e) => setConfig({ ...config, smtpPort: parseInt(e.target.value, 10) || 587 })}
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8125rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  نوع التشفير
                </label>
                <select
                  value={config.smtpSecure ? 'ssl' : 'starttls'}
                  onChange={(e) => setConfig({ ...config, smtpSecure: e.target.value === 'ssl' })}
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8125rem', background: '#fff' }}
                >
                  <option value="starttls">STARTTLS (Port 587)</option>
                  <option value="ssl">SSL / TLS (Port 465)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                اسم المرسل المعروض (From Name)
              </label>
              <input
                type="text"
                value={config.fromName}
                onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
                placeholder="مثال: شركة النجم للشحن الدولي"
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8125rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                عنوان البريد الإلكتروني للمرسل (From Email / Username) *
              </label>
              <input
                type="email"
                value={config.smtpUser}
                onChange={(e) => {
                  const val = e.target.value;
                  setConfig({
                    ...config,
                    smtpUser: val,
                    fromEmail: config.fromEmail ? config.fromEmail : val,
                    imapUser: config.imapUser ? config.imapUser : val,
                  });
                }}
                placeholder="freight@yourcompany.com"
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8125rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                كلمة المرور / رمز التطبيق (App Password)
              </label>
              <input
                type="password"
                value={config.smtpPassword || ''}
                onChange={(e) => setConfig({ ...config, smtpPassword: e.target.value })}
                placeholder={config.smtpPassword ? '••••••••' : 'أدخل كلمة المرور أو كلمة مرور التطبيقات'}
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8125rem' }}
              />
              <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                ملاحظة: إذا كان حساب Outlook أو Gmail مفعلاً عليه التحقق بخطوتين (2FA)، يرجى استخدام "رمز تطبيق" (App Password).
              </span>
            </div>
          </div>
        </div>

        {/* كارت الاستقبال IMAP */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '14px' }}>
            <MailIcon size={18} color="#170e5e" />
            <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
              خادم البريد الوارد للقراءة الآلية (IMAP Inbound)
            </h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                عنوان خادم الاستقبال (IMAP Host) *
              </label>
              <input
                type="text"
                value={config.imapHost}
                onChange={(e) => setConfig({ ...config, imapHost: e.target.value })}
                placeholder="مثال: outlook.office365.com"
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8125rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  المنفذ (Port) *
                </label>
                <input
                  type="number"
                  value={config.imapPort}
                  onChange={(e) => setConfig({ ...config, imapPort: parseInt(e.target.value, 10) || 993 })}
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8125rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  تشفير الاتصال
                </label>
                <select
                  value={config.imapSecure ? 'ssl' : 'plain'}
                  onChange={(e) => setConfig({ ...config, imapSecure: e.target.value === 'ssl' })}
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8125rem', background: '#fff' }}
                >
                  <option value="ssl">SSL / TLS (الافتراضي المنفذ 993)</option>
                  <option value="plain">غير مشفر (منفذ 143)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                اسم المستخدم للبريد الوارد (IMAP User) *
              </label>
              <input
                type="text"
                value={config.imapUser}
                onChange={(e) => setConfig({ ...config, imapUser: e.target.value })}
                placeholder="freight@yourcompany.com"
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8125rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                كلمة المرور للبريد الوارد (IMAP Password)
              </label>
              <input
                type="password"
                value={config.imapPassword || ''}
                onChange={(e) => setConfig({ ...config, imapPassword: e.target.value })}
                placeholder={config.imapPassword ? '••••••••' : 'نفس كلمة مرور البريد أو رمز التطبيق'}
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8125rem' }}
              />
            </div>

            <div style={{ marginTop: '6px', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={config.autoReadInboundBids}
                  onChange={(e) => setConfig({ ...config, autoReadInboundBids: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b' }}>
                  تفعيل القراءة الذاتية لرسائل عروض الأسعار الواردة من الخطوط
                </span>
              </label>
              <p style={{ margin: '4px 0 0 24px', fontSize: '0.72rem', color: '#64748b' }}>
                يقوم النظام بالبحث التلقائي عن الرسائل التي تحتوي على أكواد طلبات التسعير (مثل RFQ-) واستخراج الأسعار وإدراجها فورياً في مصفوفة المقارنة
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* مركز الفحص والاختبار والتشغيل المباشر */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '14px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
              مركز الفحص والاختبار والتشغيل المباشر (Diagnostic & Action Center)
            </h4>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              تأكيد نجاح الاتصال بكلا الخادمين (SMTP & IMAP) ومزامنة صندوق الوارد الآن
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              type="button"
              disabled={testing}
              onClick={handleTestConnection}
              style={{
                padding: '7px 14px',
                background: '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <RefreshCwIcon size={14} />
              <span>{testing ? 'جاري فحص الاتصال...' : 'فحص واختبار الاتصال'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTestEmailInput(!showTestEmailInput)}
              style={{
                padding: '7px 14px',
                background: '#ffffff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <SendIcon size={14} />
              <span>إرسال بريد تجريبي</span>
            </button>

            <button
              type="button"
              disabled={syncing}
              onClick={handleSyncInboundBids}
              style={{
                padding: '7px 14px',
                background: '#15803d',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(21, 128, 61, 0.15)',
              }}
            >
              <RefreshCwIcon size={14} />
              <span>{syncing ? 'جاري المزامنة...' : 'مزامنة البريد واستيراد العروض الآن'}</span>
            </button>
          </div>
        </div>

        {/* حقل إرسال بريد تجريبي */}
        {showTestEmailInput && (
          <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
              البريد الإلكتروني المستلم:
            </span>
            <input
              type="email"
              value={testTargetEmail}
              onChange={(e) => setTestTargetEmail(e.target.value)}
              placeholder="name@example.com"
              style={{ flex: '1 1 200px', maxWidth: '320px', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8125rem' }}
            />
            <button
              type="button"
              disabled={sendingTest}
              onClick={handleSendTestEmail}
              style={{
                padding: '6px 14px',
                background: '#170e5e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {sendingTest ? 'جاري الإرسال...' : 'إرسال الرسالة الآن'}
            </button>
          </div>
        )}

        {/* نتائج فحص الاتصال */}
        {testResult && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '14px' }}>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                border: `1px solid ${testResult.smtpSuccess ? '#bbf7d0' : '#fecaca'}`,
                background: testResult.smtpSuccess ? '#f0fdf4' : '#fef2f2',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.8125rem', color: testResult.smtpSuccess ? '#166534' : '#991b1b' }}>
                {testResult.smtpSuccess ? <CheckCircleIcon size={16} /> : <AlertTriangleIcon size={16} />}
                <span>خادم الإرسال (SMTP): {testResult.smtpSuccess ? 'متصل بنجاح ومصادق' : 'فشل الاتصال'}</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '4px' }}>
                {testResult.smtpMessage}
              </div>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                border: `1px solid ${testResult.imapSuccess ? '#bbf7d0' : '#fecaca'}`,
                background: testResult.imapSuccess ? '#f0fdf4' : '#fef2f2',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.8125rem', color: testResult.imapSuccess ? '#166534' : '#991b1b' }}>
                {testResult.imapSuccess ? <CheckCircleIcon size={16} /> : <AlertTriangleIcon size={16} />}
                <span>خادم الاستقبال (IMAP): {testResult.imapSuccess ? 'متصل بنجاح وجاهز للقراءة' : 'فشل الاتصال'}</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '4px' }}>
                {testResult.imapMessage}
              </div>
            </div>
          </div>
        )}

        {/* نتيجة المزامنة اللحظية */}
        {syncResult && (
          <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
            <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#1e293b' }}>
              نتيجة فحص البريد الوارد: {syncResult.message}
            </div>
            {syncResult.details && syncResult.details.length > 0 ? (
              <ul style={{ margin: '6px 0 0 0', paddingInlineStart: '20px', fontSize: '0.75rem', color: '#475569' }}>
                {syncResult.details.map((item, idx) => (
                  <li key={idx}>
                    عرض مستلم للطلب #{item.rfqNumber}: الخط الملاحي {item.carrier} بسعر ${item.price} ({item.freeDays} أيام سماح)
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}

        {/* معلومات آخر عملية مزامنة مسجلة */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.75rem', color: '#64748b' }}>
          <div>
            <strong>تاريخ آخر مزامنة:</strong>{' '}
            {config.lastSyncAt ? new Date(config.lastSyncAt).toLocaleString('ar-EG') : 'لم تتم المزامنة بعد'}
          </div>
          <div>
            <strong>حالة آخر فحص:</strong>{' '}
            {config.lastSyncStatus === 'success' ? (
              <span style={{ color: '#16a34a', fontWeight: 700 }}>ناجحة</span>
            ) : config.lastSyncStatus === 'failed' ? (
              <span style={{ color: '#dc2626', fontWeight: 700 }}>فشلت</span>
            ) : (
              'لا يوجد'
            )}
          </div>
          {config.lastSyncDetails && (
            <div>
              <strong>تفاصيل:</strong> {config.lastSyncDetails}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
