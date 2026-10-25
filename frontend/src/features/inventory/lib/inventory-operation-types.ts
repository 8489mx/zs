/** Exactly matches IdempotencyInterceptor's method + Nest route.path. */
export const INVENTORY_OPERATION_TYPES = {
  createTransfer: 'POST:/api/stock-transfers',
  receiveTransfer: 'POST:/api/stock-transfers/:id/receive',
  cancelTransfer: 'POST:/api/stock-transfers/:id/cancel',
  createStockCount: 'POST:/api/stock-count-sessions',
  postStockCount: 'POST:/api/stock-count-sessions/:id/post',
} as const;
