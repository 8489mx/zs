import { AppError } from '../../../common/errors/app-error';

function roundMoney(value: number): number {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
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

export function buildSaleReturnLine(source: ReturnSourceLine, product: ReturnProductRow, requestItem: ReturnRequestItem, history: { qty: number; amount: number; tax: number } = { qty: 0, amount: 0, tax: 0 }): PreparedReturnLine {
  const soldQty = Number(source.qty || 0);
  if (!(soldQty > 0) || history.qty + requestItem.qty > soldQty + 0.000001) {
    throw new AppError('كمية المرتجع تتجاوز الكمية المباعة', 'RETURN_QUANTITY_EXCEEDED', 400);
  }
  const sourceNetLineTotal = Number(source.net_line_total ?? source.line_total ?? 0);
  const sourceTax = Number(source.allocated_tax || 0);
  const sourceLineTotal = sourceNetLineTotal + sourceTax;
  const cumulativeQty = history.qty + requestItem.qty;
  const lineTotal = roundMoney(sourceLineTotal * cumulativeQty / soldQty) - roundMoney(history.amount);
  const allocatedTax = roundMoney(sourceTax * cumulativeQty / soldQty) - roundMoney(history.tax);
  if (lineTotal < -0.0001 || allocatedTax < -0.0001) {
    throw new AppError('سجل المرتجع السابق يحتاج مراجعة مالية', 'RETURN_RECONCILIATION_REQUIRED', 409);
  }
  const unitTotal = roundMoney(lineTotal / requestItem.qty);
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

export function buildPurchaseReturnLine(source: ReturnSourceLine, product: ReturnProductRow, requestItem: ReturnRequestItem): PreparedReturnLine {
  const purchasedQty = Number(source.qty || 0);
  const sourceLineTotal = Number(source.line_total || 0);
  const lineTotal = (requestItem.qty === purchasedQty)
    ? sourceLineTotal
    : roundMoney((sourceLineTotal / purchasedQty) * requestItem.qty);
  const unitTotal = purchasedQty > 0 ? roundMoney(sourceLineTotal / purchasedQty) : 0;
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
    allocatedTax: 0,
    stockDelta,
    beforeQty,
    afterQty,
  };
}

export function calculateReturnDocumentTotal(lines: Array<{ lineTotal: number }>): number {
  return roundMoney(lines.reduce((sum, line) => sum + Number(line.lineTotal || 0), 0));
}

export function calculateNextLedgerBalance(currentBalance: number | string | null | undefined, amountDelta: number): number {
  return roundMoney(Number(currentBalance || 0) + Number(amountDelta || 0));
}
