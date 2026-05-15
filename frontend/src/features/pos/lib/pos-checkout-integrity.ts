import type { PaymentChannel, PaymentType } from '@/features/pos/hooks/usePosWorkspace';

const POS_CHECKOUT_INTENT_KEY = 'zs.pos.checkoutIntent';

export interface PosCheckoutIntent {
  customerId: string;
  paymentType: PaymentType;
  paymentChannel: PaymentChannel;
  updatedAt: number;
}

const defaultIntent: PosCheckoutIntent = {
  customerId: '',
  paymentType: 'cash',
  paymentChannel: 'cash',
  updatedAt: 0,
};

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readCheckoutIntent(): PosCheckoutIntent {
  if (!canUseLocalStorage()) return { ...defaultIntent };

  try {
    const parsed = JSON.parse(window.localStorage.getItem(POS_CHECKOUT_INTENT_KEY) || '{}') as Partial<PosCheckoutIntent>;
    const paymentType: PaymentType = parsed.paymentType === 'credit' ? 'credit' : 'cash';
    const rawChannel = String(parsed.paymentChannel || '').trim();
    const paymentChannel: PaymentChannel = paymentType === 'credit'
      ? 'credit'
      : rawChannel === 'card'
        ? 'card'
        : rawChannel === 'wallet'
          ? 'wallet'
          : rawChannel === 'instapay'
            ? 'instapay'
        : rawChannel === 'mixed'
          ? 'mixed'
          : 'cash';

    return {
      customerId: String(parsed.customerId || '').trim(),
      paymentType,
      paymentChannel,
      updatedAt: Number(parsed.updatedAt || 0),
    };
  } catch {
    return { ...defaultIntent };
  }
}

export function writeCheckoutIntent(next: Partial<Omit<PosCheckoutIntent, 'updatedAt'>>): PosCheckoutIntent {
  const current = readCheckoutIntent();
  const paymentType: PaymentType = next.paymentType === 'credit'
    ? 'credit'
    : next.paymentType === 'cash'
      ? 'cash'
      : current.paymentType;
  const paymentChannel: PaymentChannel = paymentType === 'credit'
    ? 'credit'
    : next.paymentChannel === 'card'
      ? 'card'
      : next.paymentChannel === 'wallet'
        ? 'wallet'
        : next.paymentChannel === 'instapay'
          ? 'instapay'
      : next.paymentChannel === 'mixed'
        ? 'mixed'
        : next.paymentChannel === 'cash'
          ? 'cash'
          : (current.paymentChannel === 'credit' ? 'cash' : current.paymentChannel);

  const merged: PosCheckoutIntent = {
    customerId: String(next.customerId ?? current.customerId ?? '').trim(),
    paymentType,
    paymentChannel,
    updatedAt: Date.now(),
  };

  if (canUseLocalStorage()) {
    window.localStorage.setItem(POS_CHECKOUT_INTENT_KEY, JSON.stringify(merged));
  }

  return merged;
}

export function clearCheckoutIntent() {
  if (canUseLocalStorage()) window.localStorage.removeItem(POS_CHECKOUT_INTENT_KEY);
}
