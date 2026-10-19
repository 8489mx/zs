import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ClipboardIcon, FileTextIcon, PackageIcon, BuildingIcon, SettingsIcon } from '@/shared/components/icons/AppIcons';
import { prefetchRouteData } from '@/app/router/route-prefetch';

export function ManufacturingNavTabs() {
  const { t } = useTranslation();
  const location = useLocation();
  const currentPath = location.pathname;

  const tabs: Array<{
    key: string;
    to: string;
    matchPrefix: string;
    label: string;
    subtitle: string;
    icon: React.ReactNode;
  }> = [
    {
      key: 'work-orders',
      to: '/manufacturing/work-orders',
      matchPrefix: '/manufacturing/work-orders',
      label: t('manufacturing.nav.work_orders', 'أوامر الإنتاج والتصنيع'),
      subtitle: t('manufacturing.nav.work_orders_sub', 'التشغيل والتجميع والفك'),
      icon: <ClipboardIcon size={18} />,
    },
    {
      key: 'boms',
      to: '/manufacturing/boms',
      matchPrefix: '/manufacturing/boms',
      label: t('manufacturing.nav.boms', 'قوائم المواد (BOM)'),
      subtitle: t('manufacturing.nav.boms_sub', 'التركيبات والمعادلات القياسية'),
      icon: <FileTextIcon size={18} />,
    },
    {
      key: 'components',
      to: '/manufacturing/components',
      matchPrefix: '/manufacturing/components',
      label: t('manufacturing.nav.components', 'المكونات والخامات'),
      subtitle: t('manufacturing.nav.components_sub', 'المواد الأولية ونسب الهالك'),
      icon: <PackageIcon size={18} />,
    },
    {
      key: 'work-centers',
      to: '/manufacturing/work-centers',
      matchPrefix: '/manufacturing/work-centers',
      label: t('manufacturing.nav.work_centers', 'مراكز العمل والماكينات'),
      subtitle: t('manufacturing.nav.work_centers_sub', 'خطوط الإنتاج وتكلفة الساعة'),
      icon: <BuildingIcon size={18} />,
    },
    {
      key: 'settings',
      to: '/manufacturing/settings',
      matchPrefix: '/manufacturing/settings',
      label: t('manufacturing.nav.settings', 'إعدادات التصنيع'),
      subtitle: t('manufacturing.nav.settings_sub', 'الحسابات وسلوك الصرف'),
      icon: <SettingsIcon size={18} />,
    },
  ];

  return (
    <div
      className="manufacturing-nav-tabs"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px',
        padding: '6px',
        background: '#f1f5f9',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
      }}
    >
      {tabs.map((tab) => {
        const isActive = currentPath.startsWith(tab.matchPrefix);
        return (
          <NavLink
            key={tab.key}
            to={tab.to}
            onMouseEnter={() => prefetchRouteData(tab.to)}
            onTouchStart={() => prefetchRouteData(tab.to)}
            style={{
              flex: '1 1 0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 14px',
              borderRadius: '8px',
              textDecoration: 'none',
              background: isActive ? '#ffffff' : 'transparent',
              color: isActive ? '#170e5e' : '#64748b',
              boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)' : 'none',
              border: isActive ? '1px solid #cbd5e1' : '1px solid transparent',
              cursor: 'pointer',
              boxSizing: 'border-box',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: isActive ? '#eef2ff' : '#f8fafc',
                color: isActive ? '#170e5e' : '#94a3b8',
                flexShrink: 0,
              }}
            >
              {tab.icon}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
              <span
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: isActive ? '#170e5e' : '#334155',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: 1.3,
                }}
              >
                {tab.label}
              </span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 500,
                  color: isActive ? '#4338ca' : '#94a3b8',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: 1.2,
                }}
              >
                {tab.subtitle}
              </span>
            </div>
          </NavLink>
        );
      })}
    </div>
  );
}
