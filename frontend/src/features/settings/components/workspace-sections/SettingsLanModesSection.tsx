import { useState, useEffect } from 'react';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';

export function SettingsLanModesSection() {
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
        <strong>غير مدعوم:</strong> إعدادات الشبكة المحلية متاحة فقط في النسخة المكتبية (Offline).
      </div>
    );
  }

  const handleSwitchToServer = async () => {
    if (confirm('هل أنت متأكد من تحويل هذا الجهاز ليكون الجهاز الرئيسي؟ سيتم إعادة تشغيل البرنامج.')) {
      await electronRuntime.switchToLanServer();
    }
  };

  const handleSwitchToStandalone = async () => {
    if (confirm('سيتم فصل الجهاز عن الشبكة والعودة لاستخدام قاعدة البيانات المحلية الخاصة به. هل أنت متأكد؟')) {
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
      if (confirm('بيانات هذا الجهاز المحلية لن تُحذف، لكنها لن تُستخدم أثناء الاتصال بالجهاز الرئيسي. هل أنت متأكد؟')) {
        const url = serverUrl.replace(/\/$/, '');
        await electronRuntime.switchToLanClient({ serverUrl: url, port: 3001 });
      }
    }
  };

  return (
    <div className="page-stack">
      <FormSection title="وضع التشغيل الحالي">
        <div style={{ marginBottom: 16 }}>
          {mode === 'standalone' && <span className="success-box" style={{ display: 'inline-block' }}>جهاز مستقل</span>}
          {mode === 'lan_server' && <span className="success-box" style={{ display: 'inline-block' }}>جهاز رئيسي للشبكة المحلية</span>}
          {mode === 'lan_client' && <span className="warning-box" style={{ display: 'inline-block' }}>جهاز ثانوي</span>}
        </div>
        {mode !== 'standalone' && (
          <Button variant="secondary" onClick={() => void handleSwitchToStandalone()}>
            العودة إلى وضع جهاز مستقل
          </Button>
        )}
      </FormSection>

      {mode === 'standalone' && (
        <FormSection title="التحويل إلى جهاز رئيسي" description="ستظل بيانات هذا الجهاز كما هي، وسيصبح مصدر البيانات لباقي الأجهزة. يجب أن يظل الجهاز يعمل أثناء استخدام الأجهزة الأخرى.">
          <Button onClick={() => void handleSwitchToServer()}>تحويل إلى جهاز رئيسي</Button>
        </FormSection>
      )}

      {(mode === 'standalone' || mode === 'lan_client') && (
        <FormSection title="التحويل إلى جهاز ثانوي" description="للاتصال بجهاز رئيسي آخر على الشبكة، أدخل عنوانه وتأكد من نجاح الاتصال.">
          <div className="form-grid two-col-form" style={{ marginBottom: 16 }}>
            <Field label="رابط الجهاز الرئيسي (مثال: http://192.168.1.10:3001)">
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
                {isTesting ? 'جارِ الاختبار...' : 'اختبار الاتصال'}
              </Button>
            </div>
          </div>

          {testResult && (
            <div className={testResult.ok ? 'success-box' : 'error-box'} style={{ marginBottom: 16 }}>
              <strong>{testResult.ok ? 'تم بنجاح: ' : 'فشل الاختبار: '}</strong>
              {testResult.message}
            </div>
          )}

          {testResult?.ok && (
            <div className="actions">
              <Button onClick={() => void handleSwitchToClient()}>اعتماد كجهاز ثانوي وإعادة التشغيل</Button>
            </div>
          )}
        </FormSection>
      )}
    </div>
  );
}
