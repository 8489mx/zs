import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { UseFormReturn } from 'react-hook-form';
import type { SettingsFormInput, SettingsFormOutput } from '@/features/settings/schemas/settings.schema';
import { FormSection } from '@/shared/components/form-section';
import { LightbulbIcon } from '@/shared/components/icons/AppIcons';
import { useHasFeature } from '@/shared/hooks/use-permission';
import { useAuthStore } from '@/stores/auth-store';
import { DialogShell } from '@/shared/components/dialog-shell';
import { MAINTENANCE_PROFILES, getMaintenanceProfile, type MaintenanceProfileKey } from '@/features/maintenance/constants/maintenance-profiles';

interface ModulesTabProps {
  form: UseFormReturn<SettingsFormInput, undefined, SettingsFormOutput>;
  disabled: boolean;
  activeTab: string;
}

// Premium SVG Line Icons
function FactoryIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M17 18h1" />
      <path d="M12 18h1" />
      <path d="M7 18h1" />
    </svg>
  );
}

function ComboPackageIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

function CargoShipIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.26.94 4.3 2.45 5.82" />
      <path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
      <path d="M12 2v4" />
    </svg>
  );
}

function UtensilsIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2" />
      <path d="M15 2v18" />
      <path d="M5 2v8a3 3 0 0 0 3 3h0a3 3 0 0 0 3-3V2" />
      <path d="M8 2v18" />
    </svg>
  );
}

function PharmacyCrossIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <path d="M12 5v6" />
      <path d="M9 8h6" />
    </svg>
  );
}

function TableCustomerIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function VariantsLayersIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 2 7l10 5 10-5-10-5Z" />
      <path d="m2 17 10 5 10-5" />
      <path d="m2 12 10 5 10-5" />
    </svg>
  );
}

function ScaleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </svg>
  );
}

function WrenchServiceIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function EnterpriseIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  );
}

function MaintenanceWrenchIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function ProfileVectorIcon({ type, size = 20 }: { type: string; size?: number }) {
  if (type === 'mobile') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
        <path d="M12 18h.01" />
      </svg>
    );
  }
  if (type === 'computer') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="12" x="3" y="4" rx="2" />
        <line x1="2" x2="22" y1="20" y2="20" />
      </svg>
    );
  }
  if (type === 'console') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="6" x2="10" y1="12" y2="12" />
        <line x1="8" x2="8" y1="10" y2="14" />
        <line x1="15" x2="15.01" y1="13" y2="13" />
        <line x1="18" x2="18.01" y1="11" y2="11" />
        <rect width="20" height="12" x="2" y="6" rx="6" />
      </svg>
    );
  }
  if (type === 'printer') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect width="12" height="8" x="6" y="14" />
      </svg>
    );
  }
  if (type === 'screens') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="15" x="2" y="3" rx="2" />
        <polyline points="17 21 12 18 7 21" />
      </svg>
    );
  }
  if (type === 'appliances') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
        <line x1="6" x2="6" y1="2" y2="4" />
        <line x1="10" x2="10" y1="2" y2="4" />
        <line x1="14" x2="14" y1="2" y2="4" />
      </svg>
    );
  }
  if (type === 'cooling') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" x2="12" y1="2" y2="22" />
        <line x1="2" x2="22" y1="12" y2="12" />
        <line x1="20" x2="4" y1="16" y2="8" />
        <line x1="20" x2="4" y1="8" y2="16" />
      </svg>
    );
  }
  if (type === 'scooters') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="18" r="3" />
        <path d="M6 18h12" />
        <path d="M18 15V5h-3" />
      </svg>
    );
  }
  return <MaintenanceWrenchIcon size={size} />;
}

function CrownIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    </svg>
  );
}

function LockIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginInlineEnd: '3px' }}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function OnlineStorefrontIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
      <path d="m9 9 3 3 6-6" />
    </svg>
  );
}

function InstallmentsIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
      <path d="m8 14 2 2 4-4" />
    </svg>
  );
}

function FixedAssetsIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 10a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v11H9Z" />
    </svg>
  );
}

function TaxDeclarationIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="m9 15 2 2 4-4" />
    </svg>
  );
}

function DeliveryFleetIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-5l-3-4h-5v10h1" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  );
}

const premiumCardTextStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '3px',
};

const premiumCheckboxInputStyle = {
  width: '18px',
  height: '18px',
  accentColor: '#0f172a',
  cursor: 'pointer',
  flexShrink: 0,
};

export function ModulesSettingsTab({ form, disabled, activeTab }: ModulesTabProps) {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'super_admin';

  const hasManufacturingFeature = useHasFeature('manufacturing') || isSuperAdmin;
  const hasImportFeature = useHasFeature('import') || isSuperAdmin;
  const hasRestaurantFeature = useHasFeature('restaurant') || isSuperAdmin;
  const hasMaintenanceFeature = useHasFeature('maintenance') || isSuperAdmin;
  const hasPharmacyFeature = useHasFeature('pharmacy') || isSuperAdmin;
  const hasEnterpriseFeature = useHasFeature('accounting') || isSuperAdmin;
  const hasStorefrontFeature = useHasFeature('storefront') || isSuperAdmin;
  const hasInstallmentsFeature = useHasFeature('installments') || useHasFeature('accounting') || isSuperAdmin;
  const hasFixedAssetsFeature = useHasFeature('fixed_assets') || useHasFeature('accounting') || isSuperAdmin;
  const hasTaxDeclarationFeature = useHasFeature('vat_declaration') || useHasFeature('taxIntegration') || isSuperAdmin;
  const hasDeliveryFleetFeature = useHasFeature('deliveryReps') || isSuperAdmin;

  const isManufacturingActive = form.watch('manufacturingModuleEnabled');
  const isComboActive = form.watch('comboModuleEnabled');
  const isImportActive = form.watch('importModuleEnabled');
  const isRestaurantActive = form.watch('restaurantModuleEnabled');
  const isPosMetaActive = form.watch('posShowCartMeta');
  const isMaintenanceActive = form.watch('enableMobileStoreFeatures');
  const enableMaintenance = isMaintenanceActive;
  const isPharmacyActive = form.watch('enablePharmacyModule');
  const isServicesActive = form.watch('servicesModuleEnabled');
  const isClothingActive = form.watch('clothingModuleEnabled');
  const clothingModuleEnabled = isClothingActive;
  const isWeightedActive = form.watch('weightedBarcodeEnabled');
  const weightedBarcodeEnabled = isWeightedActive;
  const isEnterpriseActive = form.watch('enableEnterpriseFeatures');
  const isStorefrontActive = form.watch('storefrontModuleEnabled');
  const isInstallmentsActive = form.watch('installmentsModuleEnabled');
  const isFixedAssetsActive = form.watch('fixedAssetsModuleEnabled');
  const isTaxDeclarationActive = form.watch('taxDeclarationModuleEnabled');
  const isDeliveryFleetActive = form.watch('deliveryFleetModuleEnabled');

  const currentProfileKey = form.watch('maintenanceProfile') || 'mobile';
  const currentProfile = getMaintenanceProfile(currentProfileKey);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [upgradeModalInfo, setUpgradeModalInfo] = useState<{
    open: boolean;
    title: string;
    planName: string;
    description: string;
  } | null>(null);

  const handleLockedCardClick = (title: string, planName: string, description: string) => {
    setUpgradeModalInfo({
      open: true,
      title,
      planName,
      description,
    });
  };

  const getCardStyle = (isActive: boolean, hasFeature: boolean) => ({
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: '14px 18px',
    background: !hasFeature ? '#f8fafc' : isActive ? '#f0fdf4' : '#ffffff',
    border: !hasFeature ? '1px dashed #cbd5e1' : isActive ? '1.5px solid #86efac' : '1px solid #e2e8f0',
    borderRadius: '10px',
    cursor: !hasFeature ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.03)' : '0 1px 3px rgba(0,0,0,0.02)',
    gap: '12px',
    opacity: !hasFeature ? 0.7 : 1,
  });

  const getIconBadgeStyle = (isActive: boolean) => ({
    width: '38px',
    height: '38px',
    borderRadius: '8px',
    background: isActive ? '#dcfce7' : '#f8fafc',
    border: isActive ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    color: isActive ? '#15803d' : '#0f172a',
    flexShrink: 0,
    transition: 'all 0.15s ease',
  });

  return (
    <div style={{ display: activeTab === 'modules' ? 'block' : 'none' }}>
      {isSuperAdmin && (
        <div style={{
          padding: '10px 16px',
          marginBottom: '14px',
          background: '#fffdf5',
          border: '1px solid #fde68a',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.8rem',
          color: '#92400e',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: '#d97706', display: 'flex', alignItems: 'center' }}>
              <CrownIcon size={18} />
            </span>
            <span><strong>وضع السوبر أدمن:</strong> يمكنك تفعيل وتجربة أي موديول على هذه المنشأة بحرية كاملة، أو إدارة الباقات من لوحة التحكم المركزية.</span>
          </div>
          <span style={{ fontSize: '0.72rem', background: '#fef3c7', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, border: '1px solid #fde68a' }}>
            تحكم مركزي
          </span>
        </div>
      )}

      {/* ===== موديولات النظام ===== */}
      <FormSection title="موديولات النظام" description={<>شغّل الأجزاء التي تحتاجها لنشاطك، وسيتم ضبط وتحديث القوائم والشاشات تلقائياً.</>}>
        <div className="document-prototype-grid compact-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '12px' }}>
          
          {/* التصنيع والإنتاج */}
          <label style={getCardStyle(Boolean(isManufacturingActive), hasManufacturingFeature)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={getIconBadgeStyle(Boolean(isManufacturingActive))}>
                <FactoryIcon size={20} />
              </div>
              <div style={premiumCardTextStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>التصنيع والإنتاج</strong>
                  {!hasManufacturingFeature && (
                    <span style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
                      <LockIcon size={11} /> ترقية مطلوبة
                    </span>
                  )}
                </div>
                <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>يضيف خيارات المكونات، وصفات الإنتاج، وأوامر التصنيع</small>
              </div>
            </div>
            <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('manufacturingModuleEnabled')} disabled={disabled || !hasManufacturingFeature} />
          </label>

          {/* العروض المجمعة والوجبات */}
          <label style={getCardStyle(Boolean(isComboActive), true)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={getIconBadgeStyle(Boolean(isComboActive))}>
                <ComboPackageIcon size={20} />
              </div>
              <div style={premiumCardTextStyle}>
                <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>العروض المجمعة والوجبات</strong>
                <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>يفعّل العروض المكوّنة من عدة أصناف (Combo)</small>
              </div>
            </div>
            <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('comboModuleEnabled')} disabled={disabled} />
          </label>

          {/* موديول الاستيراد والشراكة */}
          <label style={getCardStyle(Boolean(isImportActive), hasImportFeature)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={getIconBadgeStyle(Boolean(isImportActive))}>
                <CargoShipIcon size={20} />
              </div>
              <div style={premiumCardTextStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>موديول الاستيراد والشراكة</strong>
                  {!hasImportFeature && (
                    <span style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
                      <LockIcon size={11} /> ترقية مطلوبة
                    </span>
                  )}
                </div>
                <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>يفعّل إدارة الحاويات، مسير الشحن، وتوزيع الأرباح</small>
              </div>
            </div>
            <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('importModuleEnabled')} disabled={disabled || !hasImportFeature} />
          </label>

          {/* موديول المطاعم والكافيهات */}
          <label style={getCardStyle(Boolean(isRestaurantActive), hasRestaurantFeature)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={getIconBadgeStyle(Boolean(isRestaurantActive))}>
                <UtensilsIcon size={20} />
              </div>
              <div style={premiumCardTextStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>موديول المطاعم والكافيهات</strong>
                  {!hasRestaurantFeature && (
                    <span style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
                      <LockIcon size={11} /> ترقية مطلوبة
                    </span>
                  )}
                </div>
                <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>يفعّل نظام الطاولات والمطبخ وأنواع الطلبات</small>
              </div>
            </div>
            <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('restaurantModuleEnabled')} disabled={disabled || !hasRestaurantFeature} />
          </label>

          {/* اختيار الطاولة والعميل بالكاشير */}
          <label style={getCardStyle(Boolean(isPosMetaActive), true)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={getIconBadgeStyle(Boolean(isPosMetaActive))}>
                <TableCustomerIcon size={20} />
              </div>
              <div style={premiumCardTextStyle}>
                <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>اختيار الطاولة والعميل بالكاشير</strong>
                <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>يظهر حقول العميل والطاولة أعلى السلة لتسهيل الاختيار قبل الدفع</small>
              </div>
            </div>
            <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('posShowCartMeta')} disabled={disabled} />
          </label>

          {/* ===== موديول إدارة الصيانة الشامل مع محدد الأنشطة ===== */}
          <div style={{ ...getCardStyle(Boolean(isMaintenanceActive), hasMaintenanceFeature), flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={getIconBadgeStyle(Boolean(isMaintenanceActive))}>
                  <MaintenanceWrenchIcon size={20} />
                </div>
                <div style={premiumCardTextStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>موديول إدارة الصيانة والأجهزة</strong>
                    {!hasMaintenanceFeature && (
                      <span style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
                        <LockIcon size={11} /> ترقية مطلوبة
                      </span>
                    )}
                  </div>
                  <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>يفعّل تتبع السيريال، استلام الأجهزة، فحص الضمان، وحساب المصنعية</small>
                </div>
              </div>
              <input
                type="checkbox"
                style={premiumCheckboxInputStyle}
                {...form.register('enableMobileStoreFeatures', {
                  onChange: (e) => {
                    if (e.target.checked && !form.getValues('maintenanceProfile')) {
                      form.setValue('maintenanceProfile', 'mobile', { shouldDirty: true });
                    }
                  }
                })}
                disabled={disabled || !hasMaintenanceFeature}
              />
            </div>

            {isMaintenanceActive && hasMaintenanceFeature && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 10px', marginTop: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                  <span style={{ color: '#64748b' }}>نشاط الصيانة المحدد:</span>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#15803d', fontWeight: 800 }}>
                    <ProfileVectorIcon type={currentProfile.iconType} size={15} />
                    <span>{currentProfile.shortTitle}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(true)}
                  disabled={disabled}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '3px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                  }}
                >
                  <span>تغيير النشاط</span>
                  <span style={{ fontSize: '10px', opacity: 0.7 }}>▾</span>
                </button>
              </div>
            )}
          </div>

          {/* موديول الصيدليات والأدوية */}
          <label style={getCardStyle(Boolean(isPharmacyActive), hasPharmacyFeature)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={getIconBadgeStyle(Boolean(isPharmacyActive))}>
                <PharmacyCrossIcon size={20} />
              </div>
              <div style={premiumCardTextStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>موديول الصيدليات والأدوية</strong>
                  {!hasPharmacyFeature && (
                    <span style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
                      <LockIcon size={11} /> ترقية مطلوبة
                    </span>
                  )}
                </div>
                <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>دليل الأدوية، المواد الفعالة والمثائل، الروشتات والتأمين، الصلاحيات ونواقص الأدوية</small>
              </div>
            </div>
            <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('enablePharmacyModule')} disabled={disabled || !hasPharmacyFeature} />
          </label>

          {/* موديول المتغيرات والأصناف المتعددة */}
          <label style={getCardStyle(Boolean(isClothingActive), true)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={getIconBadgeStyle(Boolean(isClothingActive))}>
                <VariantsLayersIcon size={20} />
              </div>
              <div style={premiumCardTextStyle}>
                <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>موديول المتغيرات والأصناف المتعددة</strong>
                <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>يفعّل إدارة الأصناف ذات الخصائص المتعددة (مقاسات، ألوان، نكهات، أحجام، روائح...)</small>
              </div>
            </div>
            <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('clothingModuleEnabled')} disabled={disabled} />
          </label>

          {/* موديول الخدمات والمصنعيات */}
          <label style={getCardStyle(Boolean(isServicesActive), true)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={getIconBadgeStyle(Boolean(isServicesActive))}>
                <WrenchServiceIcon size={20} />
              </div>
              <div style={premiumCardTextStyle}>
                <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>الخدمات والمصنعيات</strong>
                <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>يفعّل تابة إدارة الخدمات السريعة، المصنعيات، والخدمات غير المخزنية</small>
              </div>
            </div>
            <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('servicesModuleEnabled')} disabled={disabled} />
          </label>

          {/* باركود الميزان */}
          <label style={getCardStyle(Boolean(isWeightedActive), true)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={getIconBadgeStyle(Boolean(isWeightedActive))}>
                <ScaleIcon size={20} />
              </div>
              <div style={premiumCardTextStyle}>
                <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>باركود الميزان</strong>
                <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>باركود مضمّن فيه الوزن أو السعر مباشرةً للأوزان</small>
              </div>
            </div>
            <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('weightedBarcodeEnabled')} disabled={disabled} />
          </label>

          {/* موديول الشركات والمحاسبة المتقدمة */}
          <label style={getCardStyle(Boolean(isEnterpriseActive), hasEnterpriseFeature)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={getIconBadgeStyle(Boolean(isEnterpriseActive))}>
                <EnterpriseIcon size={20} />
              </div>
              <div style={premiumCardTextStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>موديول الشركات والمحاسبة المتقدمة</strong>
                  {!hasEnterpriseFeature && (
                    <span style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
                      <LockIcon size={11} /> ترقية مطلوبة
                    </span>
                  )}
                </div>
                <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>يفعّل مراكز التكلفة، ربط الفواتير بالمشاريع، وشروط التعاقد</small>
              </div>
            </div>
            <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('enableEnterpriseFeatures')} disabled={disabled || !hasEnterpriseFeature} />
          </label>

          {/* المتجر الإلكتروني وطلبات الأونلاين */}
          <label 
            style={getCardStyle(Boolean(isStorefrontActive), hasStorefrontFeature)}
            onClick={(e) => {
              if (!hasStorefrontFeature) {
                e.preventDefault();
                handleLockedCardClick(
                  'المتجر الإلكتروني وطلبات الأونلاين',
                  'باقة التجارة الشاملة (Omnichannel Enterprise)',
                  'يتيح لك هذا الموديول ربط متجرك بمتجر إلكتروني متكامل للعملاء، واستقبال الطلبات أونلاين وتأكيد السداد ببوابات الدفع الإلكتروني وتتبع المناديب.'
                );
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={getIconBadgeStyle(Boolean(isStorefrontActive))}>
                <OnlineStorefrontIcon size={20} />
              </div>
              <div style={premiumCardTextStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>المتجر الإلكتروني وطلبات الأونلاين</strong>
                  {!hasStorefrontFeature && (
                    <span style={{ fontSize: '0.7rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '1px 6px', borderRadius: '4px', fontWeight: 800, display: 'inline-flex', alignItems: 'center' }}>
                      <LockIcon size={11} /> باقة التجارة الشاملة
                    </span>
                  )}
                </div>
                <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>يفعّل المتجر الإلكتروني، بوابات الدفع بالبطاقات (Paymob)، واستقبال ومتابعة طلبات الأونلاين</small>
              </div>
            </div>
            <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('storefrontModuleEnabled')} disabled={disabled || !hasStorefrontFeature} />
          </label>

          {/* مبيعات وجدولة التقسيط */}
          <label 
            style={getCardStyle(Boolean(isInstallmentsActive), hasInstallmentsFeature)}
            onClick={(e) => {
              if (!hasInstallmentsFeature) {
                e.preventDefault();
                handleLockedCardClick(
                  'مبيعات وجدولة التقسيط',
                  'الباقة المتكاملة (Ultimate ERP)',
                  'يتيح لك هذا الموديول إدارة عقود وأقساط العملاء، احتساب نسب الفوائد، وجدولة وتنبيهات الأقساط المستحقة والمتأخرة.'
                );
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={getIconBadgeStyle(Boolean(isInstallmentsActive))}>
                <InstallmentsIcon size={20} />
              </div>
              <div style={premiumCardTextStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>مبيعات وجدولة التقسيط</strong>
                  {!hasInstallmentsFeature && (
                    <span style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
                      <LockIcon size={11} /> الباقة المتكاملة
                    </span>
                  )}
                </div>
                <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>إدارة خطط التقسيط، عقود الأقساط، تتبع الأقساط المسددة والمتأخرة، وإشعارات الاستحقاق</small>
              </div>
            </div>
            <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('installmentsModuleEnabled')} disabled={disabled || !hasInstallmentsFeature} />
          </label>

          {/* إدارة وإهلاك الأصول الثابتة */}
          <label 
            style={getCardStyle(Boolean(isFixedAssetsActive), hasFixedAssetsFeature)}
            onClick={(e) => {
              if (!hasFixedAssetsFeature) {
                e.preventDefault();
                handleLockedCardClick(
                  'إدارة وإهلاك الأصول الثابتة',
                  'الباقة المتكاملة (Ultimate ERP)',
                  'يتيح لك هذا الموديول تسجيل الأصول والمعدات، احتساب الإهلاك التلقائي وقيود اليومية التلقائية في الحسابات العامة.'
                );
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={getIconBadgeStyle(Boolean(isFixedAssetsActive))}>
                <FixedAssetsIcon size={20} />
              </div>
              <div style={premiumCardTextStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>إدارة وإهلاك الأصول الثابتة</strong>
                  {!hasFixedAssetsFeature && (
                    <span style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
                      <LockIcon size={11} /> الباقة المتكاملة
                    </span>
                  )}
                </div>
                <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>سجل الأصول، احتساب الإهلاك المحاسبي، والقيمة التخريدية والدفترية ومواقع الأصول</small>
              </div>
            </div>
            <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('fixedAssetsModuleEnabled')} disabled={disabled || !hasFixedAssetsFeature} />
          </label>

          {/* الإقرار الضريبي والربط الإلكتروني */}
          <label 
            style={getCardStyle(Boolean(isTaxDeclarationActive), hasTaxDeclarationFeature)}
            onClick={(e) => {
              if (!hasTaxDeclarationFeature) {
                e.preventDefault();
                handleLockedCardClick(
                  'نموذج الإقرار الضريبي وهيئة الزكاة',
                  'الباقة المتكاملة (Ultimate ERP)',
                  'يتيح لك هذا الموديول توليد إقرارات القيمة المضافة (نموذج 10 ومطابقة ZATCA) وحساب الفوارق الضريبية بدقة.'
                );
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={getIconBadgeStyle(Boolean(isTaxDeclarationActive))}>
                <TaxDeclarationIcon size={20} />
              </div>
              <div style={premiumCardTextStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>الإقرار الضريبي والربط الإلكتروني</strong>
                  {!hasTaxDeclarationFeature && (
                    <span style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
                      <LockIcon size={11} /> الباقة المتكاملة
                    </span>
                  )}
                </div>
                <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>توليد نموذج الإقرار الضريبي (ن10)، إقرارات هيئة الزكاة (ZATCA)، وتقارير ضريبة المخرجات والمدخلات</small>
              </div>
            </div>
            <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('taxDeclarationModuleEnabled')} disabled={disabled || !hasTaxDeclarationFeature} />
          </label>

          {/* أسطول وتتبع المناديب */}
          <label 
            style={getCardStyle(Boolean(isDeliveryFleetActive), hasDeliveryFleetFeature)}
            onClick={(e) => {
              if (!hasDeliveryFleetFeature) {
                e.preventDefault();
                handleLockedCardClick(
                  'أسطول وتتبع المناديب',
                  'الباقة المتكاملة (Ultimate ERP)',
                  'يتيح لك هذا الموديول إدارة مناديب التوصيل، توزيع خطوط السير، تسوية العهد النقدية، وتتبع المناديب مباشرة.'
                );
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={getIconBadgeStyle(Boolean(isDeliveryFleetActive))}>
                <DeliveryFleetIcon size={20} />
              </div>
              <div style={premiumCardTextStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>أسطول وتتبع المناديب</strong>
                  {!hasDeliveryFleetFeature && (
                    <span style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
                      <LockIcon size={11} /> الباقة المتكاملة
                    </span>
                  )}
                </div>
                <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>إسناد الطلبات للمناديب، تتبع تسليم الشحنات، وعمولات مناديب التوصيل</small>
              </div>
            </div>
            <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('deliveryFleetModuleEnabled')} disabled={disabled || !hasDeliveryFleetFeature} />
          </label>
        </div>

        {enableMaintenance ? (
          <div style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', marginTop: 18, boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '10px',
                  background: '#eff6ff',
                  border: '1.5px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.08)'
                }}>
                  <ProfileVectorIcon type={currentProfile.iconType} size={24} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.96rem', color: '#0f172a' }}>{currentProfile.title}</div>
                    <span style={{ fontSize: '0.7rem', background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>نشط الآن</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>{currentProfile.subtitle}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                disabled={disabled}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '7px 16px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: '#1e40af',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>تغيير نشاط الصيانة والقالب</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>▾</span>
              </button>
            </div>

            <div className="document-prototype-grid compact-grid-2">
              <div className="field">
                <label style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px', display: 'block', fontSize: '0.82rem' }}>
                  نسبة عمولة فني الصيانة من صافي المصنعية (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  className="purchase-prototype-field-input"
                  {...form.register('technicianCommissionRate')}
                  disabled={disabled}
                  placeholder="30"
                  style={{ fontWeight: 700, background: '#ffffff' }}
                />
                <small className="muted">تُحسب العمولة تلقائيًا كنسبة مئوية من صافي ربح المصنعية بعد خصم سعر قطع الغيار.</small>
              </div>

              <div className="field">
                <label style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px', display: 'block', fontSize: '0.82rem' }}>
                  الملحقات الافتراضية للفحص والاستلام السريع
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {currentProfile.defaultAccessories.map((acc) => (
                    <span key={acc} style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '3px 9px', borderRadius: '6px', fontSize: '0.74rem', color: '#334155', fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      + {acc}
                    </span>
                  ))}
                </div>
                <small className="muted">تظهر هذه الملحقات كأزرار سريعة بضغطة زر داخل شاشة تذاكر الصيانة.</small>
              </div>
            </div>
          </div>
        ) : null}

        {/* Modal Dialog for Selecting Maintenance Profile */}
        <DialogShell
          open={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          width="min(960px, 96vw)"
          ariaLabel="تخصيص نوع نشاط الصيانة والأجهزة"
        >
          <div style={{ padding: '14px 10px 18px' }}>
            <style>{`
              .maintenance-profile-card {
                transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.22s ease !important;
                will-change: transform, box-shadow;
              }
              .maintenance-profile-card:hover {
                transform: translateY(-3px) !important;
                box-shadow: 0 10px 24px -4px rgba(37, 99, 235, 0.14), 0 3px 8px -2px rgba(0, 0, 0, 0.05) !important;
                border-color: #93c5fd !important;
              }
            `}</style>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', boxShadow: '0 2px 8px rgba(37, 99, 235, 0.12)', flexShrink: 0 }}>
                  <MaintenanceWrenchIcon size={24} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em' }}>
                      تخصيص نوع نشاط الصيانة والأجهزة
                    </h3>
                    <span style={{ fontSize: '0.72rem', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>
                      9 أنشطة ذكية
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b', fontWeight: 500, lineHeight: 1.4 }}>
                    اختر النشاط التجاري لتكييف حقول الفحص، المسميات، وإيصالات الاستلام فوراً
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', width: 34, height: 34, cursor: 'pointer', fontWeight: 800, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease', flexShrink: 0 }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', maxHeight: '58vh', overflowY: 'auto', padding: '4px 2px' }}>
              {(Object.keys(MAINTENANCE_PROFILES) as MaintenanceProfileKey[]).map((key) => {
                const profile = MAINTENANCE_PROFILES[key];
                const isSelected = currentProfileKey === key;
                return (
                  <div
                    key={key}
                    className="maintenance-profile-card"
                    onClick={() => {
                      form.setValue('maintenanceProfile', key, { shouldDirty: true });
                      form.setValue('enableMobileStoreFeatures', true, { shouldDirty: true });
                      setProfileModalOpen(false);
                    }}
                    style={{
                      border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      background: isSelected ? 'linear-gradient(145deg, #f0f7ff 0%, #ffffff 100%)' : '#ffffff',
                      borderRadius: '12px',
                      padding: '16px',
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 6px 20px rgba(37, 99, 235, 0.14)' : '0 1px 3px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '10px',
                      position: 'relative'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: isSelected ? '#dbeafe' : '#f8fafc',
                            border: `1.5px solid ${isSelected ? '#93c5fd' : '#e2e8f0'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isSelected ? '#1d4ed8' : '#334155',
                            boxShadow: isSelected ? '0 2px 6px rgba(29, 78, 216, 0.15)' : 'none',
                            flexShrink: 0
                          }}>
                            <ProfileVectorIcon type={profile.iconType} size={20} />
                          </div>
                          <div>
                            <strong style={{ fontSize: '0.9rem', color: isSelected ? '#1e40af' : '#0f172a', fontWeight: 800, display: 'block', lineHeight: 1.3 }}>
                              {profile.title}
                            </strong>
                          </div>
                        </div>
                        {isSelected && (
                          <span style={{
                            background: '#2563eb',
                            color: '#ffffff',
                            borderRadius: '50%',
                            width: 22,
                            height: 22,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 900,
                            boxShadow: '0 2px 6px rgba(37, 99, 235, 0.4)',
                            flexShrink: 0
                          }}>
                            ✓
                          </span>
                        )}
                      </div>

                      <p style={{ fontSize: '0.78rem', color: isSelected ? '#1e3a8a' : '#64748b', lineHeight: 1.45, margin: '0 0 8px', opacity: isSelected ? 0.9 : 1 }}>
                        {profile.subtitle}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px dashed ${isSelected ? '#bfdbfe' : '#f1f5f9'}`, paddingTop: '8px', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        background: isSelected ? '#dbeafe' : '#f1f5f9',
                        color: isSelected ? '#1e40af' : '#475569',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontWeight: 700
                      }}>
                        {profile.serialLabel}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
                        {profile.sampleBrands.slice(0, 2).join(' • ')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#475569' }}>
              <LightbulbIcon size={16} color="#2563eb" />
              <span>يمكنك التبديل بين أنشطة الصيانة في أي وقت لتكييف الواجهات بما يلائم عملك دون التأثير على التذاكر والسجلات السابقة.</span>
            </div>
          </div>
        </DialogShell>

        {clothingModuleEnabled ? (
          <div className="document-prototype-grid compact-grid-2" style={{ marginTop: 16 }}>
            <div className="field">
              <label>النمط الافتراضي عند إضافة صنف</label>
              <select className="purchase-prototype-field-input" {...form.register('defaultProductKind')} disabled={disabled}>
                <option value="standard">صنف عادي (بسيط بدون متغيرات)</option>
                <option value="fashion">صنف بمتغيرات (أحجام / روائح / مقاسات)</option>
              </select>
            </div>
          </div>
        ) : null}

        {weightedBarcodeEnabled ? (
          <div className="document-prototype-grid compact-grid-2" style={{ marginTop: 16 }}>
            <div className="field">
              <label>بداية باركود الميزان</label>
              <input className="purchase-prototype-field-input" inputMode="numeric" {...form.register('weightedBarcodePrefix')} disabled={disabled} placeholder="21" />
            </div>
            <div className="field">
              <label>أرقام كود الصنف</label>
              <input className="purchase-prototype-field-input" type="number" min="3" max="8" {...form.register('weightedBarcodeProductCodeLength')} disabled={disabled} />
            </div>
            <div className="field">
              <label>أرقام الوزن</label>
              <input className="purchase-prototype-field-input" type="number" min="3" max="8" {...form.register('weightedBarcodeWeightDigits')} disabled={disabled} />
            </div>
            <div className="field">
              <label>دقة الوزن (خانات عشرية)</label>
              <input className="purchase-prototype-field-input" type="number" min="0" max="3" {...form.register('weightedBarcodeWeightDecimals')} disabled={disabled} />
            </div>
          </div>
        ) : null}
      </FormSection>

      {/* مودال ترقية الباقة عند محاولة الوصول لموديول مقفول */}
      <DialogShell
        open={Boolean(upgradeModalInfo?.open)}
        onClose={() => setUpgradeModalInfo(null)}
        width="min(540px, 94vw)"
        ariaLabel="ترقية الباقة لتفعيل الموديول"
      >
        <div style={{ padding: '24px 20px', textAlign: 'center' }} dir="rtl">
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#eff6ff',
            color: '#1d4ed8',
            border: '2px solid #bfdbfe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: '24px',
            boxShadow: '0 4px 12px rgba(29, 78, 216, 0.12)'
          }}>
            <LockIcon size={22} />
          </div>

          <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 8px' }}>
            موديول {upgradeModalInfo?.title}
          </h3>

          <div style={{ display: 'inline-block', background: '#dbeafe', color: '#1e40af', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800, marginBottom: '14px' }}>
            ⭐ متاح حصرياً في {upgradeModalInfo?.planName}
          </div>

          <p style={{ fontSize: '0.86rem', color: '#475569', lineHeight: 1.6, margin: '0 0 24px', textAlign: 'center' }}>
            {upgradeModalInfo?.description}
          </p>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
            <Link to="/settings/subscription" style={{ textDecoration: 'none' }}>
              <button
                type="button"
                style={{
                  background: '#170e5e',
                  color: '#ffffff',
                  padding: '10px 24px',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(23, 14, 94, 0.25)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>⭐ ترقية الباقة الآن</span>
              </button>
            </Link>
            <button
              type="button"
              onClick={() => setUpgradeModalInfo(null)}
              style={{
                background: '#f1f5f9',
                color: '#334155',
                padding: '10px 20px',
                fontSize: '0.88rem',
                fontWeight: 700,
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                cursor: 'pointer'
              }}
            >
              إغلاق
            </button>
          </div>
        </div>
      </DialogShell>
    </div>
  );
}
