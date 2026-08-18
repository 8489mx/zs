import type { UseFormReturn } from 'react-hook-form';
import type { SettingsFormInput, SettingsFormOutput } from '@/features/settings/schemas/settings.schema';
import type { Branch, Location } from '@/types/domain';
import { FormSection } from '@/shared/components/form-section';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import { BrandPreview, readFileAsDataUrl, RequiredField, comboListStyle, comboRowStyle, comboCreateStyle } from '@/features/settings/components/forms/settings-forms.shared';

interface GeneralTabProps {
  form: UseFormReturn<SettingsFormInput, undefined, SettingsFormOutput>;
  branches?: Branch[];
  locations?: Location[];
  canManageSettings: boolean;
  disabled: boolean;
  activeTab: string;
  branchQuery: string;
  setBranchQuery: (val: string) => void;
  filteredBranches: Branch[];
  selectedBranch?: Branch;
  stockMode: 'single_location' | 'all_operational_locations';
  setStockMode: (val: 'single_location' | 'all_operational_locations') => void;
  defaultStockLocationId: string;
  setDefaultStockLocationId: (val: string) => void;
  allowExternalSalesStock: boolean;
  setAllowExternalSalesStock: (val: boolean) => void;
  branchStockSaving: boolean;
  setBranchStockSaving: (val: boolean) => void;
  branchStockSaved: boolean;
  setBranchStockSaved: (val: boolean) => void;
  branchStockError: string | null;
  setBranchStockError: (val: string | null) => void;
  branchStockDirty: boolean;
  setBranchStockDirty: (val: boolean) => void;
  branchMenuOpen: boolean;
  setBranchMenuOpen: (val: boolean) => void;
  branchMenuHasContent: boolean;
  branchCreateOptionVisible: boolean;
  commitSelectedBranch: (branchId: string, branchName?: string) => void;
  setBranchPrefillName: (val: string) => void;
  setShowBranchQuickAdd: (val: boolean) => void;
  visibleLocations?: Location[];
  onUpdateBranch?: (id: any, data: any) => Promise<any>;
}

export function GeneralSettingsTab({
  form,
  canManageSettings,
  disabled,
  activeTab,
  branchQuery,
  setBranchQuery,
  filteredBranches,
  selectedBranch,
  stockMode,
  setStockMode,
  defaultStockLocationId,
  setDefaultStockLocationId,
  allowExternalSalesStock,
  setAllowExternalSalesStock,
  branchStockSaving,
  setBranchStockSaving,
  branchStockSaved,
  setBranchStockSaved,
  branchStockError,
  setBranchStockError,
  branchStockDirty,
  setBranchStockDirty,
  branchMenuOpen,
  setBranchMenuOpen,
  branchMenuHasContent,
  branchCreateOptionVisible,
  commitSelectedBranch,
  setBranchPrefillName,
  setShowBranchQuickAdd,
  visibleLocations = [],
  locations = [],
  onUpdateBranch,
}: GeneralTabProps) {


  return (
    <div style={{ display: activeTab === 'general' ? 'block' : 'none' }}>
          {/* معاينة الهوية التجارية */}
          <FormSection title="الهوية التجارية">
            <BrandPreview form={form} />
          </FormSection>

        {/* ===== اللغة والمنطقة ===== */}
        <FormSection title="اللغة والمنطقة" description={<>اضبط لغة الواجهة والعملة والمنطقة الزمنية المستخدمة في شاشة النظام والتقارير.</>}>
          <div className="document-prototype-grid compact-grid-2">
            <div className="field">
              <label>لغة النظام</label>
              <select className="purchase-prototype-field-input" {...form.register('uiLanguage')} disabled={disabled}>
                <option value="ar">العربية</option>
                <option value="en" disabled>English (قريباً)</option>
              </select>
            </div>
            <div className="field">
              <label>العملة</label>
              <select className="purchase-prototype-field-input" {...form.register('currency')} disabled={disabled}>
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>المنطقة الزمنية</label>
              <select className="purchase-prototype-field-input" {...form.register('timezone')} disabled={disabled}>
                <option value="Africa/Cairo">Africa/Cairo</option>
                <option value="Asia/Riyadh">Asia/Riyadh</option>
                <option value="Asia/Dubai">Asia/Dubai</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            <div className="field">
              <label>صيغة التاريخ</label>
              <select className="purchase-prototype-field-input" {...form.register('dateFormat')} disabled={disabled}>
                <option value="yyyy-MM-dd">2026-06-07</option>
                <option value="dd/MM/yyyy">07/06/2026</option>
              </select>
            </div>
            <div className="field">
              <label>صيغة الوقت</label>
              <select className="purchase-prototype-field-input" {...form.register('timeFormat')} disabled={disabled}>
                <option value="24h">24 ساعة</option>
                <option value="12h">12 ساعة</option>
              </select>
            </div>
            <div className="field">
              <label>رابط إرسال الواتساب</label>
              <select className="purchase-prototype-field-input" {...form.register('whatsappLinkMode')} disabled={disabled}>
                <option value="wa_me">افتراضي (يسأل المستخدم)</option>
                <option value="web">واتساب ويب مباشرة</option>
                <option value="app">تطبيق الواتساب مباشرة</option>
              </select>
              <div className="muted small" style={{ marginTop: 4 }}>اختر الطريقة الأسرع لك عند إرسال الرسائل.</div>
            </div>
          </div>
        </FormSection>

        {/* ===== الإعدادات المطلوبة ===== */}
        <FormSection title="الإعدادات المطلوبة للتشغيل" description={<>
            أكمل هذه البيانات أولًا حتى تعمل المبيعات والمخزون والقيود بشكل صحيح. الحقول المميزة بـ <span style={{ color: '#dc2626', fontWeight: 700 }}>*</span> مطلوبة.
          </>}>
          <div className="document-prototype-grid compact-grid-2">
            <RequiredField label="اسم النشاط / المتجر" error={form.formState.errors.storeName?.message}>
              <input className="purchase-prototype-field-input" {...form.register('storeName')} disabled={disabled} />
            </RequiredField>

            {SINGLE_STORE_MODE ? (
              <RequiredField label="الفرع الرئيسي" error={form.formState.errors.currentBranchId?.message}>
                <input className="purchase-prototype-field-input" value={selectedBranch?.name || 'سيتم الربط تلقائيًا بعد حفظ بيانات النشاط الرئيسي'} disabled readOnly />
              </RequiredField>
            ) : (
              <RequiredField label="الفرع الرئيسي" error={form.formState.errors.currentBranchId?.message}>
                <input
                  className="purchase-prototype-field-input"
                  value={branchQuery}
                  placeholder="ابحث أو اكتب اسم فرع جديد لإضافته"
                  disabled={disabled}
                  onFocus={() => setBranchMenuOpen(true)}
                  onChange={(event) => {
                    setBranchQuery(event.target.value);
                    setBranchMenuOpen(true);
                    form.clearErrors('currentBranchId');
                    form.clearErrors('currentLocationId');
                    form.clearErrors('root.serverError');
                  }}
                  onBlur={() => {
                    window.setTimeout(() => setBranchMenuOpen(false), 120);
                  }}
                />
                {branchMenuOpen && branchMenuHasContent ? (
                  <div style={comboListStyle}>
                    {filteredBranches.map((branch) => (
                      <button
                        key={branch.id}
                        type="button"
                        style={comboRowStyle}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          commitSelectedBranch(String(branch.id), String(branch.name || ''));
                        }}
                      >
                        {branch.name}
                      </button>
                    ))}
                    {branchCreateOptionVisible ? (
                      <button
                        type="button"
                        style={comboCreateStyle}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setBranchPrefillName(branchQuery.trim());
                          setShowBranchQuickAdd(true);
                          setBranchMenuOpen(false);
                        }}
                      >
                        + إضافة فرع جديد: &quot;{branchQuery.trim()}&quot;
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </RequiredField>
            )}

            <RequiredField label="مكان الاستلام الافتراضي" error={form.formState.errors.currentLocationId?.message}>
              {visibleLocations.length === 0 ? (
                <div style={{ padding: '10px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.875rem' }}>
                  لا توجد أماكن مخزون متاحة. أنشئ مكان مخزون أولاً من صفحة أماكن المخزون.
                </div>
              ) : (
                <select className="purchase-prototype-field-input" {...form.register('currentLocationId')} disabled={disabled}>
                  <option value="">-- اختر مكان الاستلام الافتراضي --</option>
                  {visibleLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              )}
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>يُستخدم فقط عند عدم تحديد مكان للصنف أو للسطر.</div>
            </RequiredField>

            <RequiredField label="نمط الكاشير الافتراضي">
              <select className="purchase-prototype-field-input" {...form.register('defaultPosMode')} disabled={disabled}>
                <option value="scanner">سكانر</option>
                <option value="touch">تاتش</option>
              </select>
            </RequiredField>
          </div>
        </FormSection>

        {/* ===== مصدر مخزون البيع ===== */}
        {selectedBranch && onUpdateBranch && (
          <FormSection title="مصدر مخزون البيع" description={`إعدادات مخزون البيع للفرع: ${selectedBranch.name}`}>
            <div className="document-prototype-grid compact-grid-2">
              <div className="field">
                <label>مصدر المخزون</label>
                <select
                  className="purchase-prototype-field-input"
                  value={stockMode}
                  disabled={!canManageSettings || branchStockSaving}
                  onChange={(e) => { setStockMode(e.target.value as any); setBranchStockDirty(true); setBranchStockSaved(false); }}
                >
                  <option value="single_location">مخزن محدد</option>
                  <option value="all_operational_locations">كل المخازن التشغيلية</option>
                </select>
              </div>
              <div className="field">
                <label>مخزن البيع الأساسي</label>
                <select
                  className="purchase-prototype-field-input"
                  value={defaultStockLocationId}
                  disabled={!canManageSettings || branchStockSaving}
                  onChange={(e) => { setDefaultStockLocationId(e.target.value); setBranchStockDirty(true); setBranchStockSaved(false); }}
                >
                  <option value="">-- غير محدد --</option>
                  {locations.filter((loc) => !loc.branchId || loc.branchId === selectedBranch.id).map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
              {stockMode === 'all_operational_locations' && (
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: canManageSettings ? 'pointer' : 'default' }}>
                    <input
                      type="checkbox"
                      checked={allowExternalSalesStock}
                      disabled={!canManageSettings || branchStockSaving}
                      onChange={(e) => { setAllowExternalSalesStock(e.target.checked); setBranchStockDirty(true); setBranchStockSaved(false); }}
                    />
                    السماح بالبيع من المخازن الخارجية
                  </label>
                </div>
              )}
            </div>
            {branchStockDirty && canManageSettings && (
              <div className="actions compact-actions" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={branchStockSaving}
                  onClick={async () => {
                    if (!selectedBranch) return;
                    setBranchStockSaving(true);
                    setBranchStockError(null);
                    try {
                      await onUpdateBranch(selectedBranch.id, {
                        name: selectedBranch.name || '',
                        code: selectedBranch.code || '',
                        defaultStockLocationId: defaultStockLocationId || undefined,
                        salesStockMode: stockMode,
                        allowExternalSalesStock,
                      });
                      setBranchStockSaved(true);
                      setBranchStockDirty(false);
                    } catch {
                      setBranchStockError('تعذر حفظ إعدادات المخزون.');
                    } finally {
                      setBranchStockSaving(false);
                    }
                  }}
                >
                  {branchStockSaving ? 'جارٍ الحفظ...' : 'حفظ إعدادات المخزون'}
                </button>
              </div>
            )}
            {branchStockSaved && <div style={{ color: '#16a34a', marginTop: 8, fontSize: '0.875rem' }}>✓ تم حفظ إعدادات مخزون البيع بنجاح.</div>}
            {branchStockError && <div style={{ color: '#dc2626', marginTop: 8, fontSize: '0.875rem' }}>{branchStockError}</div>}
          </FormSection>
        )}

        {/* ===== بيانات النشاط ===== */}
        <FormSection title="بيانات النشاط">
          <div className="document-prototype-grid compact-grid-2">

            <div className="field">
              <label>الهاتف</label>
              <input className="purchase-prototype-field-input" {...form.register('phone')} disabled={disabled} />
            </div>
            <div className="field">
              <label>العنوان</label>
              <input className="purchase-prototype-field-input" {...form.register('address')} disabled={disabled} />
            </div>
            <div className="field">
              <label>رفع الشعار</label>
              <input
                className="purchase-prototype-field-input"
                style={{ paddingTop: 8 }}
                type="file"
                accept="image/*"
                disabled={disabled}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  try {
                    form.setValue('logoData', await readFileAsDataUrl(file), { shouldDirty: true, shouldValidate: true });
                  } finally {
                    event.currentTarget.value = '';
                  }
                }}
              />
            </div>
            <div className="field">
              <label>لون الواجهة</label>
              <div
                style={{
                  display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input className="purchase-prototype-field-input" style={{ height: 42, padding: 4, flexShrink: 0, width: '60px' }} type="color" value={form.watch('accentColor') || '#170c5c'} onChange={(e) => form.setValue('accentColor', e.target.value, { shouldDirty: true })} disabled={disabled} />
                <input className="purchase-prototype-field-input" style={{ height: 42, fontFamily: 'monospace', direction: 'ltr' }} type="text" placeholder="#170c5c" {...form.register('accentColor')} disabled={disabled} />
                <button type="button" className="btn-secondary" style={{ height: 42, whiteSpace: 'nowrap' }} onClick={() => form.setValue('accentColor', '#170c5c', { shouldDirty: true })} disabled={disabled}>اللون الافتراضي</button>
              </div>
            </div>
          </div>
        </FormSection>
        </div>
  );
}
