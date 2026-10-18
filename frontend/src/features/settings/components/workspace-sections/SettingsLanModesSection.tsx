import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { systemConfirm } from '@/shared/components/system-alert';

export function SettingsLanModesSection() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<string>('standalone');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const electronRuntime = typeof window !== 'undefined' ? (window as any).electronRuntime : null;
  const isElectron = !!electronRuntime;

  useEffect(() => {
    if (isElectron) {
      electronRuntime.getRuntimeConfig().then((config: any) => {
        setMode(config.runtimeMode || 'standalone');
      });
    }
  }, [isElectron, electronRuntime]);

  if (!isElectron) {
    return (
      <div className="error-box">
        <strong>{t('settings.workspace_sections.settings_lan_modes_section.s0', "غير مدعوم:")}</strong> {t('settings.workspace_sections.settings_lan_modes_section.s1', "إعدادات الشبكة المحلية متاحة فقط في النسخة المكتبية (Offline).")}
      </div>
    );
  }

  const handleSwitchToServer = async () => {
    const ok = await systemConfirm({
      title: 'تحويل الجهاز إلى رئيسي',
      message: 'هل أنت متأكد من تحويل هذا الجهاز ليكون الجهاز الرئيسي؟ سيتم إعادة تشغيل البرنامج.',
      variant: 'primary',
      confirmText: 'تحويل وإعادة التشغيل',
    });
    if (ok) {
      await electronRuntime.switchToLanServer();
    }
  };

  const handleSwitchToStandalone = async () => {
    const ok = await systemConfirm({
      title: 'العودة لجهاز مستقل',
      message: 'سيتم فصل الجهاز عن الشبكة والعودة لاستخدام قاعدة البيانات المحلية الخاصة به. هل أنت متأكد؟',
      variant: 'warning',
      confirmText: 'تأكيد الفصل',
    });
    if (ok) {
      await electronRuntime.switchToStandalone();
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const url = serverUrl.replace(/\/$/, '');
    if (!url.startsWith('http://')) {
      setTestResult({ ok: false, message: 'يجب أن يبدأ الرابط بـ http://' });
      setIsTesting(false);
      return;
    }
    
    try {
      const result = await electronRuntime.testLanServer({ serverUrl: url });
      if (result.ok && result.data && result.data.runtimeMode === 'lan_server') {
        setTestResult({ ok: true, message: `نجح الاتصال: ${result.data.serverName} (إصدار: ${result.data.version})` });
      } else if (result.ok) {
        setTestResult({ ok: false, message: 'نجح الاتصال، لكن الجهاز ليس في وضع الجهاز الرئيسي (lan_server).' });
      } else {
        setTestResult({ ok: false, message: result.error || 'تعذر الاتصال بالجهاز الرئيسي.' });
      }
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message || 'تعذر الاتصال.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSwitchToClient = async () => {
    if (testResult?.ok) {
      const ok = await systemConfirm({
        title: 'التحويل إلى جهاز ثانوي',
        message: 'بيانات هذا الجهاز المحلية لن تُحذف، لكنها لن تُستخدم أثناء الاتصال بالجهاز الرئيسي. هل أنت متأكد؟',
        variant: 'warning',
        confirmText: 'تأكيد الاتصال',
      });
      if (ok) {
        const url = serverUrl.replace(/\/$/, '');
        await electronRuntime.switchToLanClient({ serverUrl: url, port: 3001 });
      }
    }
  };

  return (
    <div className="page-stack">
      <FormSection title={t('settings.workspace_sections.settings_lan_modes_section.s2', "وضع التشغيل الحالي")}>
        <div style={{ marginBottom: 16 }}>
          {mode === 'standalone' && <span className="success-box" style={{ display: 'inline-block' }}>{t('settings.workspace_sections.settings_lan_modes_section.s3', "جهاز مستقل")}</span>}
          {mode === 'lan_server' && <span className="success-box" style={{ display: 'inline-block' }}>{t('settings.workspace_sections.settings_lan_modes_section.s4', "جهاز رئيسي للشبكة المحلية")}</span>}
          {mode === 'lan_client' && <span className="warning-box" style={{ display: 'inline-block' }}>{t('settings.workspace_sections.settings_lan_modes_section.s5', "جهاز ثانوي")}</span>}
        </div>
        {mode !== 'standalone' && (
          <Button variant="secondary" onClick={() => void handleSwitchToStandalone()}>
            {t('settings.workspace_sections.settings_lan_modes_section.s6', "العودة إلى وضع جهاز مستقل")}
          </Button>
        )}
      </FormSection>

      {mode === 'standalone' && (
        <FormSection title={t('settings.workspace_sections.settings_lan_modes_section.s7', "التحويل إلى جهاز رئيسي")} description={t('settings.workspace_sections.settings_lan_modes_section.s8', "ستظل بيانات هذا الجهاز كما هي، وسيصبح مصدر البيانات لباقي الأجهزة. يجب أن يظل الجهاز يعمل أثناء استخدام الأجهزة الأخرى.")}>
          <Button onClick={() => void handleSwitchToServer()}>{t('settings.workspace_sections.settings_lan_modes_section.s9', "تحويل إلى جهاز رئيسي")}</Button>
        </FormSection>
      )}

      {(mode === 'standalone' || mode === 'lan_client') && (
        <FormSection title={t('settings.workspace_sections.settings_lan_modes_section.s10', "التحويل إلى جهاز ثانوي")} description={t('settings.workspace_sections.settings_lan_modes_section.s11', "للاتصال بجهاز رئيسي آخر على الشبكة، أدخل عنوانه وتأكد من نجاح الاتصال.")}>
          <div className="form-grid two-col-form" style={{ marginBottom: 16 }}>
            <Field label={t('settings.workspace_sections.settings_lan_modes_section.s12', "رابط الجهاز الرئيسي (مثال: http://192.168.1.10:3001)")}>
              <input
                type="text"
                placeholder="http://192.168.1.10:3001"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                dir="ltr"
              />
            </Field>
            <div className="actions compact-actions" style={{ alignSelf: 'end', marginBottom: 4 }}>
              <Button type="button" variant="secondary" onClick={() => void handleTestConnection()} disabled={!serverUrl || isTesting}>
                {isTesting ? t('settings.workspace_sections.settings_lan_modes_section.s13', "جارِ الاختبار...") : t('settings.workspace_sections.settings_lan_modes_section.s14', "اختبار الاتصال")}
              </Button>
            </div>
          </div>

          {testResult && (
            <div className={testResult.ok ? 'success-box' : 'error-box'} style={{ marginBottom: 16 }}>
              <strong>{testResult.ok ? t('settings.workspace_sections.settings_lan_modes_section.s15', "تم بنجاح: ") : t('settings.workspace_sections.settings_lan_modes_section.s16', "فشل الاختبار: ")}</strong>
              {testResult.message}
            </div>
          )}

          {testResult?.ok && (
            <div className="actions">
              <Button onClick={() => void handleSwitchToClient()}>{t('settings.workspace_sections.settings_lan_modes_section.s17', "اعتماد كجهاز ثانوي وإعادة التشغيل")}</Button>
            </div>
          )}
        </FormSection>
      )}
    </div>
  );
}
