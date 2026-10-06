import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { systemAlert, systemConfirm, toast } from '@/shared/components/system-alert';
import { deliveryRepsApi } from '@/shared/api/delivery-reps.api';
import {
  TruckIcon,
  SearchIcon,
  UsersIcon,
  SlidersIcon,
  CopyIcon,
  FileTextIcon,
  CheckCircleIcon,
  MapPinIcon,
  RefreshCwIcon,
} from '@/shared/components/icons/AppIcons';
import { FleetVehiclesTab } from '../components/FleetVehiclesTab';
import { VanTripsTab } from '../components/VanTripsTab';
import { VanLoadRequisitionsAdminTab } from '../components/VanLoadRequisitionsAdminTab';
import { VanFieldReturnsAdminTab } from '../components/VanFieldReturnsAdminTab';
import { VanRepTargetsAdminTab } from '../components/VanRepTargetsAdminTab';
import { VanRoutesKpiAdminTab } from '../components/VanRoutesKpiAdminTab';
import { VanPreSalesAdminTab } from '../components/VanPreSalesAdminTab';
import { UpsertDeliveryRepModal } from '@/shared/components/delivery-reps/UpsertDeliveryRepModal';
import { useVanSalesAdmin, type DeliveryRep } from '../hooks/useVanSalesAdmin';

export default function VanSalesAdminManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as 'trips' | 'requisitions' | 'presales' | 'routes_kpis' | 'returns' | 'targets' | 'fleet' | 'drivers' | null;

  const [activeTab, setActiveTab] = useState<'trips' | 'requisitions' | 'presales' | 'routes_kpis' | 'returns' | 'targets' | 'fleet' | 'drivers'>(
    () => tabParam || 'trips',
  );

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

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

  const queryClient = useQueryClient();
  const [isRefreshingDrivers, setIsRefreshingDrivers] = useState(false);

  const handleRefreshDrivers = async () => {
    setIsRefreshingDrivers(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['delivery-reps'] }),
        queryClient.invalidateQueries({ queryKey: ['van-admin-pending-returns-badge'] }),
        queryClient.invalidateQueries({ queryKey: ['van-admin-pending-requisitions-badge'] }),
      ]);
      await new Promise((r) => setTimeout(r, 450));
      toast.success('تم تحديث قائمة مناديب وسائقي الفان بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تحديث البيانات');
    } finally {
      setIsRefreshingDrivers(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deliveryRepsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-reps'] });
      systemAlert('تم إيقاف حساب المندوب بنجاح');
    },
    onError: (err: any) => {
      systemAlert(err.message || 'حدث خطأ أثناء إيقاف المندوب');
    },
  });

  const copyUrl = (path: string, label: string) => {
    const url = window.location.origin + path;
    navigator.clipboard.writeText(url);
    systemAlert(`تم نسخ رابط ${label} إلى الحافظة:\n${url}`);
  };

  const copyCredentials = (d: DeliveryRep) => {
    const portalUrl = `${window.location.origin}/van-sales`;
    const message = [
      `مرحباً ${d.name}،`,
      `إليك بيانات دخولك لتطبيق مبيعات وتوزيع الفان:`,
      `رابط المنظومة: ${portalUrl}`,
      `رقم الهاتف: ${d.phone || 'غير مسجل'}`,
      `رمز الدخول السريع (PIN): الرمز المحدد لك من الإدارة`,
      d.vehicle_plate ? `المركبة المسندة: لوحة (${d.vehicle_plate})` : '',
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(message);
    systemAlert(`تم نسخ بيانات دخول المندوب (${d.name}) إلى الحافظة بنجاح، يمكنك مشاركتها معه الآن.`);
  };

  const handleToggleActive = async (d: DeliveryRep) => {
    if (d.is_active) {
      const confirmed = await systemConfirm({
        title: 'إيقاف حساب المندوب',
        message: `هل أنت متأكد من إيقاف حساب المندوب "${d.name}"؟ لن يتمكن من فتح تطبيق الهاتف حتى يتم تفعيله مجدداً.`,
        confirmText: 'إيقاف الحساب',
        cancelText: 'إلغاء',
        variant: 'danger',
      });
      if (!confirmed) return;
      deleteMutation.mutate(d.id);
    } else {
      try {
        await deliveryRepsApi.update(d.id, {
          name: d.name,
          isActive: true,
        });
        queryClient.invalidateQueries({ queryKey: ['delivery-reps'] });
        systemAlert(`تمت إعادة تفعيل حساب المندوب "${d.name}" بنجاح.`);
      } catch (err: any) {
        systemAlert(err.message || 'حدث خطأ أثناء تفعيل المندوب');
      }
    }
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

      {/* Navigation Tabs (Zero Font Shift Rule: uniform 600 weight, 0ms transition, Zero Horizontal Scroll) */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          background: '#ffffff',
          padding: '6px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {[
          {
            key: 'trips' as const,
            label: 'رحلات التوزيع',
            icon: <SlidersIcon size={15} />,
          },
          {
            key: 'requisitions' as const,
            label: 'أذونات التحميل',
            count: pendingRequisitions.length > 0 ? pendingRequisitions.length : undefined,
            badgeBg: pendingRequisitions.length > 0 ? '#fef3c7' : undefined,
            badgeColor: pendingRequisitions.length > 0 ? '#b45309' : undefined,
            icon: <TruckIcon size={15} />,
          },
          {
            key: 'presales' as const,
            label: 'طلبيات وحجوزات المناديب',
            icon: <FileTextIcon size={15} />,
          },
          {
            key: 'routes_kpis' as const,
            label: 'خطوط السير والرقابة',
            icon: <MapPinIcon size={15} />,
          },
          {
            key: 'returns' as const,
            label: 'مرتجعات الميدان',
            count: pendingReturns.length > 0 ? pendingReturns.length : undefined,
            badgeBg: pendingReturns.length > 0 ? '#fee2e2' : undefined,
            badgeColor: pendingReturns.length > 0 ? '#b91c1c' : undefined,
            icon: <FileTextIcon size={15} />,
          },
          {
            key: 'targets' as const,
            label: 'مستهدفات البيع',
            icon: <CheckCircleIcon size={15} />,
          },
          {
            key: 'fleet' as const,
            label: 'أسطول السيارات',
            icon: <TruckIcon size={15} />,
          },
          {
            key: 'drivers' as const,
            label: 'مناديب الفان',
            count: vanDrivers.length,
            icon: <UsersIcon size={15} />,
          },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setSearchParams({ tab: tab.key });
              }}
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 4px',
                borderRadius: '8px',
                fontSize: '12.5px',
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
              <span style={{ display: 'inline-flex', flexShrink: 0 }}>{tab.icon}</span>
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </span>
              {tab.count !== undefined && (
                <span
                  style={{
                    flexShrink: 0,
                    background: isActive
                      ? 'rgba(255,255,255,0.2)'
                      : tab.badgeBg || '#f1f5f9',
                    color: isActive ? '#ffffff' : tab.badgeColor || '#64748b',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '1px 6px',
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

      {/* Tab: Pre-Sales Orders & Bookings */}
      {activeTab === 'presales' && <VanPreSalesAdminTab reps={vanDrivers.map((d) => ({ id: d.id, name: d.name }))} />}

      {/* Tab: Routes & Field Supervision KPIs */}
      {activeTab === 'routes_kpis' && <VanRoutesKpiAdminTab />}

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
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
                مناديب الفان المسجلين: {vanDrivers.length}
              </span>
              <Button
                variant="secondary"
                disabled={isRefreshingDrivers}
                style={{
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: isRefreshingDrivers ? 'wait' : 'pointer',
                  opacity: isRefreshingDrivers ? 0.75 : 1,
                }}
                onClick={handleRefreshDrivers}
                title="تحديث قائمة المناديب من السيرفر"
              >
                <RefreshCwIcon
                  size={13}
                  className={isRefreshingDrivers ? 'spin-animation' : undefined}
                  style={isRefreshingDrivers ? { animation: 'spin 0.75s linear infinite' } : undefined}
                />
                {isRefreshingDrivers ? 'جارٍ التحديث...' : 'تحديث'}
              </Button>
            </div>
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
                          {(() => {
                            const hasPin = Boolean(d.has_pin || (d as any).hasPin || (d as any).pin_hash || d.pin_code);
                            return (
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  background: hasPin ? '#ecfdf5' : '#fef2f2',
                                  border: `1px solid ${hasPin ? '#a7f3d0' : '#fecaca'}`,
                                  color: hasPin ? '#065f46' : '#b91c1c',
                                  borderRadius: '6px',
                                  fontFamily: 'monospace',
                                  fontWeight: 700,
                                  fontSize: '11.5px',
                                }}
                              >
                                {hasPin ? '•••• مفعل' : 'بدون رمز'}
                              </span>
                            );
                          })()}
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
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                            <Button
                              variant="secondary"
                              style={{ fontSize: '11px', padding: '4px 10px', fontWeight: 600 }}
                              onClick={() => {
                                setEditingRep(d);
                                setIsUpsertRepOpen(true);
                              }}
                            >
                              تعديل البيانات
                            </Button>
                            <Button
                              variant="secondary"
                              title="نسخ بيانات الدخول لإرسالها للمندوب عبر الواتساب"
                              style={{ fontSize: '11px', padding: '4px 8px', background: '#f8fafc', color: '#1e293b' }}
                              onClick={() => copyCredentials(d)}
                            >
                              <CopyIcon size={12} /> نسخ بيانات الدخول
                            </Button>
                            <Button
                              variant="secondary"
                              style={{
                                fontSize: '11px',
                                padding: '4px 8px',
                                background: d.is_active ? '#fff1f2' : '#f0fdf4',
                                color: d.is_active ? '#b91c1c' : '#15803d',
                                border: `1px solid ${d.is_active ? '#fecdd3' : '#bbf7d0'}`,
                                fontWeight: 700,
                              }}
                              onClick={() => handleToggleActive(d)}
                            >
                              {d.is_active ? 'إيقاف' : 'تفعيل'}
                            </Button>
                          </div>
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
        defaultRepType="van"
        hideDeliveryOption={true}
      />
    </div>
  );
}
