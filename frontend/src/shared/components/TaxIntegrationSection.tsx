import { FormSection } from '@/shared/components/form-section';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/lib/http';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { systemAlert } from '@/shared/components/system-alert';

interface TaxSettingsFormData {
  provider: string;
  client_id: string;
  client_secret: string;
  tax_id: string;
  environment: string;
  is_active: boolean;
}

export function TaxIntegrationSection() {
  const form = useForm<TaxSettingsFormData>({
    defaultValues: {
      provider: 'ETA_EGYPT',
      client_id: '',
      client_secret: '',
      tax_id: '',
      environment: 'sandbox',
      is_active: true
    }
  });

  const queryClient = useQueryClient();

  const { data: settingsData } = useQuery({
    queryKey: ['tax-settings'],
    queryFn: () => http<any>('/api/tax-settings')
  });

  useEffect(() => {
    if (settingsData?.settings) {
      form.reset(settingsData.settings);
    }
  }, [settingsData, form]);

  const mutation = useMutation({
    mutationFn: (data: TaxSettingsFormData) => {
      return http('/api/tax-settings', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['tax-settings'] });
      useAuthStore.getState().updateSessionMeta({ isEtaActive: data.settings?.is_active ?? true });
      systemAlert('تم حفظ الإعدادات بنجاح!');
    },
    onError: (error: any) => {
      systemAlert('حدث خطأ أثناء الحفظ: ' + (error?.message || ''));
    }
  });

  const onSubmit = (data: TaxSettingsFormData) => {
    mutation.mutate(data);
  };

  return (
    <div className="stack gap-6">
      <div className="flex-between">
        <div>
          <h2 className="h4 m-0">الفاتورة الإلكترونية والضرائب</h2>
          <p className="muted mb-0 mt-1">إعدادات الربط المباشر مع مصلحة الضرائب المصرية (ETA) لإرسال الفواتير تلقائياً.</p>
        </div>
      </div>

      <FormSection title="بيانات الاعتماد (API Credentials)">
        <form onSubmit={form.handleSubmit(onSubmit)} className="stack gap-4" autoComplete="off">
          <div className="grid-2">
            <div className="form-group">
              <label>الرقم الضريبي للشركة</label>
              <input type="text" className="input" {...form.register('tax_id')} placeholder="مثال: 123-456-789" autoComplete="off" />
            </div>
            <div className="form-group">
              <label>بيئة العمل</label>
              <select className="input" {...form.register('environment')}>
                <option value="sandbox">بيئة تجريبية (Sandbox)</option>
                <option value="production">بيئة فعلية (Production)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Client ID</label>
            <input type="text" className="input" {...form.register('client_id')} autoComplete="off" />
          </div>

          <div className="form-group">
            <label>Client Secret</label>
            <input type="text" className="input secure-password-field" {...form.register('client_secret')} autoComplete="off" data-lpignore="true" data-1p-ignore="true" data-form-type="other" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
          </div>

          <label htmlFor="is_active_tax" style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-start', margin: '16px 0 8px 0', cursor: 'pointer' }}>
            <input type="checkbox" id="is_active_tax" {...form.register('is_active')} style={{ width: '20px', height: '20px', margin: 0, padding: 0 }} />
            <span style={{ margin: 0, lineHeight: '20px', fontSize: '15px' }}>تفعيل الربط الضريبي لهذه النسخة</span>
          </label>

          <div className="flex justify-end pt-4">
            <button type="submit" className="button button-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'جاري الحفظ...' : 'حفظ إعدادات الربط'}
            </button>
          </div>
        </form>
      </FormSection>
    </div>
  );
}
