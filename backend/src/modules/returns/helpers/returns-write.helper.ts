import { AppError } from '../../../common/errors/app-error';

function roundMoney(value: number): number {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

export type ReturnSourceLine = {
  product_id?: number | string | null;
  product_name?: string | null;
  qty?: number | string | null;
  line_total?: number | string | null;
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
  stockDelta: number;
  beforeQty: number;
  afterQty: number;
};

export function buildSaleReturnLine(source: ReturnSourceLine, product: ReturnProductRow, requestItem: ReturnRequestItem): PreparedReturnLine {
  const soldQty = Number(source.qty || 0);
  const unitTotal = soldQty > 0 ? roundMoney(Number(source.line_total || 0) / soldQty) : 0;
  const lineTotal = roundMoney(Number(requestItem.qty || 0) * unitTotal);
  const stockDelta = Number((Number(requestItem.qty || 0) * Number(source.unit_multiplier || 1)).toFixed(3));
  const beforeQty = Number(product.stock_qty || 0);
  const afterQty = Number((beforeQty + stockDelta).toFixed(3));

  return {
    productId: Number(requestItem.productId || source.product_id || 0),
    productName: String(source.product_name || requestItem.productName || '').trim(),
    qty: Number(requestItem.qty || 0),
    unitTotal,
    lineTotal,
    stockDelta,
    beforeQty,
    afterQty,
  };
}

export function buildPurchaseReturnLine(source: ReturnSourceLine, product: ReturnProductRow, requestItem: ReturnRequestItem): PreparedReturnLine {
  const purchasedQty = Number(source.qty || 0);
  const unitTotal = purchasedQty > 0 ? roundMoney(Number(source.line_total || 0) / purchasedQty) : 0;
  const lineTotal = roundMoney(Number(requestItem.qty || 0) * unitTotal);
  const stockDelta = Number((Number(requestItem.qty || 0) * Number(source.unit_multiplier || 1)).toFixed(3));
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
