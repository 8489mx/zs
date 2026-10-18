import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { toast } from '@/shared/components/system-alert';
import { ToolIcon, AlertTriangleIcon } from '@/shared/components/icons/AppIcons';
import { vanSalesApi, type FleetVehicle } from '../api/van-sales.api';

export interface SendToMaintenanceModalProps {
  open: boolean;
  onClose: () => void;
  vehicles: FleetVehicle[];
  preselectedVehicle: FleetVehicle | null;
  onSuccess?: () => void;
}

export function SendToMaintenanceModal({
  open,
  onClose,
  vehicles,
  preselectedVehicle,
  onSuccess,
}: SendToMaintenanceModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [selectedVehicleId, setSelectedVehicleId] = useState<number | ''>('');
  const [maintenanceType, setMaintenanceType] = useState('mechanics');
  const [workshopName, setWorkshopName] = useState('');
  const [odometer, setOdometer] = useState<string>('');
  const [estimatedCost, setEstimatedCost] = useState<string>('');
  const [expectedDate, setExpectedDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  useEffect(() => {
    if (open) {
      if (preselectedVehicle) {
        setSelectedVehicleId(preselectedVehicle.id);
        setOdometer(String(preselectedVehicle.currentOdometer || ''));
      } else {
        const available = vehicles.find((v) => v.status !== 'maintenance');
        setSelectedVehicleId(available ? available.id : '');
        setOdometer(available ? String(available.currentOdometer || '') : '');
      }
      setMaintenanceType('mechanics');
      setWorkshopName('');
      setEstimatedCost('');
      setExpectedDate('');
      setReason('');
    }
  }, [open, preselectedVehicle, vehicles]);

  const targetVehicle = vehicles.find((v) => v.id === selectedVehicleId) || preselectedVehicle;

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!selectedVehicleId) throw new Error('يرجى اختيار المركبة');
      if (!reason.trim()) throw new Error('يرجى كتابة سبب الإدخال للصيانة ووصف العطل');

      const existingNotes = targetVehicle?.notes ? `${targetVehicle.notes} | ` : '';
      const maintenanceNote = `[تحويل للورشة: ${maintenanceType} - ${workshopName || 'ورشة عامة'}] ${reason.trim()} ${
        expectedDate ? `(تاريخ متوقع: ${expectedDate})` : ''
      }`;

      return vanSalesApi.updateVehicle(Number(selectedVehicleId), {
        status: 'maintenance',
        currentOdometer: odometer ? parseFloat(odometer) : undefined,
        notes: `${existingNotes}${maintenanceNote}`,
      });
    },
    onSuccess: () => {
      toast.success(`تم تحويل المركبة (${targetVehicle?.plateNumber || ''}) للصيانة والإصلاح بنجاح`);
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-maintenance-alerts'] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.message || 'فشل تحويل المركبة للصيانة');
    },
  });

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={t('delivery_reps.send_to_maintenance_modal.s0', "إدخال سيارة للصيانة والإصلاح بالورشة")}
      subtitle={
        targetVehicle
          ? `المركبة: ${targetVehicle.plateNumber} (${targetVehicle.modelName || t('delivery_reps.send_to_maintenance_modal.s1', "سيارة توزيع")}) • العداد: ${Number(
              targetVehicle.currentOdometer || 0,
            ).toLocaleString()} كم`
          : t('delivery_reps.send_to_maintenance_modal.s2', "تحديد المركبة المحولة للورشة وتسجيل بيان الأعمال")
      }
      maxWidth="620px"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMutation.mutate();
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
        dir="rtl"
      >
        {/* Warning Alert Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: '#fff7ed',
            border: '1px solid #ffedd5',
            padding: '10px 14px',
            borderRadius: '8px',
            color: '#c2410c',
            fontSize: '12px',
          }}
        >
          <AlertTriangleIcon size={16} color="#ea580c" />
          <span>
            {t('delivery_reps.send_to_maintenance_modal.s3', "تحويل المركبة إلى حالة")} <strong>{t('delivery_reps.send_to_maintenance_modal.s4', "\"تحت الصيانة والإصلاح\"")}</strong> {t('delivery_reps.send_to_maintenance_modal.s5', "سيوقف إسنادها لأي ورديات توزيع جديدة حتى إتمام\n            الإصلاح وإعادتها للخدمة.")}
          </span>
        </div>

        {/* Vehicle Select (if not preselected) */}
        {!preselectedVehicle && (
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              {t('delivery_reps.send_to_maintenance_modal.s6', "اختر المركبة من الأسطول")} <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={selectedVehicleId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setSelectedVehicleId(id);
                const found = vehicles.find((v) => v.id === id);
                if (found) setOdometer(String(found.currentOdometer || ''));
              }}
              required
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '7px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                boxSizing: 'border-box',
                background: '#ffffff',
              }}
            >
              <option value="">{t('delivery_reps.send_to_maintenance_modal.s7', "-- اختر السيارة المراد صيانتها --")}</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plateNumber} - {v.modelName || t('delivery_reps.send_to_maintenance_modal.s8', "بدون موديل")} ({v.status === 'assigned' ? t('delivery_reps.send_to_maintenance_modal.s9', "مسندة لسائق") : t('delivery_reps.send_to_maintenance_modal.s10', "متاحة")})
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              {t('delivery_reps.send_to_maintenance_modal.s11', "نوع ومجال الصيانة")} <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={maintenanceType}
              onChange={(e) => setMaintenanceType(e.target.value)}
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
              <option value={t('delivery_reps.send_to_maintenance_modal.s12', "صيانة دورية وفحص شامل")}>{t('delivery_reps.send_to_maintenance_modal.s13', "صيانة دورية وفحص شامل")}</option>
              <option value={t('delivery_reps.send_to_maintenance_modal.s14', "ميكانيكا ومحرك")}>{t('delivery_reps.send_to_maintenance_modal.s15', "ميكانيكا ومحرك")}</option>
              <option value={t('delivery_reps.send_to_maintenance_modal.s16', "كهرباء وتكييف")}>{t('delivery_reps.send_to_maintenance_modal.s17', "كهرباء وتكييف")}</option>
              <option value={t('delivery_reps.send_to_maintenance_modal.s18', "فرامل ونظام تعليق")}>{t('delivery_reps.send_to_maintenance_modal.s19', "فرامل ونظام تعليق (عفشة)")}</option>
              <option value={t('delivery_reps.send_to_maintenance_modal.s20', "إطارات وبطارية")}>{t('delivery_reps.send_to_maintenance_modal.s21', "إطارات وبطارية")}</option>
              <option value={t('delivery_reps.send_to_maintenance_modal.s22', "سمكرة ودهان")}>{t('delivery_reps.send_to_maintenance_modal.s23', "سمكرة ودهان")}</option>
              <option value={t('delivery_reps.send_to_maintenance_modal.s24', "إصلاح طارئ أو حادث")}>{t('delivery_reps.send_to_maintenance_modal.s25', "إصلاح طارئ أو حادث")}</option>
              <option value={t('delivery_reps.send_to_maintenance_modal.s26', "أخرى")}>{t('delivery_reps.send_to_maintenance_modal.s27', "أعمال صيانة أخرى")}</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              {t('delivery_reps.send_to_maintenance_modal.s28', "مركز الصيانة / الورشة")}
            </label>
            <input
              type="text"
              value={workshopName}
              onChange={(e) => setWorkshopName(e.target.value)}
              placeholder={t('delivery_reps.send_to_maintenance_modal.s29', "مثال: ورشة الشركة المركزية، مركز السلام...")}
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
              {t('delivery_reps.send_to_maintenance_modal.s30', "العداد عند الدخول (كم)")}
            </label>
            <input
              type="number"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              placeholder={t('delivery_reps.send_to_maintenance_modal.s31', "مثال: 45000")}
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
              {t('delivery_reps.send_to_maintenance_modal.s32', "التكلفة التقديرية")}
            </label>
            <input
              type="number"
              step="0.01"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
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
              {t('delivery_reps.send_to_maintenance_modal.s33', "تاريخ الخروج المتوقع")}
            </label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
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

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
            {t('delivery_reps.send_to_maintenance_modal.s34', "سبب الإدخال للصيانة ووصف العطل المطلوب إصلاحه")} <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <textarea
            required
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('delivery_reps.send_to_maintenance_modal.s35', "اكتب بالتفصيل المشكلة أو الفحص المطلوب تنفيذه بالسيارة...")}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '7px',
              border: '1px solid #cbd5e1',
              fontSize: '12.5px',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
          <Button variant="secondary" onClick={onClose}>
            {t('delivery_reps.send_to_maintenance_modal.s36', "إلغاء")}
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={sendMutation.isPending}
            style={{ backgroundColor: '#ea580c', color: '#ffffff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ToolIcon size={14} />
            {sendMutation.isPending ? t('delivery_reps.send_to_maintenance_modal.s37', "جاري التحويل...") : t('delivery_reps.send_to_maintenance_modal.s38', "تأكيد تحويل المركبة للصيانة")}
          </Button>
        </div>
      </form>
    </StandardDialog>
  );
}
