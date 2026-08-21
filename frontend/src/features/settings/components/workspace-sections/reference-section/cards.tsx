import type { Dispatch, SetStateAction } from 'react';
import { QueryCard } from '@/shared/components/query-card';
import { Button } from '@/shared/ui/button';
import { downloadEntityListCsv, printEntityList } from '@/features/settings/components/SettingsWorkspacePrimitives';
import type { Branch, Location } from '@/types/domain';
import { BranchRowActions, LocationRowActions } from './row-actions';
import type { BranchActionState, LocationActionState, ReferenceDeleteConfirmState } from './types';

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

  return (
    <QueryCard
      title={`الفروع (${branches.length})`}
      className="settings-reference-card"
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {canManageSettings && onShowAddBranch && (
            <Button variant="primary" onClick={onShowAddBranch} style={{ fontSize: '0.78rem', padding: '5px 12px', background: '#0f172a' }}>
              + إضافة فرع
            </Button>
          )}
          <Button variant="secondary" onClick={() => downloadEntityListCsv('branches.csv', ['name', 'code'], branchList.map((branch) => [branch.name || '', branch.code || '']))} style={{ fontSize: '0.78rem', padding: '5px 10px' }}>
            تصدير
          </Button>
          <Button variant="secondary" onClick={() => printEntityList('الفروع الحالية', ['الاسم', 'الكود'], branchList.map((branch) => [branch.name || '', branch.code || '']))} style={{ fontSize: '0.78rem', padding: '5px 10px' }}>
            طباعة
          </Button>
        </div>
      }
      isLoading={branchesQuery.isLoading}
      isError={branchesQuery.isError}
      error={branchesQuery.error}
      isEmpty={!branches.length}
      loadingText="جاري تحميل الفروع الحالية..."
      emptyTitle="لم تتم إضافة فروع بعد"
      emptyHint="أضف فرعًا جديدًا للبدء."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Compact Search & Filter Strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <input
            value={branchSearch}
            placeholder="بحث باسم الفرع أو الكود..."
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
                    fontWeight: active ? 700 : 500,
                    borderRadius: '4px',
                    border: 'none',
                    background: active ? '#ffffff' : 'transparent',
                    color: active ? '#0f172a' : '#64748b',
                    cursor: 'pointer',
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
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>لا توجد فروع مطابقة للبحث أو الفلتر</div>
              <button
                type="button"
                onClick={resetBranchFilters}
                style={{ fontSize: '0.76rem', color: '#0369a1', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
              >
                إظهار كل الفروع
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
    </QueryCard>
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

  return (
    <QueryCard
      title={`المخازن والمواقع (${locations.length})`}
      className="settings-reference-card"
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {canManageSettings && onShowAddLocation && (
            <Button variant="primary" onClick={onShowAddLocation} style={{ fontSize: '0.78rem', padding: '5px 12px', background: '#0f172a' }}>
              + إضافة مخزن
            </Button>
          )}
          <Button variant="secondary" onClick={() => downloadEntityListCsv('locations.csv', ['name', 'code', 'branch'], locationList.map((location) => [location.name || '', location.code || '', location.branchName || '']))} style={{ fontSize: '0.78rem', padding: '5px 10px' }}>
            تصدير
          </Button>
          <Button variant="secondary" onClick={() => printEntityList('المخازن الحالية', ['الاسم', 'الكود', 'الفرع'], locationList.map((location) => [location.name || '', location.code || '', location.branchName || '']))} style={{ fontSize: '0.78rem', padding: '5px 10px' }}>
            طباعة
          </Button>
        </div>
      }
      isLoading={locationsQuery.isLoading}
      isError={locationsQuery.isError}
      error={locationsQuery.error}
      isEmpty={!locations.length}
      loadingText="جاري تحميل المخازن..."
      emptyTitle="لم تتم إضافة مخازن بعد"
      emptyHint="أضف مخزنًا جديدًا للبدء."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Compact Search & Filter Strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <input
            value={locationSearch}
            placeholder="بحث باسم المخزن أو الكود أو الفرع..."
            onChange={(e) => setLocationSearch(e.target.value)}
            style={{ flex: 1, minWidth: '140px', padding: '5px 10px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', outline: 'none' }}
          />

          <div style={{ display: 'flex', gap: '4px', background: '#e2e8f0', padding: '2px', borderRadius: '6px' }}>
            {(['all', 'with-branch', 'without-branch'] as const).map((mode) => {
              const label = mode === 'all' ? 'الكل' : mode === 'with-branch' ? 'بفرع' : 'بدون فرع';
              const active = locationFilter === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setLocationFilter(mode)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    fontWeight: active ? 700 : 500,
                    borderRadius: '4px',
                    border: 'none',
                    background: active ? '#ffffff' : 'transparent',
                    color: active ? '#0f172a' : '#64748b',
                    cursor: 'pointer',
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
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>لا توجد مخازن مطابقة للبحث أو الفلتر</div>
              <button
                type="button"
                onClick={resetLocationFilters}
                style={{ fontSize: '0.76rem', color: '#0369a1', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
              >
                إظهار كل المخازن
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
                onDelete={(currentLocation) => setDeleteConfirm({ kind: 'location', id: currentLocation.id, name: currentLocation.name || 'هذا المخزن' })}
                canManageSettings={canManageSettings}
                isBusy={locationActionBusy}
              />
            ))
          )}
        </div>
      </div>
    </QueryCard>
  );
}
