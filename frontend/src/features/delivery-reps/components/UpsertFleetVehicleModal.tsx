import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { systemAlert } from '@/shared/components/system-alert';
import { XIcon, TruckIcon } from '@/shared/components/icons/AppIcons';
import { vanSalesApi, type FleetVehicle } from '../api/van-sales.api';
import type { DeliveryRep } from '@/shared/api/delivery-reps.api';

export interface UpsertFleetVehicleModalProps {
  open: boolean;
  onClose: () => void;
  vehicle?: FleetVehicle | null;
  reps: DeliveryRep[];
  onSuccess?: (vehicles: FleetVehicle[]) => void;
}

export function UpsertFleetVehicleModal({
  open,
  onClose,
  vehicle,
  reps,
  onSuccess,
}: UpsertFleetVehicleModalProps) {
  const queryClient = useQueryClient();

  const [plateNumber, setPlateNumber] = useState('');
  const [modelName, setModelName] = useState('');
  const [vehicleType, setVehicleType] = useState('van');
  const [vinChassis, setVinChassis] = useState('');
  const [currentOdometer, setCurrentOdometer] = useState<number>(0);
  const [fuelType, setFuelType] = useState('gasoline');
  const [licenseExpiresAt, setLicenseExpiresAt] = useState('');
  const [assignedRepId, setAssignedRepId] = useState<number | ''>('');
  const [status, setStatus] = useState<string>('available');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      if (vehicle) {
        setPlateNumber(vehicle.plateNumber || '');
        setModelName(vehicle.modelName || '');
        setVehicleType(vehicle.vehicleType || 'van');
        setVinChassis(vehicle.vinChassis || '');
        setCurrentOdometer(Number(vehicle.currentOdometer) || 0);
        setFuelType(vehicle.fuelType || 'gasoline');
        setLicenseExpiresAt(vehicle.licenseExpiresAt ? vehicle.licenseExpiresAt.split('T')[0] : '');
        setAssignedRepId(vehicle.assignedRepId || '');
        setStatus(vehicle.status || 'available');
        setNotes(vehicle.notes || '');
      } else {
        setPlateNumber('');
        setModelName('');
        setVehicleType('van');
        setVinChassis('');
        setCurrentOdometer(0);
        setFuelType('gasoline');
        setLicenseExpiresAt('');
        setAssignedRepId('');
        setStatus('available');
        setNotes('');
      }
    }
  }, [open, vehicle]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        plateNumber: plateNumber.trim(),
        modelName: modelName.trim() || undefined,
        vehicleType,
        vinChassis: vinChassis.trim() || undefined,
        currentOdometer: Number(currentOdometer) || 0,
        fuelType,
        licenseExpiresAt: licenseExpiresAt || undefined,
        assignedRepId: assignedRepId ? Number(assignedRepId) : undefined,
        notes: notes.trim() || undefined,
        status,
      };

      if (vehicle) {
        return vanSalesApi.updateVehicle(vehicle.id, payload);
      }
      return vanSalesApi.createVehicle(payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-reps'] });
      systemAlert(vehicle ? 'تم تحديث بيانات المركبة بنجاح' : 'تم تسجيل المركبة وإنشاء مستودعها المتنقل بنجاح');
      onSuccess?.(data);
      onClose();
    },
    onError: (error: any) => {
      if (error?.status === 403 || error?.details?.statusCode === 403) {
        systemAlert('ليس لديك صلاحية لإدارة أسطول المركبات');
      } else {
        systemAlert(error.message || 'حدث خطأ أثناء حفظ بيانات المركبة');
      }
    },
  });

  const handleSave = () => {
    if (!plateNumber.trim()) {
      systemAlert('يرجى إدخال رقم لوحة المركبة');
      return;
    }
    saveMutation.mutate();
  };

  const isSaving = saveMutation.isPending;

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      width="min(640px, 95vw)"
      ariaLabel={vehicle ? 'تعديل بيانات المركبة' : 'تسجيل مركبة جديدة في الأسطول'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', padding: '20px 24px' }} dir="rtl">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              <TruckIcon size={20} color="#0284c7" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                {vehicle ? `تعديل مركبة: ${vehicle.plateNumber}` : 'إضافة سيارة جديدة لأسطول الشركة'}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                سيتم تلقائياً ربط المركبة بمستودع مخزني متنقل (Van Stock) للتحميل والبيع الميداني
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#64748b',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Form Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Row 1: Plate & Model */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                رقم اللوحة المعدنية *
              </label>
              <input
                type="text"
                placeholder="مثال: 5678 ن و ر"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                موديل وطراز المركبة
              </label>
              <input
                type="text"
                placeholder="مثال: تويوتا هايس 2024 / شيفروليه جامبو"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Row 2: Vehicle Type & Fuel Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                نوع المركبة والتجهيز
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  background: '#ffffff',
                }}
              >
                <option value="van">سيارة فان مغلقة (توزيع منتجات)</option>
                <option value="pickup">سيارة ربع نقل / بيك أب</option>
                <option value="truck">شاحنة توزيع متوسطة (جامبو)</option>
                <option value="tricycle">تروسيكل / مركبة ثلاثية</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                نوع الوقود
              </label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  background: '#ffffff',
                }}
              >
                <option value="gasoline">بنزين (Gasoline)</option>
                <option value="diesel">سولار / ديزل (Diesel)</option>
                <option value="natural_gas">غاز طبيعي (CNG)</option>
                <option value="electric">كهرباء (Electric)</option>
              </select>
            </div>
          </div>

          {/* Row 3: Odometer & Chassis */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                قراءة العداد الحالية (كم)
              </label>
              <input
                type="number"
                min={0}
                value={currentOdometer}
                onChange={(e) => setCurrentOdometer(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  direction: 'ltr',
                  textAlign: 'right',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                رقم الشاسيه (VIN)
              </label>
              <input
                type="text"
                placeholder="رقم الشاسيه من واقع الرخصة"
                value={vinChassis}
                onChange={(e) => setVinChassis(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  direction: 'ltr',
                  textAlign: 'right',
                }}
              />
            </div>
          </div>

          {/* Row 4: Assigned Rep & License Expiry */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                المندوب / السائق المسند له المركبة
              </label>
              <select
                value={assignedRepId}
                onChange={(e) => setAssignedRepId(e.target.value ? Number(e.target.value) : '')}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  background: '#ffffff',
                }}
              >
                <option value="">-- بدون سائق حالياً (متاحة) --</option>
                {reps.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name} {rep.phone ? `(${rep.phone})` : ''} - {rep.is_van_rep ? 'مندوب فان' : 'مندوب دليفري'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                تاريخ انتهاء رخصة التسيير
              </label>
              <input
                type="date"
                value={licenseExpiresAt}
                onChange={(e) => setLicenseExpiresAt(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Row 5: Status (if editing) & Notes */}
          {vehicle && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                حالة المركبة التشغيلية
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  background: '#ffffff',
                }}
              >
                <option value="available">متاحة وجاهزة للتشغيل (Available)</option>
                <option value="assigned">مسندة لسائق وفي الخدمة (Assigned)</option>
                <option value="maintenance">تحت الصيانة والإصلاح (Maintenance)</option>
                <option value="retired">مستبعدة من الخدمة (Retired)</option>
              </select>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              ملاحظات إضافية
            </label>
            <textarea
              rows={2}
              placeholder="مثال: موعد الصيانة الدورية، حالة الإطارات، تعليمات السائق..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '7px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                boxSizing: 'border-box',
                resize: 'none',
              }}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
          <Button variant="secondary" onClick={onClose} style={{ minHeight: '38px', padding: '0 18px' }}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!plateNumber.trim() || isSaving}
            style={{ minHeight: '38px', padding: '0 24px', fontWeight: 700, background: '#170e5e' }}
          >
            {isSaving ? 'جاري الحفظ...' : vehicle ? 'تحديث بيانات المركبة' : 'تسجيل المركبة بالأسطول'}
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
