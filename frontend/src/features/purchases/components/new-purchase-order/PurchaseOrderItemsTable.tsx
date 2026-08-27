import { Button } from '@/shared/ui/button';
import { SmartphoneIcon } from '@/shared/components/icons/AppIcons';
import { AsyncSearchableCombobox } from '@/shared/ui/async-searchable-combobox';
import { SearchableCombobox } from '@/shared/ui/searchable-combobox';
import { useTranslation } from '../../utils/i18n-purchase-prototype';
import { formatMoney, parseLocalizedNumber, searchWarehouse } from './newPurchaseOrder.helpers';
import type { PrototypeLine, CategoryOption, WarehouseOption, ProductOption, QuickCreateState, ValidationErrors } from './newPurchaseOrder.types';

interface ItemsTableProps {
  lines: PrototypeLine[];
  categories: CategoryOption[];
  warehouses: WarehouseOption[];
  language: string;
  pendingFocusLineId: number | null;
  activeQuickAction: 'tax' | 'discount' | null;
  setActiveQuickAction: (val: any) => void;
  customTaxRate: string;
  setCustomTaxRate: (val: string) => void;
  discountMode: 'percent' | 'value';
  setDiscountMode: (val: 'percent' | 'value') => void;
  discount: number;
  setDiscount: (val: number) => void;
  validationErrors: ValidationErrors;
  purchaseDropdownClassName: string;
  enableMobileStoreFeatures?: boolean;

  onAddLine: () => void;
  onAddServiceLine: () => void;
  onAddProductLine: () => void;
  onRemoveLine: (id: number) => void;
  onUpdateLine: (id: number, key: keyof PrototypeLine, value: any) => void;
  onProductSelect: (lineId: number, product: ProductOption) => void;
  onCategorySelect: (lineId: number, category: CategoryOption) => void;
  onWarehouseSelect: (lineId: number, warehouse: WarehouseOption) => void;
  onBarcodeScanAction: () => void;
  onOpenQuickCreate: (kind: Exclude<QuickCreateState, null>['kind'], query: string, lineId?: number | null) => void;
  fetchProductOptions: (query: string) => Promise<ProductOption[]>;
  searchCategory: (opt: CategoryOption, q: string) => boolean;
  applyTaxPreset: (rate: number) => void;
  applyCustomTaxRate: () => void;
  applyDiscount: () => void;
  markDocumentDirty: () => void;
  setLineError: (lineId: number, field: any, err?: string) => void;
}

export function PurchaseOrderItemsTable(props: ItemsTableProps) {
  const { t } = useTranslation();

  return (
    <section className="document-prototype-section">
      <div className="document-prototype-section-header">
        <h3 className="document-prototype-section-title">{t('items_section')}</h3>
        <div className="purchase-prototype-quick-actions" aria-label={t('quick_item_actions')}>
          <button type="button" className="purchase-prototype-quick-action" title="إضافة صنف جديد" onClick={() => props.onOpenQuickCreate('product', '', null)} style={{ fontWeight: 700, color: '#1e40af' }}>
            <span aria-hidden="true">+</span>
            <span>صنف جديد</span>
          </button>
          <button type="button" className="purchase-prototype-quick-action" title={t('add_service_line')} onClick={props.onAddServiceLine}>
            <span aria-hidden="true">+</span>
            <span>{t('service_type')}</span>
          </button>
          <button
            type="button"
            className="purchase-prototype-quick-action"
            title={t('apply_tax')}
            onClick={() => props.setActiveQuickAction((curr: any) => (curr === 'tax' ? null : 'tax'))}
          >
            <span aria-hidden="true">%</span>
            <span>{t('tax_rate')}</span>
          </button>
          <button
            type="button"
            className="purchase-prototype-quick-action"
            title="إضافة خصم على الفاتورة"
            onClick={() => props.setActiveQuickAction((curr: any) => (curr === 'discount' ? null : 'discount'))}
          >
            <span>{t('discount_label')}</span>
          </button>
        </div>
      </div>

      {props.activeQuickAction === 'tax' ? (
        <div className="purchase-prototype-popover" role="dialog" aria-label={t('tax_rate')}>
          <div className="purchase-prototype-popover-row">
            <button type="button" className="purchase-prototype-popover-option" onClick={() => props.applyTaxPreset(0)}>
              بدون ضريبة
            </button>
            <button type="button" className="purchase-prototype-popover-option" onClick={() => props.applyTaxPreset(14)}>
              14%
            </button>
            <input
              className="purchase-prototype-popover-input purchase-prototype-tax-input"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={props.customTaxRate}
              onChange={(event) => {
                props.markDocumentDirty();
                props.setCustomTaxRate(event.target.value);
              }}
              aria-label={t('custom_value')}
            />
            <button type="button" className="purchase-prototype-popover-apply" onClick={props.applyCustomTaxRate}>
              تطبيق
            </button>
          </div>
        </div>
      ) : null}

      {props.activeQuickAction === 'discount' ? (
        <div className="purchase-prototype-popover" role="dialog" aria-label={t('discount_label')}>
          <div className="purchase-prototype-popover-row">
            <button
              type="button"
              className="purchase-prototype-popover-option"
              onClick={() => {
                props.markDocumentDirty();
                props.setDiscountMode('percent');
              }}
            >
              نسبة
            </button>
            <button
              type="button"
              className="purchase-prototype-popover-option"
              onClick={() => {
                props.markDocumentDirty();
                props.setDiscountMode('value');
              }}
            >
              قيمة
            </button>
            <input
              className="purchase-prototype-popover-input purchase-prototype-discount-input"
              type="number"
              min="0"
              step="0.01"
              value={props.discount}
              onChange={(event) => {
                props.markDocumentDirty();
                const parsed = parseLocalizedNumber(event.target.value);
                props.setDiscount(Number.isFinite(parsed) ? parsed : 0);
              }}
              aria-label={t('discount_value_label')}
            />
            <button type="button" className="purchase-prototype-popover-apply" onClick={props.applyDiscount}>
              تطبيق
            </button>
          </div>
        </div>
      ) : null}

      <div className="document-line-items-table-wrap">
        <table className="document-line-items-table">
          <thead>
            <tr>
              <th className="purchase-prototype-table-head purchase-prototype-table-head-product" style={{ width: '35%' }}>{t('item_label')}</th>
              <th className="purchase-prototype-table-head purchase-prototype-table-head-category" style={{ width: '15%' }}>القسم</th>
              <th className="purchase-prototype-table-head purchase-prototype-table-head-warehouse" style={{ width: '15%' }}>المخزن</th>
              <th className="purchase-prototype-table-head purchase-prototype-table-head-qty" style={{ width: '10%' }}>{t('quantity')}</th>
              <th className="purchase-prototype-table-head purchase-prototype-table-head-price" style={{ width: '10%' }}>{t('price_title')}</th>
              <th className="purchase-prototype-table-head purchase-prototype-table-head-amount" style={{ width: '10%' }}>{t('total_amount')}</th>
              <th className="purchase-prototype-table-head purchase-prototype-table-head-actions" style={{ width: '5%' }}></th>
            </tr>
          </thead>
          <tbody>
            {props.lines.map((line) => {
              const rowErrors = props.validationErrors.rows[line.id] ?? {};
              const amount = (line.qty || 0) * (line.unitPrice || 0);
              return (
                <tr
                  key={line.id}
                  data-line-id={line.id}
                  className={[
                    line.warehouse === 'لا يؤثر على المخزون' ? 'document-line-service' : '',
                    props.pendingFocusLineId === line.id ? 'document-line-highlight' : ''
                  ].filter(Boolean).join(' ')}
                >
                  <td className="purchase-prototype-table-cell purchase-prototype-table-cell-product">
                    <AsyncSearchableCombobox
                      inline
                      inputId={`product-input-${line.id}`}
                      className="purchase-prototype-inline-combobox"
                      inputClassName="purchase-prototype-field-input purchase-prototype-combobox-input purchase-prototype-combobox-input-inline"
                      placeholder={t('search_item')}
                      value={line.itemName}
                      onChange={(value) => {
                        props.markDocumentDirty();
                        props.setLineError(line.id, 'product', undefined);
                        props.onUpdateLine(line.id, 'itemName', value);
                      }}
                      fetchOptions={props.fetchProductOptions}
                      getLabel={(option) => option.name}
                      getMeta={(option) => {
                        const priceLabel = option.price && option.price > 0 ? `${Number.isInteger(option.price) ? option.price.toFixed(0) : option.price.toFixed(2)} EGP` : undefined;
                        const meta = [option.code, option.barcode, priceLabel].filter(Boolean).join(' · ');
                        return meta || undefined;
                      }}
                      onSelect={(option) => props.onProductSelect(line.id, option)}
                      onCreate={(query) => props.onOpenQuickCreate('product', query, line.id)}
                      createLabel={(query) => `+ إنشاء صنف جديد "${query}"`}
                      minSearchLength={2}
                      searchOnSingleDigit
                      showIdleHelper={false}
                      showDropdownOnEmpty={false}
                      error={rowErrors.product}
                      dropdownClassName={props.purchaseDropdownClassName}
                    />
                    {props.enableMobileStoreFeatures && line.trackSerials ? (
                      <div style={{ marginTop: '4px' }}>
                        <button
                          type="button"
                          style={{
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            border: '1px solid #c084fc',
                            background: '#faf5ff',
                            color: '#7e22ce',
                            cursor: 'pointer',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          onClick={() => {
                            const currentText = (line.serials || []).join('\n');
                            const input = window.prompt(
                              `أدخل أرقام السيريال / IMEI للصنف "${line.itemName}" (رقم في كل سطر أو مفصولة بفواصل):\nالكمية الحالية: ${line.qty}`,
                              currentText
                            );
                            if (input !== null) {
                              const serials = input
                                .split(/[\n,]+/)
                                .map((s) => s.trim())
                                .filter(Boolean);
                              props.onUpdateLine(line.id, 'serials', serials);
                              if (serials.length > 0 && line.qty !== serials.length) {
                                props.onUpdateLine(line.id, 'qty', serials.length);
                              }
                            }
                          }}
                        >
                          <SmartphoneIcon size={12} color="#7e22ce" />
                          <span>{line.serials && line.serials.length > 0 ? `سيريالات: (${line.serials.length} أجهزة مسجلة)` : '+ إدخال أرقام السيريال / الـ IMEI'}</span>
                        </button>
                      </div>
                    ) : null}
                  </td>
                  <td className="purchase-prototype-table-cell purchase-prototype-table-cell-category">
                    {line.isService ? (
                      <input className="purchase-prototype-table-input purchase-prototype-table-input-readonly" value="لا يؤثر على المخزون" disabled readOnly />
                    ) : (
                      <SearchableCombobox
                        inline
                        className="purchase-prototype-inline-combobox"
                        inputId={`category-input-${line.id}`}
                        inputClassName="purchase-prototype-field-input purchase-prototype-combobox-input purchase-prototype-combobox-input-inline"
                        placeholder="ابحث عن قسم..."
                        value={line.category || ''}
                        onChange={(value) => {
                          props.markDocumentDirty();
                          props.setLineError(line.id, 'category', undefined);
                          props.onUpdateLine(line.id, 'category', value);
                        }}
                        options={props.categories}
                        search={props.searchCategory}
                        getLabel={(option) => option.name}
                        getMeta={(option) => option.code}
                        onSelect={(option) => props.onCategorySelect(line.id, option)}
                        onCreate={(query) => props.onOpenQuickCreate('category', query, line.id)}
                        createLabel={(query) => `+ إنشاء قسم جديد "${query}"`}
                        dropdownClassName={props.purchaseDropdownClassName}
                      />
                    )}
                  </td>
                  <td className="purchase-prototype-table-cell purchase-prototype-table-cell-warehouse">
                    {line.isService ? (
                      <input className="purchase-prototype-table-input purchase-prototype-table-input-readonly" value="لا يؤثر على المخزون" disabled readOnly />
                    ) : (
                      <SearchableCombobox
                        inline
                        className="purchase-prototype-inline-combobox"
                        inputId={`warehouse-input-${line.id}`}
                        inputClassName="purchase-prototype-field-input purchase-prototype-combobox-input purchase-prototype-combobox-input-inline"
                        placeholder="ابحث عن مخزن..."
                        value={line.warehouse}
                        onChange={(value) => {
                          props.markDocumentDirty();
                          props.setLineError(line.id, 'warehouse', undefined);
                          props.onUpdateLine(line.id, 'warehouse', value);
                        }}
                        options={props.warehouses}
                        search={searchWarehouse}
                        getLabel={(option) => option.name}
                        getMeta={(option) => option.code}
                        onSelect={(option) => props.onWarehouseSelect(line.id, option)}
                        onCreate={(query) => props.onOpenQuickCreate('warehouse', query, line.id)}
                        createLabel={(query) => `+ إنشاء مستودع جديد "${query}"`}
                        error={rowErrors.warehouse}
                        dropdownClassName={props.purchaseDropdownClassName}
                      />
                    )}
                  </td>
                  <td className="purchase-prototype-table-cell purchase-prototype-table-cell-qty">
                    <input
                      className="purchase-prototype-table-input"
                      id={`quantity-input-${line.id}`}
                      type="number"
                      min="0"
                      step="1"
                      value={line.qty}
                      aria-invalid={Boolean(rowErrors.qty)}
                      onChange={(event) => {
                        props.markDocumentDirty();
                        props.setLineError(line.id, 'qty', undefined);
                        const parsed = parseLocalizedNumber(event.target.value);
                        props.onUpdateLine(line.id, 'qty', Number.isFinite(parsed) ? parsed : 0);
                      }}
                    />
                  </td>
                  <td className="purchase-prototype-table-cell purchase-prototype-table-cell-price">
                    <input
                      className="purchase-prototype-table-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitPrice}
                      aria-invalid={Boolean(rowErrors.price)}
                      onChange={(event) => {
                        props.markDocumentDirty();
                        props.setLineError(line.id, 'price', undefined);
                        const parsed = parseLocalizedNumber(event.target.value);
                        props.onUpdateLine(line.id, 'unitPrice', Number.isFinite(parsed) ? parsed : 0);
                      }}
                    />
                  </td>
                  <td className="line-total">{formatMoney(amount, props.language)}</td>
                  <td className="purchase-prototype-table-cell purchase-prototype-table-cell-actions">
                    <button type="button" className="document-row-delete purchase-prototype-row-delete" onClick={() => props.onRemoveLine(line.id)} disabled={props.lines.length === 1}>
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="document-line-items-actions">
        <Button type="button" variant="dashedAction" onClick={props.onAddLine}>
          <span aria-hidden="true">+</span>
          <span>{t('add_item')}</span>
        </Button>
        <Button type="button" variant="dashedAction" onClick={props.onBarcodeScanAction}>
          <span aria-hidden="true" className="purchase-prototype-scan-icon">
            <svg viewBox="0 0 16 16" role="img" focusable="false" aria-hidden="true">
              <path d="M3 4.2V3.1A.6.6 0 0 1 3.6 2.5h1.1M11.3 2.5h1.1a.6.6 0 0 1 .6.6v1.1M13 11.8v1.1a.6.6 0 0 1-.6.6h-1.1M4.7 13.5H3.6a.6.6 0 0 1-.6-.6v-1.1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5.1 5.2v5.6M7 5.2v5.6M9 5.2v5.6M10.9 5.2v5.6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </span>
          <span>{t('scan_barcode')}</span>
        </Button>
        <Button type="button" variant="dashedAction" onClick={props.onAddProductLine}>
          <span aria-hidden="true">+</span>
          <span>{t('new_product')}</span>
        </Button>
      </div>
    </section>
  );
}
