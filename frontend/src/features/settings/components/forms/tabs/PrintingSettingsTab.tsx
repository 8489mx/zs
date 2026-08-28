import type { CSSProperties } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { SettingsFormInput, SettingsFormOutput } from '@/features/settings/schemas/settings.schema';
import type { AppSettings } from '@/types/domain';
import { FormSection } from '@/shared/components/form-section';

const checkboxGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))',
  gap: '6px',
};

const checkboxStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '5px 8px',
  borderRadius: '6px',
  border: '1px solid var(--border-color, #e2e8f0)',
  background: 'var(--surface-color, #ffffff)',
  cursor: 'pointer',
  fontSize: '11.5px',
  fontWeight: 600,
  color: 'var(--text-color, #334155)',
  userSelect: 'none',
  transition: 'background 0.15s ease, border-color 0.15s ease',
};

const checkboxInputStyle: CSSProperties = {
  margin: 0,
  width: '15px',
  height: '15px',
  accentColor: 'var(--primary-color, #0284c7)',
  cursor: 'pointer',
};

const premiumCardStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 14px',
  background: 'var(--surface-color, #ffffff)',
  border: '1px solid var(--border-color, #e2e8f0)',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
};

const premiumCardTextStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '2px',
};

const premiumCheckboxInputStyle = {
  width: '16px',
  height: '16px',
  accentColor: 'var(--primary-color, #0284c7)',
  cursor: 'pointer',
};

const groupCardStyle: React.CSSProperties = {
  background: 'var(--panel-subtle, rgba(248, 250, 252, 0.6))',
  border: '1px solid var(--border-color, #e2e8f0)',
  borderRadius: '8px',
  padding: '8px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const groupHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  borderBottom: '1px dashed var(--border-color, #e2e8f0)',
  paddingBottom: '5px',
};

const groupHeaderBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '18px',
  height: '18px',
  borderRadius: '4px',
  background: 'var(--primary-color, #0284c7)',
  color: '#ffffff',
  fontSize: '10px',
  fontWeight: 800,
};

const groupHeaderTitleStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  color: 'var(--text-color, #1e293b)',
};

interface PrintingTabProps {
  form: UseFormReturn<SettingsFormInput, undefined, SettingsFormOutput>;
  disabled: boolean;
  activeTab: string;
  settings?: AppSettings;
  systemPrinters?: { name: string; displayName: string }[];
  savedCashierPrinter?: string;
  savedKitchenPrinter?: string;
  posKitchenPrinterEnabled?: boolean;
}

export function PrintingSettingsTab({
  form,
  disabled,
  activeTab,
  settings,
  systemPrinters = [],
  savedCashierPrinter,
  savedKitchenPrinter,
  posKitchenPrinterEnabled,
}: PrintingTabProps) {
  return (
    <div style={{ display: activeTab === 'printing' ? 'block' : 'none' }}>
      {/* ===== 1. إعدادات الإيصال ونمط الفاتورة العامة ===== */}
      <FormSection
        title="إعدادات الإيصال ونمط الفاتورة العامة"
        description="تحديد مقاس الورق وشكل الترقيم والتصميم والنصوص المطبوعة على الفاتورة."
      >
        <div className="document-prototype-grid compact-grid-2">
          <div className="field">
            <label>مقاس الطباعة الافتراضي</label>
            <select className="purchase-prototype-field-input" {...form.register('paperSize')} disabled={disabled}>
              <option value="receipt">إيصال حراري (Receipt 80mm)</option>
              <option value="a4">ورق كبير قياسي (A4)</option>
            </select>
          </div>

          <div className="field">
            <label>شكل وتصميم الإيصال (Receipt Theme)</label>
            <select className="purchase-prototype-field-input" {...form.register('posReceiptTheme')} disabled={disabled}>
              <option value="boxed">نمط المربعات (Boxed) — أنيق ومنظم</option>
              <option value="classic">النمط الكلاسيكي (Classic)</option>
              <option value="ultra-compact">نمط مصغر جداً لتوفير الورق (Ultra Compact)</option>
            </select>
          </div>

          <div className="field">
            <label>نمط ترقيم الفواتير والمرتجعات</label>
            <select className="purchase-prototype-field-input" {...form.register('invoiceNumberingScheme')} disabled={disabled}>
              <option value="daily">ترقيم يومي مدمج بالتاريخ (Z-260818-0001)</option>
              <option value="sequential">ترقيم تسلسلي كلاسيكي مستمر (Z-1, Z-2...)</option>
            </select>
          </div>

          <div className="field">
            <label>تنسيق أرقام الفاتورة المطبوعة</label>
            <select className="purchase-prototype-field-input" {...form.register('printNumberFormat')} disabled={disabled}>
              <option value="arabic">أرقام عربية: ١٢٣٤</option>
              <option value="english">أرقام إنجليزية: 1234</option>
            </select>
          </div>

          <div className="field">
            <label>تذييل الفاتورة المطبوعة</label>
            <input
              className="purchase-prototype-field-input"
              {...form.register('invoiceFooter')}
              disabled={disabled}
              placeholder="مثال: شكراً لتعاملكم معنا ونسعد بزيارتكم دائماً"
            />
          </div>

          <div className="field">
            <label>محتوى رمز QR في الفاتورة</label>
            <input
              className="purchase-prototype-field-input"
              {...form.register('invoiceQR')}
              disabled={disabled}
              placeholder="رابط الموقع أو نص اختياري للـ QR"
            />
          </div>
        </div>
      </FormSection>

      {/* ===== 2. عناصر وبيانات الفاتورة المطبوعة ===== */}
      <FormSection
        title="عناصر وبيانات الفاتورة المطبوعة"
        description="حدد البيانات المطلوب إظهارها أو إخفاؤها من الإيصال المطبوع للكاشير مقسمة حسب تسلسلها في الفاتورة."
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '10px', alignItems: 'start' }}>

          {/* العمود الأول (يمين): بيانات المتجر والفرع + بيانات المستند والعملية */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* 1. رأس المتجر والفرع */}
            <div style={groupCardStyle}>
              <div style={groupHeaderStyle}>
                <span style={groupHeaderBadgeStyle}>1</span>
                <strong style={groupHeaderTitleStyle}>بيانات المتجر والفرع (الرأس بالأعلى)</strong>
              </div>
              <div className="settings-print-options-grid" style={checkboxGridStyle}>
                <label className="settings-print-option" style={checkboxStyle}>
                  <input type="checkbox" style={checkboxInputStyle} {...form.register('printShowLogo')} disabled={disabled} />
                  إظهار الشعار
                </label>
                <label className="settings-print-option" style={checkboxStyle}>
                  <input type="checkbox" style={checkboxInputStyle} {...form.register('printShowPhone')} disabled={disabled} />
                  إظهار الهاتف
                </label>
                <label className="settings-print-option" style={checkboxStyle}>
                  <input type="checkbox" style={checkboxInputStyle} {...form.register('printShowAddress')} disabled={disabled} />
                  إظهار العنوان
                </label>
                <label className="settings-print-option" style={checkboxStyle}>
                  <input type="checkbox" style={checkboxInputStyle} {...form.register('printShowTaxNumber')} disabled={disabled} />
                  إظهار الرقم الضريبي
                </label>
                <label className="settings-print-option" style={checkboxStyle}>
                  <input type="checkbox" style={checkboxInputStyle} {...form.register('printShowBranch')} disabled={disabled} />
                  إظهار الفرع
                </label>
                <label className="settings-print-option" style={checkboxStyle}>
                  <input type="checkbox" style={checkboxInputStyle} {...form.register('printShowLocation')} disabled={disabled} />
                  إظهار المخزن
                </label>
              </div>
            </div>

            {/* 2. بيانات الفاتورة والعملية */}
            <div style={groupCardStyle}>
              <div style={groupHeaderStyle}>
                <span style={groupHeaderBadgeStyle}>2</span>
                <strong style={groupHeaderTitleStyle}>بيانات المستند والعملية</strong>
              </div>
              <div className="settings-print-options-grid" style={checkboxGridStyle}>
                <label className="settings-print-option" style={checkboxStyle}>
                  <input type="checkbox" style={checkboxInputStyle} {...form.register('printShowDocumentType')} disabled={disabled} />
                  إظهار نوع المستند
                </label>
                <label className="settings-print-option" style={checkboxStyle}>
                  <input type="checkbox" style={checkboxInputStyle} {...form.register('printShowDocumentNumber')} disabled={disabled} />
                  إظهار رقم المستند
                </label>
                <label className="settings-print-option" style={checkboxStyle}>
                  <input type="checkbox" style={checkboxInputStyle} {...form.register('printShowDate')} disabled={disabled} />
                  إظهار تاريخ ووقت الفاتورة
                </label>
                <label className="settings-print-option" style={checkboxStyle}>
                  <input type="checkbox" style={checkboxInputStyle} {...form.register('printShowOrderType')} disabled={disabled} />
                  إظهار نوع الطلب
                </label>
                <label className="settings-print-option" style={checkboxStyle}>
                  <input type="checkbox" style={checkboxInputStyle} {...form.register('printShowCashier')} disabled={disabled} />
                  إظهار الكاشير
                </label>
                <label className="settings-print-option" style={checkboxStyle}>
                  <input type="checkbox" style={checkboxInputStyle} {...form.register('printShowPaymentMethod')} disabled={disabled} />
                  إظهار طريقة الدفع
                </label>
                <label className="settings-print-option" style={checkboxStyle}>
                  <input type="checkbox" style={checkboxInputStyle} {...form.register('printShowCustomer')} disabled={disabled} />
                  إظهار العميل
                </label>
                <label className="settings-print-option" style={checkboxStyle}>
                  <input type="checkbox" style={checkboxInputStyle} {...form.register('printShowDeliveryCustomerDetails')} disabled={disabled} />
                  تفاصيل العميل في الدليفري
                </label>
                <label className="settings-print-option" style={checkboxStyle}>
                  <input type="checkbox" style={checkboxInputStyle} {...form.register('printDeliveryRepOnReceipt')} disabled={disabled} />
                  إظهار اسم المندوب
                </label>
                <label className="settings-print-option" style={checkboxStyle}>
                  <input type="checkbox" style={checkboxInputStyle} {...form.register('printDualReceiptForOnlineDelivery')} disabled={disabled} />
                  طباعة نسختين تلقائياً للدليفري والدفع الإلكتروني (عميل + محل)
                </label>
              </div>
            </div>
          </div>

          {/* العمود الثاني (يسار): الأصناف والعروض + الإجماليات + التذييل والنمط */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* 3. الأصناف وعروض التخفيض */}
            <div style={groupCardStyle}>
              <div style={groupHeaderStyle}>
                <span style={groupHeaderBadgeStyle}>3</span>
                <strong style={groupHeaderTitleStyle}>الأصناف وعروض التخفيض</strong>
              </div>
              <div className="settings-print-options-grid" style={checkboxGridStyle}>
                <label className="settings-print-option" style={checkboxStyle}>
                  <input type="checkbox" style={checkboxInputStyle} {...form.register('printShowItemOffers')} disabled={disabled} />
                  إظهار عروض الأصناف (عرض: X بدلاً من Y)
                </label>
                <label className="settings-print-option" style={checkboxStyle}>
                  <input type="checkbox" style={checkboxInputStyle} {...form.register('printShowDiscountBreakdown')} disabled={disabled} />
                  تفصيل سطور الخصومات في الإجماليات
                </label>
                <label className="settings-print-option" style={checkboxStyle}>
                  <input type="checkbox" style={checkboxInputStyle} {...form.register('printShowSavingsBanner')} disabled={disabled} />
                  إظهار شريط إجمالي التوفير بالفاتورة
                </label>
              </div>
            </div>

            {/* 4. الإجماليات والملخص */}
            <div style={groupCardStyle}>
              <div style={groupHeaderStyle}>
                <span style={groupHeaderBadgeStyle}>4</span>
                <strong style={groupHeaderTitleStyle}>الإجماليات والملخص</strong>
              </div>
              <div className="settings-print-options-grid" style={checkboxGridStyle}>
                <label className="settings-print-option" style={checkboxStyle}>
                  <input type="checkbox" style={checkboxInputStyle} {...form.register('printShowTax')} disabled={disabled} />
                  إظهار الضريبة
                </label>
                <label className="settings-print-option" style={checkboxStyle}>
                  <input type="checkbox" style={checkboxInputStyle} {...form.register('printShowItemCount')} disabled={disabled} />
                  إظهار عدد الأصناف
                </label>
                <label className="settings-print-option" style={checkboxStyle}>
                  <input type="checkbox" style={checkboxInputStyle} {...form.register('printShowPiecesCount')} disabled={disabled} />
                  إظهار إجمالي القطع
                </label>
                <label className="settings-print-option" style={checkboxStyle}>
                  <input type="checkbox" style={checkboxInputStyle} {...form.register('printShowPaymentBreakdown')} disabled={disabled} />
                  إظهار تفصيل المدفوعات
                </label>
              </div>
            </div>

            {/* 5. التذييل والنمط العام */}
            <div style={groupCardStyle}>
              <div style={groupHeaderStyle}>
                <span style={groupHeaderBadgeStyle}>5</span>
                <strong style={groupHeaderTitleStyle}>التذييل ونمط الإيصال (الأسفل)</strong>
              </div>
              <div className="settings-print-options-grid" style={checkboxGridStyle}>
                <label className="settings-print-option" style={checkboxStyle}>
                  <input type="checkbox" style={checkboxInputStyle} {...form.register('printShowInvoiceBarcode')} disabled={disabled} />
                  إظهار شريط باركود الفاتورة (Code 128)
                </label>
                <label className="settings-print-option" style={checkboxStyle}>
                  <input type="checkbox" style={checkboxInputStyle} {...form.register('printShowFooter')} disabled={disabled} />
                  إظهار التذييل
                </label>
                <label className="settings-print-option" style={checkboxStyle}>
                  <input type="checkbox" style={checkboxInputStyle} {...form.register('printCompactReceipt')} disabled={disabled} />
                  خطوط إيصال مضغوطة
                </label>
              </div>
            </div>
          </div>

        </div>
      </FormSection>

      {/* ===== 3. طابعة وشيت المطبخ ومناداة العميل (KOT) ===== */}
      <FormSection
        title="طابعة وشيت المطبخ ومناداة العميل (KOT)"
        description="إعدادات طباعة تذكرة التحضير بالمطبخ أو إيصال المناداة الصغير للعميل."
      >
        <div className="document-prototype-grid compact-grid-2">
          <label style={premiumCardStyle}>
            <div style={premiumCardTextStyle}>
              <strong>تفعيل طباعة شيت المطبخ (KOT)</strong>
              <small className="muted">تمكين خيار طباعة إيصال التحضير أو المناداة</small>
            </div>
            <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('posKitchenPrinterEnabled')} disabled={disabled} />
          </label>

          <label style={premiumCardStyle}>
            <div style={premiumCardTextStyle}>
              <strong>طباعة شيت المطبخ تلقائياً</strong>
              <small className="muted">إرسال التذكرة للطابعة فور حفظ فاتورة البيع</small>
            </div>
            <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('posKitchenPrinterAuto')} disabled={disabled} />
          </label>

          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>نوع شيت المطبخ المطلوب</label>
            <select className="purchase-prototype-field-input" {...form.register('posKitchenPrinterMode')} disabled={disabled || !posKitchenPrinterEnabled}>
              <option value="detailed">إيصال مطبخ مفصل (شامل قائمة الأصناف والإضافات)</option>
              <option value="mini">إيصال مصغر لتوفير الورق (رقم الطلب فقط لمناداة العميل)</option>
            </select>
          </div>

          {typeof window !== 'undefined' && (window as any).electronPrinter && (
            <div
              key={`printers-${String(settings?.posElectronCashierPrinter || '')}-${String(settings?.posElectronKitchenPrinter || '')}-${systemPrinters.length}`}
              className="document-prototype-grid compact-grid-2"
              style={{ gridColumn: '1 / -1', marginTop: 8, padding: '12px', border: '1px solid var(--border)', borderRadius: 8, background: '#f8fafc' }}
            >
              <div className="field">
                <label>طابعة الكاشير المباشرة (الريسيت)</label>
                <select className="purchase-prototype-field-input" {...form.register('posElectronCashierPrinter')} disabled={disabled}>
                  <option value="">- الطباعة العادية (نافذة المتصفح) -</option>
                  {savedCashierPrinter && !systemPrinters.some(p => p.name === savedCashierPrinter) && (
                    <option value={savedCashierPrinter}>{savedCashierPrinter}</option>
                  )}
                  {systemPrinters.map(p => (
                    <option key={p.name} value={p.name}>{p.displayName || p.name}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>طابعة المطبخ المباشرة (KOT)</label>
                <select className="purchase-prototype-field-input" {...form.register('posElectronKitchenPrinter')} disabled={disabled || !posKitchenPrinterEnabled}>
                  <option value="">- الطباعة العادية (نافذة المتصفح) -</option>
                  {savedKitchenPrinter && !systemPrinters.some(p => p.name === savedKitchenPrinter) && (
                    <option value={savedKitchenPrinter}>{savedKitchenPrinter}</option>
                  )}
                  {systemPrinters.map(p => (
                    <option key={p.name} value={p.name}>{p.displayName || p.name}</option>
                  ))}
                </select>
              </div>

              <div className="muted small" style={{ gridColumn: '1 / -1' }}>
                <strong>معلومة:</strong> إذا اخترت طابعة هنا، سيتم إرسال الطباعة <b>مباشرة وبدون أي شاشة تأكيد</b>.
                ولو اخترت <b>نفس الطابعة</b> للكاشير والمطبخ، سيتم طباعة الإيصالين ورا بعض تلقائياً.
              </div>
            </div>
          )}
        </div>
      </FormSection>
    </div>
  );
}
