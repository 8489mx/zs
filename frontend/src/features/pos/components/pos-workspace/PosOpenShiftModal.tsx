import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Field } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';
import { SubmitButton } from '@/shared/components/submit-button';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { cashDrawerApi } from '@/lib/api/cash-drawer';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import type { Branch, Location } from '@/types/domain';

export interface PosOpenShiftModalProps {
  open: boolean;
  onClose: () => void;
  branches: Branch[];
  locations: Location[];
  defaultBranchId?: string | number | null;
  defaultLocationId?: string | number | null;
  onShiftOpened: () => void;
}

interface OpenShiftFormValues {
  openingCash: number;
  branchId: string;
  locationId: string;
  note: string;
}

export function PosOpenShiftModal(props: PosOpenShiftModalProps) {
  const { open, onClose, branches, locations, defaultBranchId, defaultLocationId, onShiftOpened } = props;
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const locationList = Array.isArray(locations) ? locations : [];
  const branchList = Array.isArray(branches) ? branches : [];

  const { register, handleSubmit, setValue, watch, reset } = useForm<OpenShiftFormValues>({
    defaultValues: {
      openingCash: 0,
      branchId: defaultBranchId ? String(defaultBranchId) : '',
      locationId: defaultLocationId ? String(defaultLocationId) : '',
      note: '',
    },
  });

  const watchedBranchId = watch('branchId');

  const availableLocations = useMemo(() => {
    if (!watchedBranchId) return locationList;
    const branchSpecific = locationList.filter((loc) => !loc.branchId || String(loc.branchId) === String(watchedBranchId));
    return branchSpecific.length > 0 ? branchSpecific : locationList;
  }, [locationList, watchedBranchId]);

  useEffect(() => {
    if (open) {
      setError(null);
      setIsSuccess(false);

      const effectiveBranchId = defaultBranchId
        ? String(defaultBranchId)
        : (branchList.length > 0 ? String(branchList[0].id) : '');

      const branchObj = branchList.find(b => String(b.id) === effectiveBranchId);
      const branchLocs = locationList.filter(l => !l.branchId || String(l.branchId) === effectiveBranchId);
      const defaultLoc = (defaultLocationId && locationList.find(l => String(l.id) === String(defaultLocationId)))
        || (branchObj?.defaultStockLocationId && locationList.find(l => String(l.id) === String(branchObj.defaultStockLocationId)))
        || branchLocs.find(l => l.name.includes('الرئيسي') || l.name.toLowerCase().includes('main'))
        || branchLocs[0]
        || locationList[0];

      reset({
        openingCash: 0,
        branchId: effectiveBranchId,
        locationId: defaultLoc?.id ? String(defaultLoc.id) : '',
        note: '',
      });
    }
  }, [open, defaultBranchId, defaultLocationId, branchList, locationList, reset]);

  const onSubmit = async (values: OpenShiftFormValues) => {
    setIsPending(true);
    setError(null);
    try {
      await cashDrawerApi.open({
        openingCash: Number(values.openingCash || 0),
        branchId: values.branchId ? Number(values.branchId) : null,
        locationId: values.locationId ? Number(values.locationId) : null,
        note: String(values.note || '').trim(),
      });
      setIsSuccess(true);
      setTimeout(() => {
        onShiftOpened();
        onClose();
      }, 500);
    } catch (err) {
      setError(err);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <DialogShell open={open} onClose={onClose} width="min(520px, 95vw)">
      <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '12px',
            background: '#ecfdf5',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            border: '1px solid #a7f3d0'
          }}>
            💵
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>فتح وردية كاشير جديدة</h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#64748b' }}>أدخل عهدة البداية وحدد نقطة التشغيل لبدء البيع فوراً</p>
          </div>
        </div>

        <form className="form-grid" onSubmit={handleSubmit(onSubmit)}>
          <Field label="رصيد الفتح (العهدة النقدية بالدرج)">
            <input
              type="number"
              step="0.01"
              autoFocus
              {...register('openingCash', { valueAsNumber: true })}
              disabled={isPending}
              placeholder="0.00"
              style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}
            />
          </Field>

          {!SINGLE_STORE_MODE && (
            <Field label="الفرع">
              <select
                {...register('branchId')}
                disabled={isPending}
                onChange={(e) => {
                  const nextBranchId = e.target.value;
                  setValue('branchId', nextBranchId);
                  const branchObj = branchList.find(b => String(b.id) === String(nextBranchId));
                  const nextLocs = locationList.filter(l => !l.branchId || String(l.branchId) === String(nextBranchId));
                  const nextDefaultLoc = (branchObj?.defaultStockLocationId && locationList.find(l => String(l.id) === String(branchObj.defaultStockLocationId)))
                    || nextLocs.find(l => l.name.includes('الرئيسي') || l.name.toLowerCase().includes('main'))
                    || nextLocs[0]
                    || locationList[0];
                  if (nextDefaultLoc?.id) {
                    setValue('locationId', String(nextDefaultLoc.id));
                  }
                }}
              >
                <option value="">بدون فرع</option>
                {branchList.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </Field>
          )}

          {SINGLE_STORE_MODE ? (
            <Field label="المخزن الأساسي">
              <input value={locationList[0]?.name || 'المخزن الرئيسي'} disabled readOnly />
            </Field>
          ) : (
            <Field label="المخزن">
              <select {...register('locationId')} disabled={isPending}>
                <option value="">بدون مخزن</option>
                {availableLocations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </Field>
          )}

          <Field label="ملاحظة الافتتاح (اختياري)">
            <textarea
              rows={2}
              {...register('note')}
              disabled={isPending}
              placeholder="اكتب أي ملاحظة تخص بداية الوردية..."
            />
          </Field>

          <MutationFeedback
            isError={Boolean(error)}
            isSuccess={isSuccess}
            error={error}
            errorFallback="تعذر فتح وردية نقطة البيع"
            successText="تم فتح الوردية بنجاح! جاري تحضير شاشة البيع..."
          />

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px', justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              إلغاء
            </Button>
            <SubmitButton
              type="submit"
              isPending={isPending}
              idleText="فتح الوردية وبدء البيع"
              pendingText="جارٍ فتح الوردية..."
            />
          </div>
        </form>
      </div>
    </DialogShell>
  );
}
