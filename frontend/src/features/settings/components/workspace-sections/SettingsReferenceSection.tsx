import { useMemo, useState } from 'react';
import { ActionConfirmDialog } from '@/components/shared/ActionConfirmDialog';
import type { Branch, Location } from '@/types/domain';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import {
  BranchReferenceCard,
  BranchRowActions,
  LocationReferenceCard,
  LocationRowActions,
  type BranchActionState,
  type LocationActionState,
  type ReferenceDeleteConfirmState,
} from '@/features/settings/components/workspace-sections/reference-section.shared';
import { QueryCard } from '@/components/shared/QueryCard';

interface SettingsReferenceSectionProps {
  branches: Branch[];
  locations: Location[];
  filteredBranches: Branch[];
  filteredLocations: Location[];
  branchSearch: string;
  locationSearch: string;
  branchFilter: 'all' | 'with-code' | 'without-code';
  locationFilter: 'all' | 'with-branch' | 'without-branch';
  setBranchSearch: (value: string) => void;
  setLocationSearch: (value: string) => void;
  setBranchFilter: (value: 'all' | 'with-code' | 'without-code') => void;
  setLocationFilter: (value: 'all' | 'with-branch' | 'without-branch') => void;
  resetBranchFilters: () => void;
  resetLocationFilters: () => void;
  copyVisibleBranches: () => Promise<void>;
  copyVisibleLocations: () => Promise<void>;
  branchesQuery: { isLoading: boolean; isError: boolean; error?: unknown };
  locationsQuery: { isLoading: boolean; isError: boolean; error?: unknown };
  canManageSettings: boolean;
  onUpdateBranch: (branchId: string, values: { name: string; code: string }) => Promise<void>;
  onDeleteBranch: (branch: Branch) => Promise<void>;
  onUpdateLocation: (locationId: string, values: { name: string; code: string; branchId: string }) => Promise<void>;
  onDeleteLocation: (location: Location) => Promise<void>;
  branchActionBusy: boolean;
  locationActionBusy: boolean;
  branchActionError?: unknown;
  locationActionError?: unknown;
}

export function SettingsReferenceSection({
  branches,
  locations,
  filteredBranches,
  filteredLocations,
  branchSearch,
  locationSearch,
  branchFilter,
  locationFilter,
  setBranchSearch,
  setLocationSearch,
  setBranchFilter,
  setLocationFilter,
  resetBranchFilters,
  resetLocationFilters,
  copyVisibleBranches,
  copyVisibleLocations,
  branchesQuery,
  locationsQuery,
  canManageSettings,
  onUpdateBranch,
  onDeleteBranch,
  onUpdateLocation,
  onDeleteLocation,
  branchActionBusy,
  locationActionBusy,
  branchActionError,
  locationActionError,
}: SettingsReferenceSectionProps) {
  const [editingBranch, setEditingBranch] = useState<BranchActionState | null>(null);
  const [editingLocation, setEditingLocation] = useState<LocationActionState | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ReferenceDeleteConfirmState | null>(null);

  const branchList = useMemo(() => filteredBranches.map((branch) => editingBranch?.branchId === branch.id ? { ...branch, ...editingBranch.values } : branch), [filteredBranches, editingBranch]);
  const locationList = useMemo(() => filteredLocations.map((location) => editingLocation?.locationId === location.id ? { ...location, ...editingLocation.values, branchName: branches.find((branch) => branch.id === editingLocation.values.branchId)?.name || '' } : location), [filteredLocations, editingLocation, branches]);

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.kind === 'branch') {
      const branch = branches.find((entry) => entry.id === deleteConfirm.id);
      if (!branch) return setDeleteConfirm(null);
      setEditingBranch(null);
      await onDeleteBranch(branch);
      setDeleteConfirm(null);
      return;
    }
    const location = locations.find((entry) => entry.id === deleteConfirm.id);
    if (!location) return setDeleteConfirm(null);
    setEditingLocation(null);
    await onDeleteLocation(location);
    setDeleteConfirm(null);
  };

  if (SINGLE_STORE_MODE) {
    const primaryBranch = branches[0] || null;
    const primaryLocation = locations[0] || null;
    const editingPrimaryBranch = primaryBranch && editingBranch?.branchId === primaryBranch.id ? { ...primaryBranch, ...editingBranch.values } : primaryBranch;
    const editingPrimaryLocation = primaryLocation && editingLocation?.locationId === primaryLocation.id ? { ...primaryLocation, ...editingLocation.values, branchName: branches.find((branch) => branch.id === editingLocation.values.branchId)?.name || '' } : primaryLocation;
    return (
      <div className="two-column-grid">
        <QueryCard title="المتجر الرئيسي" className="settings-reference-card" isLoading={branchesQuery.isLoading} isError={branchesQuery.isError} error={branchesQuery.error} isEmpty={!editingPrimaryBranch} loadingText="جاري تحميل بيانات المتجر الرئيسي..." emptyTitle="لم تتم إضافة بيانات المتجر الرئيسي بعد" emptyHint="أضف تعريف المتجر الرئيسي مرة واحدة قبل متابعة باقي الإعدادات.">
          {editingPrimaryBranch ? <BranchRowActions branch={editingPrimaryBranch} isEditing={editingBranch?.branchId === editingPrimaryBranch.id} onStartEdit={(currentBranch) => setEditingBranch({ branchId: currentBranch.id, values: { name: currentBranch.name || '', code: currentBranch.code || '' } })} onCancelEdit={() => setEditingBranch(null)} onChange={(field, value) => setEditingBranch((current) => current && current.branchId === editingPrimaryBranch.id ? { ...current, values: { ...current.values, [field]: value } } : current)} onSave={async () => { if (!editingBranch || editingBranch.branchId !== editingPrimaryBranch.id) return; await onUpdateBranch(editingPrimaryBranch.id, editingBranch.values); setEditingBranch(null); }} onDelete={() => {}} canManageSettings={canManageSettings} isBusy={branchActionBusy} mutationError={branchActionError} /> : null}
        </QueryCard>
        <QueryCard title="المخزن الأساسي" className="settings-reference-card" isLoading={locationsQuery.isLoading} isError={locationsQuery.isError} error={locationsQuery.error} isEmpty={!editingPrimaryLocation} loadingText="جاري تحميل بيانات المخزن الأساسي..." emptyTitle="لم تتم إضافة المخزن الأساسي بعد" emptyHint="أضف مخزنًا أساسيًا واحدًا لاستخدام هذا الإصدار داخل متجر واحد.">
          {editingPrimaryLocation ? <LocationRowActions location={editingPrimaryLocation} branches={branches} isEditing={editingLocation?.locationId === editingPrimaryLocation.id} onStartEdit={(currentLocation) => setEditingLocation({ locationId: currentLocation.id, values: { name: currentLocation.name || '', code: currentLocation.code || '', branchId: currentLocation.branchId || '' } })} onCancelEdit={() => setEditingLocation(null)} onChange={(field, value) => setEditingLocation((current) => current && current.locationId === editingPrimaryLocation.id ? { ...current, values: { ...current.values, [field]: value } } : current)} onSave={async () => { if (!editingLocation || editingLocation.locationId !== editingPrimaryLocation.id) return; await onUpdateLocation(editingPrimaryLocation.id, editingLocation.values); setEditingLocation(null); }} onDelete={() => {}} canManageSettings={canManageSettings} isBusy={locationActionBusy} mutationError={locationActionError} /> : null}
        </QueryCard>
      </div>
    );
  }

  return (
    <div className="two-column-grid">
      <BranchReferenceCard
        branches={branches}
        branchList={branchList}
        filteredCount={filteredBranches.length}
        branchSearch={branchSearch}
        branchFilter={branchFilter}
        setBranchSearch={setBranchSearch}
        setBranchFilter={setBranchFilter}
        resetBranchFilters={resetBranchFilters}
        copyVisibleBranches={copyVisibleBranches}
        branchesQuery={branchesQuery}
        canManageSettings={canManageSettings}
        editingBranch={editingBranch}
        setEditingBranch={setEditingBranch}
        setDeleteConfirm={setDeleteConfirm}
        branchActionBusy={branchActionBusy}
        branchActionError={branchActionError}
        onUpdateBranch={onUpdateBranch}
      />
      <LocationReferenceCard
        branches={branches}
        locations={locations}
        locationList={locationList}
        filteredCount={filteredLocations.length}
        locationSearch={locationSearch}
        locationFilter={locationFilter}
        setLocationSearch={setLocationSearch}
        setLocationFilter={setLocationFilter}
        resetLocationFilters={resetLocationFilters}
        copyVisibleLocations={copyVisibleLocations}
        locationsQuery={locationsQuery}
        canManageSettings={canManageSettings}
        editingLocation={editingLocation}
        setEditingLocation={setEditingLocation}
        setDeleteConfirm={setDeleteConfirm}
        locationActionBusy={locationActionBusy}
        locationActionError={locationActionError}
        onUpdateLocation={onUpdateLocation}
      />

      <ActionConfirmDialog
        open={Boolean(deleteConfirm)}
        title={deleteConfirm?.kind === 'branch' ? 'تأكيد حذف الفرع' : 'تأكيد حذف الموقع'}
        description={deleteConfirm ? (deleteConfirm.kind === 'branch' ? <>سيتم حذف الفرع <strong>{deleteConfirm.name}</strong>. تابع فقط إذا لم يكن مستخدمًا في الربط التشغيلي أو الإعدادات الحالية.</> : <>سيتم حذف الموقع <strong>{deleteConfirm.name}</strong>. تأكد من عدم استخدامه في التحويلات أو الجرد أو الحركات الحالية.</>) : ''}
        confirmLabel={deleteConfirm?.kind === 'branch' ? 'حذف الفرع' : 'حذف الموقع'}
        confirmVariant="danger"
        confirmationKeyword={deleteConfirm?.name || ''}
        confirmationLabel={deleteConfirm?.kind === 'branch' ? 'اكتب اسم الفرع للتأكيد' : 'اكتب اسم الموقع للتأكيد'}
        confirmationHint="هذا الإجراء يحذف السجل المرجعي الحالي فقط إذا لم يكن مرتبطًا ببيانات تشغيلية أو إعدادات نشطة."
        isBusy={branchActionBusy || locationActionBusy}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={() => void handleDeleteConfirmed()}
      />
    </div>
  );
}
