import type { CSSProperties } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { SettingsFormInput, SettingsFormOutput } from '@/features/settings/schemas/settings.schema';
import { FormSection } from '@/shared/components/form-section';

const checkboxGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 8,
};

const checkboxStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  cursor: 'pointer',
};

const checkboxInputStyle: CSSProperties = {
  margin: 0,
};

interface PrintingTabProps {
  form: UseFormReturn<SettingsFormInput, undefined, SettingsFormOutput>;
  disabled: boolean;
  activeTab: string;
}

export function PrintingSettingsTab({ form, disabled, activeTab }: PrintingTabProps) {
  

  return (
        <div style={{ display: activeTab === 'printing' ? 'block' : 'none' }}>
        {/* ===== عناصر الطباعة ===== */}
        <FormSection title="عناصر الطباعة على الفاتورة">
          <div className="settings-print-options-grid" style={checkboxGridStyle}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '12px', gridColumn: '1 / -1' }}>
              <div style={{ display: 'grid', gap: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>شكل الإيصال (Receipt Theme)</label>
                <select className="purchase-prototype-field-input" {...form.register('posReceiptTheme')} disabled={disabled}>
                  <option value="boxed">نمط المربعات (Boxed)</option>
                  <option value="classic">النمط الكلاسيكي (Classic)</option>
                  <option value="ultra-compact">نمط مصغر جداً لتوفير الورق (Ultra Compact)</option>
                </select>
              </div>
              <div style={{ display: 'grid', gap: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>نمط ترقيم الفواتير والمرتجعات</label>
                <select className="purchase-prototype-field-input" {...form.register('invoiceNumberingScheme')} disabled={disabled}>
                  <option value="daily">ترقيم يومي مدمج بالتاريخ (Z-260818-0001)</option>
                  <option value="sequential">ترقيم تسلسلي كلاسيكي مستمر (Z-1, Z-2...)</option>
                </select>
              </div>
            </div>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printCompactReceipt')} disabled={disabled} /> خطوط إيصال مضغوطة</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printShowDocumentType')} disabled={disabled} /> إظهار نوع المستند</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printShowDocumentNumber')} disabled={disabled} /> إظهار رقم المستند</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printShowOrderType')} disabled={disabled} /> إظهار نوع الطلب</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printShowLogo')} disabled={disabled} /> إظهار الشعار</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printShowPhone')} disabled={disabled} /> إظهار الهاتف</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printShowAddress')} disabled={disabled} /> إظهار العنوان</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printShowTaxNumber')} disabled={disabled} /> إظهار الرقم الضريبي</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printShowCustomer')} disabled={disabled} /> إظهار العميل</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printShowDeliveryCustomerDetails')} disabled={disabled} /> إظهار تفاصيل العميل في الدليفري (العنوان/الهاتف)</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printDeliveryRepOnReceipt')} disabled={disabled} /> إظهار اسم المندوب</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printShowCashier')} disabled={disabled} /> إظهار الكاشير</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printShowBranch')} disabled={disabled} /> إظهار الفرع</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printShowLocation')} disabled={disabled} /> إظهار المخزن</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printShowTax')} disabled={disabled} /> إظهار الضريبة</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printShowPaymentMethod')} disabled={disabled} /> إظهار طريقة الدفع</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printShowItemSummary')} disabled={disabled} /> إظهار عدد البنود والقطع</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printShowPaymentBreakdown')} disabled={disabled} /> إظهار تفصيل المدفوعات</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printShowFooter')} disabled={disabled} /> إظهار التذييل</label>
          </div>
        </FormSection>
        </div>
  );
}
