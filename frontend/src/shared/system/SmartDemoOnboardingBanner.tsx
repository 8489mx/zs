import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { http } from '@/lib/http';
import { Button } from '@/shared/ui/button';
import { XIcon, RefreshCwIcon } from '@/shared/components/icons/AppIcons';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';

function getIndustryLabelAndActivity(industry?: string): { activity: string; label: string } {
  switch (industry) {
    case 'restaurant':
    case 'cafe':
    case 'cafe_restaurant':
      return { activity: 'cafe_restaurant', label: 'مطاعم وكافيهات' };
    case 'fashion':
    case 'clothing':
      return { activity: 'fashion', label: 'ملابس وأزياء' };
    case 'electronics':
    case 'electronics_mobile':
    case 'maintenance':
    case 'services':
      return { activity: 'electronics_mobile', label: 'إلكترونيات وموبايل' };
    case 'pharmacy':
      return { activity: 'pharmacy', label: 'صيدليات وأدوية' };
    case 'retail':
    case 'wholesale':
    case 'supermarket':
    default:
      return { activity: 'supermarket', label: 'سوبرماركت وبقالة' };
  }
}

export function SmartDemoOnboardingBanner() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: settings } = useSettingsQuery();
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  const mappedIndustry = getIndustryLabelAndActivity(settings?.businessIndustry);

  const statusQuery = useQuery({
    queryKey: ['demo-data', 'status'],
    queryFn: () => http<{ isEmpty: boolean; productCount: number; saleCount: number; isSuperAdmin: boolean }>('/api/admin/demo-data/status'),
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: (activityType: string) => http<{ ok: boolean; message: string }>('/api/admin/demo-data/seed', {
      method: 'POST',
      body: JSON.stringify({ activityType, password: '' }),
    }),
    onSuccess: async (data) => {
      setFeedback({ kind: 'success', message: data.message || 'تم تجهيز البيانات التجريبية وسكبها بنجاح!' });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['demo-data'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['catalog'] }),
        queryClient.invalidateQueries({ queryKey: ['sales'] }),
        queryClient.invalidateQueries({ queryKey: ['settings'] }),
      ]);
      // Dismiss after showing success feedback smoothly
      setTimeout(() => {
        setIsDismissed(true);
      }, 2500);
    },
    onError: (err: any) => {
      setFeedback({ kind: 'error', message: err?.message || 'تعذر تجهيز البيانات التجريبية.' });
    },
  });

  if (isDismissed || statusQuery.isLoading || !statusQuery.data?.isEmpty) {
    return null;
  }

  return (
    <div
      dir="rtl"
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
        marginBottom: '20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative subtle border accent */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '4px',
          background: '#170e5e',
        }}
      />

      {mutation.isPending && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '18px',
              padding: '36px 28px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#ede9fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RefreshCwIcon size={32} color="#170e5e" className="animate-spin" />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
              جاري تجهيز وسكب البيانات التجريبية...
            </h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6 }}>
              يتم الآن إنشاء الأصناف، الفواتير، والعمليات المالية لنشاط ({mappedIndustry.label}).
              <br />
              يرجى الانتظار ثوانٍ معدودة...
            </p>
          </div>
        </div>
      )}

      <div style={{ flex: '1 1 340px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.2px' }}>
            معالج استيراد البيانات التجريبية حسب النشاط
          </h3>
          <span
            style={{
              fontSize: '11px',
              background: '#ede9fe',
              color: '#170e5e',
              border: '1px solid #ddd6fe',
              padding: '2px 8px',
              borderRadius: '6px',
              fontWeight: 700,
            }}
          >
            5 ثوانٍ فقط
          </span>
        </div>
        <p style={{ margin: '4px 0 0', fontSize: '0.83rem', color: '#64748b', lineHeight: 1.5 }}>
          اختر نشاطك (سوبرماركت، ملابس، كافيه، إلكترونيات، صيدلية) لتعبئة ~50 صنفاً وفواتير وموردين لتجربة شاشة الكاشير والداشبورد وبوت الواتساب فورياً.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <Button
          type="button"
          onClick={() => navigate('/settings/demo-data?setup=quickstart')}
          style={{
            background: '#170e5e',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.85rem',
            padding: '9px 18px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(23, 14, 94, 0.2)',
          }}
        >
          اختيار النشاط عبر المعالج
        </Button>

        <button
          type="button"
          disabled={mutation.isPending}
          onClick={() => {
            setFeedback(null);
            mutation.mutate(mappedIndustry.activity);
          }}
          style={{
            background: '#f8fafc',
            color: '#334155',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {mutation.isPending ? 'جاري الاستيراد...' : `تعبئة سريعة (${mappedIndustry.label})`}
        </button>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          title="إخفاء التنبيه"
          style={{
            background: 'transparent',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '8px 10px',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '12px',
            lineHeight: 1,
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#0f172a';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#94a3b8';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
        >
          <XIcon size={14} />
        </button>
      </div>

      {feedback && (
        <div
          style={{
            width: '100%',
            marginTop: '8px',
            padding: '8px 14px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: 700,
            background: feedback.kind === 'success' ? '#ecfdf5' : '#fff1f2',
            color: feedback.kind === 'success' ? '#047857' : '#be123c',
            border: feedback.kind === 'success' ? '1px solid #a7f3d0' : '1px solid #fecdd3',
          }}
        >
          {feedback.message}
        </div>
      )}
    </div>
  );
}
