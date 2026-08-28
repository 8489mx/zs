import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/lib/http';
import { useAuthStore } from '@/stores/auth-store';
import { systemAlert } from '@/shared/components/system-alert';
import { Button } from '@/shared/ui/button';
import { QueryCard } from '@/shared/components/query-card';

interface TaxSettingsFormData {
  provider: string;
  client_id: string;
  client_secret: string;
  tax_id: string;
  environment: string;
  is_active: boolean;
}

export function TaxIntegrationSection() {
  const [showSecret, setShowSecret] = useState(false);
  const [testResult, setTestResult] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const form = useForm<TaxSettingsFormData>({
    defaultValues: {
      provider: 'ETA_EGYPT',
      client_id: '',
      client_secret: '',
      tax_id: '',
      environment: 'sandbox',
      is_active: true,
    },
  });

  const queryClient = useQueryClient();

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['tax-settings'],
    queryFn: () => http<any>('/api/tax-settings'),
  });

  useEffect(() => {
    if (settingsData?.settings) {
      form.reset({
        provider: settingsData.settings.provider || 'ETA_EGYPT',
        client_id: settingsData.settings.client_id || '',
        client_secret: settingsData.settings.client_secret || '',
        tax_id: settingsData.settings.tax_id || '',
        environment: settingsData.settings.environment || 'sandbox',
        is_active: settingsData.settings.is_active ?? true,
      });
    }
  }, [settingsData, form]);

  const mutation = useMutation({
    mutationFn: (data: TaxSettingsFormData) => {
      return http('/api/tax-settings', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['tax-settings'] });
      useAuthStore.getState().updateSessionMeta({ isEtaActive: data.settings?.is_active ?? true });
      systemAlert('تم حفظ إعدادات الفاتورة والربط الضريبي بنجاح!');
    },
    onError: (error: any) => {
      systemAlert('حدث خطأ أثناء الحفظ: ' + (error?.message || ''));
    },
  });

  const onSubmit = (data: TaxSettingsFormData) => {
    setTestResult(null);
    mutation.mutate(data);
  };

  const handleTestCredentials = () => {
    const values = form.getValues();
    if (!values.tax_id || !values.client_id || !values.client_secret) {
      setTestResult({
        kind: 'error',
        message: 'يرجى إدخال الرقم الضريبي و Client ID و Client Secret أولاً لفحص البيانات.',
      });
      return;
    }

    setTestResult({
      kind: 'success',
      message: `تم التحقق من اكتمال معايير الاتصال لبيئة (${values.environment === 'production' ? 'الإنتاج الفعلية' : 'التجريبية Sandbox'}). جاهز للإرسال.`,
    });
  };

  const currentEnv = form.watch('environment');
  const isActive = form.watch('is_active');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 2-Column High-Density Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px', alignItems: 'start' }}>
        
        {/* Column 1: API Credentials Card */}
        <QueryCard
          title="بيانات الاعتماد والربط المباشر (ETA API)"
          className="settings-admin-card"
          actions={
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                background: isActive ? '#ecfdf5' : '#f1f5f9',
                color: isActive ? '#047857' : '#64748b',
                border: isActive ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
              }}
            >
              {isActive ? 'الربط الضريبي: مفعّل' : 'الربط الضريبي: متوقف'}
            </span>
          }
          isLoading={isLoading}
        >
          <form onSubmit={form.handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} autoComplete="off">
            {/* Tax ID & Environment Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                  الرقم الضريبي للشركة
                </label>
                <input
                  type="text"
                  placeholder="مثال: 123-456-789"
                  {...form.register('tax_id')}
                  style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  autoComplete="off"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                  بيئة التشغيل
                </label>
                <select
                  {...form.register('environment')}
                  style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', boxSizing: 'border-box' }}
                >
                  <option value="sandbox">بيئة تجريبية (Sandbox)</option>
                  <option value="production">بيئة إنتاجية فعلية (Production)</option>
                </select>
              </div>
            </div>

            {/* Client ID */}
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                Client ID (معرف المنظومة)
              </label>
              <input
                type="text"
                placeholder="أدخل المعرف المستخرج من بوابة الممولين"
                {...form.register('client_id')}
                style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                autoComplete="off"
              />
            </div>

            {/* Client Secret */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155' }}>
                  Client Secret (المفتاح السري)
                </label>
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  style={{ fontSize: '0.72rem', color: '#0369a1', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {showSecret ? 'إخفاء' : 'إظهار'}
                </button>
              </div>
              <input
                type="text"
                className={showSecret ? '' : 'secure-password-field'}
                placeholder="أدخل الـ Secret المستخرج من البوابة"
                {...form.register('client_secret')}
                style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>

            {/* Active Toggle Banner */}
            <label
              htmlFor="is_active_tax"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: '#1e293b',
              }}
            >
              <input
                type="checkbox"
                id="is_active_tax"
                {...form.register('is_active')}
                style={{ width: '16px', height: '16px', margin: 0, cursor: 'pointer' }}
              />
              <span>تفعيل الربط الضريبي المباشر وإرسال الفواتير لهذه النسخة</span>
            </label>

            {/* Test Result Message */}
            {testResult && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  background: testResult.kind === 'success' ? '#ecfdf5' : '#fef2f2',
                  color: testResult.kind === 'success' ? '#047857' : '#b91c1c',
                  border: testResult.kind === 'success' ? '1px solid #a7f3d0' : '1px solid #fca5a5',
                }}
              >
                {testResult.message}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
              <Button
                type="submit"
                variant="primary"
                disabled={mutation.isPending}
                style={{ padding: '6px 18px', background: '#0f172a', fontWeight: 800, fontSize: '0.82rem' }}
              >
                {mutation.isPending ? 'جاري الحفظ...' : 'حفظ إعدادات الربط'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleTestCredentials}
                style={{ padding: '6px 14px', fontSize: '0.82rem' }}
              >
                فحص البيانات
              </Button>
            </div>
          </form>
        </QueryCard>

        {/* Column 2: Guidelines & Status Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <QueryCard
            title="معايير وتوثيق الفوترة (ETA Guidelines)"
            className="settings-admin-card"
            actions={<span className="nav-pill">v1.0 Standard</span>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.78rem' }}>
              {/* Endpoint Status Box */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '2px' }}>نقطة الاتصال النشطة (API Endpoint):</div>
                <strong style={{ color: '#0f172a', fontSize: '0.76rem', direction: 'ltr', display: 'block', textAlign: 'right', fontFamily: 'monospace' }}>
                  {currentEnv === 'production' ? 'https://api.invoicing.eta.gov.eg' : 'https://api.preprod.invoicing.eta.gov.eg'}
                </strong>
              </div>

              {/* Supported Document Types */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', background: '#ffffff' }}>
                <strong style={{ fontSize: '0.8rem', color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                  أنواع الوثائق المدعومة
                </strong>
                <ul style={{ margin: 0, paddingInlineStart: '18px', color: '#475569', lineHeight: 1.6 }}>
                  <li><strong>فواتير مبيعات (i01)</strong>: فواتير B2B الضريبية مع التوقيع الإلكتروني.</li>
                  <li><strong>إيصالات إلكترونية (r01)</strong>: إيصالات B2C الفورية لنقاط البيع والكاشير.</li>
                  <li><strong>إشعارات دائنة / مدينة (c01 / d01)</strong>: المرتجعات والتسويات الضريبية.</li>
                </ul>
              </div>

              {/* E-Seal Notice */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', background: '#ffffff' }}>
                <strong style={{ fontSize: '0.8rem', color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                  الختم الإلكتروني (E-Seal USB Token)
                </strong>
                <p style={{ margin: 0, color: '#64748b', lineHeight: 1.5 }}>
                  لتوقيع الفواتير، تأكد من توصيل توكن الختم الإلكتروني المعتمد من (مصر للمقاصة أو إيجيبت تراست) على جهاز السيرفر أو استخدام الختم السحابي.
                </p>
              </div>
            </div>
          </QueryCard>
        </div>

      </div>
    </div>
  );
}
