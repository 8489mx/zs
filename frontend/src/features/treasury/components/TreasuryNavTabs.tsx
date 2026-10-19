import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ReceiptIcon, CreditCardIcon, BuildingIcon, FileTextIcon } from '@/shared/components/icons/AppIcons';
import { prefetchRouteData } from '@/app/router/route-prefetch';

export type TreasuryTabKey = 'treasury' | 'cheques' | 'reconciliation' | 'expenses';

interface TreasuryNavTabsProps {
  currentTab: TreasuryTabKey;
}

export function TreasuryNavTabs({ currentTab }: TreasuryNavTabsProps) {
  const { t } = useTranslation();

  const tabs: Array<{
    key: TreasuryTabKey;
    to: string;
    label: string;
    subtitle: string;
    icon: React.ReactNode;
  }> = [
    {
      key: 'treasury',
      to: '/treasury',
      label: t('treasury.nav.treasury', 'الخزينة والنقدية'),
      subtitle: t('treasury.nav.treasury_sub', 'سجل الحركات والأرصدة'),
      icon: <ReceiptIcon size={18} />,
    },
    {
      key: 'cheques',
      to: '/accounting/cheques',
      label: t('treasury.nav.cheques', 'حافظة الشيكات (PDC)'),
      subtitle: t('treasury.nav.cheques_sub', 'أوراق القبض والدفع'),
      icon: <CreditCardIcon size={18} />,
    },
    {
      key: 'reconciliation',
      to: '/accounting/bank-reconciliation',
      label: t('treasury.nav.reconciliation', 'التسويات البنكية'),
      subtitle: t('treasury.nav.reconciliation_sub', 'مطابقة كشوف الحساب'),
      icon: <BuildingIcon size={18} />,
    },
    {
      key: 'expenses',
      to: '/expenses',
      label: t('treasury.nav.expenses', 'المصروفات النثرية'),
      subtitle: t('treasury.nav.expenses_sub', 'سندات الصرف والبنود'),
      icon: <FileTextIcon size={18} />,
    },
  ];

  return (
    <div
      className="treasury-nav-tabs"
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
