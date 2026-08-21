import { SINGLE_STORE_MODE } from '@/config/product-scope';
import type { Branch, Location } from '@/types/domain';

export function BranchRowActions({ branch, onStartEdit, onDelete, canManageSettings, isBusy, setupMode }: {
  branch: Branch;
  locations?: Location[];
  isEditing?: boolean;
  onStartEdit: (branch: Branch) => void;
  onCancelEdit?: () => void;
  onChange?: (field: 'name' | 'code' | 'defaultStockLocationId' | 'salesStockMode' | 'allowExternalSalesStock', value: any) => void;
  onSave?: () => void;
  onDelete: (branch: Branch) => void;
  canManageSettings: boolean;
  isBusy: boolean;
  mutationError?: unknown;
  setupMode?: boolean;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 12px',
      background: '#ffffff',
      border: '1px solid #f1f5f9',
      borderRadius: '8px',
      transition: 'all 0.15s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{branch.name}</strong>
        {branch.code ? (
          <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0', fontWeight: 600 }}>
            {branch.code}
          </span>
        ) : (
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>بدون كود</span>
        )}
        {setupMode && branch.defaultStockLocationId && (
          <span style={{ fontSize: '0.7rem', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
            تم تعيين المخزن
          </span>
        )}
      </div>

      {canManageSettings ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => onStartEdit(branch)}
            disabled={isBusy}
            style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, borderRadius: '5px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', cursor: 'pointer' }}
          >
            تعديل
          </button>
          {!SINGLE_STORE_MODE && (
            <button
              type="button"
              onClick={() => onDelete(branch)}
              disabled={isBusy}
              style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, borderRadius: '5px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}
            >
              حذف
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function LocationRowActions({ location, onStartEdit, onDelete, canManageSettings, isBusy }: {
  location: Location;
  branches?: Branch[];
  isEditing?: boolean;
  onStartEdit: (location: Location) => void;
  onCancelEdit?: () => void;
  onChange?: (field: 'name' | 'code' | 'branchId' | 'locationType', value: string) => void;
  onSave?: () => void;
  onDelete: (location: Location) => void;
  canManageSettings: boolean;
  isBusy: boolean;
  mutationError?: unknown;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 12px',
      background: '#ffffff',
      border: '1px solid #f1f5f9',
      borderRadius: '8px',
      transition: 'all 0.15s ease',
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{location.name}</strong>
          {location.locationType === 'branch_stock' ? (
            <span style={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '1px 6px', borderRadius: '4px' }}>
              رصيد فرع
            </span>
          ) : (
            <span style={{ fontSize: '0.7rem', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', padding: '1px 6px', borderRadius: '4px' }}>
              مخزن داخلي
            </span>
          )}
        </div>
        <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
          {location.branchName ? `الفرع: ${location.branchName}` : 'بدون فرع'}
          {location.code ? ` · الكود: ${location.code}` : ''}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {canManageSettings && (
          <>
            <button
              type="button"
              onClick={() => onStartEdit(location)}
              disabled={isBusy}
              style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, borderRadius: '5px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', cursor: 'pointer' }}
            >
              تعديل
            </button>
            {!SINGLE_STORE_MODE && (
              <button
                type="button"
                onClick={() => onDelete(location)}
                disabled={isBusy}
                style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, borderRadius: '5px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}
              >
                حذف
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
