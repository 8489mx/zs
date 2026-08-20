import type { UseFormReturn } from 'react-hook-form';
import type { SettingsFormInput, SettingsFormOutput } from '@/features/settings/schemas/settings.schema';
import { FormSection } from '@/shared/components/form-section';
import { useHasFeature } from '@/shared/hooks/use-permission';

interface ModulesTabProps {
  form: UseFormReturn<SettingsFormInput, undefined, SettingsFormOutput>;
  disabled: boolean;
  activeTab: string;
}

const premiumCardStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px',
  background: 'var(--surface-color, #ffffff)',
  border: '1px solid var(--border-color, #e2e8f0)',
  borderRadius: '12px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
};

const premiumCardTextStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '4px',
};

const premiumCheckboxInputStyle = {
  width: '20px',
  height: '20px',
  accentColor: 'var(--primary-color, #0284c7)',
  cursor: 'pointer',
};

export function ModulesSettingsTab({ form, disabled, activeTab }: ModulesTabProps) {
  const hasManufacturingFeature = useHasFeature('manufacturing');
  const clothingModuleEnabled = form.watch('clothingModuleEnabled');
  const weightedBarcodeEnabled = form.watch('weightedBarcodeEnabled');

  return (
        <div style={{ display: activeTab === 'modules' ? 'block' : 'none' }}>
        {/* ===== موديولات النظام ===== */}
        <FormSection title="موديولات النظام" description={<>شغّل الأجزاء اللي محتاجها بس — والباقي هيتخفى تلقائيًا من الشاشات.</>}>
          <div className="document-prototype-grid compact-grid-2">
            {hasManufacturingFeature && (
              <label style={premiumCardStyle}>
                <div style={premiumCardTextStyle}>
                  <strong>🏭 التصنيع والإنتاج</strong>
                  <small className="muted">يضيف خيارات المكونات والتصنيع</small>
                </div>
                <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('manufacturingModuleEnabled')} disabled={disabled} />
              </label>
            )}
            <label style={premiumCardStyle}>
              <div style={premiumCardTextStyle}>
                <strong>📦 العروض المجمعة والوجبات</strong>
                <small className="muted">يفعّل العروض المكونة من عدة أصناف (Combos)</small>
              </div>
              <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('comboModuleEnabled')} disabled={disabled} />
            </label>
            <label style={premiumCardStyle}>
              <div style={premiumCardTextStyle}>
                <strong>🚢 موديول الاستيراد والشراكة</strong>
                <small className="muted">يفعّل إدارة الحاويات، ديون الصين، وتوزيع الأرباح</small>
              </div>
              <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('importModuleEnabled')} disabled={disabled} />
            </label>
            <label style={premiumCardStyle}>
              <div style={premiumCardTextStyle}>
                <strong>🍽️ موديول المطاعم والكافيهات</strong>
                <small className="muted">يفعّل نظام الطاولات وأنواع الطلبات</small>
              </div>
              <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('restaurantModuleEnabled')} disabled={disabled} />
            </label>
            <label style={premiumCardStyle}>
              <div style={premiumCardTextStyle}>
                <strong>🛒 اختيار الطاولة والعميل بالكاشير</strong>
                <small className="muted">يظهر حقول العميل والطاولة أعلى السلة لتسهيل الاختيار قبل الدفع</small>
              </div>
              <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('posShowCartMeta')} disabled={disabled} />
            </label>

            <label style={premiumCardStyle}>
              <div style={premiumCardTextStyle}>
                <strong>📱 موديول محلات الموبايل والإلكترونيات</strong>
                <small className="muted">يفعّل تتبع السيريال/IMEI للأجهزة، وفحص الضمان والمبيعات المتخصصة</small>
              </div>
              <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('enableMobileStoreFeatures')} disabled={disabled} />
            </label>
            <label style={premiumCardStyle}>
              <div style={premiumCardTextStyle}>
                <strong>👗 موديل الملابس والمتغيرات</strong>
                <small className="muted">يفعّل موديلات الملابس والأحجام والألوان</small>
              </div>
              <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('clothingModuleEnabled')} disabled={disabled} />
            </label>
            <label style={premiumCardStyle}>
              <div style={premiumCardTextStyle}>
                <strong>⚖️ باركود الميزان</strong>
                <small className="muted">باركود مضمّن فيه الوزن أو السعر مباشرةً</small>
              </div>
              <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('weightedBarcodeEnabled')} disabled={disabled} />
            </label>
            <label style={premiumCardStyle}>
              <div style={premiumCardTextStyle}>
                <strong>🏢 موديول الشركات والمحاسبة المتقدمة</strong>
                <small className="muted">يفعّل مراكز التكلفة، ربط الفواتير بالمشاريع، وشروط التعاقد في فواتير الشراء والبيع</small>
              </div>
              <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('enableEnterpriseFeatures')} disabled={disabled} />
            </label>
          </div>

          {form.watch('enableMobileStoreFeatures') ? (
            <div className="document-prototype-grid compact-grid-2" style={{ marginTop: 16 }}>
              <div className="field">
                <label style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px', display: 'block' }}>
                  ⚙️ نسبة عمولة فني الصيانة من صافي المصنعية (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  className="purchase-prototype-field-input"
                  {...form.register('technicianCommissionRate')}
                  disabled={disabled}
                  placeholder="30"
                  style={{ fontWeight: 700 }}
                />
                <small className="muted">تُحسب العمولة تلقائيًا كنسبة مئوية من صافي ربح المصنعية وشغل اليد بعد خصم سعر قطع الغيار القطاعي.</small>
              </div>
            </div>
          ) : null}

          {clothingModuleEnabled ? (
            <div className="document-prototype-grid compact-grid-2" style={{ marginTop: 16 }}>
              <div className="field">
                <label>الصنف الافتراضي عند الإضافة</label>
                <select className="purchase-prototype-field-input" {...form.register('defaultProductKind')} disabled={disabled}>
                  <option value="standard">صنف عادي</option>
                  <option value="fashion">موديل ملابس</option>
                </select>
              </div>
            </div>
          ) : null}

          {weightedBarcodeEnabled ? (
            <div className="document-prototype-grid compact-grid-2" style={{ marginTop: 16 }}>
              <div className="field">
                <label>بداية باركود الميزان</label>
                <input className="purchase-prototype-field-input" inputMode="numeric" {...form.register('weightedBarcodePrefix')} disabled={disabled} placeholder="21" />
              </div>
              <div className="field">
                <label>أرقام كود الصنف</label>
                <input className="purchase-prototype-field-input" type="number" min="3" max="8" {...form.register('weightedBarcodeProductCodeLength')} disabled={disabled} />
              </div>
              <div className="field">
                <label>أرقام الوزن</label>
                <input className="purchase-prototype-field-input" type="number" min="3" max="8" {...form.register('weightedBarcodeWeightDigits')} disabled={disabled} />
              </div>
              <div className="field">
                <label>دقة الوزن (خانات عشرية)</label>
                <input className="purchase-prototype-field-input" type="number" min="0" max="3" {...form.register('weightedBarcodeWeightDecimals')} disabled={disabled} />
              </div>
            </div>
          ) : null}
        </FormSection>
        </div>

  );
}
