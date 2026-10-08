import { useMemo, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import type { Branch, Location } from '@/types/domain';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import { useAuthStore } from '@/stores/auth-store';
import { resolveCurrentVertical } from '@/shared/verticals/vertical-scope';
import {
  BranchReferenceCard,
  BranchRowActions,
  LocationReferenceCard,
  LocationRowActions,
  type BranchActionState,
  type LocationActionState,
  type ReferenceDeleteConfirmState,
} from '@/features/settings/components/workspace-sections/reference-section.shared';
import { QueryCard } from '@/shared/components/query-card';
import { DialogShell } from '@/shared/components/dialog-shell';
import { LocationForm } from '@/features/settings/components/forms/LocationForm';
import { BranchForm } from '@/features/settings/components/forms/BranchForm';

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
  onUpdateBranch: (branchId: string, values: { name: string; code: string; defaultStockLocationId?: string; salesStockMode?: 'single_location' | 'all_operational_locations'; allowExternalSalesStock?: boolean; }) => Promise<void>;
  onDeleteBranch: (branch: Branch) => Promise<void>;
  onUpdateLocation: (locationId: string, values: { name: string; code: string; branchId: string }) => Promise<void>;
  onDeleteLocation: (location: Location) => Promise<void>;
  branchActionBusy: boolean;
  locationActionBusy: boolean;
  branchActionError?: unknown;
  locationActionError?: unknown;
  setupMode?: boolean;
  onSetupAdvance?: () => void;
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
  setupMode,
  onSetupAdvance,
}: SettingsReferenceSectionProps) {
  const tenant = useAuthStore((s) => s.tenant);
  const currentVertical = resolveCurrentVertical(tenant);
  const isMaritime = currentVertical === 'maritime';
  const isContracting = currentVertical === 'contracting';
  const isNonPos = isMaritime || isContracting;

  const [editingBranch, setEditingBranch] = useState<BranchActionState | null>(null);
  const [editingLocation, setEditingLocation] = useState<LocationActionState | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ReferenceDeleteConfirmState | null>(null);
  const [showLocationQuickAdd, setShowLocationQuickAdd] = useState(false);
  const [showBranchQuickAdd, setShowBranchQuickAdd] = useState(false);

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
      <div className="page-stack">
        <QueryCard title={isMaritime ? 'المقر الملاحي الرئيسي' : isContracting ? 'المقر الرئيسي' : 'النشاط الرئيسي'} className="settings-reference-card" isLoading={branchesQuery.isLoading} isError={branchesQuery.isError} error={branchesQuery.error} isEmpty={!editingPrimaryBranch} loadingText={isMaritime ? 'جاري تحميل بيانات المقر الرئيسي...' : 'جاري تحميل بيانات النشاط الرئيسي...'} emptyTitle={isMaritime ? 'لم تتم إضافة المقر الرئيسي بعد' : 'لم تتم إضافة بيانات النشاط الرئيسي بعد'} emptyHint={isMaritime ? 'أضف تعريف المقر الملاحي الرئيسي مرة واحدة قبل متابعة باقي الإعدادات.' : 'أضف تعريف النشاط الرئيسي مرة واحدة قبل متابعة باقي الإعدادات.'}>
          {editingPrimaryBranch ? <BranchRowActions branch={editingPrimaryBranch} locations={locations} isEditing={editingBranch?.branchId === editingPrimaryBranch.id} onStartEdit={(currentBranch) => setEditingBranch({ branchId: currentBranch.id, values: { name: currentBranch.name || '', code: currentBranch.code || '', defaultStockLocationId: currentBranch.defaultStockLocationId || undefined, salesStockMode: currentBranch.salesStockMode || 'single_location', allowExternalSalesStock: currentBranch.allowExternalSalesStock || false } })} onCancelEdit={() => setEditingBranch(null)} onChange={(field, value) => setEditingBranch((current) => current && current.branchId === editingPrimaryBranch.id ? { ...current, values: { ...current.values, [field]: value } } : current)} onSave={async () => { if (!editingBranch || editingBranch.branchId !== editingPrimaryBranch.id) return; await onUpdateBranch(editingPrimaryBranch.id, editingBranch.values as any); setEditingBranch(null); }} onDelete={() => {}} canManageSettings={canManageSettings} isBusy={branchActionBusy} mutationError={branchActionError} setupMode={setupMode} /> : null}
          {setupMode && onSetupAdvance && (
            <div className="actions" style={{ marginTop: '24px' }}>
              <Button variant="primary" onClick={onSetupAdvance}>التالي</Button>
            </div>
          )}
        </QueryCard>
        {!setupMode && (
          <QueryCard title={isMaritime ? 'الميناء / المحطة الأساسية' : isContracting ? 'موقع التشوين الأساسي' : 'المخزن الأساسي'} className="settings-reference-card" isLoading={locationsQuery.isLoading} isError={locationsQuery.isError} error={locationsQuery.error} isEmpty={!editingPrimaryLocation} loadingText={isMaritime ? 'جاري تحميل بيانات الميناء...' : 'جاري تحميل بيانات المخزن الأساسي...'} emptyTitle={isMaritime ? 'لم تتم إضافة الميناء الأساسي بعد' : 'لم تتم إضافة المخزن الأساسي بعد'} emptyHint={isMaritime ? 'أضف ميناء أو محطة أساسية للبدء.' : 'أضف مخزنًا أساسيًا واحدًا لاستخدام هذا الإصدار داخل متجر واحد.'}>
            {editingPrimaryLocation ? <LocationRowActions location={editingPrimaryLocation} branches={branches} isEditing={editingLocation?.locationId === editingPrimaryLocation.id} onStartEdit={(currentLocation) => setEditingLocation({ locationId: currentLocation.id, values: { name: currentLocation.name || '', code: currentLocation.code || '', branchId: currentLocation.branchId || '', locationType: currentLocation.locationType || 'internal_warehouse' } })} onCancelEdit={() => setEditingLocation(null)} onChange={(field, value) => setEditingLocation((current) => current && current.locationId === editingPrimaryLocation.id ? { ...current, values: { ...current.values, [field]: value } } : current)} onSave={async () => { if (!editingLocation || editingLocation.locationId !== editingPrimaryLocation.id) return; await onUpdateLocation(editingPrimaryLocation.id, editingLocation.values as any); setEditingLocation(null); }} onDelete={() => {}} canManageSettings={canManageSettings} isBusy={locationActionBusy} mutationError={locationActionError} /> : null}
          </QueryCard>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="settings-two-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', alignItems: 'start' }}>
        <BranchReferenceCard
          locations={locations}
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
          onShowAddBranch={() => setShowBranchQuickAdd(true)}
          setupMode={setupMode}
        />

        {!setupMode && (
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
            onShowAddLocation={() => setShowLocationQuickAdd(true)}
          />
        )}
      </div>

      {setupMode && onSetupAdvance && (
        <div className="actions" style={{ margin: '16px 0', justifyContent: 'flex-start' }}>
          <Button variant="primary" onClick={onSetupAdvance}>التالي</Button>
        </div>
      )}

      {/* مودال تعديل الفرع */}
      <DialogShell open={Boolean(editingBranch)} onClose={() => setEditingBranch(null)} width="min(600px, 95vw)" ariaLabel={isMaritime ? 'تعديل المقر الملاحي' : isContracting ? 'تعديل موقع العمل' : 'تعديل الفرع'} showCloseButton={true}>
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', paddingInlineEnd: '36px' }}>
            <strong style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 800, display: 'block' }}>
              {isMaritime
                ? `تعديل المقر الملاحي: ${editingBranch?.values.name || ''}`
                : isContracting
                ? `تعديل موقع العمل: ${editingBranch?.values.name || ''}`
                : `تعديل الفرع: ${editingBranch?.values.name || ''}`}
            </strong>
            <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
              {isMaritime
                ? 'تعديل بيانات المقر والمكتب الملاحي وكود التعريف'
                : isContracting
                ? 'تعديل بيانات موقع العمل والكود التنفيذي'
                : 'تعديل بيانات الفرع، كود المتجر، ومخازن البيع'}
            </span>
          </div>

          {editingBranch && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    {isMaritime ? 'اسم المقر / المكتب الملاحي' : isContracting ? 'اسم المقر / موقع العمل' : 'اسم الفرع'}
                  </label>
                  <input
                    value={editingBranch.values.name}
                    onChange={(e) => setEditingBranch({ ...editingBranch, values: { ...editingBranch.values, name: e.target.value } })}
                    disabled={branchActionBusy}
                    style={{ width: '100%', height: '38px', padding: '0 12px', fontSize: '0.84rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    {isMaritime ? 'كود المكتب الملاحي' : isContracting ? 'كود موقع العمل' : 'كود الفرع'}
                  </label>
                  <input
                    value={editingBranch.values.code || ''}
                    onChange={(e) => setEditingBranch({ ...editingBranch, values: { ...editingBranch.values, code: e.target.value } })}
                    disabled={branchActionBusy}
                    style={{ width: '100%', height: '38px', padding: '0 12px', fontSize: '0.84rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {!isNonPos && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>مخزن البيع الأساسي</label>
                      <select
                        value={editingBranch.values.defaultStockLocationId || ''}
                        onChange={(e) => setEditingBranch({ ...editingBranch, values: { ...editingBranch.values, defaultStockLocationId: e.target.value || undefined } })}
                        disabled={branchActionBusy}
                        style={{ width: '100%', height: '38px', padding: '0 12px', fontSize: '0.84rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', boxSizing: 'border-box' }}
                      >
                        <option value="">-- غير محدد --</option>
                        {locations.filter((loc) => !loc.branchId || loc.branchId === editingBranch.branchId).map((loc) => (
                          <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>مصدر مخزون البيع</label>
                      <select
                        value={editingBranch.values.salesStockMode || 'single_location'}
                        onChange={(e) => setEditingBranch({ ...editingBranch, values: { ...editingBranch.values, salesStockMode: e.target.value as any } })}
                        disabled={branchActionBusy}
                        style={{ width: '100%', height: '38px', padding: '0 12px', fontSize: '0.84rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', boxSizing: 'border-box' }}
                      >
                        <option value="single_location">مخزن محدد</option>
                        <option value="all_operational_locations">كل المخازن التشغيلية</option>
                      </select>
                    </div>
                  </div>

                  {editingBranch.values.salesStockMode === 'all_operational_locations' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', fontWeight: 600, color: '#334155', cursor: 'pointer', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <input
                        type="checkbox"
                        checked={editingBranch.values.allowExternalSalesStock || false}
                        onChange={(e) => setEditingBranch({ ...editingBranch, values: { ...editingBranch.values, allowExternalSalesStock: e.target.checked } })}
                        disabled={branchActionBusy}
                        style={{ width: '16px', height: '16px', margin: 0 }}
                      />
                      <span>السماح بالبيع من المخازن الخارجية</span>
                    </label>
                  )}
                </>
              )}

              {branchActionError ? (
                <div style={{ color: '#b91c1c', fontSize: '0.78rem', background: '#fef2f2', padding: '8px 12px', borderRadius: '6px', border: '1px solid #fecaca' }}>
                  {isMaritime ? 'تعذر تحديث بيانات المقر الملاحي.' : isContracting ? 'تعذر تحديث بيانات موقع العمل.' : 'تعذر تحديث بيانات الفرع.'}
                </div>
              ) : null}

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                <Button
                  variant="primary"
                  onClick={async () => {
                    if (!editingBranch) return;
                    await onUpdateBranch(editingBranch.branchId, editingBranch.values as any);
                    setEditingBranch(null);
                  }}
                  disabled={branchActionBusy || !editingBranch.values.name.trim()}
                  style={{ padding: '8px 22px', background: '#0f172a', fontWeight: 800, fontSize: '0.84rem' }}
                >
                  {branchActionBusy ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
                </Button>
                <Button variant="secondary" onClick={() => setEditingBranch(null)} disabled={branchActionBusy} style={{ padding: '8px 18px', fontSize: '0.84rem' }}>
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogShell>

      {/* مودال تعديل المخزن / الميناء */}
      <DialogShell open={Boolean(editingLocation)} onClose={() => setEditingLocation(null)} width="min(600px, 95vw)" ariaLabel={isMaritime ? 'تعديل الميناء / المحطة' : isContracting ? 'تعديل موقع التشوين' : 'تعديل المخزن'} showCloseButton={true}>
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', paddingInlineEnd: '36px' }}>
            <strong style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 800, display: 'block' }}>
              {isMaritime
                ? `تعديل الميناء / المحطة: ${editingLocation?.values.name || ''}`
                : isContracting
                ? `تعديل موقع التشوين: ${editingLocation?.values.name || ''}`
                : `تعديل المخزن: ${editingLocation?.values.name || ''}`}
            </strong>
            <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
              {isMaritime
                ? 'تعديل بيانات الميناء والكود الدولي ومحطات الحاويات'
                : isContracting
                ? 'تعديل بيانات مخزن التشوين والمشروع التابع له'
                : 'تعديل اسم المخزن والكود ونوع الرصيد'}
            </span>
          </div>

          {editingLocation && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    {isMaritime ? 'اسم الميناء / محطة الحاويات' : isContracting ? 'اسم موقع التشوين الميداني' : 'اسم المخزن'}
                  </label>
                  <input
                    value={editingLocation.values.name}
                    onChange={(e) => setEditingLocation({ ...editingLocation, values: { ...editingLocation.values, name: e.target.value } })}
                    disabled={locationActionBusy}
                    style={{ width: '100%', height: '38px', padding: '0 12px', fontSize: '0.84rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    {isMaritime ? 'كود الميناء الدولي (UN/LOCODE)' : isContracting ? 'كود موقع التشوين' : 'كود المخزن'}
                  </label>
                  <input
                    value={editingLocation.values.code || ''}
                    onChange={(e) => setEditingLocation({ ...editingLocation, values: { ...editingLocation.values, code: e.target.value } })}
                    disabled={locationActionBusy}
                    placeholder={isMaritime ? 'مثال: EGALY, EGPSD' : ''}
                    style={{ width: '100%', height: '38px', padding: '0 12px', fontSize: '0.84rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {!SINGLE_STORE_MODE ? (
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      {isMaritime ? 'المكتب الملاحي المشرف' : isContracting ? 'المقر / المشروع التابع له' : 'الفرع المرتبط'}
                    </label>
                    <select
                      value={editingLocation.values.branchId || ''}
                      onChange={(e) => setEditingLocation({ ...editingLocation, values: { ...editingLocation.values, branchId: e.target.value } })}
                      disabled={locationActionBusy}
                      style={{ width: '100%', height: '38px', padding: '0 12px', fontSize: '0.84rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', boxSizing: 'border-box' }}
                    >
                      <option value="">بدون ربط</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    {isMaritime ? 'طبيعة الموقع الملاحي' : isContracting ? 'طبيعة موقع التشوين' : 'نوع المخزن'}
                  </label>
                  <select
                    value={editingLocation.values.locationType || 'internal_warehouse'}
                    onChange={(e) => setEditingLocation({ ...editingLocation, values: { ...editingLocation.values, locationType: e.target.value as any } })}
                    disabled={locationActionBusy}
                    style={{ width: '100%', height: '38px', padding: '0 12px', fontSize: '0.84rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', boxSizing: 'border-box' }}
                  >
                    {isMaritime ? (
                      <>
                        <option value="internal_warehouse">محطة حاويات ومستودع تخزين جمركي</option>
                        <option value="branch_stock">رصيف ميناء وموقع تشغيلي نشط</option>
                      </>
                    ) : isContracting ? (
                      <>
                        <option value="internal_warehouse">مخزن تشوين رئيسي داخلي</option>
                        <option value="branch_stock">تشوين ميداني نشط بموقع المشروع</option>
                      </>
                    ) : (
                      <>
                        <option value="internal_warehouse">مخزن داخلي (لا يظهر كأرصدة فروع)</option>
                        <option value="branch_stock">رصيد فرع (متاح للبيع)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {locationActionError ? (
                <div style={{ color: '#b91c1c', fontSize: '0.78rem', background: '#fef2f2', padding: '8px 12px', borderRadius: '6px', border: '1px solid #fecaca' }}>
                  {isMaritime ? 'تعذر تحديث بيانات الميناء / المحطة.' : isContracting ? 'تعذر تحديث بيانات موقع التشوين.' : 'تعذر تحديث بيانات المخزن.'}
                </div>
              ) : null}

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                <Button
                  variant="primary"
                  onClick={async () => {
                    if (!editingLocation) return;
                    await onUpdateLocation(editingLocation.locationId, editingLocation.values as any);
                    setEditingLocation(null);
                  }}
                  disabled={locationActionBusy || !editingLocation.values.name.trim()}
                  style={{ padding: '8px 22px', background: '#0f172a', fontWeight: 800, fontSize: '0.84rem' }}
                >
                  {locationActionBusy ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
                </Button>
                <Button variant="secondary" onClick={() => setEditingLocation(null)} disabled={locationActionBusy} style={{ padding: '8px 18px', fontSize: '0.84rem' }}>
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogShell>

      {/* مودال إضافة فرع / مقر سريع */}
      <DialogShell open={showBranchQuickAdd} onClose={() => setShowBranchQuickAdd(false)} width="min(600px, 95vw)" ariaLabel={isMaritime ? 'إضافة مقر ملاحي جديد' : isContracting ? 'إضافة موقع عمل جديد' : 'إضافة فرع جديد'} showCloseButton={true}>
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', paddingInlineEnd: '36px' }}>
            <strong style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 800, display: 'block' }}>
              {isMaritime ? 'إضافة مقر / مكتب ملاحي جديد' : isContracting ? 'إضافة موقع عمل جديد' : 'إضافة فرع جديد'}
            </strong>
            <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
              {isMaritime ? 'أدخل اسم وكود المقر الملاحي لإضافته للمنظومة' : isContracting ? 'أدخل اسم وكود موقع العمل لإضافته' : 'أدخل اسم وكود الفرع لإضافته للمنظومة'}
            </span>
          </div>
          <BranchForm
            canManageSettings={canManageSettings}
            initialValues={{ name: '', code: '' }}
            onCreated={() => setShowBranchQuickAdd(false)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-start', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowBranchQuickAdd(false)}>إلغاء</button>
          </div>
        </div>
      </DialogShell>

      {/* مودال إضافة مخزن / ميناء جديد */}
      <DialogShell open={showLocationQuickAdd} onClose={() => setShowLocationQuickAdd(false)} width="min(600px, 95vw)" ariaLabel={isMaritime ? 'إضافة ميناء / محطة جديدة' : isContracting ? 'إضافة موقع تشوين جديد' : 'إضافة مخزن جديد'} showCloseButton={true}>
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', paddingInlineEnd: '36px' }}>
            <strong style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 800, display: 'block' }}>
              {isMaritime ? 'إضافة ميناء / محطة حاويات جديدة' : isContracting ? 'إضافة موقع تشوين جديد' : 'إضافة مخزن جديد'}
            </strong>
            <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
              {isMaritime ? 'أدخل بيانات الميناء أو محطة الحاويات والمكتب المشرف' : isContracting ? 'أدخل بيانات موقع التشوين والمشروع التابع له' : 'أدخل بيانات المخزن والفرع التابع له'}
            </span>
          </div>
          <LocationForm
            branches={branches}
            canManageSettings={canManageSettings}
            initialValues={{ name: '', branchId: branches[0]?.id ? String(branches[0].id) : '', locationType: 'internal_warehouse' }}
            onCreated={() => setShowLocationQuickAdd(false)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-start', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowLocationQuickAdd(false)}>إلغاء</button>
          </div>
        </div>
      </DialogShell>

      <ActionConfirmDialog
        open={Boolean(deleteConfirm)}
        title={deleteConfirm?.kind === 'branch'
          ? (isMaritime ? 'تأكيد حذف المقر الملاحي' : isContracting ? 'تأكيد حذف موقع العمل' : 'تأكيد حذف الفرع')
          : (isMaritime ? 'تأكيد حذف الميناء / المحطة' : isContracting ? 'تأكيد حذف موقع التشوين' : 'تأكيد حذف المخزن')}
        description={deleteConfirm ? (deleteConfirm.kind === 'branch'
          ? (isMaritime
            ? <>سيتم حذف المقر الملاحي <strong>{deleteConfirm.name}</strong>. تابع فقط إذا لم يكن مستخدمًا في العمليات التشغيلية أو البوالص الحالية.</>
            : isContracting
            ? <>سيتم حذف موقع العمل <strong>{deleteConfirm.name}</strong>. تابع فقط إذا لم يكن مستخدمًا في المشاريع أو المستخلصات الحالية.</>
            : <>سيتم حذف الفرع <strong>{deleteConfirm.name}</strong>. تابع فقط إذا لم يكن مستخدمًا في الربط التشغيلي أو الإعدادات الحالية.</>)
          : (isMaritime
            ? <>سيتم حذف الميناء / المحطة <strong>{deleteConfirm.name}</strong>. تأكد من عدم وجود حاويات أو بوالص مرتبطة به.</>
            : isContracting
            ? <>سيتم حذف موقع التشوين <strong>{deleteConfirm.name}</strong>. تأكد من عدم استخدامه في التشوينات أو العمليات الجارية.</>
            : <>سيتم حذف المخزن <strong>{deleteConfirm.name}</strong>. تأكد من عدم استخدامه في التحويلات أو الجرد أو الحركات الحالية.</>)) : ''}
        confirmLabel={deleteConfirm?.kind === 'branch'
          ? (isMaritime ? 'حذف المقر' : isContracting ? 'حذف موقع العمل' : 'حذف الفرع')
          : (isMaritime ? 'حذف الميناء / المحطة' : isContracting ? 'حذف موقع التشوين' : 'حذف المخزن')}
        confirmVariant="danger"
        confirmationHint={isMaritime
          ? 'هذا الإجراء يحذف السجل المرجعي الحالي فقط إذا لم يكن مرتبطًا بعمليات شحن نشطة.'
          : isContracting
          ? 'هذا الإجراء يحذف السجل المرجعي الحالي فقط إذا لم يكن مرتبطًا بمشاريع أو مستخلصات نشطة.'
          : 'هذا الإجراء يحذف السجل المرجعي الحالي فقط إذا لم يكن مرتبطًا ببيانات تشغيلية أو إعدادات نشطة.'}
        isBusy={branchActionBusy || locationActionBusy}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={() => void handleDeleteConfirmed()}
      />
    </div>
  );
}
