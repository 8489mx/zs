import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { systemAlert } from '@/shared/components/system-alert';
import { XIcon, TruckIcon } from '@/shared/components/icons/AppIcons';
import { vanSalesApi, type FleetVehicle } from '../api/van-sales.api';
import type { DeliveryRep } from '@/shared/api/delivery-reps.api';

export interface AssignDriverModalProps {
  open: boolean;
  onClose: () => void;
  vehicle: FleetVehicle | null;
  reps: DeliveryRep[];
  onSuccess?: () => void;
}

export function AssignDriverModal({
  open,
  onClose,
  vehicle,
  reps,
  onSuccess,
}: AssignDriverModalProps) {
  const queryClient = useQueryClient();
  const [selectedRepId, setSelectedRepId] = useState<number | ''>('');
  const [shiftName, setShiftName] = useState('وردية صباحية');

  useEffect(() => {
    if (open && vehicle) {
      setSelectedRepId(vehicle.assignedRepId || '');
      setShiftName('وردية صباحية');
    }
  }, [open, vehicle]);

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!vehicle) return;
      return vanSalesApi.assignVehicleRep(vehicle.id, {
        repId: selectedRepId ? Number(selectedRepId) : null,
        shiftName: shiftName.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-reps'] });
      systemAlert(
        selectedRepId
          ? 'تم تعيين السائق للمركبة وتحديث مستودع الفان بنجاح'
          : 'تم فك ارتباط السائق بالمركبة وأصبحت متاحة للتشغيل'
      );
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      systemAlert(error.message || 'حدث خطأ أثناء تحديث تعيين السائق');
    },
  });

  if (!vehicle) return null;

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      width="min(480px, 95vw)"
      ariaLabel="تخصيص سائق للمركبة والوردية"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 24px' }} dir="rtl">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#f0fdf4',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TruckIcon size={20} color="#16a34a" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                تخصيص سائق: {vehicle.plateNumber}
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {vehicle.modelName || 'سيارة توزيع'} - {vehicle.vanLocationName}
              </span>
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
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <XIcon size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              اختيار المندوب / السائق المسند له
            </label>
            <select
              value={selectedRepId}
              onChange={(e) => setSelectedRepId(e.target.value ? Number(e.target.value) : '')}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '7px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                boxSizing: 'border-box',
                background: '#ffffff',
              }}
            >
              <option value="">-- بدون سائق (إخلاء المركبة / متاحة) --</option>
              {reps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.phone ? `(${r.phone})` : ''} - {r.is_van_rep ? 'مندوب فان' : 'مندوب دليفري'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              الوردية التشغيلية
            </label>
            <select
              value={shiftName}
              onChange={(e) => setShiftName(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '7px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                boxSizing: 'border-box',
                background: '#ffffff',
              }}
            >
              <option value="وردية صباحية">وردية صباحية (08:00 ص - 04:00 م)</option>
              <option value="وردية مسائية">وردية مسائية (04:00 م - 12:00 ص)</option>
              <option value="وردية كاملة">وردية كاملة طوال اليوم</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
          <Button variant="secondary" onClick={onClose} style={{ minHeight: '36px', padding: '0 16px' }}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            style={{ background: '#170e5e', minHeight: '36px', padding: '0 20px', fontWeight: 700 }}
            onClick={() => assignMutation.mutate()}
            disabled={assignMutation.isPending}
          >
            {assignMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعيين'}
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
