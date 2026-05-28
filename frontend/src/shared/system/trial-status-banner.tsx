import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/shared/api/auth';

function formatTrialText(days: number | null | undefined): string {
  if (typeof days !== 'number') return 'نسختك التجريبية مفعّلة.';
  if (days <= 0) return 'تنتهي النسخة التجريبية اليوم.';
  if (days === 1) return 'باقي يوم واحد في النسخة التجريبية.';
  if (days === 2) return 'باقي يومان في النسخة التجريبية.';
  if (days >= 3 && days <= 10) return `باقي ${days} أيام في النسخة التجريبية.`;
  return `باقي ${days} يوم في النسخة التجريبية.`;
}

export function TrialStatusBanner() {
  const query = useQuery({
    queryKey: ['auth', 'me', 'trial-status'],
    queryFn: () => authApi.me(),
    staleTime: 60_000,
    retry: false,
  });

  const tenant = query.data?.tenant;
  if (!tenant?.isTrial) return null;

  const days = tenant.trialDaysRemaining;
  const isEndingSoon = typeof days === 'number' && days <= 3;
  const businessName = tenant.businessName?.trim() || tenant.slug || 'نسختك الحالية';

  return (
    <div className={`system-banner ${isEndingSoon ? 'system-banner-warning' : 'system-banner-success'}`}>
      <strong>نسخة تجريبية</strong>
      <span> — {businessName} — {formatTrialText(days)}</span>
      <span style={{ marginInlineStart: 10 }}>للتفعيل أو الترقية تواصل مع الدعم.</span>
    </div>
  );
}
