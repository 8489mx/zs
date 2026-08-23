import type { RefObject } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';
import { SearchableCombobox } from '@/shared/ui/searchable-combobox';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import { useTranslation } from '../../utils/i18n-purchase-prototype';
import { formatMoney, searchSupplier, searchContact } from './newPurchaseOrder.helpers';
import type { SupplierOption, ContactOption, WarehouseOption, QuickCreateState, ValidationErrors } from './newPurchaseOrder.types';

interface HeaderSectionProps {
  documentStatus: 'draft' | 'confirmed';
  total: number;
  language: string;
  attachmentsCount: number;
  inlineMessage: { tone: 'success' | 'error' | 'info'; text: string } | null;
  createMutationPending: boolean;
  isPolling: boolean;
  onNavigateBack: () => void;
  onResetDraft: () => void;
  onSaveDraft: () => void;
  onConfirmInvoice: () => void;

  supplier: string;
  setSupplier: (val: string) => void;
  suppliers: SupplierOption[];
  onSupplierSelect: (s: SupplierOption) => void;
  date: string;
  setDate: (val: string) => void;
  requiredDate: string;
  setRequiredDate: (val: string) => void;
  currency: string;
  setCurrency: (val: string) => void;
  paymentType: 'cash' | 'credit';
  setPaymentType: (val: 'cash' | 'credit') => void;
  contact: string;
  setContact: (val: string) => void;
  contactsList: ContactOption[];
  onContactSelect: (c: ContactOption) => void;
  shippingAddress: string;
  setShippingAddress: (val: string) => void;
  deliveryDestinations: WarehouseOption[];
  onOpenQuickCreate: (kind: Exclude<QuickCreateState, null>['kind'], query: string) => void;
  onSetQuickCreateState: (state: QuickCreateState) => void;
  validationErrors: ValidationErrors;
  markDocumentDirty: () => void;
  clearDocumentFieldError: (field: keyof Omit<ValidationErrors, 'rows'>) => void;

  supplierInputRef: RefObject<HTMLInputElement | null>;
  dateInputRef: RefObject<HTMLInputElement | null>;
  requiredDateInputRef: RefObject<HTMLInputElement | null>;
  currencyInputRef: RefObject<HTMLInputElement | null>;
  contactInputRef: RefObject<HTMLInputElement | null>;
  shippingInputRef: RefObject<HTMLInputElement | null>;
  purchaseDropdownClassName: string;

  attachments: any[];
  isUploading: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (index: number) => void;
}

export function PurchaseOrderHeaderSection(props: HeaderSectionProps) {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader
        title={t('new_purchase_order') as string}
        onBack={props.onNavigateBack}
        badge={
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span className={`document-prototype-status-badge is-${props.documentStatus}`}>
              {props.documentStatus === 'confirmed' ? t('status_confirmed') : t('status_draft')}
            </span>
            <span className="nav-pill" style={{ fontWeight: 700, color: '#0f172a' }}>
              الإجمالي: {formatMoney(props.total, props.language)}
            </span>
            {props.attachmentsCount > 0 && (
              <span className="nav-pill">
                أوامر مرفقة ({props.attachmentsCount})
              </span>
            )}
          </div>
        }
        actions={
          <div className="actions compact-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button
              variant="secondary"
              type="button"
              className="purchase-prototype-toolbar-action purchase-prototype-toolbar-action-secondary"
              onClick={props.onResetDraft}
              style={{ color: 'var(--danger-color)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            >
              <span aria-hidden="true" className="purchase-prototype-save-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
              </span>
              <span>إلغاء المسودة</span>
            </Button>
            <Button
              variant="secondary"
              type="button"
              className={`purchase-prototype-toolbar-action purchase-prototype-toolbar-action-secondary ${props.inlineMessage?.text === t('draft_saved') ? 'is-success-state' : ''}`}
              onClick={props.onSaveDraft}
              disabled={props.documentStatus === 'confirmed'}
              style={props.inlineMessage?.text === t('draft_saved') ? { backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#15803d', borderColor: 'rgba(34, 197, 94, 0.3)' } : {}}
            >
              {props.inlineMessage?.text === t('draft_saved') ? (
                <>
                  <span aria-hidden="true" className="purchase-prototype-save-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  <span>{t('draft_saved')}</span>
                </>
              ) : (
                <>
                  <span aria-hidden="true" className="purchase-prototype-save-icon">
                    <svg viewBox="0 0 24 24" role="img" focusable="false" aria-hidden="true">
                      <path d="M5 3.75h10.4L19 7.35V20.25H5V3.75Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                      <path d="M7.2 3.75v5.1h6.8v-5.1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                      <path d="M8 20.25v-5.4h8v5.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span>{t('save_as_draft')}</span>
                </>
              )}
            </Button>
            <Button
              type="button"
              className={`purchase-prototype-toolbar-action purchase-prototype-toolbar-action-primary ${props.inlineMessage?.text === t('invoice_confirmed') ? 'is-success-state' : ''}`}
              onClick={props.onConfirmInvoice}
              disabled={props.documentStatus === 'confirmed' || props.createMutationPending || props.isPolling}
              style={props.inlineMessage?.text === t('invoice_confirmed') ? { backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#15803d', borderColor: 'rgba(34, 197, 94, 0.3)' } : {}}
            >
              {props.inlineMessage?.text === t('invoice_confirmed') ? (
                <>
                  <span aria-hidden="true" className="purchase-prototype-save-icon" style={{ marginLeft: '4px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  <span>{t('invoice_confirmed')}</span>
                </>
              ) : (
                <span>{t('confirm_invoice')}</span>
              )}
            </Button>
            {props.inlineMessage && props.inlineMessage.tone === 'error' ? (
              <div className={`purchase-prototype-inline-message is-${props.inlineMessage.tone}`} role="alert" aria-live="polite">
                {props.inlineMessage.text}
              </div>
            ) : null}
          </div>
        }
      />
      <section className="document-prototype-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
          <h3 className="document-prototype-section-title" style={{ margin: 0 }}>{t('basic_info')}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label className="button button-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', fontSize: '0.8rem', cursor: 'pointer', height: '30px', margin: 0 }}>
              <input type="file" multiple onChange={props.onFileUpload} style={{ display: 'none' }} />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <path d="M21 12.5 12.8 20.7a5 5 0 0 1-7.1-7.1L14.2 5.1a3.5 3.5 0 0 1 4.9 4.9L9.9 19.2" />
              </svg>
              <span>{props.isUploading ? 'جاري الرفع...' : 'إرفاق مستندات'}</span>
              {props.attachments.length > 0 && <span className="nav-pill" style={{ fontSize: '0.7rem', padding: '1px 5px' }}>{props.attachments.length}</span>}
            </label>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.65rem' }}>
          {/* Row 1: المورد - التليفون - طريقة الدفع */}
          <SearchableCombobox
            label={t('supplier')}
            placeholder={t('search_supplier')}
            value={props.supplier}
            onChange={(value) => {
              props.markDocumentDirty();
              props.clearDocumentFieldError('supplier');
              props.setSupplier(value);
            }}
            options={props.suppliers}
            search={searchSupplier}
            getLabel={(option) => option.name}
            getMeta={(option) => [option.code, option.phone, option.taxNumber].filter(Boolean).join(' · ')}
            onSelect={props.onSupplierSelect}
            onCreate={(query) => props.onOpenQuickCreate('supplier', query)}
            createLabel={(query) => `+ إنشاء مورد جديد "${query}"`}
            inputRef={props.supplierInputRef}
            inputClassName="purchase-prototype-field-input purchase-prototype-supplier-input"
            dropdownClassName={props.purchaseDropdownClassName}
            error={props.validationErrors.supplier}
          />
          <SearchableCombobox
            label={t('phone_number') || 'رقم التليفون'}
            placeholder="ابحث عن رقم تليفون..."
            value={props.contact}
            onChange={(value) => {
              props.markDocumentDirty();
              props.setContact(value);
            }}
            options={props.contactsList}
            search={searchContact}
            getLabel={(option) => option.name}
            getMeta={(option) => [option.phone, option.supplierName].filter(Boolean).join(' · ')}
            onSelect={props.onContactSelect}
            onCreate={(query) => props.onOpenQuickCreate('contact', query)}
            createLabel={(query) => `+ إنشاء جهة اتصال جديدة "${query}"`}
            inputRef={props.contactInputRef}
            inputClassName="purchase-prototype-field-input purchase-prototype-contact-input"
            dropdownClassName={props.purchaseDropdownClassName}
          />
          <Field label="طريقة الدفع">
            <CustomSelect
              value={props.paymentType}
              onChange={(val) => {
                props.markDocumentDirty();
                props.setPaymentType(val as 'cash' | 'credit');
              }}
              options={[
                { value: 'credit', label: 'آجل (يضاف لمديونية المورد)' },
                { value: 'cash', label: 'كاش (دفع فوري من الخزينة)' },
              ]}
            />
          </Field>

          {/* Row 2: التاريخ - التاريخ المطلوب - العملة */}
          <Field label={t('date')} error={props.validationErrors.date}>
            <input
              ref={props.dateInputRef}
              className="purchase-prototype-field-input purchase-prototype-date-input"
              type="date"
              value={props.date}
              onChange={(event) => {
                props.markDocumentDirty();
                props.clearDocumentFieldError('date');
                props.setDate(event.target.value);
              }}
            />
          </Field>
          <Field label={t('order_deadline')} error={props.validationErrors.requiredDate}>
            <input
              ref={props.requiredDateInputRef}
              className="purchase-prototype-field-input purchase-prototype-date-input"
              type="date"
              value={props.requiredDate}
              onChange={(event) => {
                props.markDocumentDirty();
                props.clearDocumentFieldError('requiredDate');
                props.setRequiredDate(event.target.value);
              }}
            />
          </Field>
          <Field label={t('currency')} error={props.validationErrors.currency}>
            <CustomSelect
              value={props.currency}
              onChange={(val) => {
                props.markDocumentDirty();
                props.clearDocumentFieldError('currency');
                props.setCurrency(val);
              }}
              options={SUPPORTED_CURRENCIES.map((c) => ({
                value: c.code,
                label: c.label,
              }))}
            />
          </Field>

        </div>

        {props.attachments.length > 0 && (
          <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {props.attachments.map((att, index) => (
              <div key={index} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: '#f8fafc', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.78rem' }}>
                <span>📎 {att.fileName}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({(att.fileSize / 1024).toFixed(0)} KB)</span>
                <button type="button" onClick={() => props.onRemoveAttachment(index)} style={{ color: 'var(--danger-color)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', fontWeight: 'bold' }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
