import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <Link
          to="/settings/subscription"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 800,
            background: isEndingSoon ? '#ea580c' : '#16a34a',
            color: '#ffffff',
            textDecoration: 'none',
            transition: 'opacity 0.15s ease',
            boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
            <line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
          <span>تجديد الاشتراك أونلاين</span>
        </Link>
        <a
          href={supportUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: 'transparent',
            border: `1px solid ${isEndingSoon ? '#fdba74' : '#86efac'}`,
            color: isEndingSoon ? '#9a3412' : '#166534',
            textDecoration: 'none',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = isEndingSoon ? '#ffedd5' : '#dcfce7')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <span>تواصل للتفعيل</span>
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
