import { AppError } from '../../../common/errors/app-error';
import { ensureUniqueFlowItems } from '../../../common/utils/financial-integrity';
import { CreateReturnDto } from '../dto/create-return.dto';

export function normalizeReturnItems(payload: CreateReturnDto): Array<{ productId: number; productName: string; qty: number }> {
  const normalized = (payload.items || [])
    .map((item) => ({
      productId: Number(item.productId || 0),
      productName: String(item.productName || '').trim(),
      qty: Number(item.qty || 0),
    }))
    .filter((item) => item.productId > 0 && item.qty > 0);

  if (!normalized.length) {
    throw new AppError('Return must include at least one valid item', 'RETURN_ITEMS_REQUIRED', 400);
  }

  ensureUniqueFlowItems(
    normalized.map((item) => ({ productId: item.productId, qty: item.qty })),
    'RETURN_DUPLICATE_PRODUCT',
    'Return must not contain duplicate products',
  );

  if (payload.type === 'purchase' && payload.settlementMode === 'store_credit') {
    throw new AppError('Purchase return cannot settle through store credit', 'PURCHASE_RETURN_SETTLEMENT_INVALID', 400);
  }

  return normalized;
}
