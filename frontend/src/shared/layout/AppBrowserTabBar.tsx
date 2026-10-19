import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTabsStore, normalizeAppPath, type AppBrowserTab } from '@/stores/tabs-store';
import { navigationItems } from '@/app/router/registry';
import { resolveAutoBreadcrumbs } from '@/shared/layout/breadcrumbs.helper';
import { AppNavIcon } from '@/shared/layout/nav-icons';
import { PlusIcon, XIcon } from '@/shared/components/icons/AppIcons';
import { SidebarContextMenu, type ContextMenuTarget } from '@/shared/layout/SidebarContextMenu';
import { toast } from '@/shared/components/system-alert';
import { useTranslation } from 'react-i18next';

export function resolveRouteMetadata(pathname: string): { title: string; iconKey: string } {
  const cleanPath = normalizeAppPath(pathname);

  // If dashboard / root
  if (cleanPath === '/dashboard') {
    return {
      title: 'الرئيسية',
      iconKey: 'dashboard',
    };
  }

  // 1. Direct match in registry navigation items (exact match takes precedence over activePaths fallback)
  const exactMatch = navigationItems.find((item) => {
    const itemNorm = normalizeAppPath(item.to);
    return itemNorm === cleanPath || itemNorm.split('?')[0] === cleanPath.split('?')[0];
  });
  const directMatch = exactMatch || navigationItems.find((item) => {
    return item.activePaths?.some((p) => normalizeAppPath(p) === cleanPath);
  });

  if (directMatch) {
    return {
      title: directMatch.label,
      iconKey: directMatch.key,
    };
  }

  // 2. Resolve via automated breadcrumbs
  const crumbs = resolveAutoBreadcrumbs(pathname, []);
  if (crumbs && crumbs.length > 0) {
    const lastCrumb = crumbs[crumbs.length - 1];
    const rootSegment = cleanPath.replace(/^\//, '').split('/')[0] || 'dashboard';
    return {
      title: lastCrumb.label || 'صفحة',
      iconKey: rootSegment,
    };
  }

  return {
    title: 'الرئيسية',
    iconKey: 'dashboard',
  };
}

export function openExternalWindow(routePath: string) {
  try {
    const electronRuntime = (window as any).electronRuntime;
    const electronAPI = (window as any).electronAPI;

    if (electronRuntime?.openNewWindow) {
      electronRuntime.openNewWindow(routePath);
      return;
    }
    if (electronAPI?.openNewWindow) {
      electronAPI.openNewWindow(routePath);
      return;
    }

    const isElectron = Boolean(electronAPI) || window.navigator.userAgent.toLowerCase().includes('electron');
    const targetUrl = isElectron
      ? `${window.location.origin}${window.location.pathname}#${routePath.replace(/^#?\/?/, '/')}`
      : routePath;

    window.open(targetUrl, '_blank', 'width=1280,height=800,menubar=no,toolbar=no');
  } catch (e) {
    window.open(routePath, '_blank');
  }
}

export function AppBrowserTabBar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();

  const { tabs, activeTabId, closeTab, closeOtherTabs, setActiveTabId, openTab } = useTabsStore();

  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    target: ContextMenuTarget | null;
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    target: null,
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Keep active tab visible in horizontal scroll view
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const activeEl = scrollContainerRef.current.querySelector('[data-active="true"]') as HTMLElement | null;
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [activeTabId]);

  const handleTabClick = (tab: AppBrowserTab) => {
    if (tab.id !== activeTabId) {
      setActiveTabId(tab.id);
      navigate(tab.path);
    }
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const nextPath = closeTab(tabId);
    if (nextPath) {
      navigate(nextPath);
    }
  };

  const handleTabAuxClick = (e: React.MouseEvent, tabId: string) => {
    // Middle-click closes tab (standard browser behavior)
    if (e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
      const nextPath = closeTab(tabId);
      if (nextPath) {
        navigate(nextPath);
      }
    }
  };

  const handleTabContextMenu = (e: React.MouseEvent, tab: AppBrowserTab) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      target: {
        path: tab.path,
        label: tab.title,
        iconKey: tab.iconKey,
        tabId: tab.id,
      },
    });
  };

  const handleNewTab = () => {
    const { id } = openTab({
      path: '/dashboard',
      title: 'الرئيسية',
      iconKey: 'dashboard',
      makeActive: true,
    });
    setActiveTabId(id);
    navigate('/dashboard');
  };

  const handleOpenInNewWindow = (target: ContextMenuTarget) => {
    openExternalWindow(target.path);
    toast.info('تم فتح الصفحة في نافذة مستقلة');
  };

  const handleCopyLink = (target: ContextMenuTarget) => {
    try {
      const fullUrl = `${window.location.origin}${window.location.pathname}#${target.path.replace(/^#?\/?/, '/')}`;
      navigator.clipboard.writeText(fullUrl);
      toast.success('تم نسخ رابط الصفحة إلى الحافظة');
    } catch (_) {
      toast.error('تعذر نسخ الرابط');
    }
  };

  const handleReloadTab = () => {
    queryClient.invalidateQueries();
    toast.info('تم تحديث بيانات التبويب');
  };

  if (tabs.length <= 1) {
    return null;
  }

  return (
    <>
      <div
        className="app-browser-tabs-header-wrap"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          flexWrap: 'nowrap',
          minWidth: 0,
          flex: '1 1 auto',
          overflow: 'hidden',
          height: '100%',
          userSelect: 'none',
          direction: i18n.dir() === 'rtl' ? 'rtl' : 'ltr',
        }}
      >
        <div
          ref={scrollContainerRef}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollbarWidth: 'none',
            flex: '1 1 auto',
            minWidth: 0,
            height: '100%',
            padding: '2px 0',
          }}
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                data-active={isActive ? 'true' : 'false'}
                data-tab-id={tab.id}
                onClick={() => handleTabClick(tab)}
                onAuxClick={(e) => handleTabAuxClick(e, tab.id)}
                onContextMenu={(e) => handleTabContextMenu(e, tab)}
                title={`${t(tab.title, tab.title)} (${tab.path})`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 8px 0 10px',
                  height: '30px',
                  minWidth: '95px',
                  maxWidth: '185px',
                  backgroundColor: isActive ? '#f1f5f9' : 'transparent',
                  color: isActive ? '#170e5e' : '#64748b',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: isActive ? '#cbd5e1' : 'transparent',
                  borderBottom: isActive ? '2px solid #170e5e' : '1px solid transparent',
                  boxShadow: isActive ? '0 1px 2px rgba(15, 23, 42, 0.05)' : 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  flexShrink: 0,
                  position: 'relative',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.color = '#0f172a';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.color = '#64748b';
                  }
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    color: isActive ? '#170e5e' : '#64748b',
                    flexShrink: 0,
                  }}
                >
                  <AppNavIcon itemKey={tab.iconKey || 'dashboard'} size={14} />
                </span>

                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                    flex: '1 1 auto',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  {t(tab.title, tab.title)}
                </span>

                <button
                  type="button"
                  aria-label={`${t('common.close', 'إغلاق')} ${t(tab.title, tab.title)}`}
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    border: 'none',
                    background: 'transparent',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: 0,
                    flexShrink: 0,
                    marginInlineStart: '2px',
                    transition: 'background-color 0.12s ease, color 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    e.currentTarget.style.backgroundColor = '#fee2e2';
                    e.currentTarget.style.color = '#ef4444';
                  }}
                  onMouseLeave={(e) => {
                    e.stopPropagation();
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#94a3b8';
                  }}
                >
                  <XIcon size={12} strokeWidth={2.6} />
                </button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={handleNewTab}
            title={t('tabs.new_tab', 'فتح تبويب جديد')}
            aria-label={t('tabs.new_tab', 'فتح تبويب جديد')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              border: '1px dashed #cbd5e1',
              background: 'transparent',
              color: '#64748b',
              cursor: 'pointer',
              flexShrink: 0,
              marginInlineStart: '2px',
              transition: 'all 0.12s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.borderColor = '#94a3b8';
              e.currentTarget.style.color = '#170e5e';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <PlusIcon size={13} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      <SidebarContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        target={contextMenu.target}
        mode="tab"
        onClose={() => setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, target: null })}
        onOpenInNewWindow={handleOpenInNewWindow}
        onCopyLink={handleCopyLink}
        onReloadTab={handleReloadTab}
        onCloseTab={(tabId) => {
          const nextPath = closeTab(tabId);
          if (nextPath) navigate(nextPath);
        }}
        onCloseOtherTabs={(tabId) => {
          closeOtherTabs(tabId);
        }}
      />
    </>
  );
}
