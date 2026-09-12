import { useState, useEffect } from 'react';
import { MaritimeMailConfig, maritimeApi } from '../api/maritime-freight.api';
import { useAuthStore } from '@/stores/auth-store';
import { settingsApi } from '@/features/settings/api/settings.api';
import {
  SettingsIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  MailIcon,
  SendIcon,
  CheckIcon,
} from '@/shared/components/icons/AppIcons';
import { toast } from '@/shared/components/system-alert';

export const STANDARD_EMAIL_TEMPLATES = {
  subject: '[{{rfq_number}}] Ocean Freight Rate Inquiry: {{pol_name}} to {{pod_name}} ({{container_count}}x {{container_type}})',
  intro: 'Dear {{carrier_name}} Pricing Desk,\n\nPlease provide your most competitive ocean freight spot rate for the following containerized shipment:',
  signature: 'Best regards,\n{{company_name}} Operations & Maritime Procurement Desk\n{{company_email}}',
};

const DEFAULT_CONFIG: MaritimeMailConfig = {
  outgoingProvider: 'custom',
  smtpHost: 'mail.yourcompany.com',
  smtpPort: 465,
  smtpSecure: true,
  smtpUser: '',
  smtpPassword: '',
  fromName: 'إدارة الشحن واللوجستيات',
  fromEmail: '',

  incomingProvider: 'custom',
  imapHost: 'mail.yourcompany.com',
  imapPort: 993,
  imapSecure: true,
  imapUser: '',
  imapPassword: '',

  autoReadInboundBids: true,
  lastSyncAt: null,
  lastSyncStatus: null,
  lastSyncDetails: null,

  emailSubjectTemplate: STANDARD_EMAIL_TEMPLATES.subject,
  emailIntroTemplate: STANDARD_EMAIL_TEMPLATES.intro,
  emailSignatureTemplate: STANDARD_EMAIL_TEMPLATES.signature,
};

export function MaritimeSettingsTab() {
  const { tenant, storeName } = useAuthStore();
  const [companyProfile, setCompanyProfile] = useState<{
    name: string;
    email: string;
    phone: string;
  }>({
    name: storeName || tenant?.businessName || 'الشركة اللوجستية',
    email: '',
    phone: '',
  });

  // Official company email (separate from SMTP credentials)
  const [companyOfficialEmail, setCompanyOfficialEmail] = useState('');

  // Locked state for sensitive credential fields (locked = saved, must click تغيير to edit)
  const [unlockedFields, setUnlockedFields] = useState<Set<string>>(new Set());
  const unlockField = (field: string) =>
    setUnlockedFields((prev) => new Set([...prev, field]));
  // A credential field is locked when it has a non-empty saved value AND hasn't been unlocked by the user
  const isCredLocked = (field: string, savedValue?: string | null) =>
    !!(savedValue && savedValue.trim() !== '' && !unlockedFields.has(field));

  // Card-level locking states for top-level protection against accidental edits or browser autofill
  const [smtpCardLocked, setSmtpCardLocked] = useState(true);
  const [imapCardLocked, setImapCardLocked] = useState(true);

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
  const [activeField, setActiveField] = useState<'subject' | 'intro' | 'signature'>('subject');

  const handleInsertTag = (tag: string) => {
    if (activeField === 'subject') {
      const cur = config.emailSubjectTemplate || '';
      setConfig({ ...config, emailSubjectTemplate: cur ? `${cur} ${tag}` : tag });
    } else if (activeField === 'intro') {
      const cur = config.emailIntroTemplate || '';
      setConfig({ ...config, emailIntroTemplate: cur ? `${cur} ${tag}` : tag });
    } else if (activeField === 'signature') {
      const cur = config.emailSignatureTemplate || '';
      setConfig({ ...config, emailSignatureTemplate: cur ? `${cur} ${tag}` : tag });
    }
  };

  const handleResetTemplates = () => {
    setConfig({
      ...config,
      emailSubjectTemplate: STANDARD_EMAIL_TEMPLATES.subject,
      emailIntroTemplate: STANDARD_EMAIL_TEMPLATES.intro,
      emailSignatureTemplate: STANDARD_EMAIL_TEMPLATES.signature,
    });
  };

  const renderLivePreview = (templateStr: string) => {
    if (!templateStr) return '';
    const activeCompanyName = config.fromName?.trim() || companyProfile.name || 'Your Company';
    const activeCompanyEmail = config.fromEmail?.trim() || config.smtpUser?.trim() || companyProfile.email || 'operations@yourcompany.com';
    const activeCompanyPhone = companyProfile.phone || '';

    return templateStr
      .replace(/{{rfq_number}}/g, 'RFQ-2026-0045')
      .replace(/{{carrier_name}}/g, 'Maersk Line (توكيل ميرسك)')
      .replace(/{{pol_name}}/g, 'Alexandria Port')
      .replace(/{{pod_name}}/g, 'Shanghai Port')
      .replace(/{{pol_code}}/g, 'EGALY')
      .replace(/{{pod_code}}/g, 'CNSHA')
      .replace(/{{container_count}}/g, '2')
      .replace(/{{container_type}}/g, "40' High Cube")
      .replace(/{{cargo_mode}}/g, 'FCL')
      .replace(/{{commodity}}/g, 'General Cargo')
      .replace(/{{target_free_days}}/g, '14')
      .replace(/{{incoterm}}/g, 'FOB')
      .replace(/{{company_name}}/g, activeCompanyName)
      .replace(/{{company_email}}/g, activeCompanyEmail)
      .replace(/{{company_phone}}/g, activeCompanyPhone);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [res, appSettings] = await Promise.all([
        maritimeApi.getMailSettings().catch(() => null),
        settingsApi.settings().catch(() => null),
      ]);

      const resolvedCompanyName = (appSettings as any)?.companyName || (appSettings as any)?.storeName || storeName || tenant?.businessName || 'الشركة اللوجستية';
      const resolvedCompanyEmail = (appSettings as any)?.email || '';
      const resolvedCompanyPhone = (appSettings as any)?.phone || '';

      setCompanyProfile({
        name: resolvedCompanyName,
        email: resolvedCompanyEmail,
        phone: resolvedCompanyPhone,
      });

      const mailConfig = res?.config || (res && (res.smtpHost || res.outgoingProvider) ? res : null);
      if (mailConfig) {
        const loaded = {
          ...DEFAULT_CONFIG,
          ...mailConfig,
          fromName: mailConfig.fromName?.trim() || resolvedCompanyName,
          fromEmail: mailConfig.fromEmail?.trim() || resolvedCompanyEmail,
          emailSubjectTemplate: mailConfig.emailSubjectTemplate || STANDARD_EMAIL_TEMPLATES.subject,
          emailIntroTemplate: mailConfig.emailIntroTemplate || STANDARD_EMAIL_TEMPLATES.intro,
          emailSignatureTemplate: mailConfig.emailSignatureTemplate || STANDARD_EMAIL_TEMPLATES.signature,
        };
        setConfig(loaded);
        // Lock all credential fields that have saved values and lock both server cards
        setUnlockedFields(new Set());
        setSmtpCardLocked(true);
        setImapCardLocked(true);
        // Set official company email from saved config
        setCompanyOfficialEmail(mailConfig.companyOfficialEmail || resolvedCompanyEmail || '');
        if (mailConfig.fromEmail || resolvedCompanyEmail) {
          setTestTargetEmail(mailConfig.fromEmail || resolvedCompanyEmail);
        }
      } else {
        setConfig((prev) => ({
          ...prev,
          fromName: resolvedCompanyName,
          fromEmail: resolvedCompanyEmail,
        }));
        setCompanyOfficialEmail(resolvedCompanyEmail);
        setSmtpCardLocked(false);
        setImapCardLocked(false);
      }
    } catch (err: any) {
      console.error('Failed to load maritime mail settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (provider: 'custom' | 'outlook' | 'gmail') => {
    // Unlock cards so user can inspect and customize preset values
    setSmtpCardLocked(false);
    setImapCardLocked(false);
    if (provider === 'custom') {
      setConfig((prev: MaritimeMailConfig) => ({
        ...prev,
        outgoingProvider: 'custom',
        incomingProvider: 'custom',
        smtpHost: prev.smtpHost && prev.smtpHost !== 'smtp.office365.com' && prev.smtpHost !== 'smtp.gmail.com' ? prev.smtpHost : 'mail.yourcompany.com',
        smtpPort: 465,
        smtpSecure: true,
        imapHost: prev.imapHost && prev.imapHost !== 'outlook.office365.com' && prev.imapHost !== 'imap.gmail.com' ? prev.imapHost : 'mail.yourcompany.com',
        imapPort: 993,
        imapSecure: true,
      }));
    } else if (provider === 'outlook') {
      setConfig((prev: MaritimeMailConfig) => ({
        ...prev,
        outgoingProvider: 'outlook',
        incomingProvider: 'outlook',
        smtpHost: 'smtp.office365.com',
        smtpPort: 587,
        smtpSecure: false,
        imapHost: 'outlook.office365.com',
        imapPort: 993,
        imapSecure: true,
      }));
    } else if (provider === 'gmail') {
      setConfig((prev: MaritimeMailConfig) => ({
        ...prev,
        outgoingProvider: 'gmail',
        incomingProvider: 'gmail',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 465,
        smtpSecure: true,
        imapHost: 'imap.gmail.com',
        imapPort: 993,
        imapSecure: true,
      }));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setFeedbackMsg(null);
      const cleanConfig: MaritimeMailConfig = {
        ...config,
        smtpUser: config.smtpUser.trim(),
        fromEmail: (config.fromEmail && config.fromEmail.includes('@')) ? config.fromEmail.trim() : config.smtpUser.trim(),
        imapUser: (config.imapUser ? config.imapUser.trim() : config.smtpUser.trim()),
        ...(companyOfficialEmail.trim() ? { companyOfficialEmail: companyOfficialEmail.trim() } as any : {}),
      };
      await maritimeApi.saveMailSettings(cleanConfig);
      setConfig(cleanConfig);
      // Re-lock credential fields and both cards after successful save
      setUnlockedFields(new Set());
      setSmtpCardLocked(true);
      setImapCardLocked(true);
      setFeedbackMsg({ type: 'success', text: 'تم حفظ إعدادات البريد الإلكتروني وقوالب الرسائل بنجاح.' });
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
      toast.warning('يرجى كتابة البريد الإلكتروني المستلم للتجربة.');
      return;
    }
    try {
      setSendingTest(true);
      setFeedbackMsg(null);
      // Auto-save current configuration first
      await maritimeApi.saveMailSettings(config);
      const res = await maritimeApi.sendTestEmail(testTargetEmail.trim());
      setFeedbackMsg({ type: 'success', text: `تم إرسال البريد التجريبي بنجاح إلى (${testTargetEmail.trim()}) [معرف الرسالة: ${res.messageId || 'OK'}]` });
      setShowTestEmailInput(false);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'فشل إرسال البريد التجريبي. تأكد من صحة بيانات الخادم وكلمة المرور.' });
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
            {companyProfile.name && (
              <div style={{ marginTop: '8px', padding: '8px 12px', background: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: '8px', fontSize: '0.78rem', color: '#3730a3', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 700 }}>هوية شركتك المرتبطة تلقائياً:</span>
                <span style={{ fontWeight: 600 }}>{companyProfile.name}</span>
                {companyProfile.email && <span style={{ color: '#6366f1' }}>— {companyProfile.email}</span>}
                <span style={{ color: '#64748b', marginInlineStart: 'auto', fontSize: '0.72rem' }}>
                  يتم استيراد هذه البيانات تلقائياً من إعدادات المنشأة العامة
                </span>
              </div>
            )}
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
            سيرفر خاص مخصص (Custom SMTP / Private Mail Server)
          </button>
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
            Microsoft 365 / Outlook
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
        </div>
      </div>

      {/* البريد الرسمي للشركة */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '14px' }}>
          <MailIcon size={17} color="#170e5e" />
          <div>
            <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>البريد الإلكتروني الرسمي للشركة</h4>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              هذا البريد يُستخدم في توقيع الرسائل والقوالب عبر متغير <span dir="ltr" style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px', fontSize: '0.72rem', color: '#4f46e5' }}>{'{{company_email}}'}</span> — يختلف عن بيانات الدخول لخادم البريد أدناه
            </p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              البريد الرسمي للمراسلات *
            </label>
            <input
              type="email"
              value={companyOfficialEmail}
              onChange={(e) => setCompanyOfficialEmail(e.target.value)}
              placeholder="freight@yourcompany.com"
              style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8125rem', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>

      {/* كارتان متناسقان وفق معيار المنظومة (2-Column Grid) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
        {/* كارت الإرسال SMTP */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SendIcon size={18} color="#170e5e" />
              <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
                خادم البريد الصادر (SMTP Outgoing)
              </h4>
              {smtpCardLocked && (
                <span style={{ fontSize: '0.7rem', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                  محمي
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSmtpCardLocked((prev) => !prev)}
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: smtpCardLocked ? '#170e5e' : '#047857',
                background: smtpCardLocked ? '#eff6ff' : '#ecfdf5',
                border: `1px solid ${smtpCardLocked ? '#bfdbfe' : '#a7f3d0'}`,
                borderRadius: '5px',
                padding: '3px 11px',
                cursor: 'pointer',
              }}
            >
              {smtpCardLocked ? 'تغيير' : 'قفل الحماية'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                عنوان خادم الإرسال (SMTP Host) *
              </label>
              {smtpCardLocked ? (
                <div style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8125rem', background: '#f8fafc', color: '#475569', direction: 'ltr', textAlign: 'left' }}>
                  {config.smtpHost || 'mail.yourcompany.com'}
                </div>
              ) : (
                <input
                  type="text"
                  value={config.smtpHost}
                  onChange={(e) => setConfig({ ...config, smtpHost: e.target.value })}
                  placeholder="مثال: mail.yourcompany.com"
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #c7d2fe', borderRadius: '6px', fontSize: '0.8125rem' }}
                />
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  المنفذ (Port) *
                </label>
                {smtpCardLocked ? (
                  <div style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8125rem', background: '#f8fafc', color: '#475569', direction: 'ltr', textAlign: 'left' }}>
                    {config.smtpPort}
                  </div>
                ) : (
                  <input
                    type="number"
                    value={config.smtpPort}
                    onChange={(e) => setConfig({ ...config, smtpPort: parseInt(e.target.value, 10) || 465 })}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #c7d2fe', borderRadius: '6px', fontSize: '0.8125rem' }}
                  />
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  نوع التشفير
                </label>
                {smtpCardLocked ? (
                  <div style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8125rem', background: '#f8fafc', color: '#475569' }}>
                    {config.smtpSecure ? 'SSL / TLS (Port 465)' : 'STARTTLS (Port 587)'}
                  </div>
                ) : (
                  <select
                    value={config.smtpSecure ? 'ssl' : 'starttls'}
                    onChange={(e) => setConfig({ ...config, smtpSecure: e.target.value === 'ssl' })}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #c7d2fe', borderRadius: '6px', fontSize: '0.8125rem', background: '#fff' }}
                  >
                    <option value="ssl">SSL / TLS (Port 465)</option>
                    <option value="starttls">STARTTLS (Port 587)</option>
                  </select>
                )}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                اسم المرسل المعروض (From Name)
              </label>
              {smtpCardLocked ? (
                <div style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8125rem', background: '#f8fafc', color: '#475569' }}>
                  {config.fromName || '—'}
                </div>
              ) : (
                <input
                  type="text"
                  value={config.fromName}
                  onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
                  placeholder="مثال: شركة النجم للشحن الدولي"
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #c7d2fe', borderRadius: '6px', fontSize: '0.8125rem' }}
                />
              )}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                  عنوان البريد الإلكتروني للمرسل (From Email / Username) *
                </label>
                {isCredLocked('smtpUser', config.smtpUser) && (
                  <button type="button" onClick={() => unlockField('smtpUser')} style={{ fontSize: '0.72rem', fontWeight: 700, color: '#170e5e', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '5px', padding: '2px 9px', cursor: 'pointer' }}>
                    تغيير
                  </button>
                )}
              </div>
              {isCredLocked('smtpUser', config.smtpUser) ? (
                <div style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8125rem', background: '#f8fafc', color: '#475569', direction: 'ltr', textAlign: 'left' }}>
                  {config.smtpUser}
                </div>
              ) : (
                <input
                  type="email"
                  value={config.smtpUser}
                  onChange={(e) => {
                    const val = e.target.value;
                    setConfig({
                      ...config,
                      smtpUser: val,
                      fromEmail: val,
                      imapUser: config.imapUser && config.imapUser !== config.smtpUser ? config.imapUser : val,
                    });
                  }}
                  placeholder="freight@yourcompany.com"
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #c7d2fe', borderRadius: '6px', fontSize: '0.8125rem' }}
                />
              )}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                  كلمة المرور / رمز التطبيق (App Password)
                </label>
                {isCredLocked('smtpPassword', config.smtpPassword) && (
                  <button type="button" onClick={() => unlockField('smtpPassword')} style={{ fontSize: '0.72rem', fontWeight: 700, color: '#170e5e', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '5px', padding: '2px 9px', cursor: 'pointer' }}>
                    تغيير
                  </button>
                )}
              </div>
              {isCredLocked('smtpPassword', config.smtpPassword) ? (
                <div style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8125rem', background: '#f8fafc', color: '#94a3b8', letterSpacing: '3px' }}>
                  ••••••••••••
                </div>
              ) : (
                <input
                  type="password"
                  value={config.smtpPassword || ''}
                  onChange={(e) => setConfig({ ...config, smtpPassword: e.target.value })}
                  placeholder="أدخل كلمة المرور أو رمز التطبيق"
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #c7d2fe', borderRadius: '6px', fontSize: '0.8125rem' }}
                />
              )}

              <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                ملاحظة: إذا كان حساب Outlook أو Gmail مفعلاً عليه التحقق بخطوتين (2FA)، يرجى استخدام "رمز تطبيق" (App Password).
              </span>
            </div>
          </div>
        </div>

        {/* كارت الاستقبال IMAP */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MailIcon size={18} color="#170e5e" />
              <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
                خادم البريد الوارد للقراءة الآلية (IMAP Inbound)
              </h4>
              {imapCardLocked && (
                <span style={{ fontSize: '0.7rem', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                  محمي
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setImapCardLocked((prev) => !prev)}
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: imapCardLocked ? '#170e5e' : '#047857',
                background: imapCardLocked ? '#eff6ff' : '#ecfdf5',
                border: `1px solid ${imapCardLocked ? '#bfdbfe' : '#a7f3d0'}`,
                borderRadius: '5px',
                padding: '3px 11px',
                cursor: 'pointer',
              }}
            >
              {imapCardLocked ? 'تغيير' : 'قفل الحماية'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                عنوان خادم الاستقبال (IMAP Host) *
              </label>
              {imapCardLocked ? (
                <div style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8125rem', background: '#f8fafc', color: '#475569', direction: 'ltr', textAlign: 'left' }}>
                  {config.imapHost || 'mail.yourcompany.com'}
                </div>
              ) : (
                <input
                  type="text"
                  value={config.imapHost}
                  onChange={(e) => setConfig({ ...config, imapHost: e.target.value })}
                  placeholder="مثال: mail.yourcompany.com"
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #c7d2fe', borderRadius: '6px', fontSize: '0.8125rem' }}
                />
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  المنفذ (Port) *
                </label>
                {imapCardLocked ? (
                  <div style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8125rem', background: '#f8fafc', color: '#475569', direction: 'ltr', textAlign: 'left' }}>
                    {config.imapPort}
                  </div>
                ) : (
                  <input
                    type="number"
                    value={config.imapPort}
                    onChange={(e) => setConfig({ ...config, imapPort: parseInt(e.target.value, 10) || 993 })}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #c7d2fe', borderRadius: '6px', fontSize: '0.8125rem' }}
                  />
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  تشفير الاتصال
                </label>
                {imapCardLocked ? (
                  <div style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8125rem', background: '#f8fafc', color: '#475569' }}>
                    {config.imapSecure ? 'SSL / TLS (الافتراضي المنفذ 993)' : 'غير مشفر (منفذ 143)'}
                  </div>
                ) : (
                  <select
                    value={config.imapSecure ? 'ssl' : 'plain'}
                    onChange={(e) => setConfig({ ...config, imapSecure: e.target.value === 'ssl' })}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #c7d2fe', borderRadius: '6px', fontSize: '0.8125rem', background: '#fff' }}
                  >
                    <option value="ssl">SSL / TLS (الافتراضي المنفذ 993)</option>
                    <option value="plain">غير مشفر (منفذ 143)</option>
                  </select>
                )}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                  اسم المستخدم للبريد الوارد (IMAP User) *
                </label>
                {isCredLocked('imapUser', config.imapUser) && (
                  <button type="button" onClick={() => unlockField('imapUser')} style={{ fontSize: '0.72rem', fontWeight: 700, color: '#170e5e', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '5px', padding: '2px 9px', cursor: 'pointer' }}>
                    تغيير
                  </button>
                )}
              </div>
              {isCredLocked('imapUser', config.imapUser) ? (
                <div style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8125rem', background: '#f8fafc', color: '#475569', direction: 'ltr', textAlign: 'left' }}>
                  {config.imapUser}
                </div>
              ) : (
                <input
                  type="text"
                  value={config.imapUser}
                  onChange={(e) => setConfig({ ...config, imapUser: e.target.value })}
                  placeholder="freight@yourcompany.com"
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #c7d2fe', borderRadius: '6px', fontSize: '0.8125rem' }}
                />
              )}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                  كلمة المرور للبريد الوارد (IMAP Password)
                </label>
                {isCredLocked('imapPassword', config.imapPassword) && (
                  <button type="button" onClick={() => unlockField('imapPassword')} style={{ fontSize: '0.72rem', fontWeight: 700, color: '#170e5e', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '5px', padding: '2px 9px', cursor: 'pointer' }}>
                    تغيير
                  </button>
                )}
              </div>
              {isCredLocked('imapPassword', config.imapPassword) ? (
                <div style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8125rem', background: '#f8fafc', color: '#94a3b8', letterSpacing: '3px' }}>
                  ••••••••••••
                </div>
              ) : (
                <input
                  type="password"
                  value={config.imapPassword || ''}
                  onChange={(e) => setConfig({ ...config, imapPassword: e.target.value })}
                  placeholder="نفس كلمة مرور البريد أو رمز التطبيق"
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #c7d2fe', borderRadius: '6px', fontSize: '0.8125rem' }}
                />
              )}
            </div>

            <div style={{ marginTop: '6px', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', opacity: imapCardLocked ? 0.8 : 1 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: imapCardLocked ? 'not-allowed' : 'pointer' }}>
                <input
                  type="checkbox"
                  disabled={imapCardLocked}
                  checked={config.autoReadInboundBids}
                  onChange={(e) => setConfig({ ...config, autoReadInboundBids: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: imapCardLocked ? 'not-allowed' : 'pointer' }}
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

      {/* تخصيص وتأكيد قالب رسائل طلبات الأسعار للخطوط الملاحية مع المعاينة الحية */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MailIcon size={18} color="#170e5e" />
            <div>
              <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
                نص الرسالة والتوقيع المعتمد لطلبات الأسعار (RFQ Email Template & Signature)
              </h4>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                الرسالة الفعلية باللغة الإنجليزية التي يستلمها الخط الملاحي في بريده مع المعاينة الحية المباشرة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetTemplates}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#170e5e',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            استعادة النص النموذجي المعتمد
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* شريط الأزرار الذكية لإدراج المتغيرات بنقرة واحدة */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#170e5e' }}>
                إدراج بيانات الشحنة بنقرة واحدة في الحقل النشط ({activeField === 'subject' ? 'الموضوع' : activeField === 'intro' ? 'المقدمة' : 'التوقيع'}):
              </span>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                يقوم النظام بالتعويض عن هذه العناصر تلقائياً ببيانات كل شحنة فعلية
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[
                { tag: '{{rfq_number}}', label: 'رقم طلب التسعير' },
                { tag: '{{carrier_name}}', label: 'اسم الخط الملاحي' },
                { tag: '{{pol_name}}', label: 'ميناء الشحن' },
                { tag: '{{pod_name}}', label: 'ميناء الوصول' },
                { tag: '{{container_count}}', label: 'عدد الحاويات' },
                { tag: '{{container_type}}', label: 'نوع الحاوية' },
                { tag: '{{commodity}}', label: 'نوع البضاعة' },
                { tag: '{{target_free_days}}', label: 'فترة السماح' },
                { tag: '{{company_name}}', label: 'اسم شركتك' },
                { tag: '{{company_email}}', label: 'بريد شركتك' },
                { tag: '{{company_phone}}', label: 'هاتف شركتك' },
              ].map((t) => (
                <button
                  key={t.tag}
                  type="button"
                  onClick={() => handleInsertTag(t.tag)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: '#ffffff',
                    border: '1px solid #c7d2fe',
                    color: '#3730a3',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title={`إدراج ${t.label} في الحقل المحدد`}
                >
                  <span style={{ color: '#4338ca' }}>+</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 1. عنوان وموضوع الرسالة */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                عنوان وموضوع الرسالة (Email Subject)
              </label>
              <span style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 600 }}>
                تأكد دائماً من بقاء [{'{'}{'{'}rfq_number{'}'}{'}'}] ليتعرف النظام على الردود الواردة آلياً
              </span>
            </div>
            <input
              type="text"
              dir="ltr"
              value={config.emailSubjectTemplate || ''}
              onFocus={() => setActiveField('subject')}
              onChange={(e) => setConfig({ ...config, emailSubjectTemplate: e.target.value })}
              style={{
                width: '100%',
                padding: '9px 12px',
                border: activeField === 'subject' ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.84rem',
                textAlign: 'left',
                direction: 'ltr',
                fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
                fontWeight: 600,
                color: '#0f172a',
                background: '#ffffff',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* 2. المقدمة والتوقيع في شبكة متناسقة */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                الافتتاحية والطلب الموجه للخط (Intro & Opening Greeting)
              </label>
              <textarea
                rows={4}
                dir="ltr"
                value={config.emailIntroTemplate || ''}
                onFocus={() => setActiveField('intro')}
                onChange={(e) => setConfig({ ...config, emailIntroTemplate: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: activeField === 'intro' ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.84rem',
                  textAlign: 'left',
                  direction: 'ltr',
                  fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
                  lineHeight: 1.6,
                  color: '#0f172a',
                  background: '#ffffff',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
              <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '3px', display: 'block' }}>
                النص الترحيبي أعلى جدول بيانات الشحنة مباشرة.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                التوقيع المذيل للرسالة (Email Signature)
              </label>
              <textarea
                rows={4}
                dir="ltr"
                value={config.emailSignatureTemplate || ''}
                onFocus={() => setActiveField('signature')}
                onChange={(e) => setConfig({ ...config, emailSignatureTemplate: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: activeField === 'signature' ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.84rem',
                  textAlign: 'left',
                  direction: 'ltr',
                  fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
                  lineHeight: 1.6,
                  color: '#0f172a',
                  background: '#ffffff',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
              <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '3px', display: 'block' }}>
                بيانات التواصل الرسمية أسفل الرسالة ورابط تقديم العرض.
              </span>
            </div>
          </div>

          {/* 3. نافذة المعاينة الحية المباشرة للإيميل (Live Real-Time Email Preview) */}
          <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden', background: '#f8fafc', marginTop: '4px' }}>
            <div style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#cbd5e1' }} />
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#cbd5e1' }} />
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#cbd5e1' }} />
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginInlineStart: '6px' }}>
                  معاينة حية للإيميل الفعلي كما يستلمه الخط الملاحي في بريده
                </span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 700, background: '#dcfce7', padding: '2px 8px', borderRadius: '10px' }}>
                يتحدث في الوقت الفعلي مع كتابتك
              </span>
            </div>

            <div style={{ padding: '16px 20px', background: '#ffffff', direction: 'ltr', textAlign: 'left', fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#1e293b', lineHeight: 1.6 }}>
              {/* هيدر الإيميل */}
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '14px', fontSize: '12px' }}>
                <div style={{ color: '#64748b' }}><strong>From:</strong> {config.fromName?.trim() || companyProfile.name} &lt;{config.fromEmail?.trim() || config.smtpUser?.trim() || companyProfile.email || 'operations@yourcompany.com'}&gt;</div>
                <div style={{ color: '#64748b', marginTop: '2px' }}><strong>To:</strong> Maersk Line Egypt Pricing Desk &lt;pricing.egypt@maersk.com&gt;</div>
                <div style={{ color: '#0f172a', fontWeight: 700, marginTop: '6px', fontSize: '13px' }}>
                  <strong>Subject:</strong> {renderLivePreview(config.emailSubjectTemplate || '')}
                </div>
              </div>

              {/* جسم الإيميل */}
              <div style={{ whiteSpace: 'pre-line', color: '#1e293b' }}>
                {renderLivePreview(config.emailIntroTemplate || '')}
              </div>

              {/* جدول مواصفات الشحنة القياسي */}
              <table style={{ borderCollapse: 'collapse', width: '100%', margin: '14px 0', border: '1px solid #e2e8f0', fontSize: '12.5px' }}>
                <tbody>
                  <tr style={{ background: '#f8fafc' }}><td style={{ padding: '7px 10px', fontWeight: 'bold', width: '35%', borderBottom: '1px solid #e2e8f0' }}>Reference</td><td style={{ padding: '7px 10px', borderBottom: '1px solid #e2e8f0', color: '#170e5e', fontWeight: 'bold' }}>RFQ-2026-0045</td></tr>
                  <tr><td style={{ padding: '7px 10px', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>Port of Loading (POL)</td><td style={{ padding: '7px 10px', borderBottom: '1px solid #e2e8f0' }}>Alexandria Port (EGALY)</td></tr>
                  <tr style={{ background: '#f8fafc' }}><td style={{ padding: '7px 10px', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>Port of Discharge (POD)</td><td style={{ padding: '7px 10px', borderBottom: '1px solid #e2e8f0' }}>Shanghai Port (CNSHA)</td></tr>
                  <tr><td style={{ padding: '7px 10px', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>Equipment</td><td style={{ padding: '7px 10px', borderBottom: '1px solid #e2e8f0' }}>2 x 40' High Cube (FCL)</td></tr>
                  <tr style={{ background: '#f8fafc' }}><td style={{ padding: '7px 10px', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>Commodity</td><td style={{ padding: '7px 10px', borderBottom: '1px solid #e2e8f0' }}>General Commercial Cargo</td></tr>
                  <tr><td style={{ padding: '7px 10px', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>Target Free Days</td><td style={{ padding: '7px 10px', borderBottom: '1px solid #e2e8f0' }}>14 Days at Destination</td></tr>
                  <tr style={{ background: '#f8fafc' }}><td style={{ padding: '7px 10px', fontWeight: 'bold' }}>Incoterm</td><td style={{ padding: '7px 10px' }}>FOB (Freight Prepaid)</td></tr>
                </tbody>
              </table>

              {/* زر تقديم السعر التفاعلي */}
              <div style={{ margin: '14px 0' }}>
                <span style={{ display: 'inline-block', background: '#170e5e', color: '#ffffff', padding: '8px 18px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}>
                  Submit Your Rate Online / تقديم عرض السعر إلكترونياً
                </span>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  * رابط إلكتروني مشفر وآمن مخصص للتوكيل لتقديم السعر ومصاريف DTHC والتفريغ مباشرة بنقرة واحدة
                </span>
              </div>

              {/* التوقيع المذيل */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '16px', color: '#475569', whiteSpace: 'pre-line', fontSize: '12px' }}>
                {renderLivePreview(config.emailSignatureTemplate || '')}
              </div>
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
