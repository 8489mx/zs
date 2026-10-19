import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { WarehouseIcon, NetworkIcon, LayersIcon } from '@/shared/components/icons/AppIcons';
import { prefetchRouteData } from '@/app/router/route-prefetch';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';

export type WarehouseTabKey = 'grid' | 'tree' | 'bins';

interface WarehousesNavTabsProps {
  currentTab: WarehouseTabKey;
}

export function WarehousesNavTabs({ currentTab }: WarehousesNavTabsProps) {
  const { t } = useTranslation();

  const settingsQuery = useSettingsQuery();
  const showBins = (settingsQuery.data as { enableWarehouseBins?: boolean } | undefined)?.enableWarehouseBins === true;

  const allTabs: Array<{
    key: WarehouseTabKey;
    to: string;
    label: string;
    subtitle: string;
    icon: React.ReactNode;
  }> = [
    {
      key: 'grid',
      to: '/inventory/warehouses',
      label: t('inventory.warehouses_nav.grid', 'المستودعات والفروع'),
      subtitle: t('inventory.warehouses_nav.grid_sub', 'دليل الأماكن والأرصدة'),
      icon: <WarehouseIcon size={18} />,
    },
    {
      key: 'tree',
      to: '/inventory/tree',
      label: t('inventory.warehouses_nav.tree', 'شجرة المخازن الشاملة'),
      subtitle: t('inventory.warehouses_nav.tree_sub', 'الهيكل التوزيعي للأصناف'),
      icon: <NetworkIcon size={18} />,
    },
    ...(showBins ? [{
      key: 'bins' as const,
      to: '/inventory/bins',
      label: t('inventory.warehouses_nav.bins', 'الأرفف وأماكن التخزين'),
      subtitle: t('inventory.warehouses_nav.bins_sub', 'الممرات والرصيف والباركود'),
      icon: <LayersIcon size={18} />,
    }] : []),
  ];

  const tabs = allTabs;

  return (
    <div
      className="warehouses-nav-tabs"
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
        const isActive = currentTab === tab.key;
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
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: isActive ? '#170e5e' : '#334155',
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {tab.label}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: isActive ? '#4338ca' : '#94a3b8',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
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
