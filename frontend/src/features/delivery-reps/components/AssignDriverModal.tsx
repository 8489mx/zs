import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { toast, systemConfirm } from '@/shared/components/system-alert';
import { UsersIcon, Trash2Icon } from '@/shared/components/icons/AppIcons';
import { vanSalesApi, type FleetVehicle, type VehicleDriverShiftRecord } from '../api/van-sales.api';
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
  const [shiftStartTime, setShiftStartTime] = useState('08:00');
  const [shiftEndTime, setShiftEndTime] = useState('16:00');
  const [shiftNotes, setShiftNotes] = useState('');

  // 1. Fetch current drivers assigned to this vehicle
  const { data: assignedDrivers = [], isLoading } = useQuery<VehicleDriverShiftRecord[]>({
    queryKey: ['vehicle-drivers', vehicle?.id],
    queryFn: () => vanSalesApi.fetchVehicleDrivers(vehicle!.id),
    enabled: open && Boolean(vehicle),
  });

  // Assign driver shift mutation
  const assignDriverMutation = useMutation({
    mutationFn: (payload: { repId: number; shiftName: string; shiftStartTime?: string; shiftEndTime?: string; notes?: string }) =>
      vanSalesApi.assignVehicleDriver(vehicle!.id, payload),
    onSuccess: () => {
      toast.success('تم تخصيص السائق والوردية للمركبة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['vehicle-drivers', vehicle?.id] });
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] });
      setSelectedRepId('');
      setShiftNotes('');
      onSuccess?.();
    },
    onError: (err: any) => {
      toast.error(err?.message || 'فشل تخصيص السائق');
    },
  });

  // Remove driver shift mutation
  const removeDriverMutation = useMutation({
    mutationFn: (driverId: number) => vanSalesApi.removeVehicleDriver(vehicle!.id, driverId),
    onSuccess: () => {
      toast.info('تم فك ارتباط السائق بالمركبة');
      queryClient.invalidateQueries({ queryKey: ['vehicle-drivers', vehicle?.id] });
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] });
      onSuccess?.();
    },
    onError: (err: any) => {
      toast.error(err?.message || 'فشل إزالة السائق');
    },
  });

  if (!vehicle) return null;

  const handleAddDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepId) {
      toast.warning('يرجى اختيار السائق');
      return;
    }
    assignDriverMutation.mutate({
      repId: Number(selectedRepId),
      shiftName,
      shiftStartTime: shiftStartTime || undefined,
      shiftEndTime: shiftEndTime || undefined,
      notes: shiftNotes.trim() || undefined,
    });
  };

  const handleRemoveDriver = async (driver: VehicleDriverShiftRecord) => {
    const ok = await systemConfirm({
      title: 'إلغاء تخصيص السائق',
      message: `هل أنت متأكد من فك ارتباط السائق "${driver.repName}" من وردية "${driver.shiftName}" لهذه المركبة؟`,
      confirmText: 'نعم، فك الارتباط',
      cancelText: 'إلغاء',
      variant: 'danger',
    });
    if (ok) {
      removeDriverMutation.mutate(driver.id);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={`إدارة سائقي وورديات المركبة: ${vehicle.plateNumber}`}
      subtitle={`${vehicle.modelName || 'سيارة توزيع'} • المستودع: ${vehicle.vanLocationName}`}
      maxWidth="580px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
        {/* Current Assigned Drivers List */}
        <div>
          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 800, color: '#170e5e', marginBottom: '8px' }}>
            السائقون والورديات المخصصة حالياً على هذه السيارة ({assignedDrivers.length}):
          </label>

          {isLoading ? (
            <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
              جاري فحص السائقين والورديات...
            </div>
          ) : assignedDrivers.length === 0 ? (
            <div
              style={{
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '8px',
                padding: '14px',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '12px',
              }}
            >
              المركبة لا يوجد عليها أي سائق مسند حالياً (متاحة للتشغيل).
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {assignedDrivers.map((d) => (
                <div
                  key={d.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        background: '#e0f2fe',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <UsersIcon size={16} color="#0369a1" />
                    </div>
                    <div>
                      <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>
                        {d.repName}
                      </strong>
                      <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ color: '#170e5e', fontWeight: 700 }}>{d.shiftName}</span>
                        {(d.shiftStartTime || d.shiftEndTime) && (
                          <span>
                            ({d.shiftStartTime || '—'} إلى {d.shiftEndTime || '—'})
                          </span>
                        )}
                        {d.repPhone && <span>• {d.repPhone}</span>}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveDriver(d)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="فك ارتباط السائق"
                  >
                    <Trash2Icon size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Driver & Shift Form */}
        <form
          onSubmit={handleAddDriver}
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>
            + تخصيص سائق ووردية جديدة للمركبة:
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              اختر السائق / مندوب الفان <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={selectedRepId}
              onChange={(e) => setSelectedRepId(e.target.value ? Number(e.target.value) : '')}
              required
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
              <option value="">-- اختر السائق من قائمة المناديب --</option>
              {reps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.phone ? `(${r.phone})` : ''} - {r.is_van_rep ? 'مندوب فان' : 'مندوب توصيل'}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                مسمى الوردية
              </label>
              <select
                value={shiftName}
                onChange={(e) => {
                  const val = e.target.value;
                  setShiftName(val);
                  if (val === 'وردية صباحية') {
                    setShiftStartTime('08:00');
                    setShiftEndTime('16:00');
                  } else if (val === 'وردية مسائية') {
                    setShiftStartTime('16:00');
                    setShiftEndTime('00:00');
                  } else if (val === 'وردية ليلية') {
                    setShiftStartTime('00:00');
                    setShiftEndTime('08:00');
                  }
                }}
                style={{
                  width: '100%',
                  padding: '7px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                  background: '#ffffff',
                }}
              >
                <option value="وردية صباحية">وردية صباحية</option>
                <option value="وردية مسائية">وردية مسائية</option>
                <option value="وردية ليلية">وردية ليلية</option>
                <option value="وردية كاملة">وردية كاملة</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                بداية الوردية
              </label>
              <input
                type="time"
                value={shiftStartTime}
                onChange={(e) => setShiftStartTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                نهاية الوردية
              </label>
              <input
                type="time"
                value={shiftEndTime}
                onChange={(e) => setShiftEndTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              ملاحظات تشغيلية
            </label>
            <input
              type="text"
              placeholder="مثال: تبديل الوردية في محطة الرماية الساعة 4 عصراً..."
              value={shiftNotes}
              onChange={(e) => setShiftNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
            <Button
              type="submit"
              variant="primary"
              disabled={assignDriverMutation.isPending}
              style={{ background: '#170e5e', color: '#ffffff', fontSize: '12px', fontWeight: 700 }}
            >
              {assignDriverMutation.isPending ? 'جاري التخصيص...' : '+ إضافة السائق للمركبة'}
            </Button>
          </div>
        </form>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
          <Button variant="secondary" onClick={onClose} style={{ fontSize: '12px' }}>
            إغلاق
          </Button>
        </div>
      </div>
    </StandardDialog>
  );
}
