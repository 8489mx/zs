import { CSSProperties, PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { normalizeArabicSearchKey } from '@/lib/arabic-normalization';
import { AppCloseGuard } from './AppCloseGuard';
import { Button } from '@/shared/ui/button';
import { authApi } from '@/shared/api/auth';
import { resetAuthenticatedClient } from '@/lib/query-client-session';
import { DEFAULT_STORE_NAME, useAuthStore } from '@/stores/auth-store';
import { navigationItems } from '@/app/router/registry';
import { canAccessNavigationItem } from '@/app/router/access';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import { PasswordRotationGate } from '@/shared/system/password-rotation-gate';
import { SystemStatusBanner } from '@/shared/system/system-status-banner';
import { BootstrapAdminBanner } from '@/shared/system/bootstrap-admin-banner';
import { TrialStatusBanner } from '@/shared/system/trial-status-banner';
import { ImpersonationBanner } from '@/shared/system/impersonation-banner';
import { DeveloperActivationPanel } from '@/shared/system/DeveloperActivationPanel';
import { useOfflineUpdateCheck } from '@/features/updates/hooks/useOfflineUpdateCheck';
import {
  POS_SHELL_VISIBILITY_KEY,
  POS_TOGGLE_CHROME_EVENT,
  POS_TOGGLE_FULLSCREEN_EVENT,
  readPosShellPreference,
} from '@/features/pos/lib/pos-shell';
import { QuickAttendanceShortcut } from '@/shared/layout/quick-attendance-shortcut';
import { GlobalAppToolbar } from '@/shared/layout/GlobalAppToolbar';
import { useToolbarStore } from '@/stores/toolbar-store';
import { GlobalSearchModal } from '@/shared/components/GlobalSearchModal';
import { DialogShell } from '@/shared/components/dialog-shell';
import { SearchIcon, CheckCircleIcon } from '@/shared/components/icons/AppIcons';
import { getMaintenanceProfile } from '@/features/maintenance/constants/maintenance-profiles';
import { prefetchAllRouteModules } from '@/app/router/lazy-route';
import { prefetchRouteData } from '@/app/router/route-prefetch';


type SidebarGroupDefinition = {
  key: string;
  label: string;
  itemKeys: string[];
  iconKey?: string;
};

type IconTone = {
  bg: string;
  border: string;
  fg: string;
  glow: string;
};

const iconToneMap: Record<string, IconTone> = {
  dashboard: { bg: 'linear-gradient(135deg, #ede9fe, #dbeafe)', border: '#c4b5fd', fg: '#5b21b6', glow: 'rgba(99, 102, 241, 0.22)' },
  products: { bg: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', border: '#86efac', fg: '#166534', glow: 'rgba(34, 197, 94, 0.22)' },
  sales: { bg: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', border: '#93c5fd', fg: '#1d4ed8', glow: 'rgba(37, 99, 235, 0.22)' },
  'delivery-reps': { bg: 'linear-gradient(135deg, #fef3c7, #fef08a)', border: '#fde047', fg: '#a16207', glow: 'rgba(234, 179, 8, 0.22)' },
  pos: { bg: 'linear-gradient(135deg, #f3e8ff, #e9d5ff)', border: '#d8b4fe', fg: '#7e22ce', glow: 'rgba(168, 85, 247, 0.22)' },
  'cash-drawer': { bg: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '#fbbf24', fg: '#a16207', glow: 'rgba(245, 158, 11, 0.24)' },
  purchases: { bg: 'linear-gradient(135deg, #cffafe, #a5f3fc)', border: '#67e8f9', fg: '#0f766e', glow: 'rgba(6, 182, 212, 0.22)' },
  'purchases-new': { bg: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', border: '#6ee7b7', fg: '#065f46', glow: 'rgba(16, 185, 129, 0.22)' },
  inventory: { bg: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', border: '#86efac', fg: '#166534', glow: 'rgba(34, 197, 94, 0.22)' },
  suppliers: { bg: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)', border: '#cbd5e1', fg: '#334155', glow: 'rgba(100, 116, 139, 0.18)' },
  customers: { bg: 'linear-gradient(135deg, #ffe4e6, #fecdd3)', border: '#fda4af', fg: '#be123c', glow: 'rgba(244, 63, 94, 0.2)' },
  accounts: { bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: '#7dd3fc', fg: '#0369a1', glow: 'rgba(14, 165, 233, 0.22)' },
  returns: { bg: 'linear-gradient(135deg, #ffedd5, #fed7aa)', border: '#fdba74', fg: '#c2410c', glow: 'rgba(249, 115, 22, 0.22)' },
  'purchase-returns': { bg: 'linear-gradient(135deg, #ffedd5, #fed7aa)', border: '#fdba74', fg: '#c2410c', glow: 'rgba(249, 115, 22, 0.22)' },
  reports: { bg: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', border: '#a5b4fc', fg: '#4338ca', glow: 'rgba(99, 102, 241, 0.2)' },
  'reports-overview': { bg: 'linear-gradient(135deg, #ede9fe, #dbeafe)', border: '#c4b5fd', fg: '#5b21b6', glow: 'rgba(99, 102, 241, 0.22)' },
  'reports-sales': { bg: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', border: '#93c5fd', fg: '#1d4ed8', glow: 'rgba(37, 99, 235, 0.22)' },
  'reports-treasury': { bg: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', border: '#6ee7b7', fg: '#047857', glow: 'rgba(16, 185, 129, 0.22)' },
  'reports-inventory': { bg: 'linear-gradient(135deg, #ccfbf1, #99f6e4)', border: '#5eead4', fg: '#0f766e', glow: 'rgba(20, 184, 166, 0.22)' },
  'reports-purchases': { bg: 'linear-gradient(135deg, #cffafe, #a5f3fc)', border: '#67e8f9', fg: '#0f766e', glow: 'rgba(6, 182, 212, 0.22)' },
  'reports-balances': { bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: '#7dd3fc', fg: '#0369a1', glow: 'rgba(14, 165, 233, 0.22)' },
  'reports-employees': { bg: 'linear-gradient(135deg, #fee2e2, #e0f2fe)', border: '#fca5a5', fg: '#0f766e', glow: 'rgba(20, 184, 166, 0.2)' },
  audit: { bg: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', border: '#86efac', fg: '#15803d', glow: 'rgba(34, 197, 94, 0.2)' },
  treasury: { bg: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', border: '#6ee7b7', fg: '#047857', glow: 'rgba(16, 185, 129, 0.22)' },
  services: { bg: 'linear-gradient(135deg, #ede9fe, #ddd6fe)', border: '#c4b5fd', fg: '#6d28d9', glow: 'rgba(124, 58, 237, 0.22)' },
  hr: { bg: 'linear-gradient(135deg, #fee2e2, #e0f2fe)', border: '#fca5a5', fg: '#0f766e', glow: 'rgba(20, 184, 166, 0.2)' },
  'pricing-center': { bg: 'linear-gradient(135deg, #fef9c3, #fde68a)', border: '#facc15', fg: '#a16207', glow: 'rgba(234, 179, 8, 0.24)' },
  settings: { bg: 'linear-gradient(135deg, #f8fafc, #e2e8f0)', border: '#cbd5e1', fg: '#475569', glow: 'rgba(71, 85, 105, 0.18)' },
  admin: { bg: 'linear-gradient(135deg, #f8fafc, #e2e8f0)', border: '#cbd5e1', fg: '#475569', glow: 'rgba(71, 85, 105, 0.18)' },
  'tax-dispatcher': { bg: 'linear-gradient(135deg, #f8fafc, #e2e8f0)', border: '#cbd5e1', fg: '#334155', glow: 'rgba(71, 85, 105, 0.18)' },
  'saas-admin-tenants': { bg: 'linear-gradient(135deg, #fee2e2, #fecaca)', border: '#fca5a5', fg: '#991b1b', glow: 'rgba(239, 68, 68, 0.2)' },
  'saas-admin-plans': { bg: 'linear-gradient(135deg, #fee2e2, #fecaca)', border: '#fca5a5', fg: '#991b1b', glow: 'rgba(239, 68, 68, 0.2)' },
  'accounting-accounts': { bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: '#7dd3fc', fg: '#0369a1', glow: 'rgba(14, 165, 233, 0.22)' },
  'accounting-journal-entries': { bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: '#7dd3fc', fg: '#0369a1', glow: 'rgba(14, 165, 233, 0.22)' },
  'accounting-settings': { bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: '#7dd3fc', fg: '#0369a1', glow: 'rgba(14, 165, 233, 0.22)' },
  'accounting-financial-summary': { bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: '#7dd3fc', fg: '#0369a1', glow: 'rgba(14, 165, 233, 0.22)' },
  'accounting-receivables-payables': { bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: '#7dd3fc', fg: '#0369a1', glow: 'rgba(14, 165, 233, 0.22)' },
  'accounting-inventory-value': { bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: '#7dd3fc', fg: '#0369a1', glow: 'rgba(14, 165, 233, 0.22)' },
  mobile: { bg: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '#f59e0b', fg: '#b45309', glow: 'rgba(245, 158, 11, 0.24)' },
  import: { bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: '#7dd3fc', fg: '#0284c7', glow: 'rgba(14, 165, 233, 0.22)' },
  manufacturing: { bg: 'linear-gradient(135deg, #fef08a, #fde047)', border: '#facc15', fg: '#ca8a04', glow: 'rgba(234, 179, 8, 0.22)' },
  maintenance: { bg: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '#f59e0b', fg: '#b45309', glow: 'rgba(245, 158, 11, 0.24)' },
  'trade-in': { bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: '#38bdf8', fg: '#0284c7', glow: 'rgba(14, 165, 233, 0.22)' },
  'imei-history': { bg: 'linear-gradient(135deg, #f3e8ff, #e9d5ff)', border: '#c084fc', fg: '#7e22ce', glow: 'rgba(168, 85, 247, 0.22)' },
  'manufacturing-components': { bg: 'linear-gradient(135deg, #fef08a, #fde047)', border: '#facc15', fg: '#ca8a04', glow: 'rgba(234, 179, 8, 0.22)' },
  'manufacturing-boms': { bg: 'linear-gradient(135deg, #fef08a, #fde047)', border: '#facc15', fg: '#ca8a04', glow: 'rgba(234, 179, 8, 0.22)' },
  'manufacturing-work-orders': { bg: 'linear-gradient(135deg, #fef08a, #fde047)', border: '#facc15', fg: '#ca8a04', glow: 'rgba(234, 179, 8, 0.22)' },
  'manufacturing-settings': { bg: 'linear-gradient(135deg, #fef08a, #fde047)', border: '#facc15', fg: '#ca8a04', glow: 'rgba(234, 179, 8, 0.22)' },
  'import-shipments': { bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: '#7dd3fc', fg: '#0284c7', glow: 'rgba(14, 165, 233, 0.22)' },
  'import-supplier-credit': { bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: '#7dd3fc', fg: '#0284c7', glow: 'rgba(14, 165, 233, 0.22)' },
  'import-profit-pool': { bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: '#7dd3fc', fg: '#0284c7', glow: 'rgba(14, 165, 233, 0.22)' },
  'inventory-tree': { bg: 'linear-gradient(135deg, #ccfbf1, #99f6e4)', border: '#5eead4', fg: '#0f766e', glow: 'rgba(20, 184, 166, 0.22)' },
  'product-categories': { bg: 'linear-gradient(135deg, #ccfbf1, #99f6e4)', border: '#5eead4', fg: '#0f766e', glow: 'rgba(20, 184, 166, 0.22)' },
  expenses: { bg: 'linear-gradient(135deg, #fee2e2, #fecaca)', border: '#fca5a5', fg: '#b91c1c', glow: 'rgba(239, 68, 68, 0.2)' },
  pharmacy: { bg: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', border: '#86efac', fg: '#15803d', glow: 'rgba(34, 197, 94, 0.22)' },
  'pharmacy-dashboard': { bg: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', border: '#86efac', fg: '#15803d', glow: 'rgba(34, 197, 94, 0.22)' },
  'pharmacy-drugs': { bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: '#7dd3fc', fg: '#0369a1', glow: 'rgba(14, 165, 233, 0.22)' },
  'pharmacy-prescriptions': { bg: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', border: '#6ee7b7', fg: '#047857', glow: 'rgba(16, 185, 129, 0.22)' },
  'pharmacy-shortages': { bg: 'linear-gradient(135deg, #fee2e2, #fecaca)', border: '#fca5a5', fg: '#b91c1c', glow: 'rgba(239, 68, 68, 0.2)' },
  'pharmacy-batches': { bg: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '#fbbf24', fg: '#a16207', glow: 'rgba(245, 158, 11, 0.24)' },
  'pharmacy-clinical': { bg: 'linear-gradient(135deg, #ede9fe, #ddd6fe)', border: '#c4b5fd', fg: '#6d28d9', glow: 'rgba(124, 58, 237, 0.22)' },
};

const iconPathMap: Record<string, string> = {
  pharmacy: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7ZM12 5v6M9 8h6',
  'pharmacy-dashboard': 'M4 11h16M6 9l6-5 6 5v10H6V9z',
  'pharmacy-drugs': 'M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7zm-2-2l7-7',
  'pharmacy-prescriptions': 'M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 3v5h5M9 13h6M9 17h6',
  'pharmacy-shortages': 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2zM9 12h6M9 16h6',
  'pharmacy-batches': 'M12 8v4l3 3M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z',
  'pharmacy-clinical': 'M22 12h-4l-3 9L9 3l-3 9H2',
  dashboard: 'M4 11h16M6 9l6-5 6 5v10H6V9z',
  pos: 'M4 5h16v10H4V5zM8 19h8M10 15v4M14 15v4',
  'cash-drawer': 'M3 10h18v10H3V10zm3-6h12v4H6V4zm6 9v2m-4 0h8',
  sales: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6M9 16h4',
  purchases: 'M1 3h3l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L22 6H6M10 21a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm10 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z',
  'purchases-new': 'M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 3v5h5M12 18v-6M9 15h6',
  inventory: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
  products: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
  'product-categories': 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01',
  'pricing-center': 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  'inventory-warehouses': 'M3 21h18M3 7v14M21 7v14M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4M3 7l9-4 9 4',
  'inventory-tree': 'M6 3v6a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V3M12 12v9',
  'inventory-issue-order-new': 'M12 5v14M5 12h14M3 21h18',
  'inventory-issue-orders': 'M5 19V5h14v14H5zM9 16v-5M12 16V8M15 16v-3',
  treasury: 'M2 6h20v12H2V6zm4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm12 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm-6 2a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  expenses: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  accounts: 'M6 3h12v18H6V3zM9 8h6M9 12h6M9 16h2M14 16h1',
  'accounting-accounts': 'M6 3h12v18H6V3zM9 8h6M9 12h6M9 16h2M14 16h1',
  'accounting-journal-entries': 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15zM9 7h6M9 11h6',
  'accounting-settings': 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-2a8 8 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a8 8 0 0 0-1.7-1L15 3.5h-4l-.3 2.4a8 8 0 0 0-1.7 1l-2.5-1-2 3.5 2.1 1.6a8 8 0 0 0 0 2L4.5 15l2 3.5 2.5-1a8 8 0 0 0 1.7 1l.3 2.5h4l.3-2.5a8 8 0 0 0 1.7-1l2.5 1 2-3.5-2.1-1.6z',
  mobile: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm4 17h2',
  maintenance: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
  'trade-in': 'M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4',
  'imei-history': 'M12 18h.01M8 21h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z',
  import: 'M2 19h20l-2-6H4l-2 6zm2-6V9a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4m3 0V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7',
  'import-shipments': 'M2 19h20l-2-6H4l-2 6zm2-6V9a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4m3 0V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7',
  'import-supplier-credit': 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  'import-profit-pool': 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  manufacturing: 'M2 20h20V8l-6 4V8l-6 4V4H2v16zm4-8h2v2H6v-2zm0 4h2v2H6v-2zm6-4h2v2h-2v-2zm0 4h2v2h-2v-2z',
  'manufacturing-components': 'M4 6h16M4 12h16M4 18h16',
  'manufacturing-boms': 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2zM9 12h6M9 16h6',
  'manufacturing-work-orders': 'M2 12h4l2-2h4l2 2h8M6 14v6M18 14v6M10 6L8 10h8l-2-4h-4z',
  'manufacturing-settings': 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-2a8 8 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a8 8 0 0 0-1.7-1L15 3.5h-4l-.3 2.4a8 8 0 0 0-1.7 1l-2.5-1-2 3.5 2.1 1.6a8 8 0 0 0 0 2L4.5 15l2 3.5 2.5-1a8 8 0 0 0 1.7 1l.3 2.5h4l.3-2.5a8 8 0 0 0 1.7-1l2.5 1 2-3.5-2.1-1.6z',
  reports: 'M18 20V10M12 20V4M6 20v-6M3 20h18',
  'reports-overview': 'M18 20V10M12 20V4M6 20v-6M3 20h18',
  'reports-sales': 'M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6M9 16h4',
  'reports-treasury': 'M2 6h20v12H2V6zm4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm12 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  'reports-inventory': 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
  'reports-purchases': 'M1 3h3l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L22 6H6',
  'reports-balances': 'M6 3h12v18H6V3zM9 8h6M9 12h6M9 16h2M14 16h1',
  'reports-employees': 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  hr: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm14 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  audit: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2zm0 9l2 2 4-4',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-2a8 8 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a8 8 0 0 0-1.7-1L15 3.5h-4l-.3 2.4a8 8 0 0 0-1.7 1l-2.5-1-2 3.5 2.1 1.6a8 8 0 0 0 0 2L4.5 15l2 3.5 2.5-1a8 8 0 0 0 1.7 1l.3 2.5h4l.3-2.5a8 8 0 0 0 1.7-1l2.5 1 2-3.5-2.1-1.6z',
  admin: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-2a8 8 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a8 8 0 0 0-1.7-1L15 3.5h-4l-.3 2.4a8 8 0 0 0-1.7 1l-2.5-1-2 3.5 2.1 1.6a8 8 0 0 0 0 2L4.5 15l2 3.5 2.5-1a8 8 0 0 0 1.7 1l.3 2.5h4l.3-2.5a8 8 0 0 0 1.7-1l2.5 1 2-3.5-2.1-1.6z',
  'delivery-reps': 'M1 3h15v13H1V3zm15 5h4l3 3v5h-7V8zM5 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm13 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  returns: 'M8 7h8a5 5 0 1 1 0 10h-6M8 7l4-4M8 7l4 4',
  'purchase-returns': 'M8 7h8a5 5 0 1 1 0 10h-6M8 7l4-4M8 7l4 4',
  customers: 'M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a6 6 0 0 1 12 0M17 11a3 3 0 1 0 0-6M17 14a5 5 0 0 1 5 5',
  suppliers: 'M1 3h15v13H1V3zm15 5h4l3 3v5h-7V8zM5 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm13 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  services: 'M6 4h12v16H6V4zM9 8h6M9 12h6M9 16h3',
  'tax-dispatcher': 'M12 2l8 4v6c0 5.5-3.6 10.7-8 12-4.4-1.3-8-6.5-8-12V6l8-4zM12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 11c-2.7 0-5 1.8-5 4v1h10v-1c0-2.2-2.3-4-5-4z',
  'saas-admin-tenants': 'M4 5h16v14H4V5zM8 9h8M8 13h8M8 17h5',
  'saas-admin-plans': 'M4 5h16v14H4V5zM8 9h8M8 13h8M8 17h5',
  'accounting-financial-summary': 'M18 20V10M12 20V4M6 20v-6M3 20h18',
  'accounting-receivables-payables': 'M6 3h12v18H6V3zM9 8h6M9 12h6M9 16h2M14 16h1',
  'accounting-inventory-value': 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
};

function AppNavIcon({ itemKey }: { itemKey: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d={iconPathMap[itemKey] || iconPathMap.settings} />
    </svg>
  );
}

function formatWorkspaceName(name: string) {
  const match = name.match(/^(.*?) (ل\S+.*)$/);
  if (match) {
    return (
      <>
        {match[1]}<br />{match[2]}
      </>
    );
  }
  return name;
}

export function AppShell({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const { data: settings } = useSettingsQuery();
  const storeName = useAuthStore((state) => state.storeName);
  const isEtaActive = useAuthStore((state) => state.isEtaActive);
  const clearSession = useAuthStore((state) => state.clearSession);
  const deploymentMode = useAuthStore((state) => state.activationStatus?.deploymentMode);
  const { data: updateInfo } = useOfflineUpdateCheck(deploymentMode);
  const displayName = user?.displayName || user?.username || 'المستخدم';
  const workspaceName = storeName || DEFAULT_STORE_NAME;
  const isPosRoute = location.pathname.startsWith('/pos');
  const [isPosChromeHidden, setIsPosChromeHidden] = useState(false);
  const [quickAttendanceOpen, setQuickAttendanceOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') return window.localStorage.getItem('zsystems_sidebar_collapsed') === 'true';
    return false;
  });
  
  const { isMobileSidebarOpen, setMobileSidebarOpen } = useToolbarStore();

  useEffect(() => {
    // Close mobile sidebar on route change
    setMobileSidebarOpen(false);
  }, [location.pathname, setMobileSidebarOpen]);

  const [isSidebarSearchOpen, setIsSidebarSearchOpen] = useState(false);
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const sidebarRef = useRef<HTMLElement>(null);
  const sidebarSearchInputRef = useRef<HTMLInputElement>(null);
  const sidebarSearchWrapperRef = useRef<HTMLDivElement>(null);

  const handleOpenSidebarSearch = () => {
    if (isSidebarCollapsed) {
      setIsSidebarCollapsed(false);
      window.localStorage.setItem('zsystems_sidebar_collapsed', 'false');
    }
    setIsSidebarSearchOpen(true);
    setTimeout(() => {
      sidebarSearchInputRef.current?.focus();
    }, 60);
  };

  const handleCloseSidebarSearch = () => {
    setIsSidebarSearchOpen(false);
    setSidebarSearchQuery('');
  };

  // Close search on route changes
  useEffect(() => {
    if (isSidebarSearchOpen) {
      setIsSidebarSearchOpen(false);
      setSidebarSearchQuery('');
    }
  }, [location.pathname]);

  // Close search when clicking outside the sidebar
  useEffect(() => {
    if (!isSidebarSearchOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        handleCloseSidebarSearch();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSidebarSearchOpen]);

  // Close search when collapsed
  useEffect(() => {
    if (isSidebarCollapsed && isSidebarSearchOpen) {
      handleCloseSidebarSearch();
    }
  }, [isSidebarCollapsed, isSidebarSearchOpen]);

  const toggleSidebar = () => {
    if (isSidebarSearchOpen) {
      handleCloseSidebarSearch();
    }
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem('zsystems_sidebar_collapsed', String(next));
      return next;
    });
  };

  const visibleNavigationItems = useMemo(() => {
    const preferredOrder = [
      // Quick primary actions
      'dashboard',
      'pos',
      'cash-drawer',

      // 1. Sales & Customers
      'sales',
      'returns',
      'customers',
      'delivery-reps',
      'tax-dispatcher',

      // 2. Purchases & Suppliers
      'purchases-new',
      'purchases',
      'purchase-returns',
      'suppliers',

      // 3. Products & Inventory
      'products',
      'product-categories',
      'pricing-center',
      'inventory-warehouses',
      'inventory-tree',
      'inventory',
      'inventory-issue-orders',
      'inventory-issue-order-new',
      'services',

      // 4. Finance & Accounting
      'treasury',
      'expenses',
      'accounts',
      'accounting-accounts',
      'accounting-journal-entries',
      'accounting-settings',

      // 5. Mobile & Devices (Conditional)
      'maintenance',
      'trade-in',
      'imei-history',

      // 5.5. Pharmacy & Medications (Conditional)
      'pharmacy-dashboard',
      'pharmacy-drugs',
      'pharmacy-prescriptions',
      'pharmacy-shortages',
      'pharmacy-batches',
      'pharmacy-clinical',

      // 6. Import & Containers (Conditional)
      'import-shipments',
      'import-supplier-credit',
      'import-profit-pool',

      // 7. Manufacturing (Conditional)
      'manufacturing-components',
      'manufacturing-work-orders',
      'manufacturing-boms',
      'manufacturing-settings',

      // 8. Reports & Analytics
      'reports-overview',
      'reports-sales',
      'reports-purchases',
      'reports-inventory',
      'reports-treasury',
      'reports-balances',
      'reports-employees',

      // 9. Admin & System
      'hr',
      'audit',
      'settings',
      'saas-admin-tenants',
      'saas-admin-plans',
    ];
    const maintenanceProfile = getMaintenanceProfile(settings?.maintenanceProfile);
    const labelOverrides: Record<string, string> = {
      dashboard: t('sidebar.dashboard', 'الرئيسية'),
      'cash-drawer': t('sidebar.cash-drawer', 'الوردية والدرج النقدي'),
      pos: t('sidebar.pos', 'نقطة البيع'),
      sales: 'سجل الفواتير',
      returns: 'مرتجعات المبيعات',
      customers: t('sidebar.customers', 'العملاء'),
      'delivery-reps': 'إدارة المناديب',
      'tax-dispatcher': 'الفاتورة الإلكترونية',
      'purchases-new': 'إنشاء فاتورة شراء',
      purchases: 'سجل فواتير المشتريات',
      'purchase-returns': 'مرتجعات المشتريات',
      suppliers: t('sidebar.suppliers', 'الموردين'),
      products: 'قائمة الأصناف',
      'product-categories': 'أقسام الأصناف',
      'pricing-center': 'مركز التسعير',
      'inventory-warehouses': 'أماكن التخزين',
      'inventory-tree': 'شجرة المخازن',
      inventory: 'جرد وحركات المخزون',
      'inventory-issue-orders': 'سجل أذونات الصرف',
      'inventory-issue-order-new': 'إذن صرف جديد',
      services: 'الخدمات',
      treasury: 'الخزينة والبنوك',
      expenses: 'المصروفات',
      accounts: 'حسابات عملاء وموردين',
      'accounting-accounts': 'شجرة الحسابات',
      'accounting-journal-entries': 'القيود اليومية',
      'accounting-settings': 'إعدادات الحسابات',
      maintenance: 'تذاكر الصيانة',
      'trade-in': 'شراء واستبدال الأجهزة',
      'imei-history': maintenanceProfile.sidebarSerialLabel,
      'pharmacy-dashboard': 'لوحة تحكم الصيدلية',
      'pharmacy-drugs': 'دليل الأدوية والبدائل',
      'pharmacy-prescriptions': 'الروشتات والتأمين',
      'pharmacy-shortages': 'كشكول النواقص',
      'pharmacy-batches': 'الصلاحيات والمرتجعات',
      'pharmacy-clinical': 'الفحوصات والخدمات',
      'import-shipments': 'إدارة الحاويات والشحن',
      'import-supplier-credit': 'مديونية الصين (المورد)',
      'import-profit-pool': 'أرباح الشركاء (نهاية المدة)',
      'manufacturing-components': 'مكونات التصنيع',
      'manufacturing-work-orders': 'أوامر الإنتاج',
      'manufacturing-boms': 'قوائم المكونات',
      'manufacturing-settings': 'إعدادات التصنيع',
      'reports-overview': 'ملخص الأرباح والأداء',
      'reports-sales': 'تقارير المبيعات',
      'reports-purchases': 'تقارير المشتريات',
      'reports-inventory': 'تقارير المخزون',
      'reports-treasury': 'الخزينة والمصروفات',
      'reports-balances': 'أرصدة وذمم الحسابات',
      'reports-employees': 'تقارير الموظفين',
      hr: 'الموارد البشرية',
      audit: 'سجل النشاط',
      settings: 'الإعدادات العامة',
      'saas-admin-tenants': 'إدارة المشتركين',
      'saas-admin-plans': 'باقات الاشتراكات',
    };
    return navigationItems
      .filter((item) => {
        if (!user || !canAccessNavigationItem(user, item)) return false;
        if (item.key === 'tax-dispatcher' && !isEtaActive) return false;
        if (item.key?.startsWith('import-') && settings?.importModuleEnabled !== true) return false;
        if ((item.key === 'maintenance' || item.key === 'trade-in' || item.key === 'imei-history') && settings?.enableMobileStoreFeatures !== true) return false;
        if (item.key?.startsWith('pharmacy-') && settings?.enablePharmacyModule !== true) return false;
        if (item.key?.startsWith('manufacturing-') && settings?.manufacturingModuleEnabled !== true) return false;
        return true;
      })
      .map((item) => ({ ...item, label: labelOverrides[item.key] || item.label }))
      .sort((a, b) => {
        const aIndex = preferredOrder.indexOf(a.key);
        const bIndex = preferredOrder.indexOf(b.key);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      });
  }, [user, t, isEtaActive, settings?.importModuleEnabled, settings?.enableMobileStoreFeatures, settings?.maintenanceProfile, settings?.enablePharmacyModule, settings?.manufacturingModuleEnabled]);

  const navigationMap = useMemo(() => new Map(visibleNavigationItems.map((item) => [item.key, item])), [visibleNavigationItems]);
  const primaryNavigationKeys = useMemo(() => ['dashboard', 'pos', 'cash-drawer'], []);
  const sidebarGroups = useMemo<SidebarGroupDefinition[]>(() => {
    const maintenanceProfile = getMaintenanceProfile(settings?.maintenanceProfile);
    return [
      { key: 'sales-group', label: t('sidebar.sales-group', 'المبيعات'), itemKeys: ['sales', 'returns', 'customers', 'delivery-reps', 'tax-dispatcher'], iconKey: 'sales' },
      { key: 'purchases-group', label: t('sidebar.purchases-group', 'المشتريات والموردين'), itemKeys: ['purchases-new', 'purchases', 'purchase-returns', 'suppliers'], iconKey: 'purchases' },
      { key: 'inventory-group', label: t('sidebar.inventory-group', 'المخزون والأصناف'), itemKeys: ['products', 'product-categories', 'pricing-center', 'inventory-warehouses', 'inventory-tree', 'inventory', 'inventory-issue-orders', 'inventory-issue-order-new', 'services'], iconKey: 'inventory' },
      { key: 'accounting-group', label: t('sidebar.accounting-group', 'المالية والمحاسبة'), itemKeys: ['treasury', 'expenses', 'accounts', 'accounting-accounts', 'accounting-journal-entries', 'accounting-settings'], iconKey: 'treasury' },
      { key: 'mobile-group', label: maintenanceProfile.sidebarTitle, itemKeys: ['maintenance', 'trade-in', 'imei-history'], iconKey: 'mobile' },
      { key: 'pharmacy-group', label: 'قسم الصيدلية والأدوية', itemKeys: ['pharmacy-dashboard', 'pharmacy-drugs', 'pharmacy-prescriptions', 'pharmacy-shortages', 'pharmacy-batches', 'pharmacy-clinical'], iconKey: 'pharmacy' },
      { key: 'import-group', label: 'الاستيراد والشراكة', itemKeys: ['import-shipments', 'import-supplier-credit', 'import-profit-pool'], iconKey: 'import' },
      { key: 'manufacturing-group', label: t('sidebar.manufacturing-group', 'التصنيع والإنتاج'), itemKeys: ['manufacturing-components', 'manufacturing-work-orders', 'manufacturing-boms', 'manufacturing-settings'], iconKey: 'manufacturing' },
      { key: 'reports-group', label: t('sidebar.reports-group', 'التقارير والتحليلات'), itemKeys: ['reports-overview', 'reports-sales', 'reports-purchases', 'reports-inventory', 'reports-treasury', 'reports-balances', 'reports-employees'], iconKey: 'reports' },
      { key: 'admin-group', label: t('sidebar.admin-group', 'الإدارة والنظام'), itemKeys: ['hr', 'audit', 'settings', 'saas-admin-tenants', 'saas-admin-plans'], iconKey: 'admin' },
    ];
  }, [t, settings?.maintenanceProfile]);

  const visiblePrimaryNavigationItems = useMemo(() => primaryNavigationKeys.map((key) => navigationMap.get(key)).filter((item): item is NonNullable<typeof item> => Boolean(item)), [navigationMap, primaryNavigationKeys]);
  const activeSidebarGroupKey = useMemo(() => sidebarGroups.find((group) => group.itemKeys.some((itemKey) => {
    const navItem = navigationMap.get(itemKey);
    if (!navItem) return false;
    if (navItem.activePaths?.includes(location.pathname)) return true;
    if (navItem.end) return location.pathname === navItem.to;
    return location.pathname === navItem.to || location.pathname.startsWith(`${navItem.to}/`);
  }))?.key ?? null, [location.pathname, navigationMap, sidebarGroups]);

  const normalizedSidebarQuery = useMemo(() => normalizeArabicSearchKey(sidebarSearchQuery), [sidebarSearchQuery]);
  const isSearchingSidebar = normalizedSidebarQuery.length > 0;

  const filteredPrimaryNavigationItems = useMemo(() => {
    if (!isSearchingSidebar) return visiblePrimaryNavigationItems;
    return visiblePrimaryNavigationItems.filter((item) => 
      normalizeArabicSearchKey(item.label).includes(normalizedSidebarQuery)
    );
  }, [isSearchingSidebar, normalizedSidebarQuery, visiblePrimaryNavigationItems]);

  const filteredSidebarGroups = useMemo(() => {
    return sidebarGroups.map((group) => {
      const groupItems = group.itemKeys.map((key) => navigationMap.get(key)).filter((item): item is NonNullable<typeof item> => Boolean(item));
      if (!groupItems.length) return null;

      if (!isSearchingSidebar) {
        return {
          group,
          groupItems,
          isActive: activeSidebarGroupKey === group.key,
          isOpen: !isSidebarCollapsed,
        };
      }

      const matchingItems = groupItems.filter((item) => 
        normalizeArabicSearchKey(item.label).includes(normalizedSidebarQuery) ||
        normalizeArabicSearchKey(group.label).includes(normalizedSidebarQuery)
      );

      if (matchingItems.length === 0) return null;

      return {
        group,
        groupItems: matchingItems,
        isActive: true,
        isOpen: true,
      };
    }).filter((g): g is NonNullable<typeof g> => Boolean(g));
  }, [activeSidebarGroupKey, isSearchingSidebar, isSidebarCollapsed, navigationMap, normalizedSidebarQuery, sidebarGroups]);

  const totalMatchingItemsCount = filteredPrimaryNavigationItems.length + filteredSidebarGroups.reduce((acc, g) => acc + g.groupItems.length, 0);

  useEffect(() => {
    if (!isPosRoute) {
      setIsPosChromeHidden(false);
      return;
    }
    setIsPosChromeHidden(readPosShellPreference());
  }, [isPosRoute]);

  useEffect(() => {
    if (!isPosRoute || typeof window === 'undefined') return;
    window.localStorage.setItem(POS_SHELL_VISIBILITY_KEY, isPosChromeHidden ? 'hidden' : 'shown');
  }, [isPosChromeHidden, isPosRoute]);

  useEffect(() => {
    if (!isPosRoute || typeof window === 'undefined') return undefined;
    const toggleChrome = () => setIsPosChromeHidden((current) => !current);
    const toggleFullscreen = async () => {
      try {
        const electronRuntime = (window as any).electronRuntime;
        if (electronRuntime && typeof electronRuntime.toggleFullScreen === 'function') {
          const isFS = await electronRuntime.toggleFullScreen();
          setIsPosChromeHidden(Boolean(isFS));
          return;
        }
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen?.();
          if ('keyboard' in navigator && typeof (navigator as any).keyboard?.lock === 'function') {
            try {
              await (navigator as any).keyboard.lock(['Escape']);
            } catch {
              // ignore
            }
          }
          setIsPosChromeHidden(true);
          return;
        }
        if ('keyboard' in navigator && typeof (navigator as any).keyboard?.unlock === 'function') {
          try {
            (navigator as any).keyboard.unlock();
          } catch {
            // ignore
          }
        }
        await document.exitFullscreen?.();
        setIsPosChromeHidden(false);
      } catch {
        // ignore fullscreen errors triggered by browser policies
      }
    };
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'F10') {
        event.preventDefault();
        toggleChrome();
        return;
      }
      if (event.key === 'F11') {
        // In Electron, F11 is already handled by main process, but for browser fallback:
        const electronRuntime = (window as any).electronRuntime;
        if (!electronRuntime) {
          event.preventDefault();
          void toggleFullscreen();
        }
      }
    };
    const handleFullscreenChange = async () => {
      if (document.fullscreenElement) {
        if ('keyboard' in navigator && typeof (navigator as any).keyboard?.lock === 'function') {
          try {
            await (navigator as any).keyboard.lock(['Escape']);
          } catch {
            // ignore
          }
        }
        setIsPosChromeHidden(true);
        return;
      }
      if ('keyboard' in navigator && typeof (navigator as any).keyboard?.unlock === 'function') {
        try {
          (navigator as any).keyboard.unlock();
        } catch {
          // ignore
        }
      }
      setIsPosChromeHidden(readPosShellPreference());
    };
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener(POS_TOGGLE_CHROME_EVENT, toggleChrome);
    window.addEventListener(POS_TOGGLE_FULLSCREEN_EVENT, toggleFullscreen);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    const electronRuntime = (window as any).electronRuntime;
    let unsubscribeElectronFs: (() => void) | undefined;
    if (electronRuntime && typeof electronRuntime.onFullScreenChange === 'function') {
      unsubscribeElectronFs = electronRuntime.onFullScreenChange((isFS: boolean) => {
        setIsPosChromeHidden(Boolean(isFS));
      });
    }

    return () => {
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener(POS_TOGGLE_CHROME_EVENT, toggleChrome);
      window.removeEventListener(POS_TOGGLE_FULLSCREEN_EVENT, toggleFullscreen);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (unsubscribeElectronFs) unsubscribeElectronFs();
    };
  }, [isPosRoute]);

  useEffect(() => {
    const resetScroll = () => {
      const contentWrap = document.querySelector('.content-wrap') as HTMLElement | null;
      const pageStack = document.querySelector('.content-wrap .page-stack') as HTMLElement | null;
      if (contentWrap) contentWrap.scrollTop = 0;
      if (pageStack) pageStack.scrollTop = 0;
      window.scrollTo(0, 0);
    };
    resetScroll();
    const frameId = window.requestAnimationFrame(resetScroll);
    return () => window.cancelAnimationFrame(frameId);
  }, [location.pathname]);

  useEffect(() => {
    try {
      const currentVer = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.1.21';
      localStorage.setItem('zs.app_display_version', currentVer);
    } catch {}
    prefetchAllRouteModules();
  }, []);

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable || Boolean(target.closest('[contenteditable="true"]'));
    };
    const handleGlobalShortcut = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (!event.altKey || !event.shiftKey || event.key !== 'F9') return;
      event.preventDefault();
      setQuickAttendanceOpen(true);
    };
    window.addEventListener('keydown', handleGlobalShortcut);
    return () => window.removeEventListener('keydown', handleGlobalShortcut);
  }, []);

  async function handleLogout() {
    try {
      await authApi.logout();
    } finally {
      await resetAuthenticatedClient(queryClient, clearSession);
      navigate('/login?reason=signed-out', { replace: true });
    }
  }

  const cleanWorkspaceName = workspaceName.replace(/^\s*["'”“]+|["'”“]+\s*$/g, '').trim() || workspaceName;

  function renderNavItem(item: NonNullable<(typeof visibleNavigationItems)[number]>, keyPrefix: string) {
    const tone = iconToneMap[item.key] || iconToneMap.settings;
    const toneStyle = { '--icon-bg': tone.bg, '--icon-border': tone.border, '--icon-fg': tone.fg, '--icon-glow': tone.glow } as CSSProperties;
    return (
      <NavLink 
        key={`${keyPrefix}-${item.key}`} 
        to={item.to} 
        end={item.end} 
        data-key={item.key} 
        data-tooltip={isSidebarCollapsed ? item.label : undefined}
        style={toneStyle} 
        onMouseEnter={() => prefetchRouteData(item.to)}
        onTouchStart={() => prefetchRouteData(item.to)}
        onAuxClick={(e) => {
          if (e.button === 1) e.preventDefault();
        }}
        onMouseDown={(e) => {
          if (e.button === 1) e.preventDefault();
        }} 
        onClick={() => {
          if (isSidebarSearchOpen) {
            setTimeout(() => {
              handleCloseSidebarSearch();
            }, 0);
          }
        }}
        className={({ isActive }) => {
          const isPathActive = item.activePaths?.includes(location.pathname) || isActive;
          return `sidebar-link ${keyPrefix === 'group' ? 'sidebar-link-sub ' : ''}${isPathActive ? 'active' : ''}`.trim();
        }}
      >
        <span className="sidebar-icon"><AppNavIcon itemKey={item.key} /></span>
        <span className="sidebar-label">{item.label}</span>
        <span className="sidebar-link-chevron-spacer" aria-hidden="true" />
      </NavLink>
    );
  }

  return (
    <div className={`app-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${isPosRoute && isPosChromeHidden ? 'app-layout-pos-focus' : ''}`.trim()}>
      {!isPosRoute || !isPosChromeHidden ? (
        <>
          <aside ref={sidebarRef} className={`sidebar-fixed ${isMobileSidebarOpen ? 'is-mobile-open' : ''}`.trim()}>
            <div className="brand">
              <div className="brand-copy">
                <div className="brand-title" title={cleanWorkspaceName}>{formatWorkspaceName(cleanWorkspaceName)}</div>
                <div 
                  className="brand-sub-interactive" 
                  onClick={() => setIsAboutModalOpen(true)}
                  title="About Z System's & Tech Support"
                >
                  <span className="brand-powered-label">Powered by</span>
                  <span className="brand-powered-name">
                    Z System's
                  </span>
                </div>
              </div>
              <div 
                className="brand-logo" 
                onClick={() => navigate('/')} 
                style={{ cursor: 'pointer' }}
              >
                <img 
                  src="./brand/z-erp-approved-icon.png" 
                  alt="Z-ERP" 
                  className="brand-logo-img"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.dataset.failed) {
                      img.dataset.failed = '1';
                      img.src = '/brand/z-erp-approved-icon.png';
                    }
                  }}
                />
              </div>
            </div>

          {/* Centered Expandable Search Micro-Interaction */}
          <div ref={sidebarSearchWrapperRef} className="sidebar-search-wrapper">
            <div 
              className={`sidebar-search-pill ${isSidebarSearchOpen ? 'is-expanded' : ''}`}
              onClick={() => {
                if (!isSidebarSearchOpen) handleOpenSidebarSearch();
              }}
            >
              <button 
                type="button" 
                className="sidebar-search-icon-btn" 
                data-tooltip={isSidebarCollapsed ? "البحث السريع (Ctrl + K)" : undefined}
                title={isSidebarSearchOpen ? 'بحث' : (isSidebarCollapsed ? undefined : 'بحث سريع في القوائم والتابات')}
                onClick={(e) => {
                  if (!isSidebarSearchOpen) {
                    e.stopPropagation();
                    handleOpenSidebarSearch();
                  }
                }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </button>
              {isSidebarSearchOpen ? (
                <>
                  <input
                    ref={sidebarSearchInputRef}
                    type="text"
                    className="sidebar-search-input"
                    placeholder="ابحث في التابات والقوائم..."
                    value={sidebarSearchQuery}
                    onChange={(e) => setSidebarSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        handleCloseSidebarSearch();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="sidebar-search-close-btn"
                    title="إغلاق البحث"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (sidebarSearchQuery) {
                        setSidebarSearchQuery('');
                        sidebarSearchInputRef.current?.focus();
                      } else {
                        handleCloseSidebarSearch();
                      }
                    }}
                  >
                    ✕
                  </button>
                </>
              ) : null}
            </div>
          </div>

          <nav className="sidebar-nav">
            {filteredPrimaryNavigationItems.map((item) => renderNavItem(item, 'primary'))}
            {filteredSidebarGroups.map(({ group, groupItems, isActive, isOpen }) => {
              const groupIconItemKey = group.iconKey || groupItems[0]?.key || 'settings';
              const tone = iconToneMap[groupIconItemKey] || iconToneMap.settings;
              const toneStyle = { '--icon-bg': tone.bg, '--icon-border': tone.border, '--icon-fg': tone.fg, '--icon-glow': tone.glow } as CSSProperties;
              return (
                <div key={group.key} className={`sidebar-group ${isActive ? 'is-active' : ''} ${isOpen ? 'is-open' : ''}`.trim()}>
                  <div 
                    className="sidebar-group-trigger" 
                    style={toneStyle}
                    data-tooltip={isSidebarCollapsed ? group.label : undefined}
                    onClick={() => {
                      if (isSidebarCollapsed) toggleSidebar();
                    }}
                    role={isSidebarCollapsed ? 'button' : undefined}
                    tabIndex={isSidebarCollapsed ? 0 : undefined}
                  >
                    <span className="sidebar-group-icon" aria-hidden="true"><AppNavIcon itemKey={groupIconItemKey} /></span>
                    <span className="sidebar-label">{group.label}</span>
                  </div>
                  {isOpen ? <div className="sidebar-group-items">{groupItems.map((item) => renderNavItem(item, 'group'))}</div> : null}
                </div>
              );
            })}
            {isSearchingSidebar && totalMatchingItemsCount === 0 ? (
              <div className="sidebar-search-empty-state">
                <span className="sidebar-search-empty-state-icon"><SearchIcon size={24} color="#94a3b8" /></span>
                <p className="sidebar-search-empty-state-text">لا توجد قوائم تطابق "{sidebarSearchQuery}"</p>
              </div>
            ) : null}
          </nav>
          <div className="sidebar-footer">
            <div className="sidebar-footer-info" style={{ marginBottom: 5 }}>
              <div className="muted small" style={{ lineHeight: 1.2 }}>{t("sidebar.welcome_msg")} {displayName}</div>
              <div className="muted small" style={{ opacity: 0.7, marginTop: 2, fontSize: '0.73rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                الإصدار الحالي: {typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'}
                {updateInfo?.updateAvailable && (
                  <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: 'var(--color-warning)', flexShrink: 0 }} title="تحديث جديد متاح" />
                )}
              </div>
            </div>
            <div className="sidebar-footer-actions">
              <Button variant="danger" onClick={handleLogout} className="sidebar-logout-btn" data-tooltip={isSidebarCollapsed ? t("sidebar.logout") : undefined}>
                <span className="btn-label">{t("sidebar.logout")}</span>
                <span className="btn-icon">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                </span>
              </Button>
              <button type="button" onClick={toggleSidebar} className="sidebar-toggle-btn" data-tooltip={isSidebarCollapsed ? t("sidebar.expand_menu") : undefined}>
                {isSidebarCollapsed ? (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                )}
              </button>
            </div>
          </div>
        </aside>
        <div 
          className={`sidebar-mobile-overlay ${isMobileSidebarOpen ? 'is-active' : ''}`.trim()} 
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
        </>
      ) : null}
      <div className="main-col">
        {!isPosRoute && <GlobalAppToolbar />}
        <div className={`content-wrap ${isPosRoute && isPosChromeHidden ? 'content-wrap-pos-focus' : ''}`.trim()}>
          <div className="stack gap-12" style={{ padding: '12px 16px 0' }}>
            <ImpersonationBanner />
            <BootstrapAdminBanner />
            <TrialStatusBanner />
            <SystemStatusBanner />
          </div>
          <main className={`page-stack ${isPosRoute && isPosChromeHidden ? 'page-stack-pos-focus' : ''}`.trim()}>{children}</main>
        </div>
      </div>
      <AppCloseGuard />
      <PasswordRotationGate />
      <QuickAttendanceShortcut open={quickAttendanceOpen} onClose={() => setQuickAttendanceOpen(false)} />
      <GlobalSearchModal />
      <DeveloperActivationPanel />
      {isAboutModalOpen && (
        <DialogShell
          open={true}
          onClose={() => setIsAboutModalOpen(false)}
          width="460px"
        >
          <div style={{ textAlign: 'center', padding: '28px 24px 20px 24px' }}>
            <div style={{
              width: '84px',
              height: '84px',
              margin: '0 auto 14px auto',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 25px rgba(15, 23, 42, 0.2)',
              padding: '10px'
            }}>
              <img 
                src="./brand/z-erp-approved-icon.png" 
                alt="Z Systems" 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            
            <h2 style={{ margin: '0 0 4px 0', fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
              Z Systems ERP
            </h2>
            <p style={{ margin: '0 0 14px 0', fontSize: '12.5px', color: '#64748b' }}>
              منظومة إدارة المبيعات، المخازن، الحسابات، ونقاط البيع
            </p>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 14px',
              borderRadius: '20px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
              fontWeight: 700,
              color: '#334155',
              marginBottom: '18px'
            }}>
              <span>الإصدار:</span>
              <span style={{ color: '#2563eb' }}>v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.1.14'}</span>
              <span style={{ color: '#10b981' }}>● نسخة مفعلة</span>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px 16px',
              textAlign: 'right',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '12.5px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>المؤسسة:</span>
                <strong style={{ color: '#0f172a' }}>{cleanWorkspaceName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>المستخدم النشط:</span>
                <strong style={{ color: '#0f172a' }}>{displayName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>حالة الربط والبيانات:</span>
                <span style={{ color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircleIcon size={14} color="#059669" /> متصل ومؤمّن
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                type="button"
                onClick={() => {
                  window.open('https://wa.me/201018017523', '_blank');
                }}
                style={{ 
                  flex: 1, 
                  padding: '10px 16px', 
                  fontSize: '13px',
                  fontWeight: 700,
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.2)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1e1b4b')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0f172a')}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="#25D366">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 7.04C9.36 7.04 9.09 7.11 8.87 7.34C8.64 7.58 8 8.18 8 9.4C8 10.62 8.89 11.8 9.01 11.96C9.14 12.12 10.76 14.62 13.23 15.69C13.82 15.94 14.28 16.09 14.64 16.21C15.23 16.4 15.77 16.37 16.2 16.31C16.68 16.24 17.68 15.7 17.89 15.12C18.09 14.54 18.09 14.04 18.03 13.94C17.97 13.84 17.81 13.78 17.56 13.66C17.31 13.53 16.09 12.93 15.86 12.85C15.63 12.77 15.47 12.73 15.3 12.97C15.13 13.22 14.65 13.78 14.51 13.94C14.36 14.11 14.22 14.13 13.97 14C13.72 13.88 12.92 13.62 11.97 12.77C11.23 12.11 10.73 11.29 10.59 11.04C10.44 10.79 10.57 10.66 10.7 10.53C10.81 10.42 10.95 10.24 11.07 10.1C11.19 9.96 11.23 9.85 11.31 9.69C11.39 9.53 11.35 9.39 11.29 9.27C11.23 9.15 10.73 7.93 10.53 7.43C10.33 6.95 10.13 7.01 9.97 7C9.83 7 9.67 7.04 9.53 7.04Z"/>
                </svg>
                الدعم الفني عبر واتساب
              </button>
              <Button 
                variant="secondary" 
                onClick={() => setIsAboutModalOpen(false)}
                style={{ padding: '10px 20px', fontSize: '13px' }}
              >
                إغلاق
              </Button>
            </div>
          </div>
        </DialogShell>
      )}
    </div>
  );
}
