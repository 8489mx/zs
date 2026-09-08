import React, { Suspense } from 'react';
import { NavLink } from 'react-router-dom';
import type { SettingsSectionKey } from '@/features/settings/pages/settings.page-config';
import {
  renderBackupSection,
  renderCoreSection,
  renderReferenceSection,
  renderUsersSection,
  renderLanNetworkSection,
  renderTaxIntegrationSection,
  type SharedSettingsSectionProps,
} from '@/features/settings/pages/settings-section-content/render-section';

// Code-split heavy & secondary sections to drastically reduce initial Settings bundle
const SystemUpdatesSection = React.lazy(() => import('@/features/settings/components/workspace-sections/SystemUpdatesSection').then(m => ({ default: m.SystemUpdatesSection })));
const TenantSubscriptionPage = React.lazy(() => import('@/features/settings/pages/TenantSubscriptionPage').then(m => ({ default: m.TenantSubscriptionPage })));
const StorefrontSettingsTab = React.lazy(() => import('@/features/storefront/components/StorefrontSettingsTab').then(m => ({ default: m.StorefrontSettingsTab })));
const SettingsWhatsAppGatewaySection = React.lazy(() => import('@/features/settings/components/workspace-sections/SettingsWhatsAppGatewaySection').then(m => ({ default: m.SettingsWhatsAppGatewaySection })));
const SettingsTelegramAlertsSection = React.lazy(() => import('@/features/settings/components/workspace-sections/SettingsTelegramAlertsSection').then(m => ({ default: m.SettingsTelegramAlertsSection })));
const SettingsDemoDataWizardSection = React.lazy(() => import('@/features/settings/components/workspace-sections/SettingsDemoDataWizardSection').then(m => ({ default: m.SettingsDemoDataWizardSection })));
const SettingsDailyDigestSection = React.lazy(() => import('@/features/settings/components/workspace-sections/SettingsDailyDigestSection').then(m => ({ default: m.SettingsDailyDigestSection })));
const SettingsMarketplacesSection = React.lazy(() => import('@/features/settings/components/workspace-sections/SettingsMarketplacesSection').then(m => ({ default: m.SettingsMarketplacesSection })));

const LazySectionFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '220px', color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>
    جاري تحميل القسم...
  </div>
);

type QueryState = { isLoading: boolean; isError: boolean; error?: unknown; isSuccess?: boolean; data?: unknown };

interface SettingsSectionContentProps extends SharedSettingsSectionProps {
  section: SettingsSectionKey;
  diagnosticsQuery: QueryState;
  maintenanceQuery: QueryState;
  launchQuery: QueryState;
  uatQuery: QueryState;
  operationalQuery: QueryState;
  supportQuery: QueryState;
  canManageMaintenance: boolean;
  supportCopyStatus: string;
  diagnosticsCounts?: Record<string, unknown>;
  diagnosticsFinance?: Record<string, unknown>;
  maintenanceSummary?: Record<string, unknown>;
  launchSummary?: Record<string, unknown>;
  uatSummary?: Record<string, unknown>;
  operationalSummary?: Record<string, unknown>;
  supportData?: Record<string, unknown>;
  systemDiagnosticsPayload: Record<string, unknown>;
  cleanupPending: boolean;
  reconcileCustomersPending: boolean;
  reconcileSuppliersPending: boolean;
  reconcileAllPending: boolean;
  handleCopySupportSnapshot: () => void;
  onCleanupExpiredSessions: () => void;
  onReconcileCustomers: () => void;
  onReconcileSuppliers: () => void;
  onReconcileAll: () => void;
  onDownloadJson: (data: unknown, filename: string) => void;
}

export function SettingsSectionContent({ section, ...props }: SettingsSectionContentProps) {
  if (section === 'core') return renderCoreSection(props);
  if (section === 'demo-data') {
    return (
      <Suspense fallback={<LazySectionFallback />}>
        <SettingsDemoDataWizardSection />
      </Suspense>
    );
  }
  if (section === 'subscription') {
    return (
      <Suspense fallback={<LazySectionFallback />}>
        <TenantSubscriptionPage />
      </Suspense>
    );
  }
  if (section === 'storefront' || section === 'marketplaces') {
    return (
      <div className="page-stack">
        <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px', gap: '4px', marginBottom: '16px' }}>
          <NavLink
            to="/settings/storefront"
            className="btn"
            style={{
              background: section === 'storefront' ? '#170e5e' : 'transparent',
              color: section === 'storefront' ? '#ffffff' : '#64748b',
              border: 'none',
              padding: '6px 16px',
              borderRadius: '7px',
              fontSize: '0.84rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            المتجر الإلكتروني الخاص
          </NavLink>
          <NavLink
            to="/settings/marketplaces"
            className="btn"
            style={{
              background: section === 'marketplaces' ? '#170e5e' : 'transparent',
              color: section === 'marketplaces' ? '#ffffff' : '#64748b',
              border: 'none',
              padding: '6px 16px',
              borderRadius: '7px',
              fontSize: '0.84rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            الربط مع أمازون ونون
          </NavLink>
        </div>
        <Suspense fallback={<LazySectionFallback />}>
          {section === 'storefront' ? <StorefrontSettingsTab /> : <SettingsMarketplacesSection />}
        </Suspense>
      </div>
    );
  }
  if (section === 'whatsapp' || section === 'daily-digest') {
    return (
      <div className="page-stack">
        <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px', gap: '4px', marginBottom: '16px' }}>
          <NavLink
            to="/settings/whatsapp"
            className="btn"
            style={{
              background: section === 'whatsapp' ? '#170e5e' : 'transparent',
              color: section === 'whatsapp' ? '#ffffff' : '#64748b',
              border: 'none',
              padding: '6px 16px',
              borderRadius: '7px',
              fontSize: '0.84rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            بوابة الواتساب والرد الآلي الذكي
          </NavLink>
          <NavLink
            to="/settings/daily-digest"
            className="btn"
            style={{
              background: section === 'daily-digest' ? '#170e5e' : 'transparent',
              color: section === 'daily-digest' ? '#ffffff' : '#64748b',
              border: 'none',
              padding: '6px 16px',
              borderRadius: '7px',
              fontSize: '0.84rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            الملخص اليومي للمدير
          </NavLink>
        </div>
        <Suspense fallback={<LazySectionFallback />}>
          {section === 'whatsapp' ? <SettingsWhatsAppGatewaySection /> : <SettingsDailyDigestSection />}
        </Suspense>
      </div>
    );
  }
  if (section === 'reference') return renderReferenceSection(props);
  if (section === 'backup') return renderBackupSection(props);
  if (section === 'users') return renderUsersSection(props);
  if (section === 'system-updates') {
    return (
      <Suspense fallback={<LazySectionFallback />}>
        <SystemUpdatesSection />
      </Suspense>
    );
  }
  if (section === 'lan-network') return renderLanNetworkSection();
  if (section === 'tax-integration') return renderTaxIntegrationSection();
  if (section === 'monitoring') {
    return (
      <Suspense fallback={<LazySectionFallback />}>
        <SettingsTelegramAlertsSection />
      </Suspense>
    );
  }
  return null;
}
