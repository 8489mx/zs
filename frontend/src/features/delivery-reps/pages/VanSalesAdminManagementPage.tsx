import { useState, useMemo } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { systemAlert } from '@/shared/components/system-alert';
import {
  TruckIcon,
  SearchIcon,
  UsersIcon,
  SlidersIcon,
  CopyIcon,
  FileTextIcon,
  CheckCircleIcon,
} from '@/shared/components/icons/AppIcons';
import { FleetVehiclesTab } from '../components/FleetVehiclesTab';
import { VanTripsTab } from '../components/VanTripsTab';
import { VanLoadRequisitionsAdminTab } from '../components/VanLoadRequisitionsAdminTab';
import { VanFieldReturnsAdminTab } from '../components/VanFieldReturnsAdminTab';
import { VanRepTargetsAdminTab } from '../components/VanRepTargetsAdminTab';
import { UpsertDeliveryRepModal } from '@/shared/components/delivery-reps/UpsertDeliveryRepModal';
import { useVanSalesAdmin, type DeliveryRep } from '../hooks/useVanSalesAdmin';

export default function VanSalesAdminManagementPage() {
  const [activeTab, setActiveTab] = useState<'trips' | 'requisitions' | 'returns' | 'targets' | 'fleet' | 'drivers'>('trips');

  // Drivers Tab State
  const [driverSearch, setDriverSearch] = useState('');
  const [isUpsertRepOpen, setIsUpsertRepOpen] = useState(false);
  const [editingRep, setEditingRep] = useState<DeliveryRep | null>(null);

  const {
    reps,
    isRepsLoading,
    pendingReturns,
    pendingRequisitions,
  } = useVanSalesAdmin();

  const vanDrivers = useMemo(() => {
    return reps.filter((r) => r.is_van_rep || r.rep_type === 'van' || r.rep_type === 'both');
  }, [reps]);

  const filteredDrivers = useMemo(() => {
    return vanDrivers.filter((d) => {
      if (driverSearch.trim()) {
        const q = driverSearch.toLowerCase().trim();
        const matchesName = (d.name || '').toLowerCase().includes(q);
        const matchesPhone = (d.phone || '').toLowerCase().includes(q);
        const matchesPlate = (d.vehicle_plate || '').toLowerCase().includes(q);
        return matchesName || matchesPhone || matchesPlate;
      }
      return true;
    });
  }, [vanDrivers, driverSearch]);

  const copyUrl = (path: string, label: string) => {
    const url = window.location.origin + path;
    navigator.clipboard.writeText(url);
    systemAlert(`تم نسخ رابط ${label} إلى الحافظة:\n${url}`);
  };

  return (
    <div
      dir="rtl"
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
        title="مركز إدارة سيارات التوزيع وأسطول الفان (Van Sales & Fleet)"
        description="المنظومة المؤسسية لإدارة سيارات التوزيع، ورديات البيع الميداني، وجرد المستودعات المتنقلة"
        actions={
          activeTab === 'drivers' ? (
            <Button
              variant="primary"
              style={{ background: '#170e5e', color: '#ffffff', fontWeight: 700, fontSize: '13px' }}
              onClick={() => {
                setEditingRep(null);
                setIsUpsertRepOpen(true);
              }}
            >
              + إضافة مندوب فان جديد
            </Button>
          ) : undefined
        }
      />

      {/* Navigation Tabs (Zero Font Shift Rule: uniform 600 weight, 0ms transition) */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          background: '#ffffff',
          padding: '6px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          overflowX: 'auto',
        }}
      >
        {[
          {
            key: 'trips' as const,
            label: 'رحلات وورديات التوزيع',
            icon: <SlidersIcon size={16} />,
          },
          {
            key: 'requisitions' as const,
            label: 'أذونات تحميل الصباح',
            count: pendingRequisitions.length > 0 ? pendingRequisitions.length : undefined,
            badgeBg: pendingRequisitions.length > 0 ? '#fef3c7' : undefined,
            badgeColor: pendingRequisitions.length > 0 ? '#b45309' : undefined,
            icon: <TruckIcon size={16} />,
          },
          {
            key: 'returns' as const,
            label: 'مرتجعات البيع الميداني',
            count: pendingReturns.length > 0 ? pendingReturns.length : undefined,
            badgeBg: pendingReturns.length > 0 ? '#fee2e2' : undefined,
            badgeColor: pendingReturns.length > 0 ? '#b91c1c' : undefined,
            icon: <FileTextIcon size={16} />,
          },
          {
            key: 'targets' as const,
            label: 'تارجت ومستهدفات المناديب',
            icon: <CheckCircleIcon size={16} />,
          },
          {
            key: 'fleet' as const,
            label: 'أسطول سيارات الشركة',
            icon: <TruckIcon size={16} />,
          },
          {
            key: 'drivers' as const,
            label: 'مناديب وسائقي الفان',
            count: vanDrivers.length,
            icon: <UsersIcon size={16} />,
          },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
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
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  style={{
                    background: isActive
                      ? 'rgba(255,255,255,0.2)'
                      : tab.badgeBg || '#f1f5f9',
                    color: isActive ? '#ffffff' : tab.badgeColor || '#64748b',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: '12px',
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Trips */}
      {activeTab === 'trips' && <VanTripsTab />}

      {/* Tab 2: Requisitions */}
      {activeTab === 'requisitions' && <VanLoadRequisitionsAdminTab />}

      {/* Tab 3: Returns */}
      {activeTab === 'returns' && <VanFieldReturnsAdminTab />}

      {/* Tab 4: Targets */}
      {activeTab === 'targets' && <VanRepTargetsAdminTab />}

      {/* Tab 5: Fleet */}
      {activeTab === 'fleet' && <FleetVehiclesTab />}

      {/* Tab 6: Drivers */}
      {activeTab === 'drivers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Info Banner */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  background: '#f0f9ff',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UsersIcon size={20} color="#0284c7" />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  سائقي ومناديب التوزيع الميداني (Van Drivers)
                </h4>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  تسجيل بيانات المناديب، ربطهم بسيارات التوزيع، وتفعيل بوابة البيع الميداني (/van-sales) برمز PIN.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <Button
                variant="secondary"
                style={{ fontSize: '12px', padding: '6px 12px' }}
                onClick={() => copyUrl('/van-sales', 'بوابة مبيعات الفان')}
              >
                <CopyIcon size={12} /> نسخ رابط البوابة (/van-sales)
              </Button>
              <Button
                variant="secondary"
                style={{ fontSize: '12px', padding: '6px 12px', background: '#170e5e', color: '#ffffff', borderColor: '#170e5e' }}
                onClick={() => window.open('/van-sales', '_blank')}
              >
                فتح البوابة ↗
              </Button>
            </div>
          </div>

          {/* Filter Bar */}
          <div
            style={{
              background: '#ffffff',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
              <input
                type="text"
                placeholder="بحث باسم المندوب أو رقم الهاتف أو لوحة السيارة..."
                value={driverSearch}
                onChange={(e) => setDriverSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
              <span style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }}>
                <SearchIcon size={16} />
              </span>
            </div>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
              مناديب الفان المسجلين: {vanDrivers.length}
            </span>
          </div>

          {/* Drivers Table */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              overflowX: 'auto',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            {isRepsLoading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
                جاري تحميل بيانات المناديب...
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                لا يوجد مناديب توزيع فان مسجلين حالياً. انقر على "+ إضافة مندوب فان جديد" لإنشاء حساب ميداني.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>اسم المندوب</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>نوع التكليف</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>رقم الهاتف</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>المركبة الحالية</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>رمز الدخول (PIN)</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>الحالة</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrivers.map((d) => {
                    const isBoth = d.rep_type === 'both';
                    return (
                      <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13.5px' }}>{d.name}</div>
                          {d.full_name && (
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{d.full_name}</div>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {isBoth ? (
                            <span style={{ fontSize: '11px', color: '#6d28d9', background: '#ede9fe', padding: '2px 8px', borderRadius: '6px', border: '1px solid #ddd6fe', fontWeight: 700 }}>
                              شامل (فان ودليفري)
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: '6px', border: '1px solid #bae6fd', fontWeight: 700 }}>
                              توزيع فان حصري
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', direction: 'ltr', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px' }}>
                          {d.phone || <span style={{ color: '#dc2626' }}>غير مسجل</span>}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {d.vehicle_plate ? (
                            <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#334155', padding: '2px 7px', borderRadius: '4px', border: '1px solid #e2e8f0', fontWeight: 700 }}>
                              لوحة: {d.vehicle_plate}
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>بدون لوحة مسندة</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 7px',
                              background: d.pin_code ? '#f0fdf4' : '#fef2f2',
                              border: `1px solid ${d.pin_code ? '#bbf7d0' : '#fecaca'}`,
                              color: d.pin_code ? '#15803d' : '#b91c1c',
                              borderRadius: '6px',
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '11.5px',
                            }}
                          >
                            {d.pin_code ? `•••• (${d.pin_code})` : 'بدون رمز'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: d.is_active ? '#ecfdf5' : '#fef2f2',
                              color: d.is_active ? '#065f46' : '#991b1b',
                              border: `1px solid ${d.is_active ? '#a7f3d0' : '#fecaca'}`,
                            }}
                          >
                            {d.is_active ? 'نشط' : 'موقوف'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <Button
                            variant="secondary"
                            style={{ fontSize: '11px', padding: '4px 10px' }}
                            onClick={() => {
                              setEditingRep(d);
                              setIsUpsertRepOpen(true);
                            }}
                          >
                            تعديل البيانات
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <UpsertDeliveryRepModal
        open={isUpsertRepOpen}
        onClose={() => {
          setIsUpsertRepOpen(false);
          setEditingRep(null);
        }}
        rep={editingRep}
      />
    </div>
  );
}
