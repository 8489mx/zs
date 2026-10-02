import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useToolbarStore } from '@/stores/toolbar-store';
import { useAuthStore } from '@/stores/auth-store';
import { MobileQuickActionSheet } from '@/shared/layout/MobileQuickActionSheet';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import {
  resolveCurrentVertical,
  getMobileBottomNavConfig,
  type MobileNavItemConfig,
} from '@/shared/verticals/vertical-scope';

function renderBottomNavIcon(iconType: MobileNavItemConfig['iconType']) {
  switch (iconType) {
    case 'home':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      );

    case 'maritime-jobs':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 17l2 4h16l2-4H2z" />
          <path d="M12 3v10M8 8l4-4 4 4" />
          <path d="M4 17c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" />
        </svg>
      );

    case 'contracting-projects':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
        </svg>
      );

    case 'contracting-invoices':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      );

    case 'van-sales':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="3" width="15" height="13" rx="2" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      );

    case 'manufacturing-orders':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      );

    case 'pos':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
      );

    case 'inventory':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
      );

    case 'sales':
    default:
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      );
  }
}

export function MobileBottomNav() {
  const location = useLocation();
  const { toggleMobileSidebar, isMobileSidebarOpen } = useToolbarStore();
  const tenant = useAuthStore((state) => state.tenant);
  const { data: settings } = useSettingsQuery();
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollY = useRef(0);

  // Dynamic Vertical Resolution & Configuration
  const currentVertical = resolveCurrentVertical(tenant, settings);
  const navConfig = getMobileBottomNavConfig(currentVertical, settings);

  useEffect(() => {
    const getContentScrollY = () => {
      const contentWrap = document.querySelector('.content-wrap');
      return window.scrollY || document.documentElement.scrollTop || contentWrap?.scrollTop || 0;
    };

    const handleScroll = () => {
      const currentScrollY = getContentScrollY();
      const diff = currentScrollY - lastScrollY.current;

      // Always show near the top of the page
      if (currentScrollY < 40) {
        setIsHidden(false);
        lastScrollY.current = currentScrollY;
        return;
      }

      // Check if near bottom of document
      const contentWrap = document.querySelector('.content-wrap');
      const windowHeight = window.innerHeight;
      const docHeight = contentWrap?.scrollHeight || document.documentElement.scrollHeight;
      if (currentScrollY + windowHeight >= docHeight - 40) {
        setIsHidden(false);
        lastScrollY.current = currentScrollY;
        return;
      }

      // Scroll Down -> Hide
      if (diff > 12) {
        setIsHidden(true);
      } 
      // Scroll Up -> Show
      else if (diff < -8) {
        setIsHidden(false);
      }

      lastScrollY.current = currentScrollY;
    };

    const contentWrap = document.querySelector('.content-wrap');
    window.addEventListener('scroll', handleScroll, { passive: true });
    contentWrap?.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      contentWrap?.removeEventListener('scroll', handleScroll);
    };
  }, [location.pathname]);

  // When location changes or quick action opens, make sure nav is visible
  useEffect(() => {
    setIsHidden(false);
  }, [location.pathname, quickActionOpen]);

  const isHomeActive = location.pathname === '/' || location.pathname === '/dashboard';
  const isSecondaryActive = navConfig.secondary.activeMatchPrefixes.some((p) =>
    p === '/' ? location.pathname === '/' : location.pathname.startsWith(p)
  );
  const isPrimaryActive = navConfig.primary.activeMatchPrefixes.some((p) =>
    p === '/' ? location.pathname === '/' : location.pathname.startsWith(p)
  );

  return (
    <>
      <nav 
        className={`mobile-bottom-nav ${isHidden ? 'is-hidden' : ''}`} 
        aria-label="شريط التنقل السفلي"
      >
        {/* 1. Home */}
        <NavLink
          to={navConfig.home.to}
          end
          className={`mobile-bottom-nav-item ${isHomeActive && !isMobileSidebarOpen ? 'is-active' : ''}`}
        >
          <div className="mobile-bottom-nav-icon">
            {renderBottomNavIcon(navConfig.home.iconType)}
          </div>
          <span className="mobile-bottom-nav-label">{navConfig.home.label}</span>
        </NavLink>

        {/* 2. Secondary Tab (e.g. Sales, Projects, Work Orders) */}
        <NavLink
          to={navConfig.secondary.to}
          className={`mobile-bottom-nav-item ${isSecondaryActive && !isMobileSidebarOpen ? 'is-active' : ''}`}
        >
          <div className="mobile-bottom-nav-icon">
            {renderBottomNavIcon(navConfig.secondary.iconType)}
          </div>
          <span className="mobile-bottom-nav-label">{navConfig.secondary.label}</span>
        </NavLink>

        {/* 3. Center Prominent Quick Action Button */}
        <button
          type="button"
          className="mobile-bottom-nav-action-btn"
          onClick={() => setQuickActionOpen(true)}
          aria-label={navConfig.centerActionLabel}
        >
          <div className="mobile-bottom-nav-action-icon">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </div>
          <span className="mobile-bottom-nav-label-center">{navConfig.centerActionLabel}</span>
        </button>

        {/* 4. Primary Vertical Highlight Tab (e.g. Jobs/Shipments, Invoices/IPCs, POS, Van Sales) */}
        <NavLink
          to={navConfig.primary.to}
          className={`mobile-bottom-nav-item ${isPrimaryActive && !isMobileSidebarOpen ? 'is-active' : ''}`}
        >
          <div className="mobile-bottom-nav-icon">
            {renderBottomNavIcon(navConfig.primary.iconType)}
          </div>
          <span className="mobile-bottom-nav-label">{navConfig.primary.label}</span>
        </NavLink>

        {/* 5. Menu Drawer */}
        <button
          type="button"
          className={`mobile-bottom-nav-item ${isMobileSidebarOpen ? 'is-active' : ''}`}
          onClick={toggleMobileSidebar}
          aria-label="القائمة الجانبية"
        >
          <div className="mobile-bottom-nav-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </div>
          <span className="mobile-bottom-nav-label">القائمة</span>
        </button>
      </nav>

      <MobileQuickActionSheet
        isOpen={quickActionOpen}
        onClose={() => setQuickActionOpen(false)}
      />
    </>
  );
}
