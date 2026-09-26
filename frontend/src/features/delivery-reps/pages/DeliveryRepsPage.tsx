import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { FormSection } from '@/shared/components/form-section';
import { UsersIcon, TruckIcon, SlidersIcon } from '@/shared/components/icons/AppIcons';
import { DeliveryRepsList } from '../components/DeliveryRepsList';
import { DeliveryRepOrders } from '../components/DeliveryRepOrders';
import { DeliveryRepSettlements } from '../components/DeliveryRepSettlements';
import { DeliveryRepPerformance } from '../components/DeliveryRepPerformance';
import { FleetVehiclesTab } from '../components/FleetVehiclesTab';
import { VanTripsTab } from '../components/VanTripsTab';

export default function DeliveryRepsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mainTab = (searchParams.get('tab') as 'couriers' | 'fleet' | 'trips') || 'couriers';

  const [selectedRepId, setSelectedRepId] = useState<number | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'settlements' | 'performance'>('performance');

  const setMainTab = (tab: 'couriers' | 'fleet' | 'trips') => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('tab', tab);
      return p;
    });
  };

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
        title="إدارة المناديب وأسطول التوزيع" 
        description="إدارة طياري الدليفري، أسطول سيارات الشركة، ورديات الفان، ومتابعة الطلبات والتوريدات المالية." 
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
        {[
          {
            key: 'couriers' as const,
            label: 'مناديب التوصيل والدليفري',
            subtitle: 'طلبات الدليفري والتسويات',
            icon: <UsersIcon size={16} />,
          },
          {
            key: 'fleet' as const,
            label: 'أسطول سيارات الشركة',
            subtitle: 'السيارات وتعيين السائقين والورديات',
            icon: <TruckIcon size={16} />,
          },
          {
            key: 'trips' as const,
            label: 'رحلات وورديات مبيعات الفان',
            subtitle: 'المبيعات الميدانية، العداد، والكاش',
            icon: <SlidersIcon size={16} />,
          },
        ].map((tab) => {
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
              <div style={{ textAlign: 'right' }}>
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
          <FormSection title="قائمة المناديب">
            <div style={{ overflow: 'hidden', margin: '-16px' }}>
              <DeliveryRepsList 
                selectedRepId={selectedRepId} 
                onSelectRep={(id) => { setSelectedRepId(id); setActiveSubTab('performance'); }} 
              />
            </div>
          </FormSection>

          <FormSection title={selectedRepId ? "تفاصيل المندوب" : "طلبات المندوب وتسوية الحساب"}>
            <div style={{ minHeight: '500px' }}>
              {!selectedRepId ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#64748b', padding: '40px', textAlign: 'center', gap: '10px' }}>
                  <strong style={{ fontSize: '16px', color: '#0f172a' }}>اختر مندوباً من القائمة</strong>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b', maxWidth: '360px', lineHeight: 1.5 }}>
                    اختر مندوباً لعرض لوحة مؤشرات الأداء، متابعة الطلبات المسندة، وتسوية العهد المالية وسجل التوريدات.
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
                      لوحة الأداء
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
                      الطلبات وتسوية الحساب
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
                      سجل التوريدات
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
      {mainTab === 'trips' && <VanTripsTab />}
    </main>
  );
}
