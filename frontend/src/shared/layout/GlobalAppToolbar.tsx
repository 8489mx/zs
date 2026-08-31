import { useNavigate, useLocation } from 'react-router-dom';
import { AppAccountMenu } from '@/shared/layout/app-account-menu';
import { useToolbarStore } from '@/stores/toolbar-store';
import { Fragment } from 'react';
import { ManagerNotificationsBell } from '@/features/dashboard/components/ManagerNotificationsBell';
import { useOfflineUpdateCheck } from '@/shared/hooks/use-offline-update-check';
import { resolveAutoBreadcrumbs } from '@/shared/layout/breadcrumbs.helper';
import { FullScreenToggleButton } from '@/shared/components/FullScreenToggleButton';

export function GlobalAppToolbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { breadcrumbs, toggleMobileSidebar, setGlobalSearchOpen } = useToolbarStore();
  const { data: updateInfo } = useOfflineUpdateCheck('desktop');

  const activeBreadcrumbs = resolveAutoBreadcrumbs(location.pathname, breadcrumbs);

  return (
    <div className="purchase-prototype-workspace-toolbar">
      <div className="purchase-prototype-toolbar-inner">
        <button 
          type="button" 
          className="mobile-sidebar-toggle" 
          onClick={toggleMobileSidebar}
          aria-label="Toggle Menu"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div className="purchase-prototype-breadcrumb">
          {activeBreadcrumbs.map((crumb, index) => {
            const isLast = index === activeBreadcrumbs.length - 1;
            return (
              <Fragment key={index}>
                {isLast ? (
                  <strong>{crumb.label}</strong>
                ) : (
                  <>
                    <span 
                      style={{ cursor: crumb.to ? 'pointer' : 'default', color: crumb.to ? '#64748b' : 'inherit' }} 
                      onClick={() => crumb.to && navigate(crumb.to)}
                    >
                      {crumb.label}
                    </span>
                    <span>›</span>
                  </>
                )}
              </Fragment>
            );
          })}
        </div>

        <div className="purchase-prototype-toolbar-actions">
          {updateInfo?.updateAvailable && updateInfo.latestVersion && (
            <button
              type="button"
              className="system-update-toolbar-alert"
              onClick={() => navigate('/settings/system-updates')}
              title={`يتوفر تحديث جديد للمنظومة (v${updateInfo.latestVersion}) — اضغط للترقية`}
            >
              <span className="system-update-pulse-dot" />
              <span>تحديث متوفر: v{updateInfo.latestVersion}</span>
            </button>
          )}
          {/* Mobile compact search button */}
          <button
            type="button"
            className="mobile-search-icon-btn"
            onClick={() => setGlobalSearchOpen(true)}
            aria-label="بحث سريع"
            title="بحث شامل"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>

          <div className="purchase-prototype-search-container desktop-only-toolbar-item" role="search">
            <button className="purchase-prototype-search" onClick={() => setGlobalSearchOpen(true)} aria-label="بحث شامل">
              <span aria-hidden="true">⌕</span>
              <span style={{ flex: 1, textAlign: 'right', color: 'var(--text-muted)' }}>ابحث في أي مكان...</span>
              <div className="purchase-prototype-search-shortcut" dir="ltr">
                <kbd>Ctrl</kbd> + <kbd>/</kbd>
              </div>
            </button>
          </div>
          <button 
            type="button"
            className="desktop-only-toolbar-item"
            style={{ width: 36, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--surface-sunken)', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer', flexShrink: 0 }}
            title="تحديث البيانات (Refresh)"
            onClick={() => window.location.reload()}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
          <div className="desktop-only-toolbar-item">
            <FullScreenToggleButton />
          </div>
          <ManagerNotificationsBell />
          <AppAccountMenu />
        </div>
      </div>
    </div>
  );
}
