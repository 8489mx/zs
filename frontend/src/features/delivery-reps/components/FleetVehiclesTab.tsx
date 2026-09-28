import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { toast } from '@/shared/components/system-alert';
import {
  TruckIcon,
  SearchIcon,
  RefreshCwIcon,
  SlidersIcon,
  ToolIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  PlusIcon,
} from '@/shared/components/icons/AppIcons';
import {
  vanSalesApi,
  type FleetVehicle,
  type FleetMaintenanceAlert,
  type FleetOilChangeRecord,
  type FleetFuelLogRecord,
} from '../api/van-sales.api';
import { deliveryRepsApi, type DeliveryRep } from '@/shared/api/delivery-reps.api';
import { UpsertFleetVehicleModal } from './UpsertFleetVehicleModal';
import { AssignDriverModal } from './AssignDriverModal';
import { VehicleMaintenanceModal } from './VehicleMaintenanceModal';
import { SendToMaintenanceModal } from './SendToMaintenanceModal';
import { CompleteMaintenanceModal } from './CompleteMaintenanceModal';

export function FleetVehiclesTab() {
  const queryClient = useQueryClient();
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState<'all' | 'available' | 'assigned' | 'maintenance'>('all');
  const [isUpsertVehicleOpen, setIsUpsertVehicleOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<FleetVehicle | null>(null);
  const [isAssignDriverOpen, setIsAssignDriverOpen] = useState(false);
  const [assigningVehicle, setAssigningVehicle] = useState<FleetVehicle | null>(null);
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);
  const [maintenanceVehicle, setMaintenanceVehicle] = useState<FleetVehicle | null>(null);
  const [isSendToMaintenanceOpen, setIsSendToMaintenanceOpen] = useState(false);
  const [sendToMaintenanceVehicle, setSendToMaintenanceVehicle] = useState<FleetVehicle | null>(null);
  const [isCompleteMaintenanceOpen, setIsCompleteMaintenanceOpen] = useState(false);
  const [completeMaintenanceVehicle, setCompleteMaintenanceVehicle] = useState<FleetVehicle | null>(null);

  // 1. Fetch Fleet Vehicles
  const {
    data: vehicles = [],
    isLoading: isVehiclesLoading,
    refetch: refetchVehicles,
  } = useQuery<FleetVehicle[]>({
    queryKey: ['fleet-vehicles'],
    queryFn: vanSalesApi.listVehicles,
    refetchInterval: 25000,
  });

  // 2. Fetch Representatives
  const {
    data: reps = [],
    refetch: refetchReps,
  } = useQuery<DeliveryRep[]>({
    queryKey: ['delivery-reps'],
    queryFn: deliveryRepsApi.list,
  });

  // 3. Fetch Fleet Maintenance Alerts
  const {
    data: allAlerts = [],
    refetch: refetchAlerts,
  } = useQuery<FleetMaintenanceAlert[]>({
    queryKey: ['fleet-maintenance-alerts'],
    queryFn: vanSalesApi.fetchMaintenanceAlerts,
    refetchInterval: 30000,
  });

  // 4. Fetch All Oil Changes
  const {
    data: allOilChanges = [],
    isLoading: isOilLoading,
    refetch: refetchOilChanges,
  } = useQuery<FleetOilChangeRecord[]>({
    queryKey: ['fleet-oil-changes-all'],
    queryFn: () => vanSalesApi.fetchAdminOilChanges(),
  });

  // 5. Fetch All Fuel Logs
  const {
    data: allFuelLogs = [],
    isLoading: isFuelLoading,
    refetch: refetchFuelLogs,
  } = useQuery<FleetFuelLogRecord[]>({
    queryKey: ['fleet-fuel-logs-all'],
    queryFn: () => vanSalesApi.fetchAdminFuelLogs(),
  });

  const totalVehiclesCount = vehicles.length;
  const assignedVehiclesCount = vehicles.filter((v) => v.status === 'assigned' || v.assignedRepId).length;
  const availableVehiclesCount = vehicles.filter((v) => v.status === 'available' && !v.assignedRepId).length;
  const maintenanceVehiclesCount = vehicles.filter((v) => v.status === 'maintenance').length;

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (vehicleStatusFilter !== 'all' && v.status !== vehicleStatusFilter) return false;
      if (vehicleSearch.trim()) {
        const q = vehicleSearch.toLowerCase().trim();
        const matchesPlate = (v.plateNumber || '').toLowerCase().includes(q);
        const matchesModel = (v.modelName || '').toLowerCase().includes(q);
        const matchesRep = (v.assignedRepName || '').toLowerCase().includes(q);
        return matchesPlate || matchesModel || matchesRep;
      }
      return true;
    });
  }, [vehicles, vehicleStatusFilter, vehicleSearch]);

  const refreshAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] }),
        queryClient.invalidateQueries({ queryKey: ['delivery-reps'] }),
        queryClient.invalidateQueries({ queryKey: ['fleet-maintenance-alerts'] }),
        queryClient.invalidateQueries({ queryKey: ['fleet-oil-changes'] }),
        queryClient.invalidateQueries({ queryKey: ['fleet-fuel-logs'] }),
        refetchVehicles(),
        refetchReps(),
        refetchAlerts(),
        refetchOilChanges(),
        refetchFuelLogs(),
      ]);
      await new Promise((r) => setTimeout(r, 450));
      toast.success('تم تحديث أسطول السيارات بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تحديث البيانات');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
      {/* KPI Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        <div
          onClick={() => setVehicleStatusFilter('all')}
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '16px',
            border: vehicleStatusFilter === 'all' ? '2px solid #170e5e' : '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', display: 'block' }}>إجمالي أسطول الشركة</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', display: 'block', marginTop: '4px' }}>
            {totalVehiclesCount} <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>مركبة</span>
          </span>
        </div>

        <div
          onClick={() => setVehicleStatusFilter('assigned')}
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '16px',
            border: vehicleStatusFilter === 'assigned' ? '2px solid #0284c7' : '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7', display: 'block' }}>مركبات مسندة بسائق</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#0369a1', display: 'block', marginTop: '4px' }}>
            {assignedVehiclesCount} <span style={{ fontSize: '12px', color: '#7dd3fc', fontWeight: 600 }}>في الخدمة</span>
          </span>
        </div>

        <div
          onClick={() => setVehicleStatusFilter('available')}
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '16px',
            border: vehicleStatusFilter === 'available' ? '2px solid #16a34a' : '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', display: 'block' }}>مركبات متاحة للتشغيل</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#15803d', display: 'block', marginTop: '4px' }}>
            {availableVehiclesCount} <span style={{ fontSize: '12px', color: '#86efac', fontWeight: 600 }}>جاهزة</span>
          </span>
        </div>

        <div
          onClick={() => setVehicleStatusFilter('maintenance')}
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '16px',
            border: vehicleStatusFilter === 'maintenance' ? '2px solid #ea580c' : '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#ea580c', display: 'block' }}>تحت الصيانة والإصلاح</span>
            {allAlerts.length > 0 && (
              <span style={{ fontSize: '10.5px', background: '#fee2e2', color: '#dc2626', fontWeight: 800, padding: '1px 6px', borderRadius: '10px' }}>
                {allAlerts.length} تنبيه
              </span>
            )}
          </div>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#c2410c', display: 'block', marginTop: '4px' }}>
            {maintenanceVehiclesCount} <span style={{ fontSize: '12px', color: '#fdba74', fontWeight: 600 }}>بالورشة</span>
          </span>
        </div>
      </div>

      {/* Action and Filter Bar */}
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
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: '1', minWidth: '280px' }}>
          {vehicleStatusFilter !== 'maintenance' && (
            <div style={{ position: 'relative', flex: '1' }}>
              <input
                type="text"
                placeholder="بحث برقم اللوحة، الموديل، أو اسم السائق..."
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
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
          )}

          <div style={{ display: 'flex', gap: '4px' }}>
            {[
              { label: `الكل (${vehicles.length})`, value: 'all' as const },
              { label: `مسندة (${assignedVehiclesCount})`, value: 'assigned' as const },
              { label: `متاحة (${availableVehiclesCount})`, value: 'available' as const },
              { label: `مركز وسجل الصيانة (${maintenanceVehiclesCount} بالورشة)`, value: 'maintenance' as const },
            ].map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setVehicleStatusFilter(f.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '7px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: vehicleStatusFilter === f.value ? (f.value === 'maintenance' ? '#ea580c' : '#170e5e') : '#f1f5f9',
                  color: vehicleStatusFilter === f.value ? '#ffffff' : '#475569',
                  transition: 'none',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {vehicleStatusFilter === 'maintenance' ? (
            <Button
              variant="primary"
              style={{ background: '#ea580c', color: '#ffffff', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => {
                setSendToMaintenanceVehicle(null);
                setIsSendToMaintenanceOpen(true);
              }}
            >
              <ToolIcon size={14} />
              + إدخال سيارة للصيانة بالورشة
            </Button>
          ) : (
            <Button
              variant="primary"
              style={{ background: '#170e5e', color: '#ffffff', fontWeight: 700, fontSize: '13px' }}
              onClick={() => {
                setEditingVehicle(null);
                setIsUpsertVehicleOpen(true);
              }}
            >
              + إضافة سيارة للأسطول
            </Button>
          )}

          <Button
            variant="secondary"
            disabled={isRefreshing}
            style={{
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: isRefreshing ? 'wait' : 'pointer',
              opacity: isRefreshing ? 0.75 : 1,
            }}
            onClick={refreshAll}
            title="تحديث بيانات أسطول السيارات من السيرفر"
          >
            <RefreshCwIcon
              size={14}
              className={isRefreshing ? 'spin-animation' : undefined}
              style={isRefreshing ? { animation: 'spin 0.75s linear infinite' } : undefined}
            />
            {isRefreshing ? 'جارٍ التحديث...' : 'تحديث'}
          </Button>
        </div>
      </div>

      {/* VIEW MODE 1: FLEET MAINTENANCE & WORKSHOP HUB */}
      {vehicleStatusFilter === 'maintenance' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Section 1: Vehicles In Workshop */}
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ToolIcon size={18} color="#ea580c" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                    المركبات تحت الصيانة والإصلاح بالورشة حالياً ({maintenanceVehiclesCount})
                  </h3>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                    السيارات المحولة للورش ومسجل لها أعمال فحص أو إصلاح ومستبعدة مؤقتاً من خطوط التوزيع
                  </span>
                </div>
              </div>

              <Button
                variant="primary"
                onClick={() => {
                  setSendToMaintenanceVehicle(null);
                  setIsSendToMaintenanceOpen(true);
                }}
                style={{ background: '#ea580c', color: '#ffffff', fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <PlusIcon size={13} />
                + إدخال سيارة للصيانة
              </Button>
            </div>

            {maintenanceVehiclesCount === 0 ? (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '10px',
                  padding: '24px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13.5px', marginBottom: '4px' }}>
                  جميع سيارات أسطول الشركة جاهزة للتشغيل وفي الخدمة
                </div>
                <div style={{ color: '#64748b', fontSize: '12px', marginBottom: '12px' }}>
                  لا توجد أي مركبات متوقفة بالورشة حالياً. يمكنك إدخال أي مركبة تحتاج صيانة أو إصلاح مباشرة من الزر أعلاه.
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ background: '#fff7ed', borderBottom: '1px solid #ffedd5', color: '#9a3412' }}>
                      <th style={{ padding: '8px 12px', fontWeight: 700 }}>لوحة المركبة والطراز</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700 }}>السائق المسند</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700 }}>قراءة العداد</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700 }}>بيان العطل والورشة</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'center' }}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles
                      .filter((v) => v.status === 'maintenance')
                      .map((v) => (
                        <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}>
                            <div>{v.plateNumber}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{v.modelName || 'بدون موديل'}</div>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#334155' }}>
                            {v.assignedRepName || '-- بدون سائق --'}
                          </td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 700 }}>
                            {Number(v.currentOdometer || 0).toLocaleString()} كم
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: '11.5px', color: '#475569' }}>
                            {v.notes || 'تحت الصيانة والإصلاح بالورشة'}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <Button
                                variant="primary"
                                onClick={() => {
                                  setCompleteMaintenanceVehicle(v);
                                  setIsCompleteMaintenanceOpen(true);
                                }}
                                style={{
                                  background: '#15803d',
                                  color: '#ffffff',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  padding: '4px 10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <CheckCircleIcon size={13} />
                                إتمام الصيانة وإعادة للخدمة
                              </Button>
                              <Button
                                variant="secondary"
                                onClick={() => {
                                  setMaintenanceVehicle(v);
                                  setIsMaintenanceOpen(true);
                                }}
                                style={{ fontSize: '11.5px', padding: '4px 8px' }}
                              >
                                الوقود والصيانة
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Fleet Preventive Maintenance Alerts */}
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangleIcon size={18} color="#dc2626" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                    تنبيهات الصيانة الوقائية النشطة لأسطول الشركة ({allAlerts.length})
                  </h3>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                    التنبيهات المجدولة لغيارات الزيت المستحقة، اقتراب انتهاء التراخيص، والفحص الدوري
                  </span>
                </div>
              </div>
            </div>

            {allAlerts.length === 0 ? (
              <div
                style={{
                  background: '#ecfdf5',
                  border: '1px solid #d1fae5',
                  borderRadius: '8px',
                  padding: '14px 18px',
                  color: '#065f46',
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <CheckCircleIcon size={16} color="#059669" />
                <span>حالة أسطول الشركة ممتازة: لا توجد أي تنبيهات صيانة متأخرة أو رخص منتهية حالياً.</span>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '10px' }}>
                {allAlerts.map((alt) => {
                  const targetVeh = vehicles.find((v) => v.id === alt.vehicleId);
                  return (
                    <div
                      key={alt.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${alt.severity === 'critical' ? '#fca5a5' : '#fed7aa'}`,
                        background: alt.severity === 'critical' ? '#fef2f2' : '#fffbeb',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>
                          {alt.plateNumber}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '6px',
                            background: alt.severity === 'critical' ? '#dc2626' : '#ea580c',
                            color: '#ffffff',
                          }}
                        >
                          {alt.severity === 'critical' ? 'عاجل جداً' : 'تنبيه موعد'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>{alt.title}</div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>{alt.description}</div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            if (targetVeh) {
                              setMaintenanceVehicle(targetVeh);
                              setIsMaintenanceOpen(true);
                            }
                          }}
                          style={{ fontSize: '11.5px', padding: '3px 8px', background: '#ffffff' }}
                        >
                          تنفيذ الصيانة الآن ←
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 3: Fleet Oil Changes Ledger */}
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  سجل غيارات الزيت الدورية للأسطول ({allOilChanges.length})
                </h3>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  بيان بكافة غيارات الزيت المنفذة لجميع سيارات الشركة ومواعيد الغيار القادم
                </span>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  const firstVeh = vehicles[0];
                  if (firstVeh) {
                    setMaintenanceVehicle(firstVeh);
                    setIsMaintenanceOpen(true);
                  }
                }}
                style={{ background: '#16a34a', color: '#ffffff', fontWeight: 700, fontSize: '12px' }}
              >
                + تسجيل غيار زيت لسيارة
              </Button>
            </div>

            {isOilLoading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>جاري تحميل غيارات الزيت...</div>
            ) : allOilChanges.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '12.5px' }}>
                لا توجد غيارات زيت مسجلة لأسطول الشركة حتى الآن.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '8px 10px', fontWeight: 700 }}>لوحة المركبة</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700 }}>نوع ومواصفة الزيت</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700 }}>العداد عند التغيير</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700 }}>الفلتر</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700 }}>تنبيه قبل</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700 }}>الغيّار القادم عند</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700 }}>مركز الصيانة</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700 }}>التكلفة</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'center' }}>الحالة</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700 }}>التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allOilChanges.map((oc: any) => (
                      <tr key={oc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 800, color: '#0f172a' }}>
                          {oc.plateNumber}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#0f172a', fontWeight: 600 }}>
                          {oc.oilType} ({oc.ratedKm} كم)
                        </td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>
                          {Number(oc.odometerAtChange).toLocaleString()} كم
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          {oc.withFilter ? (
                            <span style={{ color: '#16a34a', fontWeight: 700 }}>مع فلتر جديد</span>
                          ) : (
                            <span style={{ color: '#64748b' }}>بدون فلتر</span>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#0284c7', fontWeight: 700 }}>
                          {oc.alertKmBefore} كم مسبقاً
                        </td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 800, color: '#170e5e' }}>
                          {Number(oc.nextDueOdometer).toLocaleString()} كم
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: '11px', color: '#64748b' }}>
                          {oc.performedBy || '—'}
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: '#170e5e' }}>
                          {oc.cost ? `${Number(oc.cost).toFixed(2)}` : '—'}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: '8px',
                              background: oc.status === 'active' ? '#dcfce7' : oc.status === 'overdue' ? '#fee2e2' : '#f1f5f9',
                              color: oc.status === 'active' ? '#15803d' : oc.status === 'overdue' ? '#b91c1c' : '#475569',
                            }}
                          >
                            {oc.status === 'active' ? 'ساري' : oc.status === 'overdue' ? 'مستحق التغيير' : 'مكتمل'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: '11px', color: '#64748b' }}>
                          {new Date(oc.createdAt).toLocaleDateString('ar-EG')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 4: Fleet Fuel Logs Ledger */}
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  سجل استهلاك وتفويل الوقود للأسطول ({allFuelLogs.length})
                </h3>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  معدلات الحرق (كم/لتر) وتكلفة المحروقات لسيارات الشركة
                </span>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  const firstVeh = vehicles[0];
                  if (firstVeh) {
                    setMaintenanceVehicle(firstVeh);
                    setIsMaintenanceOpen(true);
                  }
                }}
                style={{ background: '#0284c7', color: '#ffffff', fontWeight: 700, fontSize: '12px' }}
              >
                + تسجيل تفويل وقود لسيارة
              </Button>
            </div>

            {isFuelLoading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>جاري تحميل سجلات الوقود...</div>
            ) : allFuelLogs.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '12.5px' }}>
                لا توجد سجلات تفويل مسجلة لأسطول الشركة حتى الآن.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '8px 10px', fontWeight: 700 }}>لوحة المركبة</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700 }}>قراءة العداد</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700 }}>الكمية</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700 }}>سعر اللتر</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700 }}>الإجمالي</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700 }}>المسافة المقطوعة</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700 }}>معدل الاستهلاك</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700 }}>المحطة / التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allFuelLogs.map((fl: any) => (
                      <tr key={fl.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 800, color: '#0f172a' }}>
                          {fl.plateNumber || `#${fl.vehicleId}`}
                        </td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 700 }}>
                          {Number(fl.odometer).toLocaleString()} كم
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>
                          {fl.liters} لتر
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          {fl.pricePerLiter} <CurrencySymbol />
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 800, color: '#170e5e' }}>
                          {fl.totalCost} <CurrencySymbol />
                        </td>
                        <td style={{ padding: '8px 10px', color: '#059669', fontWeight: 600 }}>
                          {fl.kmSinceLastFuel > 0 ? `${fl.kmSinceLastFuel} كم` : '—'}
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 800, color: '#0284c7' }}>
                          {fl.consumptionRate > 0 ? `${fl.consumptionRate} كم/لتر` : '—'}
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: '11px', color: '#64748b' }}>
                          <div>{fl.stationName || 'محطة وقود'}</div>
                          <div>{new Date(fl.createdAt).toLocaleDateString('ar-EG')}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: REGULAR FLEET VEHICLES TABLE */
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflowX: 'auto',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          {isVehiclesLoading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
              جاري تحميل أسطول السيارات...
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
              {vehicles.length === 0
                ? 'لا توجد مركبات مسجلة في الأسطول حالياً. انقر على "+ إضافة سيارة للأسطول" لإضافة أول سيارة لأسطول الشركة.'
                : vehicleSearch
                ? `لا توجد مركبات تطابق بحثك: "${vehicleSearch}"`
                : vehicleStatusFilter === 'assigned'
                ? 'لا توجد مركبات مسندة لسائقين حالياً.'
                : vehicleStatusFilter === 'available'
                ? 'لا توجد مركبات متاحة بدون إسناد حالياً.'
                : 'لا توجد مركبات تطابق التصفية المحددة.'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>لوحة المركبة والطراز</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>نوع المركبة والوقود</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>مستودع الفان المتنقل</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>السائق المسند</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>قراءة العداد</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>الحالة</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((v) => {
                  const isAssigned = Boolean(v.assignedRepId);
                  return (
                    <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              background: '#f0f9ff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <TruckIcon size={18} color="#0284c7" />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13.5px' }}>
                              {v.plateNumber}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              {v.modelName || 'بدون موديل محدد'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#334155' }}>
                          {v.vehicleType === 'van'
                            ? 'سيارة فان توزيع'
                            : v.vehicleType === 'truck'
                            ? 'شاحنة نقل بضائع'
                            : v.vehicleType === 'motorcycle'
                            ? 'دراجة نارية (موتوسيكل)'
                            : 'سيارة أخرى'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          وقود: {v.fuelType === 'gasoline' ? 'بنزين' : v.fuelType === 'diesel' ? 'سولار / ديزل' : v.fuelType === 'hybrid' ? 'هايبرد' : 'كهربائي'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            background: '#f8fafc',
                            color: '#334155',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            fontWeight: 600,
                            display: 'inline-block',
                          }}
                        >
                          {v.vanLocationName}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {isAssigned ? (
                          <div>
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>{v.assignedRepName}</span>
                            {v.assignedRepPhone && (
                              <div style={{ fontSize: '11px', color: '#64748b', direction: 'ltr', textAlign: 'right' }}>
                                {v.assignedRepPhone}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '11.5px', color: '#94a3b8', fontStyle: 'italic' }}>
                            -- بدون سائق مسند --
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                        {Number(v.currentOdometer || 0).toLocaleString()} كم
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background:
                              v.status === 'assigned'
                                ? '#e0f2fe'
                                : v.status === 'available'
                                ? '#dcfce7'
                                : v.status === 'maintenance'
                                ? '#ffedd5'
                                : '#f1f5f9',
                            color:
                              v.status === 'assigned'
                                ? '#0369a1'
                                : v.status === 'available'
                                ? '#15803d'
                                : v.status === 'maintenance'
                                ? '#c2410c'
                                : '#475569',
                            border: `1px solid ${
                              v.status === 'assigned'
                                ? '#bae6fd'
                                : v.status === 'available'
                                ? '#bbf7d0'
                                : v.status === 'maintenance'
                                ? '#fed7aa'
                                : '#e2e8f0'
                            }`,
                          }}
                        >
                          {v.status === 'assigned'
                            ? 'مسندة بالخدمة'
                            : v.status === 'available'
                            ? 'متاحة للتشغيل'
                            : v.status === 'maintenance'
                            ? 'تحت الصيانة'
                            : 'مستبعدة'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <Button
                            variant="secondary"
                            style={{ fontSize: '11px', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => {
                              setMaintenanceVehicle(v);
                              setIsMaintenanceOpen(true);
                            }}
                          >
                            <SlidersIcon size={12} />
                            الوقود والصيانة
                          </Button>

                          {v.status === 'maintenance' ? (
                            <Button
                              variant="primary"
                              style={{
                                fontSize: '11px',
                                padding: '4px 8px',
                                background: '#15803d',
                                color: '#ffffff',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              onClick={() => {
                                setCompleteMaintenanceVehicle(v);
                                setIsCompleteMaintenanceOpen(true);
                              }}
                            >
                              <CheckCircleIcon size={12} />
                              إتمام الصيانة
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              style={{
                                fontSize: '11px',
                                padding: '4px 8px',
                                color: '#ea580c',
                                borderColor: '#fed7aa',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              onClick={() => {
                                setSendToMaintenanceVehicle(v);
                                setIsSendToMaintenanceOpen(true);
                              }}
                            >
                              <ToolIcon size={12} />
                              تحويل للورشة
                            </Button>
                          )}

                          <Button
                            variant="secondary"
                            style={{ fontSize: '11px', padding: '4px 10px' }}
                            onClick={() => {
                              setAssigningVehicle(v);
                              setIsAssignDriverOpen(true);
                            }}
                          >
                            {isAssigned ? 'إدارة السائقين والورديات' : 'تخصيص سائق'}
                          </Button>
                          <Button
                            variant="secondary"
                            style={{ fontSize: '11px', padding: '4px 10px' }}
                            onClick={() => {
                              setEditingVehicle(v);
                              setIsUpsertVehicleOpen(true);
                            }}
                          >
                            تعديل
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
      )}

      {/* Modals */}
      <UpsertFleetVehicleModal
        open={isUpsertVehicleOpen}
        onClose={() => {
          setIsUpsertVehicleOpen(false);
          setEditingVehicle(null);
        }}
        vehicle={editingVehicle}
        reps={reps}
      />

      <AssignDriverModal
        open={isAssignDriverOpen}
        onClose={() => {
          setIsAssignDriverOpen(false);
          setAssigningVehicle(null);
        }}
        vehicle={assigningVehicle}
        reps={reps}
      />

      <VehicleMaintenanceModal
        open={isMaintenanceOpen}
        onClose={() => {
          setIsMaintenanceOpen(false);
          setMaintenanceVehicle(null);
        }}
        vehicle={maintenanceVehicle}
      />

      <SendToMaintenanceModal
        open={isSendToMaintenanceOpen}
        onClose={() => {
          setIsSendToMaintenanceOpen(false);
          setSendToMaintenanceVehicle(null);
        }}
        vehicles={vehicles}
        preselectedVehicle={sendToMaintenanceVehicle}
        onSuccess={refreshAll}
      />

      <CompleteMaintenanceModal
        open={isCompleteMaintenanceOpen}
        onClose={() => {
          setIsCompleteMaintenanceOpen(false);
          setCompleteMaintenanceVehicle(null);
        }}
        vehicle={completeMaintenanceVehicle}
        onSuccess={refreshAll}
      />
    </div>
  );
}
