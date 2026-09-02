import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';

function formatTrialText(days: number | null | undefined): string {
  if (typeof days !== 'number') return 'مفعّلة';
  if (days <= 0) return 'تنتهي اليوم';
  if (days === 1) return 'باقي يوم واحد';
  if (days === 2) return 'باقي يومان';
  if (days >= 3 && days <= 10) return `باقي ${days} أيام`;
  return `باقي ${days} يوم`;
}

export function TrialStatusBanner() {
  const location = useLocation();
  const tenant = useAuthStore((state) => state.tenant);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('zs_trial_banner_dismissed') === '1';
    } catch {
      return false;
    }
  });

  // Never show inside POS (Point of Sale) workspace
  if (location.pathname.startsWith('/pos')) return null;

  if (!tenant?.isTrial || dismissed) return null;

  const days = tenant.trialDaysRemaining;
  const isEndingSoon = typeof days === 'number' && days <= 3;
  const businessName = tenant.businessName?.trim() || tenant.slug || 'المنشأة';

  const handleDismiss = () => {
    try {
      sessionStorage.setItem('zs_trial_banner_dismissed', '1');
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  const supportMessage = `مرحباً، أود تفعيل أو ترقية النسخة الخاصة بي (${businessName} - ${tenant.slug || ''})`;
  const supportUrl = `https://wa.me/201018017523?text=${encodeURIComponent(supportMessage)}`;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 14px',
        borderRadius: '8px',
        fontSize: '0.82rem',
        fontWeight: 600,
        background: isEndingSoon ? '#fff7ed' : '#f0fdf4',
        border: `1px solid ${isEndingSoon ? '#fdba74' : '#bbf7d0'}`,
        color: isEndingSoon ? '#9a3412' : '#166534',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span
          style={{
            background: isEndingSoon ? '#ea580c' : '#16a34a',
            color: '#ffffff',
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 800,
            letterSpacing: '0.2px',
          }}
        >
          نسخة تجريبية
        </span>
        <span>
          <strong>{businessName}</strong> — {formatTrialText(days)}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <a
          href={supportUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: isEndingSoon ? '#ea580c' : '#16a34a',
            color: '#ffffff',
            textDecoration: 'none',
            transition: 'opacity 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          تواصل للتفعيل
        </a>
        <button
          type="button"
          onClick={handleDismiss}
          title="إخفاء التنبيه لهذه الجلسة"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'currentColor',
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: '4px',
            opacity: 0.65,
            fontSize: '0.9rem',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.65')}
          aria-label="إغلاق"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
