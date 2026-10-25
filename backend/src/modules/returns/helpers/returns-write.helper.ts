import { AppError } from '../../../common/errors/app-error';
import { type MoneyDigits, roundMoney as roundBookMoney } from '../../accounting/engines/money-minor-units.engine';

function roundMoney(value: number, digits: MoneyDigits = 2): number {
  return digits === 2
    ? Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100
    : roundBookMoney(value, digits);
}

export type ReturnSourceLine = {
  product_id?: number | string | null;
  product_name?: string | null;
  qty?: number | string | null;
  line_total?: number | string | null;
  net_line_total?: number | string | null;
  allocated_tax?: number | string | null;
  unit_multiplier?: number | string | null;
};

export type ReturnProductRow = {
  id?: number | string | null;
  stock_qty?: number | string | null;
};

export type ReturnRequestItem = {
  productId: number;
  productName: string;
  qty: number;
};

export type PreparedReturnLine = {
  productId: number;
  productName: string;
  qty: number;
  unitTotal: number;
  lineTotal: number;
  allocatedTax: number;
  stockDelta: number;
  beforeQty: number;
  afterQty: number;
};

export function buildSaleReturnLine(source: ReturnSourceLine, product: ReturnProductRow, requestItem: ReturnRequestItem, history: { qty: number; amount: number; tax: number } = { qty: 0, amount: 0, tax: 0 }, digits: MoneyDigits = 2): PreparedReturnLine {
  const money = (value: number) => roundMoney(value, digits);
  const soldQty = Number(source.qty || 0);
  if (!(soldQty > 0) || history.qty + requestItem.qty > soldQty + 0.000001) {
    throw new AppError('كمية المرتجع تتجاوز الكمية المباعة', 'RETURN_QUANTITY_EXCEEDED', 400);
  }
  const sourceNetLineTotal = Number(source.net_line_total ?? source.line_total ?? 0);
  const sourceTax = Number(source.allocated_tax || 0);
  const sourceLineTotal = sourceNetLineTotal + sourceTax;
  const cumulativeQty = history.qty + requestItem.qty;
  const lineTotal = money(sourceLineTotal * cumulativeQty / soldQty) - money(history.amount);
  const allocatedTax = money(sourceTax * cumulativeQty / soldQty) - money(history.tax);
  if (lineTotal < -0.0001 || allocatedTax < -0.0001) {
    throw new AppError('سجل المرتجع السابق يحتاج مراجعة مالية', 'RETURN_RECONCILIATION_REQUIRED', 409);
  }
  const unitTotal = money(lineTotal / requestItem.qty);
  const rawStockDelta = Number(requestItem.qty || 0) * Number(source.unit_multiplier || 1);
  const stockDelta = Number(rawStockDelta.toFixed(3));
  if (!Number.isFinite(rawStockDelta) || rawStockDelta <= 0 || Math.abs(rawStockDelta - stockDelta) > 0.00000001) {
    throw new AppError('كمية المرتجع يجب أن تكون بدقة ثلاث خانات عشرية كحد أقصى', 'RETURN_QUANTITY_PRECISION_INVALID', 400);
  }
  const beforeQty = Number(product.stock_qty || 0);
  const afterQty = Number((beforeQty + stockDelta).toFixed(3));

  return {
    productId: Number(requestItem.productId || source.product_id || 0),
    productName: String(source.product_name || requestItem.productName || '').trim(),
    qty: Number(requestItem.qty || 0),
    unitTotal,
    lineTotal,
    allocatedTax,
    stockDelta,
    beforeQty,
    afterQty,
  };
}

export function buildPurchaseReturnLine(source: ReturnSourceLine, product: ReturnProductRow, requestItem: ReturnRequestItem, history: { qty: number; amount: number; tax?: number } = { qty: 0, amount: 0 }, digits: MoneyDigits = 2): PreparedReturnLine {
  const money = (value: number) => roundMoney(value, digits);
  const purchasedQty = Number(source.qty || 0);
  const sourceLineTotal = money(Number(source.line_total || 0));
  const cumulativeQty = history.qty + requestItem.qty;
  if (!(purchasedQty > 0) || !(requestItem.qty > 0) || cumulativeQty > purchasedQty + 0.000001) {
    throw new AppError('كمية مرتجع الشراء تتجاوز الكمية المشتراة', 'PURCHASE_RETURN_QUANTITY_EXCEEDED', 400);
  }
  // Cumulative rounding allocates any residual cents to the final partial return.
  const lineTotal = money(sourceLineTotal * cumulativeQty / purchasedQty) - money(history.amount);
  const sourceTax = money(Number(source.allocated_tax || 0));
  const allocatedTax = money(sourceTax * cumulativeQty / purchasedQty) - money(history.tax || 0);
  if (lineTotal < -0.0001 || allocatedTax < -0.0001 || allocatedTax > lineTotal + 0.0001) {
    throw new AppError('سجل مرتجع الشراء السابق يحتاج مراجعة مالية', 'PURCHASE_RETURN_RECONCILIATION_REQUIRED', 409);
  }
  const unitTotal = money(lineTotal / requestItem.qty);
  const rawStockDelta = Number(requestItem.qty || 0) * Number(source.unit_multiplier || 1);
  const stockDelta = Number(rawStockDelta.toFixed(3));
  if (!Number.isFinite(rawStockDelta) || rawStockDelta <= 0 || Math.abs(rawStockDelta - stockDelta) > 0.00000001) {
    throw new AppError('كمية المرتجع يجب أن تكون بدقة ثلاث خانات عشرية كحد أقصى', 'RETURN_QUANTITY_PRECISION_INVALID', 400);
  }
  const beforeQty = Number(product.stock_qty || 0);
  if (beforeQty + 0.0001 < stockDelta) {
    throw new AppError('المخزون الحالي لا يسمح بتنفيذ مرتجع الشراء لهذا الصنف', 'PURCHASE_RETURN_STOCK_INVALID', 400);
  }
  const afterQty = Number((beforeQty - stockDelta).toFixed(3));

  return {
    productId: Number(requestItem.productId || source.product_id || 0),
    productName: String(source.product_name || requestItem.productName || '').trim(),
    qty: Number(requestItem.qty || 0),
    unitTotal,
    lineTotal,
    allocatedTax,
    stockDelta,
    beforeQty,
    afterQty,
  };
}

export function calculateReturnDocumentTotal(lines: Array<{ lineTotal: number }>, digits: MoneyDigits = 2): number {
  return roundMoney(lines.reduce((sum, line) => sum + Number(line.lineTotal || 0), 0), digits);
}

export function calculateNextLedgerBalance(currentBalance: number | string | null | undefined, amountDelta: number, digits: MoneyDigits = 2): number {
  return roundMoney(Number(currentBalance || 0) + Number(amountDelta || 0), digits);
}
