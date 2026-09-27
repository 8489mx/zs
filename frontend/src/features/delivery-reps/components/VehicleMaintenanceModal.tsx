import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { Button } from '@/shared/ui/button';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { toast } from '@/shared/components/system-alert';
import {
  vanSalesApi,
  FleetVehicle,
  FleetFuelLogRecord,
  FleetOilChangeRecord,
  FleetMaintenanceAlert,
} from '../api/van-sales.api';
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  PlusIcon,
} from '@/shared/components/icons/AppIcons';

interface VehicleMaintenanceModalProps {
  open: boolean;
  onClose: () => void;
  vehicle: FleetVehicle | null;
}

export function VehicleMaintenanceModal({
  open,
  onClose,
  vehicle,
}: VehicleMaintenanceModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'alerts' | 'oil' | 'fuel' | 'add_oil' | 'add_fuel'>('alerts');

  // Add Oil Change Form State
  const [odometerAtChange, setOdometerAtChange] = useState<string>('');
  const [oilType, setOilType] = useState<string>('تخليقي 10,000 كم');
  const [ratedKm, setRatedKm] = useState<string>('10000');
  const [withFilter, setWithFilter] = useState<boolean>(true);
  const [alertKmBefore, setAlertKmBefore] = useState<string>('500'); // Custom alert km
  const [cost, setCost] = useState<string>('');
  const [performedBy, setPerformedBy] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Add Fuel Log Form State
  const [fuelOdometer, setFuelOdometer] = useState<string>('');
  const [fuelLiters, setFuelLiters] = useState<string>('');
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState<string>('');
  const [fuelStationName, setFuelStationName] = useState<string>('');
  const [fuelNotes, setFuelNotes] = useState<string>('');

  // 1. Fetch Maintenance Alerts
  const { data: allAlerts = [] } = useQuery<FleetMaintenanceAlert[]>({
    queryKey: ['fleet-maintenance-alerts'],
    queryFn: vanSalesApi.fetchMaintenanceAlerts,
    enabled: open && Boolean(vehicle),
  });

  const vehicleAlerts = allAlerts.filter((a) => a.vehicleId === vehicle?.id);

  // 2. Fetch Oil Changes History
  const {
    data: oilChanges = [],
    isLoading: isOilLoading,
  } = useQuery<FleetOilChangeRecord[]>({
    queryKey: ['fleet-oil-changes', vehicle?.id],
    queryFn: () => vanSalesApi.fetchAdminOilChanges(vehicle!.id),
    enabled: open && Boolean(vehicle),
  });

  // 3. Fetch Fuel Logs
  const {
    data: fuelLogs = [],
    isLoading: isFuelLoading,
  } = useQuery<FleetFuelLogRecord[]>({
    queryKey: ['fleet-fuel-logs', vehicle?.id],
    queryFn: () => vanSalesApi.fetchAdminFuelLogs({ vehicleId: vehicle!.id }),
    enabled: open && Boolean(vehicle),
  });

  // Record Oil Change Mutation
  const recordOilMutation = useMutation({
    mutationFn: vanSalesApi.recordAdminOilChange,
    onSuccess: () => {
      toast.success('تم تسجيل غيار الزيت وجدولة تنبيه الصيانة المخصص بنجاح');
      queryClient.invalidateQueries({ queryKey: ['fleet-oil-changes', vehicle?.id] });
      queryClient.invalidateQueries({ queryKey: ['fleet-maintenance-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] });
      setActiveTab('oil');
      setCost('');
      setNotes('');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'فشل تسجيل غيار الزيت');
    },
  });

  // Record Fuel Log Mutation
  const recordFuelMutation = useMutation({
    mutationFn: vanSalesApi.recordAdminFuelLog,
    onSuccess: () => {
      toast.success('تم تسجيل تفويل الوقود واحتساب معدل الاستهلاك بنجاح');
      queryClient.invalidateQueries({ queryKey: ['fleet-fuel-logs', vehicle?.id] });
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] });
      setActiveTab('fuel');
      setFuelLiters('');
      setFuelPricePerLiter('');
      setFuelStationName('');
      setFuelNotes('');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'فشل تسجيل تفويل الوقود');
    },
  });

  if (!vehicle) return null;

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={`صيانة ووقود المركبة: ${vehicle.plateNumber}`}
      subtitle={`${vehicle.modelName || 'سيارة توزيع'} • العداد الحالي: ${Number(vehicle.currentOdometer || 0).toLocaleString()} كم`}
      maxWidth="820px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} dir="rtl">
        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'alerts' ? '#170e5e' : 'transparent',
              color: activeTab === 'alerts' ? '#ffffff' : '#475569',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <AlertTriangleIcon size={14} />
            التنبيهات النشطة ({vehicleAlerts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('oil')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'oil' ? '#170e5e' : 'transparent',
              color: activeTab === 'oil' ? '#ffffff' : '#475569',
              fontWeight: 600,
            }}
          >
            سجل غيارات الزيت ({oilChanges.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fuel')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'fuel' ? '#170e5e' : 'transparent',
              color: activeTab === 'fuel' ? '#ffffff' : '#475569',
              fontWeight: 600,
            }}
          >
            سجل التفويل والوقود ({fuelLogs.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setOdometerAtChange(String(vehicle.currentOdometer || ''));
              setActiveTab('add_oil');
            }}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'add_oil' ? '#16a34a' : '#e2e8f0',
              color: activeTab === 'add_oil' ? '#ffffff' : '#15803d',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <PlusIcon size={13} />
            + تسجيل غيار زيت
          </button>
          <button
            type="button"
            onClick={() => {
              setFuelOdometer(String(vehicle.currentOdometer || ''));
              setActiveTab('add_fuel');
            }}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'add_fuel' ? '#0284c7' : '#e0f2fe',
              color: activeTab === 'add_fuel' ? '#ffffff' : '#0369a1',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <PlusIcon size={13} />
            + تسجيل تفويل وقود
          </button>
        </div>

        {/* TAB 1: ALERTS */}
        {activeTab === 'alerts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* License Expiration Banner Check */}
            {vehicle.licenseExpiresAt && (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12.5px',
                }}
              >
                <div>
                  <strong style={{ color: '#0f172a' }}>رخصة تسيير المركبة:</strong>
                  <span style={{ color: '#64748b', marginRight: '6px' }}>
                    تنتهي بتاريخ: {new Date(vehicle.licenseExpiresAt).toLocaleDateString('ar-EG')}
                  </span>
                </div>
                <span
                  style={{
                    background: '#e0f2fe',
                    color: '#0369a1',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  تنبيه تلقائي قبل 30 يوم من الانتهاء
                </span>
              </div>
            )}

            {vehicleAlerts.length === 0 ? (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  padding: '24px',
                  textAlign: 'center',
                  color: '#15803d',
                }}
              >
                <CheckCircleIcon size={28} color="#16a34a" style={{ margin: '0 auto 8px', display: 'block' }} />
                <strong style={{ fontSize: '13.5px', display: 'block' }}>حالة المركبة ممتازة ولا توجد تنبيهات نشطة</strong>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#166534' }}>
                  غيار الزيت ساري ورخصة المركبة مجددة وصالحة.
                </p>
              </div>
            ) : (
              vehicleAlerts.map((alt) => (
                <div
                  key={alt.id}
                  style={{
                    background: alt.severity === 'critical' ? '#fff1f2' : '#fffbeb',
                    border: `1px solid ${alt.severity === 'critical' ? '#fecdd3' : '#fde68a'}`,
                    borderRadius: '10px',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AlertTriangleIcon
                      size={20}
                      color={alt.severity === 'critical' ? '#e11d48' : '#d97706'}
                    />
                    <div>
                      <strong style={{ color: alt.severity === 'critical' ? '#9f1239' : '#92400e', fontSize: '13px' }}>
                        {alt.title}
                      </strong>
                      <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px' }}>
                        {alt.description}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      background: alt.severity === 'critical' ? '#e11d48' : '#d97706',
                      color: '#ffffff',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    {alt.severity === 'critical' ? 'عاجل جداً' : 'تنبيه موعد'}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: OIL CHANGES HISTORY */}
        {activeTab === 'oil' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
                سجل دورات غيار الزيت والفلاتر
              </span>
              <Button
                variant="primary"
                onClick={() => {
                  setOdometerAtChange(String(vehicle.currentOdometer || ''));
                  setActiveTab('add_oil');
                }}
                style={{
                  background: '#16a34a',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                }}
              >
                <PlusIcon size={13} />
                + تسجيل غيار زيت
              </Button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              {isOilLoading ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>جاري تحميل غيارات الزيت...</div>
              ) : oilChanges.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '12.5px' }}>
                  لا يوجد سجل غيارات زيت مسجل لهذه المركبة حتى الآن.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '8px 10px', fontWeight: 700 }}>نوع الزيت</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700 }}>العداد عند التغيير</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700 }}>الفلتر</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700 }}>تنبيه قبل</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700 }}>الغيّار القادم عند</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'center' }}>الحالة</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700 }}>التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {oilChanges.map((oc) => (
                      <tr key={oc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>
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
              )}
            </div>
          </div>
        )}

        {/* TAB 3: FUEL LOGS */}
        {activeTab === 'fuel' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
                سجل التفويل ومعدل استهلاك الوقود (كم/لتر)
              </span>
              <Button
                variant="primary"
                onClick={() => {
                  setFuelOdometer(String(vehicle.currentOdometer || ''));
                  setActiveTab('add_fuel');
                }}
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                }}
              >
                <PlusIcon size={13} />
                + تسجيل تفويل وقود
              </Button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              {isFuelLoading ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>جاري تحميل سجلات الوقود...</div>
              ) : fuelLogs.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '12.5px' }}>
                  لا توجد سجلات تفويل مسجلة لهذه المركبة.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
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
                    {fuelLogs.map((fl) => (
                      <tr key={fl.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
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
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ADD OIL CHANGE FORM */}
        {activeTab === 'add_oil' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const odo = parseFloat(odometerAtChange);
              const rKm = parseFloat(ratedKm);
              const alertBefore = parseFloat(alertKmBefore) || 500;
              if (!odo || odo <= 0) {
                toast.warning('يرجى إدخال قراءة العداد عند الغيار');
                return;
              }
              if (!rKm || rKm <= 0) {
                toast.warning('يرجى تحديد مسافة صلاحية الزيت');
                return;
              }

              recordOilMutation.mutate({
                vehicleId: vehicle.id,
                odometerAtChange: odo,
                oilType: oilType.trim() || 'زيت محرك',
                ratedKm: rKm,
                withFilter,
                alertKmBefore: alertBefore,
                cost: cost ? parseFloat(cost) : undefined,
                performedBy: performedBy.trim() || undefined,
                notes: notes.trim() || undefined,
              });
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  قراءة العداد عند التغيير (كم) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="number"
                  required
                  value={odometerAtChange}
                  onChange={(e) => setOdometerAtChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  نوع ومواصفة الزيت
                </label>
                <input
                  type="text"
                  value={oilType}
                  onChange={(e) => setOilType(e.target.value)}
                  placeholder="مثال: شيل هيلكس 5W-40 تخليقي"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  صلاحية الزيت (كم) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={ratedKm}
                  onChange={(e) => setRatedKm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    boxSizing: 'border-box',
                    background: '#ffffff',
                  }}
                >
                  <option value="3000">3,000 كم</option>
                  <option value="5000">5,000 كم</option>
                  <option value="7000">7,000 كم</option>
                  <option value="10000">10,000 كم</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  تغيير الفلتر
                </label>
                <select
                  value={withFilter ? 'yes' : 'no'}
                  onChange={(e) => setWithFilter(e.target.value === 'yes')}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    boxSizing: 'border-box',
                    background: '#ffffff',
                  }}
                >
                  <option value="yes">نعم (مع فلتر زيت جديد)</option>
                  <option value="no">لا (زيت فقط بدون فلتر)</option>
                </select>
              </div>

              {/* Custom alert km written by user */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#170e5e', marginBottom: '4px' }}>
                  تنبيه قبل الميعاد بـ (كم) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="number"
                  min="50"
                  step="50"
                  value={alertKmBefore}
                  onChange={(e) => setAlertKmBefore(e.target.value)}
                  placeholder="مثال: 500"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '7px',
                    border: '1px solid #170e5e',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    boxSizing: 'border-box',
                    backgroundColor: '#f8fafc',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  التكلفة الإجمالية للغيّار
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  مركز الصيانة / القائم بالعمل
                </label>
                <input
                  type="text"
                  value={performedBy}
                  onChange={(e) => setPerformedBy(e.target.value)}
                  placeholder="مثال: ورشة الشركة المركزية، بنزينة موبيل..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <Button variant="secondary" onClick={() => setActiveTab('oil')}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={recordOilMutation.isPending}
                style={{ backgroundColor: '#170e5e', color: '#ffffff', fontWeight: 700 }}
              >
                {recordOilMutation.isPending ? 'جاري الحفظ...' : 'حفظ غيار الزيت وجدولة التنبيه'}
              </Button>
            </div>
          </form>
        )}

        {/* TAB 5: ADD FUEL LOG FORM */}
        {activeTab === 'add_fuel' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const odo = parseFloat(fuelOdometer);
              const lit = parseFloat(fuelLiters);
              const ppl = parseFloat(fuelPricePerLiter);
              if (!odo || odo <= 0) {
                toast.warning('يرجى إدخال قراءة العداد عند التفويل');
                return;
              }
              if (!lit || lit <= 0) {
                toast.warning('يرجى إدخال كمية الوقود باللتر');
                return;
              }
              if (!ppl || ppl <= 0) {
                toast.warning('يرجى إدخال سعر اللتر');
                return;
              }

              recordFuelMutation.mutate({
                vehicleId: vehicle.id,
                odometer: odo,
                liters: lit,
                pricePerLiter: ppl,
                stationName: fuelStationName.trim() || undefined,
                notes: fuelNotes.trim() || undefined,
              });
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  قراءة العداد عند التفويل (كم) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="number"
                  required
                  value={fuelOdometer}
                  onChange={(e) => setFuelOdometer(e.target.value)}
                  placeholder="مثال: 45200"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  كمية الوقود (لتر) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={fuelLiters}
                  onChange={(e) => setFuelLiters(e.target.value)}
                  placeholder="مثال: 45.5"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  سعر اللتر الواحد <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={fuelPricePerLiter}
                  onChange={(e) => setFuelPricePerLiter(e.target.value)}
                  placeholder="مثال: 2.33"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                  إجمالي المبلغ (محسوب تلقائياً)
                </label>
                <div
                  style={{
                    padding: '8px 10px',
                    borderRadius: '7px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: '13px',
                    fontWeight: 800,
                    color: '#170e5e',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {fuelLiters && fuelPricePerLiter
                    ? (parseFloat(fuelLiters) * parseFloat(fuelPricePerLiter)).toFixed(2)
                    : '0.00'}
                  <CurrencySymbol />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  اسم محطة الوقود
                </label>
                <input
                  type="text"
                  value={fuelStationName}
                  onChange={(e) => setFuelStationName(e.target.value)}
                  placeholder="مثال: محطة الدريس، ساسكو، وطنية..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  ملاحظات أو رقم الإيصال
                </label>
                <input
                  type="text"
                  value={fuelNotes}
                  onChange={(e) => setFuelNotes(e.target.value)}
                  placeholder="ملاحظات تفويل إضافية..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <Button variant="secondary" onClick={() => setActiveTab('fuel')}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={recordFuelMutation.isPending}
                style={{ backgroundColor: '#0284c7', color: '#ffffff', fontWeight: 700 }}
              >
                {recordFuelMutation.isPending ? 'جاري الحفظ...' : 'حفظ تفويل الوقود واحتساب الاستهلاك'}
              </Button>
            </div>
          </form>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
          <Button variant="secondary" onClick={onClose}>
            إغلاق النافذة
          </Button>
        </div>
      </div>
    </StandardDialog>
  );
}
