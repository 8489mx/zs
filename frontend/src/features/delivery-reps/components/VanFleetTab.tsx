import React, { useState } from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { Button } from '@/shared/ui/button';
import { toast } from '@/shared/components/system-alert';
import { vanSalesApi, FleetFuelLogRecord, FleetMaintenanceAlert } from '../api/van-sales.api';
import { TruckIcon, AlertTriangleIcon, CheckCircleIcon } from '@/shared/components/icons/AppIcons';

interface VanFleetTabProps {
  vehicle?: {
    id?: number;
    plate?: string;
    model?: string;
    startOdometer?: number;
    endOdometer?: number;
  };
  tripId?: number;
  maintenanceAlerts: FleetMaintenanceAlert[];
  fuelLogs: FleetFuelLogRecord[];
  onRefreshFuel: () => void;
}

export const VanFleetTab: React.FC<VanFleetTabProps> = ({
  vehicle,
  tripId,
  maintenanceAlerts,
  fuelLogs,
  onRefreshFuel,
}) => {
  const [odometer, setOdometer] = useState<string>('');
  const [liters, setLiters] = useState<string>('');
  const [pricePerLiter, setPricePerLiter] = useState<string>('');
  const [stationName, setStationName] = useState<string>('');
  const [fuelNotes, setFuelNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const numLiters = parseFloat(liters) || 0;
  const numPpl = parseFloat(pricePerLiter) || 0;
  const calculatedTotal = (numLiters * numPpl).toFixed(2);

  const handleRecordFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    const odo = parseFloat(odometer);
    if (!vehicle?.id) {
      toast.error('لم يتم ربط مركبة بهذه الرحلة');
      return;
    }
    if (!odo || odo <= 0) {
      toast.warning('يرجى إدخال قراءة عداد الكيلومترات الحالية');
      return;
    }
    if (!numLiters || numLiters <= 0) {
      toast.warning('يرجى إدخال عدد اللترات');
      return;
    }
    if (!numPpl || numPpl <= 0) {
      toast.warning('يرجى إدخال سعر اللتر');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await vanSalesApi.recordDriverFuelLog({
        vehicleId: vehicle.id,
        tripId,
        odometer: odo,
        liters: numLiters,
        pricePerLiter: numPpl,
        stationName: stationName.trim() || undefined,
        notes: fuelNotes.trim() || undefined,
      });

      toast.success(
        `تم تسجيل التفويل بنجاح! التكلفة: ${res.totalCost} | المسافة: ${res.kmSinceLastFuel} كم | معدل الاستهلاك: ${res.consumptionRate} كم/لتر`,
      );
      setOdometer('');
      setLiters('');
      setPricePerLiter('');
      setStationName('');
      setFuelNotes('');
      onRefreshFuel();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تسجيل التفويل');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Vehicle Info Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#eef2ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TruckIcon size={20} color="#170e5e" />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
              سيارة التوزيع: {vehicle?.plate || 'غير محدد'}
            </h4>
            <span style={{ fontSize: '11.5px', color: '#64748b' }}>
              {vehicle?.model || 'مركبة أسطول'} {vehicle?.startOdometer ? ` | عداد البداية: ${vehicle.startOdometer} كم` : ''}
            </span>
          </div>
        </div>

        {/* Maintenance & License Alerts */}
        {maintenanceAlerts.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
            {maintenanceAlerts.map((alt) => (
              <div
                key={alt.id}
                style={{
                  backgroundColor: alt.severity === 'critical' ? '#fef2f2' : '#fffbeb',
                  border: `1px solid ${alt.severity === 'critical' ? '#fecaca' : '#fde68a'}`,
                  borderRadius: '8px',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <div style={{ marginTop: '2px', color: alt.severity === 'critical' ? '#dc2626' : '#d97706' }}>
                  <AlertTriangleIcon size={16} />
                </div>
                <div>
                  <h5 style={{ margin: '0 0 2px', fontSize: '12px', fontWeight: 800, color: alt.severity === 'critical' ? '#991b1b' : '#92400e' }}>
                    {alt.title}
                  </h5>
                  <p style={{ margin: 0, fontSize: '11px', color: alt.severity === 'critical' ? '#b91c1c' : '#b45309', lineHeight: 1.4 }}>
                    {alt.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11.5px',
              color: '#166534',
              fontWeight: 700,
              marginTop: '6px',
            }}
          >
            <CheckCircleIcon size={14} color="#16a34a" />
            <span>حالة السيارة ممتازة: لا توجد تنبيهات غيار زيت أو انتهاء رخصة معلقة.</span>
          </div>
        )}
      </div>

      {/* Fuel Log Form */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 800, color: '#170e5e', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
          تسجيل تفويل وقود وحساب معدل الاستهلاك
        </h4>

        <form onSubmit={handleRecordFuel} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                قراءة العداد (كم):
              </label>
              <input
                type="number"
                step="0.1"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                placeholder="مثال: 45200"
                required
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                الكمية (لتر):
              </label>
              <input
                type="number"
                step="0.1"
                value={liters}
                onChange={(e) => setLiters(e.target.value)}
                placeholder="مثال: 40"
                required
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                سعر اللتر:
              </label>
              <input
                type="number"
                step="0.01"
                value={pricePerLiter}
                onChange={(e) => setPricePerLiter(e.target.value)}
                placeholder="مثال: 15.50"
                required
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                محطة الوقود:
              </label>
              <input
                type="text"
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                placeholder="محطة مصر للبترول / التعاون"
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#f1f5f9',
              padding: '8px 12px',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
            }}
          >
            <span>التكلفة الإجمالية المحسوبة:</span>
            <strong style={{ color: '#059669', fontSize: '14px' }}>
              {calculatedTotal} <CurrencySymbol />
            </strong>
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            style={{ backgroundColor: '#170e5e', color: '#ffffff', fontSize: '12.5px', fontWeight: 800, height: '36px' }}
          >
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ عملية التفويل وحساب الاستهلاك'}
          </Button>
        </form>
      </div>

      {/* Recent Fuel Logs Table */}
      {fuelLogs.length > 0 && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
            سجل التفويلات السابقة للمركبة
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {fuelLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}
              >
                <div>
                  <strong style={{ color: '#0f172a' }}>{log.liters} لتر</strong>
                  <span style={{ color: '#64748b' }}> بسعر {log.pricePerLiter} (الإجمالي: {log.totalCost} <CurrencySymbol />)</span>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                    قراءة العداد: {log.odometer} كم {log.stationName ? `| ${log.stationName}` : ''}
                  </div>
                </div>

                <div style={{ textAlign: 'left' }}>
                  {log.consumptionRate > 0 && (
                    <span
                      style={{
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 800,
                        display: 'block',
                      }}
                    >
                      {log.consumptionRate} كم / لتر
                    </span>
                  )}
                  <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                    قطع {log.kmSinceLastFuel} كم
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
