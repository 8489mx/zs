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
import { SystemUpdatesSection } from '@/features/settings/components/workspace-sections/SystemUpdatesSection';
import { TenantSubscriptionPage } from '@/features/settings/pages/TenantSubscriptionPage';
import { StorefrontSettingsTab } from '@/features/storefront/components/StorefrontSettingsTab';
import { SettingsWhatsAppGatewaySection } from '@/features/settings/components/workspace-sections/SettingsWhatsAppGatewaySection';
import { SettingsTelegramAlertsSection } from '@/features/settings/components/workspace-sections/SettingsTelegramAlertsSection';
import { SettingsDemoDataWizardSection } from '@/features/settings/components/workspace-sections/SettingsDemoDataWizardSection';
import { SettingsDailyDigestSection } from '@/features/settings/components/workspace-sections/SettingsDailyDigestSection';
import { SettingsMarketplacesSection } from '@/features/settings/components/workspace-sections/SettingsMarketplacesSection';

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
  if (section === 'demo-data') return <SettingsDemoDataWizardSection />;
  if (section === 'subscription') return <TenantSubscriptionPage />;
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
        {section === 'storefront' ? <StorefrontSettingsTab /> : <SettingsMarketplacesSection />}
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
        {section === 'whatsapp' ? <SettingsWhatsAppGatewaySection /> : <SettingsDailyDigestSection />}
      </div>
    );
  }
  if (section === 'reference') return renderReferenceSection(props);
  if (section === 'backup') return renderBackupSection(props);
  if (section === 'users') return renderUsersSection(props);
  if (section === 'system-updates') return <SystemUpdatesSection />;
  if (section === 'lan-network') return renderLanNetworkSection();
  if (section === 'tax-integration') return renderTaxIntegrationSection();
  if (section === 'monitoring') return <SettingsTelegramAlertsSection />;
  return null;
}
