import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { http } from '@/lib/http';
import { Button } from '@/shared/ui/button';

export function SmartDemoOnboardingBanner() {
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  const statusQuery = useQuery({
    queryKey: ['demo-data', 'status'],
    queryFn: () => http<{ isEmpty: boolean; productCount: number; saleCount: number; isSuperAdmin: boolean }>('/api/admin/demo-data/status'),
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: () => http<{ ok: boolean; message: string }>('/api/admin/demo-data/seed', {
      method: 'POST',
      body: JSON.stringify({ password: '' }),
    }),
    onSuccess: (data) => {
      setFeedback({ kind: 'success', message: data.message || 'تم تجهيز البيانات التجريبية وسكبها بنجاح!' });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
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
          background: '#0f172a',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 340px' }}>
        {/* Professional SVG Icon Container */}
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.2px' }}>
              تجهيز النسخة بالبيانات التجريبية
            </h3>
            <span
              style={{
                fontSize: '11px',
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #e2e8f0',
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: 700,
              }}
            >
              جاهز للاختبار
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.83rem', color: '#64748b', lineHeight: 1.5 }}>
            املأ نسختك فوراً بنماذج متكاملة من الأصناف والموردين والعملاء وحركات المبيعات لتجربة كافة تقارير ولوحات التحكم بدون إدخال يدوي.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Button
          type="button"
          disabled={mutation.isPending}
          onClick={() => {
            setFeedback(null);
            mutation.mutate();
          }}
          style={{
            background: '#0f172a',
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
          }}
        >
          {mutation.isPending ? 'جاري السكب والتجهيز...' : 'تعبئة بيانات تجريبية فورية'}
        </Button>

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
          ✕
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
