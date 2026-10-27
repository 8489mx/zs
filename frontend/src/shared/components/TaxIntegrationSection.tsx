import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/lib/http';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from '@/shared/components/system-alert';
import { Button } from '@/shared/ui/button';
import { SubmitButton } from '@/shared/components/submit-button';
import { CheckIcon } from '@/shared/components/icons/AppIcons';
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
  const { t } = useTranslation();
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
        // السر لا يعود من الخادم إطلاقاً بعد حفظه؛ الحقل يبقى فارغاً ويعني
        // "اتركه كما هو" ما لم يكتب المستخدم قيمة جديدة.
        client_secret: '',
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
      toast.success('تم حفظ وتطبيق إعدادات الفاتورة والربط الضريبي بنجاح!');
    },
    onError: (error: any) => {
      toast.error('حدث خطأ أثناء الحفظ: ' + (error?.message || ''));
    },
  });

  const onSubmit = (data: TaxSettingsFormData) => {
    setTestResult(null);
    mutation.mutate(data);
  };

  const handleTestCredentials = () => {
    const values = form.getValues();
    const hasSavedSecret = Boolean(settingsData?.settings?.hasClientSecret);
    if (!values.tax_id || !values.client_id || (!values.client_secret && !hasSavedSecret)) {
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
      <div className="settings-two-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px', alignItems: 'start' }}>
        
        {/* Column 1: API Credentials Card */}
        <QueryCard
          title={t('shared.tax_integration_section.s0', "بيانات الاعتماد والربط المباشر (ETA API)")}
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
              {isActive ? t('shared.tax_integration_section.s1', "الربط الضريبي: مفعّل") : t('shared.tax_integration_section.s2', "الربط الضريبي: متوقف")}
            </span>
          }
          isLoading={isLoading}
        >
          <form onSubmit={form.handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} autoComplete="off">
            {/* Provider Select */}
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                {t('shared.tax_integration_section.s3', "منظومة الفاتورة الإلكترونية المعتمدة")}
              </label>
              <select
                {...form.register('provider')}
                style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', boxSizing: 'border-box' }}
              >
                <option value="ETA_EGYPT">{t('shared.tax_integration_section.s4', "مصلحة الضرائب المصرية (ETA E-Invoicing - مصر)")}</option>
                <option value="ZATCA_SAUDI">{t('shared.tax_integration_section.s5', "هيئة الزكاة والضريبة والجمارك (ZATCA Phase 2 - السعودية)")}</option>
              </select>
            </div>

            {/* Tax ID & Environment Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>

                  {t('shared.tax_integration_section.s6', "الرقم الضريبي للشركة")}
                </label>
                <input
                  type="text"
                  placeholder={t('shared.tax_integration_section.s7', "مثال: 123-456-789")}
                  {...form.register('tax_id')}
                  style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  autoComplete="off"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                  {t('shared.tax_integration_section.s8', "بيئة التشغيل")}
                </label>
                <select
                  {...form.register('environment')}
                  style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', boxSizing: 'border-box' }}
                >
                  <option value="sandbox">{t('shared.tax_integration_section.s9', "بيئة تجريبية (Sandbox)")}</option>
                  <option value="production">{t('shared.tax_integration_section.s10', "بيئة إنتاجية فعلية (Production)")}</option>
                </select>
              </div>
            </div>

            {/* Client ID */}
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                {t('shared.tax_integration_section.s11', "Client ID (معرف المنظومة)")}
              </label>
              <input
                type="text"
                placeholder={t('shared.tax_integration_section.s12', "أدخل المعرف المستخرج من بوابة الممولين")}
                {...form.register('client_id')}
                style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                autoComplete="off"
              />
            </div>

            {/* Client Secret */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155' }}>
                  {t('shared.tax_integration_section.s13', "Client Secret (المفتاح السري)")}
                </label>
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  style={{ fontSize: '0.72rem', color: '#0369a1', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {showSecret ? t('shared.tax_integration_section.s14', "إخفاء") : t('shared.tax_integration_section.s15', "إظهار")}
                </button>
              </div>
              <input
                type="text"
                className={showSecret ? '' : 'secure-password-field'}
                placeholder={settingsData?.settings?.hasClientSecret ? t('shared.tax_integration_section.s16', "محفوظ — اتركه فارغاً للإبقاء عليه") : t('shared.tax_integration_section.s17', "أدخل الـ Secret المستخرج من البوابة")}
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
              <span>{t('shared.tax_integration_section.s18', "تفعيل الربط الضريبي المباشر وإرسال الفواتير لهذه النسخة")}</span>
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
              <SubmitButton
                type="submit"
                isPending={mutation.isPending}
                isSuccess={mutation.isSuccess}
                idleText={t('shared.tax_integration_section.s20', "حفظ إعدادات الربط")}
                pendingText={t('shared.tax_integration_section.s19', "جاري الحفظ...")}
                successText="تم حفظ إعدادات الربط بنجاح!"
                style={{ padding: '6px 18px', background: '#170e5e', fontWeight: 800, fontSize: '0.82rem', color: '#ffffff' }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleTestCredentials}
                style={{ padding: '6px 14px', fontSize: '0.82rem' }}
              >
                {t('shared.tax_integration_section.s21', "فحص البيانات")}
              </Button>
            </div>

            {mutation.isSuccess && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  background: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  borderRadius: '8px',
                  color: '#15803d',
                  fontSize: '12px',
                  fontWeight: 800,
                  marginTop: '10px',
                  boxShadow: '0 1px 4px rgba(22, 163, 74, 0.12)',
                }}
              >
                <CheckIcon size={15} color="#16a34a" />
                <span>تم حفظ إعدادات الربط الضريبي بنجاح! التغييرات مفعلة مباشرة.</span>
              </div>
            )}
          </form>
        </QueryCard>

        {/* Column 2: Guidelines & Status Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <QueryCard
            title={t('shared.tax_integration_section.s22', "معايير وتوثيق الفوترة (ETA Guidelines)")}
            className="settings-admin-card"
            actions={<span className="nav-pill">v1.0 Standard</span>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.78rem' }}>
              {/* Endpoint Status Box */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '2px' }}>{t('shared.tax_integration_section.s23', "نقطة الاتصال النشطة (API Endpoint):")}</div>
                <strong style={{ color: '#0f172a', fontSize: '0.76rem', direction: 'ltr', display: 'block', textAlign: 'right', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {currentEnv === 'production' ? 'https://api.invoicing.eta.gov.eg' : 'https://api.preprod.invoicing.eta.gov.eg'}
                </strong>
              </div>

              {/* Supported Document Types */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', background: '#ffffff' }}>
                <strong style={{ fontSize: '0.8rem', color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                  {t('shared.tax_integration_section.s24', "أنواع الوثائق المدعومة")}
                </strong>
                <ul style={{ margin: 0, paddingInlineStart: '18px', color: '#475569', lineHeight: 1.6 }}>
                  <li><strong>{t('shared.tax_integration_section.s25', "فواتير مبيعات (i01)")}</strong>{t('shared.tax_integration_section.s26', ": فواتير B2B الضريبية مع التوقيع الإلكتروني.")}</li>
                  <li><strong>{t('shared.tax_integration_section.s27', "إيصالات إلكترونية (r01)")}</strong>{t('shared.tax_integration_section.s28', ": إيصالات B2C الفورية لنقاط البيع والكاشير.")}</li>
                  <li><strong>{t('shared.tax_integration_section.s29', "إشعارات دائنة / مدينة (c01 / d01)")}</strong>{t('shared.tax_integration_section.s30', ": المرتجعات والتسويات الضريبية.")}</li>
                </ul>
              </div>

              {/* E-Seal Notice */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', background: '#ffffff' }}>
                <strong style={{ fontSize: '0.8rem', color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                  {t('shared.tax_integration_section.s31', "الختم الإلكتروني (E-Seal USB Token)")}
                </strong>
                <p style={{ margin: 0, color: '#64748b', lineHeight: 1.5 }}>
                  {t('shared.tax_integration_section.s32', "لتوقيع الفواتير، تأكد من توصيل توكن الختم الإلكتروني المعتمد من (مصر للمقاصة أو إيجيبت تراست) على جهاز السيرفر أو استخدام الختم السحابي.")}
                </p>
              </div>
            </div>
          </QueryCard>
        </div>

      </div>
    </div>
  );
}
