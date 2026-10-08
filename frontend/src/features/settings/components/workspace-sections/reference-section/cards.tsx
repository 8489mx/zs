import type { Dispatch, SetStateAction } from 'react';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Button } from '@/shared/ui/button';
import { downloadEntityListCsv, printEntityList } from '@/features/settings/components/SettingsWorkspacePrimitives';
import type { Branch, Location } from '@/types/domain';
import { BranchRowActions, LocationRowActions } from './row-actions';
import type { BranchActionState, LocationActionState, ReferenceDeleteConfirmState } from './types';
import { useAuthStore } from '@/stores/auth-store';
import { useHasFeature } from '@/shared/hooks/use-permission';
import { resolveCurrentVertical } from '@/shared/verticals/vertical-scope';

export function BranchReferenceCard(props: {
  locations?: Location[];
  branches: Branch[];
  branchList: Branch[];
  filteredCount: number;
  branchSearch: string;
  branchFilter: 'all' | 'with-code' | 'without-code';
  setBranchSearch: (value: string) => void;
  setBranchFilter: (value: 'all' | 'with-code' | 'without-code') => void;
  resetBranchFilters: () => void;
  copyVisibleBranches: () => Promise<void>;
  branchesQuery: { isLoading: boolean; isError: boolean; error?: unknown };
  canManageSettings: boolean;
  editingBranch: BranchActionState | null;
  setEditingBranch: Dispatch<SetStateAction<BranchActionState | null>>;
  setDeleteConfirm: Dispatch<SetStateAction<ReferenceDeleteConfirmState | null>>;
  branchActionBusy: boolean;
  branchActionError?: unknown;
  onUpdateBranch: (branchId: string, values: { name: string; code: string }) => Promise<void>;
  onShowAddBranch?: () => void;
  setupMode?: boolean;
}) {
  const { branches, branchList, filteredCount, branchSearch, branchFilter, setBranchSearch, setBranchFilter, resetBranchFilters, copyVisibleBranches: _copyVisibleBranches, branchesQuery, canManageSettings, setEditingBranch, setDeleteConfirm, branchActionBusy, setupMode, onShowAddBranch } = props;

  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const vertical = resolveCurrentVertical(tenant);
  const isSuperAdmin = user?.role === 'super_admin';
  const hasMultiBranch = useHasFeature('multi_branch') || useHasFeature('branches') || isSuperAdmin;
  const isBranchLimitReached = !hasMultiBranch && branches.length >= 1;

  const branchTitle = vertical === 'maritime'
    ? `المقرات والمكاتب الملاحية (${branches.length})`
    : vertical === 'contracting'
    ? `المقرات الإدارية ومواقع العمل (${branches.length})`
    : `الفروع (${branches.length})`;

  const addBranchBtnLabel = vertical === 'maritime'
    ? '+ مقر / مكتب'
    : vertical === 'contracting'
    ? '+ موقع عمل'
    : '+ فرع';

  return (
    <section className="document-prototype-section settings-reference-card">
      <div className="section-header-compact-row">
        <h3 className="document-prototype-section-title">{branchTitle}</h3>
        <div className="section-header-actions-group">
          {canManageSettings && onShowAddBranch && (
            isBranchLimitReached ? (
              <span
                style={{
                  fontSize: '0.70rem',
                  padding: '3px 6px',
                  background: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid #fde68a',
                  borderRadius: '6px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  whiteSpace: 'nowrap',
                }}
                title="وصلت للحد الأقصى في باقتك (فرع واحد)."
              >
                حد الباقة (1)
              </span>
            ) : (
              <Button variant="primary" onClick={onShowAddBranch} className="section-header-action-btn">
                {addBranchBtnLabel}
              </Button>
            )
          )}
          <Button variant="secondary" className="section-header-action-btn" onClick={() => downloadEntityListCsv('branches.csv', ['name', 'code'], branchList.map((branch) => [branch.name || '', branch.code || '']))}>
            تصدير
          </Button>
          <Button variant="secondary" className="section-header-action-btn" onClick={() => printEntityList(branchTitle, ['الاسم', 'الكود'], branchList.map((branch) => [branch.name || '', branch.code || '']))}>
            طباعة
          </Button>
        </div>
      </div>
      <QueryFeedback
        isLoading={branchesQuery.isLoading}
        isError={branchesQuery.isError}
        error={branchesQuery.error}
        isEmpty={!branches.length}
        loadingText={vertical === 'maritime' ? 'جاري تحميل المقرات والمكاتب الملاحية...' : vertical === 'contracting' ? 'جاري تحميل مواقع العمل...' : 'جاري تحميل الفروع الحالية...'}
        emptyTitle={vertical === 'maritime' ? 'لم تتم إضافة مقرات ملاحية بعد' : vertical === 'contracting' ? 'لم تتم إضافة مواقع عمل بعد' : 'لم تتم إضافة فروع بعد'}
        emptyHint={vertical === 'maritime' ? 'أضف مقراً ملاحياً جديداً للبدء.' : vertical === 'contracting' ? 'أضف موقع عمل جديداً للبدء.' : 'أضف فرعًا جديدًا للبدء.'}
      >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Compact Search & Filter Strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <input
            value={branchSearch}
            placeholder={vertical === 'maritime' ? 'بحث باسم المقر الملاحي أو الكود...' : vertical === 'contracting' ? 'بحث باسم موقع العمل أو الكود...' : 'بحث باسم الفرع أو الكود...'}
            onChange={(e) => setBranchSearch(e.target.value)}
            style={{ flex: 1, minWidth: '140px', padding: '5px 10px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', outline: 'none' }}
          />

          <div style={{ display: 'flex', gap: '4px', background: '#e2e8f0', padding: '2px', borderRadius: '6px' }}>
            {(['all', 'with-code', 'without-code'] as const).map((mode) => {
              const label = mode === 'all' ? 'الكل' : mode === 'with-code' ? 'بكود' : 'بدون كود';
              const active = branchFilter === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setBranchFilter(mode)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    borderRadius: '4px',
                    border: 'none',
                    background: active ? '#ffffff' : 'transparent',
                    color: active ? '#0f172a' : '#64748b',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                    transition: 'background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
                    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {(branchSearch || branchFilter !== 'all') && (
            <button
              type="button"
              onClick={resetBranchFilters}
              style={{ fontSize: '0.72rem', color: '#64748b', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              إعادة ضبط
            </button>
          )}
        </div>

        {/* Branch List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '420px', overflowY: 'auto' }}>
          {filteredCount === 0 ? (
            <div style={{ padding: '20px 14px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                {vertical === 'maritime' ? 'لا توجد مقرات ملاحية مطابقة للبحث أو الفلتر' : vertical === 'contracting' ? 'لا توجد مواقع عمل مطابقة للبحث أو الفلتر' : 'لا توجد فروع مطابقة للبحث أو الفلتر'}
              </div>
              <button
                type="button"
                onClick={resetBranchFilters}
                style={{ fontSize: '0.76rem', color: '#0369a1', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
              >
                {vertical === 'maritime' ? 'إظهار كافة المقرات' : vertical === 'contracting' ? 'إظهار كافة المواقع' : 'إظهار كل الفروع'}
              </button>
            </div>
          ) : (
            branchList.map((branch) => (
              <BranchRowActions
                key={branch.id}
                branch={branch}
                onStartEdit={(currentBranch) => setEditingBranch({
                  branchId: currentBranch.id,
                  values: {
                    name: currentBranch.name || '',
                    code: currentBranch.code || '',
                    defaultStockLocationId: currentBranch.defaultStockLocationId || undefined,
                    salesStockMode: currentBranch.salesStockMode || 'single_location',
                    allowExternalSalesStock: currentBranch.allowExternalSalesStock || false,
                  }
                })}
                onDelete={(currentBranch) => setDeleteConfirm({ kind: 'branch', id: currentBranch.id, name: currentBranch.name || 'هذا الفرع' })}
                canManageSettings={canManageSettings}
                isBusy={branchActionBusy}
                setupMode={setupMode}
              />
            ))
          )}
        </div>
      </div>
      </QueryFeedback>
    </section>
  );
}

export function LocationReferenceCard(props: {
  branches: Branch[];
  locations: Location[];
  locationList: Location[];
  filteredCount: number;
  locationSearch: string;
  locationFilter: 'all' | 'with-branch' | 'without-branch';
  setLocationSearch: (value: string) => void;
  setLocationFilter: (value: 'all' | 'with-branch' | 'without-branch') => void;
  resetLocationFilters: () => void;
  copyVisibleLocations: () => Promise<void>;
  locationsQuery: { isLoading: boolean; isError: boolean; error?: unknown };
  canManageSettings: boolean;
  editingLocation: LocationActionState | null;
  setEditingLocation: Dispatch<SetStateAction<LocationActionState | null>>;
  setDeleteConfirm: Dispatch<SetStateAction<ReferenceDeleteConfirmState | null>>;
  locationActionBusy: boolean;
  locationActionError?: unknown;
  onUpdateLocation: (locationId: string, values: { name: string; code: string; branchId: string }) => Promise<void>;
  onShowAddLocation?: () => void;
}) {
  const { locations, locationList, filteredCount, locationSearch, locationFilter, setLocationSearch, setLocationFilter, resetLocationFilters, locationsQuery, canManageSettings, setEditingLocation, setDeleteConfirm, locationActionBusy, onShowAddLocation } = props;

  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const vertical = resolveCurrentVertical(tenant);
  const isSuperAdmin = user?.role === 'super_admin';
  const hasMultiWarehouse = useHasFeature('inventory') || isSuperAdmin;
  const isLocationLimitReached = !hasMultiWarehouse && locations.length >= 1;

  const locationTitle = vertical === 'maritime'
    ? `الموانئ ومحطات ومستودعات الحاويات (${locations.length})`
    : vertical === 'contracting'
    ? `مخازن التشوين الميدانية (${locations.length})`
    : `المخازن والمواقع (${locations.length})`;

  const addLocationBtnLabel = vertical === 'maritime'
    ? '+ ميناء / موقع'
    : vertical === 'contracting'
    ? '+ مخزن تشوين'
    : '+ مخزن';

  return (
    <section className="document-prototype-section settings-reference-card">
      <div className="section-header-compact-row">
        <h3 className="document-prototype-section-title">{locationTitle}</h3>
        <div className="section-header-actions-group">
          {canManageSettings && onShowAddLocation && (
            isLocationLimitReached ? (
              <span
                style={{
                  fontSize: '0.70rem',
                  padding: '3px 6px',
                  background: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid #fde68a',
                  borderRadius: '6px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  whiteSpace: 'nowrap',
                }}
                title="وصلت للحد الأقصى في باقتك (مخزن واحد)."
              >
                حد الباقة (1)
              </span>
            ) : (
              <Button variant="primary" onClick={onShowAddLocation} className="section-header-action-btn">
                {addLocationBtnLabel}
              </Button>
            )
          )}
          <Button variant="secondary" className="section-header-action-btn" onClick={() => downloadEntityListCsv('locations.csv', ['name', 'code', 'branch'], locationList.map((location) => [location.name || '', location.code || '', location.branchName || '']))}>
            تصدير
          </Button>
          <Button variant="secondary" className="section-header-action-btn" onClick={() => printEntityList(locationTitle, ['الاسم', 'الكود', vertical === 'maritime' ? 'المكتب المشرف' : 'الفرع'], locationList.map((location) => [location.name || '', location.code || '', location.branchName || '']))}>
            طباعة
          </Button>
        </div>
      </div>
      <QueryFeedback
        isLoading={locationsQuery.isLoading}
        isError={locationsQuery.isError}
        error={locationsQuery.error}
        isEmpty={!locations.length}
        loadingText={vertical === 'maritime' ? 'جاري تحميل الموانئ والمحطات...' : vertical === 'contracting' ? 'جاري تحميل مواقع التشوين...' : 'جاري تحميل المخازن...'}
        emptyTitle={vertical === 'maritime' ? 'لم تتم إضافة موانئ أو محطات بعد' : vertical === 'contracting' ? 'لم تتم إضافة مواقع تشوين بعد' : 'لم تتم إضافة مخازن بعد'}
        emptyHint={vertical === 'maritime' ? 'أضف ميناء أو محطة حاويات جديدة للبدء.' : vertical === 'contracting' ? 'أضف مخزن تشوين جديداً للبدء.' : 'أضف مخزنًا جديدًا للبدء.'}
      >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Compact Search & Filter Strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <input
            value={locationSearch}
            placeholder={vertical === 'maritime' ? 'بحث باسم الميناء أو المحطة أو الكود...' : vertical === 'contracting' ? 'بحث باسم مخزن التشوين أو الكود...' : 'بحث باسم المخزن أو الكود أو الفرع...'}
            onChange={(e) => setLocationSearch(e.target.value)}
            style={{ flex: 1, minWidth: '140px', padding: '5px 10px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', outline: 'none' }}
          />

          <div style={{ display: 'flex', gap: '4px', background: '#e2e8f0', padding: '2px', borderRadius: '6px' }}>
            {(['all', 'with-branch', 'without-branch'] as const).map((mode) => {
              const label = mode === 'all'
                ? 'الكل'
                : mode === 'with-branch'
                ? (vertical === 'maritime' ? 'بمكتب' : vertical === 'contracting' ? 'بمقر' : 'بفرع')
                : (vertical === 'maritime' ? 'بدون مكتب' : vertical === 'contracting' ? 'بدون مقر' : 'بدون فرع');
              const active = locationFilter === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setLocationFilter(mode)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    borderRadius: '4px',
                    border: 'none',
                    background: active ? '#ffffff' : 'transparent',
                    color: active ? '#0f172a' : '#64748b',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                    transition: 'background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
                    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {(locationSearch || locationFilter !== 'all') && (
            <button
              type="button"
              onClick={resetLocationFilters}
              style={{ fontSize: '0.72rem', color: '#64748b', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              إعادة ضبط
            </button>
          )}
        </div>

        {/* Location List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '420px', overflowY: 'auto' }}>
          {filteredCount === 0 ? (
            <div style={{ padding: '20px 14px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                {vertical === 'maritime' ? 'لا توجد موانئ أو محطات مطابقة للبحث أو الفلتر' : vertical === 'contracting' ? 'لا توجد مواقع تشوين مطابقة للبحث أو الفلتر' : 'لا توجد مخازن مطابقة للبحث أو الفلتر'}
              </div>
              <button
                type="button"
                onClick={resetLocationFilters}
                style={{ fontSize: '0.76rem', color: '#0369a1', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
              >
                {vertical === 'maritime' ? 'إظهار كافة الموانئ والمحطات' : vertical === 'contracting' ? 'إظهار كافة مواقع التشوين' : 'إظهار كل المخازن'}
              </button>
            </div>
          ) : (
            locationList.map((location) => (
              <LocationRowActions
                key={location.id}
                location={location}
                onStartEdit={(currentLocation) => setEditingLocation({
                  locationId: currentLocation.id,
                  values: {
                    name: currentLocation.name || '',
                    code: currentLocation.code || '',
                    branchId: currentLocation.branchId || '',
                    locationType: currentLocation.locationType || 'internal_warehouse',
                  }
                })}
                onDelete={(currentLocation) => setDeleteConfirm({ kind: 'location', id: currentLocation.id, name: currentLocation.name || (vertical === 'maritime' ? 'هذا الموقع / الميناء' : vertical === 'contracting' ? 'هذا المخزن التشويني' : 'هذا المخزن') })}
                canManageSettings={canManageSettings}
                isBusy={locationActionBusy}
              />
            ))
          )}
        </div>
      </div>
      </QueryFeedback>
    </section>
  );
}
