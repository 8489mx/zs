import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Field } from '@/shared/ui/field';
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
    <DialogShell open={open} onClose={onClose} width="min(600px, 100%)">
      <div style={{ background: '#fff', padding: '24px', borderRadius: '8px' }}>
        <h2 style={{ marginTop: 0, marginBottom: '24px' }}>فتح وردية نقطة بيع</h2>
        <form className="form-grid" onSubmit={handleSubmit(onSubmit)}>
          <Field label="رصيد الفتح">
            <input
              type="number"
              step="0.01"
              autoFocus
              {...register('openingCash', { valueAsNumber: true })}
              disabled={isPending}
            />
          </Field>

          {!SINGLE_STORE_MODE ? (
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
          ) : null}

          {SINGLE_STORE_MODE ? (
            <Field label="المخزن الأساسي">
              <input value={locationList[0]?.name || 'سيتم الربط تلقائيًا بالمخزن الأساسي'} disabled readOnly />
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

          <Field label="ملاحظة الافتتاح">
            <textarea rows={2} {...register('note')} disabled={isPending} />
          </Field>

          <MutationFeedback
            isError={Boolean(error)}
            isSuccess={isSuccess}
            error={error}
            errorFallback="تعذر فتح وردية نقطة البيع"
            successText="تم فتح وردية نقطة البيع بنجاح."
          />

          <SubmitButton
            type="submit"
            isPending={isPending}
            idleText="فتح وردية نقطة البيع"
            pendingText="جارٍ الفتح..."
          />
        </form>
      </div>
    </DialogShell>
  );
}
