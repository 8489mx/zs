import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LightbulbIcon } from '@/shared/components/icons/AppIcons';
import type { UseFormReturn } from 'react-hook-form';
import type { SettingsFormInput, SettingsFormOutput } from '@/features/settings/schemas/settings.schema';
import type { AppSettings } from '@/types/domain';
import { FormSection } from '@/shared/components/form-section';
import { CustomSelect } from '@/shared/ui/custom-select';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';

interface SalesInventoryTabProps {
  form: UseFormReturn<SettingsFormInput, undefined, SettingsFormOutput>;
  disabled: boolean;
  activeTab: string;
  settings?: AppSettings;
}

// Premium SVG Line Icons
function TaxCalcIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 6v12" />
    </svg>
  );
}

function NegativeStockIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21 8-2 2-1.5-1.5" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      <path d="m15 5 3 3" />
      <path d="M3 21h18" />
    </svg>
  );
}

function ZeroCostIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function CashierShiftLockIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <circle cx="12" cy="16" r="1" />
    </svg>
  );
}

function LowStockIndicatorIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  );
}

function IssueModeDocIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </svg>
  );
}

function DeliveryModeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
      <path d="M5 17H3v-4l2-5h9v9" />
      <path d="m14 7 3 3h4v4h-2" />
      <path d="M9 17h6" />
    </svg>
  );
}

function CourierCommissionIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );
}

function DefaultDeliveryFeeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="12" x="2" y="6" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}

function ExpiryAlertIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="12" y1="14" x2="12" y2="17" />
      <line x1="12" y1="19" x2="12.01" y2="19" />
    </svg>
  );
}

function StagnantStockIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
      <circle cx="18" cy="18" r="3" fill="#fef3c7" stroke="#d97706" />
      <polyline points="18 16.5 18 18 19 18" stroke="#d97706" />
    </svg>
  );
}

function LoyaltyPointsIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function PosTerminalIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="20" x="4" y="2" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="16" y1="14" x2="16" y2="14.01" />
      <path d="M8 10h.01" />
      <path d="M12 10h.01" />
      <path d="M16 10h.01" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M8 18h8" />
    </svg>
  );
}

const premiumCardStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 18px',
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
  gap: '12px',
};

const iconBadgeStyle = {
  width: '38px',
  height: '38px',
  borderRadius: '8px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#0f172a',
  flexShrink: 0,
};

const premiumCardTextStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '3px',
};

const premiumCheckboxInputStyle = {
  width: '18px',
  height: '18px',
  accentColor: '#0f172a',
  cursor: 'pointer',
  flexShrink: 0,
};

const fieldControlStyle: React.CSSProperties = {
  width: '100%',
  height: '38px',
  minHeight: '38px',
  padding: '0 12px',
  fontSize: '0.84rem',
  fontWeight: 600,
  color: '#0f172a',
  background: '#ffffff',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  boxSizing: 'border-box',
  lineHeight: '38px',
};

export function SalesInventorySettingsTab({
  form,
  disabled,
  activeTab,
  settings,
}: SalesInventoryTabProps) {
  const industry = String(settings?.businessIndustry || form.watch('businessIndustry') || 'general').toLowerCase();
  const isPosModuleEnabled = Boolean(form.watch('posModuleEnabled') ?? settings?.posModuleEnabled ?? true);
  const isNonPosVertical = ['contracting', 'maritime', 'services'].includes(industry) || (industry === 'import_export' && !isPosModuleEnabled);
  const showPosSettings = isPosModuleEnabled && !isNonPosVertical;
  const showPhysicalInventory = industry !== 'services';
  const isDedicatedContracting = industry === 'contracting';
  const isDedicatedMaritime = industry === 'maritime';
  const isDedicatedImport = industry === 'import_export';
  const isDedicatedServices = industry === 'services';

  const isStoreFleet = form.watch('deliveryFeeMode') === 'store_fleet';
  const [isChangingPin, setIsChangingPin] = useState(false);

  return (
    <div style={{ display: activeTab === 'sales_inventory' ? 'block' : 'none' }}>
      {/* ===== إعدادات البيع والضريبة ===== */}
      <FormSection
        title="إعدادات البيع والضريبة"
        description="تحديد نسبة الضريبة على المبيعات، وطريقة احتسابها على أسعار الأصناف، والرقم الضريبي."
      >
        <div className="settings-two-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
          {/* Card 1: Tax Mode & Rate */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={iconBadgeStyle}>
                <TaxCalcIcon size={20} />
              </div>
              <div>
                <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>حساب الضريبة على المبيعات</strong>
                <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block' }}>طريقة إضافة القيمة المضافة ونسبتها</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  نسبة الضريبة (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...form.register('taxRate')}
                  disabled={disabled}
                  placeholder="0"
                  style={{
                    ...fieldControlStyle,
                    textAlign: 'center',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  طريقة احتساب الضريبة
                </label>
                <CustomSelect
                  value={form.watch('taxMode') || 'exclusive'}
                  onChange={(val) => form.setValue('taxMode', val as any, { shouldDirty: true, shouldValidate: true })}
                  options={[
                    { value: 'exclusive', label: 'تضاف فوق السعر' },
                    { value: 'inclusive', label: 'ضمن السعر' },
                  ]}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Organization Tax Number */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>الرقم الضريبي للمنشأة</strong>
              <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', fontWeight: 600 }}>الفواتير والإيصالات</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                رقم التسجيل الضريبي المطبوع على الفاتورة
              </label>
              <input
                {...form.register('taxNumber')}
                disabled={disabled}
                placeholder="مثال: 123-456-789"
                style={fieldControlStyle}
              />
              <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                يظهر هذا الرقم أعلى ترويسة فواتير المبيعات، الإيصالات الحرارية، وتقارير الإقرارات الضريبية.
              </span>
            </div>
          </div>

          {/* Direct link to Advanced Tax & E-Invoice Integration */}
          <div style={{ gridColumn: '1 / -1', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontSize: '0.78rem', color: '#475569' }}>
              للربط السحابي المباشر مع مصلحة الضرائب المصرية (ETA) أو هيئة الزكاة والضريبة والجمارك (ZATCA):
            </span>
            <Link
              to="/settings/tax-integration"
              className="btn btn-secondary"
              style={{ padding: '4px 12px', fontSize: '0.78rem', fontWeight: 700 }}
            >
              إعدادات الضرائب والفاتورة الإلكترونية
            </Link>
          </div>
        </div>
      </FormSection>

      {/* ===== خيارات وقواعد البيع والمخزون ===== */}
      <FormSection
        title="خيارات وقواعد البيع والمخزون"
        description="ضوابط حركة المخازن والأرصدة وعمليات الكاشير وإصدار أذونات الصرف."
      >
        <div className="settings-two-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
          {/* Card 1: Negative Stock */}
          {showPhysicalInventory && (
            <label style={premiumCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={iconBadgeStyle}>
                  <NegativeStockIcon size={20} />
                </div>
                <div style={premiumCardTextStyle}>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>السماح بالبيع بالسالب</strong>
                  <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>تخطي تحذير عدم كفاية المخزون عند إتمام الفاتورة بالكاشير</small>
                </div>
              </div>
              <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('allowNegativeStockSales')} disabled={disabled} />
            </label>
          )}

          {/* Card 2: Zero Purchase Cost */}
          <label style={premiumCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={iconBadgeStyle}>
                <ZeroCostIcon size={20} />
              </div>
              <div style={premiumCardTextStyle}>
                <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>السماح بسعر شراء صفر</strong>
                <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>مخصص للأصناف المهداة، العينات المجانية، والعطايا الترويجية</small>
              </div>
            </div>
            <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('allowZeroPurchaseCost')} disabled={disabled} />
          </label>

          {/* Card 3: Require Shift (Only for POS) */}
          {showPosSettings && (
            <label style={premiumCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={iconBadgeStyle}>
                  <CashierShiftLockIcon size={20} />
                </div>
                <div style={premiumCardTextStyle}>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>إجبار فتح وردية لعمليات الكاشير</strong>
                  <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>منع البيع قبل فتح الوردية وتحديد العهدة لضبط الخزينة</small>
                </div>
              </div>
              <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('requireCashierShiftForSales')} disabled={disabled} />
            </label>
          )}

          {/* Card 4: Low Stock Alert */}
          {showPhysicalInventory && (
            <div style={{ ...premiumCardStyle, cursor: 'default' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <div style={iconBadgeStyle}>
                  <LowStockIndicatorIcon size={20} />
                </div>
                <div style={premiumCardTextStyle}>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>حد التنبيه لنقص المخزون</strong>
                  <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>يظهر تنبيه نواقص عندما يصل الرصيد لهذا الحد أو أقل</small>
                </div>
              </div>
              <input
                className="purchase-prototype-field-input"
                type="number"
                min="0"
                {...form.register('lowStockThreshold')}
                disabled={disabled}
                placeholder="5"
                style={{ width: '80px', height: '36px', textAlign: 'center', fontWeight: 800, fontSize: '0.9rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
          )}

          {/* Card 4.5: Max Cashier Discount Approval Threshold & Manager PIN (Only for POS) */}
          {showPosSettings && (
            <div style={{ gridColumn: '1 / -1', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={iconBadgeStyle}>
                    <CashierShiftLockIcon size={20} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>سقف خصم الكاشير واعتماد المدير (PIN)</strong>
                    <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block' }}>اشتراط إدخال PIN المدير عند إعطاء الكاشير خصماً يتجاوز حداً معيناً أو لتعديل العمليات الحساسة</span>
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: form.watch('posMaxDiscountThresholdEnabled') ? '#166534' : '#64748b' }}>
                    {form.watch('posMaxDiscountThresholdEnabled') ? 'سقف الخصم: مفعّل' : 'سقف الخصم: معطل'}
                  </span>
                  <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('posMaxDiscountThresholdEnabled')} disabled={disabled} />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    الرمز السري للمدير (PIN)
                  </label>
                  {settings?.hasManagerPin && !isChangingPin ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', minHeight: '38px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534' }}>
                          تم حفظ وتفعيل رمز سري للمدير
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsChangingPin(true);
                          form.setValue('managerPin', '', { shouldDirty: true });
                        }}
                        disabled={disabled}
                        style={{
                          padding: '3px 10px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          color: '#170c5c',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '5px',
                          cursor: 'pointer',
                        }}
                      >
                        تغيير الرمز
                      </button>
                    </div>
                  ) : !settings?.hasManagerPin && !isChangingPin ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', minHeight: '38px' }}>
                      <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                        لم يتم تعيين رمز سري بعد (اختياري)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsChangingPin(true);
                          form.setValue('managerPin', '', { shouldDirty: true });
                        }}
                        disabled={disabled}
                        style={{
                          padding: '3px 10px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          color: '#170c5c',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '5px',
                          cursor: 'pointer',
                        }}
                      >
                        تعيين رمز PIN
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="password"
                          inputMode="numeric"
                          autoComplete="new-password"
                          data-lpignore="true"
                          data-1p-ignore="true"
                          maxLength={10}
                          className="purchase-prototype-field-input"
                          {...form.register('managerPin')}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                            form.setValue('managerPin', digits, { shouldValidate: true, shouldDirty: true });
                          }}
                          disabled={disabled}
                          placeholder="أدخل الرمز الجديد (4 - 10 أرقام)"
                          style={fieldControlStyle}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setIsChangingPin(false);
                            form.setValue('managerPin', '', { shouldDirty: false });
                            form.clearErrors('managerPin');
                          }}
                          style={{
                            padding: '7px 12px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            color: '#64748b',
                            background: '#f1f5f9',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          إلغاء
                        </button>
                      </div>
                      <small style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                        الرمز السري المطلوب لاعتماد العمليات الحساسة وتجاوز سقف الخصم بالكاشير.
                      </small>
                    </div>
                  )}
                </div>

                {form.watch('posMaxDiscountThresholdEnabled') && (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        طريقة حساب سقف الخصم
                      </label>
                      <CustomSelect
                        value={form.watch('posMaxDiscountThresholdType') || 'percentage'}
                        onChange={(val) => form.setValue('posMaxDiscountThresholdType', val as any, { shouldDirty: true, shouldValidate: true })}
                        options={[
                          { value: 'percentage', label: 'نسبة مئوية من إجمالي الفاتورة (%)' },
                          { value: 'fixed', label: 'مبلغ ثابت بالجنيه (${getGlobalCurrencySymbol()})' },
                        ]}
                        disabled={disabled}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        قيمة سقف الخصم المسموح به {form.watch('posMaxDiscountThresholdType') === 'fixed' ? '(${getGlobalCurrencySymbol()})' : '(%)'}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        className="purchase-prototype-field-input"
                        {...form.register('posMaxDiscountThresholdValue')}
                        disabled={disabled}
                        placeholder={form.watch('posMaxDiscountThresholdType') === 'fixed' ? 'مثال: 50' : 'مثال: 15'}
                        style={fieldControlStyle}
                      />
                      <small style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                        عند تطبيق خصم أعلى من هذا الحد بالكاشير، لن تكتمل الفاتورة إلا بإدخال رمز مرور المدير (PIN).
                      </small>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Card 5: Default Branch Issue Mode (Span 2) */}
          {showPhysicalInventory && (
            <div style={{ gridColumn: '1 / -1', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={iconBadgeStyle}>
                  <IssueModeDocIcon size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>وضع إذن الصرف الافتراضي</strong>
                    <div style={{ minWidth: '280px' }}>
                      <CustomSelect
                        value={form.watch('defaultBranchIssueMode') || 'final_issue'}
                        onChange={(val) => form.setValue('defaultBranchIssueMode', val as any, { shouldDirty: true, shouldValidate: true })}
                        options={[
                          { value: 'final_issue', label: 'صرف نهائي (يتم خصم الرصيد فوراً)' },
                          { value: 'transfer_to_branch_stock', label: 'تحويل إلى رصيد فرع (يبقى بانتظار الاستلام)' },
                        ]}
                        disabled={disabled}
                      />
                    </div>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    استخدم <strong>الصرف النهائي</strong> إذا كان الفرع لا يدار مخزونه على النظام، أو <strong>تحويل إلى رصيد فرع</strong> إذا كان الفرع يبيع من رصيده على النظام.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Delivery Handling Cards (Only for POS / Retail / Fleets) */}
          {showPosSettings && (
            <>
              {/* Card 6: Delivery Fee Mode */}
              <div style={{ ...premiumCardStyle, cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <div style={iconBadgeStyle}>
                    <DeliveryModeIcon size={20} />
                  </div>
                  <div style={premiumCardTextStyle}>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>معالجة رسوم التوصيل</strong>
                    <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>
                      {isStoreFleet ? 'أسطول المتجر (إيراد للمحل وتُطبق عمولة الطيار)' : 'مناديب حرة / طياري (100% للمندوب ولا تدخل الخزينة)'}
                    </small>
                  </div>
                </div>
                <div style={{ width: isStoreFleet ? '170px' : '200px' }}>
                  <CustomSelect
                    value={form.watch('deliveryFeeMode') || 'freelance_courier'}
                    onChange={(val) => form.setValue('deliveryFeeMode', val as any, { shouldDirty: true, shouldValidate: true })}
                    options={[
                      { value: 'freelance_courier', label: 'مناديب حرة (طياري)' },
                      { value: 'store_fleet', label: 'أسطول المتجر (داخلي)' },
                    ]}
                    disabled={disabled}
                  />
                </div>
              </div>

              {/* Card 7: Default Delivery Fee */}
              <div style={{ ...premiumCardStyle, cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <div style={iconBadgeStyle}>
                    <DefaultDeliveryFeeIcon size={20} />
                  </div>
                  <div style={premiumCardTextStyle}>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>رسوم التوصيل الافتراضية</strong>
                    <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>
                      تُملأ تلقائياً عند اختيار دليفري وقابلة للتعديل بالكاشير
                    </small>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    className="purchase-prototype-field-input"
                    type="number"
                    min="0"
                    step="1"
                    {...form.register('defaultDeliveryFee')}
                    disabled={disabled}
                    placeholder="0"
                    style={{ width: '85px', height: '36px', textAlign: 'center', fontWeight: 800, fontSize: '0.9rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748b' }}><CurrencySymbol /></span>
                </div>
              </div>

              {/* Card 8: Store Fleet Courier Commission Rate (Only visible when store fleet is active) */}
              {isStoreFleet && (
                <div style={{ ...premiumCardStyle, cursor: 'default', gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <div style={iconBadgeStyle}>
                      <CourierCommissionIcon size={20} />
                    </div>
                    <div style={premiumCardTextStyle}>
                      <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>نسبة الطيار من التوصيل</strong>
                      <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>عمولة طياري الأسطول (0% للثابت)</small>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      className="purchase-prototype-field-input"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      {...form.register('storeFleetCommissionRate')}
                      disabled={disabled}
                      placeholder="0"
                      style={{ width: '70px', height: '36px', textAlign: 'center', fontWeight: 800, fontSize: '0.9rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#334155' }}>%</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </FormSection>

      {/* ===== ماكينات نقاط البيع والدفع البنكي الذكية ===== */}
      {showPosSettings && (
        <FormSection
          title="ماكينات نقاط البيع والدفع البنكي الذكية (Smart POS Terminals)"
          description="الربط الشبكي المباشر مع ماكينات الدفع الإلكتروني البنكية (Geidea, Paymob, Network International) لتمرير مبالغ الفواتير آلياً وقراءة نجاح السحب دون إدخال يدوي."
        >
          <div className="settings-two-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
            {/* Card 1: Activation Toggle & Provider Selection */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <label style={{ ...premiumCardStyle, padding: 0, border: 'none', background: 'transparent', boxShadow: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={iconBadgeStyle}>
                    <PosTerminalIcon size={20} />
                  </div>
                  <div style={premiumCardTextStyle}>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>تفعيل ربط ماكينات الدفع (POS Terminal)</strong>
                    <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>إظهار خيار إرسال المبلغ لماكينة البنك آلياً في شاشة الكاشير عند الدفع بالبطاقة</small>
                  </div>
                </div>
                <input
                  type="checkbox"
                  style={premiumCheckboxInputStyle}
                  {...form.register('posTerminalEnabled')}
                  disabled={disabled}
                />
              </label>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  مزود خدمة ماكينة الدفع البنكي
                </label>
                <CustomSelect
                  value={form.watch('posTerminalProvider') || 'mock_sandbox'}
                  onChange={(val) => form.setValue('posTerminalProvider', val as any, { shouldDirty: true, shouldValidate: true })}
                  options={[
                    { value: 'geidea', label: 'Geidea POS (جيديا - السعودية / مصر)' },
                    { value: 'paymob', label: 'Paymob Smart POS (باي موب نقاط البيع)' },
                    { value: 'network_international', label: 'Network International (NI)' },
                    { value: 'mock_sandbox', label: 'محاكي نقاط البيع التجريبي (Mock Simulator)' },
                  ]}
                  disabled={disabled || !form.watch('posTerminalEnabled')}
                />
                <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  يدعم الربط الشبكي بروتوكول TCP/IP و ECR عبر الشبكة المحلية (LAN/Wi-Fi).
                </span>
              </div>
            </div>

            {/* Card 2: Terminal Details & IP Configuration */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  اسم الجهاز / الماكينة
                </label>
                <input
                  className="purchase-prototype-field-input"
                  {...form.register('posTerminalName')}
                  disabled={disabled || !form.watch('posTerminalEnabled')}
                  placeholder="مثال: جهاز الكاشير الرئيسي (EDC)"
                  style={fieldControlStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    عنوان IP الماكينة (Local IP)
                  </label>
                  <input
                    className="purchase-prototype-field-input"
                    {...form.register('posTerminalIp')}
                    disabled={disabled || !form.watch('posTerminalEnabled')}
                    placeholder="192.168.1.150"
                    dir="ltr"
                    style={{ ...fieldControlStyle, textAlign: 'left', fontFamily: 'monospace' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    المنفذ (Port)
                  </label>
                  <input
                    type="number"
                    className="purchase-prototype-field-input"
                    {...form.register('posTerminalPort')}
                    disabled={disabled || !form.watch('posTerminalEnabled')}
                    placeholder="8080"
                    dir="ltr"
                    style={{ ...fieldControlStyle, textAlign: 'center', fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: form.watch('posTerminalEnabled') ? '#10b981' : '#94a3b8', display: 'inline-block' }}></span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
                    حالة التكامل: {form.watch('posTerminalEnabled') ? 'مفعل وجاهز بالكاشير' : 'معطل'}
                  </span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  بروتوكول ECR / IP Direct
                </span>
              </div>
            </div>
          </div>
        </FormSection>
      )}

      {/* ===== برنامج نقاط وولاء العملاء ===== */}
      {showPosSettings && (
        <FormSection
          title="برنامج نقاط ومكافآت ولاء العملاء (Customer Loyalty Program)"
          description="تحفيز العملاء على الشراء المتكرر عبر منحهم نقاطاً مع كل فاتورة، وإمكانية استبدالها برصيد وخصم فوري في الفواتير التالية."
        >
          <div className="settings-two-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
            {/* 1. Toggle Loyalty */}
            <label style={premiumCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={iconBadgeStyle}>
                  <LoyaltyPointsIcon size={20} />
                </div>
                <div style={premiumCardTextStyle}>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>تفعيل برنامج نقاط الولاء</strong>
                  <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>احتساب نقاط تلقائياً للعميل عند البيع وإتاحة استبدالها في الكاشير</small>
                </div>
              </div>
              <input
                type="checkbox"
                style={premiumCheckboxInputStyle}
                {...form.register('loyaltyEnabled')}
                disabled={disabled}
              />
            </label>

            {/* 2. Print on Receipt */}
            <label style={premiumCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={iconBadgeStyle}>
                  <IssueModeDocIcon size={20} />
                </div>
                <div style={premiumCardTextStyle}>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>إظهار رصيد النقاط في الفاتورة</strong>
                  <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>طباعة النقاط المكتسبة والرصيد الإجمالي في الإيصالات الحرارية وفواتير A4</small>
                </div>
              </div>
              <input
                type="checkbox"
                style={premiumCheckboxInputStyle}
                {...form.register('printShowLoyaltyPoints')}
                disabled={disabled}
              />
            </label>

            {/* 3. Earning Rate */}
            <div style={{ ...premiumCardStyle, cursor: 'default', flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <div style={iconBadgeStyle}>
                    <LoyaltyPointsIcon size={20} />
                  </div>
                  <div style={premiumCardTextStyle}>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>معدل اكتساب النقاط</strong>
                    <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>عدد النقاط المكتسبة لكل 100 جنيه مشتريات مسددة:</small>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    className="purchase-prototype-field-input"
                    type="number"
                    min="0"
                    step="1"
                    {...form.register('loyaltyPointsPer100Egp')}
                    disabled={disabled || !form.watch('loyaltyEnabled')}
                    placeholder="10"
                    style={{ width: '75px', height: '36px', textAlign: 'center', fontWeight: 800, fontSize: '0.9rem', borderRadius: '6px', border: '1.5px solid #cbd5e1' }}
                  />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>نقطة</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '4px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                {[
                  { label: '5 نقاط', val: 5 },
                  { label: '10 نقاط', val: 10 },
                  { label: '20 نقطة', val: 20 },
                  { label: '50 نقطة', val: 50 },
                ].map((p) => {
                  const currentVal = Number(form.watch('loyaltyPointsPer100Egp') ?? 10);
                  const isSelected = currentVal === p.val;
                  return (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => form.setValue('loyaltyPointsPer100Egp', p.val, { shouldDirty: true, shouldValidate: true })}
                      disabled={disabled || !form.watch('loyaltyEnabled')}
                      style={{
                        padding: '4px 2px',
                        fontSize: '0.71rem',
                        textAlign: 'center',
                        borderRadius: '6px',
                        border: isSelected ? '1px solid #170e5e' : '1px solid #e2e8f0',
                        background: isSelected ? '#eef2ff' : '#f8fafc',
                        color: isSelected ? '#170e5e' : '#475569',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Redemption Value */}
            <div style={{ ...premiumCardStyle, cursor: 'default', flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <div style={iconBadgeStyle}>
                    <ZeroCostIcon size={20} />
                  </div>
                  <div style={premiumCardTextStyle}>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>قيمة النقطة عند الاستبدال</strong>
                    <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>القيمة المالية للنقطة الواحدة كخصم بالجنيه:</small>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    className="purchase-prototype-field-input"
                    type="number"
                    min="0.01"
                    step="0.01"
                    {...form.register('loyaltyPointRedeemValue')}
                    disabled={disabled || !form.watch('loyaltyEnabled')}
                    placeholder="0.10"
                    style={{ width: '85px', height: '36px', textAlign: 'center', fontWeight: 800, fontSize: '0.9rem', borderRadius: '6px', border: '1.5px solid #cbd5e1' }}
                  />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}><CurrencySymbol /></span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '4px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                {[
                  { label: '0.05 ج (5 قروش)', val: 0.05 },
                  { label: '0.10 ج (10 قروش)', val: 0.1 },
                  { label: '0.50 ج (نصف جنيه)', val: 0.5 },
                  { label: '1.00 ج (جنيه كامل)', val: 1 },
                ].map((p) => {
                  const currentVal = Number(form.watch('loyaltyPointRedeemValue') ?? 0.1);
                  const isSelected = Math.abs(currentVal - p.val) < 0.001;
                  return (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => form.setValue('loyaltyPointRedeemValue', p.val, { shouldDirty: true, shouldValidate: true })}
                      disabled={disabled || !form.watch('loyaltyEnabled')}
                      style={{
                        padding: '4px 2px',
                        fontSize: '0.71rem',
                        textAlign: 'center',
                        borderRadius: '6px',
                        border: isSelected ? '1px solid #170e5e' : '1px solid #e2e8f0',
                        background: isSelected ? '#eef2ff' : '#f8fafc',
                        color: isSelected ? '#170e5e' : '#475569',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Minimum Redeem Points */}
            <div style={{ ...premiumCardStyle, cursor: 'default' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={iconBadgeStyle}>
                  <LoyaltyPointsIcon size={20} />
                </div>
                <div style={premiumCardTextStyle}>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>الحد الأدنى للنقاط للاستبدال</strong>
                  <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>أقل رصيد نقاط يجب أن يمتلكه العميل ليتمكن من الخصم</small>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  className="purchase-prototype-field-input"
                  type="number"
                  min="0"
                  step="1"
                  {...form.register('loyaltyMinRedeemPoints')}
                  disabled={disabled || !form.watch('loyaltyEnabled')}
                  placeholder="50"
                  style={{ width: '75px', height: '36px', textAlign: 'center', fontWeight: 800, fontSize: '0.9rem', borderRadius: '6px', border: '1.5px solid #cbd5e1' }}
                />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>نقطة</span>
              </div>
            </div>

            {/* 6. Max Discount Percentage */}
            <div style={{ ...premiumCardStyle, cursor: 'default' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={iconBadgeStyle}>
                  <TaxCalcIcon size={20} />
                </div>
                <div style={premiumCardTextStyle}>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>سقف الخصم بالنقاط من الفاتورة</strong>
                  <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>أقصى نسبة مئوية مسموح بخصمها من إجمالي الفاتورة عبر النقاط</small>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  className="purchase-prototype-field-input"
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  {...form.register('loyaltyMaxDiscountPercentage')}
                  disabled={disabled || !form.watch('loyaltyEnabled')}
                  placeholder="50"
                  style={{ width: '75px', height: '36px', textAlign: 'center', fontWeight: 800, fontSize: '0.9rem', borderRadius: '6px', border: '1.5px solid #cbd5e1' }}
                />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>%</span>
              </div>
            </div>
          </div>

          {/* Live Simulation Card */}
          {form.watch('loyaltyEnabled') ? (
            <div style={{
              marginTop: '12px',
              padding: '12px 16px',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <LightbulbIcon size={18} color="#170e5e" />
                <span style={{ fontSize: '0.84rem', color: '#1e293b', fontWeight: 700 }}>
                  معاينة حية للمحرك: مشتريات بقيمة <strong>1,000 <CurrencySymbol /></strong> تمنح العميل{' '}
                  <strong style={{ color: '#170e5e' }}>
                    {Math.floor((1000 / 100) * Number(form.watch('loyaltyPointsPer100Egp') || 10))} نقطة
                  </strong>{' '}
                  قيمتها{' '}
                  <strong style={{ color: '#170e5e' }}>
                    {(Math.floor((1000 / 100) * Number(form.watch('loyaltyPointsPer100Egp') || 10)) * Number(form.watch('loyaltyPointRedeemValue') || 0.1)).toFixed(2)} <CurrencySymbol />
                  </strong>{' '}
                  خصم فوري في مشترياته القادمة (معدل استرجاع{' '}
                  <strong>
                    {(((Math.floor((1000 / 100) * Number(form.watch('loyaltyPointsPer100Egp') || 10)) * Number(form.watch('loyaltyPointRedeemValue') || 0.1)) / 1000) * 100).toFixed(1)}%
                  </strong>).
                </span>
              </div>
            </div>
          ) : null}
        </FormSection>
      )}

      {/* ===== تنبيهات الصلاحية والأصناف الراكدة ===== */}
      {showPhysicalInventory && (
        <FormSection
          title="تنبيهات الصلاحية وحركة المخزون الراكد"
          description="تخصيص الفترات الزمنية لتنبيهات قرب انتهاء صلاحية المنتجات وتحديد متى يُصنف الصنف كـ 'راكد' في لوحة التحكم والتقارير."
        >
          <div className="settings-two-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
            {/* Card: Expiry Alert Days */}
            <div style={{ ...premiumCardStyle, cursor: 'default', flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <div style={iconBadgeStyle}>
                    <ExpiryAlertIcon size={20} />
                  </div>
                  <div style={premiumCardTextStyle}>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>تنبيه قرب انتهاء الصلاحية</strong>
                    <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>إظهار تنبيهات وتصنيف الأصناف كـ "وشيكة الانتهاء" قبل انتهاء تاريخها بـ:</small>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    className="purchase-prototype-field-input"
                    type="number"
                    min="1"
                    {...form.register('expiryAlertDays')}
                    disabled={disabled}
                    placeholder="30"
                    style={{ width: '75px', height: '36px', textAlign: 'center', fontWeight: 800, fontSize: '0.9rem', borderRadius: '6px', border: '1.5px solid #cbd5e1' }}
                  />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>يوم</span>
                </div>
              </div>
              {/* Quick Presets */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '4px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                {[
                  { label: '15 يوم', days: 15 },
                  { label: '30 يوم', days: 30 },
                  { label: '60 يوم', days: 60 },
                  { label: '90 يوم', days: 90 },
                  { label: '180 يوم', days: 180 },
                ].map((p) => {
                  const currentVal = Number(form.watch('expiryAlertDays') || 30);
                  const isSelected = currentVal === p.days;
                  return (
                    <button
                      key={p.days}
                      type="button"
                      onClick={() => form.setValue('expiryAlertDays', p.days, { shouldDirty: true, shouldValidate: true })}
                      disabled={disabled}
                      style={{
                        padding: '4px 2px',
                        fontSize: '0.71rem',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        borderRadius: '6px',
                        border: isSelected ? '1px solid #170e5e' : '1px solid #e2e8f0',
                        background: isSelected ? '#eef2ff' : '#f8fafc',
                        color: isSelected ? '#170e5e' : '#475569',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Card: Stagnant Product Days */}
            <div style={{ ...premiumCardStyle, cursor: 'default', flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <div style={iconBadgeStyle}>
                    <StagnantStockIcon size={20} />
                  </div>
                  <div style={premiumCardTextStyle}>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>معيار الأصناف الراكدة</strong>
                    <small className="muted" style={{ fontSize: '0.76rem', color: '#64748b' }}>تصنيف الصنف كـ "راكد" في لوحة التحكم والتقارير إذا لم يُبَع منه منذ:</small>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    className="purchase-prototype-field-input"
                    type="number"
                    min="1"
                    {...form.register('stagnantProductDays')}
                    disabled={disabled}
                    placeholder="30"
                    style={{ width: '75px', height: '36px', textAlign: 'center', fontWeight: 800, fontSize: '0.9rem', borderRadius: '6px', border: '1.5px solid #cbd5e1' }}
                  />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>يوم</span>
                </div>
              </div>
              {/* Quick Presets */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '4px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                {[
                  { label: '30 يوم', days: 30 },
                  { label: '60 يوم', days: 60 },
                  { label: '90 يوم', days: 90 },
                  { label: '120 يوم', days: 120 },
                  { label: '180 يوم', days: 180 },
                  { label: '365 يوم', days: 365 },
                ].map((p) => {
                  const currentVal = Number(form.watch('stagnantProductDays') || 30);
                  const isSelected = currentVal === p.days;
                  return (
                    <button
                      key={p.days}
                      type="button"
                      onClick={() => form.setValue('stagnantProductDays', p.days, { shouldDirty: true, shouldValidate: true })}
                      disabled={disabled}
                      style={{
                        padding: '4px 2px',
                        fontSize: '0.71rem',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        borderRadius: '6px',
                        border: isSelected ? '1px solid #170e5e' : '1px solid #e2e8f0',
                        background: isSelected ? '#eef2ff' : '#f8fafc',
                        color: isSelected ? '#170e5e' : '#475569',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </FormSection>
      )}

      {/* ===== مخصص لشركات المقاولات والمشاريع (Contracting Dedicated) ===== */}
      {isDedicatedContracting && (
        <FormSection
          title="ضوابط مشاريع المقاولات والمستخلصات (BOQ & IPC Controls)"
          description="تحديد القواعد المالية لمشاريع المقاولات، ونسب دفعات الضمان المحتجزة، واستقطاعات الدفعة المقدمة من المستخلصات الجارية."
        >
          <div className="settings-two-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>نسبة دفعة ضمان الأعمال المحتجزة (Retention %)</strong>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>النسبة المئوية المحتجزة تلقائياً من مستخلصات المالك أو الاستشاري لصالح فترة الضمان والصيانة.</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  defaultValue={5}
                  disabled={disabled}
                  style={{ ...fieldControlStyle, width: '120px', textAlign: 'center' }}
                />
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>% (الافتراضي 5% - 10%)</span>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>استقطاع الدفعة المقدمة من المستخلصات</strong>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>طريقة إهلاك وخصم الدفعة المقدمة من مستخلصات التنفيذ التراكمية.</span>
              <CustomSelect
                value="proportional"
                onChange={() => {}}
                options={[
                  { value: 'proportional', label: 'خصم نسبي تلقائي حسب نسبة إنجاز المستخلص' },
                  { value: 'fixed', label: 'مبلغ قطعي محدد لكل مستخلص' },
                ]}
                disabled={disabled}
              />
            </div>
          </div>
        </FormSection>
      )}

      {/* ===== مخصص لشركات الشحن واللوجستيات (Maritime Dedicated) ===== */}
      {isDedicatedMaritime && (
        <FormSection
          title="ضوابط الشحن الدولي والعمليات الملاحية (Maritime Operations)"
          description="تحديد العملة الافتراضية لفواتير الشحن والنولون، وأيام السماح لغرامات الأرضيات والحاويات (Demurrage & Detention)."
        >
          <div className="settings-two-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>أيام السماح المجانية للحاويات (Demurrage Free Days)</strong>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>عدد الأيام المسموح بها في الميناء وساحات التخزين قبل بدء احتساب غرامات التأخير اليومية.</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  defaultValue={14}
                  disabled={disabled}
                  style={{ ...fieldControlStyle, width: '120px', textAlign: 'center' }}
                />
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>يوم (الافتراضي 14 أو 21 يوماً)</span>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>عملة تسعير النولون والخدمات البحرية الافتراضية</strong>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>العملة الأساسية لعروض الأسعار الملاحية والتعامل مع الخطوط الدولية.</span>
              <CustomSelect
                value="USD"
                onChange={() => {}}
                options={[
                  { value: 'USD', label: 'الدولار الأمريكي (USD $)' },
                  { value: 'EUR', label: 'اليورو الأوروبي (EUR €)' },
                  { value: 'EGP', label: 'الجنيه المصري (EGP)' },
                ]}
                disabled={disabled}
              />
            </div>
          </div>
        </FormSection>
      )}

      {/* ===== مخصص لشركات الاستيراد والتصدير (Import/Export Dedicated) ===== */}
      {isDedicatedImport && (
        <FormSection
          title="ضوابط الرسائل الجمركية وتكاليف الاستيراد (Landed Cost & Customs)"
          description="تحديد معيار توزيع مصاريف الشحن والتخليص الجمركي وضريبة الوارد على بنود وأصناف الرسالة الاستيرادية."
        >
          <div className="settings-two-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>أساس توزيع تكلفة الاستيراد الإجمالية (Landed Cost)</strong>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>المعيار المحاسبي لتوزيع مصاريف الشحن والجمارك والمصادقات على تكلفة الوحدة في المخزن.</span>
              <CustomSelect
                value="by_value"
                onChange={() => {}}
                options={[
                  { value: 'by_value', label: 'حسب القيمة المالية لكل صنف (Value Proportional)' },
                  { value: 'by_weight', label: 'حسب الوزن الإجمالي (Gross Weight - KG/Ton)' },
                  { value: 'by_volume', label: 'حسب الحجم بالمتر المكعب (CBM)' },
                  { value: 'by_quantity', label: 'حسب عدد القطع والوحدات (Quantity)' },
                ]}
                disabled={disabled}
              />
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>الربط التلقائي للمصاريف البنكية والاعتمادات</strong>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>إدراج عمولات فتح الاعتماد المستندي (LC) وفروق أسعار الصرف ضمن تكلفة الشحنة.</span>
              <CustomSelect
                value="auto_link"
                onChange={() => {}}
                options={[
                  { value: 'auto_link', label: 'ربط تلقائي بالرسالة الجمركية المفتوحة' },
                  { value: 'manual', label: 'ترحيل يدوي لحساب المصروفات التمويلية' },
                ]}
                disabled={disabled}
              />
            </div>
          </div>
        </FormSection>
      )}

      {/* ===== مخصص للمكاتب والشركات الخدمية (Services Dedicated) ===== */}
      {isDedicatedServices && (
        <FormSection
          title="ضوابط العقود والخدمات المهنية والاستشارية"
          description="تحديد نمط فوترة عقود الخدمات وإدارة فترات الاشتراكات والدفعات التعاقدية."
        >
          <div className="settings-two-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>نمط احتساب وإصدار فواتير الخدمات</strong>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>الأساس المعتمد لفوترة الخدمات المهنية والاستشارية لعملاء الشركة.</span>
              <CustomSelect
                value="deliverable"
                onChange={() => {}}
                options={[
                  { value: 'deliverable', label: 'حسب تسليم البنود والمراحل (Milestone / Deliverable)' },
                  { value: 'subscription', label: 'اشتراكات شهرية متكررة (Retainer / Monthly)' },
                  { value: 'hourly', label: 'حسب ساعات العمل المسجلة (Time & Material)' },
                ]}
                disabled={disabled}
              />
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>فترة السماح لتجديد عقود الخدمات</strong>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>أيام الإشعار التلقائي قبل انتهاء مدة العقد أو الاشتراك لطلب التجديد.</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  defaultValue={30}
                  disabled={disabled}
                  style={{ ...fieldControlStyle, width: '120px', textAlign: 'center' }}
                />
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>يوم قبل الانتهاء</span>
              </div>
            </div>
          </div>
        </FormSection>
      )}
    </div>
  );
}
