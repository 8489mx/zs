import { Link } from 'react-router-dom';
import { LockIcon } from '@/shared/components/icons/AppIcons';

interface AppsKpiHeaderProps {
  totalApps: number;
  activeAppsCount: number;
  availableToInstallCount: number;
  currentPlanName: string;
  isSuperAdmin: boolean;
}

// Institutional Metric Icons (0 Emojis)
function LayersIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function CheckShieldIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function SparklesIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4M3 5h4M19 17v4M17 19h4" />
    </svg>
  );
}

function CrownIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5v-2z" />
    </svg>
  );
}

export function AppsKpiHeader({
  totalApps,
  activeAppsCount,
  availableToInstallCount,
  currentPlanName,
  isSuperAdmin,
}: AppsKpiHeaderProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}
    >
      {/* 1. إجمالي التطبيقات المتاحة */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            background: '#eff6ff',
            color: '#1d4ed8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <LayersIcon size={22} />
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>إجمالي التطبيقات</div>
          <div style={{ fontSize: '1.35rem', color: '#0f172a', fontWeight: 800 }}>{totalApps} تطبيقاً</div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>كتالوج النظام الشامل</div>
        </div>
      </div>

      {/* 2. التطبيقات المفعلة والنشطة */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            background: '#ecfdf5',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <CheckShieldIcon size={22} />
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>التطبيقات المثبتة والنشطة</div>
          <div style={{ fontSize: '1.35rem', color: '#059669', fontWeight: 800 }}>{activeAppsCount} نشط</div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>تظهر في القائمة والشاشات</div>
        </div>
      </div>

      {/* 3. متاح للتفعيل الفوري */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            background: '#f5f3ff',
            color: '#7c3aed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <SparklesIcon size={22} />
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>متاح للتثبيت الفوري</div>
          <div style={{ fontSize: '1.35rem', color: '#7c3aed', fontWeight: 800 }}>{availableToInstallCount} متاح</div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>ضمن باقتك الحالية مباشرة</div>
        </div>
      </div>

      {/* 4. الباقة الحالية والاشتراك */}
      <div
        style={{
          background: isSuperAdmin ? '#fefce8' : '#ffffff',
          border: isSuperAdmin ? '1px solid #fef08a' : '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: isSuperAdmin ? '#fef3c7' : '#eff6ff',
              color: isSuperAdmin ? '#d97706' : '#170e5e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {isSuperAdmin ? <CrownIcon size={22} /> : <LockIcon size={20} />}
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
              {isSuperAdmin ? 'رتبة الحساب' : 'باقتك الحالية'}
            </div>
            <div style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>
              {isSuperAdmin ? 'تحكم مركزي غير محدود' : currentPlanName}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              {isSuperAdmin ? 'كامل التطبيقات مفتوحة' : 'يمكنك الترقية لفتح المزيد'}
            </div>
          </div>
        </div>

        {!isSuperAdmin && (
          <Link
            to="/settings/subscription"
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#170e5e',
              background: '#f1f5f9',
              padding: '6px 12px',
              borderRadius: '8px',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              border: '1px solid #cbd5e1',
            }}
          >
            ترقية الباقة
          </Link>
        )}
      </div>
    </div>
  );
}
