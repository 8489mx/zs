import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useToolbarStore } from '@/stores/toolbar-store';
import { MobileQuickActionSheet } from '@/shared/layout/MobileQuickActionSheet';

export function MobileBottomNav() {
  const location = useLocation();
  const { toggleMobileSidebar, isMobileSidebarOpen } = useToolbarStore();
  const [quickActionOpen, setQuickActionOpen] = useState(false);

  // Check active routes
  const isPos = location.pathname.startsWith('/pos');
  const isSales = location.pathname.startsWith('/sales') || location.pathname.startsWith('/returns');
  const isHome = location.pathname === '/';

  return (
    <>
      <nav className="mobile-bottom-nav" aria-label="شريط التنقل السفلي">
        <NavLink
          to="/"
          end
          className={`mobile-bottom-nav-item ${isHome && !isMobileSidebarOpen ? 'is-active' : ''}`}
        >
          <div className="mobile-bottom-nav-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
          <span className="mobile-bottom-nav-label">الرئيسية</span>
        </NavLink>

        <NavLink
          to="/sales"
          className={`mobile-bottom-nav-item ${isSales && !isMobileSidebarOpen ? 'is-active' : ''}`}
        >
          <div className="mobile-bottom-nav-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <span className="mobile-bottom-nav-label">الفواتير</span>
        </NavLink>

        {/* Center Prominent Quick Action Button */}
        <button
          type="button"
          className="mobile-bottom-nav-action-btn"
          onClick={() => setQuickActionOpen(true)}
          aria-label="إجراء سريع"
        >
          <div className="mobile-bottom-nav-action-icon">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </div>
          <span className="mobile-bottom-nav-label-center">إجراء سريع</span>
        </button>

        <NavLink
          to="/pos"
          className={`mobile-bottom-nav-item mobile-bottom-nav-pos ${isPos && !isMobileSidebarOpen ? 'is-active' : ''}`}
        >
          <div className="mobile-bottom-nav-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <span className="mobile-bottom-nav-label">نقطة البيع</span>
        </NavLink>

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
