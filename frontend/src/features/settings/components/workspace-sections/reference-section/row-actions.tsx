import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import type { Branch, Location } from '@/types/domain';

export function BranchRowActions({ branch, locations, isEditing, onStartEdit, onCancelEdit, onChange, onSave, onDelete, canManageSettings, isBusy, mutationError, setupMode }: {
  branch: Branch;
  locations?: Location[];
  isEditing: boolean;
  onStartEdit: (branch: Branch) => void;
  onCancelEdit: () => void;
  onChange: (field: 'name' | 'code' | 'defaultStockLocationId' | 'salesStockMode' | 'allowExternalSalesStock', value: any) => void;
  onSave: () => void;
  onDelete: (branch: Branch) => void;
  canManageSettings: boolean;
  isBusy: boolean;
  mutationError?: unknown;
  setupMode?: boolean;
}) {
  if (isEditing) {
    const eligibleLocations = locations?.filter((loc) => !loc.branchId || loc.branchId === branch.id) || [];
    return (
      <div className="list-row settings-reference-row editing-row">
        <div className="form-grid" style={{ flex: 1 }}>
          <Field label={SINGLE_STORE_MODE ? 'اسم النشاط' : 'اسم الفرع'}><input value={branch.name} onChange={(event) => onChange('name', event.target.value)} disabled={isBusy} /></Field>
          <Field label={SINGLE_STORE_MODE ? 'كود المتجر' : 'كود الفرع'}><input value={branch.code || ''} onChange={(event) => onChange('code', event.target.value)} disabled={isBusy} /></Field>
          <Field label="مخزن البيع الأساسي">
            <select value={branch.defaultStockLocationId || ''} onChange={(e) => onChange('defaultStockLocationId', e.target.value || null)} disabled={isBusy}>
              <option value="">-- غير محدد --</option>
              {eligibleLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </Field>
          <Field label="مصدر مخزون البيع">
            <select value={branch.salesStockMode || 'single_location'} onChange={(e) => onChange('salesStockMode', e.target.value)} disabled={isBusy}>
              <option value="single_location">مخزن محدد</option>
              <option value="all_operational_locations">كل المخازن التشغيلية</option>
            </select>
          </Field>
          {branch.salesStockMode === 'all_operational_locations' && (
             <Field label="مخزون خارجي">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={branch.allowExternalSalesStock || false} onChange={(e) => onChange('allowExternalSalesStock', e.target.checked)} disabled={isBusy} />
                <span>السماح بالبيع من المخازن الخارجية</span>
              </label>
            </Field>
          )}
        </div>
        <div className="actions compact-actions">
          <Button variant="primary" onClick={onSave} disabled={isBusy || !branch.name.trim()}>{isBusy ? 'جارٍ الحفظ...' : 'حفظ'}</Button>
          <Button variant="secondary" onClick={onCancelEdit} disabled={isBusy}>إلغاء</Button>
        </div>
        <MutationFeedback isError={Boolean(mutationError)} isSuccess={false} error={mutationError} errorFallback={SINGLE_STORE_MODE ? 'تعذر تحديث بيانات النشاط' : 'تعذر تحديث الفرع'} />
      </div>
    );
  }
  return (
    <div className="list-row" key={branch.id}>
      <div>
        <strong>{branch.name}</strong>
        <div className="muted small">{branch.code || (SINGLE_STORE_MODE ? 'المعرف الداخلي غير محدد' : 'بدون كود')}</div>
        {setupMode && branch.defaultStockLocationId && (
          <div className="status-badge" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', marginTop: '4px' }}>
            تم إنشاء المخزون الافتراضي للفرع بنجاح
          </div>
        )}
      </div>
      {canManageSettings ? <div className="actions compact-actions"><Button variant="secondary" onClick={() => onStartEdit(branch)} disabled={isBusy}>تعديل</Button>{!SINGLE_STORE_MODE ? <Button variant="danger" onClick={() => onDelete(branch)} disabled={isBusy}>حذف</Button> : null}</div> : null}
    </div>
  );
}

export function LocationRowActions({ location, branches, isEditing, onStartEdit, onCancelEdit, onChange, onSave, onDelete, canManageSettings, isBusy, mutationError }: {
  location: Location;
  branches: Branch[];
  isEditing: boolean;
  onStartEdit: (location: Location) => void;
  onCancelEdit: () => void;
  onChange: (field: 'name' | 'code' | 'branchId' | 'locationType', value: string) => void;
  onSave: () => void;
  onDelete: (location: Location) => void;
  canManageSettings: boolean;
  isBusy: boolean;
  mutationError?: unknown;
}) {
  if (isEditing) {
    return (
      <div className="list-row settings-reference-row editing-row">
        <div className="form-grid" style={{ flex: 1 }}>
          <Field label={SINGLE_STORE_MODE ? 'اسم المخزن' : 'اسم المخزن'}><input value={location.name} onChange={(event) => onChange('name', event.target.value)} disabled={isBusy} /></Field>
          <Field label={SINGLE_STORE_MODE ? 'كود المخزن' : 'كود المخزن'}><input value={location.code || ''} onChange={(event) => onChange('code', event.target.value)} disabled={isBusy} /></Field>
          {!SINGLE_STORE_MODE ? <Field label="الفرع المرتبط"><select value={location.branchId || ''} onChange={(event) => onChange('branchId', event.target.value)} disabled={isBusy}><option value="">بدون ربط</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></Field> : null}
          <Field label="نوع المخزن">
            <select value={location.locationType || 'internal_warehouse'} onChange={(event) => onChange('locationType', event.target.value)} disabled={isBusy}>
              <option value="internal_warehouse">مخزن داخلي (لا يظهر كأرصدة فروع)</option>
              <option value="branch_stock">رصيد فرع (متاح للبيع)</option>
            </select>
          </Field>
        </div>
        <div className="actions compact-actions">
          <Button variant="primary" onClick={onSave} disabled={isBusy || !location.name.trim()}>{isBusy ? 'جارٍ الحفظ...' : 'حفظ'}</Button>
          <Button variant="secondary" onClick={onCancelEdit} disabled={isBusy}>إلغاء</Button>
        </div>
        <MutationFeedback isError={Boolean(mutationError)} isSuccess={false} error={mutationError} errorFallback="تعذر تحديث المخزن" />
      </div>
    );
  }
  return (
    <div className="list-row" key={location.id}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <strong>{location.name}</strong>
          {location.locationType === 'branch_stock' ? <span className="status-badge" style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>رصيد فرع</span> : <span className="status-badge" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>مخزن داخلي</span>}
        </div>
        <div className="muted small">{SINGLE_STORE_MODE ? (location.code || 'المخزن الأساسي') : (location.branchName || 'بدون فرع')}</div>
      </div>
      <div className="actions compact-actions">
        <span className="muted small">{location.code || 'بدون كود'}</span>
        {canManageSettings ? <><Button variant="secondary" onClick={() => onStartEdit(location)} disabled={isBusy}>تعديل</Button>{!SINGLE_STORE_MODE ? <Button variant="danger" onClick={() => onDelete(location)} disabled={isBusy}>حذف</Button> : null}</> : null}
      </div>
    </div>
  );
}
