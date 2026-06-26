import { useNavigate } from 'react-router-dom';
import { AppAccountMenu } from '@/shared/layout/app-account-menu';
import { useToolbarStore } from '@/stores/toolbar-store';
import { Fragment } from 'react';

import { ManagerNotificationsBell } from '@/features/dashboard/components/ManagerNotificationsBell';

export function GlobalAppToolbar() {
  const navigate = useNavigate();
  const { breadcrumbs, toggleMobileSidebar, setGlobalSearchOpen } = useToolbarStore();

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
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
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
          <div className="purchase-prototype-search-container" role="search">
            <button className="purchase-prototype-search" onClick={() => setGlobalSearchOpen(true)} aria-label="بحث شامل">
              <span aria-hidden="true">⌕</span>
              <span style={{ flex: 1, textAlign: 'right', color: 'var(--text-muted)' }}>ابحث في أي مكان...</span>
              <div className="purchase-prototype-search-shortcut" dir="ltr">
                <kbd>Ctrl</kbd> + <kbd>/</kbd>
              </div>
            </button>
          </div>
          <ManagerNotificationsBell />
          <AppAccountMenu />
        </div>
      </div>
    </div>
  );
}
