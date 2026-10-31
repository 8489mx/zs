import { roundMoney, type MoneyDigits } from './money-minor-units.engine';

/**
 * The single FX conversion primitive (INV-FX-CONVERSION-SINGLE-ENGINE):
 * convert a foreign amount at a caller-supplied rate, rounded at the
 * TARGET currency's book digits through the canonical engine. Rate
 * resolution stays with the caller (the live rate row, or
 * exchangeRateAsOf for a moment in the past) — this function never
 * reads a rate, so it can never silently fall back to one. A
 * non-finite amount or a non-finite/non-positive rate fails closed.
 * Cross-currency (foreign-to-foreign) conversion is a later package:
 * callers convert to base with a single rate today.
 */
export function convertFxAmount(amount: number, exchangeRate: number, digits: MoneyDigits): number {
  if (!Number.isFinite(amount) || !Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    throw new Error('Invalid foreign exchange conversion inputs');
  }
  return roundMoney(amount * exchangeRate, digits);
}
