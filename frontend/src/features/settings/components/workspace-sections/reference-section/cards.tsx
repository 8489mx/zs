import type { Dispatch, SetStateAction } from 'react';
import { QueryCard } from '@/shared/components/query-card';
import { Button } from '@/shared/ui/button';
import { downloadEntityListCsv, printEntityList } from '@/features/settings/components/SettingsWorkspacePrimitives';
import type { Branch, Location } from '@/types/domain';
import { BranchRowActions, LocationRowActions } from './row-actions';
import { ReferenceSearchToolbar, ReferenceStats } from './shared';
import type { BranchActionState, LocationActionState, ReferenceDeleteConfirmState } from './types';

export function BranchReferenceCard(props: {
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
}) {
  const { branches, branchList, filteredCount, branchSearch, branchFilter, setBranchSearch, setBranchFilter, resetBranchFilters, copyVisibleBranches, branchesQuery, canManageSettings, editingBranch, setEditingBranch, setDeleteConfirm, branchActionBusy, branchActionError, onUpdateBranch } = props;
  return (
    <QueryCard title="الفرع الرئيسي" className="settings-reference-card" description="" actions={<div className="actions compact-actions"><Button variant="secondary" onClick={resetBranchFilters}>إعادة الضبط</Button><Button variant="secondary" onClick={() => void copyVisibleBranches()}>نسخ</Button><Button variant="secondary" onClick={() => downloadEntityListCsv('branches.csv', ['name', 'code'], branchList.map((branch) => [branch.name || '', branch.code || '']))}>تصدير CSV</Button><Button variant="secondary" onClick={() => printEntityList('الفروع الحالية', ['الاسم', 'الكود'], branchList.map((branch) => [branch.name || '', branch.code || '']))}>طباعة</Button></div>} isLoading={branchesQuery.isLoading} isError={branchesQuery.isError} error={branchesQuery.error} isEmpty={!filteredCount} loadingText="جاري تحميل الفروع الحالية..." emptyTitle="لا توجد فروع مطابقة" emptyHint="جرّب تغيير البحث أو الفلترة أو أضف فرعًا جديدًا.">
      <ReferenceSearchToolbar search={branchSearch} onSearchChange={setBranchSearch} title="بحث الفروع" searchPlaceholder="ابحث باسم الفرع أو الكود" countLabel={`${filteredCount} نتيجة`} metaItems={[`إجمالي الفروع: ${branches.length}`, `بكود: ${branches.filter((branch) => Boolean(branch.code)).length}`, `الفلتر: ${branchFilter === 'all' ? 'الكل' : branchFilter === 'with-code' ? 'بكود' : 'بدون كود'}`]} filterValue={branchFilter} filterOptions={[['all', 'الكل'], ['with-code', 'بكود'], ['without-code', 'بدون كود']]} onFilterChange={(value) => setBranchFilter(value as 'all' | 'with-code' | 'without-code')} onReset={resetBranchFilters} />
      <ReferenceStats items={[[ 'النتائج', filteredCount ], [ 'بكود', branches.filter((branch) => Boolean(branch.code)).length ], [ 'بدون كود', branches.filter((branch) => !branch.code).length ]]} />
      <div className="list-stack">
        {branchList.map((branch) => <BranchRowActions key={branch.id} branch={branch} isEditing={editingBranch?.branchId === branch.id} onStartEdit={(currentBranch) => setEditingBranch({ branchId: currentBranch.id, values: { name: currentBranch.name || '', code: currentBranch.code || '' } })} onCancelEdit={() => setEditingBranch(null)} onChange={(field, value) => setEditingBranch((current) => current && current.branchId === branch.id ? { ...current, values: { ...current.values, [field]: value } } : current)} onSave={async () => { if (!editingBranch || editingBranch.branchId !== branch.id) return; await onUpdateBranch(branch.id, editingBranch.values); setEditingBranch(null); }} onDelete={(currentBranch) => setDeleteConfirm({ kind: 'branch', id: currentBranch.id, name: currentBranch.name || 'هذا الفرع' })} canManageSettings={canManageSettings} isBusy={branchActionBusy} mutationError={branchActionError} />)}
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
}) {
  const { branches, locations, locationList, filteredCount, locationSearch, locationFilter, setLocationSearch, setLocationFilter, resetLocationFilters, copyVisibleLocations, locationsQuery, canManageSettings, editingLocation, setEditingLocation, setDeleteConfirm, locationActionBusy, locationActionError, onUpdateLocation } = props;
  return (
    <QueryCard title="المخزن الأساسي" className="settings-reference-card" description="استعراض أنظف للمواقع مع توضيح الربط بالفروع وتصفية العناصر غير المكتملة." actions={<div className="actions compact-actions"><Button variant="secondary" onClick={resetLocationFilters}>إعادة الضبط</Button><Button variant="secondary" onClick={() => void copyVisibleLocations()}>نسخ</Button><Button variant="secondary" onClick={() => downloadEntityListCsv('locations.csv', ['name', 'code', 'branch'], locationList.map((location) => [location.name || '', location.code || '', location.branchName || '']))}>تصدير CSV</Button><Button variant="secondary" onClick={() => printEntityList('مواقع المخزون الحالية', ['الاسم', 'الكود', 'الفرع'], locationList.map((location) => [location.name || '', location.code || '', location.branchName || '']))}>طباعة</Button></div>} isLoading={locationsQuery.isLoading} isError={locationsQuery.isError} error={locationsQuery.error} isEmpty={!filteredCount} loadingText="جاري تحميل مواقع المخزون..." emptyTitle="لا توجد مواقع مطابقة" emptyHint="جرّب تغيير البحث أو الفلترة أو أضف موقعًا جديدًا.">
      <ReferenceSearchToolbar search={locationSearch} onSearchChange={setLocationSearch} title="بحث المواقع" searchPlaceholder="ابحث باسم الموقع أو الكود أو الفرع" countLabel={`${filteredCount} نتيجة`} metaItems={[`إجمالي المواقع: ${locations.length}`, `مرتبطة بفرع: ${locations.filter((location) => Boolean(location.branchName)).length}`, `الفلتر: ${locationFilter === 'all' ? 'الكل' : locationFilter === 'with-branch' ? 'بفرع' : 'بدون فرع'}`]} filterValue={locationFilter} filterOptions={[['all', 'الكل'], ['with-branch', 'بفرع'], ['without-branch', 'بدون فرع']]} onFilterChange={(value) => setLocationFilter(value as 'all' | 'with-branch' | 'without-branch')} onReset={resetLocationFilters} />
      <ReferenceStats items={[[ 'النتائج', filteredCount ], [ 'بفرع', locations.filter((location) => Boolean(location.branchName)).length ], [ 'بدون فرع', locations.filter((location) => !location.branchName).length ]]} />
      <div className="list-stack">
        {locationList.map((location) => <LocationRowActions key={location.id} location={location} branches={branches} isEditing={editingLocation?.locationId === location.id} onStartEdit={(currentLocation) => setEditingLocation({ locationId: currentLocation.id, values: { name: currentLocation.name || '', code: currentLocation.code || '', branchId: currentLocation.branchId || '' } })} onCancelEdit={() => setEditingLocation(null)} onChange={(field, value) => setEditingLocation((current) => current && current.locationId === location.id ? { ...current, values: { ...current.values, [field]: value } } : current)} onSave={async () => { if (!editingLocation || editingLocation.locationId !== location.id) return; await onUpdateLocation(location.id, editingLocation.values); setEditingLocation(null); }} onDelete={(currentLocation) => setDeleteConfirm({ kind: 'location', id: currentLocation.id, name: currentLocation.name || 'هذا الموقع' })} canManageSettings={canManageSettings} isBusy={locationActionBusy} mutationError={locationActionError} />)}
      </div>
    </QueryCard>
  );
}
