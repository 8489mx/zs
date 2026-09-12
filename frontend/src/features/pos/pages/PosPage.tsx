import { PosWorkspace } from '@/features/pos/components/PosWorkspace';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import { FeatureGate } from '@/shared/components/feature-gate';

export function PosPage() {
  const { data: settings, isLoading } = useSettingsQuery();

  if (isLoading) {
    return (
      <div className="screen-center" style={{ minHeight: '60vh' }}>
        <div className="loading-card">جاري التحقق من إعدادات نقطة البيع...</div>
      </div>
    );
  }

  const industry = String(settings?.businessIndustry || '').toLowerCase();
  const isNonRetailVertical = industry === 'contracting' || industry === 'maritime';
  const isPosDisabled = settings?.posModuleEnabled === false || isNonRetailVertical;

  if (isPosDisabled) {
    return (
      <div
        dir="rtl"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '65vh',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '36px 28px',
            maxWidth: '520px',
            width: '100%',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#475569',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
            موديول نقطة البيع (الكاشير) غير مفعّل
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, marginBottom: '24px' }}>
            {isNonRetailVertical
              ? 'هذا الحساب مخصص لقطاع تخصصي (مشاريع مقاولات أو شحن ولوجستيات) لا يعتمد على نقاط البيع المباشرة.'
              : 'تم تعطيل موديول نقطة البيع والكاشير في إعدادات المنشأة. يمكنك تفعيله من شاشة إعدادات الموديولات.'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = '/dashboard';
                }
              }}
              style={{
                background: '#170e5e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 22px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              العودة إلى لوحة التحكم
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FeatureGate feature="sales" featureName="نقطة البيع والكاشير">
      <PosWorkspace />
    </FeatureGate>
  );
}
