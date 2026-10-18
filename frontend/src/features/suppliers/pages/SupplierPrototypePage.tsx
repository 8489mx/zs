import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';

type SupplierPrototypeDraft = {
  name: string;
  type: string;
  group: string;
  phone: string;
  email: string;
  website: string;
  country: string;
  city: string;
  address: string;
  currency: string;
  paymentTerms: string;
  taxNumber: string;
  notes: string;
};

const INITIAL_DRAFT: SupplierPrototypeDraft = {
  name: '',
  type: 'تاجر جملة',
  group: 'موردون محليون',
  phone: '',
  email: '',
  website: '',
  country: 'مصر',
  city: '',
  address: '',
  currency: 'EGP',
  paymentTerms: 'آجل 30 يوم',
  taxNumber: '',
  notes: '',
};

const currencyOptions = [
  { value: 'EGP', label: 'ج.م - جنيه مصري' },
  { value: 'SAR', label: 'ر.س - ريال سعودي' },
  { value: 'USD', label: 'US$ - دولار أمريكي' },
];

const paymentTermsOptions = ['نقدًا عند الاستلام', 'آجل 15 يوم', 'آجل 30 يوم', 'آجل 45 يوم'];

type InlineMessage = { tone: 'success' | 'error' | 'info' | 'warning'; text: string };

function isDarkThemeEnabled() {
  const root = document.documentElement;
  return root.classList.contains('dark') || root.getAttribute('data-theme') === 'dark';
}

export function SupplierPrototypePage() {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<SupplierPrototypeDraft>(INITIAL_DRAFT);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [inlineMessage, setInlineMessage] = useState<InlineMessage | null>(null);

  useEffect(() => {
    setIsDarkMode(isDarkThemeEnabled());

    const root = document.documentElement;
    const observer = new MutationObserver(() => setIsDarkMode(isDarkThemeEnabled()));
    observer.observe(root, { attributes: true, attributeFilter: ['class', 'data-theme'] });

    return () => observer.disconnect();
  }, []);

  function updateField<K extends keyof SupplierPrototypeDraft>(key: K, value: SupplierPrototypeDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleCancel() {
    setDraft(INITIAL_DRAFT);
    setInlineMessage(null);
  }

  function handleSave() {
    // Visual prototype only.
  }

  return (
    <div className={`page-shell document-prototype-shell purchase-new-prototype${isDarkMode ? ' purchase-prototype-dark' : ''}`} dir="rtl">
      <div className="purchase-prototype-document-surface">
        <div className="document-prototype-topbar">
          <div className="document-prototype-topbar-right">
            <button type="button" className="document-prototype-back-link" aria-label={t('suppliers.supplier_prototype_page.s0', "العودة إلى الموردين")}>&larr;</button>
            <h1>{t('suppliers.supplier_prototype_page.s1', "مورد جديد")}</h1>
            <span className="document-prototype-status">{t('suppliers.supplier_prototype_page.s2', "نموذج تجريبي")}</span>
          </div>

          <div className="document-prototype-topbar-actions">
            <Button variant="secondary" type="button" className="purchase-prototype-toolbar-action purchase-prototype-toolbar-action-secondary" onClick={handleCancel}>
              {t('suppliers.supplier_prototype_page.s3', "إلغاء")}
            </Button>
            <Button type="button" className="purchase-prototype-toolbar-action purchase-prototype-toolbar-action-primary" onClick={handleSave}>
              {t('suppliers.supplier_prototype_page.s4', "حفظ")}
            </Button>
            {inlineMessage ? (
              <div className={`purchase-prototype-inline-message is-${inlineMessage.tone}`} role={inlineMessage.tone === 'error' ? 'alert' : 'status'} aria-live="polite">
                {inlineMessage.text}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <main className="document-prototype-column">
        <section className="document-prototype-section">
          <h3 className="document-prototype-section-title">{t('suppliers.supplier_prototype_page.s5', "المعلومات الأساسية")}</h3>
          <div className="document-prototype-grid compact-grid-3">
            <Field label={t('suppliers.supplier_prototype_page.s6', "اسم المورد")}>
              <input className="purchase-prototype-field-input" value={draft.name} onChange={(event) => updateField('name', event.target.value)} placeholder={t('suppliers.supplier_prototype_page.s7', "اسم المورد")} autoComplete="organization" />
            </Field>
            <Field label={t('suppliers.supplier_prototype_page.s8', "نوع المورد")}>
              <select className="purchase-prototype-field-input" value={draft.type} onChange={(event) => updateField('type', event.target.value)}>
                <option value={t('suppliers.supplier_prototype_page.s9', "تاجر جملة")}>{t('suppliers.supplier_prototype_page.s10', "تاجر جملة")}</option>
                <option value={t('suppliers.supplier_prototype_page.s11', "مصنع")}>{t('suppliers.supplier_prototype_page.s12', "مصنع")}</option>
                <option value={t('suppliers.supplier_prototype_page.s13', "شركة خدمات")}>{t('suppliers.supplier_prototype_page.s14', "شركة خدمات")}</option>
              </select>
            </Field>
            <Field label={t('suppliers.supplier_prototype_page.s15', "مجموعة المورد")}>
              <select className="purchase-prototype-field-input" value={draft.group} onChange={(event) => updateField('group', event.target.value)}>
                <option value={t('suppliers.supplier_prototype_page.s16', "موردون محليون")}>{t('suppliers.supplier_prototype_page.s17', "موردون محليون")}</option>
                <option value={t('suppliers.supplier_prototype_page.s18', "موردون دوليون")}>{t('suppliers.supplier_prototype_page.s19', "موردون دوليون")}</option>
                <option value={t('suppliers.supplier_prototype_page.s20', "موردون استراتيجيون")}>{t('suppliers.supplier_prototype_page.s21', "موردون استراتيجيون")}</option>
              </select>
            </Field>
          </div>
        </section>

        <section className="document-prototype-section">
          <h3 className="document-prototype-section-title">{t('suppliers.supplier_prototype_page.s22', "بيانات التواصل")}</h3>
          <div className="document-prototype-grid compact-grid-3">
            <Field label={t('suppliers.supplier_prototype_page.s23', "رقم الهاتف")}>
              <input className="purchase-prototype-field-input" value={draft.phone} onChange={(event) => updateField('phone', event.target.value)} inputMode="tel" autoComplete="tel" placeholder="01000000000" />
            </Field>
            <Field label={t('suppliers.supplier_prototype_page.s24', "البريد الإلكتروني")}>
              <input className="purchase-prototype-field-input" value={draft.email} onChange={(event) => updateField('email', event.target.value)} type="email" autoComplete="email" placeholder="name@example.com" />
            </Field>
            <Field label={t('suppliers.supplier_prototype_page.s25', "الموقع الإلكتروني")}>
              <input className="purchase-prototype-field-input" value={draft.website} onChange={(event) => updateField('website', event.target.value)} placeholder="https://example.com" />
            </Field>
          </div>
        </section>

        <section className="document-prototype-section">
          <h3 className="document-prototype-section-title">{t('suppliers.supplier_prototype_page.s26', "العنوان")}</h3>
          <div className="document-prototype-grid compact-grid-2">
            <Field label={t('suppliers.supplier_prototype_page.s27', "الدولة")}>
              <input className="purchase-prototype-field-input" value={draft.country} onChange={(event) => updateField('country', event.target.value)} placeholder={t('suppliers.supplier_prototype_page.s28', "الدولة")} />
            </Field>
            <Field label={t('suppliers.supplier_prototype_page.s29', "المدينة")}>
              <input className="purchase-prototype-field-input" value={draft.city} onChange={(event) => updateField('city', event.target.value)} placeholder={t('suppliers.supplier_prototype_page.s30', "المدينة")} />
            </Field>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label={t('suppliers.supplier_prototype_page.s31', "العنوان")}>
                <input className="purchase-prototype-field-input" value={draft.address} onChange={(event) => updateField('address', event.target.value)} placeholder={t('suppliers.supplier_prototype_page.s32', "العنوان التفصيلي")} />
              </Field>
            </div>
          </div>
        </section>

        <section className="document-prototype-section">
          <h3 className="document-prototype-section-title">{t('suppliers.supplier_prototype_page.s33', "البيانات المالية والضريبية")}</h3>
          <div className="document-prototype-grid compact-grid-3">
            <Field label={t('suppliers.supplier_prototype_page.s34', "العملة الافتراضية")}>
              <select className="purchase-prototype-field-input" value={draft.currency} onChange={(event) => updateField('currency', event.target.value)}>
                {currencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('suppliers.supplier_prototype_page.s35', "شروط الدفع")}>
              <select className="purchase-prototype-field-input" value={draft.paymentTerms} onChange={(event) => updateField('paymentTerms', event.target.value)}>
                {paymentTermsOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('suppliers.supplier_prototype_page.s36', "الرقم الضريبي")}>
              <input className="purchase-prototype-field-input" value={draft.taxNumber} onChange={(event) => updateField('taxNumber', event.target.value)} inputMode="numeric" placeholder="123456789" />
            </Field>
          </div>
        </section>

        <section className="document-prototype-section">
          <h3 className="document-prototype-section-title">{t('suppliers.supplier_prototype_page.s37', "ملاحظات")}</h3>
          <div className="document-prototype-grid compact-grid-1">
            <Field label={t('suppliers.supplier_prototype_page.s38', "ملاحظات داخلية")}>
              <textarea className="purchase-prototype-notes-textarea" rows={5} value={draft.notes} onChange={(event) => updateField('notes', event.target.value)} placeholder={t('suppliers.supplier_prototype_page.s39', "أضف ملاحظات داخلية هنا...")} />
            </Field>
          </div>
        </section>
      </main>
    </div>
  );
}
