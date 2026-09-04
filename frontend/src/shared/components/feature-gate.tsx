import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/shared/ui/button';

export function useFeatureGate(featureCode: string): boolean {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);

  // Super Admin has unrestricted access to all features
  if (user?.role === 'super_admin') {
    return true;
  }

  // If standalone / legacy mode without SaaS planId, allow all
  if (!tenant?.planId) {
    return true;
  }

  // Ultimate plan includes all features
  if (tenant.planId === 'plan_ultimate' || tenant.planId === 'ultimate') {
    return true;
  }

  // Check active features list on tenant
  const features = tenant.features || [];
  return features.includes(featureCode);
}

interface FeatureGateProps {
  feature: string;
  featureName: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({
  feature,
  featureName,
  children,
  fallback,
}: FeatureGateProps) {
  const isEnabled = useFeatureGate(feature);

  if (isEnabled) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div
      style={{
        padding: '48px 24px',
        maxWidth: '720px',
        margin: '40px auto',
        textAlign: 'center',
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
      }}
      dir="rtl"
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          margin: '0 auto 16px',
          borderRadius: '50%',
          background: '#fef3c7',
          color: '#d97706',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
        }}
      >
        🔒
      </div>

      <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
        موديول {featureName} يتطلب ترقية الباقة
      </h2>

      <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, maxWidth: '520px', margin: '0 auto 24px' }}>
        هذه الميزة المتقدمة متاحة حصرياً للمشتركين في الباقات الاحترافية والشاملة (Pro / Ultimate). يمكنك ترقية باقتك للاستفادة الفورية من كافة أدوات {featureName} مع الحفاظ على جميع بياناتك.
      </p>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
        <Link to="/settings/subscription">
          <Button
            type="button"
            variant="primary"
            style={{
              background: '#170e5e',
              color: '#ffffff',
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 700,
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            ⭐ ترقية الباقة الآن
          </Button>
        </Link>
        <Link to="/dashboard">
          <Button
            type="button"
            variant="secondary"
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              borderRadius: '8px',
            }}
          >
            العودة للرئيسية
          </Button>
        </Link>
      </div>
    </div>
  );
}
