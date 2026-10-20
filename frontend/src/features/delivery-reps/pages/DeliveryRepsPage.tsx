import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { FormSection } from '@/shared/components/form-section';
import { UsersIcon, TruckIcon, SlidersIcon } from '@/shared/components/icons/AppIcons';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import { DeliveryRepsList } from '../components/DeliveryRepsList';
import { DeliveryRepOrders } from '../components/DeliveryRepOrders';
import { DeliveryRepSettlements } from '../components/DeliveryRepSettlements';
import { DeliveryRepPerformance } from '../components/DeliveryRepPerformance';
import { FleetVehiclesTab } from '../components/FleetVehiclesTab';
import { VanTripsTab } from '../components/VanTripsTab';

export default function DeliveryRepsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: settings } = useSettingsQuery();

  const isVanSalesActive = Boolean(
    settings?.vanSalesModuleEnabled === true ||
    (settings?.deliveryFleetModuleEnabled === true && (settings?.activityType === 'wholesale_van' || settings?.businessIndustry === 'wholesale_van'))
  );

  const rawTab = searchParams.get('tab');
  const mainTab = (rawTab === 'trips' && !isVanSalesActive)
    ? 'couriers'
    : ((rawTab as 'couriers' | 'fleet' | 'trips') || 'couriers');

  const [selectedRepId, setSelectedRepId] = useState<number | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'settlements' | 'performance'>('performance');

  const setMainTab = (tab: 'couriers' | 'fleet' | 'trips') => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('tab', tab);
      return p;
    });
  };

  const availableTabs = [
    {
      key: 'couriers' as const,
      label: t('delivery_reps.delivery_reps_page.s2', "مناديب التوصيل والدليفري"),
      subtitle: t('delivery_reps.delivery_reps_page.s3', "طلبات الدليفري والتسويات"),
      icon: <UsersIcon size={16} />,
    },
    {
      key: 'fleet' as const,
      label: t('delivery_reps.delivery_reps_page.s4', "مركبات وأسطول التوصيل"),
      subtitle: t('delivery_reps.delivery_reps_page.s5', "السيارات والدراجات وتعيين السائقين"),
      icon: <TruckIcon size={16} />,
    },
    ...(isVanSalesActive ? [
      {
        key: 'trips' as const,
        label: t('delivery_reps.delivery_reps_page.s6', "رحلات وورديات مبيعات الفان"),
        subtitle: t('delivery_reps.delivery_reps_page.s7', "المبيعات الميدانية، العداد، والكاش"),
        icon: <SlidersIcon size={16} />,
      }
    ] : []),
  ];

  return (
    <main
      dir="rtl"
      className="document-prototype-column"
      style={{
        maxWidth: '1280px',
        width: 'min(100%, 1280px)',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '16px 0',
      }}
    >
      <PageHeader 
        title={isVanSalesActive ? t('delivery_reps.delivery_reps_page.s0', "إدارة المناديب وأسطول التوزيع") : t('delivery_reps.delivery_reps_page.s0_retail', "إدارة مناديب التوصيل والدليفري")} 
        description={isVanSalesActive ? t('delivery_reps.delivery_reps_page.s1', "إدارة طياري الدليفري، أسطول سيارات الشركة، ورديات الفان، ومتابعة الطلبات والتوريدات المالية.") : t('delivery_reps.delivery_reps_page.s1_retail', "إدارة كباتن التوصيل، متابعة طلبات الدليفري المسندة، تسوية العهد النقدية، واحتساب العمولات.")} 
      />

      {/* Master Tabs Switcher (Zero Tab-Flicker Standard: uniform font-weight 600, 0ms transition) */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          background: '#ffffff',
          padding: '6px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        {availableTabs.map((tab) => {
          const isActive = mainTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setMainTab(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                border: isActive ? '1px solid #170e5e' : '1px solid transparent',
                background: isActive ? '#170e5e' : 'transparent',
                color: isActive ? '#ffffff' : '#475569',
                cursor: 'pointer',
                transition: 'none',
                boxSizing: 'border-box',
              }}
            >
              {tab.icon}
              <div style={{ textAlign: 'start' }}>
                <span style={{ display: 'block', lineHeight: 1.2 }}>{tab.label}</span>
                <span
                  style={{
                    fontSize: '10.5px',
                    color: isActive ? 'rgba(255,255,255,0.75)' : '#94a3b8',
                    display: 'block',
                    lineHeight: 1.2,
                    marginTop: '2px',
                  }}
                >
                  {tab.subtitle}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Delivery Couriers & Orders */}
      {mainTab === 'couriers' && (
        <div className="two-column-layout">
          <FormSection title={t('delivery_reps.delivery_reps_page.s8', "قائمة المناديب")}>
            <div style={{ overflow: 'hidden', margin: '-16px' }}>
              <DeliveryRepsList 
                selectedRepId={selectedRepId} 
                onSelectRep={(id) => { setSelectedRepId(id); setActiveSubTab('performance'); }} 
              />
            </div>
          </FormSection>

          <FormSection title={selectedRepId ? t('delivery_reps.delivery_reps_page.s9', "تفاصيل المندوب") : t('delivery_reps.delivery_reps_page.s10', "طلبات المندوب وتسوية الحساب")}>
            <div style={{ minHeight: '500px' }}>
              {!selectedRepId ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#64748b', padding: '40px', textAlign: 'center', gap: '10px' }}>
                  <strong style={{ fontSize: '16px', color: '#0f172a' }}>{t('delivery_reps.delivery_reps_page.s11', "اختر مندوباً من القائمة")}</strong>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b', maxWidth: '360px', lineHeight: 1.5 }}>
                    {t('delivery_reps.delivery_reps_page.s12', "اختر مندوباً لعرض لوحة مؤشرات الأداء، متابعة الطلبات المسندة، وتسوية العهد المالية وسجل التوريدات.")}
                  </p>
                </div>
              ) : (
                <div>
                  <div
                    className="delivery-rep-tabs"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px',
                      background: '#f1f5f9',
                      borderRadius: '10px',
                      marginBottom: '20px',
                      overflowX: 'auto',
                      WebkitOverflowScrolling: 'touch',
                      scrollbarWidth: 'none',
                      maxWidth: '100%',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('performance')}
                      style={{
                        padding: '6px 16px',
                        background: activeSubTab === 'performance' ? '#170e5e' : 'transparent',
                        border: 'none',
                        borderRadius: '7px',
                        color: activeSubTab === 'performance' ? '#ffffff' : '#475569',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '13px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        userSelect: 'none',
                        transition: 'none',
                      }}
                    >
                      {t('delivery_reps.delivery_reps_page.s13', "لوحة الأداء")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('orders')}
                      style={{
                        padding: '6px 16px',
                        background: activeSubTab === 'orders' ? '#170e5e' : 'transparent',
                        border: 'none',
                        borderRadius: '7px',
                        color: activeSubTab === 'orders' ? '#ffffff' : '#475569',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '13px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        userSelect: 'none',
                        transition: 'none',
                      }}
                    >
                      {t('delivery_reps.delivery_reps_page.s14', "الطلبات وتسوية الحساب")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('settlements')}
                      style={{
                        padding: '6px 16px',
                        background: activeSubTab === 'settlements' ? '#170e5e' : 'transparent',
                        border: 'none',
                        borderRadius: '7px',
                        color: activeSubTab === 'settlements' ? '#ffffff' : '#475569',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '13px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        userSelect: 'none',
                        transition: 'none',
                      }}
                    >
                      {t('delivery_reps.delivery_reps_page.s15', "سجل التوريدات")}
                    </button>
                  </div>
                  {activeSubTab === 'performance' && <DeliveryRepPerformance repId={selectedRepId} />}
                  {activeSubTab === 'orders' && <DeliveryRepOrders repId={selectedRepId} />}
                  {activeSubTab === 'settlements' && <DeliveryRepSettlements repId={selectedRepId} />}
                </div>
              )}
            </div>
          </FormSection>
        </div>
      )}

      {/* Tab 2: Company Fleet Vehicles & Shift Assignments */}
      {mainTab === 'fleet' && <FleetVehiclesTab />}

      {/* Tab 3: Van Sales Trips & Field Operations */}
      {mainTab === 'trips' && isVanSalesActive && <VanTripsTab />}
    </main>
  );
}
