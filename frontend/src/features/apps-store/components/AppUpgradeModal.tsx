import { useNavigate } from 'react-router-dom';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { LockIcon, CheckIcon, ArrowRightIcon } from '@/shared/components/icons/AppIcons';
import { PLAN_TIERS } from '@/features/settings/components/modular-configurator/modular-presets';
import type { AppItemDefinition } from '../types/apps-store.types';

interface AppUpgradeModalProps {
  app: AppItemDefinition | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AppUpgradeModal({ app, isOpen, onClose }: AppUpgradeModalProps) {
  const navigate = useNavigate();
  if (!app) return null;

  const planInfo = PLAN_TIERS[app.requiredPlan] || PLAN_TIERS.plan_ultimate;
  const AppIcon = app.icon;

  const handleGoToSubscription = () => {
    onClose();
    navigate('/settings/subscription');
  };

  return (
    <StandardDialog
      isOpen={isOpen}
      onClose={onClose}
      title={`ترقية الباقة لتفعيل تطبيق ${app.title}`}
      subtitle="هذا التطبيق مخصص لباقات المنظومة المتقدمة"
      maxWidth="580px"
    >
      <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* App Hero Card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '16px',
          background: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
        }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '12px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <AppIcon size={28} color="#170e5e" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <strong style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 800 }}>{app.title}</strong>
              <span style={{
                fontSize: '0.72rem',
                background: '#f8fafc',
                color: '#475569',
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: 700,
                border: '1px solid #e2e8f0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                <LockIcon size={11} color="#64748b" /> {planInfo.name}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5 }}>
              {app.shortDesc}
            </p>
          </div>
        </div>

        {/* Plan Upgrade Banner */}
        <div style={{
          padding: '16px',
          borderRadius: '12px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div>
            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#170e5e', marginBottom: '2px' }}>
              متاح ضمن: {planInfo.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {planInfo.summary}
            </div>
          </div>
          <div style={{
            fontSize: '0.84rem',
            fontWeight: 800,
            color: '#170e5e',
            background: '#ffffff',
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
          }}>
            {planInfo.priceLabel}
          </div>
        </div>

        {/* Included Capabilities */}
        <div>
          <h4 style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1e293b', marginBottom: '10px' }}>
            أبرز المزايا التي ستحصل عليها:
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {app.features.map((feat, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.78rem',
                color: '#334155',
                fontWeight: 600,
              }}>
                <span style={{ color: '#059669', display: 'flex' }}>
                  <CheckIcon size={14} />
                </span>
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '10px',
          marginTop: '10px',
          paddingTop: '16px',
          borderTop: '1px solid #e2e8f0',
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontWeight: 600,
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}
          >
            إغلاق
          </button>
          <button
            type="button"
            onClick={handleGoToSubscription}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              background: '#170e5e',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>ترقية الباقة الآن</span>
            <ArrowRightIcon size={14} />
          </button>
        </div>

      </div>
    </StandardDialog>
  );
}
