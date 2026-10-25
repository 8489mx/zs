import { AppError } from '../../../common/errors/app-error';
import { type MoneyDigits } from '../../accounting/engines/money-minor-units.engine';

export type SaleTenderChannel = 'cash' | 'card' | 'wallet' | 'instapay';
export type SaleTenderInput = { paymentChannel: SaleTenderChannel; amount: number };
export type AppliedSaleTender = SaleTenderInput & { tenderedAmount: number; changeAmount: number };

function cents(value: number, label: string, digits: MoneyDigits = 2): number {
  const amount = Number(value);
  const scale = 10 ** digits;
  const rounded = Math.round(amount * scale);
  if (!Number.isFinite(amount) || !Number.isSafeInteger(rounded) || rounded < 0 || Math.abs(amount * scale - rounded) > 0.001) {
    throw new AppError(`${label} must be a non-negative amount to the cent`, 'INVALID_PAID_AMOUNT', 400);
  }
  return rounded;
}

export function allocateSaleTenders(input: {
  paymentType: 'cash' | 'credit';
  payments: SaleTenderInput[];
  collectibleTotal: number;
  fallbackChannel: SaleTenderChannel;
  tenderedCash?: number;
  digits?: MoneyDigits;
}): { payments: AppliedSaleTender[]; appliedAmount: number; tenderedAmount: number; changeAmount: number } {
  const digits = input.digits ?? 2;
  const scale = 10 ** digits;
  const totalCents = cents(input.collectibleTotal, 'Invoice total', digits);
  const declared = input.payments.length ? input.payments :
    input.paymentType === 'credit' || totalCents === 0 ? [] : [{ paymentChannel: input.fallbackChannel, amount: totalCents / scale }];
  const cashOverride = cents(input.tenderedCash || 0, 'Cash tender', digits);
  const nonCash = declared.filter((row) => row.paymentChannel !== 'cash');
  const cash = declared.filter((row) => row.paymentChannel === 'cash');
  const applied: AppliedSaleTender[] = [];
  let remaining = totalCents;
  for (const row of nonCash) {
    const amount = cents(row.amount, 'Non-cash payment', digits);
    if (amount <= 0 || amount > remaining) throw new AppError('Non-cash payment exceeds invoice balance', 'NON_CASH_OVERPAYMENT', 400);
    applied.push({ paymentChannel: row.paymentChannel, amount: amount / scale, tenderedAmount: amount / scale, changeAmount: 0 });
    remaining -= amount;
  }
  const cashDeclared = cash.map((row) => cents(row.amount, 'Cash payment', digits));
  if (cashDeclared.some((amount) => amount <= 0)) throw new AppError('Cash payment must be positive', 'INVALID_PAID_AMOUNT', 400);
  const declaredCashTotal = cashDeclared.reduce((sum, amount) => sum + amount, 0);
  if (cashOverride > 0 && cash.length === 0) throw new AppError('Cash tender requires a cash payment line', 'CASH_TENDER_WITHOUT_CASH', 400);
  if (cash.length > 1 && cashOverride > declaredCashTotal) throw new AppError('Use a single cash payment line for excess tender', 'AMBIGUOUS_CASH_TENDER', 400);
  const tenderedCash = Math.max(declaredCashTotal, cashOverride);
  if (tenderedCash > 0 && remaining === 0) throw new AppError('Cash tender exceeds invoice balance', 'INVALID_PAID_AMOUNT', 400);
  for (let index = 0; index < cash.length; index += 1) {
    const tender = index === 0 && cash.length === 1 ? tenderedCash : cashDeclared[index];
    const used = Math.min(tender, remaining);
    if (used <= 0) throw new AppError('Cash tender exceeds invoice balance', 'INVALID_PAID_AMOUNT', 400);
    applied.push({ paymentChannel: 'cash', amount: used / scale, tenderedAmount: tender / scale, changeAmount: (tender - used) / scale });
    remaining -= used;
  }
  const appliedCents = totalCents - remaining;
  return {
    payments: applied,
    appliedAmount: appliedCents / scale,
    tenderedAmount: tenderedCash / scale,
    changeAmount: (tenderedCash - applied.filter((row) => row.paymentChannel === 'cash').reduce((sum, row) => sum + cents(row.amount, 'Cash applied', digits), 0)) / scale,
  };
}
