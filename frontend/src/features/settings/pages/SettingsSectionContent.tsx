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
  if (section === 'subscription') return <TenantSubscriptionPage />;
  if (section === 'storefront') return <StorefrontSettingsTab />;
  if (section === 'whatsapp') return <SettingsWhatsAppGatewaySection />;
  if (section === 'reference') return renderReferenceSection(props);
  if (section === 'backup') return renderBackupSection(props);
  if (section === 'users') return renderUsersSection(props);
  if (section === 'system-updates') return <SystemUpdatesSection />;
  if (section === 'lan-network') return renderLanNetworkSection();
  if (section === 'tax-integration') return renderTaxIntegrationSection();
  return null;
}
