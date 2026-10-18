import { useTranslation } from 'react-i18next';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import type { Product, ProductCustomerPrice } from '@/types/domain';

export function ProductCustomerPricesCard({
  product,
  customers,
  customerPrices,
  onChange,
  onSave,
  isSaving
}: {
  product?: Product;
  customers: Array<{ id: string; name: string }>;
  customerPrices: ProductCustomerPrice[];
  onChange: (entries: ProductCustomerPrice[]) => void;
  onSave: () => Promise<void> | void;
  isSaving: boolean;
}) {
  const { t } = useTranslation();
  function patch(index: number, patch: Partial<ProductCustomerPrice>) {
    onChange(customerPrices.map((entry, currentIndex) => (currentIndex === index ? { ...entry, ...patch } : entry)));
  }

  function addRow() {
    onChange([...customerPrices, { customerId: '', price: 0 }]);
  }

  function removeRow(index: number) {
    onChange(customerPrices.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <FormSection title={product ? `أسعار خاصة للعملاء: ${product.name}` : t('products.workspace_sections.product_customer_prices_card.s0', "الأسعار الخاصة للعملاء")} actions={<span className="nav-pill">{t('products.workspace_sections.product_customer_prices_card.s1', "أسعار العملاء")}</span>}>
      {!product ? <div className="muted">{t('products.workspace_sections.product_customer_prices_card.s2', "اختر صنفًا أولًا لإدارة أسعار العملاء الخاصة به.")}</div> : (
        <div className="page-stack">
          <div className="actions" style={{ justifyContent: 'space-between' }}>
            <div className="muted small">{t('products.workspace_sections.product_customer_prices_card.s3', "هذه الأسعار متاحة الآن للإدارة المباشرة من نفس الشاشة دون الرجوع إلى أدوات إضافية.")}</div>
            <Button type="button" variant="secondary" onClick={addRow}>{t('products.workspace_sections.product_customer_prices_card.s4', "إضافة سعر خاص")}</Button>
          </div>
          <div className="page-stack">
            {customerPrices.length ? customerPrices.map((entry, index) => (
              <div key={`${entry.customerId}-${index}`} className="list-row">
                <div className="form-grid" style={{ flex: 1 }}>
                  <Field label={t('products.workspace_sections.product_customer_prices_card.s5', "العميل")}>
                    <select value={entry.customerId} onChange={(event) => patch(index, { customerId: event.target.value })} disabled={isSaving}>
                      <option value="">{t('products.workspace_sections.product_customer_prices_card.s6', "اختر عميلًا")}</option>
                      {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                    </select>
                  </Field>
                  <Field label={t('products.workspace_sections.product_customer_prices_card.s7', "السعر الخاص")}>
                    <input type="number" min="0" step="0.01" value={entry.price} onChange={(event) => patch(index, { price: Number(event.target.value || 0) })} disabled={isSaving} />
                  </Field>
                </div>
                <Button type="button" variant="danger" onClick={() => removeRow(index)} disabled={isSaving}>{t('products.workspace_sections.product_customer_prices_card.s8', "حذف")}</Button>
              </div>
            )) : <div className="muted">{t('products.workspace_sections.product_customer_prices_card.s9', "لا توجد أسعار خاصة مسجلة لهذا الصنف.")}</div>}
          </div>
          <div className="actions sticky-form-actions">
            <Button type="button" onClick={() => void onSave()} disabled={isSaving}>{t('products.workspace_sections.product_customer_prices_card.s10', "حفظ أسعار العملاء")}</Button>
          </div>
        </div>
      )}
    </FormSection>
  );
}
