import { MutationFeedback } from '@/components/shared/MutationFeedback';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import type { Branch, Location } from '@/types/domain';

export function BranchRowActions({ branch, isEditing, onStartEdit, onCancelEdit, onChange, onSave, onDelete, canManageSettings, isBusy, mutationError }: {
  branch: Branch;
  isEditing: boolean;
  onStartEdit: (branch: Branch) => void;
  onCancelEdit: () => void;
  onChange: (field: 'name' | 'code', value: string) => void;
  onSave: () => void;
  onDelete: (branch: Branch) => void;
  canManageSettings: boolean;
  isBusy: boolean;
  mutationError?: unknown;
}) {
  if (isEditing) {
    return (
      <div className="list-row settings-reference-row editing-row">
        <div className="form-grid" style={{ flex: 1 }}>
          <Field label={SINGLE_STORE_MODE ? 'اسم المتجر' : 'اسم الفرع'}><input value={branch.name} onChange={(event) => onChange('name', event.target.value)} disabled={isBusy} /></Field>
          <Field label={SINGLE_STORE_MODE ? 'كود المتجر' : 'كود الفرع'}><input value={branch.code || ''} onChange={(event) => onChange('code', event.target.value)} disabled={isBusy} /></Field>
        </div>
        <div className="actions compact-actions">
          <Button variant="primary" onClick={onSave} disabled={isBusy || !branch.name.trim()}>{isBusy ? 'جارٍ الحفظ...' : 'حفظ'}</Button>
          <Button variant="secondary" onClick={onCancelEdit} disabled={isBusy}>إلغاء</Button>
        </div>
        <MutationFeedback isError={Boolean(mutationError)} isSuccess={false} error={mutationError} errorFallback={SINGLE_STORE_MODE ? 'تعذر تحديث بيانات المتجر' : 'تعذر تحديث الفرع'} />
      </div>
    );
  }
  return (
    <div className="list-row" key={branch.id}>
      <div>
        <strong>{branch.name}</strong>
        <div className="muted small">{branch.code || (SINGLE_STORE_MODE ? 'المعرف الداخلي غير محدد' : 'بدون كود')}</div>
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
  onChange: (field: 'name' | 'code' | 'branchId', value: string) => void;
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
          <Field label={SINGLE_STORE_MODE ? 'اسم المخزن' : 'اسم الموقع'}><input value={location.name} onChange={(event) => onChange('name', event.target.value)} disabled={isBusy} /></Field>
          <Field label={SINGLE_STORE_MODE ? 'كود المخزن' : 'كود الموقع'}><input value={location.code || ''} onChange={(event) => onChange('code', event.target.value)} disabled={isBusy} /></Field>
          {!SINGLE_STORE_MODE ? <Field label="الفرع المرتبط"><select value={location.branchId || ''} onChange={(event) => onChange('branchId', event.target.value)} disabled={isBusy}><option value="">بدون ربط</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></Field> : null}
        </div>
        <div className="actions compact-actions">
          <Button variant="primary" onClick={onSave} disabled={isBusy || !location.name.trim()}>{isBusy ? 'جارٍ الحفظ...' : 'حفظ'}</Button>
          <Button variant="secondary" onClick={onCancelEdit} disabled={isBusy}>إلغاء</Button>
        </div>
        <MutationFeedback isError={Boolean(mutationError)} isSuccess={false} error={mutationError} errorFallback="تعذر تحديث الموقع" />
      </div>
    );
  }
  return (
    <div className="list-row" key={location.id}>
      <div>
        <strong>{location.name}</strong>
        <div className="muted small">{SINGLE_STORE_MODE ? (location.code || 'المخزن الأساسي') : (location.branchName || 'بدون فرع')}</div>
      </div>
      <div className="actions compact-actions">
        <span className="muted small">{location.code || 'بدون كود'}</span>
        {canManageSettings ? <><Button variant="secondary" onClick={() => onStartEdit(location)} disabled={isBusy}>تعديل</Button>{!SINGLE_STORE_MODE ? <Button variant="danger" onClick={() => onDelete(location)} disabled={isBusy}>حذف</Button> : null}</> : null}
      </div>
    </div>
  );
}
