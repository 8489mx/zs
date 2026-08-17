import type { UseFormReturn } from 'react-hook-form';
import type { SettingsFormInput, SettingsFormOutput } from '@/features/settings/schemas/settings.schema';
import type { AppSettings } from '@/types/domain';
import { FormSection } from '@/shared/components/form-section';

interface SalesInventoryTabProps {
  form: UseFormReturn<SettingsFormInput, undefined, SettingsFormOutput>;
  disabled: boolean;
  activeTab: string;
  settings?: AppSettings;
  systemPrinters: { name: string; displayName: string }[];
  savedCashierPrinter?: string;
  savedKitchenPrinter?: string;
  posKitchenPrinterEnabled?: boolean;
}

export function SalesInventorySettingsTab({
  form,
  disabled,
  activeTab,
  settings,
  systemPrinters = [],
  savedCashierPrinter,
  savedKitchenPrinter,
  posKitchenPrinterEnabled,
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
        {/* ===== إعدادات البيع والفاتورة ===== */}
        <FormSection title="إعدادات البيع والفاتورة">
          <div className="document-prototype-grid compact-grid-2">
            <div className="field">
              <label>نسبة الضريبة</label>
              <input className="purchase-prototype-field-input" type="number" step="0.01" {...form.register('taxRate')} disabled={disabled} />
            </div>
            <div className="field">
              <label>طريقة احتساب الضريبة</label>
              <select className="purchase-prototype-field-input" {...form.register('taxMode')} disabled={disabled}>
                <option value="exclusive">تضاف فوق السعر</option>
                <option value="inclusive">ضمن السعر</option>
              </select>
            </div>
            <div className="field">
              <label>الرقم الضريبي</label>
              <input className="purchase-prototype-field-input" {...form.register('taxNumber')} disabled={disabled} />
            </div>
            <div className="field">
              <label>تذييل الفاتورة</label>
              <input className="purchase-prototype-field-input" {...form.register('invoiceFooter')} disabled={disabled} placeholder="مثال: شكرا لتعاملكم معنا" />
            </div>
            <div className="field">
              <label>محتوى QR في الفاتورة</label>
              <input className="purchase-prototype-field-input" {...form.register('invoiceQR')} disabled={disabled} placeholder="رابط أو نص اختياري" />
            </div>
            <div className="field">
              <label>تنسيق أرقام الفاتورة</label>
              <select className="purchase-prototype-field-input" {...form.register('printNumberFormat')} disabled={disabled}>
                <option value="arabic">أرقام عربية: ١٢٣٤</option>
                <option value="english">أرقام إنجليزية: 1234</option>
              </select>
            </div>
          </div>
        </FormSection>

        {/* ===== خيارات البيع والمخزون ===== */}
        <FormSection title="خيارات البيع والمخزون">
          <div className="document-prototype-grid compact-grid-2">
            <label style={premiumCardStyle}>
              <div style={premiumCardTextStyle}>السماح بالبيع بالسالب (تخطي تحذير المخزون)</div>
              <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('allowNegativeStockSales')} disabled={disabled} />
            </label>
            <label style={premiumCardStyle}>
              <div style={premiumCardTextStyle}>السماح بسعر شراء صفر للمخازن والعطايا</div>
              <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('allowZeroPurchaseCost')} disabled={disabled} />
            </label>
            <label style={premiumCardStyle}>
              <div style={premiumCardTextStyle}>إجبار فتح وردية لعمليات الكاشير</div>
              <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('requireCashierShiftForSales')} disabled={disabled} />
            </label>
            <div className="field">
              <label>حد التنبيه للمخزون</label>
              <input className="purchase-prototype-field-input" type="number" min="0" {...form.register('lowStockThreshold')} disabled={disabled} />
            </div>
            <label style={premiumCardStyle}>
              <div style={premiumCardTextStyle}>تفعيل طباعة شيت المطبخ (KOT)</div>
              <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('posKitchenPrinterEnabled')} disabled={disabled} />
            </label>
            <label style={premiumCardStyle}>
              <div style={premiumCardTextStyle}>طباعة شيت المطبخ تلقائياً</div>
              <input type="checkbox" style={premiumCheckboxInputStyle} {...form.register('posKitchenPrinterAuto')} disabled={disabled} />
            </label>
            <div className="field">
              <label>نوع شيت المطبخ</label>
              <select className="purchase-prototype-field-input" {...form.register('posKitchenPrinterMode')} disabled={disabled || !posKitchenPrinterEnabled}>
                <option value="detailed">إيصال مطبخ مفصل (شامل الأصناف)</option>
                <option value="mini">إيصال مصغر (رقم الطلب فقط لمناداة العميل)</option>
              </select>
            </div>
            {typeof window !== 'undefined' && (window as any).electronPrinter && (
              <div key={`printers-${String(settings?.posElectronCashierPrinter || '')}-${String(settings?.posElectronKitchenPrinter || '')}-${systemPrinters.length}`} className="document-prototype-grid compact-grid-2" style={{ gridColumn: '1 / -1', marginTop: 8, padding: '12px', border: '1px solid var(--border)', borderRadius: 8, background: '#f8fafc' }}>
                <div className="field">
                  <label>طابعة الكاشير (الريسيت)</label>
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
                  <label>طابعة المطبخ (KOT)</label>
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
