import type { UseFormReturn } from 'react-hook-form';
import type { SettingsFormInput, SettingsFormOutput } from '@/features/settings/schemas/settings.schema';
import { FormSection } from '@/shared/components/form-section';

interface SalesInventoryTabProps {
  form: UseFormReturn<SettingsFormInput, undefined, SettingsFormOutput>;
  disabled: boolean;
  activeTab: string;
}

export function SalesInventorySettingsTab({
  form,
  disabled,
  activeTab,
}: SalesInventoryTabProps) {
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

  return (
    <div style={{ display: activeTab === 'sales_inventory' ? 'block' : 'none' }}>
      {/* ===== إعدادات البيع والضريبة ===== */}
      <FormSection title="إعدادات البيع والضريبة" description="تحديد نسبة الضريبة على المبيعات وطريقة احتسابها في الفواتير.">
        <div className="document-prototype-grid compact-grid-2">
          <div className="field">
            <label>نسبة الضريبة (%)</label>
            <input className="purchase-prototype-field-input" type="number" step="0.01" {...form.register('taxRate')} disabled={disabled} />
          </div>
          <div className="field">
            <label>طريقة احتساب الضريبة</label>
            <select className="purchase-prototype-field-input" {...form.register('taxMode')} disabled={disabled}>
              <option value="exclusive">تضاف فوق السعر</option>
              <option value="inclusive">ضمن السعر</option>
            </select>
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>الرقم الضريبي للمنشأة</label>
            <input className="purchase-prototype-field-input" {...form.register('taxNumber')} disabled={disabled} placeholder="أدخل الرقم الضريبي المسجل للمنشأة" />
          </div>
        </div>
      </FormSection>

      {/* ===== خيارات وقواعد البيع والمخزون ===== */}
      <FormSection title="خيارات وقواعد البيع والمخزون" description="ضوابط حركة المخازن وعمليات الكاشير وإصدار الأذونات.">
        <div className="document-prototype-grid compact-grid-2">
          <label style={premiumCardStyle}>
            <div style={premiumCardTextStyle}>
              <strong>السماح بالبيع بالسالب</strong>
              <small className="muted">تخطي تحذير عدم كفاية المخزون عند إتمام الفاتورة</small>
            </div>
            <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('allowNegativeStockSales')} disabled={disabled} />
          </label>
          <label style={premiumCardStyle}>
            <div style={premiumCardTextStyle}>
              <strong>السماح بسعر شراء صفر</strong>
              <small className="muted">مخصص للمخازن والعطايا والعينات المجانية</small>
            </div>
            <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('allowZeroPurchaseCost')} disabled={disabled} />
          </label>
          <label style={premiumCardStyle}>
            <div style={premiumCardTextStyle}>
              <strong>إجبار فتح وردية لعمليات الكاشير</strong>
              <small className="muted">منع إجراء أي عمليات بيع قبل فتح الوردية وتحديد العهدة</small>
            </div>
            <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('requireCashierShiftForSales')} disabled={disabled} />
          </label>
          <div className="field">
            <label>حد التنبيه لنقص المخزون</label>
            <input className="purchase-prototype-field-input" type="number" min="0" {...form.register('lowStockThreshold')} disabled={disabled} />
            <div className="muted small" style={{ marginTop: 4 }}>يظهر تنبيه عندما يصل رصيد الصنف إلى هذا الحد أو أقل.</div>
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>وضع إذن الصرف الافتراضي</label>
            <select className="purchase-prototype-field-input" {...form.register('defaultBranchIssueMode')} disabled={disabled}>
              <option value="final_issue">صرف نهائي (يتم خصم الرصيد فوراً)</option>
              <option value="transfer_to_branch_stock">تحويل إلى رصيد فرع (يبقى في الطريق حتى يتم استلامه)</option>
            </select>
            <div className="muted small" style={{ marginTop: 4 }}>
              استخدم <b>الصرف النهائي</b> إذا كان الفرع لا يدار مخزونه على النظام. واستخدم <b>تحويل إلى رصيد فرع</b> إذا كان الفرع يبيع من رصيده على النظام.
            </div>
          </div>
        </div>
      </FormSection>
    </div>
  );
}
