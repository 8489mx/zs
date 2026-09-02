import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { http } from '@/lib/http';
import { Button } from '@/shared/ui/button';

export function SmartDemoOnboardingBanner() {
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

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
      setFeedback({ kind: 'success', message: data.message || 'تم ملء النظام بالبيانات التجريبية بنجاح!' });
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    },
    onError: (err: any) => {
      setFeedback({ kind: 'error', message: err?.message || 'فشل تجهيز البيانات التجريبية.' });
    },
  });

  if (statusQuery.isLoading || !statusQuery.data?.isEmpty) {
    return null;
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
      border: '1.5px solid #fdba74',
      borderRadius: '16px',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '14px',
      boxShadow: '0 4px 12px rgba(234, 88, 12, 0.08)',
      marginBottom: '16px',
      direction: 'rtl',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 300px' }}>
        <div style={{
          width: '46px',
          height: '46px',
          borderRadius: '12px',
          background: '#ea580c',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.4rem',
          boxShadow: '0 4px 8px rgba(234, 88, 12, 0.25)',
          flexShrink: 0,
        }}>
          🚀
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: '#9a3412' }}>
              متجرك فارغ حالياً — ابدأ التجربة ببيانات كاملة بنقرة واحدة!
            </h3>
            <span style={{ fontSize: '0.72rem', background: '#fed7aa', color: '#7c2d12', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
              ديمو فوري
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#7c2d12', lineHeight: 1.5 }}>
            املأ النظام فوراً بـ 50 صنفاً، 10 عملاء، 8 موردين، 20 موظفاً، وحركة مبيعات ومشتريات 6 أشهر لتجربة الرسوم البيانية وشاشات الكاشير فوراً.
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
            background: '#ea580c',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.88rem',
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(234, 88, 12, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {mutation.isPending ? 'جاري تجهيز البيانات وسكبها...' : '✨ ابدأ التجربة بالبيانات الجاهزة الآن'}
        </Button>
      </div>

      {feedback && (
        <div style={{
          width: '100%',
          marginTop: '6px',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '0.82rem',
          fontWeight: 700,
          background: feedback.kind === 'success' ? '#ecfdf5' : '#fef2f2',
          color: feedback.kind === 'success' ? '#047857' : '#b91c1c',
          border: feedback.kind === 'success' ? '1px solid #a7f3d0' : '1px solid #fca5a5',
        }}>
          {feedback.message}
        </div>
      )}
    </div>
  );
}
