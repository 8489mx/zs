import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { toast } from '@/shared/components/system-alert';
import { CheckCircleIcon } from '@/shared/components/icons/AppIcons';
import { vanSalesApi, type FleetVehicle } from '../api/van-sales.api';

export interface CompleteMaintenanceModalProps {
  open: boolean;
  onClose: () => void;
  vehicle: FleetVehicle | null;
  onSuccess?: () => void;
}

export function CompleteMaintenanceModal({
  open,
  onClose,
  vehicle,
  onSuccess,
}: CompleteMaintenanceModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [actualCost, setActualCost] = useState<string>('');
  const [invoiceNo, setInvoiceNo] = useState<string>('');
  const [odometer, setOdometer] = useState<string>('');
  const [completionNotes, setCompletionNotes] = useState<string>('');
  const [targetStatus, setTargetStatus] = useState<'available' | 'assigned'>('available');

  useEffect(() => {
    if (open && vehicle) {
      setActualCost('');
      setInvoiceNo('');
      setOdometer(String(vehicle.currentOdometer || ''));
      setCompletionNotes('');
      setTargetStatus(vehicle.assignedRepId ? 'assigned' : 'available');
    }
  }, [open, vehicle]);

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!vehicle) return;

      const existingNotes = vehicle.notes ? `${vehicle.notes} | ` : '';
      const completionRecord = `[تم إتمام الصيانة]: فاتورة ${invoiceNo || 'بدون'} - تكلفة ${actualCost || '0'} - ${completionNotes.trim()} (${new Date().toLocaleDateString('ar-EG')})`;

      return vanSalesApi.updateVehicle(vehicle.id, {
        status: targetStatus,
        currentOdometer: odometer ? parseFloat(odometer) : undefined,
        notes: `${existingNotes}${completionRecord}`,
      });
    },
    onSuccess: () => {
      toast.success(`تم إتمام صيانة المركبة (${vehicle?.plateNumber}) وإعادتها للخدمة بنجاح`);
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-maintenance-alerts'] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.message || 'فشل إتمام الصيانة');
    },
  });

  if (!vehicle) return null;

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={`إتمام صيانة المركبة: ${vehicle.plateNumber}`}
      subtitle={`${vehicle.modelName || t('delivery_reps.complete_maintenance_modal.s0', "سيارة توزيع")} • خروج من الورشة وإعادة لأسطول التشغيل`}
      maxWidth="560px"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          completeMutation.mutate();
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
        dir="rtl"
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: '#ecfdf5',
            border: '1px solid #d1fae5',
            padding: '10px 14px',
            borderRadius: '8px',
            color: '#065f46',
            fontSize: '12px',
          }}
        >
          <CheckCircleIcon size={16} color="#059669" />
          <span>
            {t('delivery_reps.complete_maintenance_modal.s1', "سيتم خروج المركبة من الورشة وتحديث حالتها إلى")} <strong>{t('delivery_reps.complete_maintenance_modal.s2', "\"جاهزة للتشغيل\"")}</strong> {t('delivery_reps.complete_maintenance_modal.s3', "وإتاحتها فوراً لبدء ورديات التوزيع ومبيعات الفان.")}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              {t('delivery_reps.complete_maintenance_modal.s4', "التكلفة الفعلية للصيانة والإصلاح")}
            </label>
            <input
              type="number"
              step="0.01"
              value={actualCost}
              onChange={(e) => setActualCost(e.target.value)}
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
              {t('delivery_reps.complete_maintenance_modal.s5', "رقم الفاتورة / إيصال الورشة")}
            </label>
            <input
              type="text"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              placeholder={t('delivery_reps.complete_maintenance_modal.s6', "مثال: INV-9842")}
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
              {t('delivery_reps.complete_maintenance_modal.s7', "العداد الحالي بعد الصيانة (كم)")}
            </label>
            <input
              type="number"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              placeholder={t('delivery_reps.complete_maintenance_modal.s8', "مثال: 45050")}
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
              {t('delivery_reps.complete_maintenance_modal.s9', "حالة المركبة بعد الخروج")}
            </label>
            <select
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value as any)}
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
              <option value="available">{t('delivery_reps.complete_maintenance_modal.s10', "متاحة وجاهزة للإسناد (Available)")}</option>
              {vehicle.assignedRepId && (
                <option value="assigned">{t('delivery_reps.complete_maintenance_modal.s11', "مسندة مباشرة للسائق (")}{vehicle.assignedRepName})</option>
              )}
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
            {t('delivery_reps.complete_maintenance_modal.s12', "تقرير الصيانة وما تم إنجازه")}
          </label>
          <textarea
            rows={2}
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
            placeholder={t('delivery_reps.complete_maintenance_modal.s13', "مثال: تم تغيير تيل الفرامل الأمامي والخلفي، وعمل ضبط زوايا وترصيص...")}
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
            {t('delivery_reps.complete_maintenance_modal.s14', "إلغاء")}
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={completeMutation.isPending}
            style={{ backgroundColor: '#15803d', color: '#ffffff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <CheckCircleIcon size={14} />
            {completeMutation.isPending ? t('delivery_reps.complete_maintenance_modal.s15', "جاري الإتمام...") : t('delivery_reps.complete_maintenance_modal.s16', "تأكيد إتمام الصيانة وإعادة للخدمة")}
          </Button>
        </div>
      </form>
    </StandardDialog>
  );
}
