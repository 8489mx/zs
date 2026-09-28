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

  const rawIndustry = String(settings?.businessIndustry || settings?.activityType || '').toLowerCase();
  const isWholesaleVertical =
    rawIndustry === 'wholesale_van' ||
    rawIndustry === 'wholesale' ||
    rawIndustry === 'distribution' ||
    rawIndustry === 'توزيع' ||
    rawIndustry === 'فان' ||
    rawIndustry === 'مناديب' ||
    rawIndustry.includes('توزيع') ||
    rawIndustry.includes('فان') ||
    rawIndustry.includes('wholesale');
  const isNonRetailVertical = isWholesaleVertical || rawIndustry === 'contracting' || rawIndustry === 'maritime' || rawIndustry === 'services';
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
            {isWholesaleVertical
              ? 'هذا الحساب مهيأ لنمط تجارة الجملة والتوزيع المؤسسي وأسطول سيارات الفان، حيث تتم المبيعات الميدانية وإصدار الفواتير وأوامر البيع عبر شاشات توزيع الفان وسجل الفواتير بدون كاشير.'
              : isNonRetailVertical
              ? 'هذا الحساب مخصص لقطاع تخصصي (مشاريع مقاولات أو شحن ولوجستيات أو خدمات) لا يعتمد على نقاط البيع المباشرة.'
              : 'تم تعطيل موديول نقطة البيع والكاشير في إعدادات المنشأة. يمكنك تفعيله من شاشة إعدادات الموديولات.'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {isWholesaleVertical && (
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.href = '/inventory/van-sales';
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
                سيارات التوزيع (الفان)
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = '/dashboard';
                }
              }}
              style={{
                background: isWholesaleVertical ? '#f1f5f9' : '#170e5e',
                color: isWholesaleVertical ? '#334155' : '#ffffff',
                border: isWholesaleVertical ? '1px solid #cbd5e1' : 'none',
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
