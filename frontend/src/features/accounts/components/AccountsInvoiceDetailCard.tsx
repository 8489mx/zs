import { QueryFeedback } from '@/shared/components/query-feedback';
import { SharedSaleDetailCard, SharedPurchaseDetailCard } from '@/shared/components/invoice-detail-cards';
import type { Purchase, Sale } from '@/types/domain';

interface AccountsInvoiceDetailCardProps {
  selectedLabel: string;
  documentType: 'sale' | 'purchase' | null;
  isLoading: boolean;
  error?: unknown;
  sale?: Sale | null;
  purchase?: Purchase | null;
}

type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord | null {
  return value && typeof value === 'object' ? value as AnyRecord : null;
}

function unwrapDocumentPayload(value: unknown, preferredKey: 'sale' | 'purchase'): AnyRecord | null {
  const record = asRecord(value);
  if (!record) return null;

  const direct = asRecord(record[preferredKey]);
  if (direct) return unwrapDocumentPayload(direct, preferredKey) || direct;

  const nestedData = asRecord(record.data);
  if (nestedData) return unwrapDocumentPayload(nestedData, preferredKey) || nestedData;

  const nestedResult = asRecord(record.result);
  if (nestedResult) return unwrapDocumentPayload(nestedResult, preferredKey) || nestedResult;

  return record;
}

function firstText(record: AnyRecord, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = record[key];
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return fallback;
}

function firstNumber(record: AnyRecord, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = record[key];
    const numeric = Number(value ?? NaN);
    if (Number.isFinite(numeric)) return numeric;
  }
  return fallback;
}

function firstBoolean(record: AnyRecord, keys: string[], fallback = false) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string' && value.trim()) {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes'].includes(normalized)) return true;
      if (['false', '0', 'no'].includes(normalized)) return false;
    }
  }
  return fallback;
}

function normalizeSaleItem(item: unknown) {
  const record = asRecord(item) || {};
  const productId = firstText(record, ['productId', 'product_id'], '');
  const unitName = firstText(record, ['unitName', 'unit_name'], 'قطعة');
  return {
    ...record,
    id: firstText(record, ['id'], `${productId}-${unitName}`),
    productId,
    name: firstText(record, ['name', 'productName', 'product_name'], '—'),
    qty: firstNumber(record, ['qty', 'quantity'], 0),
    price: firstNumber(record, ['price', 'unitPrice', 'unit_price'], 0),
    total: firstNumber(record, ['total', 'lineTotal', 'line_total'], 0),
    unitName,
    unitMultiplier: firstNumber(record, ['unitMultiplier', 'unit_multiplier'], 1),
    cost: firstNumber(record, ['cost', 'costPrice', 'cost_price'], 0),
    priceType: firstText(record, ['priceType', 'price_type'], 'retail'),
  };
}

function normalizePurchaseItem(item: unknown) {
  const record = asRecord(item) || {};
  const productId = firstText(record, ['productId', 'product_id'], '');
  const unitName = firstText(record, ['unitName', 'unit_name'], 'قطعة');
  return {
    ...record,
    id: firstText(record, ['id'], `${productId}-${unitName}`),
    productId,
    name: firstText(record, ['name', 'productName', 'product_name'], '—'),
    qty: firstNumber(record, ['qty', 'quantity'], 0),
    cost: firstNumber(record, ['cost', 'unitCost', 'unit_cost', 'price'], 0),
    total: firstNumber(record, ['total', 'lineTotal', 'line_total'], 0),
    unitName,
    unitMultiplier: firstNumber(record, ['unitMultiplier', 'unit_multiplier'], 1),
  };
}

function normalizeSale(value: unknown): Sale | null {
  const record = unwrapDocumentPayload(value, 'sale');
  if (!record) return null;
  const id = firstText(record, ['id'], '');
  const items = Array.isArray(record.items) ? record.items.map(normalizeSaleItem) : [];

  const normalized = {
    ...record,
    id,
    docNo: firstText(record, ['docNo', 'doc_no'], id ? `S-${id}` : ''),
    customerId: firstText(record, ['customerId', 'customer_id'], ''),
    customerName: firstText(record, ['customerName', 'customer_name_ref', 'customer_name'], 'عميل نقدي'),
    paymentType: firstText(record, ['paymentType', 'payment_type'], 'cash'),
    paymentChannel: firstText(record, ['paymentChannel', 'payment_channel'], 'cash'),
    subTotal: firstNumber(record, ['subTotal', 'subtotal'], 0),
    discount: firstNumber(record, ['discount'], 0),
    taxRate: firstNumber(record, ['taxRate', 'tax_rate'], 0),
    taxAmount: firstNumber(record, ['taxAmount', 'tax_amount'], 0),
    pricesIncludeTax: firstBoolean(record, ['pricesIncludeTax', 'prices_include_tax'], false),
    total: firstNumber(record, ['total'], 0),
    paidAmount: firstNumber(record, ['paidAmount', 'paid_amount'], 0),
    status: firstText(record, ['status'], 'posted'),
    note: firstText(record, ['note'], ''),
    date: firstText(record, ['date', 'createdAt', 'created_at'], ''),
    branchId: firstText(record, ['branchId', 'branch_id'], ''),
    locationId: firstText(record, ['locationId', 'location_id'], ''),
    branchName: firstText(record, ['branchName', 'branch_name'], ''),
    locationName: firstText(record, ['locationName', 'location_name'], ''),
    items,
    payments: Array.isArray(record.payments) ? record.payments : [],
  };

  return normalized as unknown as Sale;
}

function normalizePurchase(value: unknown): Purchase | null {
  const record = unwrapDocumentPayload(value, 'purchase');
  if (!record) return null;
  const id = firstText(record, ['id'], '');
  const items = Array.isArray(record.items) ? record.items.map(normalizePurchaseItem) : [];

  const normalized = {
    ...record,
    id,
    docNo: firstText(record, ['docNo', 'doc_no'], id ? `P-${id}` : ''),
    supplierId: firstText(record, ['supplierId', 'supplier_id'], ''),
    supplierName: firstText(record, ['supplierName', 'supplier_name'], '—'),
    paymentType: firstText(record, ['paymentType', 'payment_type'], 'cash'),
    subTotal: firstNumber(record, ['subTotal', 'subtotal'], 0),
    discount: firstNumber(record, ['discount'], 0),
    taxRate: firstNumber(record, ['taxRate', 'tax_rate'], 0),
    taxAmount: firstNumber(record, ['taxAmount', 'tax_amount'], 0),
    pricesIncludeTax: firstBoolean(record, ['pricesIncludeTax', 'prices_include_tax'], false),
    total: firstNumber(record, ['total'], 0),
    status: firstText(record, ['status'], 'posted'),
    note: firstText(record, ['note'], ''),
    date: firstText(record, ['date', 'createdAt', 'created_at'], ''),
    branchId: firstText(record, ['branchId', 'branch_id'], ''),
    locationId: firstText(record, ['locationId', 'location_id'], ''),
    branchName: firstText(record, ['branchName', 'branch_name'], ''),
    locationName: firstText(record, ['locationName', 'location_name'], ''),
    items,
  };

  return normalized as unknown as Purchase;
}

export function AccountsInvoiceDetailCard({
  selectedLabel,
  documentType,
  isLoading,
  error,
  sale,
  purchase,
}: AccountsInvoiceDetailCardProps) {
  const normalizedSale = documentType === 'sale' ? normalizeSale(sale) : null;
  const normalizedPurchase = documentType === 'purchase' ? normalizePurchase(purchase) : null;
  const hasSelectedDocument = Boolean(documentType);

  return (
    <QueryFeedback
      isLoading={isLoading}
      isError={Boolean(error)}
      error={error}
      loadingText="جارٍ تحميل تفاصيل الفاتورة..."
      errorTitle="تعذر تحميل تفاصيل الفاتورة"
      isEmpty={!hasSelectedDocument || (!normalizedSale && !normalizedPurchase)}
      emptyTitle="اختر فاتورة من القيود لعرض تفاصيلها"
      emptyHint="سيظهر هنا محتوى الفاتورة بالأصناف والكميات والأسعار من نفس شاشة الحسابات."
    >
      {documentType === 'sale' ? (
        <SharedSaleDetailCard sale={normalizedSale || undefined} />
      ) : documentType === 'purchase' ? (
        <SharedPurchaseDetailCard purchase={normalizedPurchase || undefined} />
      ) : null}
      {selectedLabel ? <div className="muted small">المرجع المحدد: {selectedLabel}</div> : null}
    </QueryFeedback>
  );
}
