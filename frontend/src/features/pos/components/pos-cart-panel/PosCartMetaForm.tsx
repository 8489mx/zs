import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import type { PosCartPanelProps } from './posCartPanel.types';

export function PosCartMetaForm(props: Pick<PosCartPanelProps,
  'customers' | 'customerId' | 'onCustomerChange' |
  'branches' | 'branchId' | 'onBranchChange' |
  'locations' | 'locationId' | 'onLocationChange' |
  'quickCustomerName' | 'quickCustomerPhone' | 'isQuickCustomerPending' |
  'onQuickCustomerSubmit' | 'onQuickCustomerNameChange' | 'onQuickCustomerPhoneChange'
>) {
  return (
    <>
      <div className="three-column-grid compact-fields pos-meta-grid">
        <Field label="العميل">
          <select value={props.customerId} onChange={(event) => props.onCustomerChange(event.target.value)}>
            <option value="">عميل نقدي</option>
            {props.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
          </select>
        </Field>
        {!SINGLE_STORE_MODE ? (props.branches.length > 1 ? (
          <Field label="الفرع">
            <select value={props.branchId} onChange={(event) => props.onBranchChange(event.target.value)}>
              <option value="">اختر الفرع</option>
              {props.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </Field>
        ) : (
          <div className="field"><span>الفرع</span><div className="input-like">{props.branches[0]?.name || 'الرئيسي'}</div></div>
        )) : null}
        {SINGLE_STORE_MODE ? (
          <div className="field"><span>المخزن الحالي</span><div className="input-like">{props.locations.find((location) => String(location.id) === String(props.locationId))?.name || props.locations[0]?.name || 'المخزن الأساسي'}</div></div>
        ) : props.locations.length > 1 ? (
          <Field label="المخزن">
            <select value={props.locationId} onChange={(event) => props.onLocationChange(event.target.value)}>
              <option value="">اختر المخزن</option>
              {props.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </Field>
        ) : (
          <div className="field"><span>المخزن</span><div className="input-like">{props.locations[0]?.name || 'الأساسي'}</div></div>
        )}
      </div>

      <form className="inline-create-panel pos-inline-panel" onSubmit={props.onQuickCustomerSubmit}>
        <div className="inline-create-grid">
          <Field label="إضافة عميل سريع">
            <input value={props.quickCustomerName} onChange={(event) => props.onQuickCustomerNameChange(event.target.value)} placeholder="اسم العميل" disabled={props.isQuickCustomerPending} />
          </Field>
          <Field label="الهاتف">
            <input value={props.quickCustomerPhone} onChange={(event) => props.onQuickCustomerPhoneChange(event.target.value)} placeholder="اختياري" disabled={props.isQuickCustomerPending} />
          </Field>
        </div>
        <div className="actions compact-actions section-actions-clean">
          <Button type="submit" variant="secondary" disabled={props.isQuickCustomerPending || !props.quickCustomerName.trim()}>
            {props.isQuickCustomerPending ? 'جارٍ إضافة العميل...' : 'إضافة عميل وتحديده'}
          </Button>
        </div>
      </form>
    </>
  );
}
