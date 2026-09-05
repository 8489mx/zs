import type { UseFormReturn } from 'react-hook-form';
import type { SettingsFormInput, SettingsFormOutput } from '@/features/settings/schemas/settings.schema';
import { FormSection } from '@/shared/components/form-section';

interface SalesInventoryTabProps {
  form: UseFormReturn<SettingsFormInput, undefined, SettingsFormOutput>;
  disabled: boolean;
  activeTab: string;
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
}: SalesInventoryTabProps) {
  const isStoreFleet = form.watch('deliveryFeeMode') === 'store_fleet';

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
                <select
                  {...form.register('taxMode')}
                  disabled={disabled}
                  style={{
                    ...fieldControlStyle,
                    cursor: 'pointer',
                    paddingInlineEnd: '28px',
                  }}
                >
                  <option value="exclusive">تضاف فوق السعر</option>
                  <option value="inclusive">ضمن السعر</option>
                </select>
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
        </div>
      </FormSection>

      {/* ===== خيارات وقواعد البيع والمخزون ===== */}
      <FormSection
        title="خيارات وقواعد البيع والمخزون"
        description="ضوابط حركة المخازن والأرصدة وعمليات الكاشير وإصدار أذونات الصرف."
      >
        <div className="settings-two-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
          {/* Card 1: Negative Stock */}
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

          {/* Card 3: Require Shift */}
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

          {/* Card 4: Low Stock Alert */}
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

          {/* Card 4.5: Max Cashier Discount Approval Threshold */}
          <div style={{ gridColumn: '1 / -1', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={iconBadgeStyle}>
                  <CashierShiftLockIcon size={20} />
                </div>
                <div>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>سقف خصم الكاشير واعتماد المدير (PIN)</strong>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block' }}>اشتراط إدخال PIN المدير عند إعطاء الكاشير خصماً يتجاوز حداً معيناً</span>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: form.watch('posMaxDiscountThresholdEnabled') ? '#166534' : '#64748b' }}>
                  {form.watch('posMaxDiscountThresholdEnabled') ? 'مفعل' : 'معطل'}
                </span>
                <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('posMaxDiscountThresholdEnabled')} disabled={disabled} />
              </label>
            </div>

            {form.watch('posMaxDiscountThresholdEnabled') && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    طريقة حساب سقف الخصم
                  </label>
                  <select
                    className="purchase-prototype-field-input"
                    {...form.register('posMaxDiscountThresholdType')}
                    disabled={disabled}
                    style={fieldControlStyle}
                  >
                    <option value="percentage">نسبة مئوية من إجمالي الفاتورة (%)</option>
                    <option value="fixed">مبلغ ثابت بالجنيه (ج.م)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    قيمة سقف الخصم المسموح به {form.watch('posMaxDiscountThresholdType') === 'fixed' ? '(ج.م)' : '(%)'}
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
              </div>
            )}
          </div>

          {/* Card 5: Default Branch Issue Mode (Span 2) */}
          <div style={{ gridColumn: '1 / -1', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={iconBadgeStyle}>
                <IssueModeDocIcon size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>وضع إذن الصرف الافتراضي</strong>
                  <select
                    className="purchase-prototype-field-input"
                    {...form.register('defaultBranchIssueMode')}
                    disabled={disabled}
                    style={{ minWidth: '280px', height: '36px', fontSize: '0.82rem', fontWeight: 700 }}
                  >
                    <option value="final_issue">صرف نهائي (يتم خصم الرصيد فوراً)</option>
                    <option value="transfer_to_branch_stock">تحويل إلى رصيد فرع (يبقى بانتظار الاستلام)</option>
                  </select>
                </div>
                <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  استخدم <strong>الصرف النهائي</strong> إذا كان الفرع لا يدار مخزونه على النظام، أو <strong>تحويل إلى رصيد فرع</strong> إذا كان الفرع يبيع من رصيده على النظام.
                </span>
              </div>
            </div>
          </div>

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
            <select
              className="purchase-prototype-field-input"
              {...form.register('deliveryFeeMode')}
              disabled={disabled}
              style={{ width: isStoreFleet ? '160px' : '190px', height: '36px', fontSize: '0.82rem', fontWeight: 700 }}
            >
              <option value="freelance_courier">مناديب حرة (طياري)</option>
              <option value="store_fleet">أسطول المتجر (داخلي)</option>
            </select>
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
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748b' }}>ج.م</span>
            </div>
          </div>

          {/* Card 8: Store Fleet Courier Commission Rate (Only visible when store fleet is active) */}
          {isStoreFleet ? (
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
          ) : null}
        </div>
      </FormSection>

      {/* ===== ماكينات نقاط البيع والدفع البنكي الذكية ===== */}
      <FormSection
        title="ماكينات نقاط البيع والدفع البنكي الذكية (Smart POS Terminals)"
        description="الربط الشبكي المباشر مع ماكينات الدفع الإلكتروني البنكية (Geidea, Paymob, Network International) لتمرير مبالغ الفواتير آلياً وقراءة نجاح السحب دون إدخال يدوي."
      >
        <div className="settings-two-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
          {/* Card 1: Activation Toggle & Provider Selection */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <label style={{ ...premiumCardStyle, padding: 0, border: 'none', background: 'transparent', boxShadow: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ ...iconBadgeStyle, background: form.watch('posTerminalEnabled') ? '#eff6ff' : '#f8fafc', color: form.watch('posTerminalEnabled') ? '#1d4ed8' : '#64748b' }}>
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
              <select
                className="purchase-prototype-field-input"
                {...form.register('posTerminalProvider')}
                disabled={disabled || !form.watch('posTerminalEnabled')}
                style={fieldControlStyle}
              >
                <option value="geidea">Geidea POS (جيديا - السعودية / مصر)</option>
                <option value="paymob">Paymob Smart POS (باي موب نقاط البيع)</option>
                <option value="network_international">Network International (NI)</option>
                <option value="mock_sandbox">محاكي نقاط البيع التجريبي (Mock Simulator)</option>
              </select>
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

      {/* ===== برنامج نقاط وولاء العملاء ===== */}
      <FormSection
        title="برنامج نقاط ومكافآت ولاء العملاء (Customer Loyalty Program)"
        description="تحفيز العملاء على الشراء المتكرر عبر منحهم نقاطاً مع كل فاتورة، وإمكانية استبدالها برصيد وخصم فوري في الفواتير التالية."
      >
        <div className="settings-two-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
          {/* 1. Toggle Loyalty */}
          <label
            style={{
              ...premiumCardStyle,
              border: form.watch('loyaltyEnabled') ? '1px solid #10b981' : '1px solid #e2e8f0',
              background: form.watch('loyaltyEnabled') ? '#f0fdf4' : '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ ...iconBadgeStyle, background: form.watch('loyaltyEnabled') ? '#dcfce7' : '#f8fafc', color: form.watch('loyaltyEnabled') ? '#15803d' : '#64748b' }}>
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
          <label
            style={{
              ...premiumCardStyle,
              border: form.watch('printShowLoyaltyPoints') ? '1px solid #10b981' : '1px solid #e2e8f0',
              background: form.watch('printShowLoyaltyPoints') ? '#f0fdf4' : '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ ...iconBadgeStyle, background: '#fef3c7', color: '#d97706', borderColor: '#fde68a' }}>
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
                <div style={{ ...iconBadgeStyle, background: '#ede9fe', color: '#6d28d9', borderColor: '#ddd6fe' }}>
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
                      border: isSelected ? '1.5px solid #6d28d9' : '1px solid #e2e8f0',
                      background: isSelected ? '#f5f3ff' : '#f8fafc',
                      color: isSelected ? '#5b21b6' : '#475569',
                      fontWeight: isSelected ? 800 : 600,
                      cursor: 'pointer',
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
                <div style={{ ...iconBadgeStyle, background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }}>
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
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>ج.م</span>
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
                      border: isSelected ? '1.5px solid #b45309' : '1px solid #e2e8f0',
                      background: isSelected ? '#fffbeb' : '#f8fafc',
                      color: isSelected ? '#92400e' : '#475569',
                      fontWeight: isSelected ? 800 : 600,
                      cursor: 'pointer',
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
              <div style={{ ...iconBadgeStyle, background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}>
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
              <div style={{ ...iconBadgeStyle, background: '#fce7f3', color: '#be185d', borderColor: '#fbcfe8' }}>
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
              <span style={{ fontSize: '18px' }}>💡</span>
              <span style={{ fontSize: '0.84rem', color: '#1e293b', fontWeight: 700 }}>
                معاينة حية للمحرك: مشتريات بقيمة <strong>1,000 ج.م</strong> تمنح العميل{' '}
                <strong style={{ color: '#6d28d9' }}>
                  {Math.floor((1000 / 100) * Number(form.watch('loyaltyPointsPer100Egp') || 10))} نقطة
                </strong>{' '}
                قيمتها{' '}
                <strong style={{ color: '#059669' }}>
                  {(Math.floor((1000 / 100) * Number(form.watch('loyaltyPointsPer100Egp') || 10)) * Number(form.watch('loyaltyPointRedeemValue') || 0.1)).toFixed(2)} ج.م
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

      {/* ===== تنبيهات الصلاحية والأصناف الراكدة ===== */}
      <FormSection
        title="تنبيهات الصلاحية وحركة المخزون الراكد"
        description="تخصيص الفترات الزمنية لتنبيهات قرب انتهاء صلاحية المنتجات وتحديد متى يُصنف الصنف كـ 'راكد' في لوحة التحكم والتقارير."
      >
        <div className="settings-two-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
          {/* Card: Expiry Alert Days */}
          <div style={{ ...premiumCardStyle, cursor: 'default', flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                <div style={{ ...iconBadgeStyle, background: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5' }}>
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
                      border: isSelected ? '1.5px solid #dc2626' : '1px solid #e2e8f0',
                      background: isSelected ? '#fef2f2' : '#f8fafc',
                      color: isSelected ? '#b91c1c' : '#475569',
                      fontWeight: isSelected ? 800 : 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
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
                <div style={{ ...iconBadgeStyle, background: '#fef3c7', color: '#d97706', borderColor: '#fde68a' }}>
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
                      border: isSelected ? '1.5px solid #d97706' : '1px solid #e2e8f0',
                      background: isSelected ? '#fffbeb' : '#f8fafc',
                      color: isSelected ? '#b45309' : '#475569',
                      fontWeight: isSelected ? 800 : 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
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
    </div>
  );
}
