const transitions: Record<string, Record<string, readonly string[]>> = {
  receivable: {
    in_safe: ['deposit', 'collect', 'bounce', 'endorse', 'return', 'cancel'],
    under_collection: ['collect', 'bounce', 'restore_to_safe', 'return', 'cancel'],
    bounced: ['restore_to_safe', 'return', 'cancel'],
  },
  payable: {
    issued: ['clear', 'bounce', 'return', 'cancel'],
    bounced: ['restore_to_safe', 'return', 'cancel'],
  },
};

export function assertPdcTransition(type: string, status: string, action: string): void {
  if (!transitions[type]?.[status]?.includes(action)) throw new Error('انتقال حالة الشيك غير مسموح؛ لا يمكن تكرار أثر مالي أو إعادة فتح حالة نهائية.');
}

export function pdcBookAmount(cheque: { base_amount?: unknown; amount: unknown }): number {
  const amount = Number(cheque.base_amount);
  if (cheque.base_amount == null || !Number.isFinite(amount) || amount <= 0) throw new Error('القيمة الدفترية للشيك غير مثبتة؛ يلزم مطابقة الشيك القديم قبل تحريكه.');
  return Math.round(amount * 100) / 100;
}
