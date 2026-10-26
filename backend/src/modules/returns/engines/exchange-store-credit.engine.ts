import { type MoneyDigits, roundMoney } from '../../accounting/engines/money-minor-units.engine';

/** Retained exchange credit is a cash-equivalent liability in the tenant's base currency. */
export function exchangeStoreCreditAmount(retainedCredit: number, digits: MoneyDigits): number {
  if (!Number.isFinite(retainedCredit) || retainedCredit < 0) {
    throw new Error('Invalid exchange credit amount');
  }
  return roundMoney(retainedCredit, digits);
}
